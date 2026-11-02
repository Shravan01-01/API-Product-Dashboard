const API_URL = 'https://fakestoreapi.com/products';
const FX_API_URL = 'https://api.frankfurter.dev/v2/rate/usd/inr';
const sections = document.querySelector('#category-sections');
const stateRegion = document.querySelector('#category-state');
const quickLinks = document.querySelector('#category-links');
const summary = document.querySelector('#category-summary');
const refreshButton = document.querySelector('#refresh-categories');
let requestController;
let usdToInr = 0;
let rateDate = '';

document.querySelector('#today-date').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function renderLoading() {
  stateRegion.setAttribute('aria-busy', 'true');
  stateRegion.innerHTML = '<div class="category-loading">Loading products and organizing categories…</div>';
  quickLinks.innerHTML = '';
  sections.innerHTML = '';
  summary.textContent = 'Loading categories…';
}

function showError(message) {
  summary.textContent = 'Categories and rupee prices are unavailable right now.';
  stateRegion.innerHTML = `<div class="state-panel"><div class="state-icon"><svg viewBox="0 0 24 24"><path d="M12 8v5m0 3h.01"/><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"/></svg></div><h3>We couldn't load the categories</h3><p>${escapeHtml(message)} Check your connection and try again.</p><button class="state-action" id="retry-categories" type="button">Try again</button></div>`;
  document.querySelector('#retry-categories').addEventListener('click', loadCategories);
}

function productCard(product) {
  const rating = product.rating && Number.isFinite(Number(product.rating.rate)) ? Number(product.rating.rate).toFixed(1) : null;
  const image = typeof product.image === 'string' ? product.image : '';
  return `<article class="product-card"><div class="product-image-wrap"><span class="product-category">${escapeHtml(product.category)}</span><img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy"><span class="image-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg></span></div><div class="product-info"><h3 class="product-name" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3><div class="product-meta"><span class="product-price">${formatINR(Number(product.price) * usdToInr)}</span>${rating ? `<span class="product-rating"><span class="star">★</span> ${rating}</span>` : ''}</div></div></article>`;
}

function attachImageFallbacks() {
  sections.querySelectorAll('.product-image').forEach(image => image.addEventListener('error', () => {
    image.classList.add('failed');
    image.nextElementSibling.classList.add('visible');
  }, { once: true }));
}

function renderCategories(products) {
  const categories = [...new Set(products.map(product => product.category))].sort((a, b) => a.localeCompare(b));
  summary.textContent = `${products.length} products organized into ${categories.length} ${categories.length === 1 ? 'category' : 'categories'}. Prices converted at ${formatINR(usdToInr)} per US$1 · rate dated ${rateDate}.`;
  quickLinks.innerHTML = categories.map((category, index) => {
    const count = products.filter(product => product.category === category).length;
    return `<a class="category-chip" href="#category-${index}">${escapeHtml(category)} <span>${count}</span></a>`;
  }).join('');
  sections.innerHTML = categories.map((category, index) => {
    const categoryProducts = products.filter(product => product.category === category);
    return `<section class="category-group" id="category-${index}" aria-labelledby="category-title-${index}"><div class="category-group-header"><h2 id="category-title-${index}">${escapeHtml(category)}</h2><span class="category-product-count">${categoryProducts.length} ${categoryProducts.length === 1 ? 'product' : 'products'}</span></div><div class="product-grid">${categoryProducts.map(productCard).join('')}</div></section>`;
  }).join('');
  attachImageFallbacks();
}

async function loadCategories() {
  if (requestController) requestController.abort();
  requestController = new AbortController();
  const controller = requestController;
  refreshButton.disabled = true;
  refreshButton.classList.add('loading');
  stateRegion.setAttribute('aria-busy', 'true');
  renderLoading();
  try {
    const [response, rateResponse] = await Promise.all([
      fetch(API_URL, { signal: controller.signal, headers: { Accept: 'application/json' } }),
      fetch(FX_API_URL, { signal: controller.signal, headers: { Accept: 'application/json' } })
    ]);
    if (!response.ok) throw new Error(response.status === 429 ? 'The service is receiving too many requests right now.' : `The product service responded with an error (HTTP ${response.status}).`);
    if (!rateResponse.ok) throw new Error(`The USD to INR exchange rate service responded with an error (HTTP ${rateResponse.status}).`);
    let products;
    let rateData;
    try { [products, rateData] = await Promise.all([response.json(), rateResponse.json()]); }
    catch { throw new Error('The product service sent a response we could not read.'); }
    if (!Array.isArray(products) || !products.every(item => item && typeof item.title === 'string' && typeof item.category === 'string' && Number.isFinite(Number(item.price)))) {
      throw new Error('The product service returned incomplete or unexpected product data.');
    }
    if (!products.length) throw new Error('The product service returned an empty catalog.');
    if (!rateData || !Number.isFinite(Number(rateData.rate)) || Number(rateData.rate) <= 0) throw new Error('The exchange rate service returned an invalid USD to INR rate.');
    usdToInr = Number(rateData.rate);
    rateDate = rateData.date || 'latest available date';
    stateRegion.innerHTML = '';
    stateRegion.setAttribute('aria-busy', 'false');
    renderCategories(products);
  } catch (error) {
    if (error.name === 'AbortError') return;
    const message = error instanceof TypeError ? 'We could not reach the product or exchange rate service. One of them may be temporarily unavailable.' : error.message || 'An unexpected problem occurred.';
    showError(message);
  } finally {
    if (requestController === controller) {
      refreshButton.disabled = false;
      refreshButton.classList.remove('loading');
      stateRegion.setAttribute('aria-busy', 'false');
    }
  }
}

refreshButton.addEventListener('click', loadCategories);
loadCategories();

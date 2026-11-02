const API_URL = 'https://fakestoreapi.com/products';
const grid = document.querySelector('#product-grid');
const stateRegion = document.querySelector('#content-state');
const refreshButton = document.querySelector('#refresh-button');
const searchInput = document.querySelector('#search-input');
const categoryFilter = document.querySelector('#category-filter');
const resultCount = document.querySelector('#result-count');
let products = [];
let requestController;

document.querySelector('#today-date').textContent = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

function setBusy(isBusy) {
  refreshButton.disabled = isBusy;
  refreshButton.classList.toggle('loading', isBusy);
  refreshButton.setAttribute('aria-busy', String(isBusy));
  stateRegion.setAttribute('aria-busy', String(isBusy));
}

function showLoading() {
  stateRegion.innerHTML = '';
  grid.innerHTML = Array.from({ length: 8 }, () => '<article class="product-card skeleton" aria-hidden="true"><div class="product-image-wrap"></div><div class="product-info"><div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-line" style="width:40%;margin-top:14px"></div></div></article>').join('');
  resultCount.textContent = 'Loading products…';
}

function showError(message) {
  grid.innerHTML = '';
  stateRegion.innerHTML = `<div class="state-panel"><div class="state-icon"><svg viewBox="0 0 24 24"><path d="M12 8v5m0 3h.01"/><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3l-7.5-13.1a2 2 0 0 0-3.4 0Z"/></svg></div><h3>We couldn't load the catalog</h3><p>${escapeHtml(message)} Check your connection and try again.</p><button class="state-action" id="retry-button" type="button">Try again</button></div>`;
  document.querySelector('#retry-button').addEventListener('click', loadProducts);
  resultCount.textContent = '';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function validateProducts(data) {
  if (!Array.isArray(data)) throw new Error('The product service returned data in an unexpected format.');
  if (!data.every(item => item && Number.isFinite(Number(item.id)) && typeof item.title === 'string' && typeof item.category === 'string' && Number.isFinite(Number(item.price)))) {
    throw new Error('Some product details from the service were incomplete.');
  }
  return data;
}

async function loadProducts() {
  if (requestController) requestController.abort();
  requestController = new AbortController();
  const controller = requestController;
  setBusy(true);
  showLoading();
  try {
    const response = await fetch(API_URL, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(response.status === 429 ? 'The service is receiving too many requests right now.' : `The product service responded with an error (HTTP ${response.status}).`);
    let data;
    try { data = await response.json(); }
    catch { throw new Error('The product service sent a response we could not read.'); }
    products = validateProducts(data);
    if (products.length === 0) throw new Error('The product service returned an empty catalog.');
    stateRegion.innerHTML = '';
    updateSummary();
    updateCategoryOptions();
    renderProducts();
  } catch (error) {
    if (error.name === 'AbortError') return;
    const message = error instanceof TypeError ? 'We could not reach the product service. It may be temporarily unavailable.' : error.message || 'An unexpected problem occurred.';
    showError(message);
  } finally {
    if (requestController === controller) setBusy(false);
  }
}

function updateSummary() {
  const categoryCount = new Set(products.map(product => product.category)).size;
  const average = products.reduce((sum, product) => sum + Number(product.price), 0) / products.length;
  document.querySelector('#total-stat').textContent = products.length;
  document.querySelector('#category-stat').textContent = categoryCount;
  document.querySelector('#average-stat').textContent = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(average);
  document.querySelector('#nav-count').textContent = products.length;
  document.querySelector('#section-count').textContent = products.length;
}

function updateCategoryOptions() {
  const selected = categoryFilter.value;
  const categories = [...new Set(products.map(product => product.category))].sort((a, b) => a.localeCompare(b));
  categoryFilter.innerHTML = '<option value="all">All categories</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
  if (categories.includes(selected)) categoryFilter.value = selected;
}

function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categoryFilter.value;
  const filtered = products.filter(product => (category === 'all' || product.category === category) && `${product.title} ${product.category}`.toLocaleLowerCase().includes(query));
  resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'product' : 'products'}`;
  document.querySelector('#section-count').textContent = filtered.length;
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-inline"><strong>No products found</strong>Try another search or category.</div>';
    return;
  }
  grid.innerHTML = filtered.map(product => {
    const rating = product.rating && Number.isFinite(Number(product.rating.rate)) ? Number(product.rating.rate).toFixed(1) : null;
    const image = typeof product.image === 'string' ? product.image : '';
    return `<article class="product-card"><div class="product-image-wrap"><span class="product-category">${escapeHtml(product.category)}</span><img class="product-image" src="${escapeHtml(image)}" alt="${escapeHtml(product.title)}" loading="lazy"><span class="image-fallback" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg></span></div><div class="product-info"><h3 class="product-name" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3><div class="product-meta"><span class="product-price">${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(product.price))}</span>${rating ? `<span class="product-rating"><span class="star">★</span> ${rating}</span>` : ''}</div></div></article>`;
  }).join('');
  grid.querySelectorAll('.product-image').forEach(image => image.addEventListener('error', () => {
    image.classList.add('failed');
    image.nextElementSibling.classList.add('visible');
  }, { once: true }));
}

searchInput.addEventListener('input', renderProducts);
categoryFilter.addEventListener('change', renderProducts);
refreshButton.addEventListener('click', loadProducts);
loadProducts();

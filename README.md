# Northstar Product Dashboard

A responsive product catalog dashboard powered by the browser Fetch API and the public [Fake Store API](https://fakestoreapi.com/).

## Run locally

Python 3 is needed to serve the files over HTTP. From this folder, run:

```sh
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser. No build step, package installation, or API key is required. An internet connection is needed to load product data.

## Features

- Product cards with images, names, categories, prices, and ratings
- Loading skeletons and network and HTTP error handling with retry
- Search and category filtering
- Summary cards for total products, categories, and average price
- Responsive layout for desktop, tablet, and mobile

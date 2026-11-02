# Northstar Product Dashboard

A responsive product catalog dashboard powered by the browser's native Fetch API, the public [Fake Store API](https://fakestoreapi.com/), and [Frankfurter exchange rates](https://frankfurter.dev/).

## Run it

Because browsers restrict some requests from pages opened as `file://`, serve this folder over HTTP. With Python 3 installed, run this from the project folder:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000). Stop the server with `Ctrl+C`.

No build step, package installation, API key, or framework is required. The dashboard needs an internet connection to load the live catalog.

## Included

- Dynamic product cards with image, name, category, price in INR, and rating
- USD product prices converted to rupees using the latest available daily USD/INR reference rate
- Loading skeletons, HTTP and network error messages, and retry actions
- Search and category filtering
- A dedicated Categories page that groups every product into its own section
- Summary cards for product count, category count, and average price
- Responsive layout for desktop, tablet, and mobile screens

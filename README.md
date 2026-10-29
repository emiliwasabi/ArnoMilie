# IDEA — Vintage Books Prototype

A phone sized, static HTML/CSS/JavaScript prototype adapted to the DXD26 group starter. Open `index.html` in a browser to preview it. It has no build step or server requirements.

## Prototype flow

1. Browse the catalog and select **Photo November 1983 N194**.
2. Choose **Buy vintage** to open the product photos.
3. Swipe through the six photos. On a phone, press and hold to use the loupe; release on a marked detail to save it beside the cart.

The catalog, product pages, and loupe images are in `assets/`. The page structure is in `index.html`, the visual styling is in `css/app.css`, and the interactions are in `js/app.js`. The local Unica font is not bundled; visitors use the next available system font.

## Upload notes

- Keep `index.html` at the root of this folder.
- Keep paths relative, such as `assets/slides/01.jpg` and `css/app.css`, so the page works when hosted under a project subpath.
- This folder contains static files only and is under the workshop's 50 MB folder limit. Upload this project folder to your group page; the uploaded QR code opens it on a phone.

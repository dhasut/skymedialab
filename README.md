# Sky Media Lab

Static single-page site for **Sky Media Lab**: full-viewport home (About, Projects, Contact) and a **Dictio** project view, with hash routing (`#/`, `#/projects`, `#/projects/dictio`, `#/contact`). Background on the home hero uses **Three.js r121** and **Vanta CLOUDS2** from local files under `vendor/` and `gallery/` (no runtime CDN dependency for those libraries).

## Local preview

From the project folder, serve the root (any static server). Example:

```bash
npx --yes serve .
```

Then open the URL shown (e.g. `http://localhost:3000`). A normal refresh is enough after changing HTML, CSS, or fonts linked from Google.

## GitHub Pages

1. Create a repository and push this project (including `vendor/` and `gallery/noise.png`).
2. In the repo **Settings → Pages**, set the source to your default branch and `/ (root)` (or `/docs` if you move files there).
3. **Project site** (`https://<user>.github.io/<repo>/`): asset URLs are built from `location.pathname` in `js/app.js` so `gallery/noise.png` and scripts resolve under the repo path. If you rename the repo, paths update automatically.
4. **User/org site** (`https://<user>.github.io/`): deploy from a repo named `<user>.github.io`; the same code works with an empty path prefix.

Replace the placeholder contact email in `index.html` before publishing. Add real store URLs on the Dictio page when available.

## Files

- `index.html` — layout, sections, Dictio copy
- `css/styles.css` — layout and theme
- `js/app.js` — hash router, Vanta init/destroy when switching views
- `vendor/three.min.js` — Three.js r121
- `vendor/vanta.clouds2.min.js` — Vanta CLOUDS2
- `gallery/noise.png` — texture for CLOUDS2 (sourced from [vantajs.com](https://www.vantajs.com) gallery for distribution)

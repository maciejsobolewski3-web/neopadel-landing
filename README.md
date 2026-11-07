# NeoPadel landing prototype

Static prototype of the new NeoPadel home page for padel clubs (Polish).

Live: https://maciejsobolewski3-web.github.io/neopadel-landing/

## Files

- `index.html` is the whole site in one self-contained file (images, video, styles and scripts are inlined). It works offline and is what GitHub Pages serves.
- `shell.html`, `app.js`, `styles.css` are the sources. `court3d.js` is the 3D court configurator (baked lighting, canvas textures, model and turf picker) built on three.js r128 in `vendor/`. `content.js` holds articles, projects and testimonials extracted from the NeoPadel repo.
- `build.py` rebuilds `index.html` from the sources. It reads content from the NeoPadel monorepo, so run it from `neopadel/output/neopadel-home-concept`.
- `assets/` holds the logo, hero background, court photo, two app screens and two short video loops (`film/`), real admin panel screens with sample data (`panel/`), and court model renders and a hall photo (`korty/`).
- `mobile-preview.html` previews the page at 390 and 320 px.

The page is marked `noindex` and uses sample data only. Testimonials on the "Opinie" page need confirmation before any public release.

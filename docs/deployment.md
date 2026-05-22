# Deployment

## GitHub Pages with Actions

This project includes `.github/workflows/deploy-pages.yml`.

Steps:

1. Push repository to GitHub.
2. Open repository **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions**.
4. Push to `main` to deploy.

## GitHub Pages from branch

This app is also static-hosting ready:

- Source: Deploy from a branch
- Branch: `main`
- Folder: `/root`

No build command is required.

## PWA notes

The service worker caches same-origin app shell files only. OCR library is loaded from CDN only when OCR is used, so first OCR run requires internet unless you vendor Tesseract locally and update `js/app.js`.

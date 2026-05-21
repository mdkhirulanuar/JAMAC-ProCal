# JAMAC MeterCalc Universal v3.3.1

Professional responsive PWA build for smartphone, tablet, laptop and desktop deployment on GitHub Pages.

Offline-first static PWA for meter field calculations:

- CT/VT multiplier calculation
- Active/reactive primary-side equivalent pulse constants
- Pulse to energy and energy to pulse conversion
- Accuracy Test v3.3 with separated Register Comparison and Pulse Output Test modes
- Maximum Demand calculator with 15/30/60/custom interval
- OCR-assisted meter nameplate extraction with review-before-apply workflow
- Local history with JSON/CSV export and JSON restore
- GitHub Pages deployment workflow

## Important limitation

This application is a calculation aid for field reference and internal pilot use. Accuracy test calculations must be validated against your organisation's official SOP, test equipment method, calibration requirements and reporting controls before audit or regulatory use.

OCR results are not authoritative. Always verify CT/VT ratios from CT/VT nameplate, SLD, billing system or commissioning records.

## Deploy to GitHub Pages

1. Replace your repository files with this project content.
2. Commit and push to `main`.
3. Go to GitHub repository `Settings` → `Pages`.
4. Set `Source` to `GitHub Actions`.
5. Open the deployed URL shown in the workflow summary.

No build step is required. This is a static app.

## Local test

Use any local static server:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Version notes

v3.3 focuses on stability and clarity:

- Reworked accuracy test into two calculation modes
- Added Maximum Demand interval selector
- Added backup/restore JSON
- Added CSV export with basic spreadsheet formula-injection protection
- Added formula notes and warnings
- Added OCR review-before-apply workflow
- Added GitHub Pages workflow
- Updated service worker cache version to v3.3.1

## Offline behaviour

The app shell is cached by the service worker. The OCR library is loaded from CDN and may require internet the first time OCR is used. After the browser caches it, OCR may continue to work offline depending on browser cache behaviour.

For stricter offline operation, vendor `tesseract.js` locally and update `index.html` plus `sw.js`.

## Data storage

History is stored in browser `localStorage` under:

```text
jamac_metercalc_v33_history
```

Export JSON regularly if field records matter. Browser data can be cleared by users, OS cleanup, private browsing mode, or site-data reset.

## Recommended next version

v3.4 should add:

- Basic job/site fields
- Meter profile
- Save results under job
- Print/PDF result export
- Complete BM/EN coverage

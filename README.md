# JAMAC ProCal v3.3.2

Professional static PWA calculator for CT/VT multiplier, meter constant conversion, pulse-energy conversion, accuracy test support, maximum demand, OCR helper and local calculation history.

## What's new in v3.3.2

- Safer accuracy test basis selection.
- Correct kWh/MWh/kvarh handling and clearer meter constant labels.
- CT/VT ratio presets with manual override.
- Formula preview in calculator results.
- Warning/confidence system for high multipliers, unusual constants and basis risk.
- PWA icons, install prompt and update notification.
- GitHub Pages workflow included.
- Accessibility fixes: scalable viewport, tab ARIA, live toast, keyboard file upload.
- History detail view, delete, JSON/CSV export/import and print-ready report.
- Lazy-loaded OCR engine.

## Deploy on GitHub Pages

1. Upload all files to your repository root.
2. Commit and push to `main`.
3. Go to **Settings → Pages**.
4. Set source to **GitHub Actions**.
5. The included workflow `.github/workflows/deploy-pages.yml` will publish the static app.

Alternative: use **Deploy from a branch → main → /root**. The app uses relative paths and works in GitHub Pages subfolders.

## Important calculation assumption

- Nameplate meter constant such as `1000 imp/kWh` is normally a secondary/raw meter constant.
- Billing/primary register readings usually already include multiplier.
- Raw pulse count with nameplate constant normally requires CT/VT multiplier.
- Do not double-apply multiplier.
- Regulatory acceptance must follow official SOP and approved test equipment procedure.

## Local storage

History records are stored in browser `localStorage`. Export JSON/CSV regularly for backup.

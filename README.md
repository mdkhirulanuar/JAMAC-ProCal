# JAMAC ProCal v3.3.2-r1

Static PWA calculator for Direct, CT-operated, and CT/PT-operated electricity meters.

## Included modules

- Direct Meter mode: multiplier locked to 1.
- CT Meter mode: multiplier = CT Primary / CT Secondary.
- CT/PT Meter mode: multiplier = CT Ratio × VT Ratio.
- Meter constant calculator for active and reactive constants.
- Pulse ↔ energy conversion with kWh, MWh, and kvarh handling.
- Register comparison and pulse output accuracy test.
- Maximum demand calculation from active pulse count and interval.
- OCR helper:
  - Nameplate OCR.
  - Display Reading OCR with crop, contrast, threshold, and digit-only recognition.
  - Manual verified reading fallback.
- BM/EN language toggle.
- Local history with view, delete, JSON/CSV export, import, and print-ready report.
- PWA manifest, icons, service worker, and GitHub Pages workflow.

## Important calculation rule

Direct meter uses multiplier 1.

CT meter uses:

```text
Multiplier = CT Primary / CT Secondary
```

CT/PT meter uses:

```text
Multiplier = (CT Primary / CT Secondary) × (VT Primary / VT Secondary)
```

Billing/primary register values normally already include multiplier. Raw meter pulse/nameplate constant normally needs multiplier. Do not double-apply multiplier.

## Deploy to GitHub Pages

1. Copy all files in this folder to the root of your repository.
2. Commit and push.
3. Open `Settings → Pages`.
4. Set source to `GitHub Actions`.
5. The workflow at `.github/workflows/deploy-pages.yml` will publish the app.

## Local test

Open `index.html` directly in a browser for basic testing.

For formula tests, open:

```text
tests/formula-tests.html
```

## OCR note

Display OCR is only an assistive tool. Crop the display area tightly, use threshold/contrast controls, and verify the detected digits manually before using the value in official work.

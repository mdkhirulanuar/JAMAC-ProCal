# Changelog

## v3.3.2-r1

### Added

- Direct Meter mode with multiplier fixed to 1.
- CT Meter and CT/PT Meter connection mode handling.
- Auto-disable CT/VT fields according to meter type.
- Meter type support in main calculator, energy conversion, accuracy test, and MD calculation.
- Display Reading OCR mode with crop percentage, contrast, threshold, scale, and digit-only OCR.
- Manual verified reading fallback for field use.
- Wider BM/EN language toggle coverage for key UI text.
- Updated PWA cache version.

### Fixed

- Previous v3.3.2 draft did not expose Direct Meter as an explicit workflow.
- Reduced risk of applying CT/VT multiplier to direct meters.
- Improved OCR workflow for meter display readings compared with full-image OCR only.

## v3.3.2

- Stabilization release with safer accuracy basis, unit handling, presets, formula preview, PWA icons, history details, print report, and lazy OCR loading.

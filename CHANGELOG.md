# Changelog

## v3.3.2 - Stabilization Release

### Added
- Safer basis wording for register comparison and pulse output accuracy test.
- CT and VT preset selectors.
- Formula preview output for all major calculators.
- Warning/confidence messages for high multiplier, low/high constants and primary/secondary basis risk.
- Print-ready calculation report from result/history detail.
- PWA PNG icons, maskable icons and Apple touch icon.
- GitHub Pages Actions workflow.
- Keyboard-accessible file upload drop zone.
- Lazy-loaded OCR engine.
- History detail/delete/print/export/import.

### Fixed
- Removed `user-scalable=no` for accessibility.
- Corrected MWh handling so meter constant remains based on kWh internally.
- Restricted service worker caching to same-origin app shell.

### Notes
- OCR values remain advisory and must be manually verified.
- Tolerance/pass-fail must follow official SOP.

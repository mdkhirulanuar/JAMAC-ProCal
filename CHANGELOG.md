# Changelog

## v3.3.1

### Added

- Accuracy Test v3.3 split into Register Comparison and Pulse Output Test.
- Maximum Demand interval selector: 15, 30, 60 and custom minutes.
- Formula notes and input warnings.
- History backup/restore via JSON.
- History export via CSV.
- OCR review-before-apply workflow.
- Offline status badge.
- GitHub Pages deployment workflow.
- Service worker cache versioning.

### Changed

- Version standardized to v3.3.1 across app, service worker and documentation.
- PWA manifest uses relative paths suitable for GitHub Pages subfolder deployments.
- Calculator result labels clarify primary-side equivalent pulse constants.

### Known limitations

- OCR library uses CDN by default.
- History remains in localStorage, not IndexedDB.
- No full PDF report module in v3.3.
- Accuracy test must be validated against official SOP before audit use.

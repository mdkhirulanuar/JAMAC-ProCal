# GitHub Pages Deployment

This app is static. It does not need Node.js or a build command.

## Steps

1. Copy all files to the root of your GitHub repository.
2. Commit and push to `main`.
3. Open GitHub repository settings.
4. Go to `Pages`.
5. Select `GitHub Actions` as source.
6. Wait for the workflow `Deploy static app to GitHub Pages` to complete.

## Updating cache

When releasing a new version, update these values:

- `APP.version` in `js/app.js`
- `APP_VERSION` in `sw.js`
- Version in `README.md`
- Version in `CHANGELOG.md`

A new service worker cache name forces browsers to refresh cached files.

# Deployment

Recommended deployment target: GitHub Pages with GitHub Actions.

## Steps

1. Copy all replacement files to the repository root.
2. Commit and push to `main`.
3. Go to `Settings → Pages`.
4. Select `Source: GitHub Actions`.
5. Wait for the `Deploy JAMAC ProCal to GitHub Pages` workflow to complete.

## Notes

- This app is static and does not need npm, Vite, or build tools.
- Service worker cache is versioned as `jamac-procal-v3.3.2-r1-cache-1`.
- After deployment, refresh twice if the browser still serves an older service-worker cache.

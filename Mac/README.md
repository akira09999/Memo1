# Mac Build

This folder tracks the macOS packaging flow for `memo-app`.

## What is configured

- GitHub Actions workflow: [`.github/workflows/build-mac.yml`](../.github/workflows/build-mac.yml)
- macOS package script: [`memo-app/package.json`](../memo-app/package.json)
- macOS icon generation script: [`memo-app/scripts/gen-mac-icon.mjs`](../memo-app/scripts/gen-mac-icon.mjs)

## Build output

The workflow builds these artifacts on a macOS runner:

- `.dmg`
- `.zip`

They are uploaded as GitHub Actions artifacts.

## How to run

1. Push the repository to GitHub.
2. Open the `Actions` tab.
3. Run the `Build macOS App` workflow manually.
4. Download the uploaded artifacts from the workflow run.

## Notes

- The workflow builds unsigned macOS artifacts by default.
- `icon.icns` is generated on the macOS runner from `memo-app/resources/icon.png`.

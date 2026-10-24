# Changelog

All notable changes to `meld-io` will be recorded here.

## [Unreleased]

- Added separate TanStack Router routes for the landing page (`/`), Meld API Studio (`/api`), and a demo-gated account dashboard (`/account`) with a Google sign-in screen at `/account/sign-in`.
- Replaced the starter screen with a usable Meld API dashboard, including endpoint search, request previews, server-side `MELD_API_KEY` support, and response inspection.
- Added a same-origin Meld API proxy for development and preview so the default API key stays out of the browser bundle.
- Replaced the stale ten-item endpoint list with all 77 operations from Meld's `2026-02-03` OpenAPI specs, grouped into eight API categories with generated parameters and request schemas.
- Added generic path, query, header, JSON body, and PATCH request support. The removed Service Providers API is clearly marked deprecated and disabled.
- Aligned Octane adapters and the compiler package with the project's pinned Octane 0.13.8 toolchain.
- Fixed the theme context import and dashboard page overflow so the workspace can scroll and render correctly.

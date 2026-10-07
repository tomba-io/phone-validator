# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.0 (2026-10-07)

### ⚠ BREAKING CHANGES

- `tombaApiKey` and `tombaApiSecret` inputs were removed. The Actor now uses built-in Tomba credentials from the `TOMBA_API_KEY` / `TOMBA_API_SECRET` environment variables, so users no longer need a Tomba account.

### Features

- Pay-per-event pricing: $0.00312 per billable request (`tomba-request`); errors, empty results and cache hits are free
- No client-side rate limit; parallel processing with `maxConcurrency`
- Automatic retries with exponential backoff for network errors, 429 and 5xx (`maxRetries`)
- Cross-run result cache (`useCache`, `cacheTtlHours`)
- Resume after migration or restart
- Duplicate phone numbers are removed
- Each dataset item now includes `charged` and `cached`
- Real-time API (Apify Standby mode): `GET /?phone=…&countryCode=…` or `POST /` with the run input returns results as JSON, with an OpenAPI web server schema
- Key-value store schema for the default store (`INPUT`, `TOMBA_STATE`)
- Default memory set to 256 MB

### Dependencies

- `tomba` upgraded to 1.1.1 (responses are now `{ data, rateLimit }`)
- `apify` upgraded to 3.7.2

### Bug Fixes

- `countryCode` accepts lowercase codes (`gb`)

### 0.0.2 (2025-10-26)

### Bug Fixes

- Dataset schema accepts `null` for every Tomba field and a boolean or string `phone_number`, so Apify's item validation can't fail a run

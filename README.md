# Tomba Phone Validator

[![Price](https://img.shields.io/badge/Price-%243.12%20per%201K%20numbers-brightgreen)](#pricing)
[![No signup](https://img.shields.io/badge/Tomba%20account-not%20needed-blue)](#quick-start)
[![No rate limit](https://img.shields.io/badge/Rate%20limit-none-brightgreen)](#built-for-big-lists)

**Know which phone numbers are real before you dial.** Paste your list and find out in seconds whether each number is valid, where it is, whether it is mobile or landline and which carrier runs it. Every number comes back cleanly formatted and ready for your dialer or CRM.

No Tomba account. No API key. No subscription. **You pay $0.00312 per number, and only when we can check it.**

## Why teams choose this Actor

- **Start in 30 seconds**: Open the Actor, paste your numbers, click Start. Nothing to sign up for
- **Pay only for results**: Numbers we can't check, errors and invalid inputs are free
- **$3.12 per 1,000 numbers**: No monthly plan, no credits that expire, no minimum spend
- **Clean formatting**: Get every number in local, international, E.164 and `tel:` formats
- **More than valid or not**: Line type, carrier, country, region and time zone for every number
- **Built for big lists**: No rate limit. Thousands of numbers run in parallel
- **Never pay twice**: Numbers you checked in the last 24 hours come back from cache for free
- **Export anywhere**: Download as CSV, Excel or JSON, or send results straight to your CRM with Apify integrations

## What you can do with it

| Goal                       | How validation helps                                                |
| -------------------------- | ------------------------------------------------------------------- |
| **Stop wasting calls**     | Remove invalid numbers before your sales team dials them            |
| **Clean your CRM**         | Standardize every number to E.164 and spot bad entries              |
| **Send SMS that arrive**   | Keep the mobile numbers and drop the landlines                      |
| **Call at the right time** | Use the country and time zone to reach people during business hours |
| **Check sign-ups**         | Validate the numbers people enter in your forms                     |

## Quick start

1. Click **Try for free**
2. Add your numbers to **Phone Numbers**, for example `{ "phoneNumber": "+1 415 555 0132" }`
3. Click **Start**, then download your results as CSV, Excel or JSON

That's it. No Tomba account or API key is needed.

## Input

| Field            | Required | Default | Description                                                                             |
| ---------------- | -------- | ------- | --------------------------------------------------------------------------------------- |
| `phoneNumbers`   | Yes      |         | Numbers to check. Each one has a `phoneNumber` and an optional two-letter `countryCode` |
| `maxResults`     | No       | `50`    | Maximum number of phone numbers to check                                                |
| `maxConcurrency` | No       | `10`    | How many numbers to check at the same time (1–50)                                       |
| `maxRetries`     | No       | `3`     | How many times to retry a temporary failure (0–10)                                      |
| `useCache`       | No       | `true`  | Reuse results from your previous runs for free                                          |
| `cacheTtlHours`  | No       | `24`    | How long cached results stay valid (`0` turns the cache off)                            |

Numbers in international format (starting with `+`) work on their own. For local numbers, add the `countryCode` (for example `GB` or `FR`).

```json
{
    "phoneNumbers": [
        { "phoneNumber": "+1 (415) 555-0132" },
        { "phoneNumber": "06 12 34 56 78", "countryCode": "FR" },
        { "phoneNumber": "07911 123456", "countryCode": "GB" }
    ],
    "maxResults": 500
}
```

## Output

You get one row per phone number:

```json
{
    "phone_number": "+1 (415) 555-0132",
    "valid": true,
    "country_code": "US",
    "location": "California",
    "carrier": "AT&T",
    "line_type": "MOBILE",
    "national_format": "(415) 555-0132",
    "international_format": "+1 415-555-0132",
    "e164_format": "+14155550132",
    "rfc3966_format": "tel:+1-415-555-0132",
    "timezone": ["America/Los_Angeles"],
    "source": "tomba_phone_validator",
    "charged": true,
    "cached": false
}
```

| Field                  | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `phone_number`         | The number you submitted                                       |
| `valid`                | `true` if the number is a valid phone number                   |
| `country_code`         | Country of the number, e.g. `US`                               |
| `location`             | Region of the number, e.g. `California`, when available        |
| `carrier`              | The phone carrier                                              |
| `line_type`            | Type of line, e.g. `MOBILE` or `FIXED_LINE`                    |
| `national_format`      | The number as dialed inside its country, e.g. `(415) 555-0132` |
| `international_format` | The number in international format, e.g. `+1 415-555-0132`     |
| `e164_format`          | The number in E.164 format, ideal for dialers and CRMs         |
| `rfc3966_format`       | Click-to-call link, e.g. `tel:+1-415-555-0132`                 |
| `timezone`             | Time zones of the number                                       |
| `input_country_code`   | The country code you submitted, if any                         |
| `source`               | Always `tomba_phone_validator`                                 |
| `charged`              | `true` if this check was billed                                |
| `cached`               | `true` if this result came from the cache (free)               |
| `error`                | Why the number could not be checked, if applicable             |

The dataset has three ready-made views: **Overview**, **Detailed View** and **Valid Phone Numbers**.

## Pricing

**$0.00312 per number ($3.12 per 1,000).** No subscription and no Tomba account needed.

You are only charged when Tomba returns a usable answer:

| What happens                                    | Charged |
| ----------------------------------------------- | ------- |
| The number is checked and found valid           | Yes     |
| The number is checked and found not valid       | Yes     |
| The number can't be checked (no answer)         | No      |
| Malformed input or any other error              | No      |
| Temporary failure (it is retried automatically) | No      |
| Result served from the cache                    | No      |

Every row shows `charged` and `cached`, so you always know what you paid for. To cap your spend, set **Maximum cost per run** in the run options: the Actor stops cleanly when the limit is reached.

## Built for big lists

- **No rate limit**: up to 50 numbers are processed at the same time
- **Automatic retries**: temporary failures are retried for you, and never billed
- **Resumable**: if a run is interrupted, it continues where it stopped without charging you again
- **Cache**: repeat checks within 24 hours are free
- **No duplicates**: the same number written in different ways (`+1 415 555 0132`, `+14155550132`) is checked once

## Real-time API

Need to check a number instantly, for example in a signup form or your CRM? This Actor also runs as a **real-time API** (Apify Standby mode): no run to start, no dataset to fetch, just an HTTP request that returns JSON in seconds. Pricing is the same.

```bash
curl "https://<your-standby-url>/?phone=%2B14155550132" \
  -H "Authorization: Bearer <YOUR_APIFY_TOKEN>"

curl "https://<your-standby-url>/?phone=07911123456,02079460000&countryCode=GB" \
  -H "Authorization: Bearer <YOUR_APIFY_TOKEN>"
```

Repeat `phone` (or separate numbers with commas) to check several numbers; `countryCode` applies to all of them. Write `+` as `%2B` in URLs. You can also `POST` the same JSON input as a normal run, with a country code per number:

```bash
curl -X POST "https://<your-standby-url>/" \
  -H "Authorization: Bearer <YOUR_APIFY_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumbers": [{"phoneNumber": "07911 123456", "countryCode": "GB"}, {"phoneNumber": "+14155550132"}]}'
```

The response is `{ "items": [...] }`, with the same rows as the dataset. Find your Standby URL and the full OpenAPI description in the **API** tab of this Actor.

## Integrations

Run it on a schedule, call it from the Apify API, or connect it to Zapier, Make, Google Sheets, HubSpot, Slack and hundreds of other apps with [Apify integrations](https://docs.apify.com/platform/integrations). Webhooks let you trigger your own workflow as soon as a run finishes.

## FAQ

**Do I need a Tomba account or API key?**
No. Everything is built in. You only pay the per-number price on Apify.

**How much does it cost?**
$0.00312 per checked number ($3.12 per 1,000). Invalid numbers are still a real answer, so they are charged. Numbers that can't be checked, errors and cached lookups are free.

**How many numbers can I check in one run?**
Up to 1,000 per run, processed in parallel. There is no rate limit.

**What format should my numbers use?**
Any common format works: spaces, dashes, dots and brackets are fine. Use the international format with `+` and the country prefix, or add a two-letter `countryCode` for local numbers.

**Which countries are supported?**
International numbers are supported. Each result tells you the country of the number.

**Can I tell mobile numbers from landlines?**
Yes. Every result includes the line type and the carrier.

**What if my run is interrupted?**
It picks up where it stopped. Numbers already checked are not charged again.

**How do I limit what I spend?**
Set **Maximum cost per run** before you start. The Actor stops as soon as the limit is reached.

## Support

Questions or feedback? We're happy to help:

- **Email**: support@tomba.io
- **Live chat**: on [tomba.io](https://tomba.io) during business hours
- **Issues**: use the **Issues** tab on this Actor's page

## About Tomba

Founded in 2020, [Tomba](https://tomba.io) is a B2B data platform for finding, verifying and enriching business contacts. Our Email Finder, Domain Search and Email Verifier help sales and marketing teams reach the right people.

![Tomba Logo](https://tomba.io/logo.png)

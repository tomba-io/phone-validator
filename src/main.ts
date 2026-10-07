import { log } from 'apify';
import { Phone } from 'tomba';

import { InputError, queryInt, queryString, runActor } from './standby.js';
import type { RunOptions } from './tomba.js';
import { callTomba, getClient, runPool, unique } from './tomba.js';

interface PhoneNumberInput {
    phoneNumber: string;
    countryCode?: string;
}

interface PhoneValidatorInput extends RunOptions {
    phoneNumbers?: PhoneNumberInput[];
    maxResults?: number;
}

const SOURCE = 'tomba_phone_validator';

function normalizePhone(item: PhoneNumberInput): PhoneNumberInput {
    const phoneNumber = typeof item?.phoneNumber === 'string' ? item.phoneNumber.trim() : '';
    const countryCode = typeof item?.countryCode === 'string' ? item.countryCode.trim().toUpperCase() : '';
    return countryCode ? { phoneNumber, countryCode } : { phoneNumber };
}

/** Dedupe key: digits and leading `+` only, plus the country code. */
function phoneKey(item: PhoneNumberInput): string {
    const digits = item.phoneNumber.replace(/[^\d+]/g, '');
    return digits ? `${digits}|${item.countryCode ?? ''}` : '';
}

/**
 * `phone` query values: repeated and/or comma-separated. An unencoded `+` in a query string decodes
 * to a space, so a leading space before a digit is read back as `+` (`?phone=+14155550123`).
 */
function queryPhones(query: URLSearchParams): string[] {
    return query
        .getAll('phone')
        .flatMap((value) => value.split(','))
        .map((value) => value.replace(/^ (?=\d)/, '+').trim())
        .filter(Boolean);
}

await runActor<PhoneValidatorInput>({
    title: 'Phone Validator',
    count: (input) => input.phoneNumbers?.length ?? 0,
    fromQuery: (query) => {
        const countryCode = queryString(query, 'countryCode') ?? queryString(query, 'country_code');
        return {
            phoneNumbers: queryPhones(query).map((phoneNumber) =>
                countryCode ? { phoneNumber, countryCode } : { phoneNumber },
            ),
            maxResults: queryInt(query, 'maxResults'),
        };
    },
    run: async (input, { push, isDone, markDone, standby }) => {
        if (!input.phoneNumbers?.length) {
            throw new InputError('Input must contain at least one phone number in "phoneNumbers".');
        }

        const { phoneNumbers: rawPhoneNumbers, maxResults = 50 } = input;
        const phone = new Phone(getClient());

        const phoneNumbers = unique(rawPhoneNumbers.map(normalizePhone), phoneKey);
        const pending = phoneNumbers.filter((item) => !isDone(phoneKey(item)));
        if (pending.length < phoneNumbers.length) {
            log.info(`Resuming: ${phoneNumbers.length - pending.length} phone numbers already processed.`);
        }

        let pushed = 0;
        const limitReached = () => pushed >= maxResults;
        if (!standby) log.info(`Validating ${pending.length} phone numbers`);

        await runPool(
            pending,
            async (item) => {
                if (limitReached()) return;

                const { phoneNumber, countryCode } = item;
                const res = await callTomba(
                    'phone-validator',
                    { phone: phoneNumber, country_code: countryCode ?? null },
                    async () =>
                        countryCode ? phone.validator(phoneNumber, countryCode) : phone.validator(phoneNumber),
                );
                if (res.skipped) return;

                const data =
                    res.data &&
                    typeof res.data === 'object' &&
                    !Array.isArray(res.data) &&
                    Object.keys(res.data).length > 0
                        ? (res.data as Record<string, unknown>)
                        : undefined;

                if (data) {
                    pushed++;
                    // Tomba returns local_format, intl_format, timezones and region; older names are kept as fallbacks.
                    const region = data.region as Record<string, unknown> | undefined;
                    const nationalFormat = data.national_format ?? data.local_format;
                    const internationalFormat = data.international_format ?? data.intl_format;
                    const location = data.location ?? region?.name;
                    const timezone = data.timezone ?? data.timezones;
                    const result = {
                        phone_number: phoneNumber,
                        valid: Boolean(data.valid),
                        country_code: data.country_code ? String(data.country_code) : undefined,
                        country_name: data.country_name ? String(data.country_name) : undefined,
                        location: location ? String(location) : undefined,
                        carrier: data.carrier ? String(data.carrier) : undefined,
                        line_type: data.line_type ? String(data.line_type) : undefined,
                        national_format: nationalFormat ? String(nationalFormat) : undefined,
                        international_format: internationalFormat ? String(internationalFormat) : undefined,
                        e164_format: data.e164_format ? String(data.e164_format) : undefined,
                        rfc3966_format: data.rfc3966_format ? String(data.rfc3966_format) : undefined,
                        timezone: Array.isArray(timezone) ? (timezone as string[]) : undefined,
                        input_country_code: countryCode,
                        source: SOURCE,
                        charged: res.charged,
                        cached: res.cached,
                    };
                    await push(result);
                    log.info(`${phoneNumber}: valid=${result.valid}${res.cached ? ' (cached)' : ''}`);
                } else {
                    await push({
                        phone_number: phoneNumber,
                        valid: false,
                        input_country_code: countryCode,
                        source: SOURCE,
                        charged: res.charged,
                        cached: res.cached,
                        error: res.error ?? 'No validation data returned',
                    });
                    log.info(`${phoneNumber}: ${res.error ?? 'no validation data returned'}`);
                }

                markDone(phoneKey(item));
            },
            undefined,
            limitReached,
        );
    },
});

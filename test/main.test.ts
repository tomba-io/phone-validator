// End-to-end tests: run the Actor against a mock Tomba API.
import assert from 'node:assert/strict';
import { after, afterEach, describe, it } from 'node:test';

import type { MockHandler, MockServer } from './helpers.js';
import { removeStorage, runActor, startMockTomba, startStandbyActor, totalCharges } from './helpers.js';

/** Real Tomba /phone-validator response data. */
const VALID = {
    valid: true,
    local_format: '(415) 555-0132',
    intl_format: '+1 415-555-0132',
    e164_format: '+14155550132',
    rfc3966_format: 'tel:+1-415-555-0132',
    country_code: 'US',
    line_type: 'MOBILE',
    carrier: 'AT&T',
    region: { name: 'California', code: 'CA' },
    timezones: ['America/Los_Angeles'],
};

const FRENCH = {
    valid: true,
    local_format: '06 12 34 56 78',
    intl_format: '+33 6 12 34 56 78',
    e164_format: '+33612345678',
    rfc3966_format: 'tel:+33-6-12-34-56-78',
    country_code: 'FR',
    line_type: 'MOBILE',
    carrier: 'Orange',
    region: { name: 'France', code: 'FR' },
    timezones: ['Europe/Paris'],
};

/** Default Tomba behaviour for GET /phone-validator. */
const tomba: MockHandler = (req) => {
    assert.equal(req.method, 'GET');
    assert.equal(req.path, '/phone-validator');
    const { phone } = req.query;
    if (phone === '+10000000000') return { body: { data: { valid: false, country_code: 'US' } } };
    if (phone === '+19999999999') return { body: { data: null } };
    if (phone === '+18888888888') return { body: { data: {} } };
    if (phone === '12') return { status: 422, body: { errors: { message: 'The phone must be a valid number' } } };
    if (phone === '+17777777777') return { raw: '<html>Bad gateway</html>' };
    if (req.query.country_code === 'FR') return { body: { data: FRENCH } };
    return { body: { data: VALID } };
};

const servers: MockServer[] = [];
const dirs: string[] = [];

async function mock(handler: MockHandler = tomba): Promise<MockServer> {
    const server = await startMockTomba(handler);
    servers.push(server);
    return server;
}

async function run(...args: Parameters<typeof runActor>) {
    const result = await runActor(...args);
    dirs.push(result.storageDir);
    return result;
}

afterEach(async () => {
    await Promise.all(servers.splice(0).map(async (s) => s.close()));
});

after(async () => {
    await Promise.all(dirs.map(removeStorage));
});

describe('phone-validator', () => {
    it('validates a phone number and charges one event', async () => {
        const server = await mock();
        const result = await run({ input: { phoneNumbers: [{ phoneNumber: '+14155550132' }] }, endpoint: server.url });

        assert.equal(result.code, 0, result.output);
        assert.deepEqual(server.requests[0].query, { phone: '+14155550132' });
        assert.deepEqual(result.items, [
            {
                phone_number: '+14155550132',
                valid: true,
                country_code: 'US',
                location: 'California',
                carrier: 'AT&T',
                line_type: 'MOBILE',
                national_format: '(415) 555-0132',
                international_format: '+1 415-555-0132',
                e164_format: '+14155550132',
                rfc3966_format: 'tel:+1-415-555-0132',
                timezone: ['America/Los_Angeles'],
                source: 'tomba_phone_validator',
                charged: true,
                cached: false,
            },
        ]);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('sends the country code for local numbers', async () => {
        const server = await mock();
        const result = await run({
            input: { phoneNumbers: [{ phoneNumber: '06 12 34 56 78', countryCode: 'fr' }] },
            endpoint: server.url,
        });

        assert.deepEqual(server.requests[0].query, { phone: '06 12 34 56 78', country_code: 'FR' });
        assert.equal(result.items[0].input_country_code, 'FR');
        assert.equal(result.items[0].international_format, '+33 6 12 34 56 78');
        assert.equal(result.items[0].carrier, 'Orange');
    });

    it('charges an invalid number, because Tomba answered', async () => {
        const server = await mock();
        const result = await run({ input: { phoneNumbers: [{ phoneNumber: '+10000000000' }] }, endpoint: server.url });

        assert.equal(result.items[0].valid, false);
        assert.equal(result.items[0].country_code, 'US');
        assert.equal(result.items[0].charged, true);
        assert.equal(result.items[0].error, undefined);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('does not charge empty or null data', async () => {
        const server = await mock();
        const result = await run({
            input: { phoneNumbers: [{ phoneNumber: '+19999999999' }, { phoneNumber: '+18888888888' }] },
            endpoint: server.url,
        });

        assert.equal(result.code, 0, result.output);
        assert.equal(result.items.length, 2);
        for (const item of result.items) {
            assert.deepEqual(item, {
                phone_number: item.phone_number,
                valid: false,
                source: 'tomba_phone_validator',
                charged: false,
                cached: false,
                error: 'No validation data returned',
            });
        }
        assert.equal(totalCharges(result), 0);
    });

    it('sends the built-in credentials to Tomba', async () => {
        const server = await mock();
        await run({ input: { phoneNumbers: [{ phoneNumber: '+14155550132' }] }, endpoint: server.url });
        assert.equal(server.requests[0].headers['x-tomba-key'], 'ta_test_key');
        assert.equal(server.requests[0].headers['x-tomba-secret'], 'ts_test_secret');
    });

    it('trims and deduplicates phone numbers', async () => {
        const server = await mock();
        const result = await run({
            input: {
                phoneNumbers: [
                    { phoneNumber: '  +1 (415) 555-0132 ' },
                    { phoneNumber: '+14155550132' },
                    { phoneNumber: '+1-415-555-0132' },
                    // Same digits with a country code is a different lookup.
                    { phoneNumber: '+14155550132', countryCode: 'US' },
                    { phoneNumber: '   ' },
                ],
            },
            endpoint: server.url,
        });

        assert.equal(result.code, 0, result.output);
        assert.deepEqual(
            server.requests.map((r) => r.query),
            [{ phone: '+1 (415) 555-0132' }, { phone: '+14155550132', country_code: 'US' }],
        );
        assert.equal(result.items.length, 2);
    });

    it('does not charge Tomba error statuses and does not retry them', async () => {
        const server = await mock();
        const result = await run({ input: { phoneNumbers: [{ phoneNumber: '12' }] }, endpoint: server.url });
        assert.equal(result.code, 0, result.output);
        assert.equal(server.requests.length, 1);
        assert.equal(result.items[0].charged, false);
        assert.equal(result.items[0].valid, false);
        assert.match(String(result.items[0].error), /422: The phone must be a valid number/);
        assert.equal(totalCharges(result), 0);
    });

    it('does not charge a non-JSON body', async () => {
        const server = await mock();
        const result = await run({ input: { phoneNumbers: [{ phoneNumber: '+17777777777' }] }, endpoint: server.url });
        assert.equal(result.items[0].charged, false);
        assert.match(String(result.items[0].error), /Invalid response/);
        assert.equal(totalCharges(result), 0);
    });

    it('retries 429 and 5xx responses, then charges the success once', async () => {
        let calls = 0;
        const server = await mock(async (req) => {
            calls++;
            if (calls === 1)
                return {
                    status: 429,
                    body: { errors: { message: 'Too many requests' } },
                    headers: { 'retry-after': '1' },
                };
            if (calls === 2) return { status: 500, body: {} };
            return tomba(req);
        });
        const result = await run({
            input: { phoneNumbers: [{ phoneNumber: '+14155550132' }], maxRetries: 3 },
            endpoint: server.url,
        });
        assert.equal(server.requests.length, 3);
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0].charged, true);
        assert.deepEqual(result.chargeCounts, { 'tomba-request': 1 });
    });

    it('serves repeated runs from the cache for free', async () => {
        const server = await mock();
        const input = { phoneNumbers: [{ phoneNumber: '+14155550132' }] };
        const first = await run({ input, endpoint: server.url });
        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir });

        assert.equal(server.requests.length, 1);
        assert.equal(second.items.length, 1);
        assert.equal(second.items[0].cached, true);
        assert.equal(second.items[0].charged, false);
        assert.equal(second.items[0].international_format, '+1 415-555-0132');
        assert.equal(totalCharges(second), 0);
    });

    it('calls Tomba again when the cache is disabled', async () => {
        const server = await mock();
        const input = { phoneNumbers: [{ phoneNumber: '+14155550132' }], useCache: false };
        const first = await run({ input, endpoint: server.url });
        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir });
        assert.equal(server.requests.length, 2);
        assert.equal(second.items[0].cached, false);
        assert.deepEqual(second.chargeCounts, { 'tomba-request': 1 });
    });

    it('stops at the max charge limit and resumes without reprocessing', async () => {
        const server = await mock();
        const numbers = ['+14155550101', '+14155550102', '+14155550103', '+14155550104', '+14155550105'];
        const input = {
            phoneNumbers: numbers.map((phoneNumber) => ({ phoneNumber })),
            maxConcurrency: 1,
            useCache: false,
            maxResults: 100,
        };

        // Locally every event costs $1, so a $2 budget allows two billable requests.
        const first = await run({ input, endpoint: server.url, maxTotalChargeUsd: 2 });
        assert.equal(first.code, 0, first.output);
        assert.equal(totalCharges(first), 2);
        assert.equal(server.requests.length, 2);

        const second = await run({ input, endpoint: server.url, storageDir: first.storageDir, keepStorage: true });
        assert.equal(second.code, 0, second.output);
        assert.deepEqual(
            server.requests.map((r) => r.query.phone),
            numbers,
        );
        assert.equal(second.items.length, 5);
    });

    it('respects maxResults', async () => {
        const server = await mock();
        const result = await run({
            input: {
                phoneNumbers: [{ phoneNumber: '+14155550101' }, { phoneNumber: '+14155550102' }],
                maxResults: 1,
                maxConcurrency: 1,
            },
            endpoint: server.url,
        });
        assert.equal(result.items.length, 1);
        assert.equal(server.requests.length, 1);
    });

    it('runs requests in parallel', async () => {
        let active = 0;
        let peak = 0;
        const server = await mock(async (req) => {
            active++;
            peak = Math.max(peak, active);
            await new Promise((r) => {
                setTimeout(r, 100);
            });
            active--;
            return tomba(req);
        });
        const phoneNumbers = Array.from({ length: 8 }, (_, i) => ({ phoneNumber: `+1415555020${i}` }));
        await run({ input: { phoneNumbers, maxConcurrency: 4 }, endpoint: server.url });
        assert.equal(server.requests.length, 8);
        assert.ok(peak > 1 && peak <= 4, `peak concurrency ${peak}`);
    });

    it('fails without Tomba credentials and never calls the API', async () => {
        const server = await mock();
        const result = await run({
            input: { phoneNumbers: [{ phoneNumber: '+14155550132' }] },
            endpoint: server.url,
            withCredentials: false,
        });
        assert.notEqual(result.code, 0);
        assert.match(result.output, /misconfigured/);
        assert.doesNotMatch(result.output, /ta_test_key|ts_test_secret/);
        assert.equal(server.requests.length, 0);
    });

    it('fails on empty input', async () => {
        const server = await mock();
        const result = await run({ input: { phoneNumbers: [] }, endpoint: server.url });
        assert.notEqual(result.code, 0);
        assert.equal(server.requests.length, 0);
    });

    it('fails when phoneNumbers is missing', async () => {
        const server = await mock();
        const result = await run({ input: {}, endpoint: server.url });
        assert.notEqual(result.code, 0);
        assert.equal(server.requests.length, 0);
    });
});

describe('phone-validator standby (real-time API)', () => {
    it('answers the readiness probe and a bare GET with usage info', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const probe = await actor.call('/', { headers: { 'x-apify-container-server-readiness-probe': '1' } });
            assert.equal(probe.status, 200);
            const usage = await actor.call('/');
            assert.equal(usage.status, 200);
            assert.match(String(usage.body.usage), /GET/);
            assert.equal(server.requests.length, 0);
        } finally {
            await actor.stop();
        }
    });

    it('validates numbers from GET query parameters and charges per billable number', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        let stopped;
        try {
            // An unencoded `+` decodes to a space; it is read back as `+`.
            const res = await actor.call('/?phone=+14155550132&phone=%2B19999999999');
            assert.equal(res.status, 200);
            const items = res.body.items as Record<string, unknown>[];
            assert.equal(items.find((i) => i.phone_number === '+14155550132')?.valid, true);
            assert.equal(items.find((i) => i.phone_number === '+19999999999')?.error, 'No validation data returned');
            assert.deepEqual(server.requests.map((r) => r.query.phone).sort(), ['+14155550132', '+19999999999']);
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 1 });
    });

    it('applies countryCode (or country_code) to every number in a GET request', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const res = await actor.call('/?phone=0612345678,0698765432&country_code=fr');
            assert.equal(res.status, 200);
            const items = res.body.items as Record<string, unknown>[];
            assert.equal(items.length, 2);
            assert.ok(items.every((i) => i.input_country_code === 'FR' && i.country_code === 'FR'));
            assert.ok(server.requests.every((r) => r.query.country_code === 'FR'));
            const camel = await actor.call('/?phone=0611111111&countryCode=FR');
            assert.equal((camel.body.items as Record<string, unknown>[])[0].input_country_code, 'FR');
        } finally {
            await actor.stop();
        }
    });

    it('accepts a POST with the same JSON input as a normal run', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const res = await actor.call('/', {
                body: {
                    phoneNumbers: [{ phoneNumber: '+14155550132' }, { phoneNumber: '0612345678', countryCode: 'FR' }],
                },
            });
            assert.equal(res.status, 200);
            assert.equal((res.body.items as unknown[]).length, 2);
        } finally {
            await actor.stop();
        }
    });

    it('serves repeated requests from the cache for free', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        let stopped;
        try {
            await actor.call('/?phone=%2B14155550132');
            const second = await actor.call('/?phone=%2B14155550132');
            assert.ok((second.body.items as Record<string, unknown>[]).every((i) => i.cached === true));
            assert.equal(server.requests.length, 1);
        } finally {
            stopped = await actor.stop();
        }
        assert.deepEqual(stopped.chargeCounts, { 'tomba-request': 1 });
    });

    it('keeps serving after a request hits maxResults', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            const first = await actor.call('/?phone=%2B14155550001&maxResults=1');
            assert.equal((first.body.items as unknown[]).length, 1);
            const second = await actor.call('/?phone=%2B14155550002,%2B14155550003');
            assert.equal(second.status, 200);
            assert.equal((second.body.items as unknown[]).length, 2);
        } finally {
            await actor.stop();
        }
    });

    it('rejects invalid input with 400 and unknown paths with 404', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url });
        try {
            assert.equal((await actor.call('/', { body: {} })).status, 400);
            assert.equal((await actor.call('/', { body: 'not json' })).status, 400);
            assert.equal((await actor.call('/?countryCode=US')).status, 400);
            assert.equal((await actor.call('/?phone=%2B14155550132&maxResults=abc')).status, 400);
            assert.equal((await actor.call('/nope')).status, 404);
            assert.equal((await actor.call('/', { method: 'DELETE' })).status, 405);
            assert.equal(server.requests.length, 0);
        } finally {
            await actor.stop();
        }
    });

    it('returns 402 once the max charge limit is reached', async () => {
        const server = await mock();
        const actor = await startStandbyActor({ endpoint: server.url, maxTotalChargeUsd: 1 });
        try {
            const first = await actor.call('/?phone=%2B14155550001');
            assert.equal(first.status, 200);
            const second = await actor.call('/?phone=%2B14155550002');
            assert.equal(second.status, 402);
            assert.equal(server.requests.length, 1);
        } finally {
            await actor.stop();
        }
    });
});

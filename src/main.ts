import { Actor } from 'apify';
import { Phone, TombaClient } from 'tomba';

interface PhoneNumberInput {
    phoneNumber: string;
    countryCode?: string;
}

interface PhoneValidatorInput {
    tombaApiKey: string;
    tombaApiSecret: string;
    phoneNumbers: PhoneNumberInput[];
    maxResults?: number;
}

// Rate limiting function - 150 requests per minute
async function rateLimit(lastRequestTime: number): Promise<void> {
    const minInterval = 60000 / 150; // 150 requests per minute
    const timeSinceLastRequest = Date.now() - lastRequestTime;

    if (timeSinceLastRequest < minInterval) {
        const delay = minInterval - timeSinceLastRequest;
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), delay);
        });
    }
}

await Actor.init();

try {
    const input = await Actor.getInput<PhoneValidatorInput>();

    if (!input) {
        throw new Error('Input is required');
    }

    const { tombaApiKey, tombaApiSecret, phoneNumbers, maxResults = 50 } = input;

    if (!tombaApiKey || !tombaApiSecret) {
        throw new Error('Tomba API key and secret are required');
    }

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error('At least one phone number is required');
    }

    // Initialize Tomba client
    const client = new TombaClient();
    const phone = new Phone(client);

    client.setKey(tombaApiKey).setSecret(tombaApiSecret);

    console.log(`Starting phone validation for ${phoneNumbers.length} numbers`);

    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let lastRequestTime = 0;
    const startTime = Date.now();

    for (const phoneInput of phoneNumbers) {
        if (processedCount >= maxResults) {
            console.log(`Reached maximum results limit of ${maxResults}`);
            break;
        }

        // Extract phone number and country code from object
        const { phoneNumber, countryCode } = phoneInput;

        try {
            // Apply rate limiting
            await rateLimit(lastRequestTime);
            lastRequestTime = Date.now();

            console.log(`Validating phone number: ${phoneNumber}${countryCode ? ` (${countryCode})` : ''}`);

            // Use validator with optional country code
            const result = countryCode
                ? await phone.validator(phoneNumber, countryCode)
                : await phone.validator(phoneNumber);

            if (result && typeof result === 'object') {
                const resultData = result as Record<string, unknown>;

                if (resultData.data && typeof resultData.data === 'object') {
                    const data = resultData.data as Record<string, unknown>;

                    const validationResult = {
                        phone_number: phoneNumber,
                        valid: Boolean(data.valid),
                        country_code: data.country_code ? String(data.country_code) : undefined,
                        country_name: data.country_name ? String(data.country_name) : undefined,
                        location: data.location ? String(data.location) : undefined,
                        carrier: data.carrier ? String(data.carrier) : undefined,
                        line_type: data.line_type ? String(data.line_type) : undefined,
                        national_format: data.national_format ? String(data.national_format) : undefined,
                        international_format: data.international_format ? String(data.international_format) : undefined,
                        e164_format: data.e164_format ? String(data.e164_format) : undefined,
                        rfc3966_format: data.rfc3966_format ? String(data.rfc3966_format) : undefined,
                        timezone: data.timezone ? (data.timezone as string[]) : undefined,
                        input_country_code: countryCode,
                        source: 'tomba_phone_validator',
                    };

                    await Actor.pushData(validationResult);
                    processedCount++;
                    successCount++;

                    console.log(`Validated phone: ${phoneNumber} - Valid: ${validationResult.valid}`);
                } else {
                    console.log(`No validation data for phone number: ${phoneNumber}`);

                    const errorResult = {
                        phone_number: phoneNumber,
                        valid: false,
                        input_country_code: countryCode,
                        source: 'tomba_phone_validator',
                        error: 'No validation data returned',
                    };

                    await Actor.pushData(errorResult);
                    processedCount++;
                    errorCount++;
                }
            } else {
                console.log(`Invalid response for phone number: ${phoneNumber}`);

                const errorResult = {
                    phone_number: phoneNumber,
                    valid: false,
                    input_country_code: countryCode,
                    source: 'tomba_phone_validator',
                    error: 'Invalid API response',
                };

                await Actor.pushData(errorResult);
                processedCount++;
                errorCount++;
            }
        } catch (error) {
            console.error(`Error validating phone number ${phoneNumber}:`, error);

            const errorResult = {
                phone_number: phoneNumber,
                valid: false,
                input_country_code: countryCode,
                source: 'tomba_phone_validator',
                error: error instanceof Error ? error.message : 'Unknown error',
            };

            await Actor.pushData(errorResult);
            processedCount++;
            errorCount++;
        }

        // Small delay between requests
        await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 100);
        });
    }

    const endTime = Date.now();
    const executionTime = Math.round((endTime - startTime) / 1000);
    const successRate = processedCount > 0 ? Math.round((successCount / processedCount) * 100) : 0;
    const avgTimePerNumber = processedCount > 0 ? Math.round(executionTime / processedCount) : 0;

    // Log comprehensive summary
    console.log('\n PHONE VALIDATOR SUMMARY');
    console.log('================================');
    console.log(`Total phone numbers processed: ${processedCount}/${phoneNumbers.length}`);
    console.log(`Successful validations: ${successCount}`);
    console.log(`Failed validations: ${errorCount}`);
    console.log(`Success rate: ${successRate}%`);
    console.log(`Total execution time: ${executionTime} seconds`);
    console.log(`Average time per number: ${avgTimePerNumber} seconds`);
    console.log(`API requests made: ${processedCount}`);
    console.log(`Rate limiting: 150 requests/minute (${Math.round(60000 / 150)}ms interval)`);
    console.log('================================');

    console.log(`Phone validation completed. Processed ${processedCount} numbers.`);
} catch (error) {
    console.error('Phone validation failed:', error);
    throw error;
}

await Actor.exit();

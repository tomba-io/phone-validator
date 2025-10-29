# Tomba Phone Validator Actor

[![Actor](https://img.shields.io/badge/Apify-Actor-blue)](https://apify.com/actors)
[![Tomba API](https://img.shields.io/badge/Tomba-API-green)](https://tomba.io)
[![Rate Limit](https://img.shields.io/badge/Rate%20Limit-150%2Fmin-orange)](https://tomba.io/api)

A powerful Apify Actor that **validates phone numbers and retrieves their associated information** using the **Tomba Phone Validator API**. Perfect for data cleaning, contact verification, and phone number enrichment by validating phone numbers and getting detailed carrier, location, and formatting information.

## Key Features

- **Phone Number Validation**: Comprehensive validation of phone numbers from any country
- **Carrier Information**: Identify phone carriers and network providers
- **Line Type Detection**: Distinguish between mobile, landline, VoIP, and other line types
- **Multiple Formats**: Get phone numbers in various standard formats (national, international, E.164, RFC3966)
- **Location Data**: Country, region, and timezone information
- **Bulk Processing**: Validate hundreds of phone numbers efficiently with rate limiting
- **Rate Limited**: Respects Tomba's 150 requests per minute limit
- **International Support**: Support for phone numbers from all countries
- **Built-in Error Handling**: Robust processing with comprehensive error reporting

## How it works

The Actor leverages Tomba's powerful Phone Validator API to perform comprehensive phone number validation:

### Process Flow

1. **Authentication**: Connects to Tomba API using your credentials
2. **Input Processing**: Accepts array of phone number objects with optional country codes
3. **Phone Validation**: Uses Tomba's `validator` method for each phone number
4. **Data Enrichment**: Extracts carrier, location, and formatting information
5. **Rate Limiting**: Automatically handles 150 requests/minute limit
6. **Data Storage**: Saves detailed validation results to Apify dataset

### What does Phone Validator return?

For each validated phone number, the actor returns:

- **Phone Number**: The original input phone number
- **Valid**: Whether the phone number is valid
- **Carrier**: Phone carrier information (if available)
- **Line Type**: Type of phone line (mobile, landline, etc.)
- **Location**: Geographic location information
- **Country**: Country associated with the number
- **Format**: Phone number in national and international formats
- **Input Country Code**: The country code used for validation context (if provided)

## Usage Examples

### Basic Phone Validation

```json
{
    "tombaApiKey": "ta_xxxxxxxxxxxxxxxxxxxx",
    "tombaApiSecret": "ts_xxxxxxxxxxxxxxxxxxxx",
    "phoneNumbers": [
        { "phoneNumber": "+1 (555) 123-4567" },
        { "phoneNumber": "+33 6 12 34 56 78" },
        { "phoneNumber": "07911 123456", "countryCode": "GB" },
        { "phoneNumber": "(202) 555-0123", "countryCode": "US" }
    ],
    "maxResults": 50
}
```

### Phone Validation with Individual Country Codes

```json
{
    "tombaApiKey": "ta_xxxxxxxxxxxxxxxxxxxx",
    "tombaApiSecret": "ts_xxxxxxxxxxxxxxxxxxxx",
    "phoneNumbers": [
        { "phoneNumber": "07911 123456", "countryCode": "GB" },
        { "phoneNumber": "(202) 555-0123", "countryCode": "US" },
        { "phoneNumber": "06 12 34 56 78", "countryCode": "FR" },
        { "phoneNumber": "030 12345678", "countryCode": "DE" }
    ],
    "maxResults": 50
}
```

All phone numbers must be provided as objects with a `phoneNumber` property. The `countryCode` is optional but recommended for more accurate validation.

## Quick Start

### Prerequisites

1. **Tomba Account**: Sign up at [Tomba.io](https://app.tomba.io/api) to get your API credentials

### Getting Your API Keys

1. Visit [Tomba API Dashboard](https://app.tomba.io/api)
2. Copy your **API Key** (starts with `ta_`)
3. Copy your **Secret Key** (starts with `ts_`)

## Input Configuration

### Required Parameters

| Parameter        | Type                 | Description                     |
| ---------------- | -------------------- | ------------------------------- |
| `tombaApiKey`    | `string`             | Your Tomba API key (ta_xxxx)    |
| `tombaApiSecret` | `string`             | Your Tomba secret key (ts_xxxx) |
| `phoneNumbers`   | `PhoneNumberInput[]` | Array of phone number objects   |

### Phone Number Input Format

Each phone number must be provided as an object with the following structure:

```typescript
interface PhoneNumberInput {
    phoneNumber: string; // Required: The phone number to validate
    countryCode?: string; // Optional: ISO country code (e.g., 'US', 'GB', 'FR')
}
```

### Optional Parameters

| Parameter    | Type     | Default | Description                         |
| ------------ | -------- | ------- | ----------------------------------- |
| `maxResults` | `number` | `50`    | Maximum number of results to return |

### Example Input

```json
{
    "tombaApiKey": "ta_xxxxxxxxxxxxxxxxxxxx",
    "tombaApiSecret": "ts_xxxxxxxxxxxxxxxxxxxx",
    "phoneNumbers": [
        { "phoneNumber": "+1 (555) 123-4567" },
        { "phoneNumber": "+33 6 12 34 56 78", "countryCode": "FR" },
        { "phoneNumber": "07911 123456", "countryCode": "GB" },
        { "phoneNumber": "+81 90-1234-5678" }
    ],
    "maxResults": 100
}
```

### Best Practices

- **Input Format**: All phone numbers must be provided as objects with `phoneNumber` property
- **Country Codes**: Include optional `countryCode` for improved validation accuracy
- **Phone Format**: Phone numbers can be in any format - the API handles normalization
- **International Numbers**: Include country codes for best validation results
- **Rate Limits**: The Actor automatically handles Tomba's 150 requests/minute limit
- **Batch Size**: Process 50-100 phone numbers at a time for optimal performance
- **Data Quality**: Clean obvious formatting issues before validation to save API credits

## Output Data Structure

The Actor returns comprehensive validation information for each phone number:

```json
{
    "phone_number": "+1 (555) 123-4567",
    "valid": true,
    "country_code": "US",
    "country_name": "United States",
    "location": "New York",
    "carrier": "Verizon Wireless",
    "line_type": "mobile",
    "national_format": "(555) 123-4567",
    "international_format": "+1 555-123-4567",
    "e164_format": "+15551234567",
    "rfc3966_format": "tel:+1-555-123-4567",
    "timezone": ["America/New_York"],
    "input_country_code": "US",
    "source": "tomba_phone_validator"
}
```

### Data Fields Explained

- **phone_number**: Original input phone number
- **valid**: Boolean indicating if the phone number is valid
- **country_code**: ISO country code (US, GB, FR, etc.)
- **country_name**: Full country name
- **location**: Geographic location information
- **carrier**: Phone carrier/network provider name
- **line_type**: Type of phone line (mobile, landline, voip, toll-free, etc.)

#### Phone Number Formats

- **national_format**: Local/national format (e.g., "(555) 123-4567")
- **international_format**: International format (e.g., "+1 555-123-4567")
- **e164_format**: E.164 standard format (e.g., "+15551234567")
- **rfc3966_format**: RFC3966 URI format (e.g., "tel:+1-555-123-4567")

#### Additional Information

- **timezone**: Array of timezone identifiers for the location
- **input_country_code**: The country code that was provided as input (if any)
- **source**: Data source identifier (tomba_phone_validator)
- **error**: Error message if validation failed

## Use Cases

### Data Quality & Cleaning

- **Contact Database Cleanup**: Validate phone numbers in CRM and marketing databases
- **Import Validation**: Verify phone numbers during data import processes
- **Lead Qualification**: Ensure contact information quality for sales teams

### Compliance & Security

- **User Registration**: Validate phone numbers during account creation
- **Identity Verification**: Confirm phone number ownership and validity
- **Fraud Prevention**: Detect invalid or suspicious phone numbers

### Marketing & Outreach

- **SMS Campaigns**: Ensure deliverability for SMS marketing campaigns
- **Call Center Operations**: Validate phone numbers before outbound calling
- **Customer Support**: Verify customer contact information

### Business Intelligence

- **Geographic Analysis**: Analyze customer distribution by phone number location
- **Carrier Analysis**: Understand customer mobile vs. landline preferences
- **Market Research**: Validate contact lists for research and surveys

## Data Views

The Actor provides specialized data views:

### Overview View

Quick summary showing phone number, validation status, country, carrier, line type, and national format

### Detailed View

Comprehensive view with all validation data, formatting options, and technical details

### Valid Numbers View

Filtered view showing only successfully validated phone numbers with full details

## Resources & Documentation

### API Documentation

- [Tomba API Docs](https://tomba.io/api) - Complete API reference
- [Phone Validator Endpoint](https://docs.tomba.io/api/phone#phone-validator) - Specific validation documentation
- [Authentication Guide](https://app.tomba.io/api) - Get your API keys
- [Pricing & Limits](https://tomba.io/pricing) - Understand rate limits and costs

### Rate Limiting

- Tomba limits to **150 requests per minute**
- Actor automatically handles rate limiting with delays
- Large phone number lists may take time to complete

### Cost Considerations

- Each phone number validation = 1 Tomba API request
- Monitor your Tomba usage dashboard
- Consider Tomba's pricing tiers for volume usage

## FAQ

### General Questions

**Q: What does phone validation do?**
A: Phone validation checks if phone numbers are valid, reachable, and identifies the carrier, location, and phone type (mobile, landline, etc.) for each number.

**Q: What validation checks are performed?**
A: The service validates number format, checks if the number exists, identifies carrier information, determines phone type, and verifies reachability status.

**Q: How accurate is phone validation?**
A: Validation accuracy is typically 95%+ for most phone numbers. Results may vary by country and carrier, with some regions having more comprehensive data coverage.

### Technical Questions

**Q: How many phone numbers can I validate at once?**
A: You can validate up to 1000 phone numbers per run. For optimal performance, process 50-200 numbers per batch.

**Q: What phone number formats are accepted?**
A: Various formats are supported including international (+1 555-123-4567), national (555-123-4567), and local formats. Including country codes improves accuracy.

**Q: Do I need to specify country codes?**
A: While not always required, including country codes significantly improves validation accuracy, especially for international numbers.

### Validation Results

**Q: What do the different validation statuses mean?**
A: Results include valid (number exists and reachable), invalid (number doesn't exist), and unknown (couldn't verify). Additional flags provide carrier and type information.

**Q: What's the difference between mobile and landline validation?**
A: Mobile numbers can be validated for reachability and carrier, while landlines are checked for existence and location. Mobile validation is typically more comprehensive.

**Q: How should I handle international phone numbers?**
A: Use full international format with country codes (+44, +1, etc.). Different countries have varying validation capabilities and data availability.

### Business Applications

**Q: How can this help reduce communication costs?**
A: Validating numbers before calling or texting eliminates failed attempts, reduces bounce rates, and improves communication campaign efficiency.

**Q: Is this useful for fraud prevention?**
A: Yes! Validation helps identify suspicious numbers, temporary phones, and inconsistent location data that might indicate fraudulent activity.

**Q: Can I use this for customer database cleaning?**
A: Absolutely! Regular validation helps maintain clean contact databases, improves customer reachability, and ensures compliance with communication preferences.

## Keywords

phone validation, phone verification, phone number checker, contact validation, phone validator, mobile verification, landline validation, phone number analysis, carrier detection, number formatting, international numbers

## Support

If you need any help, have questions, or encounter any issues while using Tomba.io, please don't hesitate to reach out to our support team. You can contact us via:

- **Email**: support@tomba.io
- **Live chat**: Available on the Tomba.io website during business hours

## Contributing

We welcome contributions to improve this actor. Please feel free to submit issues, feature requests, or pull requests to help make this tool even better for the community.

## About Tomba

Founded in 2020, Tomba prides itself on being the most reliable, accurate, and in-depth source of email address data available anywhere. We process terabytes of data to produce our Email finder API.

![Tomba Logo](https://tomba.io/logo.png)

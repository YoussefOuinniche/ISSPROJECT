const SUPPORTED_MARKET_COUNTRY_CODES = Object.freeze([
  'US',
  'GB',
  'CA',
  'DE',
  'FR',
  'NL',
  'AU',
  'SG',
  'IN',
  'AE',
]);

const SUPPORTED_MARKET_COUNTRY_CODE_SET = new Set(SUPPORTED_MARKET_COUNTRY_CODES);

function normalizeMarketCountryCode(value) {
  return String(value || '').trim().toUpperCase();
}

function isSupportedMarketCountryCode(value) {
  const countryCode = normalizeMarketCountryCode(value);
  return SUPPORTED_MARKET_COUNTRY_CODE_SET.has(countryCode);
}

function getSupportedMarketCountryCodes() {
  return [...SUPPORTED_MARKET_COUNTRY_CODES];
}

module.exports = {
  SUPPORTED_MARKET_COUNTRY_CODES,
  getSupportedMarketCountryCodes,
  normalizeMarketCountryCode,
  isSupportedMarketCountryCode,
};

const { ingestRoleMarketData } = require('../services/roleMarketIngestionService');

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseOptionalInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function normalizeStringArray(value, transform) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .map((item) => (typeof transform === 'function' ? transform(item) : item));

  return items.length > 0 ? items : undefined;
}

function resolveCountryCodes(req) {
  const fromArray = normalizeStringArray(req.body?.countryCodes, (value) => value.toUpperCase());
  if (fromArray && fromArray.length > 0) {
    return fromArray;
  }

  const singleCountryCode = String(
    req.body?.countryCode || req.query?.countryCode || req.query?.country || ''
  )
    .trim()
    .toUpperCase();

  return singleCountryCode ? [singleCountryCode] : undefined;
}

function isManualIngestionEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_ROLE_MARKET_INGEST_ENDPOINT === 'true';
}

class MarketController {
  static async ingestRoleMarket(req, res) {
    try {
      if (!isManualIngestionEnabled()) {
        return res.status(403).json({
          success: false,
          message: 'Manual role market ingestion endpoint is disabled in production',
        });
      }

      const options = {
        roleSlugs: normalizeStringArray(req.body?.roleSlugs, (value) => value.toLowerCase()),
        countryCodes: resolveCountryCodes(req),
        sourceNames: normalizeStringArray(req.body?.sourceNames, (value) => value.toLowerCase()),
        includeSalaries: parseBooleanFlag(req.body?.includeSalaries, true),
        includeDemand: parseBooleanFlag(req.body?.includeDemand, true),
        limitRoles: parseOptionalInteger(req.body?.limitRoles, undefined),
        limitCountries: parseOptionalInteger(req.body?.limitCountries, undefined),
      };

      const result = await ingestRoleMarketData(options);

      return res.status(200).json({
        success: result.success,
        partialSuccess: result.partialSuccess,
        message: result.partialSuccess
          ? 'Role market ingestion completed with partial success'
          : 'Role market ingestion completed successfully',
        data: {
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          requestedCountryCodes: result.requestedCountryCodes,
          appliedCountryCodes: result.appliedCountryCodes,
          skippedUnsupportedCountries: result.skippedUnsupportedCountries,
          skippedMissingCountries: result.skippedMissingCountries,
          defaultedToSupportedCountries: result.defaultedToSupportedCountries,
          sourcesChecked: result.sourcesChecked,
          rolesProcessed: result.rolesProcessed,
          countriesProcessed: result.countriesProcessed,
          combinationsEvaluated: result.combinationsEvaluated,
          supportedCombinations: result.supportedCombinations,
          salaryRowsCollected: result.salaryRowsCollected,
          salaryRowsInserted: result.salaryRowsInserted,
          salaryRowsUpdated: result.salaryRowsUpdated,
          demandRowsCollected: result.demandRowsCollected,
          demandRowsInserted: result.demandRowsInserted,
          demandRowsUpdated: result.demandRowsUpdated,
          skippedRowsCount: result.skippedRowsCount,
          failedRowsCount: result.failedRowsCount,
          sourceResults: result.sourceResults,
          sourceLevelErrors: result.sourceLevelErrors,
          skippedRowsSample: result.skippedRowsSample,
          failedRowsSample: result.failedRowsSample,
        },
      });
    } catch (error) {
      console.error('Role market ingestion trigger error:', error);

      return res.status(error.status || 500).json({
        success: false,
        message: 'Error running role market ingestion',
        error: error.message,
        details: error.details || null,
      });
    }
  }
}

module.exports = MarketController;

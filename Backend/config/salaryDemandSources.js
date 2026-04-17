/**
 * Curated external providers approved for live role salary + demand ingestion.
 *
 * The ingestion service is source-driven so future scraping or secondary APIs can
 * be added without changing the orchestration flow.
 */

/**
 * @typedef {'api' | 'scrape'} SalaryDemandSourceType
 */

/**
 * @typedef {Object} SalaryDemandSource
 * @property {string} name
 * @property {string} displayName
 * @property {SalaryDemandSourceType} type
 * @property {string} provider
 * @property {boolean} enabled
 * @property {string[]} envVars
 * @property {string[]} supportedCountries
 * @property {Record<string, string>} countryCodeMap
 * @property {string} notes
 */

const SALARY_DEMAND_SOURCE_TYPES = Object.freeze({
  API: 'api',
  SCRAPE: 'scrape',
});

function defineSalaryDemandSource(source) {
  return Object.freeze({
    ...source,
    envVars: Object.freeze([...(source.envVars || [])]),
    supportedCountries: Object.freeze([...(source.supportedCountries || [])]),
    countryCodeMap: Object.freeze({ ...(source.countryCodeMap || {}) }),
  });
}

function cloneSalaryDemandSource(source) {
  return {
    ...source,
    envVars: [...source.envVars],
    supportedCountries: [...source.supportedCountries],
    countryCodeMap: { ...source.countryCodeMap },
  };
}

const ADZUNA_COUNTRY_CODE_MAP = Object.freeze({
  AE: 'ae',
  AU: 'au',
  BE: 'be',
  BR: 'br',
  CA: 'ca',
  CH: 'ch',
  DE: 'de',
  ES: 'es',
  FR: 'fr',
  GB: 'gb',
  IN: 'in',
  IT: 'it',
  MX: 'mx',
  NL: 'nl',
  NZ: 'nz',
  PL: 'pl',
  SG: 'sg',
  US: 'us',
  ZA: 'za',
});

/** @type {ReadonlyArray<Readonly<SalaryDemandSource>>} */
const salaryDemandSources = Object.freeze([
  defineSalaryDemandSource({
    name: 'adzuna',
    displayName: 'Adzuna API',
    type: SALARY_DEMAND_SOURCE_TYPES.API,
    provider: 'adzuna',
    enabled: true,
    envVars: ['ADZUNA_APP_ID', 'ADZUNA_APP_KEY'],
    supportedCountries: Object.keys(ADZUNA_COUNTRY_CODE_MAP),
    countryCodeMap: ADZUNA_COUNTRY_CODE_MAP,
    notes:
      'Primary live source for role demand and salary signals. Coverage is limited to Adzuna-supported job markets. Future fallback scraping providers should be added here, not hard-coded into the orchestrator.',
  }),
]);

function getAllSalaryDemandSources() {
  return salaryDemandSources.map(cloneSalaryDemandSource);
}

function getEnabledSalaryDemandSources(options = {}) {
  const selectedNames = new Set(
    (Array.isArray(options.names) ? options.names : [])
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean)
  );

  return salaryDemandSources
    .filter((source) => {
      if (!source.enabled) {
        return false;
      }

      if (selectedNames.size === 0) {
        return true;
      }

      return selectedNames.has(source.name.toLowerCase());
    })
    .map(cloneSalaryDemandSource);
}

function getSalaryDemandSourceByName(name) {
  const normalized = String(name || '').trim().toLowerCase();
  const source = salaryDemandSources.find((entry) => entry.name.toLowerCase() === normalized);
  return source ? cloneSalaryDemandSource(source) : null;
}

module.exports = {
  SALARY_DEMAND_SOURCE_TYPES,
  ADZUNA_COUNTRY_CODE_MAP,
  salaryDemandSources,
  getAllSalaryDemandSources,
  getEnabledSalaryDemandSources,
  getSalaryDemandSourceByName,
};

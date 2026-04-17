const axios = require('axios');
const { getSalaryDemandSourceByName } = require('../config/salaryDemandSources');

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_RESULTS_PER_PAGE = 50;
const DEFAULT_MAX_DAYS_OLD = 30;

function asText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeCountryCode(value) {
  return asText(value).toUpperCase();
}

function normalizeRoleSlug(value) {
  return asText(value).toLowerCase();
}

function buildQueryString(params) {
  const search = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    search.set(key, String(value));
  });

  return search.toString();
}

function buildSanitizedSourceUrl(baseUrl, path, params) {
  const cleanedBase = asText(baseUrl, 'https://api.adzuna.com/v1/api/jobs').replace(/\/$/, '');
  const query = buildQueryString(params);
  return `${cleanedBase}${path}${query ? `?${query}` : ''}`;
}

function getAdzunaConfig(source = getSalaryDemandSourceByName('adzuna')) {
  const baseUrl = asText(process.env.ADZUNA_BASE_URL, 'https://api.adzuna.com/v1/api/jobs').replace(/\/$/, '');
  const appId = asText(process.env.ADZUNA_APP_ID);
  const appKey = asText(process.env.ADZUNA_APP_KEY);
  const timeoutMs = safeNumber(process.env.ADZUNA_REQUEST_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const resultsPerPage = Math.max(
    1,
    Math.min(50, Math.trunc(safeNumber(process.env.ADZUNA_RESULTS_PER_PAGE, DEFAULT_RESULTS_PER_PAGE)))
  );
  const maxDaysOld = Math.max(
    1,
    Math.min(365, Math.trunc(safeNumber(process.env.ADZUNA_MAX_DAYS_OLD, DEFAULT_MAX_DAYS_OLD)))
  );

  const missingEnvVars = [];
  (source?.envVars || []).forEach((envVarName) => {
    if (!asText(process.env[envVarName])) {
      missingEnvVars.push(envVarName);
    }
  });

  return {
    baseUrl,
    appId,
    appKey,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS,
    resultsPerPage,
    maxDaysOld,
    missingEnvVars,
  };
}

function createAdzunaClient(config) {
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeoutMs,
  });
}

function resolveAdzunaMarketCode(source, countryCode) {
  const normalized = normalizeCountryCode(countryCode);
  return source?.countryCodeMap?.[normalized] || null;
}

function normalizeHistogramBuckets(histogram) {
  return Object.entries(histogram || {})
    .map(([salaryFloor, vacancyCount]) => ({
      salaryFloor: safeNumber(salaryFloor),
      vacancyCount: Math.max(0, Math.trunc(safeNumber(vacancyCount, 0))),
    }))
    .filter((row) => Number.isFinite(row.salaryFloor) && row.salaryFloor > 0 && row.vacancyCount > 0)
    .sort((left, right) => left.salaryFloor - right.salaryFloor);
}

function computeHistogramAverage(histogram) {
  const buckets = normalizeHistogramBuckets(histogram);
  if (buckets.length === 0) {
    return null;
  }

  let weightedTotal = 0;
  let vacancyTotal = 0;

  buckets.forEach((bucket) => {
    weightedTotal += bucket.salaryFloor * bucket.vacancyCount;
    vacancyTotal += bucket.vacancyCount;
  });

  if (vacancyTotal <= 0) {
    return null;
  }

  return Number((weightedTotal / vacancyTotal).toFixed(2));
}

function computeSearchSampleAverage(results) {
  const salaries = (Array.isArray(results) ? results : [])
    .map((item) => {
      const salaryMin = safeNumber(item?.salary_min);
      const salaryMax = safeNumber(item?.salary_max);

      if (Number.isFinite(salaryMin) && Number.isFinite(salaryMax) && salaryMin > 0 && salaryMax > 0) {
        return (salaryMin + salaryMax) / 2;
      }

      if (Number.isFinite(salaryMin) && salaryMin > 0) {
        return salaryMin;
      }

      if (Number.isFinite(salaryMax) && salaryMax > 0) {
        return salaryMax;
      }

      return null;
    })
    .filter((value) => Number.isFinite(value));

  if (salaries.length === 0) {
    return null;
  }

  const total = salaries.reduce((sum, value) => sum + value, 0);
  return Number((total / salaries.length).toFixed(2));
}

function createProviderError(code, message, statusCode, details) {
  const error = new Error(message);
  error.code = code;
  error.statusCode = statusCode;
  error.status = statusCode;
  error.details = details || null;
  return error;
}

async function requestAdzuna(source, path, params, meta = {}) {
  const config = getAdzunaConfig(source);

  if (config.missingEnvVars.length > 0) {
    throw createProviderError(
      'ADZUNA_CONFIG_MISSING',
      `Missing required Adzuna env vars: ${config.missingEnvVars.join(', ')}`,
      500,
      { missingEnvVars: config.missingEnvVars }
    );
  }

  const client = createAdzunaClient(config);

  console.info('[Adzuna] request start', {
    path,
    query: meta.queryTitle,
    roleSlug: meta.roleSlug,
    countryCode: meta.countryCode,
  });

  try {
    const response = await client.get(path, {
      params: {
        app_id: config.appId,
        app_key: config.appKey,
        'content-type': 'application/json',
        ...params,
      },
    });

    return {
      data: response.data,
      sourceUrl: buildSanitizedSourceUrl(config.baseUrl, path, params),
    };
  } catch (error) {
    if (error.response) {
      const statusCode = error.response.status;
      const detail =
        error.response.data?.message ||
        error.response.data?.error ||
        `Adzuna request failed with status ${statusCode}`;

      if (statusCode === 401 || statusCode === 403) {
        throw createProviderError('ADZUNA_AUTH_ERROR', detail, statusCode);
      }

      if (statusCode === 404) {
        throw createProviderError('ADZUNA_NOT_FOUND', detail, statusCode);
      }

      throw createProviderError('ADZUNA_REQUEST_FAILED', detail, statusCode);
    }

    if (error.code === 'ECONNABORTED') {
      throw createProviderError('ADZUNA_TIMEOUT', error.message || 'Adzuna request timed out', 504);
    }

    throw createProviderError('ADZUNA_NETWORK_ERROR', error.message || 'Adzuna request failed', 502);
  }
}

async function fetchSearchPayload(source, roleSlug, queryTitle, countryCode) {
  const marketCode = resolveAdzunaMarketCode(source, countryCode);
  if (!marketCode) {
    throw createProviderError(
      'ADZUNA_UNSUPPORTED_COUNTRY',
      `Adzuna is not configured for country ${normalizeCountryCode(countryCode)}`,
      400
    );
  }

  const config = getAdzunaConfig(source);
  const path = `/${marketCode}/search/1`;
  const params = {
    what: queryTitle,
    results_per_page: config.resultsPerPage,
    max_days_old: config.maxDaysOld,
  };

  return requestAdzuna(source, path, params, {
    roleSlug,
    queryTitle,
    countryCode,
  });
}

async function fetchHistogramPayload(source, roleSlug, queryTitle, countryCode) {
  const marketCode = resolveAdzunaMarketCode(source, countryCode);
  if (!marketCode) {
    throw createProviderError(
      'ADZUNA_UNSUPPORTED_COUNTRY',
      `Adzuna is not configured for country ${normalizeCountryCode(countryCode)}`,
      400
    );
  }

  const path = `/${marketCode}/histogram`;
  const params = {
    what: queryTitle,
  };

  return requestAdzuna(source, path, params, {
    roleSlug,
    queryTitle,
    countryCode,
  });
}

async function fetchRoleDemand(source, role, country, queryTitle) {
  const collectedAt = new Date().toISOString();
  const searchResult = await fetchSearchPayload(source, role.slug, queryTitle, country.code);
  const jobCount = Math.max(0, Math.trunc(safeNumber(searchResult.data?.count, 0)));

  return {
    record: {
      role_slug: normalizeRoleSlug(role.slug),
      country_code: normalizeCountryCode(country.code),
      job_count: jobCount,
      source_name: asText(source.displayName, 'Adzuna API'),
      collected_at: collectedAt,
    },
    sourceUrl: searchResult.sourceUrl,
    raw: {
      count: jobCount,
      resultCount: Array.isArray(searchResult.data?.results) ? searchResult.data.results.length : 0,
    },
  };
}

async function fetchRoleSalary(source, role, country, queryTitle, searchPayload = null) {
  const collectedAt = new Date().toISOString();
  const histogramResult = await fetchHistogramPayload(source, role.slug, queryTitle, country.code);
  const histogramAverage = computeHistogramAverage(histogramResult.data?.histogram);

  if (Number.isFinite(histogramAverage) && histogramAverage > 0) {
    return {
      record: {
        role_slug: normalizeRoleSlug(role.slug),
        country_code: normalizeCountryCode(country.code),
        avg_salary: histogramAverage,
        currency: asText(country.currency).toUpperCase(),
        source_name: asText(source.displayName, 'Adzuna API'),
        source_url: histogramResult.sourceUrl,
        collected_at: collectedAt,
      },
      sourceUrl: histogramResult.sourceUrl,
      raw: {
        method: 'histogram',
        buckets: Object.keys(histogramResult.data?.histogram || {}).length,
      },
    };
  }

  const fallbackSearchResult =
    searchPayload ||
    (await fetchSearchPayload(source, role.slug, queryTitle, country.code));
  const searchAverage = computeSearchSampleAverage(fallbackSearchResult.data?.results);

  if (Number.isFinite(searchAverage) && searchAverage > 0) {
    return {
      record: {
        role_slug: normalizeRoleSlug(role.slug),
        country_code: normalizeCountryCode(country.code),
        avg_salary: searchAverage,
        currency: asText(country.currency).toUpperCase(),
        source_name: asText(source.displayName, 'Adzuna API'),
        source_url: fallbackSearchResult.sourceUrl,
        collected_at: collectedAt,
      },
      sourceUrl: fallbackSearchResult.sourceUrl,
      raw: {
        method: 'search_sample',
        sampledResults: Array.isArray(fallbackSearchResult.data?.results)
          ? fallbackSearchResult.data.results.length
          : 0,
      },
    };
  }

  return null;
}

async function fetchRoleMarketSnapshot(options = {}) {
  const source = options.source || getSalaryDemandSourceByName('adzuna');
  const role = options.role || {};
  const country = options.country || {};
  const queryTitle = asText(options.queryTitle);

  if (!source || source.provider !== 'adzuna') {
    throw createProviderError('ADZUNA_SOURCE_INVALID', 'Adzuna source configuration is required', 500);
  }

  if (!queryTitle) {
    throw createProviderError('ADZUNA_QUERY_MISSING', 'Adzuna query title is required', 400);
  }

  const searchResult = await fetchSearchPayload(source, role.slug, queryTitle, country.code);
  const demand = {
    role_slug: normalizeRoleSlug(role.slug),
    country_code: normalizeCountryCode(country.code),
    job_count: Math.max(0, Math.trunc(safeNumber(searchResult.data?.count, 0))),
    source_name: asText(source.displayName, 'Adzuna API'),
    collected_at: new Date().toISOString(),
  };

  const salaryResult = await fetchRoleSalary(
    source,
    role,
    country,
    queryTitle,
    searchResult
  ).catch((error) => {
    if (error?.code === 'ADZUNA_UNSUPPORTED_COUNTRY') {
      throw error;
    }

    console.warn('[Adzuna] salary fetch failed', {
      roleSlug: role.slug,
      countryCode: country.code,
      message: error.message,
    });
    return null;
  });

  return {
    salary: salaryResult?.record || null,
    salarySourceUrl: salaryResult?.sourceUrl || null,
    demand,
    demandSourceUrl: searchResult.sourceUrl,
    meta: {
      queryTitle,
      salaryMethod: salaryResult?.raw?.method || null,
      resultCount: Array.isArray(searchResult.data?.results) ? searchResult.data.results.length : 0,
    },
  };
}

module.exports = {
  computeHistogramAverage,
  computeSearchSampleAverage,
  fetchRoleDemand,
  fetchRoleSalary,
  fetchRoleMarketSnapshot,
  getAdzunaConfig,
  resolveAdzunaMarketCode,
};

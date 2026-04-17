const { getRoleQueryConfig } = require('../config/roleQueryMap');
const {
  getEnabledSalaryDemandSources,
} = require('../config/salaryDemandSources');
const {
  getSupportedMarketCountryCodes,
  isSupportedMarketCountryCode,
} = require('../config/supportedMarketCountries');
const { fetchRoleMarketSnapshot } = require('./adzunaService');
const RoleMarket = require('../models/RoleMarket');

function asText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizeRoleSlug(value) {
  return asText(value).toLowerCase();
}

function normalizeCountryCode(value) {
  return asText(value).toUpperCase();
}

function normalizeCountryCodeList(values) {
  const seen = new Set();
  const normalized = [];

  for (const value of Array.isArray(values) ? values : []) {
    const countryCode = normalizeCountryCode(value);
    if (!countryCode || seen.has(countryCode)) {
      continue;
    }

    seen.add(countryCode);
    normalized.push(countryCode);
  }

  return normalized;
}

function resolveIngestionCountrySelection(inputCountryCodes) {
  const supportedCountryCodes = getSupportedMarketCountryCodes();
  const requestedCountryCodes = normalizeCountryCodeList(inputCountryCodes);

  if (requestedCountryCodes.length === 0) {
    return {
      requestedCountryCodes: [],
      appliedCountryCodes: supportedCountryCodes,
      skippedUnsupportedCountries: [],
      defaultedToSupportedCountries: true,
    };
  }

  const appliedCountryCodes = requestedCountryCodes.filter((countryCode) =>
    isSupportedMarketCountryCode(countryCode)
  );
  const skippedUnsupportedCountries = requestedCountryCodes.filter(
    (countryCode) => !isSupportedMarketCountryCode(countryCode)
  );

  return {
    requestedCountryCodes,
    appliedCountryCodes,
    skippedUnsupportedCountries,
    defaultedToSupportedCountries: false,
  };
}

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = asText(value).toLowerCase();
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

function toErrorMessage(error) {
  return asText(error?.message || error || 'Unknown role market ingestion error');
}

function uniqueQueryCandidates(values) {
  const seen = new Set();
  const output = [];

  for (const value of Array.isArray(values) ? values : []) {
    const query = asText(value);
    if (!query) {
      continue;
    }

    const key = query.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(query);
  }

  return output;
}

function resolveRoleQueryCandidates(role) {
  const roleSlug = normalizeRoleSlug(role?.slug);
  const roleName = asText(role?.name);
  const config = getRoleQueryConfig(roleSlug, roleName);

  return uniqueQueryCandidates([
    config.primary,
    ...(Array.isArray(config.aliases) ? config.aliases : []),
    roleName,
  ]);
}

function hasUsefulSalaryRecord(record) {
  return Number.isFinite(Number(record?.avg_salary)) && Number(record?.avg_salary) > 0;
}

function hasUsefulDemandRecord(record) {
  return Number.isFinite(Number(record?.job_count)) && Number(record?.job_count) > 0;
}

function pickBestSalaryRecord(current, candidate) {
  if (!hasUsefulSalaryRecord(candidate)) {
    return current;
  }

  if (!hasUsefulSalaryRecord(current)) {
    return candidate;
  }

  return Number(candidate.avg_salary) > Number(current.avg_salary) ? candidate : current;
}

function pickBestDemandRecord(current, candidate) {
  if (!hasUsefulDemandRecord(candidate)) {
    return current;
  }

  if (!hasUsefulDemandRecord(current)) {
    return candidate;
  }

  return Number(candidate.job_count) > Number(current.job_count) ? candidate : current;
}

async function fetchBestRoleMarketSnapshotForQueries({
  fetcher,
  source,
  role,
  country,
  queryCandidates,
  includeSalaries,
  includeDemand,
}) {
  let bestSalary = null;
  let bestDemand = null;
  let selectedSalaryQuery = null;
  let selectedDemandQuery = null;
  let queryAttempts = 0;

  for (let index = 0; index < queryCandidates.length; index += 1) {
    const queryTitle = queryCandidates[index];
    queryAttempts += 1;

    let snapshot;
    try {
      snapshot = await fetcher({
        source,
        role,
        country,
        queryTitle,
      });
    } catch (error) {
      const message = toErrorMessage(error);
      console.warn('[RoleMarketIngestion] query attempt failed', {
        roleSlug: normalizeRoleSlug(role?.slug),
        countryCode: normalizeCountryCode(country?.code),
        queryTitle,
        message,
      });
      continue;
    }

    const salaryBefore = bestSalary;
    const demandBefore = bestDemand;

    bestSalary = pickBestSalaryRecord(bestSalary, snapshot?.salary || null);
    bestDemand = pickBestDemandRecord(bestDemand, snapshot?.demand || null);

    if (bestSalary !== salaryBefore && hasUsefulSalaryRecord(bestSalary)) {
      selectedSalaryQuery = queryTitle;
    }

    if (bestDemand !== demandBefore && hasUsefulDemandRecord(bestDemand)) {
      selectedDemandQuery = queryTitle;
    }

    if (index > 0 && (bestSalary !== salaryBefore || bestDemand !== demandBefore)) {
      console.info('[RoleMarketIngestion] fallback query succeeded', {
        roleSlug: normalizeRoleSlug(role?.slug),
        countryCode: normalizeCountryCode(country?.code),
        sourceName: source?.name,
        queryTitle,
        salaryCaptured: bestSalary !== salaryBefore,
        demandCaptured: bestDemand !== demandBefore,
      });
    }

    const hasRequestedSalary = !includeSalaries || hasUsefulSalaryRecord(bestSalary);
    const hasRequestedDemand = !includeDemand || hasUsefulDemandRecord(bestDemand);
    if (hasRequestedSalary && hasRequestedDemand) {
      break;
    }
  }

  return {
    salary: hasUsefulSalaryRecord(bestSalary) ? bestSalary : null,
    demand: hasUsefulDemandRecord(bestDemand) ? bestDemand : null,
    meta: {
      selectedSalaryQuery,
      selectedDemandQuery,
      queryAttempts,
      queryCandidates,
    },
  };
}

function getSourceFetcher(source) {
  if (source.provider === 'adzuna') {
    return fetchRoleMarketSnapshot;
  }

  const error = new Error(`Unsupported role market source provider: ${source.provider}`);
  error.code = 'UNSUPPORTED_ROLE_MARKET_PROVIDER';
  throw error;
}

function createSourceResult(source) {
  return {
    sourceName: source.name,
    displayName: source.displayName,
    provider: source.provider,
    type: source.type,
    attemptedCount: 0,
    succeededCount: 0,
    failedCount: 0,
    unsupportedCountryCount: 0,
    lastError: null,
  };
}

function pushSkippedRow(collection, row) {
  collection.push({
    table: row.table,
    role_slug: normalizeRoleSlug(row.role_slug),
    country_code: normalizeCountryCode(row.country_code),
    source_name: asText(row.source_name) || null,
    reason: asText(row.reason, 'skipped'),
  });
}

function pushFailedRow(collection, row) {
  collection.push({
    role_slug: normalizeRoleSlug(row.role_slug),
    country_code: normalizeCountryCode(row.country_code),
    source_name: asText(row.source_name) || null,
    message: asText(row.message, 'Unknown source error'),
  });
}

async function ingestRoleMarketData(options = {}) {
  const startedAt = new Date().toISOString();
  const includeSalaries = parseBooleanFlag(options.includeSalaries, true);
  const includeDemand = parseBooleanFlag(options.includeDemand, true);
  const countrySelection = resolveIngestionCountrySelection(options.countryCodes);
  const sources = getEnabledSalaryDemandSources({ names: options.sourceNames });
  const sourceResults = sources.map((source) => createSourceResult(source));
  const sourceResultsByName = new Map(sourceResults.map((entry) => [entry.sourceName, entry]));
  const sourceLevelErrors = [];
  const skippedRows = [];
  const failedRows = [];

  if (!includeSalaries && !includeDemand) {
    const nothingToDo = new Error('At least one of includeSalaries or includeDemand must be true.');
    nothingToDo.status = 400;
    throw nothingToDo;
  }

  if (sources.length === 0) {
    const noSourcesError = new Error('No enabled salary/demand sources matched this ingestion request.');
    noSourcesError.status = 400;
    throw noSourcesError;
  }

  if (countrySelection.defaultedToSupportedCountries) {
    console.info('[RoleMarketIngestion] countryCodes not provided; defaulting to MVP supported countries', {
      appliedCountryCodes: countrySelection.appliedCountryCodes,
    });
  }

  if (countrySelection.skippedUnsupportedCountries.length > 0) {
    console.warn('[RoleMarketIngestion] ignored unsupported country codes', {
      skippedUnsupportedCountries: countrySelection.skippedUnsupportedCountries,
      supportedCountryCodes: getSupportedMarketCountryCodes(),
    });
  }

  if (
    countrySelection.requestedCountryCodes.length > 0 &&
    countrySelection.appliedCountryCodes.length === 0
  ) {
    console.warn('[RoleMarketIngestion] all requested country codes were unsupported; no country ingestion will run', {
      requestedCountryCodes: countrySelection.requestedCountryCodes,
    });
  }

  const schemaValidation = await RoleMarket.validateSchema();
  if (!schemaValidation.valid) {
    const schemaError = new Error('Role market schema is not ready for country_code-based ingestion.');
    schemaError.status = 500;
    schemaError.details = schemaValidation.issues;
    throw schemaError;
  }

  const countriesPromise = countrySelection.appliedCountryCodes.length > 0
    ? RoleMarket.findCountries({
        countryCodes: countrySelection.appliedCountryCodes,
        limit: options.limitCountries,
      })
    : Promise.resolve([]);

  const [roles, countries] = await Promise.all([
    RoleMarket.findRoles({
      roleSlugs: options.roleSlugs,
      limit: options.limitRoles,
    }),
    countriesPromise,
  ]);

  const countriesFoundCodes = new Set(
    countries.map((country) => normalizeCountryCode(country.code)).filter(Boolean)
  );
  const skippedMissingCountries = countrySelection.appliedCountryCodes.filter(
    (countryCode) => !countriesFoundCodes.has(countryCode)
  );

  if (skippedMissingCountries.length > 0) {
    console.warn('[RoleMarketIngestion] supported countries missing in countries table', {
      skippedMissingCountries,
    });
  }

  if (roles.length === 0 || countries.length === 0) {
    return {
      success: true,
      partialSuccess: false,
      startedAt,
      completedAt: new Date().toISOString(),
      requestedCountryCodes: countrySelection.requestedCountryCodes,
      appliedCountryCodes: countrySelection.appliedCountryCodes,
      skippedUnsupportedCountries: countrySelection.skippedUnsupportedCountries,
      skippedMissingCountries,
      defaultedToSupportedCountries: countrySelection.defaultedToSupportedCountries,
      sourcesChecked: sources.length,
      sourceResults,
      sourceLevelErrors,
      rolesProcessed: roles.length,
      countriesProcessed: countries.length,
      combinationsEvaluated: roles.length * countries.length,
      supportedCombinations: 0,
      salaryRowsCollected: 0,
      salaryRowsInserted: 0,
      salaryRowsUpdated: 0,
      demandRowsCollected: 0,
      demandRowsInserted: 0,
      demandRowsUpdated: 0,
      skippedRowsCount: 0,
      failedRowsCount: 0,
      skippedRowsSample: [],
      failedRowsSample: [],
      persistence: {
        salaries: null,
        demand: null,
      },
    };
  }

  const salaryItems = [];
  const demandItems = [];
  let supportedCombinations = 0;

  for (const role of roles) {
    const queryCandidates = resolveRoleQueryCandidates(role);
    if (queryCandidates.length === 0) {
      pushSkippedRow(skippedRows, {
        table: 'role_market',
        role_slug: role.slug,
        country_code: '',
        source_name: '',
        reason: 'missing_role_query',
      });
      continue;
    }

    for (const country of countries) {
      const countryCode = normalizeCountryCode(country.code);
      const compatibleSources = sources.filter((source) =>
        source.supportedCountries.includes(countryCode)
      );

      if (compatibleSources.length === 0) {
        pushSkippedRow(skippedRows, {
          table: 'role_market',
          role_slug: role.slug,
          country_code: countryCode,
          source_name: '',
          reason: 'unsupported_country',
        });

        sources.forEach((source) => {
          const sourceResult = sourceResultsByName.get(source.name);
          if (sourceResult) {
            sourceResult.unsupportedCountryCount += 1;
          }
        });

        continue;
      }

      supportedCombinations += 1;
      let combinationSucceeded = false;

      for (const source of compatibleSources) {
        const sourceResult = sourceResultsByName.get(source.name);
        const fetcher = getSourceFetcher(source);

        if (sourceResult) {
          sourceResult.attemptedCount += 1;
        }

        try {
          const snapshot = await fetchBestRoleMarketSnapshotForQueries({
            fetcher,
            source,
            role,
            country,
            queryCandidates,
            includeSalaries,
            includeDemand,
          });

          const hasSnapshotSalary = hasUsefulSalaryRecord(snapshot.salary);
          const hasSnapshotDemand = hasUsefulDemandRecord(snapshot.demand);

          if (includeSalaries) {
            if (hasSnapshotSalary) {
              salaryItems.push(snapshot.salary);
            } else {
              pushSkippedRow(skippedRows, {
                table: 'role_salaries',
                role_slug: role.slug,
                country_code: countryCode,
                source_name: source.displayName,
                reason: 'salary_unavailable',
              });
            }
          }

          if (includeDemand) {
            if (hasSnapshotDemand) {
              demandItems.push(snapshot.demand);
            } else {
              pushSkippedRow(skippedRows, {
                table: 'role_demand',
                role_slug: role.slug,
                country_code: countryCode,
                source_name: source.displayName,
                reason: 'demand_unavailable',
              });
            }
          }

          if (sourceResult && (hasSnapshotSalary || hasSnapshotDemand)) {
            sourceResult.succeededCount += 1;
          }

          if (hasSnapshotSalary || hasSnapshotDemand) {
            combinationSucceeded = true;
            break;
          }
        } catch (error) {
          const message = toErrorMessage(error);
          if (sourceResult) {
            sourceResult.failedCount += 1;
            sourceResult.lastError = message;
          }

          pushFailedRow(failedRows, {
            role_slug: role.slug,
            country_code: countryCode,
            source_name: source.displayName,
            message,
          });

          sourceLevelErrors.push({
            sourceName: source.name,
            provider: source.provider,
            role_slug: normalizeRoleSlug(role.slug),
            country_code: countryCode,
            message,
          });
        }
      }

      if (!combinationSucceeded) {
        pushSkippedRow(skippedRows, {
          table: 'role_market',
          role_slug: role.slug,
          country_code: countryCode,
          source_name: compatibleSources[0]?.displayName || null,
          reason: 'all_sources_failed',
        });
      }
    }
  }

  let salaryPersistence = {
    success: true,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateInputCount: 0,
    failedRowCount: 0,
    invalidRows: [],
    failedRows: [],
  };

  let demandPersistence = {
    success: true,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 0,
    duplicateInputCount: 0,
    failedRowCount: 0,
    invalidRows: [],
    failedRows: [],
  };

  if (includeSalaries && salaryItems.length > 0) {
    salaryPersistence = await RoleMarket.upsertRoleSalaries(salaryItems, {
      collectedAt: startedAt,
    });
  }

  if (includeDemand && demandItems.length > 0) {
    demandPersistence = await RoleMarket.upsertRoleDemand(demandItems, {
      collectedAt: startedAt,
    });
  }

  const completedAt = new Date().toISOString();
  const allFailedRows = [
    ...failedRows,
    ...salaryPersistence.failedRows,
    ...demandPersistence.failedRows,
  ];
  const allSkippedRows = [
    ...skippedRows,
    ...salaryPersistence.invalidRows.map((row) => ({
      table: 'role_salaries',
      role_slug: row.role_slug,
      country_code: row.country_code,
      source_name: null,
      reason: row.errors.join(', '),
    })),
    ...demandPersistence.invalidRows.map((row) => ({
      table: 'role_demand',
      role_slug: row.role_slug,
      country_code: row.country_code,
      source_name: null,
      reason: row.errors.join(', '),
    })),
  ];

  const success = sourceLevelErrors.length === 0 && salaryPersistence.success && demandPersistence.success;
  const partialSuccess =
    !success &&
    (salaryPersistence.insertedCount > 0 ||
      salaryPersistence.updatedCount > 0 ||
      demandPersistence.insertedCount > 0 ||
      demandPersistence.updatedCount > 0);

  return {
    success,
    partialSuccess,
    startedAt,
    completedAt,
    requestedCountryCodes: countrySelection.requestedCountryCodes,
    appliedCountryCodes: countrySelection.appliedCountryCodes,
    skippedUnsupportedCountries: countrySelection.skippedUnsupportedCountries,
    skippedMissingCountries,
    defaultedToSupportedCountries: countrySelection.defaultedToSupportedCountries,
    sourcesChecked: sources.length,
    sourceResults,
    sourceLevelErrors,
    rolesProcessed: roles.length,
    countriesProcessed: countries.length,
    combinationsEvaluated: roles.length * countries.length,
    supportedCombinations,
    salaryRowsCollected: salaryItems.length,
    salaryRowsInserted: salaryPersistence.insertedCount,
    salaryRowsUpdated: salaryPersistence.updatedCount,
    demandRowsCollected: demandItems.length,
    demandRowsInserted: demandPersistence.insertedCount,
    demandRowsUpdated: demandPersistence.updatedCount,
    skippedRowsCount: allSkippedRows.length,
    failedRowsCount: allFailedRows.length,
    skippedRowsSample: allSkippedRows.slice(0, 50),
    failedRowsSample: allFailedRows.slice(0, 50),
    persistence: {
      salaries: salaryPersistence,
      demand: demandPersistence,
    },
  };
}

module.exports = {
  ingestRoleMarketData,
};

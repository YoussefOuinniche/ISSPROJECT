const { supabase } = require('../config/database');
const {
  SUPPORTED_MARKET_COUNTRY_CODES,
  isSupportedMarketCountryCode,
} = require('../config/supportedMarketCountries');

const UPSERT_BATCH_SIZE = 100;

function asText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function safeNumber(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeTimestamp(value) {
  const text = asText(value);
  if (!text) {
    return null;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizeCountryCode(value) {
  return asText(value).toUpperCase();
}

function normalizeRoleSlug(value) {
  return asText(value).toLowerCase();
}

function chunkArray(items, size) {
  const rows = Array.isArray(items) ? items : [];
  const chunkSize = Math.max(1, Number(size) || UPSERT_BATCH_SIZE);
  const chunks = [];

  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }

  return chunks;
}

function uniqueValues(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
}

function toCompositeKey(roleSlug, countryCode) {
  return `${normalizeRoleSlug(roleSlug)}::${normalizeCountryCode(countryCode)}`;
}

function getLatestCollectedTime(row) {
  const parsed = new Date(row?.collected_at || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function reduceLatestRowsByCountry(rows) {
  const latestByCountry = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const countryCode = normalizeCountryCode(row?.country_code);
    if (!countryCode) {
      return;
    }

    const current = latestByCountry.get(countryCode);
    if (!current || getLatestCollectedTime(row) >= getLatestCollectedTime(current)) {
      latestByCountry.set(countryCode, row);
    }
  });

  return latestByCountry;
}

function reduceLatestRowsByRole(rows) {
  const latestByRole = new Map();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const roleSlug = normalizeRoleSlug(row?.role_slug);
    if (!roleSlug) {
      return;
    }

    const current = latestByRole.get(roleSlug);
    if (!current || getLatestCollectedTime(row) >= getLatestCollectedTime(current)) {
      latestByRole.set(roleSlug, row);
    }
  });

  return latestByRole;
}

function normalizeRoleMarketRow(salaryRow, demandRow, countryRow) {
  const salaryCollectedAt = normalizeTimestamp(salaryRow?.collected_at);
  const demandCollectedAt = normalizeTimestamp(demandRow?.collected_at);
  const collectedAtCandidates = [salaryCollectedAt, demandCollectedAt].filter(Boolean);
  const latestCollectedAt =
    collectedAtCandidates.length > 0
      ? collectedAtCandidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
      : null;

  return {
    country_code: normalizeCountryCode(countryRow?.code || salaryRow?.country_code || demandRow?.country_code),
    country_name: asText(countryRow?.name) || null,
    flag_emoji: asText(countryRow?.flag_emoji) || null,
    avg_salary: safeNumber(salaryRow?.avg_salary),
    currency: asText(salaryRow?.currency || countryRow?.currency).toUpperCase() || null,
    salary_source_name: asText(salaryRow?.source_name) || null,
    salary_source_url: asText(salaryRow?.source_url) || null,
    salary_collected_at: salaryCollectedAt,
    job_count:
      demandRow && Number.isFinite(safeNumber(demandRow?.job_count))
        ? Math.max(0, Math.trunc(safeNumber(demandRow?.job_count, 0)))
        : null,
    demand_source_name: asText(demandRow?.source_name) || null,
    demand_collected_at: demandCollectedAt,
    source_name: asText(salaryRow?.source_name || demandRow?.source_name) || null,
    source_url: asText(salaryRow?.source_url) || null,
    collected_at: latestCollectedAt,
  };
}

function createSchemaIssue(table, code, message) {
  return {
    table,
    code,
    message: asText(message, 'Unknown schema issue'),
  };
}

async function ensureColumnExists(table, column) {
  const { error } = await supabase.from(table).select(column, { head: true, count: 'exact' }).limit(1);
  if (!error) {
    return null;
  }

  return createSchemaIssue(table, 'missing_column', error.message || `Column ${column} is missing`);
}

async function ensureConflictTarget(table, onConflict) {
  const { error } = await supabase.from(table).upsert([], { onConflict });
  if (!error) {
    return null;
  }

  return createSchemaIssue(
    table,
    'missing_conflict_target',
    error.message || `Conflict target ${onConflict} is unavailable`
  );
}

function normalizeRoleSalaryPayload(item, options = {}) {
  const collectedAt = normalizeTimestamp(options.collectedAt || item?.collected_at || new Date().toISOString());
  const row = {
    role_slug: normalizeRoleSlug(item?.role_slug),
    country_code: normalizeCountryCode(item?.country_code),
    avg_salary: safeNumber(item?.avg_salary),
    currency: asText(item?.currency).toUpperCase() || null,
    source_name: asText(item?.source_name),
    source_url: asText(item?.source_url) || null,
    collected_at: collectedAt,
  };

  const errors = [];

  if (!row.role_slug) {
    errors.push('role_slug is required');
  }

  if (!row.country_code) {
    errors.push('country_code is required');
  }

  if (!Number.isFinite(row.avg_salary) || row.avg_salary <= 0) {
    errors.push('avg_salary must be a positive number');
  }

  if (!row.currency) {
    errors.push('currency is required');
  }

  if (!row.source_name) {
    errors.push('source_name is required');
  }

  if (!row.collected_at) {
    errors.push('collected_at is required');
  }

  return {
    row,
    errors,
  };
}

function normalizeRoleDemandPayload(item, options = {}) {
  const collectedAt = normalizeTimestamp(options.collectedAt || item?.collected_at || new Date().toISOString());
  const row = {
    role_slug: normalizeRoleSlug(item?.role_slug),
    country_code: normalizeCountryCode(item?.country_code),
    job_count: Math.max(0, Math.trunc(safeNumber(item?.job_count, -1))),
    source_name: asText(item?.source_name),
    collected_at: collectedAt,
  };

  const errors = [];

  if (!row.role_slug) {
    errors.push('role_slug is required');
  }

  if (!row.country_code) {
    errors.push('country_code is required');
  }

  if (!Number.isInteger(row.job_count) || row.job_count < 0) {
    errors.push('job_count must be a non-negative integer');
  }

  if (!row.source_name) {
    errors.push('source_name is required');
  }

  if (!row.collected_at) {
    errors.push('collected_at is required');
  }

  return {
    row,
    errors,
  };
}

class RoleMarket {
  static async validateSchema() {
    const issues = [];

    const checks = await Promise.all([
      ensureColumnExists('role_salaries', 'country_code'),
      ensureConflictTarget('role_salaries', 'role_slug,country_code'),
      ensureColumnExists('role_demand', 'country_code'),
      ensureConflictTarget('role_demand', 'role_slug,country_code'),
    ]);

    checks.forEach((issue) => {
      if (issue) {
        issues.push(issue);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  static async findRoles(options = {}) {
    const roleSlugs = uniqueValues(
      (Array.isArray(options.roleSlugs) ? options.roleSlugs : [])
        .map((value) => normalizeRoleSlug(value))
        .filter(Boolean)
    );

    let query = supabase
      .from('roles')
      .select('slug, name, description')
      .order('slug', { ascending: true });

    if (roleSlugs.length > 0) {
      query = query.in('slug', roleSlugs);
    }

    if (Number.isFinite(Number(options.limit))) {
      query = query.limit(Math.max(1, Math.trunc(Number(options.limit))));
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return data || [];
  }

  static async findCountries(options = {}) {
    const countryCodes = uniqueValues(
      (Array.isArray(options.countryCodes) ? options.countryCodes : [])
        .map((value) => normalizeCountryCode(value))
        .filter(Boolean)
    );

    let query = supabase
      .from('countries')
      .select('name, code, currency, flag_emoji')
      .order('code', { ascending: true });

    if (countryCodes.length > 0) {
      query = query.in('code', countryCodes);
    }

    if (Number.isFinite(Number(options.limit))) {
      query = query.limit(Math.max(1, Math.trunc(Number(options.limit))));
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return data || [];
  }

  static async findRoleBySlug(roleSlug) {
    const slug = normalizeRoleSlug(roleSlug);
    if (!slug) {
      return null;
    }

    const { data, error } = await supabase
      .from('roles')
      .select('slug, name, description')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data || null;
  }

  static async getCountriesCatalog() {
    const { data, error } = await supabase
      .from('countries')
      .select('name, code, currency, flag_emoji')
      .in('code', SUPPORTED_MARKET_COUNTRY_CODES)
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    const sortOrder = new Map(
      SUPPORTED_MARKET_COUNTRY_CODES.map((countryCode, index) => [countryCode, index])
    );

    return (data || []).sort((left, right) => {
      const leftOrder = sortOrder.get(normalizeCountryCode(left?.code));
      const rightOrder = sortOrder.get(normalizeCountryCode(right?.code));
      return Number(leftOrder ?? Number.MAX_SAFE_INTEGER) - Number(rightOrder ?? Number.MAX_SAFE_INTEGER);
    });
  }

  static async getRolesCatalog(options = {}) {
    const search = asText(options.search).toLowerCase();
    const countryCode = normalizeCountryCode(options.countryCode);
    const limit = Number.isFinite(Number(options.limit))
      ? Math.max(1, Math.min(500, Math.trunc(Number(options.limit))))
      : 250;

    const roles = await RoleMarket.findRoles({ limit });
    const filteredRoles = roles.filter((role) => {
      if (!search) {
        return true;
      }

      const searchableText = [role.name, role.slug, role.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(search);
    });

    if (!countryCode) {
      return filteredRoles.map((role) => ({
        ...role,
        market: null,
      }));
    }

    if (filteredRoles.length === 0) {
      return [];
    }

    const roleSlugs = filteredRoles.map((role) => role.slug);
    const [salaryResponse, demandResponse, countryRows] = await Promise.all([
      supabase
        .from('role_salaries')
        .select('role_slug, country_code, avg_salary, currency, source_name, source_url, collected_at')
        .eq('country_code', countryCode)
        .in('role_slug', roleSlugs),
      supabase
        .from('role_demand')
        .select('role_slug, country_code, job_count, source_name, collected_at')
        .eq('country_code', countryCode)
        .in('role_slug', roleSlugs),
      supabase.from('countries').select('name, code, currency, flag_emoji').eq('code', countryCode).maybeSingle(),
    ]);

    if (salaryResponse.error) {
      throw salaryResponse.error;
    }

    if (demandResponse.error) {
      throw demandResponse.error;
    }

    if (countryRows.error) {
      throw countryRows.error;
    }

    const salaryByRole = reduceLatestRowsByRole(salaryResponse.data || []);
    const demandByRole = reduceLatestRowsByRole(demandResponse.data || []);
    const countryRow = countryRows.data || null;

    return filteredRoles.map((role) => ({
      ...role,
      market: normalizeRoleMarketRow(
        salaryByRole.get(normalizeRoleSlug(role.slug)) || null,
        demandByRole.get(normalizeRoleSlug(role.slug)) || null,
        countryRow
      ),
    }));
  }

  static async getRoleMarketOverview(roleSlug, requestedCountryCode) {
    const role = await RoleMarket.findRoleBySlug(roleSlug);
    if (!role) {
      return null;
    }

    const [salaryResponse, demandResponse, countriesResponse] = await Promise.all([
      supabase
        .from('role_salaries')
        .select('role_slug, country_code, avg_salary, currency, source_name, source_url, collected_at')
        .eq('role_slug', normalizeRoleSlug(roleSlug)),
      supabase
        .from('role_demand')
        .select('role_slug, country_code, job_count, source_name, collected_at')
        .eq('role_slug', normalizeRoleSlug(roleSlug)),
      supabase.from('countries').select('name, code, currency, flag_emoji'),
    ]);

    if (salaryResponse.error) {
      throw salaryResponse.error;
    }

    if (demandResponse.error) {
      throw demandResponse.error;
    }

    if (countriesResponse.error) {
      throw countriesResponse.error;
    }

    const salaryByCountry = reduceLatestRowsByCountry(salaryResponse.data || []);
    const demandByCountry = reduceLatestRowsByCountry(demandResponse.data || []);
    const countryCatalog = new Map(
      (countriesResponse.data || [])
        .filter((country) => isSupportedMarketCountryCode(country.code))
        .map((country) => [normalizeCountryCode(country.code), country])
    );

    const countryCodes = uniqueValues([
      requestedCountryCode ? normalizeCountryCode(requestedCountryCode) : null,
      ...Array.from(salaryByCountry.keys()),
      ...Array.from(demandByCountry.keys()),
    ]).filter((countryCode) => isSupportedMarketCountryCode(countryCode));

    const marketRows = countryCodes
      .map((countryCode) =>
        normalizeRoleMarketRow(
          salaryByCountry.get(countryCode) || null,
          demandByCountry.get(countryCode) || null,
          countryCatalog.get(countryCode) || null
        )
      )
      .filter((row) => row.country_code)
      .sort((left, right) => {
        if (requestedCountryCode) {
          const selected = normalizeCountryCode(requestedCountryCode);
          if (left.country_code === selected) return -1;
          if (right.country_code === selected) return 1;
        }

        const demandDelta = Number(right.job_count || 0) - Number(left.job_count || 0);
        if (demandDelta !== 0) {
          return demandDelta;
        }

        return String(left.country_name || left.country_code).localeCompare(
          String(right.country_name || right.country_code)
        );
      });

    const selectedCountryCode =
      normalizeCountryCode(requestedCountryCode) ||
      marketRows[0]?.country_code ||
      null;

    const selectedMarket =
      marketRows.find((row) => row.country_code === selectedCountryCode) || null;

    return {
      role,
      selected_country:
        (selectedCountryCode && countryCatalog.get(selectedCountryCode)) || null,
      market: selectedMarket,
      available_markets: marketRows,
    };
  }

  static async getExistingKeySet(table, roleSlugs, countryCodes) {
    const uniqueRoleSlugs = uniqueValues((roleSlugs || []).map((value) => normalizeRoleSlug(value)).filter(Boolean));
    const uniqueCountryCodes = uniqueValues(
      (countryCodes || []).map((value) => normalizeCountryCode(value)).filter(Boolean)
    );

    if (uniqueRoleSlugs.length === 0 || uniqueCountryCodes.length === 0) {
      return new Set();
    }

    const existing = new Set();
    const roleChunks = chunkArray(uniqueRoleSlugs, UPSERT_BATCH_SIZE);
    const countryChunks = chunkArray(uniqueCountryCodes, UPSERT_BATCH_SIZE);

    for (const roleChunk of roleChunks) {
      for (const countryChunk of countryChunks) {
        const { data, error } = await supabase
          .from(table)
          .select('role_slug, country_code')
          .in('role_slug', roleChunk)
          .in('country_code', countryChunk);

        if (error) {
          throw error;
        }

        (data || []).forEach((row) => {
          existing.add(toCompositeKey(row.role_slug, row.country_code));
        });
      }
    }

    return existing;
  }

  static async upsertRoleSalaries(items, options = {}) {
    const collectedAt = normalizeTimestamp(options.collectedAt || new Date().toISOString()) || new Date().toISOString();
    const normalizedByKey = new Map();
    const invalidRows = [];
    const failedRows = [];
    let duplicateInputCount = 0;

    for (const item of Array.isArray(items) ? items : []) {
      const { row, errors } = normalizeRoleSalaryPayload(item, { collectedAt });
      const key = toCompositeKey(row.role_slug, row.country_code);

      if (errors.length > 0) {
        invalidRows.push({
          role_slug: row.role_slug,
          country_code: row.country_code,
          errors,
        });
        continue;
      }

      if (normalizedByKey.has(key)) {
        duplicateInputCount += 1;
      }

      normalizedByKey.set(key, row);
    }

    const rows = Array.from(normalizedByKey.values());
    const existingKeys = await RoleMarket.getExistingKeySet(
      'role_salaries',
      rows.map((row) => row.role_slug),
      rows.map((row) => row.country_code)
    );

    let insertedCount = 0;
    let updatedCount = 0;

    const persistChunk = async (chunk) => {
      const { error } = await supabase.from('role_salaries').upsert(chunk, {
        onConflict: 'role_slug,country_code',
      });

      if (error) {
        throw error;
      }

      chunk.forEach((row) => {
        const key = toCompositeKey(row.role_slug, row.country_code);
        if (existingKeys.has(key)) {
          updatedCount += 1;
        } else {
          insertedCount += 1;
          existingKeys.add(key);
        }
      });
    };

    for (const chunk of chunkArray(rows, options.batchSize || UPSERT_BATCH_SIZE)) {
      try {
        await persistChunk(chunk);
      } catch (error) {
        console.warn('[RoleMarketModel] salary batch upsert failed, retrying row-by-row:', error.message);

        for (const row of chunk) {
          try {
            await persistChunk([row]);
          } catch (rowError) {
            failedRows.push({
              role_slug: row.role_slug,
              country_code: row.country_code,
              message: rowError.message,
            });
          }
        }
      }
    }

    return {
      success: failedRows.length === 0,
      collectedAt,
      receivedCount: Array.isArray(items) ? items.length : 0,
      deduplicatedCount: rows.length,
      insertedCount,
      updatedCount,
      skippedCount: invalidRows.length + duplicateInputCount,
      duplicateInputCount,
      failedRowCount: failedRows.length,
      invalidRows,
      failedRows,
    };
  }

  static async upsertRoleDemand(items, options = {}) {
    const collectedAt = normalizeTimestamp(options.collectedAt || new Date().toISOString()) || new Date().toISOString();
    const normalizedByKey = new Map();
    const invalidRows = [];
    const failedRows = [];
    let duplicateInputCount = 0;

    for (const item of Array.isArray(items) ? items : []) {
      const { row, errors } = normalizeRoleDemandPayload(item, { collectedAt });
      const key = toCompositeKey(row.role_slug, row.country_code);

      if (errors.length > 0) {
        invalidRows.push({
          role_slug: row.role_slug,
          country_code: row.country_code,
          errors,
        });
        continue;
      }

      if (normalizedByKey.has(key)) {
        duplicateInputCount += 1;
      }

      normalizedByKey.set(key, row);
    }

    const rows = Array.from(normalizedByKey.values());
    const existingKeys = await RoleMarket.getExistingKeySet(
      'role_demand',
      rows.map((row) => row.role_slug),
      rows.map((row) => row.country_code)
    );

    let insertedCount = 0;
    let updatedCount = 0;

    const persistChunk = async (chunk) => {
      const { error } = await supabase.from('role_demand').upsert(chunk, {
        onConflict: 'role_slug,country_code',
      });

      if (error) {
        throw error;
      }

      chunk.forEach((row) => {
        const key = toCompositeKey(row.role_slug, row.country_code);
        if (existingKeys.has(key)) {
          updatedCount += 1;
        } else {
          insertedCount += 1;
          existingKeys.add(key);
        }
      });
    };

    for (const chunk of chunkArray(rows, options.batchSize || UPSERT_BATCH_SIZE)) {
      try {
        await persistChunk(chunk);
      } catch (error) {
        console.warn('[RoleMarketModel] demand batch upsert failed, retrying row-by-row:', error.message);

        for (const row of chunk) {
          try {
            await persistChunk([row]);
          } catch (rowError) {
            failedRows.push({
              role_slug: row.role_slug,
              country_code: row.country_code,
              message: rowError.message,
            });
          }
        }
      }
    }

    return {
      success: failedRows.length === 0,
      collectedAt,
      receivedCount: Array.isArray(items) ? items.length : 0,
      deduplicatedCount: rows.length,
      insertedCount,
      updatedCount,
      skippedCount: invalidRows.length + duplicateInputCount,
      duplicateInputCount,
      failedRowCount: failedRows.length,
      invalidRows,
      failedRows,
    };
  }
}

module.exports = RoleMarket;

const { supabase } = require('../config/database');

const UPSERT_BATCH_SIZE = 100;

function asText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function normalizeTimestamp(value) {
  const text = String(value || '').trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function uniqueValues(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
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

function normalizeTrendPayload(trendData, options = {}) {
  const sourceName = asText(trendData?.source_name || trendData?.source, 'Unknown Source');
  const source = asText(trendData?.source || sourceName, sourceName);
  const row = {
    domain: asText(trendData?.domain, 'General Tech'),
    title: asText(trendData?.title),
    description: asText(trendData?.description) || null,
    source,
    source_name: sourceName,
    source_url: asText(trendData?.source_url) || null,
    published_at: normalizeTimestamp(trendData?.published_at),
    scraped_at: normalizeTimestamp(options.scrapedAt || new Date().toISOString()),
  };

  const errors = [];
  if (!row.title) {
    errors.push('title is required');
  }

  if (options.requireSourceUrl !== false && !row.source_url) {
    errors.push('source_url is required');
  }

  return {
    row,
    errors,
  };
}

class Trend {
  // Create a new trend
  static async create(trendData) {
    const { row, errors } = normalizeTrendPayload(trendData, { requireSourceUrl: false });
    if (errors.length > 0) {
      throw new Error(`Invalid trend payload: ${errors.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('trends')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Find trend by ID
  static async findById(id) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Get all trends
  static async findAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  // Get trends by domain
  static async findByDomain(domain, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .eq('domain', domain)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  }

  // Search trends
  static async search(searchTerm, limit = 20) {
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Update trend
  static async update(id, updates) {
    const dbUpdates = {};
    Object.keys(updates).forEach((key) => {
      if (updates[key] !== undefined) dbUpdates[key] = updates[key];
    });
    if (Object.keys(dbUpdates).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('trends')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Delete trend
  static async delete(id) {
    const { data, error } = await supabase
      .from('trends')
      .delete()
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Get all unique domains
  static async getDomains() {
    const { data, error } = await supabase
      .from('trends')
      .select('domain')
      .not('domain', 'is', null)
      .order('domain', { ascending: true });
    if (error) throw error;
    return [...new Set((data || []).map((row) => row.domain))];
  }

  // Get trend with related skills (via trend_skills junction)
  static async getTrendWithSkills(trendId) {
    const { data, error } = await supabase
      .from('trends')
      .select('*, trend_skills(relevance_score, skills(id, name, category))')
      .eq('id', trendId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const { trend_skills, ...trend } = data;
    trend.skills = (trend_skills || []).map((row) => ({
      skill_id: row.skills?.id,
      skill_name: row.skills?.name,
      skill_category: row.skills?.category,
      relevance_score: row.relevance_score,
    }));
    return trend;
  }

  // Get recent trends (last 30 days)
  static async getRecentTrends(limit = 20) {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('trends')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  }

  // Bulk create trends
  static async bulkCreate(trends) {
    const rows = (Array.isArray(trends) ? trends : [])
      .map((trend) => normalizeTrendPayload(trend, { requireSourceUrl: false }))
      .filter((entry) => entry.errors.length === 0)
      .map((entry) => entry.row);

    if (rows.length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('trends')
      .insert(rows)
      .select();
    if (error) throw error;
    return data || [];
  }

  static async getExistingSourceUrlSet(sourceUrls) {
    const uniqueSourceUrls = uniqueValues(sourceUrls);
    if (uniqueSourceUrls.length === 0) {
      return new Set();
    }

    const existing = new Set();
    const chunks = chunkArray(uniqueSourceUrls, UPSERT_BATCH_SIZE);

    for (const chunk of chunks) {
      const { data, error } = await supabase
        .from('trends')
        .select('source_url')
        .in('source_url', chunk);

      if (error) throw error;

      (data || []).forEach((row) => {
        const sourceUrl = asText(row?.source_url);
        if (sourceUrl) {
          existing.add(sourceUrl);
        }
      });
    }

    return existing;
  }

  static async upsertTrends(items, options = {}) {
    const scrapedAt = new Date().toISOString();
    const normalizedByUrl = new Map();
    const invalidRows = [];
    const failedRows = [];
    let duplicateInputCount = 0;

    for (const item of Array.isArray(items) ? items : []) {
      const { row, errors } = normalizeTrendPayload(item, {
        requireSourceUrl: true,
        scrapedAt,
      });

      if (errors.length > 0) {
        invalidRows.push({
          source_url: row.source_url,
          title: row.title,
          errors,
        });
        continue;
      }

      if (normalizedByUrl.has(row.source_url)) {
        duplicateInputCount += 1;
      }

      normalizedByUrl.set(row.source_url, row);
    }

    const rows = Array.from(normalizedByUrl.values());
    const existingSourceUrls = await Trend.getExistingSourceUrlSet(
      rows.map((row) => row.source_url)
    );

    let insertedCount = 0;
    let updatedCount = 0;

    const persistChunk = async (chunk) => {
      const { error } = await supabase
        .from('trends')
        .upsert(chunk, { onConflict: 'source_url' });

      if (error) throw error;

      chunk.forEach((row) => {
        if (existingSourceUrls.has(row.source_url)) {
          updatedCount += 1;
        } else {
          insertedCount += 1;
          existingSourceUrls.add(row.source_url);
        }
      });
    };

    for (const chunk of chunkArray(rows, options.batchSize || UPSERT_BATCH_SIZE)) {
      try {
        await persistChunk(chunk);
      } catch (error) {
        console.warn('[TrendModel] batch upsert failed, retrying row-by-row:', error.message);

        for (const row of chunk) {
          try {
            await persistChunk([row]);
          } catch (rowError) {
            failedRows.push({
              source_url: row.source_url,
              title: row.title,
              message: rowError.message,
            });
          }
        }
      }
    }

    const result = {
      success: failedRows.length === 0,
      scrapedAt,
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

    console.info('[TrendModel] upsert complete', {
      receivedCount: result.receivedCount,
      deduplicatedCount: result.deduplicatedCount,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      skippedCount: result.skippedCount,
      duplicateInputCount: result.duplicateInputCount,
      failedRowCount: result.failedRowCount,
    });

    if (failedRows.length > 0) {
      console.warn('[TrendModel] trend upsert had failed rows', {
        failedRows: failedRows.slice(0, 10),
      });
    }

    if (invalidRows.length > 0) {
      console.warn('[TrendModel] trend upsert skipped invalid rows', {
        invalidRows: invalidRows.slice(0, 10),
      });
    }

    return result;
  }
}

module.exports = Trend;

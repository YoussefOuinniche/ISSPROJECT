const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class NormalizedJob {
  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM public.normalized_jobs WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.country_code !== undefined) {
      conditions.push(`country_code = $${idx++}`);
      values.push(filters.country_code);
    }
    if (filters.is_remote !== undefined) {
      conditions.push(`is_remote = $${idx++}`);
      values.push(filters.is_remote);
    }
    if (filters.is_trending !== undefined) {
      conditions.push(`is_trending = $${idx++}`);
      values.push(filters.is_trending);
    }
    if (filters.keyword !== undefined) {
      conditions.push(`title ILIKE $${idx++}`);
      values.push(`%${filters.keyword}%`);
    }
    if (filters.date_from !== undefined) {
      conditions.push(`date_posted >= $${idx++}`);
      values.push(filters.date_from);
    }
    if (filters.source !== undefined) {
      conditions.push(`source = $${idx++}`);
      values.push(filters.source);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit  = filters.limit  !== undefined ? `LIMIT $${idx++}`  : 'LIMIT 50';
    const offset = filters.offset !== undefined ? `OFFSET $${idx++}` : '';
    if (filters.limit  !== undefined) values.push(filters.limit);
    if (filters.offset !== undefined) values.push(filters.offset);

    const { rows } = await pool.query(
      `SELECT * FROM public.normalized_jobs
       ${where}
       ORDER BY date_posted DESC NULLS LAST, popularity_score DESC
       ${limit} ${offset}`,
      values
    );
    return rows;
  }

  static async create(data) {
    const {
      raw_job_id, title, company, location, country_code,
      salary_min, salary_max, salary_currency, description,
      tags, is_remote = false, source, source_url, date_posted,
      popularity_score = 0, is_trending = false, ai_summary, ai_tags,
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO public.normalized_jobs (
         raw_job_id, title, company, location, country_code,
         salary_min, salary_max, salary_currency, description,
         tags, is_remote, source, source_url, date_posted,
         popularity_score, is_trending, ai_summary, ai_tags
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12, $13, $14,
         $15, $16, $17, $18
       ) RETURNING *`,
      [
        raw_job_id, title, company, location, country_code,
        salary_min ?? null, salary_max ?? null, salary_currency ?? null, description ?? null,
        tags ?? null, is_remote, source ?? null, source_url ?? null, date_posted ?? null,
        popularity_score, is_trending,
        ai_summary ?? null, ai_tags ? JSON.stringify(ai_tags) : null,
      ]
    );
    return rows[0];
  }

  static async update(id, data) {
    const allowed = [
      'title', 'company', 'location', 'country_code',
      'salary_min', 'salary_max', 'salary_currency', 'description',
      'tags', 'is_remote', 'source', 'source_url', 'date_posted',
      'popularity_score', 'is_trending', 'ai_summary', 'ai_tags',
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (data[key] !== undefined) {
        const val = key === 'ai_tags' ? JSON.stringify(data[key]) : data[key];
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (!fields.length) throw new Error('No fields to update');

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE public.normalized_jobs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  static async deduplicate() {
    await pool.query('SELECT deduplicate_normalized_jobs()');
  }
}

module.exports = NormalizedJob;

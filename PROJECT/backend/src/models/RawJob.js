const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class RawJob {
  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM public.raw_jobs WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.source !== undefined) {
      conditions.push(`source = $${idx++}`);
      values.push(filters.source);
    }
    if (filters.is_processed !== undefined) {
      conditions.push(`is_processed = $${idx++}`);
      values.push(filters.is_processed);
    }
    if (filters.fetched_after !== undefined) {
      conditions.push(`fetched_at >= $${idx++}`);
      values.push(filters.fetched_after);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit  = filters.limit  ? `LIMIT $${idx++}`  : '';
    const offset = filters.offset ? `OFFSET $${idx++}` : '';
    if (filters.limit)  values.push(filters.limit);
    if (filters.offset) values.push(filters.offset);

    const { rows } = await pool.query(
      `SELECT * FROM public.raw_jobs ${where} ORDER BY fetched_at DESC ${limit} ${offset}`,
      values
    );
    return rows;
  }

  static async create(data) {
    const { external_id, source, raw_payload, fetched_at, is_processed = false } = data;
    const { rows } = await pool.query(
      `INSERT INTO public.raw_jobs (external_id, source, raw_payload, fetched_at, is_processed)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (source, external_id) DO UPDATE
         SET raw_payload  = EXCLUDED.raw_payload,
             fetched_at   = EXCLUDED.fetched_at,
             is_processed = EXCLUDED.is_processed
       RETURNING *`,
      [external_id, source, JSON.stringify(raw_payload), fetched_at ?? new Date(), is_processed]
    );
    return rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.raw_payload !== undefined) { fields.push(`raw_payload = $${idx++}`);   values.push(JSON.stringify(data.raw_payload)); }
    if (data.is_processed !== undefined) { fields.push(`is_processed = $${idx++}`); values.push(data.is_processed); }
    if (data.fetched_at !== undefined)   { fields.push(`fetched_at = $${idx++}`);   values.push(data.fetched_at); }

    if (!fields.length) throw new Error('No fields to update');

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE public.raw_jobs SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  }
}

module.exports = RawJob;

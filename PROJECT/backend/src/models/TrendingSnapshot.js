const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class TrendingSnapshot {
  static async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM public.trending_snapshots WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  }

  static async findAll(filters = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (filters.region !== undefined) {
      conditions.push(`region = $${idx++}`);
      values.push(filters.region);
    }
    if (filters.generated_by !== undefined) {
      conditions.push(`generated_by = $${idx++}`);
      values.push(filters.generated_by);
    }
    if (filters.since !== undefined) {
      conditions.push(`snapshot_at >= $${idx++}`);
      values.push(filters.since);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const limit  = filters.limit  !== undefined ? `LIMIT $${idx++}`  : 'LIMIT 20';
    const offset = filters.offset !== undefined ? `OFFSET $${idx++}` : '';
    if (filters.limit  !== undefined) values.push(filters.limit);
    if (filters.offset !== undefined) values.push(filters.offset);

    const { rows } = await pool.query(
      `SELECT * FROM public.trending_snapshots
       ${where}
       ORDER BY snapshot_at DESC
       ${limit} ${offset}`,
      values
    );
    return rows;
  }

  static async create(data) {
    const { region, trending_data, generated_by, snapshot_at } = data;
    const { rows } = await pool.query(
      `INSERT INTO public.trending_snapshots (snapshot_at, region, trending_data, generated_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        snapshot_at ?? new Date(),
        region,
        JSON.stringify(trending_data),
        generated_by,
      ]
    );
    return rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (data.region !== undefined)        { fields.push(`region = $${idx++}`);        values.push(data.region); }
    if (data.trending_data !== undefined) { fields.push(`trending_data = $${idx++}`); values.push(JSON.stringify(data.trending_data)); }
    if (data.generated_by !== undefined)  { fields.push(`generated_by = $${idx++}`);  values.push(data.generated_by); }
    if (data.snapshot_at !== undefined)   { fields.push(`snapshot_at = $${idx++}`);   values.push(data.snapshot_at); }

    if (!fields.length) throw new Error('No fields to update');

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE public.trending_snapshots SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] || null;
  }

  static async getLatestByRegion(region) {
    const { rows } = await pool.query(
      `SELECT * FROM public.trending_snapshots
       WHERE region = $1
       ORDER BY snapshot_at DESC
       LIMIT 1`,
      [region]
    );
    return rows[0] || null;
  }
}

module.exports = TrendingSnapshot;

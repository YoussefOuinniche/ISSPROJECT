const { query } = require('../config/database');

class Trend {
  // Create a new trend
  static async create(trendData) {
    const { domain, title, description, source } = trendData;
    const text = `
      INSERT INTO trends (domain, title, description, source)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [domain, title, description, source];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Find trend by ID
  static async findById(id) {
    const text = 'SELECT * FROM trends WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Get all trends
  static async findAll(limit = 50, offset = 0) {
    const text = `
      SELECT * FROM trends 
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }

  // Get trends by domain
  static async findByDomain(domain, limit = 50, offset = 0) {
    const text = `
      SELECT * FROM trends 
      WHERE domain = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(text, [domain, limit, offset]);
    return result.rows;
  }

  // Search trends
  static async search(searchTerm, limit = 20) {
    const text = `
      SELECT * FROM trends 
      WHERE title ILIKE $1 OR description ILIKE $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const result = await query(text, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  // Update trend
  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    const text = `
      UPDATE trends 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Delete trend
  static async delete(id) {
    const text = 'DELETE FROM trends WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Get all unique domains
  static async getDomains() {
    const text = `
      SELECT DISTINCT domain 
      FROM trends 
      WHERE domain IS NOT NULL
      ORDER BY domain ASC
    `;
    const result = await query(text);
    return result.rows.map(row => row.domain);
  }

  // Get trends with related skills
  static async getTrendWithSkills(trendId) {
    const text = `
      SELECT 
        t.*,
        json_agg(
          json_build_object(
            'skill_id', s.id,
            'skill_name', s.name,
            'skill_category', s.category,
            'relevance_score', ts.relevance_score
          )
        ) FILTER (WHERE s.id IS NOT NULL) as skills
      FROM trends t
      LEFT JOIN trend_skills ts ON t.id = ts.trend_id
      LEFT JOIN skills s ON ts.skill_id = s.id
      WHERE t.id = $1
      GROUP BY t.id
    `;
    const result = await query(text, [trendId]);
    return result.rows[0];
  }

  // Get recent trends (last 30 days)
  static async getRecentTrends(limit = 20) {
    const text = `
      SELECT * FROM trends 
      WHERE created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT $1
    `;
    const result = await query(text, [limit]);
    return result.rows;
  }

  // Bulk create trends
  static async bulkCreate(trends) {
    const values = [];
    const placeholders = [];
    
    trends.forEach((trend, index) => {
      const offset = index * 4;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      values.push(trend.domain, trend.title, trend.description, trend.source);
    });

    const text = `
      INSERT INTO trends (domain, title, description, source)
      VALUES ${placeholders.join(', ')}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows;
  }
}

module.exports = Trend;
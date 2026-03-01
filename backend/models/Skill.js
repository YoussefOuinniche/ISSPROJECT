const { query } = require('../config/database');

class Skill {
  // Create a new skill
  static async create(name, category) {
    const text = `
      INSERT INTO skills (name, category)
      VALUES ($1, $2)
      RETURNING *
    `;
    const values = [name, category];
    const result = await query(text, values);
    return result.rows[0];
  }

  // Find skill by ID
  static async findById(id) {
    const text = 'SELECT * FROM skills WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Find skill by name
  static async findByName(name) {
    const text = 'SELECT * FROM skills WHERE name = $1';
    const result = await query(text, [name]);
    return result.rows[0];
  }

  // Get all skills
  static async findAll(limit = 100, offset = 0) {
    const text = `
      SELECT * FROM skills 
      ORDER BY name ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }

  // Get skills by category
  static async findByCategory(category, limit = 100, offset = 0) {
    const text = `
      SELECT * FROM skills 
      WHERE category = $1
      ORDER BY name ASC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(text, [category, limit, offset]);
    return result.rows;
  }

  // Search skills by name
  static async search(searchTerm, limit = 20) {
    const text = `
      SELECT * FROM skills 
      WHERE name ILIKE $1
      ORDER BY name ASC
      LIMIT $2
    `;
    const result = await query(text, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  // Update skill
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
      UPDATE skills 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows[0];
  }

  // Delete skill
  static async delete(id) {
    const text = 'DELETE FROM skills WHERE id = $1 RETURNING *';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Get all unique categories
  static async getCategories() {
    const text = `
      SELECT DISTINCT category 
      FROM skills 
      WHERE category IS NOT NULL
      ORDER BY category ASC
    `;
    const result = await query(text);
    return result.rows.map(row => row.category);
  }

  // Bulk create skills
  static async bulkCreate(skills) {
    const values = [];
    const placeholders = [];
    
    skills.forEach((skill, index) => {
      const offset = index * 2;
      placeholders.push(`($${offset + 1}, $${offset + 2})`);
      values.push(skill.name, skill.category);
    });

    const text = `
      INSERT INTO skills (name, category)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (name) DO NOTHING
      RETURNING *
    `;
    
    const result = await query(text, values);
    return result.rows;
  }
}

module.exports = Skill;
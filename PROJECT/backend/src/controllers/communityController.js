const { supabaseAdmin } = require('../config/database');

// GET /api/community/shares
// Returns the same shape mobile consumes: { id, title, summary, completed_steps,
// total_steps, shared_at, profiles{full_name}, ai_roadmaps{title,summary,estimated_weeks,job_roles{title}} }
const getShares = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('community_roadmap_shares')
      .select(
        'id, roadmap_id, profile_id, title, summary, completed_steps, total_steps, shared_at,' +
        ' profiles(full_name),' +
        ' ai_roadmaps(title, summary, estimated_weeks, job_roles(title))',
      )
      .eq('is_public', true)
      .order('shared_at', { ascending: false })
      .limit(50);

    if (error) {
      // If the table doesn't exist yet, return an empty feed so the UI stays usable.
      if (/community_roadmap_shares/.test(error.message || '') && /does not exist|schema cache/i.test(error.message || '')) {
        return res.json({ success: true, data: [] });
      }
      throw error;
    }

    return res.json({ success: true, data: data || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getShares };

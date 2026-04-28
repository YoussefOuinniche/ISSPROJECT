const { supabaseAdmin } = require('../config/database');
const { getJobImageUrl } = require('../config/jobImages');

// 1 USD → TND (Tunisian Dinar). Update as needed.
const USD_TO_TND = 3.1;

async function getProfileId(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

// GET /api/user/home
const getHomeData = async (req, res) => {
  try {
    const profileData = await getProfileId(req.user.id);
    const profileId = profileData?.id ?? null;

    // ── Roadmap progress ───────────────────────────────────────────────
    let roadmapSummary = null;
    if (profileId) {
      const { data: roadmap } = await supabaseAdmin
        .from('ai_roadmaps')
        .select('id, title, summary, estimated_weeks, status')
        .eq('profile_id', profileId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (roadmap) {
        const [
          { count: total },
          { count: completed },
          { data: currentStepData },
        ] = await Promise.all([
          supabaseAdmin
            .from('ai_roadmap_steps')
            .select('*', { count: 'exact', head: true })
            .eq('roadmap_id', roadmap.id),
          supabaseAdmin
            .from('ai_roadmap_steps')
            .select('*', { count: 'exact', head: true })
            .eq('roadmap_id', roadmap.id)
            .eq('status', 'completed'),
          supabaseAdmin
            .from('ai_roadmap_steps')
            .select('id, step_order, title, status, duration_hours')
            .eq('roadmap_id', roadmap.id)
            .in('status', ['in_progress', 'available'])
            .order('step_order', { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

        roadmapSummary = {
          id:               roadmap.id,
          title:            roadmap.title,
          summary:          roadmap.summary,
          estimated_weeks:  roadmap.estimated_weeks,
          total_steps:      total ?? 0,
          completed_steps:  completed ?? 0,
          progress_pct:     total > 0 ? Math.round((completed / total) * 100) : 0,
          current_step:     currentStepData
            ? {
                order:  currentStepData.step_order,
                title:  currentStepData.title,
                status: currentStepData.status,
              }
            : null,
        };
      }
    }

    const JOB_SELECT = `
      id,
      growth_percentage,
      openings_count,
      demand_index,
      region,
      job_roles!inner (
        id, title, slug, description, seniority_level, avg_salary_usd, image_url,
        categories!inner (name, slug)
      )
    `;

    function mapTrend(t) {
      const avgSalaryTnd = t.job_roles.avg_salary_usd
        ? Math.round(t.job_roles.avg_salary_usd * USD_TO_TND)
        : null;
      return {
        id:              t.job_roles.id,
        title:           t.job_roles.title,
        slug:            t.job_roles.slug,
        description:     t.job_roles.description,
        seniority_level: t.job_roles.seniority_level,
        avg_salary_tnd:  avgSalaryTnd,
        category:        t.job_roles.categories.name,
        category_slug:   t.job_roles.categories.slug,
        growth_pct:      t.growth_percentage,
        openings:        t.openings_count,
        demand_index:    t.demand_index,
        region:          t.region || 'global',
        image_url:       getJobImageUrl(t.job_roles.slug, t.job_roles.categories.slug, t.job_roles.image_url || null),
      };
    }

    // ── Global trending ────────────────────────────────────────────────
    const { data: globalTrends } = await supabaseAdmin
      .from('job_market_trends')
      .select(JOB_SELECT)
      .eq('demand_index', 'surging')
      .or('region.eq.global,region.is.null')
      .order('growth_percentage', { ascending: false })
      .limit(10);

    // ── Tunisia trending ───────────────────────────────────────────────
    const { data: tnTrends } = await supabaseAdmin
      .from('job_market_trends')
      .select(JOB_SELECT)
      .in('demand_index', ['surging', 'stable'])
      .eq('region', 'tn')
      .order('growth_percentage', { ascending: false })
      .limit(8);

    return res.json({
      success: true,
      data: {
        user_name:       profileData?.full_name || null,
        roadmap:         roadmapSummary,
        trending_global: (globalTrends || []).map(mapTrend),
        trending_tn:     (tnTrends || []).map(mapTrend),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { getHomeData };

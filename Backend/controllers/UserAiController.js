const { requestAiRoleSnapshot } = require('../services/roleSnapshotService');

class UserAiController {
  static async generateRoleSnapshot(req, res) {
    try {
      const userId = req.user.id;
      const role = String(req.body?.role || '').trim();
      const countries = Array.isArray(req.body?.countries)
        ? req.body.countries.map((country) => String(country || '').trim()).filter(Boolean)
        : [];

      const result = await requestAiRoleSnapshot(userId, {
        role,
        countries,
      });

      res.status(200).json({
        success: true,
        message: 'AI role snapshot generated',
        data: result,
        meta: {
          degraded: Boolean(result?.meta?.degraded),
          model: result?.meta?.model || null,
          generated_at: result?.meta?.generated_at || null,
          cache_status: result?.meta?.cache_status || null,
          fallback_reason: result?.meta?.fallback_reason || null,
        },
      });
    } catch (error) {
      console.error('Generate role snapshot with AI error:', error);
      res.status(error?.statusCode || 502).json({
        success: false,
        message: 'Error generating AI role snapshot',
        error: error.message,
      });
    }
  }
}

module.exports = UserAiController;

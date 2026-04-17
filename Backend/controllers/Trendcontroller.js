const { Trend } = require('../models');
const { ingestAndUpsertTrendSources } = require('../services/trendsIngestionService');

function parseBooleanFlag(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parseOptionalInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function isManualIngestionEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_TRENDS_INGEST_ENDPOINT === 'true';
}

class TrendController {
  // Get all trends
  static async getAllTrends(req, res) {
    try {
      const { limit, offset, domain } = req.query;

      let trends;
      if (domain) {
        trends = await Trend.findByDomain(
          domain,
          parseInt(limit) || 50,
          parseInt(offset) || 0
        );
      } else {
        trends = await Trend.findAll(
          parseInt(limit) || 50,
          parseInt(offset) || 0
        );
      }

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Get all trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching trends',
        error: error.message
      });
    }
  }

  // Get trend by ID
  static async getTrendById(req, res) {
    try {
      const { id } = req.params;
      const trend = await Trend.getTrendWithSkills(id);

      if (!trend) {
        return res.status(404).json({
          success: false,
          message: 'Trend not found'
        });
      }

      res.status(200).json({
        success: true,
        data: trend
      });
    } catch (error) {
      console.error('Get trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching trend',
        error: error.message
      });
    }
  }

  // Search trends
  static async searchTrends(req, res) {
    try {
      const { q, limit } = req.query;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const trends = await Trend.search(q, parseInt(limit) || 20);

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Search trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Error searching trends',
        error: error.message
      });
    }
  }

  // Get trend domains
  static async getDomains(req, res) {
    try {
      const domains = await Trend.getDomains();

      res.status(200).json({
        success: true,
        data: domains
      });
    } catch (error) {
      console.error('Get domains error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching domains',
        error: error.message
      });
    }
  }

  // Get recent trends
  static async getRecentTrends(req, res) {
    try {
      const { limit } = req.query;
      const trends = await Trend.getRecentTrends(parseInt(limit) || 20);

      res.status(200).json({
        success: true,
        data: trends
      });
    } catch (error) {
      console.error('Get recent trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching recent trends',
        error: error.message
      });
    }
  }

  // Run external trend ingestion + upsert (admin only)
  static async ingestExternalTrends(req, res) {
    try {
      if (!isManualIngestionEnabled()) {
        return res.status(403).json({
          success: false,
          message: 'Manual trend ingestion endpoint is disabled in production',
        });
      }

      const primaryOnly = parseBooleanFlag(req.body?.primaryOnly ?? req.query?.primaryOnly, false);
      const limitPerSource = parseOptionalInteger(
        req.body?.limitPerSource ?? req.query?.limitPerSource,
        undefined
      );

      const result = await ingestAndUpsertTrendSources({
        primaryOnly,
        limitPerSource,
      });

      return res.status(200).json({
        success: result.success,
        partialSuccess: result.partialSuccess,
        message: result.partialSuccess
          ? 'Trend ingestion completed with partial success'
          : 'Trend ingestion completed successfully',
        data: {
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          sourcesChecked: result.sourcesChecked,
          sourcesSucceeded: result.sourcesSucceeded,
          sourcesFailed: result.sourcesFailed,
          articlesFetched: result.totalFetched,
          normalizedCount: result.normalizedItemsCount,
          deduplicatedCount: result.deduplicatedItemsCount,
          insertedCount: result.persistence.insertedCount,
          updatedCount: result.persistence.updatedCount,
          skippedCount: result.persistence.skippedCount,
          duplicateInputCount: result.persistence.duplicateInputCount,
          failedRowCount: result.persistence.failedRowCount,
          sourceLevelErrors: result.sourceLevelErrors,
        },
      });
    } catch (error) {
      console.error('Trend ingestion trigger error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error running trend ingestion',
        error: error.message,
      });
    }
  }

  // Create new trend (admin only)
  static async createTrend(req, res) {
    try {
      const trendData = req.body;

      if (!trendData.title) {
        return res.status(400).json({
          success: false,
          message: 'Trend title is required'
        });
      }

      const trend = await Trend.create(trendData);

      res.status(201).json({
        success: true,
        message: 'Trend created successfully',
        data: trend
      });
    } catch (error) {
      console.error('Create trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating trend',
        error: error.message
      });
    }
  }

  // Update trend (admin only)
  static async updateTrend(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const trend = await Trend.update(id, updates);

      if (!trend) {
        return res.status(404).json({
          success: false,
          message: 'Trend not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Trend updated successfully',
        data: trend
      });
    } catch (error) {
      console.error('Update trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating trend',
        error: error.message
      });
    }
  }

  // Delete trend (admin only)
  static async deleteTrend(req, res) {
    try {
      const { id } = req.params;

      const deletedTrend = await Trend.delete(id);

      if (!deletedTrend) {
        return res.status(404).json({
          success: false,
          message: 'Trend not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Trend deleted successfully'
      });
    } catch (error) {
      console.error('Delete trend error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting trend',
        error: error.message
      });
    }
  }

  // Bulk create trends (admin only)
  static async bulkCreateTrends(req, res) {
    try {
      const { trends } = req.body;

      if (!Array.isArray(trends) || trends.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Trends array is required'
        });
      }

      const createdTrends = await Trend.bulkCreate(trends);

      res.status(201).json({
        success: true,
        message: `${createdTrends.length} trends created successfully`,
        data: createdTrends
      });
    } catch (error) {
      console.error('Bulk create trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Error bulk creating trends',
        error: error.message
      });
    }
  }
}

module.exports = TrendController;

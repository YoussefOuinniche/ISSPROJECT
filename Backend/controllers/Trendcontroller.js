const Trend = require('../models/Trend');

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

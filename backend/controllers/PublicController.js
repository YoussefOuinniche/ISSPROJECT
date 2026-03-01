// PublicController serves endpoints the frontend expects for dashboard data
class PublicController {
  static async getDashboard(req, res) {
    try {
      // Provide lightweight data shaped like the dashboard UI expects
      const stats = [
        { title: 'Total Users', value: '12,842', change: '+12.5%', changeLabel: 'vs last month', icon: 'group', positive: true },
        { title: 'Active Sessions', value: '1,205', change: '+5.2%', changeLabel: 'real-time', icon: 'show_chart', positive: true },
        { title: 'New Signups', value: '432', change: '-2.4%', changeLabel: 'since yesterday', icon: 'person_add', positive: false },
        { title: 'Revenue', value: '$42,500', change: '+15.8%', changeLabel: 'monthly target', icon: 'payments', positive: true }
      ];

      const recentActivities = [
        { icon: 'person_add', color: 'blue', user: 'Sarah Chen', action: 'registered a new account', time: '2 minutes ago' },
        { icon: 'edit_document', color: 'orange', user: 'Admin.01', action: 'updated "Terms of Service"', time: '45 minutes ago' },
        { icon: 'shopping_cart', color: 'green', user: 'John Doe', action: 'purchased Premium Plan', time: '2 hours ago' },
        { icon: 'error', color: 'red', user: 'System', action: 'New system alert: Server latency spike', time: '4 hours ago' }
      ];

      res.status(200).json({ success: true, data: { stats, recentActivities } });
    } catch (err) {
      console.error('PublicController.getDashboard error', err);
      res.status(500).json({ success: false, message: 'Unable to load dashboard data' });
    }
  }
}

module.exports = PublicController;

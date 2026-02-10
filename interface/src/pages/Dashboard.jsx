import React, { useState } from 'react';
import './Dashboard.css';

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('30d');

  const stats = [
    {
      title: 'Total Users',
      value: '12,842',
      change: '+12.5%',
      changeLabel: 'vs last month',
      icon: 'group',
      positive: true
    },
    {
      title: 'Active Sessions',
      value: '1,205',
      change: '+5.2%',
      changeLabel: 'real-time',
      icon: 'show_chart',
      positive: true
    },
    {
      title: 'New Signups',
      value: '432',
      change: '-2.4%',
      changeLabel: 'since yesterday',
      icon: 'person_add',
      positive: false
    },
    {
      title: 'Revenue',
      value: '$42,500',
      change: '+15.8%',
      changeLabel: 'monthly target',
      icon: 'payments',
      positive: true
    }
  ];

  const recentActivities = [
    {
      icon: 'person_add',
      color: 'blue',
      user: 'Sarah Chen',
      action: 'registered a new account',
      time: '2 minutes ago'
    },
    {
      icon: 'edit_document',
      color: 'orange',
      user: 'Admin.01',
      action: 'updated "Terms of Service"',
      time: '45 minutes ago'
    },
    {
      icon: 'shopping_cart',
      color: 'green',
      user: 'John Doe',
      action: 'purchased Premium Plan',
      time: '2 hours ago'
    },
    {
      icon: 'error',
      color: 'red',
      user: 'System',
      action: 'New system alert: Server latency spike',
      time: '4 hours ago'
    }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-[#292e38] bg-white dark:bg-[#1a1f2e] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Welcome back, Alex Rivera
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-xl">download</span>
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-xl">add</span>
              New Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <span className="material-symbols-outlined text-primary text-2xl">
                    {stat.icon}
                  </span>
                </div>
              </div>
              <h3 className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {stat.title}
              </h3>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stat.value}
                </p>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-sm font-medium ${
                      stat.positive ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">{stat.changeLabel}</p>
            </div>
          ))}
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Growth Trends */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  User Growth Trends
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Daily acquisition rate for the last 30 days
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === '30d'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setTimeRange('30d')}
                >
                  30D
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === '90d'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setTimeRange('90d')}
                >
                  90D
                </button>
                <button
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === '1y'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setTimeRange('1y')}
                >
                  1Y
                </button>
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-[#111621] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-slate-400">
                  insert_chart
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  Chart visualization area
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
              <span>MAY 01</span>
              <span>MAY 10</span>
              <span>MAY 20</span>
              <span>MAY 30</span>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Activity
              </h2>
              <button className="text-sm text-primary hover:text-primary/80 font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      activity.color === 'blue'
                        ? 'bg-blue-500/10'
                        : activity.color === 'orange'
                        ? 'bg-orange-500/10'
                        : activity.color === 'green'
                        ? 'bg-green-500/10'
                        : 'bg-red-500/10'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-xl ${
                        activity.color === 'blue'
                          ? 'text-blue-500'
                          : activity.color === 'orange'
                          ? 'text-orange-500'
                          : activity.color === 'green'
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}
                    >
                      {activity.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white">
                      <span className="font-medium text-primary">{activity.user}</span>{' '}
                      {activity.action}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

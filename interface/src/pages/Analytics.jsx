import React, { useState } from 'react';
import './Analytics.css';

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');
  const [selectedMetric, setSelectedMetric] = useState('users');

  const metrics = [
    {
      title: 'Page Views',
      value: '245.8K',
      change: '+18.2%',
      icon: 'visibility',
      color: 'blue'
    },
    {
      title: 'Unique Visitors',
      value: '89.4K',
      change: '+12.5%',
      icon: 'person',
      color: 'green'
    },
    {
      title: 'Avg. Session',
      value: '4m 32s',
      change: '+8.1%',
      icon: 'schedule',
      color: 'purple'
    },
    {
      title: 'Bounce Rate',
      value: '42.3%',
      change: '-5.2%',
      icon: 'exit_to_app',
      color: 'red'
    }
  ];

  const topPages = [
    { page: '/dashboard', views: '45.2K', time: '5m 12s', rate: '38%' },
    { page: '/products', views: '38.7K', time: '3m 45s', rate: '42%' },
    { page: '/pricing', views: '32.4K', time: '4m 20s', rate: '35%' },
    { page: '/about', views: '28.9K', time: '2m 58s', rate: '48%' },
    { page: '/contact', views: '24.1K', time: '3m 30s', rate: '40%' }
  ];

  const trafficSources = [
    { source: 'Organic Search', visitors: '52.3K', percentage: 58, color: 'bg-blue-500' },
    { source: 'Direct', visitors: '28.4K', percentage: 32, color: 'bg-green-500' },
    { source: 'Social Media', visitors: '12.7K', percentage: 14, color: 'bg-purple-500' },
    { source: 'Referral', visitors: '8.9K', percentage: 10, color: 'bg-orange-500' },
    { source: 'Email', visitors: '6.1K', percentage: 7, color: 'bg-pink-500' }
  ];

  const deviceStats = [
    { device: 'Desktop', percentage: 62, count: '55.4K' },
    { device: 'Mobile', percentage: 32, count: '28.6K' },
    { device: 'Tablet', percentage: 6, count: '5.4K' }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-[#292e38] bg-white dark:bg-[#1a1f2e] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track and analyze your platform performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {['24h', '7d', '30d', '90d'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    selectedPeriod === period
                      ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-xl">download</span>
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 rounded-lg ${
                    metric.color === 'blue'
                      ? 'bg-blue-500/10'
                      : metric.color === 'green'
                      ? 'bg-green-500/10'
                      : metric.color === 'purple'
                      ? 'bg-purple-500/10'
                      : 'bg-red-500/10'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-2xl ${
                      metric.color === 'blue'
                        ? 'text-blue-500'
                        : metric.color === 'green'
                        ? 'text-green-500'
                        : metric.color === 'purple'
                        ? 'text-purple-500'
                        : 'text-red-500'
                    }`}
                  >
                    {metric.icon}
                  </span>
                </div>
                <span
                  className={`text-sm font-medium ${
                    metric.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {metric.change}
                </span>
              </div>
              <h3 className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {metric.title}
              </h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Area */}
          <div className="lg:col-span-2 bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Traffic Overview
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Visitor trends for the selected period
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMetric('users')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'users'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Users
                </button>
                <button
                  onClick={() => setSelectedMetric('sessions')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMetric === 'sessions'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Sessions
                </button>
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="h-80 flex items-center justify-center bg-slate-50 dark:bg-[#111621] rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
              <div className="text-center">
                <span className="material-symbols-outlined text-6xl text-slate-400">
                  trending_up
                </span>
                <p className="text-slate-500 dark:text-slate-400 mt-2">
                  Traffic chart visualization
                </p>
              </div>
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Traffic Sources
            </h2>
            <div className="space-y-4">
              {trafficSources.map((source, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {source.source}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {source.visitors}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`${source.color} h-2 rounded-full transition-all duration-300`}
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {source.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Top Pages */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Top Pages
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase pb-3">
                      Page
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase pb-3">
                      Views
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase pb-3">
                      Avg. Time
                    </th>
                    <th className="text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase pb-3">
                      Bounce
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {topPages.map((page, index) => (
                    <tr key={index}>
                      <td className="py-3 text-sm text-slate-900 dark:text-white font-medium">
                        {page.page}
                      </td>
                      <td className="py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                        {page.views}
                      </td>
                      <td className="py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                        {page.time}
                      </td>
                      <td className="py-3 text-sm text-slate-700 dark:text-slate-300 text-right">
                        {page.rate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Device Stats */}
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
              Device Breakdown
            </h2>
            <div className="space-y-6">
              {deviceStats.map((device, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-slate-400">
                        {device.device === 'Desktop'
                          ? 'computer'
                          : device.device === 'Mobile'
                          ? 'smartphone'
                          : 'tablet'}
                      </span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {device.device}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {device.count}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {device.percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${device.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Total Devices
                </span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  89.4K
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

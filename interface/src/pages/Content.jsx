import React, { useState } from 'react';
import './Content.css';

const Content = () => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const contentItems = [
    {
      id: 1,
      title: 'Getting Started with Mobile App',
      type: 'Article',
      status: 'Published',
      author: 'Sarah Chen',
      views: '12.5K',
      date: 'May 24, 2024',
      thumbnail: '📱'
    },
    {
      id: 2,
      title: 'Q2 2024 Product Update',
      type: 'Video',
      status: 'Published',
      author: 'Admin Team',
      views: '8.3K',
      date: 'May 23, 2024',
      thumbnail: '🎥'
    },
    {
      id: 3,
      title: 'User Onboarding Guide',
      type: 'Document',
      status: 'Draft',
      author: 'Emma Wilson',
      views: '3.2K',
      date: 'May 22, 2024',
      thumbnail: '📄'
    },
    {
      id: 4,
      title: 'API Documentation v2.0',
      type: 'Document',
      status: 'Published',
      author: 'Dev Team',
      views: '15.7K',
      date: 'May 21, 2024',
      thumbnail: '⚙️'
    },
    {
      id: 5,
      title: 'Marketing Campaign Assets',
      type: 'Media',
      status: 'Review',
      author: 'Marketing Team',
      views: '1.8K',
      date: 'May 20, 2024',
      thumbnail: '🎨'
    },
    {
      id: 6,
      title: 'Security Best Practices',
      type: 'Article',
      status: 'Published',
      author: 'Security Team',
      views: '9.4K',
      date: 'May 19, 2024',
      thumbnail: '🔒'
    }
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'text-green-500 bg-green-500/10';
      case 'draft':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'review':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-slate-500 bg-slate-500/10';
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-[#292e38] bg-white dark:bg-[#1a1f2e] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your content library
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-xl">upload</span>
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
              <span className="material-symbols-outlined text-xl">add</span>
              Create Content
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <span className="material-symbols-outlined text-blue-500 text-2xl">description</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Content</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">2,847</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Published</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">2,234</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <span className="material-symbols-outlined text-yellow-500 text-2xl">edit</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Drafts</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">432</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <span className="material-symbols-outlined text-purple-500 text-2xl">visibility</span>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Views</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">156.3K</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Library */}
        <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800">
          {/* Toolbar */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTab === 'all'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  All Content
                </button>
                <button
                  onClick={() => setSelectedTab('articles')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTab === 'articles'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Articles
                </button>
                <button
                  onClick={() => setSelectedTab('media')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedTab === 'media'
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Media
                </button>
              </div>

              {/* View Toggle & Search */}
              <div className="flex gap-3">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-primary'
                        : 'text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">grid_view</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-700 text-primary'
                        : 'text-slate-500'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">view_list</span>
                  </button>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <span className="material-symbols-outlined text-xl">sort</span>
                  Sort
                </button>
              </div>
            </div>
          </div>

          {/* Content Grid/List */}
          <div className="p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-slate-50 dark:bg-[#111621] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                  >
                    {/* Thumbnail */}
                    <div className="h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-6xl">
                      {item.thumbnail}
                    </div>
                    {/* Content */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {item.type}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{item.author}</span>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          {item.views}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">{item.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#111621] rounded-xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      {item.thumbnail}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                          {item.title}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>{item.type}</span>
                        <span>•</span>
                        <span>{item.author}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          {item.views}
                        </div>
                      </div>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Content;

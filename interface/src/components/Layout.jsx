import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Logo3D.css';

const Layout = ({ children, onLogout }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/users', icon: 'group', label: 'Users' },
    { path: '/content', icon: 'description', label: 'Content' },
    { path: '/analytics', icon: 'analytics', label: 'Analytics' },
    { path: '/settings', icon: 'settings', label: 'Settings' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-[#292e38] px-6 py-3 bg-white dark:bg-[#1a1f2e]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden text-slate-600 dark:text-slate-400 hover:text-primary"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="logo-glow">
              <img 
                src="/logo.png" 
                alt="SkillPulse Logo" 
                className="h-10 w-auto object-contain logo-3d"
              />
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                SkillPulse
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upskill Adapt Lead</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="relative text-slate-600 dark:text-slate-400 hover:text-primary">
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button className="relative text-slate-600 dark:text-slate-400 hover:text-primary">
            <span className="material-symbols-outlined text-2xl">search</span>
          </button>
          <div className="flex items-center gap-3 pl-3 border-l border-slate-300 dark:border-slate-700">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Alex Rivera</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              AR
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-[57px] left-0 bottom-0 w-64 bg-white dark:bg-[#1a1f2e] border-r border-slate-200 dark:border-[#292e38] transition-transform duration-300 z-40 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-primary text-white'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-[#292e38]">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-600 transition-colors w-full"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 pt-[57px] ${isSidebarOpen ? 'lg:pl-64' : ''}`}>
        {children}
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default Layout;

import React, { useState, useEffect } from 'react';
import './Settings.css';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  
  // Form states
  const [siteName, setSiteName] = useState('Admin Portal');
  const [siteUrl, setSiteUrl] = useState('https://admin.portal.com');
  const [supportEmail, setSupportEmail] = useState('support@portal.com');
  const [timezone, setTimezone] = useState('UTC-5');
  const [language, setLanguage] = useState('en');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [weeklyReports, setWeeklyReports] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  // Appearance settings
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [primaryColor, setPrimaryColor] = useState(() => {
    return localStorage.getItem('primaryColor') || '#195de6';
  });
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('fontSize') || 'medium';
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Apply primary color
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', primaryColor);
    localStorage.setItem('primaryColor', primaryColor);
  }, [primaryColor]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.fontSize = fontSizes[fontSize];
    localStorage.setItem('fontSize', fontSize);
  }, [fontSize]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  const handleColorChange = (color) => {
    setPrimaryColor(color);
  };

  const handleSave = (e) => {
    e.preventDefault();
    console.log('Settings saved');
    // Add your save logic here
  };

  const settingsSections = {
    general: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            General Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Site Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111621] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Site URL
              </label>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111621] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Support Email
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111621] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111621] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="UTC-5">Eastern Time (UTC-5)</option>
                  <option value="UTC-6">Central Time (UTC-6)</option>
                  <option value="UTC-7">Mountain Time (UTC-7)</option>
                  <option value="UTC-8">Pacific Time (UTC-8)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111621] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    notifications: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Notification Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">email</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Receive email notifications for important updates
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">notifications</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Push Notifications</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Get push notifications in your browser
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushNotifications}
                  onChange={(e) => setPushNotifications(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">assessment</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Weekly Reports</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Receive weekly analytics and performance reports
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyReports}
                  onChange={(e) => setWeeklyReports(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary mt-0.5">security</span>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Security Alerts</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Get notified about security events and suspicious activity
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securityAlerts}
                  onChange={(e) => setSecurityAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    ),
    security: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Security Settings
          </h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">lock</span>
                  <p className="font-medium text-slate-900 dark:text-white">Change Password</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm transition-colors">
                  Update
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Last changed 45 days ago
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">verified_user</span>
                  <p className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication</p>
                </div>
                <button className="px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 text-sm transition-colors">
                  Enable
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add an extra layer of security to your account
              </p>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#111621] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">devices</span>
                  <p className="font-medium text-slate-900 dark:text-white">Active Sessions</p>
                </div>
                <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm transition-colors">
                  View All
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                3 active sessions across different devices
              </p>
            </div>

            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500">delete</span>
                  <p className="font-medium text-slate-900 dark:text-white">Delete Account</p>
                </div>
                <button className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm transition-colors">
                  Delete
                </button>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Permanently delete your account and all associated data
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    appearance: (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Appearance Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: 'light', label: 'Light', icon: 'light_mode' },
                  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
                  { value: 'system', label: 'System', icon: 'contrast' }
                ].map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => handleThemeChange(themeOption.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      theme === themeOption.value
                        ? 'border-primary bg-primary/5 shadow-lg'
                        : 'border-slate-300 dark:border-slate-700 hover:border-primary'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-3xl mb-2 block ${
                      theme === themeOption.value ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {themeOption.icon}
                    </span>
                    <p className={`text-sm font-medium ${
                      theme === themeOption.value
                        ? 'text-primary'
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {themeOption.label}
                    </p>
                    {theme === themeOption.value && (
                      <span className="material-symbols-outlined text-primary text-sm mt-1 block">
                        check_circle
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Primary Color
              </label>
              <div className="grid grid-cols-6 gap-3">
                {[
                  { color: '#195de6', name: 'Blue' },
                  { color: '#10b981', name: 'Green' },
                  { color: '#f59e0b', name: 'Orange' },
                  { color: '#ef4444', name: 'Red' },
                  { color: '#8b5cf6', name: 'Purple' },
                  { color: '#ec4899', name: 'Pink' }
                ].map((colorOption) => (
                  <button
                    key={colorOption.color}
                    onClick={() => handleColorChange(colorOption.color)}
                    className={`w-full aspect-square rounded-lg border-2 transition-all relative hover:scale-110 ${
                      primaryColor === colorOption.color
                        ? 'border-white dark:border-white shadow-lg scale-110'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: colorOption.color }}
                    title={colorOption.name}
                  >
                    {primaryColor === colorOption.color && (
                      <span className="material-symbols-outlined text-white absolute inset-0 flex items-center justify-center text-2xl font-bold">
                        check
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Font Size
              </label>
              <select 
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#111621] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="small">Small</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-[#292e38] bg-white dark:bg-[#1a1f2e] px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-2">
              <nav className="space-y-1">
                {[
                  { id: 'general', icon: 'settings', label: 'General' },
                  { id: 'notifications', icon: 'notifications', label: 'Notifications' },
                  { id: 'security', icon: 'security', label: 'Security' },
                  { id: 'appearance', icon: 'palette', label: 'Appearance' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{tab.icon}</span>
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <form onSubmit={handleSave}>
                {settingsSections[activeTab]}

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    className="px-6 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

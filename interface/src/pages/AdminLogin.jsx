import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // Ensure this axios instance points to http://localhost:4000
import { setAuthTokens, setUser } from '../utils/auth';
import './AdminLogin.css';
import '../components/Logo3D.css';

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Basic Validation
    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      // We call the auth login endpoint. 
      // Note: If your axios 'api' instance already has a baseURL, 
      // you just need '/api/auth/login'
      const response = await api.post('/api/auth/login', {
        email: email.trim(),
        password: password
      });

      // Based on your app.js, the backend returns { success: true, data: { ... } }
      if (response.data && response.data.success) {
        const { token, refreshToken, user } = response.data.data;
        
        // 1. Store tokens in LocalStorage/Cookies
        setAuthTokens(token, refreshToken);
        
        // 2. Store user profile
        setUser(user);
        
        // 3. Trigger parent state update
        if (onLogin) onLogin();
        
        // 4. Redirect
        navigate('/dashboard');
      } else {
        setError(response.data?.message || 'Login failed. Please try again.');
      }
    } catch (err) {
      console.error("Login attempt failed:", err);

      // --- Smart Error Handling for Network Errors ---
      if (!err.response) {
        // This triggers if the backend is DOWN or PORT is wrong
        setError('Network Error: Cannot connect to the server. Check if the Backend is running on Port 4000.');
      } else if (err.response.status === 429) {
        // Triggered by your express-rate-limit in app.js
        setError('Too many login attempts. Please try again in 15 minutes.');
      } else if (err.response.status === 401 || err.response.status === 403) {
        setError('Invalid email or password.');
      } else {
        setError(err.response?.data?.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#292e38] px-10 py-3 bg-background-light dark:bg-background-dark">
        <div className="flex items-center gap-4 text-white">
          <div className="logo-glow">
            <img 
              src="/logo.png" 
              alt="SkillPulse Logo" 
              className="h-10 w-auto object-contain logo-3d"
            />
          </div>
          <div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
              SkillPulse Admin
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Upskill Adapt Lead</p>
          </div>
        </div>
        <div className="flex flex-1 justify-end gap-8">
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors">
            <span className="truncate">Support</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 auth-gradient">
        <div className="layout-content-container flex flex-col max-w-[480px] w-full">
          <div className="bg-white dark:bg-[#1c2230] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-10">
            <div className="flex flex-col items-center mb-8">
              <div className="logo-glow">
                <img 
                  src="/logo.png" 
                  alt="SkillPulse Logo" 
                  className="h-24 w-auto object-contain logo-3d-large"
                />
              </div>
              <h1 className="text-slate-900 dark:text-white tracking-tight text-[28px] font-bold leading-tight text-center mt-4">
                Welcome back
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal text-center mt-2 px-4">
                Enter your admin credentials to access the dashboard.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    mail
                  </span>
                  <input
                    className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-200 dark:border-[#3c4453] bg-slate-50 dark:bg-[#111621] h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b8] pl-12 pr-4 text-base font-normal leading-normal transition-all"
                    placeholder="admin@skillpulse.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-slate-900 dark:text-white text-sm font-medium leading-normal">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    lock
                  </span>
                  <input
                    className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary border border-slate-200 dark:border-[#3c4453] bg-slate-50 dark:bg-[#111621] h-14 placeholder:text-slate-400 dark:placeholder:text-[#9da6b8] pl-12 pr-12 text-base font-normal leading-normal transition-all"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    type="button"
                    onClick={togglePasswordVisibility}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    className="rounded border-slate-300 dark:border-slate-700 bg-transparent text-primary focus:ring-primary focus:ring-offset-0"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    Remember me
                  </span>
                </label>
                <a className="text-sm font-medium text-primary hover:text-primary/80 transition-colors" href="#">
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 animate-pulse">
                  {error}
                </div>
              )}

              <button
                className="w-full flex cursor-pointer items-center justify-center rounded-lg h-14 bg-primary text-white text-base font-bold leading-normal tracking-wide hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-slate-500 dark:text-slate-500 text-xs">
            © 2026 SkillPulse AI. Secure Enterprise Access. <br />
            Encryption Active: TLS 1.3
          </p>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
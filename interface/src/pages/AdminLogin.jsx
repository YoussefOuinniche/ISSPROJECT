import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api'; // Ensure this axios instance points to http://localhost:4000
import { setAuthTokens, setUser } from '../utils/auth';
import AnimatedButton from '../components/ui/AnimatedButton';
import { useToast } from '../components/ui/Toast';
import './AdminLogin.css';
import '../components/Logo3D.css';

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const toast = useToast();
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
      const status = err.response?.status;
      const msg = err.response?.data?.message;

      if (status === 403) {
        setError('This portal is for admin accounts only.');
      } else if (status === 401) {
        setError('Invalid email or password.');
      } else {
        setError(msg || err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const openSupport = () => {
    window.open('mailto:support@skillpulse.com?subject=Admin%20Portal%20Support', '_blank');
    toast.info('Opening support email');
  };

  const openSecurityPolicy = () => {
    window.open('https://example.com/security-policy', '_blank', 'noopener,noreferrer');
    toast.info('Opening security policy');
  };

  const forgotPassword = (event) => {
    event.preventDefault();
    if (!email) {
      toast.info('Enter your email to request a reset');
      return;
    }
    toast.success(`Password reset instructions sent to ${email}`);
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
          <AnimatedButton variant="gradient" size="md" className="min-w-[84px] text-sm font-bold leading-normal tracking-[0.015em]" onClick={openSupport} type="button">
            <span className="truncate">Support</span>
          </AnimatedButton>
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
                Please enter your admin credentials to manage the platform.
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
                  <AnimatedButton
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary min-w-[40px]"
                    type="button"
                    onClick={togglePasswordVisibility}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </AnimatedButton>
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
                <a
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  href="#"
                  onClick={forgotPassword}
                >
                  Forgot password?
                </a>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 animate-pulse">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <AnimatedButton
                variant="gradient"
                size="lg"
                fullWidth
                className="text-base font-bold leading-normal tracking-wide"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </AnimatedButton>
            </form>

            {/* Help Footer */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-3">
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Need help accessing your account?
              </p>
              <div className="flex gap-4">
                <a
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openSupport();
                  }}
                >
                  <span className="material-symbols-outlined text-sm">contact_support</span>
                  Technical Support
                </a>
                <a
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors"
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    openSecurityPolicy();
                  }}
                >
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  Security Policy
                </a>
              </div>
            </div>
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
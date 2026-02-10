import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';
import '../components/Logo3D.css';

const AdminLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Add your login logic here
    console.log('Login attempt:', { email, password, rememberMe });
    
    // For demo purposes, login with any credentials
    if (email && password) {
      onLogin();
      navigate('/dashboard');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark font-display">
      {/* Top Navigation Bar */}
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

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-6 auth-gradient">
        <div className="layout-content-container flex flex-col max-w-[480px] w-full">
          {/* Login Card */}
          <div className="bg-white dark:bg-[#1c2230] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-10">
            {/* Branding/Header */}
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
                Please enter your credentials to manage the mobile app.
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Email Field */}
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
                    placeholder="admin@company.com"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Field */}
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

              {/* Options Row */}
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
                >
                  Forgot password?
                </a>
              </div>

              {/* Login Button */}
              <button
                className="w-full flex cursor-pointer items-center justify-center rounded-lg h-14 bg-primary text-white text-base font-bold leading-normal tracking-wide hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                type="submit"
              >
                Sign In
              </button>
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
                >
                  <span className="material-symbols-outlined text-sm">contact_support</span>
                  Technical Support
                </a>
                <a
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors"
                  href="#"
                >
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  Security Policy
                </a>
              </div>
            </div>
          </div>

          {/* Footer Copy */}
          <p className="mt-8 text-center text-slate-500 dark:text-slate-500 text-xs">
            © 2024 Admin Portal Inc. All rights reserved. <br />
            Secured by Enterprise Grade Encryption.
          </p>
        </div>
      </main>

      {/* Bottom Illustration (Decorative) */}
      <div className="hidden lg:block fixed bottom-0 right-0 p-10 opacity-20 dark:opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[120px] text-primary">analytics</span>
      </div>
      <div className="hidden lg:block fixed top-24 left-0 p-10 opacity-20 dark:opacity-10 pointer-events-none">
        <span className="material-symbols-outlined text-[80px] text-primary">group_work</span>
      </div>
    </div>
  );
};

export default AdminLogin;

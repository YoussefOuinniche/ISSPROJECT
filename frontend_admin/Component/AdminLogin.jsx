import React, { useState } from "react";
import "../styles/adminLogin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    console.log("Email:", email);
    console.log("Password:", password);

    setLoading(true);

    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 800);
  };

  return (
    <div className="auth-page">
      <header className="topbar">
        <div className="logo-box">
          <img src="/skillpulse-logo.png" alt="logo" />
          <h2>SkillPulse Admin</h2>
        </div>

        <button className="support-btn">Support</button>
      </header>

      <main className="auth-container">
        <div className="login-card">

          <div className="login-header">
            <div className="logo-3d">
              <img src="/skillpulse-logo.png" alt="logo" />
            </div>

            <h1>Welcome back</h1>
            <p>Please enter your credentials to manage <b>SkillPulse</b></p>
          </div>

          <form onSubmit={handleLogin}>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-box">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <span
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "🙈" : "👁️"}
                </span>
              </div>
            </div>

            <div className="options-row">
              <label>
                <input type="checkbox" />
                Remember me
              </label>

              <a href="#">Forgot password?</a>
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-footer">
            <p>Need help accessing your account?</p>
          </div>

        </div>
      </main>
    </div>
  );
}

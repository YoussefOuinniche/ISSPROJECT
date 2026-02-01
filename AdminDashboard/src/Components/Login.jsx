import { useState } from "react";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Login:", { email, password });
  };

  return (
    <div className="login-page">
      {/* TOP BAR */}
      <header className="top-bar">
        <div className="logo">🛡️ Admin Portal</div>
        <button className="support-btn">Support</button>
      </header>

      {/* MAIN DESKTOP AREA */}
      <main className="main-content">
        <div className="login-card">
          <div className="icon">▦</div>

          <h1>Welcome back</h1>
          <p>Please enter your credentials to manage the mobile app.</p>

          <form onSubmit={handleSubmit}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="options">
              <label className="remember">
                <input type="checkbox" />
                Remember me
              </label>
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" className="signin-btn">
              Sign In
            </button>
          </form>

          <div className="help">
            <p>Need help accessing your account?</p>
            <div className="links">
              <span>Technical Support</span>
              <span>Security Policy</span>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="copyright">
        © 2024 Admin Portal Inc. All rights reserved.
      </footer>
    </div>
  );
}

import { useState } from "react";
import "./Login.css";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin(); // triggers dashboard view
    }
  };

  return (
    <div className="login-page">
      <main className="main-content">
        <div className="login-card">
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

            <button type="submit" className="signin-btn">
              Sign In
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

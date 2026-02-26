import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) { setError("Please fill in all fields"); return; }
    setSubmitting(true);

    setTimeout(() => {
      let accounts = [];
      try { accounts = JSON.parse(localStorage.getItem("sz_accounts") || "[]"); } catch (_) { }

      const user = accounts.find(
        (a) => a.email === email.toLowerCase().trim() && a.passwordHash === btoa(password)
      );

      if (!user) {
        // fallback: allow demo login if no accounts registered yet
        if (accounts.length === 0 && email && password) {
          const demoUser = {
            id: "demo",
            name: email.split("@")[0],
            email: email.toLowerCase().trim(),
            phone: "",
            avatar: email.slice(0, 2).toUpperCase(),
            createdAt: new Date().toISOString(),
          };
          localStorage.setItem("authToken", JSON.stringify(demoUser));
          navigate("/");
          return;
        }
        setError("Invalid email or password. Please try again.");
        setSubmitting(false);
        return;
      }

      // Store session (exclude passwordHash)
      const { passwordHash, ...session } = user;
      localStorage.setItem("authToken", JSON.stringify(session));

      // Save to search history base
      if (!localStorage.getItem("sz_history")) {
        localStorage.setItem("sz_history", JSON.stringify([]));
      }

      setSubmitting(false);
      navigate("/");
    }, 800);
  };

  return (
    <div className="auth-page">
      <div className="auth-blob auth-blob--1" />
      <div className="auth-blob auth-blob--2" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo-badge">SZ</span>
          <div>
            <div className="auth-logo-name">SafeZone AI</div>
            <div className="auth-logo-sub">Safety Intelligence Platform</div>
          </div>
        </div>

        <h2 className="auth-title">Welcome back</h2>
        <p className="auth-sub">Sign in to access your safety dashboard</p>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && (
            <div className="auth-alert">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">✉️</span>
              <input
                className="auth-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div className="auth-field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="auth-label">Password</label>
              <span className="auth-forgot">Forgot password?</span>
            </div>
            <div className="auth-input-wrap">
              <span className="auth-input-icon">🔒</span>
              <input
                className="auth-input"
                type={showPass ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button className="auth-btn" type="submit" disabled={submitting}>
            {submitting ? <span className="auth-spinner" /> : "🔐 Sign In"}
          </button>
        </form>

        {/* Feature badges */}
        <div className="auth-features">
          <div className="auth-feature"><span>🗺️</span> Live Safety Map</div>
          <div className="auth-feature"><span>🤖</span> AI Risk Analysis</div>
          <div className="auth-feature"><span>🚨</span> Emergency Alerts</div>
        </div>

        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/signup" className="auth-link">Create one free →</Link>
        </p>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Enter a valid email";
    if (!form.phone.match(/^\+?[\d\s\-()]{7,15}$/)) e.phone = "Enter a valid phone number";
    if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    setTimeout(() => {
      // Load existing accounts
      let accounts = [];
      try { accounts = JSON.parse(localStorage.getItem("sz_accounts") || "[]"); } catch (_) { }

      // Check if email already registered
      if (accounts.find((a) => a.email === form.email)) {
        setErrors({ email: "An account with this email already exists" });
        setSubmitting(false);
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        name: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        phone: form.phone.trim(),
        passwordHash: btoa(form.password), // base64 encode (not real crypto — demo only)
        createdAt: new Date().toISOString(),
        avatar: form.name.trim().slice(0, 2).toUpperCase(),
      };

      accounts.push(newUser);
      localStorage.setItem("sz_accounts", JSON.stringify(accounts));

      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => navigate("/signin"), 1800);
    }, 900);
  };

  return (
    <div className="auth-page">
      {/* background blobs */}
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

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Join thousands staying safer every day</p>

        {success ? (
          <div className="auth-success">
            <div className="auth-success-icon">✅</div>
            <div className="auth-success-text">Account created! Redirecting to sign in…</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* Name */}
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">👤</span>
                <input
                  className={`auth-input${errors.name ? " auth-input--error" : ""}`}
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={set("name")}
                  autoComplete="name"
                />
              </div>
              {errors.name && <span className="auth-error">{errors.name}</span>}
            </div>

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">✉️</span>
                <input
                  className={`auth-input${errors.email ? " auth-input--error" : ""}`}
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            {/* Phone */}
            <div className="auth-field">
              <label className="auth-label">Phone Number</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">📱</span>
                <input
                  className={`auth-input${errors.phone ? " auth-input--error" : ""}`}
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={form.phone}
                  onChange={set("phone")}
                  autoComplete="tel"
                />
              </div>
              {errors.phone && <span className="auth-error">{errors.phone}</span>}
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔒</span>
                <input
                  className={`auth-input${errors.password ? " auth-input--error" : ""}`}
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={set("password")}
                  autoComplete="new-password"
                />
                <button type="button" className="auth-eye" onClick={() => setShowPass(!showPass)}>
                  {showPass ? "🙈" : "👁️"}
                </button>
              </div>
              {form.password && (
                <div className="auth-strength">
                  {["weak", "fair", "good", "strong"].map((l, i) => (
                    <div key={l} className={`auth-strength-bar${form.password.length > i * 3 + 2 ? " auth-strength-bar--on" : ""}`} />
                  ))}
                  <span className="auth-strength-label">
                    {form.password.length < 6 ? "Weak" : form.password.length < 9 ? "Fair" : form.password.length < 12 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>

            {/* Confirm Password */}
            <div className="auth-field">
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">🔑</span>
                <input
                  className={`auth-input${errors.confirm ? " auth-input--error" : ""}`}
                  type={showPass ? "text" : "password"}
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={set("confirm")}
                  autoComplete="new-password"
                />
              </div>
              {errors.confirm && <span className="auth-error">{errors.confirm}</span>}
            </div>

            <button className="auth-btn" type="submit" disabled={submitting}>
              {submitting ? <span className="auth-spinner" /> : "🚀 Create Account"}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/signin" className="auth-link">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}

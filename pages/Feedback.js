// pages/Feedback.js
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./Feedback.css";

function getUser() {
    try { return JSON.parse(localStorage.getItem("authToken")); } catch { return null; }
}

function getReviews() {
    try { return JSON.parse(localStorage.getItem("sz_feedback") || "[]"); } catch { return []; }
}

const CATEGORIES = [
    { key: "map", label: "🗺️ Map Accuracy", desc: "How accurate is the safety heatmap?" },
    { key: "ui", label: "🎨 UI & Design", desc: "How polished is the interface?" },
    { key: "emergency", label: "🚨 Emergency Features", desc: "How useful is the SOS / helpline section?" },
    { key: "ai", label: "🤖 AI Risk Analysis", desc: "How reliable are the risk predictions?" },
    { key: "speed", label: "⚡ Performance", desc: "How fast and smooth is the experience?" },
];

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];
const SENTIMENT_EMOJI = (r) => r >= 4.5 ? "😍" : r >= 3.5 ? "😊" : r >= 2.5 ? "😐" : r >= 1.5 ? "😕" : "😟";

function StarPicker({ value, onChange, size = "md" }) {
    const [hover, setHover] = useState(0);
    return (
        <div className={`fb-stars fb-stars--${size}`}>
            {[1, 2, 3, 4, 5].map(n => (
                <button
                    key={n}
                    type="button"
                    className={`fb-star ${n <= (hover || value) ? "fb-star--on" : ""}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(n)}
                    aria-label={`${n} star`}
                >★</button>
            ))}
        </div>
    );
}

function AverageBar({ label, value }) {
    const pct = (value / 5) * 100;
    const color = value >= 4 ? "#10b981" : value >= 3 ? "#f59e0b" : "#ef4444";
    return (
        <div className="fb-avg-row">
            <span className="fb-avg-label">{label}</span>
            <div className="fb-avg-track">
                <div className="fb-avg-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="fb-avg-val" style={{ color }}>{value.toFixed(1)}</span>
        </div>
    );
}

export default function Feedback() {
    const user = getUser();
    const [submitted, setSubmitted] = useState(false);
    const [reviews, setReviews] = useState(getReviews);
    const [overall, setOverall] = useState(0);
    const [cats, setCats] = useState({ map: 0, ui: 0, emergency: 0, ai: 0, speed: 0 });
    const [comment, setComment] = useState("");
    const [name, setName] = useState(user?.name || "");
    const [anonymous, setAnonymous] = useState(false);
    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState("write"); // "write" | "reviews"

    const validate = () => {
        const e = {};
        if (!overall) e.overall = "Please give an overall rating";
        if (!comment.trim() || comment.trim().length < 10) e.comment = "Please write at least 10 characters";
        if (!anonymous && !name.trim()) e.name = "Please enter your name or go anonymous";
        return e;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        const review = {
            id: Date.now(),
            name: anonymous ? "Anonymous" : name.trim(),
            overall,
            cats: { ...cats },
            comment: comment.trim(),
            ts: new Date().toISOString(),
            avatar: anonymous ? "👤" : (user?.name?.slice(0, 2).toUpperCase() || "??"),
        };

        const updated = [review, ...reviews];
        localStorage.setItem("sz_feedback", JSON.stringify(updated));
        setReviews(updated);
        setSubmitted(true);
    };

    const resetForm = () => {
        setOverall(0); setCats({ map: 0, ui: 0, emergency: 0, ai: 0, speed: 0 });
        setComment(""); setErrors({}); setSubmitted(false); setActiveTab("reviews");
    };

    // Computed stats
    const totalReviews = reviews.length;
    const avgOverall = totalReviews ? (reviews.reduce((s, r) => s + r.overall, 0) / totalReviews) : 0;
    const catAvgs = CATEGORIES.reduce((acc, c) => {
        const vals = reviews.map(r => r.cats[c.key]).filter(Boolean);
        acc[c.key] = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        return acc;
    }, {});

    const starCounts = [5, 4, 3, 2, 1].map(s => ({
        star: s,
        count: reviews.filter(r => r.overall === s).length,
        pct: totalReviews ? (reviews.filter(r => r.overall === s).length / totalReviews) * 100 : 0,
    }));

    return (
        <div className="fb-page">

            {/* ── Header ── */}
            <div className="fb-header">
                <div className="fb-header-inner">
                    <div>
                        <h1 className="fb-title">⭐ Feedback & Ratings</h1>
                        <p className="fb-subtitle">Help us improve SafeZone AI with your honest feedback</p>
                    </div>
                    <Link to="/" className="fb-back-btn">← Back to Home</Link>
                </div>
            </div>

            <div className="fb-body">

                {/* ── Rating Summary Card ── */}
                {totalReviews > 0 && (
                    <div className="fb-summary-card">
                        <div className="fb-summary-left">
                            <div className="fb-big-score">{avgOverall.toFixed(1)}</div>
                            <div className="fb-big-stars">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <span key={n} className={n <= Math.round(avgOverall) ? "fb-sstar fb-sstar--on" : "fb-sstar"}>★</span>
                                ))}
                            </div>
                            <div className="fb-big-emoji">{SENTIMENT_EMOJI(avgOverall)}</div>
                            <div className="fb-total-count">{totalReviews} review{totalReviews !== 1 ? "s" : ""}</div>
                        </div>
                        <div className="fb-summary-mid">
                            {starCounts.map(s => (
                                <div key={s.star} className="fb-star-dist-row">
                                    <span className="fb-star-dist-label">{s.star}★</span>
                                    <div className="fb-star-dist-track">
                                        <div className="fb-star-dist-fill" style={{ width: `${s.pct}%` }} />
                                    </div>
                                    <span className="fb-star-dist-count">{s.count}</span>
                                </div>
                            ))}
                        </div>
                        <div className="fb-summary-right">
                            {CATEGORIES.map(c => (
                                <AverageBar key={c.key} label={c.label} value={catAvgs[c.key] || 0} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="fb-tabs">
                    <button className={`fb-tab ${activeTab === "write" ? "fb-tab--active" : ""}`} onClick={() => setActiveTab("write")}>
                        ✏️ Write a Review
                    </button>
                    <button className={`fb-tab ${activeTab === "reviews" ? "fb-tab--active" : ""}`} onClick={() => setActiveTab("reviews")}>
                        💬 All Reviews {totalReviews > 0 && <span className="fb-tab-badge">{totalReviews}</span>}
                    </button>
                </div>

                {/* ── Write Review ── */}
                {activeTab === "write" && (
                    <div className="fb-write-card">
                        {submitted ? (
                            <div className="fb-success">
                                <div className="fb-success-icon">🎉</div>
                                <h2 className="fb-success-title">Thank you for your feedback!</h2>
                                <p className="fb-success-sub">Your review helps make SafeZone AI better for everyone.</p>
                                <button className="fb-success-btn" onClick={resetForm}>See All Reviews →</button>
                            </div>
                        ) : (
                            <form className="fb-form" onSubmit={handleSubmit} noValidate>

                                {/* Name row */}
                                <div className="fb-form-row">
                                    <div className="fb-field fb-field--grow">
                                        <label className="fb-label">Your Name</label>
                                        <input
                                            className={`fb-input ${errors.name ? "fb-input--err" : ""}`}
                                            placeholder="Enter your name…"
                                            value={name}
                                            onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: "" })); }}
                                            disabled={anonymous}
                                        />
                                        {errors.name && <span className="fb-err">{errors.name}</span>}
                                    </div>
                                    <div className="fb-anon-wrap">
                                        <label className="fb-toggle">
                                            <input type="checkbox" checked={anonymous} onChange={e => { setAnonymous(e.target.checked); if (e.target.checked) setErrors(p => ({ ...p, name: "" })); }} />
                                            <span className="fb-toggle-track"><span className="fb-toggle-thumb" /></span>
                                            Anonymous
                                        </label>
                                    </div>
                                </div>

                                {/* Overall rating */}
                                <div className="fb-field">
                                    <label className="fb-label">Overall Rating <span className="fb-required">*</span></label>
                                    <div className="fb-overall-row">
                                        <StarPicker value={overall} onChange={v => { setOverall(v); setErrors(p => ({ ...p, overall: "" })); }} size="lg" />
                                        {overall > 0 && <span className="fb-star-label">{STAR_LABELS[overall]}</span>}
                                    </div>
                                    {errors.overall && <span className="fb-err">{errors.overall}</span>}
                                </div>

                                {/* Category ratings */}
                                <div className="fb-field">
                                    <label className="fb-label">Rate Specific Features</label>
                                    <div className="fb-cat-grid">
                                        {CATEGORIES.map(c => (
                                            <div key={c.key} className="fb-cat-card">
                                                <div className="fb-cat-label">{c.label}</div>
                                                <div className="fb-cat-desc">{c.desc}</div>
                                                <StarPicker value={cats[c.key]} onChange={v => setCats(p => ({ ...p, [c.key]: v }))} size="sm" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Comment */}
                                <div className="fb-field">
                                    <label className="fb-label">Your Feedback <span className="fb-required">*</span></label>
                                    <textarea
                                        className={`fb-textarea ${errors.comment ? "fb-input--err" : ""}`}
                                        placeholder="Share your experience, suggestions, or any issues you encountered…"
                                        rows={5}
                                        value={comment}
                                        onChange={e => { setComment(e.target.value); setErrors(p => ({ ...p, comment: "" })); }}
                                    />
                                    <div className="fb-char-count" style={{ color: comment.length < 10 ? "#ef4444" : "#64748b" }}>
                                        {comment.length} chars {comment.length < 10 ? `(need ${10 - comment.length} more)` : "✓"}
                                    </div>
                                    {errors.comment && <span className="fb-err">{errors.comment}</span>}
                                </div>

                                <button type="submit" className="fb-submit-btn">
                                    ⭐ Submit Review
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* ── All Reviews ── */}
                {activeTab === "reviews" && (
                    <div className="fb-reviews-list">
                        {reviews.length === 0 ? (
                            <div className="fb-no-reviews">
                                <div className="fb-no-icon">📭</div>
                                <p>No reviews yet. Be the first to share your experience!</p>
                                <button className="fb-no-btn" onClick={() => setActiveTab("write")}>Write a Review →</button>
                            </div>
                        ) : (
                            reviews.map(r => (
                                <div key={r.id} className="fb-review-card">
                                    <div className="fb-review-top">
                                        <div className="fb-reviewer">
                                            <div className="fb-reviewer-avatar">{r.avatar}</div>
                                            <div>
                                                <div className="fb-reviewer-name">{r.name}</div>
                                                <div className="fb-reviewer-date">{new Date(r.ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                                            </div>
                                        </div>
                                        <div className="fb-review-stars">
                                            <div style={{ display: "flex", gap: 2 }}>
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <span key={n} className={n <= r.overall ? "fb-rstar fb-rstar--on" : "fb-rstar"}>★</span>
                                                ))}
                                            </div>
                                            <span className="fb-review-overall-label">{STAR_LABELS[r.overall]}</span>
                                        </div>
                                    </div>
                                    <p className="fb-review-comment">"{r.comment}"</p>
                                    {Object.values(r.cats).some(v => v > 0) && (
                                        <div className="fb-review-cats">
                                            {CATEGORIES.filter(c => r.cats[c.key] > 0).map(c => (
                                                <div key={c.key} className="fb-review-cat-tag">
                                                    {c.label.split(" ")[0]} {r.cats[c.key]}★
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// pages/Dashboard.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";
import { Chart, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip, Filler } from "chart.js";

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Legend, Tooltip, Filler);

function getUser() {
  try { return JSON.parse(localStorage.getItem("authToken")); } catch { return null; }
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("sz_history") || "[]"); } catch { return []; }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const RISK_DATA = [28, 45, 60, 38, 72, 85];
const ALERT_DATA = [5, 12, 9, 18, 22, 30];

const getRiskColor = (v) => v > 70 ? "#ef4444" : v > 40 ? "#f97316" : "#10b981";

function Dashboard() {
  const barRef = useRef(null);
  const lineRef = useRef(null);
  const barInst = useRef(null);
  const lineInst = useRef(null);
  const navigate = useNavigate();

  const user = getUser();
  const history = getHistory();

  const avgRisk = Math.round(RISK_DATA.reduce((a, b) => a + b, 0) / RISK_DATA.length);
  const maxRisk = Math.max(...RISK_DATA);
  const totalAlerts = ALERT_DATA.reduce((a, b) => a + b, 0);
  const safeSearches = history.filter(h => h.score < 40).length;

  /* ── Chart: bar (risk trend) ── */
  useEffect(() => {
    if (!barRef.current) return;
    if (barInst.current) { barInst.current.destroy(); barInst.current = null; }

    barInst.current = new Chart(barRef.current, {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [{
          label: "Risk Score",
          data: RISK_DATA,
          backgroundColor: RISK_DATA.map(v =>
            v > 70 ? "rgba(239,68,68,0.7)" : v > 40 ? "rgba(249,115,22,0.7)" : "rgba(16,185,129,0.7)"
          ),
          borderColor: RISK_DATA.map(v =>
            v > 70 ? "#ef4444" : v > 40 ? "#f97316" : "#10b981"
          ),
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.95)",
            titleColor: "#06b6d4",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(6,182,212,0.3)",
            borderWidth: 1,
          },
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "rgba(6,182,212,0.07)" } },
          x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
    return () => { if (barInst.current) { barInst.current.destroy(); barInst.current = null; } };
  }, []);

  /* ── Chart: line (alerts) ── */
  useEffect(() => {
    if (!lineRef.current) return;
    if (lineInst.current) { lineInst.current.destroy(); lineInst.current = null; }

    lineInst.current = new Chart(lineRef.current, {
      type: "line",
      data: {
        labels: MONTHS,
        datasets: [{
          label: "Alerts Triggered",
          data: ALERT_DATA,
          borderColor: "#a78bfa",
          backgroundColor: "rgba(167,139,250,0.1)",
          fill: true,
          tension: 0.45,
          pointBackgroundColor: "#a78bfa",
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(15,23,42,0.95)",
            titleColor: "#a78bfa",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(167,139,250,0.3)",
            borderWidth: 1,
          },
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: "#64748b", font: { size: 11 } }, grid: { color: "rgba(167,139,250,0.07)" } },
          x: { ticks: { color: "#64748b", font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
    return () => { if (lineInst.current) { lineInst.current.destroy(); lineInst.current = null; } };
  }, []);

  const statCards = [
    { icon: "📊", label: "Avg Risk Score", value: avgRisk, sub: "6-month average", color: getRiskColor(avgRisk) },
    { icon: "🔥", label: "Peak Risk", value: maxRisk, sub: "Highest recorded", color: getRiskColor(maxRisk) },
    { icon: "🚨", label: "Total Alerts", value: totalAlerts, sub: "Emergency triggers", color: "#a78bfa" },
    { icon: "🕐", label: "Searches Made", value: history.length, sub: "Locations analysed", color: "#06b6d4" },
  ];

  return (
    <div className="db-page">

      {/* ── Header ── */}
      <div className="db-header">
        <div className="db-header-inner">
          <div>
            <h1 className="db-title">📊 Dashboard</h1>
            <p className="db-subtitle">
              Welcome back, <strong style={{ color: "#06b6d4" }}>{user?.name || "User"}</strong> — here's your safety overview
            </p>
          </div>
          <button className="db-cta-btn" onClick={() => navigate("/map")}>
            🗺️ Open Safety Map
          </button>
        </div>
      </div>

      <div className="db-body">

        {/* ── Stat Cards ── */}
        <div className="db-stat-grid">
          {statCards.map(s => (
            <div key={s.label} className="db-stat-card">
              <div className="db-stat-icon" style={{ background: `${s.color}18`, border: `1px solid ${s.color}30` }}>
                {s.icon}
              </div>
              <div>
                <div className="db-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="db-stat-label">{s.label}</div>
                <div className="db-stat-sub">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div className="db-charts-row">

          {/* Bar chart */}
          <div className="db-card db-card--flex">
            <div className="db-card-header">
              <div>
                <div className="db-card-title">📈 Monthly Risk Trend</div>
                <div className="db-card-sub">6-month risk score history by location</div>
              </div>
              <div className="db-legend-row">
                <span className="db-legend-dot" style={{ background: "#10b981" }} /> Low
                <span className="db-legend-dot" style={{ background: "#f97316", marginLeft: "0.75rem" }} /> Med
                <span className="db-legend-dot" style={{ background: "#ef4444", marginLeft: "0.75rem" }} /> High
              </div>
            </div>
            <canvas ref={barRef} height={90} />
          </div>

          {/* Line chart */}
          <div className="db-card db-card--flex">
            <div className="db-card-header">
              <div>
                <div className="db-card-title">🚨 Alerts Over Time</div>
                <div className="db-card-sub">Emergency triggers per month</div>
              </div>
              <div className="db-legend-row">
                <span className="db-legend-dot" style={{ background: "#a78bfa" }} /> Alerts
              </div>
            </div>
            <canvas ref={lineRef} height={90} />
          </div>
        </div>

        {/* ── Bottom Row ── */}
        <div className="db-bottom-row">

          {/* Recent Searches */}
          <div className="db-card db-card--scroll">
            <div className="db-card-header">
              <div>
                <div className="db-card-title">🕐 Recent Searches</div>
                <div className="db-card-sub">Your last {Math.min(history.length, 8)} locations</div>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="db-empty">
                <div className="db-empty-icon">🔍</div>
                <div>No searches yet — try the Safety Map</div>
              </div>
            ) : (
              <ul className="db-search-list">
                {history.slice(0, 8).map((h, i) => (
                  <li key={i} className="db-search-item"
                    onClick={() => { localStorage.setItem("userLocation", JSON.stringify({ lat: h.lat, lng: h.lon })); navigate("/map"); }}
                  >
                    <span className="db-search-pin">📍</span>
                    <span className="db-search-name">{h.query}</span>
                    <span className="db-search-date">{new Date(h.ts).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Safety Summary */}
          <div className="db-card">
            <div className="db-card-header">
              <div>
                <div className="db-card-title">🛡️ Safety Summary</div>
                <div className="db-card-sub">Your risk profile at a glance</div>
              </div>
            </div>

            <div className="db-summary-rows">
              {[
                { label: "High Risk Months", val: RISK_DATA.filter(v => v > 70).length, color: "#ef4444" },
                { label: "Moderate Risk Months", val: RISK_DATA.filter(v => v > 40 && v <= 70).length, color: "#f97316" },
                { label: "Low Risk Months", val: RISK_DATA.filter(v => v <= 40).length, color: "#10b981" },
                { label: "Safe Locations Searched", val: safeSearches, color: "#06b6d4" },
              ].map(r => (
                <div key={r.label} className="db-summary-row">
                  <span className="db-summary-label">{r.label}</span>
                  <span className="db-summary-val" style={{ color: r.color }}>{r.val}</span>
                </div>
              ))}
            </div>

            <div className="db-risk-meter">
              <div className="db-risk-meter-label">
                <span>Overall Safety Level</span>
                <span style={{ color: getRiskColor(avgRisk), fontWeight: 700 }}>
                  {avgRisk > 70 ? "Dangerous" : avgRisk > 40 ? "Moderate" : "Safe"}
                </span>
              </div>
              <div className="db-risk-meter-track">
                <div
                  className="db-risk-meter-fill"
                  style={{ width: `${avgRisk}%`, background: getRiskColor(avgRisk) }}
                />
              </div>
              <div className="db-risk-meter-pct" style={{ color: getRiskColor(avgRisk) }}>{avgRisk}/100</div>
            </div>

            <button className="db-emergency-btn" onClick={() => navigate("/map")}>
              🗺️ Analyse a Location Now
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Dashboard;
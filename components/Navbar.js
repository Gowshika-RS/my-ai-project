// components/Navbar.js
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const HELPLINES = [
  { country: "🇮🇳 India", lines: [{ name: "Police", num: "100" }, { name: "Women Helpline", num: "1091" }, { name: "Child Helpline", num: "1098" }, { name: "Ambulance", num: "108" }, { name: "National Emergency", num: "112" }] },
  { country: "🇺🇸 USA", lines: [{ name: "Emergency", num: "911" }, { name: "Crisis Text Line", num: "Text HOME to 741741" }, { name: "National DV Hotline", num: "1-800-799-7233" }] },
  { country: "🇬🇧 UK", lines: [{ name: "Emergency", num: "999" }, { name: "Non-Emergency Police", num: "101" }, { name: "Victim Support", num: "08 08 16 89 111" }] },
  { country: "🌍 International", lines: [{ name: "Interpol", num: "+33 1 47 44 49 80" }, { name: "Red Cross", num: "+41 22 730 3600" }] },
];

function getUser() {
  try { return JSON.parse(localStorage.getItem("authToken")); } catch { return null; }
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("sz_history") || "[]"); } catch { return []; }
}

function addHistory(entry) {
  const h = getHistory();
  const updated = [entry, ...h.filter(x => x.query !== entry.query)].slice(0, 20);
  localStorage.setItem("sz_history", JSON.stringify(updated));
}

export default function Navbar() {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelpline, setShowHelpline] = useState(false);
  const [emergencyLoc, setEmergencyLoc] = useState(null);
  const [sendingEmergency, setSendingEmergency] = useState(false);
  const [, forceUpdate] = useState(0);

  const recogRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  const user = getUser();
  const history = getHistory();

  // Close all panels when route changes
  useEffect(() => {
    setShowProfile(false);
    setShowHistory(false);
    setShowHelpline(false);
    setShowSearch(false);
  }, [location]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".nb-dropdown-wrap")) {
        setShowProfile(false);
        setShowHistory(false);
        setShowHelpline(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const signout = () => {
    localStorage.removeItem("authToken");
    setShowProfile(false);
    forceUpdate(n => n + 1);
    navigate("/signin");
  };

  // ── Voice ──
  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice search not supported in this browser"); return; }
    if (listening && recogRef.current) { recogRef.current.stop(); setListening(false); return; }
    const r = new SR();
    r.lang = "en-US";
    r.onresult = (e) => { const t = e.results[0][0].transcript; setQuery(t); setShowSearch(true); };
    r.onend = () => setListening(false);
    r.start();
    recogRef.current = r;
    setListening(true);
  };

  // ── Search ──
  const handleSearch = async (q = query) => {
    if (!q.trim()) return;
    try {
      const encoded = encodeURIComponent(q.trim());
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`, { headers: { Accept: "application/json" } });
      const geo = await geoRes.json();
      if (!geo?.length) { alert("Location not found"); return; }
      const lat = parseFloat(geo[0].lat);
      const lon = parseFloat(geo[0].lon);
      localStorage.setItem("userLocation", JSON.stringify({ lat, lng: lon }));
      addHistory({ query: q.trim(), lat, lon, ts: new Date().toISOString() });
      setShowSearch(false);
      navigate("/map");
    } catch (e) { alert("Search failed: " + e.message); }
  };

  // ── Emergency ──
  const triggerEmergency = async () => {
    let loc = null;
    try { loc = JSON.parse(localStorage.getItem("userLocation")); } catch { }
    if (!loc && navigator.geolocation) {
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 }));
        loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch { }
    }
    setEmergencyLoc(loc);
    setShowEmergency(true);
  };

  const confirmEmergency = async () => {
    if (!emergencyLoc) return;
    setSendingEmergency(true);
    try {
      const r = await fetch(`${API_BASE}/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: emergencyLoc.lat, lon: emergencyLoc.lng, note: "Emergency via app" }),
      });
      const j = await r.json();
      alert(r.ok ? "✅ Emergency alert sent!" : "⚠️ " + (j.detail || "Emergency failed"));
    } catch { alert("Failed to send emergency. Call 112 / 911 immediately!"); }
    setSendingEmergency(false);
    setShowEmergency(false);
  };

  const initials = user?.avatar || user?.name?.slice(0, 2).toUpperCase() || "??";
  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/map", label: "Map" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/feedback", label: "Feedback" },
  ];

  return (
    <>
      {/* ─────────── NAVBAR ─────────── */}
      <nav className="nb-bar">
        {/* Brand */}
        <Link to="/" className="nb-brand">
          <div className="nb-brand-badge">SZ</div>
          <div>
            <div className="nb-brand-name">SafeZone AI</div>
            <div className="nb-brand-sub">Safety Intelligence</div>
          </div>
        </Link>

        {/* Nav links */}
        <div className="nb-links">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} className={`nb-link${location.pathname === l.to ? " nb-link--active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Search bar */}
        <div className="nb-search-wrap">
          <span className="nb-search-icon">🔍</span>
          <input
            className="nb-search-input"
            placeholder="Search a location…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setShowSearch(true)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          />
          {query && (
            <button className="nb-search-clear" onClick={() => setQuery("")}>✕</button>
          )}
        </div>

        {/* Right action buttons */}
        <div className="nb-actions">

          {/* Voice */}
          <button
            className={`nb-icon-btn nb-icon-btn--voice${listening ? " nb-icon-btn--pulse" : ""}`}
            title={listening ? "Stop listening" : "Voice search"}
            onClick={toggleVoice}
          >
            🎙️
          </button>

          {/* History */}
          <div className="nb-dropdown-wrap">
            <button
              className="nb-icon-btn"
              title="Search History"
              onClick={() => { setShowHistory(!showHistory); setShowProfile(false); setShowHelpline(false); }}
            >
              🕐
            </button>
            {showHistory && (
              <div className="nb-dropdown nb-dropdown--history">
                <div className="nb-dropdown-header">Recent Searches</div>
                {history.length === 0 ? (
                  <div className="nb-dropdown-empty">No searches yet</div>
                ) : (
                  history.map((h, i) => (
                    <button key={i} className="nb-history-item" onClick={() => { setQuery(h.query); handleSearch(h.query); setShowHistory(false); }}>
                      <span className="nb-history-icon">📍</span>
                      <span className="nb-history-text">{h.query}</span>
                      <span className="nb-history-time">{new Date(h.ts).toLocaleDateString()}</span>
                    </button>
                  ))
                )}
                {history.length > 0 && (
                  <button className="nb-dropdown-clear" onClick={() => { localStorage.setItem("sz_history", "[]"); setShowHistory(false); }}>
                    Clear history
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Crime Helplines */}
          <div className="nb-dropdown-wrap">
            <button
              className="nb-icon-btn nb-icon-btn--helpline"
              title="Crime Helplines"
              onClick={() => { setShowHelpline(!showHelpline); setShowProfile(false); setShowHistory(false); }}
            >
              📞
            </button>
            {showHelpline && (
              <div className="nb-dropdown nb-dropdown--helpline">
                <div className="nb-dropdown-header">🚨 Emergency Helplines</div>
                {HELPLINES.map(region => (
                  <div key={region.country} className="nb-helpline-region">
                    <div className="nb-helpline-country">{region.country}</div>
                    {region.lines.map(l => (
                      <div key={l.name} className="nb-helpline-row">
                        <span className="nb-helpline-name">{l.name}</span>
                        <a href={`tel:${l.num.replace(/\s/g, "")}`} className="nb-helpline-num">{l.num}</a>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Emergency button */}
          <button className="nb-emergency-btn" onClick={triggerEmergency} title="Send Emergency Alert">
            <span>🚨</span> Emergency
          </button>

          {/* Profile */}
          {user ? (
            <div className="nb-dropdown-wrap">
              <button
                className="nb-avatar-btn"
                onClick={() => { setShowProfile(!showProfile); setShowHistory(false); setShowHelpline(false); }}
                title="Profile"
              >
                <span className="nb-avatar">{initials}</span>
              </button>
              {showProfile && (
                <div className="nb-dropdown nb-dropdown--profile">
                  <div className="nb-profile-head">
                    <div className="nb-profile-avatar">{initials}</div>
                    <div>
                      <div className="nb-profile-name">{user.name || "User"}</div>
                      <div className="nb-profile-email">{user.email}</div>
                      {user.phone && <div className="nb-profile-phone">📱 {user.phone}</div>}
                    </div>
                  </div>
                  <div className="nb-dropdown-divider" />
                  <Link to="/map" className="nb-profile-item" onClick={() => setShowProfile(false)}>🗺️ Safety Map</Link>
                  <Link to="/dashboard" className="nb-profile-item" onClick={() => setShowProfile(false)}>📊 Dashboard</Link>
                  <div className="nb-dropdown-divider" />
                  <button className="nb-profile-item nb-profile-item--danger" onClick={signout}>🚪 Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/signin" className="nb-signin-btn">Sign In</Link>
          )}
        </div>
      </nav>

      {/* ─────────── EMERGENCY MODAL ─────────── */}
      {showEmergency && (
        <div className="nb-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEmergency(false); }}>
          <div className="nb-modal">
            <div className="nb-modal-icon">🚨</div>
            <h3 className="nb-modal-title">Confirm Emergency Alert</h3>
            <p className="nb-modal-body">
              This will send an emergency alert with your current location to safety services.
            </p>
            {emergencyLoc && (
              <div className="nb-modal-loc">
                📍 {emergencyLoc.lat.toFixed(5)}, {emergencyLoc.lng.toFixed(5)}
              </div>
            )}
            <div className="nb-modal-quicklinks">
              <a href="tel:112" className="nb-modal-quick nb-modal-quick--red">Call 112</a>
              <a href="tel:100" className="nb-modal-quick nb-modal-quick--red">Call 100</a>
              <a href="tel:911" className="nb-modal-quick nb-modal-quick--red">Call 911</a>
            </div>
            <div className="nb-modal-actions">
              <button className="nb-modal-cancel" onClick={() => setShowEmergency(false)} disabled={sendingEmergency}>Cancel</button>
              <button className="nb-modal-confirm" onClick={confirmEmergency} disabled={sendingEmergency}>
                {sendingEmergency ? "Sending…" : "🚨 Send Alert"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
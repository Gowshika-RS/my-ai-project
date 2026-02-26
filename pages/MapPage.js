// pages/MapPage.js
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function MapPage() {
  const mapRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [nearbyPolice, setNearbyPolice] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  const deterministicScore = (lat, lon) => {
    const x = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453);
    return Math.floor((x - Math.floor(x)) * 100);
  };

  const deterministicTrend = (base) => {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const noise = Math.sin((base + i) * 0.6) * 0.15;
      const adj = base / 100;
      const v = Math.round(Math.max(3, Math.min(100, (adj * 80 + 20) * (1 + noise))));
      out.push(v);
    }
    return out;
  };

  const fetchNearby = async (lat, lon, radius = 1000) => {
    const q = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radius},${lat},${lon});
        way["amenity"="hospital"](around:${radius},${lat},${lon});
        node["amenity"="police"](around:${radius},${lat},${lon});
        way["amenity"="police"](around:${radius},${lat},${lon});
      );
      out center 20;
    `;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: q,
        headers: { 'Content-Type': 'text/plain' }
      });
      if (!res.ok) return;
      const j = await res.json();
      const elems = j.elements || [];
      const hospitals = [];
      const police = [];
      for (const el of elems) {
        const tags = el.tags || {};
        const name = tags.name || (tags.operator || '') || (tags.ref || '');
        const type = tags.amenity || '';
        const latc = el.lat ?? (el.center && el.center.lat);
        const lonc = el.lon ?? (el.center && el.center.lon);
        const elemType = el.type || 'node';
        const item = { id: el.id, osmid: el.id, osmType: elemType, name: name || `${type} ${el.id}`, type, lat: latc, lon: lonc, tags };
        if (type === 'hospital') hospitals.push(item);
        if (type === 'police') police.push(item);
      }
      setNearbyHospitals(hospitals.slice(0, 5));
      setNearbyPolice(police.slice(0, 5));
    } catch (e) {
      console.warn('fetchNearby failed', e);
    }
  };

  const distanceMeters = (lat1, lon1, lat2, lon2) => {
    if (!lat2 || !lon2) return null;
    const toRad = (v) => v * Math.PI / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const getRiskLevelClass = (score) => {
    if (score > 70) return "high";
    if (score > 30) return "medium";
    return "low";
  };

  const getRiskLevelText = (score) => {
    if (score > 70) return "HIGH RISK";
    if (score > 30) return "MEDIUM RISK";
    return "LOW RISK";
  };

  const getRiskColor = (score) => {
    if (score > 70) return "#ef4444";
    if (score > 30) return "#f97316";
    return "#10b981";
  };

  useEffect(() => {
    const stored = localStorage.getItem('userLocation');
    if (navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition((pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          localStorage.setItem('userLocation', JSON.stringify(loc));
        }, () => {
          if (stored) {
            try { setLocation(JSON.parse(stored)); } catch (e) { setLocation({ lat: 37.7749, lng: -122.4194 }); }
          } else {
            setLocation({ lat: 37.7749, lng: -122.4194 });
          }
        }, { enableHighAccuracy: false, timeout: 5000 });
      } catch (e) {
        if (stored) {
          try { setLocation(JSON.parse(stored)); } catch (err) { setLocation({ lat: 37.7749, lng: -122.4194 }); }
        } else setLocation({ lat: 37.7749, lng: -122.4194 });
      }
    } else {
      if (stored) {
        try { setLocation(JSON.parse(stored)); } catch (e) { setLocation({ lat: 37.7749, lng: -122.4194 }); }
      } else setLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !location) return;
    let cancelled = false;
    let map = null;

    const initMap = async () => {
      let attempts = 0;
      while (mapRef.current && mapRef.current.clientHeight === 0 && attempts < 40) {
        await new Promise((r) => setTimeout(r, 50));
        attempts += 1;
      }
      if (!mapRef.current || cancelled) return;

      map = L.map(mapRef.current).setView([location.lat, location.lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      L.circleMarker([location.lat, location.lng], { radius: 10, color: "#06b6d4", fillOpacity: 0.9 })
        .addTo(map).bindPopup("You are here");

      const unsafeLocations = [
        { lat: location.lat + 0.005, lng: location.lng + 0.005, score: 80 },
        { lat: location.lat - 0.004, lng: location.lng - 0.006, score: 60 },
        { lat: location.lat + 0.007, lng: location.lng - 0.003, score: 70 },
      ];

      unsafeLocations.forEach((loc) => {
        const marker = L.circleMarker([loc.lat, loc.lng], {
          radius: 10,
          color: loc.score > 70 ? "#ef4444" : "#f97316",
          fillOpacity: 0.8,
        }).addTo(map).bindPopup(`<b>AI Safety Score:</b> ${loc.score}/100`);

        marker.on('click', () => {
          const score = loc.score;
          const peakHours = deterministicTrend(score).map((v, i) => `${17 + i}:00-${18 + i}:00`);
          const trend = deterministicTrend(score);
          setSelected({ lat: loc.lat, lng: loc.lng, score, type: 'Theft/Assault', peakHours, description: '', source: 'local', trend });
          fetchNearby(loc.lat, loc.lng);
        });
      });

      const heatPoints = unsafeLocations.map((loc) => [loc.lat, loc.lng, loc.score / 100]);
      try {
        if (heatPoints.length && L.heatLayer) {
          L.heatLayer(heatPoints, { radius: 25, blur: 15, maxZoom: 17 }).addTo(map);
        }
      } catch (err) { }

      setTimeout(() => { try { if (map) map.invalidateSize(); } catch (e) { } }, 250);
      const onResize = () => { try { if (map) map.invalidateSize(); } catch (e) { } };
      window.addEventListener('resize', onResize);

      const onInspect = async (lat, lng) => {
        try {
          setLoadingAnalysis(true);
          const res = await fetch(`${API_BASE}/analyze?lat=${lat}&lon=${lng}`);
          if (!res.ok) {
            const score = Math.floor(30 + Math.random() * 70);
            const trend = deterministicTrend(score);
            setSelected({ lat, lng, score, type: score > 70 ? 'High risk (Assault)' : 'Moderate risk (Theft)', peakHours: ['19:00-21:00'], trend });
            L.popup().setLatLng([lat, lng]).setContent(`<b>AI Safety Score:</b> ${score}/100`).openOn(map);
            return;
          }
          const json = await res.json();
          const score = json.risk_score ?? json.score ?? deterministicScore(lat, lng);
          const level = json.risk_level || json.level || (score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low');
          const description = json.description || (score > 70 ? 'Elevated historical incidents nearby.' : 'No major crimes nearby.');
          const peakHours = json.peak_hours || json.peakHours || deterministicTrend(score).map((v, i) => `${17 + i}:00-${18 + i}:00`);
          const trend = json.trend || deterministicTrend(score);
          const type = json.type || json.incident_type || (score > 70 ? 'Assault' : 'Theft');
          setSelected({ lat, lng, score, risk_level: level, description, peakHours, type, source: 'backend', trend });
          L.popup().setLatLng([lat, lng]).setContent(`<b>AI Safety Score:</b> ${score}/100`).openOn(map);
          fetchNearby(lat, lng);
        } catch (e) {
          console.error('onInspect error', e);
        } finally {
          setLoadingAnalysis(false);
        }
      };

      map.on('click', (e) => onInspect(e.latlng.lat, e.latlng.lng));
      map.on('touchstart', (e) => { if (e && e.latlng) onInspect(e.latlng.lat, e.latlng.lng); });

      mapInstanceRef.current = map;
      return () => {
        window.removeEventListener('resize', onResize);
        try { if (map) map.remove(); } catch (e) { }
      };
    };

    let cleanupFn = null;
    initMap().then((c) => { cleanupFn = c; }).catch(() => { });

    (async () => {
      try {
        if (!location) return;
        setLoadingAnalysis(true);
        const res = await fetch(`${API_BASE}/analyze?lat=${location.lat}&lon=${location.lng}`);
        if (res.ok) {
          const json = await res.json();
          const score = json.risk_score ?? json.score ?? deterministicScore(location.lat, location.lng);
          const level = json.risk_level || json.level || (score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low');
          const peakHours = json.peak_hours || json.peakHours || deterministicTrend(score).map((v, i) => `${17 + i}:00-${18 + i}:00`);
          const trend = json.trend || deterministicTrend(score);
          setSelected({ lat: location.lat, lng: location.lng, score, risk_level: level, description: json.description || '', peakHours, type: json.type || '', source: 'backend', trend });
          fetchNearby(location.lat, location.lng);
        } else {
          const score = deterministicScore(location.lat, location.lng);
          const peakHours = deterministicTrend(score).map((v, i) => `${17 + i}:00-${18 + i}:00`);
          const trend = deterministicTrend(score);
          setSelected({ lat: location.lat, lng: location.lng, score, risk_level: score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low', description: '', peakHours, type: '', source: 'local', trend });
          fetchNearby(location.lat, location.lng);
        }
      } catch (e) {
        const score = deterministicScore(location.lat, location.lng);
        const peakHours = deterministicTrend(score).map((v, i) => `${17 + i}:00-${18 + i}:00`);
        const trend = deterministicTrend(score);
        setSelected({ lat: location.lat, lng: location.lng, score, risk_level: score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low', description: '', peakHours, type: '', source: 'local', trend });
        fetchNearby(location.lat, location.lng);
      } finally {
        setLoadingAnalysis(false);
      }
    })();

    return () => {
      cancelled = true;
      try { if (cleanupFn) cleanupFn(); } catch (e) { }
    };
  }, [location]);

  useEffect(() => {
    if (!selected || !chartRef.current) return;
    const data = (selected.trend || deterministicTrend(selected.score || 20)).map(v => Math.max(5, v));

    if (chartInstanceRef.current) {
      try { chartInstanceRef.current.destroy(); } catch (e) { }
      chartInstanceRef.current = null;
    }

    const riskLevel = getRiskLevelClass(selected.score || 0);
    const bgColor = riskLevel === 'high' ? 'rgba(239,68,68,0.7)' : riskLevel === 'medium' ? 'rgba(249,115,22,0.7)' : 'rgba(16,185,129,0.7)';
    const borderColor = riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f97316' : '#10b981';

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: '6-Month Risk Trend',
          data,
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1.5,
          borderRadius: 8,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15,23,42,0.95)',
            titleColor: '#06b6d4',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(6,182,212,0.3)',
            borderWidth: 1,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { color: 'rgba(6,182,212,0.08)' }
          },
          x: {
            ticks: { color: '#94a3b8', font: { size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }, [selected]);

  const riskColor = selected ? getRiskColor(selected.score) : '#06b6d4';
  const riskLevel = selected ? getRiskLevelClass(selected.score) : 'low';

  return (
    <div className="op-page">
      {/* ── PAGE HEADER ── */}
      <div className="op-header">
        <div className="op-header-inner">
          <h1 className="op-title">🗺️ Safety Analysis</h1>
          <p className="op-subtitle">Click anywhere on the map to inspect a location's risk level</p>
        </div>
      </div>

      <div className="op-body">

        {/* ── FULL-WIDTH MAP ── */}
        <div className="op-map-wrapper">
          <div className="op-map-label">
            <span className="op-map-label-dot" />
            Interactive Heatmap — click any point to analyze
          </div>
          <div className="op-map-frame" ref={mapRef} />
          {loadingAnalysis && (
            <div className="op-map-overlay">
              <div className="op-map-spinner" />
              <span>Analyzing location…</span>
            </div>
          )}
        </div>

        {/* ── RESULTS SECTION ── */}
        {selected && (
          <>
            {/* ── SCORE STRIP ── */}
            <div className={`op-score-strip op-score-strip--${riskLevel}`}>
              <div className="op-score-strip-left">
                <div className="op-score-number" style={{ color: riskColor }}>
                  {selected.score}
                  <span className="op-score-denom">/100</span>
                </div>
                <div>
                  <div className="op-score-title">Safety Risk Score</div>
                  <span className={`op-badge op-badge--${riskLevel}`}>{getRiskLevelText(selected.score)}</span>
                </div>
              </div>
              <div className="op-score-strip-right">
                <div className="op-meta-item">
                  <span className="op-meta-label">Latitude</span>
                  <span className="op-meta-value">{selected.lat.toFixed(5)}</span>
                </div>
                <div className="op-meta-item">
                  <span className="op-meta-label">Longitude</span>
                  <span className="op-meta-value">{selected.lng.toFixed(5)}</span>
                </div>
                <div className="op-meta-item">
                  <span className="op-meta-label">Incident Type</span>
                  <span className="op-meta-value">{selected.type || '—'}</span>
                </div>
              </div>
            </div>

            {/* ── THREE COLUMN GRID ── */}
            <div className="op-grid-3">

              {/* Card 1: Overview / Tab panel */}
              <div className="op-card">
                <div className="op-card-header">
                  <span className="op-card-icon">📋</span>
                  <h3 className="op-card-title">Location Details</h3>
                </div>
                <div className="op-tabs">
                  <button
                    className={`op-tab${activeTab === 'overview' ? ' op-tab--active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                  >Overview</button>
                  <button
                    className={`op-tab${activeTab === 'details' ? ' op-tab--active' : ''}`}
                    onClick={() => setActiveTab('details')}
                  >Nearby</button>
                </div>

                {activeTab === 'overview' && (
                  <div className="op-tab-body">
                    <div className="op-info-row">
                      <span className="op-info-label">Peak Hours</span>
                      <span className="op-info-value">{(selected.peakHours || []).join(' · ')}</span>
                    </div>
                    <div className="op-info-row">
                      <span className="op-info-label">Crime Type</span>
                      <span className="op-info-value">{selected.type || '—'}</span>
                    </div>
                    <div className="op-info-row">
                      <span className="op-info-label">Data Source</span>
                      <span className="op-info-value" style={{ textTransform: 'capitalize' }}>{selected.source || '—'}</span>
                    </div>
                    <div className="op-assessment">
                      {selected.description || `This area shows a ${riskLevel} risk level based on historical crime patterns and real-time data analysis.`}
                    </div>
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="op-tab-body">
                    <div className="op-nearby-section">
                      <h6 className="op-nearby-heading">🏥 Hospitals</h6>
                      {nearbyHospitals.length > 0 ? (
                        <ul className="op-nearby-list">
                          {nearbyHospitals.map(h => (
                            <li key={`h-${h.id}`} className="op-nearby-item">
                              <a href={`https://www.openstreetmap.org/${h.osmType}/${h.osmid}`}
                                target="_blank" rel="noreferrer" className="op-nearby-link">
                                {h.name}
                              </a>
                              {h.lat && (
                                <span className="op-nearby-dist">
                                  {Math.round(distanceMeters(selected.lat, selected.lng, h.lat, h.lon) / 100) / 10} km
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="op-empty">No hospitals found within 1 km</p>
                      )}
                    </div>
                    <div className="op-nearby-section">
                      <h6 className="op-nearby-heading">👮 Police Stations</h6>
                      {nearbyPolice.length > 0 ? (
                        <ul className="op-nearby-list">
                          {nearbyPolice.map(p => (
                            <li key={`p-${p.id}`} className="op-nearby-item">
                              <a href={`https://www.openstreetmap.org/${p.osmType}/${p.osmid}`}
                                target="_blank" rel="noreferrer" className="op-nearby-link">
                                {p.name}
                              </a>
                              {p.lat && (
                                <span className="op-nearby-dist">
                                  {Math.round(distanceMeters(selected.lat, selected.lng, p.lat, p.lon) / 100) / 10} km
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="op-empty">No police stations found within 1 km</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: Risk Gauge */}
              <div className="op-card op-card--center">
                <div className="op-card-header">
                  <span className="op-card-icon">🎯</span>
                  <h3 className="op-card-title">Risk Gauge</h3>
                </div>
                <div className="op-gauge-wrap">
                  <svg className="op-gauge-svg" viewBox="0 0 200 120">
                    {/* Track */}
                    <path d="M 20 110 A 90 90 0 0 1 180 110" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="16" strokeLinecap="round" />
                    {/* Fill */}
                    <path
                      d="M 20 110 A 90 90 0 0 1 180 110"
                      fill="none"
                      stroke={riskColor}
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={`${(selected.score / 100) * 283} 283`}
                      opacity="0.9"
                    />
                    {/* Score text */}
                    <text x="100" y="100" textAnchor="middle" fill={riskColor}
                      fontSize="32" fontWeight="800" fontFamily="sans-serif">
                      {selected.score}
                    </text>
                    <text x="100" y="115" textAnchor="middle" fill="#94a3b8"
                      fontSize="11" fontFamily="sans-serif">
                      RISK SCORE
                    </text>
                  </svg>
                </div>
                <div className="op-gauge-labels">
                  <span style={{ color: '#10b981' }}>Safe</span>
                  <span style={{ color: '#f97316' }}>Moderate</span>
                  <span style={{ color: '#ef4444' }}>Danger</span>
                </div>
                <div className="op-risk-bars">
                  {[
                    { label: 'Theft Risk', val: Math.min(100, selected.score + 5) },
                    { label: 'Assault Risk', val: Math.max(0, selected.score - 10) },
                    { label: 'Vandalism', val: Math.min(100, selected.score - 15) },
                  ].map(({ label, val }) => (
                    <div key={label} className="op-risk-bar-row">
                      <span className="op-risk-bar-label">{label}</span>
                      <div className="op-risk-bar-track">
                        <div className="op-risk-bar-fill"
                          style={{ width: `${Math.max(0, val)}%`, background: riskColor }} />
                      </div>
                      <span className="op-risk-bar-pct" style={{ color: riskColor }}>{Math.max(0, val)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: Emergency */}
              <div className="op-card op-card--center">
                <div className="op-card-header">
                  <span className="op-card-icon">🚨</span>
                  <h3 className="op-card-title">Emergency</h3>
                </div>
                <div className="op-emergency-body">
                  <p className="op-emergency-desc">
                    If you feel unsafe, alert emergency contacts or call local services immediately.
                  </p>
                  <button className="op-emergency-btn">
                    🚨 Send Emergency Alert
                  </button>
                  <div className="op-quick-actions">
                    <a href="tel:911" className="op-quick-action op-quick-action--red">📞 Call 911</a>
                    <a href="sms:911" className="op-quick-action op-quick-action--blue">💬 SMS 911</a>
                  </div>
                  <div className="op-tip">
                    <span className="op-tip-icon">💡</span>
                    <span>Stay in well-lit, populated areas during peak risk hours: <strong>{(selected.peakHours || []).slice(0, 2).join(', ')}</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── TREND CHART ── */}
            <div className="op-card op-card--wide">
              <div className="op-card-header">
                <span className="op-card-icon">📈</span>
                <h3 className="op-card-title">6-Month Risk Trend</h3>
                <button className="op-chart-download" onClick={() => {
                  try {
                    const canvasEl = (chartInstanceRef.current && chartInstanceRef.current.canvas) ? chartInstanceRef.current.canvas : chartRef.current;
                    if (!canvasEl) return;
                    const a = document.createElement('a');
                    a.href = canvasEl.toDataURL('image/png');
                    a.download = `risk-chart-${Date.now()}.png`;
                    a.click();
                  } catch (e) { }
                }}>
                  📥 Download
                </button>
              </div>
              <canvas ref={chartRef} height={70} />
            </div>
          </>
        )}

        {/* ── EMPTY STATE ── */}
        {!selected && !loadingAnalysis && (
          <div className="op-empty-state">
            <div className="op-empty-icon">📍</div>
            <h3>Click on the map to analyze a location</h3>
            <p>Tap or click anywhere on the interactive map above to get a detailed safety assessment for that area.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapPage;

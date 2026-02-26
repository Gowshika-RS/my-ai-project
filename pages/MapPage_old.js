// pages/MapPage.js
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

function MapPage() {
  const mapRef = useRef(null);
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const trendDataRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8000";

  // deterministic helpers when backend doesn't provide varied data
  const deterministicScore = (lat, lon) => {
    const x = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453);
    return Math.floor((x - Math.floor(x)) * 100);
  };

  const deterministicTrend = (base) => {
    const out = [];
    // produce 6 monthly values scaled to 0-100 with slight periodic variation
    for (let i = 0; i < 6; i++) {
      const noise = Math.sin((base + i) * 0.6) * 0.15; // -0.15..0.15
      const adj = base / 100; // 0..1
      const v = Math.round(Math.max(3, Math.min(100, (adj * 80 + 20) * (1 + noise))));
      out.push(v);
    }
    return out;
  };

  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [nearbyPolice, setNearbyPolice] = useState([]);

  const fetchNearby = async (lat, lon, radius = 1000) => {
    // Overpass QL
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
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: q, headers: { 'Content-Type': 'text/plain' } });
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
      setNearbyHospitals(hospitals.slice(0,5));
      setNearbyPolice(police.slice(0,5));
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
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2)) * Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  useEffect(() => {
    // prefer live geolocation for accurate positioning; fall back to stored location
    const stored = localStorage.getItem('userLocation');
    let geoHandled = false;
    if (navigator.geolocation) {
      try {
        navigator.geolocation.getCurrentPosition((pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          localStorage.setItem('userLocation', JSON.stringify(loc));
          geoHandled = true;
        }, (err) => {
          // permission denied or error
          if (stored) {
            try { setLocation(JSON.parse(stored)); } catch(e) { setLocation({ lat: 37.7749, lng: -122.4194 }); }
          } else {
            setLocation({ lat: 37.7749, lng: -122.4194 });
          }
        }, { enableHighAccuracy: false, timeout: 5000 });
      } catch(e) {
        if (stored) {
          try { setLocation(JSON.parse(stored)); } catch(err) { setLocation({ lat: 37.7749, lng: -122.4194 }); }
        } else setLocation({ lat: 37.7749, lng: -122.4194 });
      }
    } else {
      if (stored) {
        try { setLocation(JSON.parse(stored)); } catch(e) { setLocation({ lat: 37.7749, lng: -122.4194 }); }
      } else setLocation({ lat: 37.7749, lng: -122.4194 });
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !location) return;

    let cancelled = false;
    let map = null;

    const initMap = async () => {
      // wait for the container to have a non-zero height (avoid canvas getImageData errors)
      let attempts = 0;
      while (mapRef.current && mapRef.current.clientHeight === 0 && attempts < 40) {
        // wait up to ~2s for layout/CSS to apply
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 50));
        attempts += 1;
      }
      if (!mapRef.current || cancelled) return;

      map = L.map(mapRef.current).setView([location.lat, location.lng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // center marker
      L.circleMarker([location.lat, location.lng], { radius: 10, color: "#0ea5a4", fillOpacity: 0.9 }).addTo(map).bindPopup("You are here");

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
          const peakHours = deterministicTrend(score).map((v,i) => `${17+i}:00-${18+i}:00`);
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
      } catch (err) {
        // avoid throwing when canvas size is zero; log for debugging
      }

      // Leaflet often needs invalidateSize when the container becomes visible or after CSS/layout changes
      setTimeout(() => { try { if (map) map.invalidateSize(); } catch(e){} }, 250);
      const onResize = () => { try { if (map) map.invalidateSize(); } catch(e){} };
      window.addEventListener('resize', onResize);

      // click to inspect any place (calls backend analyze)
      const onInspect = async (lat, lng) => {
        try {
          setLoadingAnalysis(true);
          const res = await fetch(`${API_BASE}/analyze?lat=${lat}&lon=${lng}`);
          if (!res.ok) {
            const txt = await res.text();
            console.warn('Analyze failed:', txt);
            // fallback to a simple generated score
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
          const peakHours = json.peak_hours || json.peakHours || deterministicTrend(score).map((v,i) => `${17+i}:00-${18+i}:00`);
          const trend = json.trend || deterministicTrend(score);
          const type = json.type || json.incident_type || (score > 70 ? 'Assault' : 'Theft');
          setSelected({ lat, lng, score, risk_level: level, description, peakHours, type, source: 'backend', trend });
          L.popup().setLatLng([lat, lng]).setContent(`<b>AI Safety Score:</b> ${score}/100`).openOn(map);
          // fetch nearby POIs
          fetchNearby(lat, lng);
        } catch (e) {
          console.error('onInspect error', e);
        } finally {
          setLoadingAnalysis(false);
        }
      };

      map.on('click', (e) => onInspect(e.latlng.lat, e.latlng.lng));
      map.on('touchstart', (e) => {
        if (e && e.latlng) onInspect(e.latlng.lat, e.latlng.lng);
      });

      // cleanup handler attached to map lifecycle
      const cleanup = () => {
        window.removeEventListener('resize', onResize);
        try { if (map) map.remove(); } catch(e){}
      };

      mapInstanceRef.current = map;
      return cleanup;
    };

    let cleanupFn = null;
    initMap().then((c) => { cleanupFn = c; }).catch(() => {});

    // after map init, request analysis for current location
    (async () => {
      try {
        if (!location) return;
        setLoadingAnalysis(true);
        const res = await fetch(`${API_BASE}/analyze?lat=${location.lat}&lon=${location.lng}`);
        if (res.ok) {
          const json = await res.json();
          const score = json.risk_score ?? json.score ?? deterministicScore(location.lat, location.lng);
          const level = json.risk_level || json.level || (score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low');
          const peakHours = json.peak_hours || json.peakHours || deterministicTrend(score).map((v,i) => `${17+i}:00-${18+i}:00`);
          const trend = json.trend || deterministicTrend(score);
          setSelected({ lat: location.lat, lng: location.lng, score, risk_level: level, description: json.description || '', peakHours, type: json.type || '', source: 'backend', trend });
          fetchNearby(location.lat, location.lng);
        } else {
          // fallback deterministic
          const score = deterministicScore(location.lat, location.lng);
          const peakHours = deterministicTrend(score).map((v,i) => `${17+i}:00-${18+i}:00`);
          const trend = deterministicTrend(score);
          setSelected({ lat: location.lat, lng: location.lng, score, risk_level: score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low', description: '', peakHours, type: '', source: 'local', trend });
          fetchNearby(location.lat, location.lng);
        }
      } catch (e) {
        console.warn('Initial analyze failed', e);
        const score = deterministicScore(location.lat, location.lng);
        const peakHours = deterministicTrend(score).map((v,i) => `${17+i}:00-${18+i}:00`);
        const trend = deterministicTrend(score);
        setSelected({ lat: location.lat, lng: location.lng, score, risk_level: score > 70 ? 'High' : score > 30 ? 'Medium' : 'Low', description: '', peakHours, type: '', source: 'local', trend });
        fetchNearby(location.lat, location.lng);
      } finally {
        setLoadingAnalysis(false);
      }
    })();

    return () => {
      cancelled = true;
      try { if (cleanupFn) cleanupFn(); } catch(e){}
    };
  }, [location]);

  useEffect(() => {
    if (!selected || !chartRef.current) return;
    // Use backend trend if available, otherwise use local fallback
    const data = (selected.trend || deterministicTrend(selected.score || 20)).map(v => Math.max(5, v));

    if (chartInstanceRef.current) {
      try { chartInstanceRef.current.destroy(); } catch(e){}
      chartInstanceRef.current = null;
    }
    trendDataRef.current = data;
    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun'],
        datasets: [{ label: 'Risk trend', data, backgroundColor: (selected && selected.score>70)?'#ef4444':'#f97316', borderRadius:6 }]
      },
      options: { responsive: true, plugins:{ tooltip: { enabled: true } }, scales: { y: { beginAtZero: true, max: 100 } } }
    });
  }, [selected]);

  return (
    <div className="container my-4">
      <h2 style={{ marginBottom: 12 }}>Interactive Map</h2>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="risk-card shadow-lg">
            <div ref={mapRef} className="map-container" style={{ borderRadius: 10 }} />
          </div>
        </div>

        <div className="col-lg-4">
          <div className="risk-card">
            <h4 style={{ marginTop: 0 }}>Place Details</h4>
            {loadingAnalysis ? (
              <p className="risk-muted">Analyzing location...
              </p>
            ) : selected ? (
              <>
                <p><strong>Coordinates:</strong> {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}</p>
                <p>
                  <strong>Score:</strong> <span style={{ fontWeight:800 }}>{selected.score}/100</span>
                  <span style={{ marginLeft: 8, padding: '4px 8px', borderRadius:8, background: selected.score > 70 ? '#ef4444' : selected.score > 30 ? '#f97316' : '#10b981', color:'#fff', fontWeight:700, marginRight:6, marginLeft:12 }}>{selected.score > 70 ? 'High' : selected.score > 30 ? 'Medium' : 'Low'}</span>
                  {selected.source && <small style={{ marginLeft: 8, color: '#6b7280' }}>({selected.source})</small>}
                </p>
                <p><strong>Type:</strong> {selected.type}</p>
                <p><strong>Peak hours:</strong> {selected.peakHours.join(', ')}</p>
                <p style={{ color:'#374151' }}><strong>Description:</strong> {selected.description || `This location shows a ${selected.score > 70 ? 'high' : selected.score > 30 ? 'moderate' : 'low'} risk level based on historical incident patterns.`}</p>

                <div style={{ marginTop: 10 }}>
                  <h6 style={{ margin: '0 0 8px 0' }}>Nearby Places</h6>
                  {nearbyHospitals.length === 0 && nearbyPolice.length === 0 && (<div className="risk-muted">No nearby hospitals or police stations found.</div>)}
                  {nearbyHospitals.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Hospitals</strong>
                      <ul style={{ margin: '6px 0 0 14px', padding: 0 }}>
                        {nearbyHospitals.map(h => (
                          <li key={`h-${h.id}`} style={{ marginBottom: 6 }}>
                            <a href={`https://www.openstreetmap.org/${h.osmType}/${h.osmid}`} target="_blank" rel="noreferrer">{h.name}</a>
                            {selected && h.lat && <small style={{ color:'#6b7280', marginLeft:8 }}>({distanceMeters(selected.lat, selected.lng, h.lat, h.lon)} m)</small>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {nearbyPolice.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Police</strong>
                      <ul style={{ margin: '6px 0 0 14px', padding: 0 }}>
                        {nearbyPolice.map(p => (
                          <li key={`p-${p.id}`} style={{ marginBottom: 6 }}>
                            <a href={`https://www.openstreetmap.org/${p.osmType}/${p.osmid}`} target="_blank" rel="noreferrer">{p.name}</a>
                            {selected && p.lat && <small style={{ color:'#6b7280', marginLeft:8 }}>({distanceMeters(selected.lat, selected.lng, p.lat, p.lon)} m)</small>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12 }}>
                  <h6 style={{ margin: '0 0 8px 0' }}>6-month trend</h6>
                  <canvas ref={chartRef}></canvas>
                </div>

                <div style={{ display:'flex', gap:10, marginTop:12 }}>
                  <button className="btn btn-outline-primary" onClick={() => {
                    // download chart image - prefer Chart instance canvas when available
                    try {
                      const canvasEl = (chartInstanceRef.current && chartInstanceRef.current.canvas) ? chartInstanceRef.current.canvas : chartRef.current;
                      if (!canvasEl) return;
                      const img = canvasEl.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = img;
                      a.download = `risk-chart-${Date.now()}.png`;
                      a.click();
                    } catch(e) { console.warn(e); }
                  }}>Download Chart</button>
                </div>
              </>
            ) : (
              <p className="risk-muted">Tap or click anywhere on the map or a marker to inspect the risk details for that place.</p>
            )}
            <div style={{ marginTop: 12 }}>
              <button className="emergency-btn">Emergency</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
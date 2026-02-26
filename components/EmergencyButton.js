import React from "react";
import axios from "axios";

function EmergencyButton({ lat, lon, risk }) {

  const sendAlert = async () => {
    if (!lat || !lon) {
      alert("Location not available");
      return;
    }

    await axios.post("http://127.0.0.1:8000/emergency", {
      latitude: lat,
      longitude: lon,
      risk_score: risk?.risk_score || 0
    });

    alert("🚨 Emergency Alert Sent!");
  };

  return (
    <button className="emergency-btn" onClick={sendAlert}>
      🚨 Emergency Alert
    </button>
  );
}

export default EmergencyButton;
import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import axios from "axios";
import L from "leaflet";

// ---------------------
// Marker Icons
// ---------------------
const createIcon = (colorClass) =>
  new L.Icon({
    iconUrl: require("leaflet/dist/images/marker-icon.png"),
    shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    className: colorClass,
  });

const redIcon = createIcon("red-marker");
const orangeIcon = createIcon("orange-marker");
const greenIcon = createIcon("green-marker");

// ---------------------
// Location Marker Hook
// ---------------------
const LocationMarker = ({ setPosition, setRiskData }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      setPosition({ lat, lng });

      const hour = new Date().getHours();

      try {
        const response = await axios.post("http://localhost:8000/predict", {
          latitude: lat,
          longitude: lng,
          hour: hour,
        });

        setRiskData(response.data);
      } catch (error) {
        console.error("Prediction error:", error);
      }
    },
  });

  return null;
};

// ---------------------
// Main Map Component
// ---------------------
const MapComponent = () => {
  const [position, setPosition] = useState(null);
  const [riskData, setRiskData] = useState(null);

  const getMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    } else {
      alert("Geolocation not supported");
    }
  };

  const getMarkerIcon = () => {
    if (!riskData) return greenIcon;
    switch (riskData.risk_level) {
      case "High":
        return redIcon;
      case "Medium":
        return orangeIcon;
      default:
        return greenIcon;
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>AI Unsafe Area Prediction System</h2>

      <button
        onClick={getMyLocation}
        style={{
          marginBottom: "10px",
          padding: "8px 12px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "5px",
        }}
      >
        📍 Use My Location
      </button>

      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <LocationMarker setPosition={setPosition} setRiskData={setRiskData} />

        {position && (
          <Marker position={[position.lat, position.lng]} icon={getMarkerIcon()}>
            <Popup>
              <b>Selected Location</b>
              <br />
              Latitude: {position.lat.toFixed(4)}
              <br />
              Longitude: {position.lng.toFixed(4)}
              {riskData && (
                <>
                  <br />
                  <br />
                  <b>Risk:</b> {riskData.risk_level}
                </>
              )}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {riskData && (
        <div style={{ marginTop: "20px" }}>
          <h3>Risk Level: {riskData.risk_level}</h3>
          <p>Risk Score: {riskData.risk_score}</p>
          <p>Safety Score: {riskData.safety_score}</p>
        </div>
      )}

      <button
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "red",
          color: "white",
          fontWeight: "bold",
          border: "none",
          borderRadius: "5px",
        }}
        onClick={() => alert("🚨 SOS Alert Sent!")}
      >
        🚨 SOS
      </button>
    </div>
  );
};

export default MapComponent;

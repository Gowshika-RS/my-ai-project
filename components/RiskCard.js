// import React from "react";

// function RiskCard({ risk }) {

//   const getColor = () => {
//     if (risk.risk_score < 30) return "green";
//     if (risk.risk_score < 70) return "orange";
//     return "red";
//   };

//   return (
//     <div className="risk-card" style={{borderLeft:`8px solid ${getColor()}`}}>
//       <h2>Risk Score: {risk.risk_score}/100</h2>
//       <h3>{risk.risk_level}</h3>
//       <p>{risk.description}</p>
//     </div>
//   );
// }

// export default RiskCard;
import React from "react";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { FaExclamationTriangle, FaShieldAlt } from "react-icons/fa";

export default function RiskCard({ risk }) {
  if (!risk) return null;

  const variant =
    risk.risk_level === "Low" ? "success" :
    risk.risk_level === "Medium" ? "warning" : "danger";

  return (
    <Card className="h-100">
      <Card.Body>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Card.Title style={{ marginBottom: 6 }}>Risk Score <small className="text-muted">/100</small></Card.Title>
            <h2 style={{ margin: 0, fontWeight: 800 }}>{risk.risk_score}</h2>
          </div>

          <div style={{ textAlign: "right" }}>
            <Badge bg={variant} style={{ fontSize: 14, padding: "8px 10px" }}>
              {risk.risk_level}
            </Badge>
            <div style={{ marginTop: 8, color: "#6b7280", display: "flex", alignItems: "center", gap: 8 }}>
              <FaShieldAlt />
              <small>{risk.source || "Calculated"}</small>
            </div>
          </div>
        </div>

        {risk.description && (
          <Card.Text className="mt-3" style={{ color: "#374151" }}>
            {risk.description}
          </Card.Text>
        )}
      </Card.Body>
    </Card>
  );
}
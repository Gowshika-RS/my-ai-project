import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("authToken");
  if (!token) return <Navigate to="/signin" replace />;
  return children;
}

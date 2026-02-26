import React from "react";
import { HomeIcon, ChartBarIcon, MapPinIcon } from "@heroicons/react/24/outline";

function Sidebar() {
  return (
    <aside style={{ width: 80 }} className="bg-white border-end shadow-sm d-flex flex-column align-items-center py-3">
      <div className="mb-3 p-2 rounded" style={{ background: "linear-gradient(90deg,#1e3c72,#2a5298)", color: "white" }}>
        <strong>SZ</strong>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <HomeIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-primary" />
        <ChartBarIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-primary" />
        <MapPinIcon className="h-6 w-6 text-gray-600 cursor-pointer hover:text-primary" />
      </div>
    </aside>
  );
}

export default Sidebar;
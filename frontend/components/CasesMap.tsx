"use client";

import React from "react";
import dynamic from "next/dynamic";

// Dynamically import the entire map component to avoid SSR issues
const MapComponent = dynamic<CasesMapProps>(() => import("./CasesMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-900 mb-2"></div>
        <p className="text-foreground-subtle">Loading map...</p>
      </div>
    </div>
  ),
});

interface Case {
  _id: string;
  incidentTitle: string;
  description?: string;
  locationDescription?: string;
  normalizedLocation?: string;
  locationCoordinates?: {
    lat: number;
    lng: number;
  };
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Active" | "Inactive" | "Resolved";
}

interface CasesMapProps {
  cases: Case[];
  onMarkerClick?: (caseId: string) => void;
}

export default function CasesMap({ cases, onMarkerClick }: CasesMapProps) {
  const validCases = cases.filter(
    (c) => c.locationCoordinates?.lat && c.locationCoordinates?.lng
  );

  if (validCases.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-foreground-subtle">
          <svg
            className="mx-auto h-12 w-12 mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p>No cases with location data to display</p>
        </div>
      </div>
    );
  }

  return <MapComponent cases={validCases} onMarkerClick={onMarkerClick} />;
}

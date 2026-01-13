"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useRouter } from "next/navigation";

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

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

interface CasesMapClientProps {
  cases: Case[];
  onMarkerClick?: (caseId: string) => void;
}

// Component to fit map bounds to markers
function MapBounds({ cases }: { cases: Case[] }) {
  const map = useMap();

  useEffect(() => {
    if (cases.length === 0 || typeof window === "undefined") return;

    const validCases = cases.filter(
      (c) => c.locationCoordinates?.lat && c.locationCoordinates?.lng
    );

    if (validCases.length === 0) return;

    const bounds = L.latLngBounds(
      validCases.map((c) => [
        c.locationCoordinates!.lat,
        c.locationCoordinates!.lng,
      ])
    );

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [cases, map]);

  return null;
}

// Custom marker icons based on severity
const getMarkerIcon = (severity: Case["severity"]) => {
  const colors = {
    Critical: "#dc2626", // red
    High: "#ea580c", // orange
    Medium: "#eab308", // yellow
    Low: "#16a34a", // green
  };

  const color = colors[severity] || "#6b7280";

  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 20px;
      height: 20px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
};

export default function CasesMapClient({
  cases,
  onMarkerClick,
}: CasesMapClientProps) {
  const router = useRouter();

  // Group cases by location
  const casesByLocation = useMemo(() => {
    const grouped: Record<string, Case[]> = {};

    cases.forEach((caseItem) => {
      if (
        !caseItem.locationCoordinates?.lat ||
        !caseItem.locationCoordinates?.lng
      ) {
        return;
      }

      const key = `${caseItem.locationCoordinates.lat.toFixed(
        4
      )},${caseItem.locationCoordinates.lng.toFixed(4)}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(caseItem);
    });

    return grouped;
  }, [cases]);

  return (
    <div className="w-full h-96 rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[39.8283, -98.5795]} // Center of USA
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds cases={cases} />

        {Object.entries(casesByLocation).map(([key, locationCases]) => {
          const firstCase = locationCases[0];
          const coords = firstCase.locationCoordinates!;

          return (
            <Marker
              key={key}
              position={[coords.lat, coords.lng]}
              icon={getMarkerIcon(firstCase.severity)}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h3 className="font-semibold text-sm mb-2">
                    {locationCases.length === 1
                      ? firstCase.incidentTitle
                      : `${locationCases.length} Cases`}
                  </h3>
                  {firstCase.normalizedLocation && (
                    <p className="text-xs text-gray-600 mb-2">
                      📍 {firstCase.normalizedLocation}
                    </p>
                  )}
                  <div className="space-y-1">
                    {locationCases.slice(0, 3).map((caseItem) => (
                      <div
                        key={caseItem._id}
                        className="cursor-pointer hover:bg-gray-100 p-1 rounded text-xs"
                        onClick={() => {
                          if (onMarkerClick) {
                            onMarkerClick(caseItem._id);
                          } else {
                            router.push(`/cases/${caseItem._id}`);
                          }
                        }}
                      >
                        <p className="font-medium">{caseItem.incidentTitle}</p>
                        <p className="text-gray-600">
                          {caseItem.severity} • {caseItem.status}
                        </p>
                      </div>
                    ))}
                    {locationCases.length > 3 && (
                      <p className="text-xs text-gray-500 italic">
                        +{locationCases.length - 3} more cases
                      </p>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

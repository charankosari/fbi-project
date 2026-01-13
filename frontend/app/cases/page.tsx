"use client";

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import CasesMap from "@/components/CasesMap";
import { API_URL } from "@/lib/config";

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
  dateReported?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Active" | "Inactive" | "Resolved";
  images?: Array<{ filename: string; path: string }>;
  aiAnalysis?: {
    summary: string;
    insights: string[];
    analyzedAt: string;
  };
}

const CaseCard = memo(
  ({ caseItem, onClick }: { caseItem: Case; onClick: () => void }) => {
    const severityColors = useMemo(
      () => ({
        Critical: "bg-red-50 text-red-600 border border-red-100",
        High: "bg-orange-50 text-orange-600 border border-orange-100",
        Medium: "bg-yellow-50 text-yellow-600 border border-yellow-100",
        Low: "bg-green-50 text-green-600 border border-green-100",
      }),
      []
    );

    const statusColors = useMemo(
      () => ({
        Active: "bg-green-50 text-green-600 border border-green-100",
        Resolved: "bg-gray-50 text-gray-600 border border-gray-100",
        Inactive: "bg-gray-50 text-gray-500 border border-gray-100",
      }),
      []
    );

    return (
      <div
        onClick={onClick}
        className="card-premium p-6 cursor-pointer hover-lift"
      >
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {caseItem.incidentTitle}
        </h2>
        <p className="text-foreground-subtle text-sm mb-4 line-clamp-2">
          {caseItem.description || "No description"}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              severityColors[caseItem.severity]
            }`}
          >
            {caseItem.severity}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusColors[caseItem.status]
            }`}
          >
            {caseItem.status}
          </span>
        </div>
        {caseItem.images && caseItem.images.length > 0 && (
          <p className="text-foreground-subtle text-xs flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {caseItem.images.length} image(s)
          </p>
        )}
      </div>
    );
  }
);

CaseCard.displayName = "CaseCard";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const fetchCases = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/cases`,
        {
          cache: "no-store",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCases(data);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const handleCaseClick = useCallback(
    (caseId: string) => {
      router.push(`/cases/${caseId}`);
    },
    [router]
  );

  const handleNewCase = useCallback(() => {
    router.push("/cases/new");
  }, [router]);

  const filteredCases =
    activeTab === "All" ? cases : cases.filter((c) => c.status === activeTab);

  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Minimal White */}
      <aside
        className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-border
        flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        shadow-lg lg:shadow-none
      `}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <img
              src="/FBI-Symbol.png"
              alt="FBI Symbol"
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">FBI Project</h1>
              <p className="text-xs text-foreground-subtle">Case Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              router.push("/");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-gray-50 text-foreground-muted hover:text-foreground transition-all text-left"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => {
              router.push("/cases");
              setSidebarOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-gray-50 text-foreground font-medium transition-all text-left"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Cases</span>
          </button>
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
              <span className="text-white text-sm font-semibold">FB</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                FBI Agent
              </p>
              <p className="text-xs text-foreground-subtle truncate">
                agent@fbi.gov
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        <header className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-50 text-foreground-muted"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Cases
            </h1>
          </div>
          <Button
            onClick={handleNewCase}
            className="bg-foreground hover:bg-foreground/90 text-white shadow-sm hover:shadow-md"
          >
            + New Case
          </Button>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {/* View Mode Toggle and Filter Tabs */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {["All", "Active", "Resolved"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-50 text-foreground-muted hover:bg-gray-100 border border-border"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "list"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-50 text-foreground-muted hover:bg-gray-100 border border-border"
                }`}
              >
                <svg
                  className="w-5 h-5 inline mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                List
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewMode === "map"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-gray-50 text-foreground-muted hover:bg-gray-100 border border-border"
                }`}
              >
                <svg
                  className="w-5 h-5 inline mr-1"
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
                Map
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-900"></div>
              <p className="mt-4 text-foreground-subtle">Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <p className="text-foreground-subtle text-lg mb-4">
                No cases found
              </p>
              <Button
                onClick={handleNewCase}
                className="bg-foreground hover:bg-foreground/90 text-white"
              >
                Create Your First Case
              </Button>
            </div>
          ) : viewMode === "map" ? (
            <div className="card-premium p-6">
              <CasesMap cases={filteredCases} onMarkerClick={handleCaseClick} />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCases.map((caseItem) => (
                <CaseCard
                  key={caseItem._id}
                  caseItem={caseItem}
                  onClick={() => handleCaseClick(caseItem._id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  images?: Array<{ filename: string; originalName: string }>;
  aiAnalysis?: {
    summary: string;
    insights: string[];
    analyzedAt: string;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const activeCases = cases.filter((c) => c.status === "Active").length;
  const resolvedCases = cases.filter((c) => c.status === "Resolved").length;
  const criticalCases = cases.filter((c) => c.severity === "Critical").length;
  const totalImages = cases.reduce(
    (sum, c) => sum + (c.images?.length || 0),
    0
  );

  // Filter cases based on active tab and search query
  const filteredCases = useMemo(() => {
    let filtered =
      activeTab === "All" ? cases : cases.filter((c) => c.status === activeTab);

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.incidentTitle?.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.locationDescription?.toLowerCase().includes(query) ||
          c.severity?.toLowerCase().includes(query) ||
          c.status?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [cases, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Minimal White Theme */}
      <aside
        className={`
        fixed left-0 top-0 h-full w-64 bg-white border-r border-border
        flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        shadow-lg lg:shadow-none
      `}
      >
        {/* Logo */}
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

        {/* Navigation - Minimal */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => {
              router.push("/");
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Cases</span>
          </button>
        </nav>

        {/* User Profile - Minimal */}
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
        {/* Header - Minimal Premium */}
        <header className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
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
            {/* Centered Search */}
            <div className="flex-1 max-w-2xl mx-auto">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-foreground-subtle"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search or type a command"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-foreground-subtle hover:text-foreground transition-colors"
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-foreground-subtle bg-white px-2 py-1 rounded border border-border">
                  <kbd className="font-mono">⌘</kbd>
                  <kbd className="font-mono">F</kbd>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <Button
              onClick={() => router.push("/cases/new")}
              className="hidden sm:flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-white shadow-sm hover:shadow-md px-4 py-2 font-semibold transition-all"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="hidden md:inline">New Case</span>
            </Button>
            <button className="relative w-10 h-10 rounded-full bg-gray-50 border border-border flex items-center justify-center hover:bg-gray-100 transition-all group">
              <svg
                className="w-5 h-5 text-foreground-muted group-hover:text-foreground transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            {/* Profile Icon - Simple, no dropdown */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-semibold">FB</span>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {/* Greeting */}
          <div className="mb-6">
            <p className="text-sm text-foreground-subtle mb-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h2 className="text-2xl font-semibold text-foreground">
              Good{" "}
              {new Date().getHours() < 12
                ? "Morning"
                : new Date().getHours() < 18
                ? "Afternoon"
                : "Evening"}
              ! Agent
            </h2>
          </div>

          {/* Stats Cards - Minimal Premium */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="card-premium p-6">
              <p className="text-sm text-foreground-muted mb-2 font-medium">
                Active Cases
              </p>
              <p className="text-4xl font-bold text-foreground">
                {activeCases}
              </p>
            </div>
            <div className="card-premium p-6">
              <p className="text-sm text-foreground-muted mb-2 font-medium">
                Resolved Cases
              </p>
              <p className="text-4xl font-bold text-foreground">
                {resolvedCases}
              </p>
            </div>
            <div className="card-premium p-6">
              <p className="text-sm text-foreground-muted mb-2 font-medium">
                Critical Cases
              </p>
              <p className="text-4xl font-bold text-foreground">
                {criticalCases}
              </p>
            </div>
          </div>

          {/* Map View - Cases Locations */}
          {filteredCases.length > 0 && (
            <div className="card-premium p-4 sm:p-6 mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Case Locations Map
                </h2>
                <p className="text-sm text-foreground-subtle">
                  {
                    filteredCases.filter(
                      (c) =>
                        c.locationCoordinates?.lat && c.locationCoordinates?.lng
                    ).length
                  }{" "}
                  cases with location data
                </p>
              </div>
              <CasesMap
                cases={filteredCases}
                onMarkerClick={(caseId) => router.push(`/cases/view?id=${caseId}`)}
              />
            </div>
          )}

          {/* Cases Section - Premium Table */}
          <div className="card-premium overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-foreground">
                My Cases
              </h2>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {["All", "Active", "Resolved"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === tab
                        ? "bg-foreground text-white shadow-sm"
                        : "bg-gray-50 text-foreground-muted hover:bg-gray-100 border border-transparent hover:border-border"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-foreground-subtle">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-900"></div>
                <p className="mt-4">Loading cases...</p>
              </div>
            ) : filteredCases.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-foreground-subtle mb-4">No cases found</p>
                <Button
                  onClick={() => router.push("/cases/new")}
                  className="bg-foreground hover:bg-foreground/90 text-white shadow-sm hover:shadow-md px-6 py-2.5 font-semibold"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Create Your First Case
                </Button>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted">
                          CASE TITLE
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted hidden sm:table-cell">
                          SEVERITY
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted">
                          STATUS
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted hidden lg:table-cell">
                          DATE
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted hidden xl:table-cell">
                          LOCATION
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map((caseItem) => (
                        <tr
                          key={caseItem._id}
                          className="border-b border-border/50 hover:bg-gray-50 cursor-pointer transition-all"
                          onClick={() => router.push(`/cases/view?id=${caseItem._id}`)}
                        >
                          <td className="py-4 px-4">
                            <p className="font-medium text-foreground">
                              {caseItem.incidentTitle}
                            </p>
                            {caseItem.description && (
                              <p className="text-sm text-foreground-subtle line-clamp-1 mt-1">
                                {caseItem.description}
                              </p>
                            )}
                          </td>
                          <td className="py-4 px-4 hidden sm:table-cell">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                caseItem.severity === "Critical"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : caseItem.severity === "High"
                                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                                  : caseItem.severity === "Medium"
                                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                  : "bg-green-50 text-green-700 border border-green-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  caseItem.severity === "Critical"
                                    ? "bg-red-500"
                                    : caseItem.severity === "High"
                                    ? "bg-orange-500"
                                    : caseItem.severity === "Medium"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                              ></span>
                              {caseItem.severity}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                                caseItem.status === "Active"
                                  ? "bg-green-50 text-green-700 border border-green-200"
                                  : caseItem.status === "Resolved"
                                  ? "bg-gray-50 text-gray-700 border border-gray-200"
                                  : "bg-gray-50 text-gray-500 border border-gray-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  caseItem.status === "Active"
                                    ? "bg-green-500"
                                    : caseItem.status === "Resolved"
                                    ? "bg-gray-400"
                                    : "bg-gray-300"
                                }`}
                              ></span>
                              {caseItem.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-foreground-subtle hidden lg:table-cell">
                            {caseItem.dateReported
                              ? new Date(
                                  caseItem.dateReported
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="py-4 px-4 text-sm text-foreground-subtle hidden xl:table-cell">
                            {caseItem.locationDescription || "N/A"}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/cases/view?id=${caseItem._id}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-foreground-muted hover:text-foreground text-sm font-medium transition-all border border-transparent hover:border-border"
                            >
                              <span>View</span>
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
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

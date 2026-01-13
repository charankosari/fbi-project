"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import ImageCarousel from "@/components/ImageCarousel";
import CaseChat from "@/components/CaseChat";
import CameraCapture from "@/components/CameraCapture";
import { parseMarkdown } from "@/lib/markdown";
import { processLocation } from "@/lib/locationUtils";
import { API_URL } from "@/lib/config";

interface Case {
  _id: string;
  incidentTitle: string;
  description?: string;
  locationDescription?: string;
  dateReported?: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Active" | "Inactive" | "Resolved";
  statusReason?: string;
  images?: Array<{
    _id: string;
    filename: string;
    originalName: string;
    uploadedAt: string;
  }>;
  aiAnalysis?: {
    summary: string;
    insights: string[];
    analyzedAt: string;
  };
}

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [formData, setFormData] = useState({
    incidentTitle: "",
    description: "",
    locationDescription: "",
    dateReported: "",
    severity: "Medium" as "Low" | "Medium" | "High" | "Critical",
    status: "Active" as "Active" | "Inactive" | "Resolved",
    statusReason: "",
  });

  const fetchCase = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}`,
        {
          cache: "no-store",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCaseData(data);
        setFormData({
          incidentTitle: data.incidentTitle || "",
          description: data.description || "",
          locationDescription: data.locationDescription || "",
          dateReported: data.dateReported
            ? new Date(data.dateReported).toISOString().split("T")[0]
            : "",
          severity: data.severity || "Medium",
          status: data.status || "Active",
          statusReason: data.statusReason || "",
        });
      } else {
        alert("Case not found");
        router.push("/cases");
      }
    } catch (error) {
      console.error("Error fetching case:", error);
      alert("Error loading case");
    } finally {
      setLoading(false);
    }
  }, [caseId, router]);

  useEffect(() => {
    if (caseId) {
      fetchCase();
    }
  }, [caseId, fetchCase]);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }

      try {
        const response = await fetch(
          `${API_URL}/api/cases/${caseId}/images`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (response.ok) {
          await fetchCase();
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        } else {
          const error = await response.json();
          alert(error.error || "Failed to upload images");
        }
      } catch (error) {
        console.error("Error uploading images:", error);
        alert("Error uploading images");
      } finally {
        setUploading(false);
      }
    },
    [caseId, fetchCase]
  );

  const handleCameraCapture = useCallback(
    async (imageData: string) => {
      setUploading(true);
      setShowCamera(false);

      try {
        // Convert base64 to blob
        const response = await fetch(imageData);
        const blob = await response.blob();

        // Create a file from the blob
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        const formData = new FormData();
        formData.append("images", file);

        const uploadResponse = await fetch(
          `${API_URL}/api/cases/${caseId}/images`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (uploadResponse.ok) {
          await fetchCase();
        } else {
          const error = await uploadResponse.json();
          alert(error.error || "Failed to upload image");
        }
      } catch (error) {
        console.error("Error uploading camera image:", error);
        alert("Error uploading image");
      } finally {
        setUploading(false);
      }
    },
    [caseId, fetchCase]
  );

  const handleAnalyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(
        `${API_URL}/api/ai/analyze/${caseId}`,
        {
          method: "POST",
        }
      );

      if (response.ok) {
        await fetchCase();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to analyze case");
      }
    } catch (error) {
      console.error("Error analyzing case:", error);
      alert("Error analyzing case");
    } finally {
      setAnalyzing(false);
    }
  }, [caseId, fetchCase]);

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      if (!confirm("Are you sure you want to delete this image?")) return;

      try {
        const response = await fetch(
          `${API_URL}/api/cases/${caseId}/images/${imageId}`,
          {
            method: "DELETE",
          }
        );

        if (response.ok) {
          await fetchCase();
        } else {
          const error = await response.json();
          alert(error.error || "Failed to delete image");
        }
      } catch (error) {
        console.error("Error deleting image:", error);
        alert("Error deleting image");
      }
    },
    [caseId, fetchCase]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      // Process location if provided
      let locationData = {};
      if (formData.locationDescription && formData.locationDescription.trim()) {
        try {
          const processed = await processLocation(formData.locationDescription);
          locationData = {
            normalizedLocation: processed.normalizedLocation,
            locationCoordinates: processed.coordinates,
          };
        } catch (error) {
          console.warn("Location processing failed:", error);
          // Continue without location data
        }
      }

      const response = await fetch(
        `${API_URL}/api/cases/${caseId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            ...locationData,
          }),
        }
      );

      if (response.ok) {
        await fetchCase();
        setEditing(false);
      } else {
        alert("Failed to update case");
      }
    } catch (error) {
      console.error("Error updating case:", error);
      alert("Error updating case");
    } finally {
      setSaving(false);
    }
  }, [caseId, formData, fetchCase]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Are you sure you want to delete this case?")) return;

    try {
      const response = await fetch(
        `${API_URL}/api/cases/${caseId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        router.push("/cases");
      } else {
        alert("Failed to delete case");
      }
    } catch (error) {
      console.error("Error deleting case:", error);
      alert("Error deleting case");
    }
  }, [caseId, router]);

  const hasImages = useMemo(
    () => caseData?.images && caseData.images.length > 0,
    [caseData]
  );
  const hasAnalysis = useMemo(
    () => caseData?.aiAnalysis && caseData.aiAnalysis.analyzedAt,
    [caseData]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-foreground">
        <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-border"></div>
        <div className="ml-64 p-8">
          <div className="text-center text-foreground-subtle">
            Loading case...
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-white text-foreground">
        <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-border"></div>
        <div className="ml-64 p-8">
          <div className="text-center text-foreground-subtle">
            Case not found
          </div>
        </div>
      </div>
    );
  }

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
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <header className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-4 mb-6 sm:mb-8 sticky top-0 z-30">
            <div className="flex items-center gap-4 mb-4">
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
              <button
                onClick={() => router.push("/cases")}
                className="text-foreground-subtle hover:text-foreground transition-colors flex items-center gap-2"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span>Back to Cases</span>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {editing ? "Edit Case" : caseData.incidentTitle}
              </h1>
              <div className="flex gap-3">
                {!editing ? (
                  <>
                    <Button
                      onClick={() => setEditing(true)}
                      variant="outline"
                      className="border-border text-foreground-muted hover:bg-gray-50"
                    >
                      Edit Case
                    </Button>
                    <Button
                      onClick={handleDelete}
                      variant="destructive"
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Delete Case
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-foreground hover:bg-foreground/90 text-white"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      onClick={() => {
                        setEditing(false);
                        fetchCase();
                      }}
                      variant="outline"
                      className="border-border text-foreground-muted hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Case Information */}
              <div className="card-premium p-6">
                <h2 className="text-2xl font-semibold text-foreground mb-4">
                  Case Information
                </h2>

                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-foreground font-semibold mb-2">
                        Incident Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.incidentTitle}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            incidentTitle: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-foreground font-semibold mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-50 text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-foreground font-semibold mb-2">
                        Location Description
                      </label>
                      <input
                        type="text"
                        value={formData.locationDescription}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            locationDescription: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 bg-gray-50 text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-foreground font-semibold mb-2">
                          Date Reported
                        </label>
                        <input
                          type="date"
                          value={formData.dateReported}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dateReported: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-50 text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-foreground font-semibold mb-2">
                          Severity
                        </label>
                        <select
                          value={formData.severity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              severity: e.target
                                .value as typeof formData.severity,
                            })
                          }
                          className="w-full px-4 py-3 bg-gray-50 text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-foreground font-semibold mb-2">
                        Status *
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as typeof formData.status,
                          })
                        }
                        required
                        className="w-full px-4 py-3 bg-gray-50 text-foreground rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-foreground-subtle text-sm font-medium">
                        Description
                      </label>
                      <p className="text-foreground mt-1">
                        {caseData.description || "No description provided"}
                      </p>
                    </div>

                    <div>
                      <label className="text-foreground-subtle text-sm font-medium">
                        Location
                      </label>
                      <p className="text-foreground mt-1">
                        {caseData.locationDescription || "No location provided"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-foreground-subtle text-sm font-medium">
                          Date Reported
                        </label>
                        <p className="text-foreground mt-1">
                          {caseData.dateReported
                            ? new Date(
                                caseData.dateReported
                              ).toLocaleDateString()
                            : "Not specified"}
                        </p>
                      </div>

                      <div>
                        <label className="text-foreground-subtle text-sm font-medium">
                          Severity
                        </label>
                        <p className="mt-1">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${
                              caseData.severity === "Critical"
                                ? "bg-red-50 text-red-600 border-red-100"
                                : caseData.severity === "High"
                                ? "bg-orange-50 text-orange-600 border-orange-100"
                                : caseData.severity === "Medium"
                                ? "bg-yellow-50 text-yellow-600 border-yellow-100"
                                : "bg-green-50 text-green-600 border-green-100"
                            }`}
                          >
                            {caseData.severity}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-foreground-subtle text-sm font-medium">
                        Status
                      </label>
                      <p className="mt-1">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            caseData.status === "Active"
                              ? "bg-green-50 text-green-600 border-green-100"
                              : caseData.status === "Resolved"
                              ? "bg-gray-50 text-gray-600 border-gray-100"
                              : "bg-gray-50 text-gray-500 border-gray-100"
                          }`}
                        >
                          {caseData.status}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Images Section */}
              <div className="card-premium p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold text-foreground">
                    Images {hasImages && `(${caseData.images?.length || 0})`}
                  </h2>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowCamera(true)}
                        disabled={uploading}
                        variant="outline"
                        className="border-accent-purple text-accent-purple hover:bg-accent-purple hover:text-white"
                      >
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Take Photo
                      </Button>
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="bg-foreground hover:bg-foreground/90 text-white"
                      >
                        {uploading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <svg
                              className="w-5 h-5 mr-2"
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
                            Upload Images
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {uploading && (
                  <div className="text-foreground-subtle text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-gray-200 border-t-gray-900 mb-2"></div>
                    <p>Uploading images...</p>
                  </div>
                )}

                {hasImages ? (
                  <ImageCarousel
                    images={caseData.images || []}
                    onDelete={handleDeleteImage}
                  />
                ) : (
                  !uploading && (
                    <div className="text-center py-12 text-foreground-subtle">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400 mb-4"
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
                      <p>No images uploaded yet</p>
                      <p className="text-xs mt-2">
                        Click "Upload Images" to add multiple images
                      </p>
                    </div>
                  )
                )}
              </div>

              {/* Chat Section */}
              <CaseChat caseId={caseId} caseData={caseData} />

              {/* AI Analysis Section */}
              {hasAnalysis && caseData.aiAnalysis && (
                <div className="card-premium p-6">
                  <h2 className="text-2xl font-semibold text-foreground mb-4">
                    AI Analysis
                  </h2>

                  <div className="mb-6">
                    <label className="text-foreground-subtle text-sm font-medium mb-2 block">
                      Summary
                    </label>
                    <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-border">
                      <div className="text-foreground leading-relaxed">
                        {parseMarkdown(caseData.aiAnalysis.summary)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-foreground-subtle text-sm font-medium mb-3 block">
                      Key Insights
                    </label>
                    <div className="space-y-3">
                      {caseData.aiAnalysis.insights.map((insight, index) => (
                        <div
                          key={index}
                          className="p-4 bg-gray-50 rounded-lg border border-border hover:border-accent-purple/50 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-accent-purple to-accent-pink text-white rounded-full flex items-center justify-center font-semibold text-sm shadow-sm">
                              {index + 1}
                            </span>
                            <div className="text-foreground leading-relaxed flex-1">
                              {parseMarkdown(insight)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 text-foreground-subtle text-sm">
                    Analyzed on:{" "}
                    {new Date(caseData.aiAnalysis.analyzedAt).toLocaleString()}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="card-premium p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Quick Actions
                </h3>
                <div className="space-y-3">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload-sidebar"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full bg-foreground hover:bg-foreground/90 text-white"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
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
                          Upload Images
                        </>
                      )}
                    </Button>
                  </div>

                  {hasImages && (
                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full bg-gradient-to-r from-accent-purple to-accent-pink hover:from-accent-purple/90 hover:to-accent-pink/90 text-white shadow-sm hover:shadow-md"
                    >
                      {analyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Analyzing...
                        </>
                      ) : hasAnalysis ? (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Re-analyze Case
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                          Analyze Case
                        </>
                      )}
                    </Button>
                  )}

                  {hasAnalysis && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-600 text-sm text-center font-medium">
                        ✓ Case Analyzed
                      </p>
                      <p className="text-green-500 text-xs text-center mt-1">
                        Last analyzed:{" "}
                        {new Date(
                          caseData.aiAnalysis!.analyzedAt
                        ).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Case Metadata */}
              <div className="card-premium p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">
                  Case Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-foreground-subtle font-medium">
                      Case ID:
                    </span>
                    <p className="text-foreground font-mono text-xs break-all mt-1">
                      {caseData._id}
                    </p>
                  </div>
                  <div>
                    <span className="text-foreground-subtle font-medium">
                      Created:
                    </span>
                    <p className="text-foreground mt-1">
                      {caseData.dateReported
                        ? new Date(caseData.dateReported).toLocaleString()
                        : "Not specified"}
                    </p>
                  </div>
                  {hasImages && (
                    <div>
                      <span className="text-foreground-subtle font-medium">
                        Images:
                      </span>
                      <p className="text-foreground mt-1">
                        {caseData.images?.length || 0} uploaded
                      </p>
                    </div>
                  )}
                  {hasAnalysis && (
                    <div>
                      <span className="text-foreground-subtle font-medium">
                        AI Analysis:
                      </span>
                      <p className="text-foreground mt-1">Completed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import CameraCapture from "@/components/CameraCapture";
import { processLocation } from "@/lib/locationUtils";

export default function NewCasePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    incidentTitle: "",
    description: "",
    locationDescription: "",
    dateReported: new Date().toISOString().split("T")[0],
    severity: "Medium" as "Low" | "Medium" | "High" | "Critical",
    status: "Active" as "Active" | "Inactive" | "Resolved",
    statusReason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        `https://fbi-backend-production-402c.up.railway.app/api/cases`,
        {
          method: "POST",
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
        const newCase = await response.json();

        // Upload images if any
        if (images.length > 0) {
          const imageFormData = new FormData();
          images.forEach((image) => {
            imageFormData.append("images", image);
          });

          try {
            await fetch(
              `https://fbi-backend-production-402c.up.railway.app/api/cases/${newCase._id}/images`,
              {
                method: "POST",
                body: imageFormData,
              }
            );
          } catch (imageError) {
            console.warn("Failed to upload images:", imageError);
            // Don't fail the case creation if image upload fails
          }
        }

        router.push(`/cases/${newCase._id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create case");
      }
    } catch (error) {
      console.error("Error creating case:", error);
      alert("Error creating case");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages = Array.from(files);
      setImages((prev) => [...prev, ...newImages]);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCameraCapture = (imageData: string) => {
    // Convert base64 to file
    fetch(imageData)
      .then((res) => res.blob())
      .then((blob) => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setImages((prev) => [...prev, file]);
      });
    setShowCamera(false);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
        <header className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-30">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-4">
            Create New Case
          </h1>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="card-premium p-6 sm:p-8 space-y-6"
            >
              {/* Incident Title - Required */}
              <div>
                <label className="block text-foreground font-semibold mb-2">
                  Incident Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.incidentTitle}
                  onChange={(e) =>
                    setFormData({ ...formData, incidentTitle: e.target.value })
                  }
                  placeholder="Enter incident title"
                  className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                />
                <p className="text-xs text-foreground-subtle mt-1">
                  Primary name column - Required and Searchable
                </p>
              </div>

              {/* Description - Multiple lines of text */}
              <div>
                <label className="block text-foreground font-semibold mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={6}
                  placeholder="Enter detailed description of the incident"
                  className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all resize-none"
                />
                <p className="text-xs text-foreground-subtle mt-1">
                  Multiple lines of text - Searchable
                </p>
              </div>

              {/* Location Description - Single line of text */}
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
                  placeholder="Enter location details"
                  className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                />
                <p className="text-xs text-foreground-subtle mt-1">
                  Single line of text - Searchable
                </p>
              </div>

              {/* Date Reported - Date and time */}
              <div>
                <label className="block text-foreground font-semibold mb-2">
                  Date Reported
                </label>
                <input
                  type="date"
                  value={formData.dateReported}
                  onChange={(e) =>
                    setFormData({ ...formData, dateReported: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                />
                <p className="text-xs text-foreground-subtle mt-1">
                  Date and time field
                </p>
              </div>

              {/* Severity and Status - Choice fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-foreground font-semibold mb-2">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        severity: e.target.value as typeof formData.severity,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <p className="text-xs text-foreground-subtle mt-1">
                    Choice field
                  </p>
                </div>

                <div>
                  <label className="block text-foreground font-semibold mb-2">
                    Status <span className="text-red-500">*</span>
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
                    className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <p className="text-xs text-foreground-subtle mt-1">
                    Choice field - Required and Searchable
                  </p>
                </div>
              </div>

              {/* Status Reason - Choice field */}
              <div>
                <label className="block text-foreground font-semibold mb-2">
                  Status Reason
                </label>
                <input
                  type="text"
                  value={formData.statusReason}
                  onChange={(e) =>
                    setFormData({ ...formData, statusReason: e.target.value })
                  }
                  placeholder="Enter reason for current status"
                  className="w-full px-4 py-3 bg-gray-50 text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple transition-all"
                />
                <p className="text-xs text-foreground-subtle mt-1">
                  Choice field - Optional
                </p>
              </div>

              {/* Images Section */}
              <div>
                <label className="block text-foreground font-semibold mb-2">
                  Images
                </label>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() => setShowCamera(true)}
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
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="border-border text-foreground-muted hover:bg-gray-50"
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Upload Images
                    </Button>
                  </div>

                  {images.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                      {images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-foreground-subtle mt-1">
                  Optional - Add images or take photos for this case
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-4 border-t border-border">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-foreground hover:bg-foreground/90 text-white px-8 shadow-sm hover:shadow-md"
                >
                  {loading ? "Creating..." : "Create Case"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-border text-foreground-muted hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </main>
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

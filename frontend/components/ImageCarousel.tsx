"use client";

import { useState, useEffect } from "react";

interface Image {
  _id: string;
  filename?: string;
  originalName: string;
  uploadedAt: string;
  url?: string; // Cloudinary URL
  secureUrl?: string; // Cloudinary secure URL (preferred)
}

interface ImageCarouselProps {
  images: Image[];
  onDelete?: (filename: string) => void;
}

export default function ImageCarousel({
  images,
  onDelete,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Responsive images per page: 3 on mobile, 4 on desktop
  const [imagesPerPage, setImagesPerPage] = useState(3);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const updateImagesPerPage = () => {
      if (window.innerWidth >= 1280) {
        setImagesPerPage(4); // xl screens
      } else if (window.innerWidth >= 1024) {
        setImagesPerPage(4); // lg screens
      } else {
        setImagesPerPage(3); // mobile and tablet
      }
    };

    updateImagesPerPage();
    window.addEventListener("resize", updateImagesPerPage);
    return () => window.removeEventListener("resize", updateImagesPerPage);
  }, []);

  const totalPages = Math.ceil(images.length / imagesPerPage);
  const currentImages = images.slice(
    currentIndex * imagesPerPage,
    (currentIndex + 1) * imagesPerPage
  );

  const nextPage = () => {
    setCurrentIndex((prev) => (prev + 1) % totalPages);
  };

  const prevPage = () => {
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages);
  };

  const goToPage = (page: number) => {
    setCurrentIndex(page);
  };

  const getImageUrl = (image: Image) => {
    // Use Cloudinary URL if available (preferred for speed)
    if (image.secureUrl) {
      return image.secureUrl;
    }
    if (image.url) {
      return image.url;
    }
    // Fallback to backend URL for backward compatibility
    if (image.filename) {
      return `https://fbi-backend-production-402c.up.railway.app/uploads/${image.filename}`;
    }
    return "";
  };

  return (
    <div className="space-y-4">
      {/* Image Grid - 3 images per row on mobile, 4 on desktop */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {currentImages.map((image, idx) => (
          <div
            key={image._id || image.filename || idx}
            className="relative group rounded-lg overflow-hidden border border-border hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="aspect-[4/3] overflow-hidden bg-gray-100">
              <img
                src={getImageUrl(image)}
                alt={image.originalName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute top-2 right-2">
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(image._id);
                    }}
                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    title="Delete image"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="text-sm font-medium truncate">
                  {image.originalName}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  {new Date(image.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            onClick={prevPage}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            Previous
          </button>

          {/* Page Indicators */}
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  currentIndex === idx
                    ? "bg-foreground w-8"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>

          <button
            onClick={nextPage}
            disabled={currentIndex === totalPages - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Image Counter */}
      <div className="text-center text-sm text-foreground-subtle">
        Showing {currentIndex * imagesPerPage + 1}-
        {Math.min((currentIndex + 1) * imagesPerPage, images.length)} of{" "}
        {images.length} images
      </div>
    </div>
  );
}

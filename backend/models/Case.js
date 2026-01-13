const mongoose = require("mongoose");

const caseSchema = new mongoose.Schema(
  {
    incidentTitle: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    locationDescription: {
      type: String,
      default: "",
    },
    normalizedLocation: {
      type: String,
      default: "",
    },
    locationCoordinates: {
      lat: {
        type: Number,
        default: 39.8283, // Center of USA
      },
      lng: {
        type: Number,
        default: -98.5795, // Center of USA
      },
    },
    dateReported: {
      type: Date,
      default: Date.now,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Resolved"],
      default: "Active",
      required: true,
    },
    statusReason: {
      type: String,
      default: "",
    },
    images: [
      {
        publicId: String, // Cloudinary public ID
        url: String, // Cloudinary URL
        secureUrl: String, // Cloudinary secure URL (HTTPS)
        originalName: String,
        filename: String, // Keep for backward compatibility
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    aiAnalysis: {
      summary: String,
      insights: [String],
      analyzedAt: Date,
    },
    createdBy: {
      type: String,
      default: "System",
    },
    modifiedBy: {
      type: String,
      default: "System",
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
caseSchema.index({
  incidentTitle: "text",
  description: "text",
  locationDescription: "text",
});

module.exports = mongoose.model("Case", caseSchema);

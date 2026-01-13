const express = require("express");
const router = express.Router();
const Case = require("../models/Case");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");

// Configure Cloudinary
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("✅ Cloudinary configured successfully");
} else {
  console.warn(
    "⚠️  Cloudinary credentials not found. Image uploads will fail. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file."
  );
}

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, folder = "fbi-cases") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
        transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);
    bufferStream.pipe(uploadStream);
  });
};

// Helper function to safely delete files (handles Windows/OneDrive permission issues)
const safeDeleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      // Try to delete the file
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    // Log the error but don't crash the application
    // On Windows/OneDrive, files can be locked temporarily
    console.warn(`Warning: Could not delete file ${filePath}:`, error.message);
    // Try to delete asynchronously as a fallback (won't block)
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.warn(
                `Async delete also failed for ${filePath}:`,
                err.message
              );
            }
          });
        }
      } catch (e) {
        // Ignore async errors
      }
    }, 1000);
    return false;
  }
};

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (increased from 10MB)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  },
});

// Get all cases
router.get("/", async (req, res) => {
  try {
    const { status, severity, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (search) {
      query.$text = { $search: search };
    }

    const cases = await Case.find(query).sort({ createdAt: -1 });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single case by ID
router.get("/:id", async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }
    res.json(caseItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new case
router.post("/", async (req, res) => {
  try {
    const caseData = {
      ...req.body,
      createdBy: req.body.createdBy || "System",
      modifiedBy: req.body.modifiedBy || "System",
    };
    const newCase = new Case(caseData);
    await newCase.save();
    res.status(201).json(newCase);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update case
router.put("/:id", async (req, res) => {
  try {
    const caseItem = await Case.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        modifiedBy: req.body.modifiedBy || "System",
      },
      { new: true, runValidators: true }
    );

    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(caseItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete case
router.delete("/:id", async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    // Delete associated images (no files to delete since stored in DB)
    await Case.findByIdAndDelete(req.params.id);
    res.json({ message: "Case deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload image to case - with multer error handling
router.post(
  "/:id/images",
  (req, res, next) => {
    upload.array("images")(req, res, (err) => {
      if (err) {
        // Handle multer errors
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            error:
              "File too large. Maximum file size is 50MB. Please compress or resize your image.",
          });
        }
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_FIELD_KEY") {
          return res
            .status(400)
            .json({ error: "Upload error: " + err.message });
        }
        return res
          .status(400)
          .json({ error: "File upload error: " + err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }

      const caseItem = await Case.findById(req.params.id);
      if (!caseItem) {
        return res.status(404).json({ error: "Case not found" });
      }

      const uploadedImages = [];

      for (const file of req.files) {
        try {
          // Process image with sharp (resize, optimize)
          const processedBuffer = await sharp(file.buffer)
            .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer();

          // Upload to Cloudinary
          console.log(`📤 Uploading image to Cloudinary: ${file.originalname}`);
          const cloudinaryResult = await uploadToCloudinary(
            processedBuffer,
            `fbi-cases/case-${req.params.id}`
          );

          console.log(
            `✅ Image uploaded to Cloudinary: ${cloudinaryResult.secure_url}`
          );

          const imageData = {
            publicId: cloudinaryResult.public_id,
            url: cloudinaryResult.url,
            secureUrl: cloudinaryResult.secure_url,
            originalName: file.originalname,
            filename: cloudinaryResult.public_id.split("/").pop(), // For backward compatibility
          };

          caseItem.images.push(imageData);
          uploadedImages.push(imageData);
        } catch (imageError) {
          console.error(
            `❌ Error uploading image ${file.originalname}:`,
            imageError
          );
          // Continue with other images even if one fails
          throw new Error(
            `Failed to upload ${file.originalname}: ${imageError.message}`
          );
        }
      }

      await caseItem.save();

      res.json({
        message: "Images uploaded successfully",
        images: uploadedImages,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Delete image from case
router.delete("/:id/images/:imageId", async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);
    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    const image = caseItem.images.id(req.params.imageId);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // Delete from Cloudinary if publicId exists
    if (image.publicId) {
      try {
        await cloudinary.uploader.destroy(image.publicId);
      } catch (cloudinaryError) {
        console.warn(
          `Failed to delete image from Cloudinary: ${cloudinaryError.message}`
        );
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    // Delete image from case
    image.deleteOne();
    await caseItem.save();

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

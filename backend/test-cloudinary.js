// Test script to verify Cloudinary configuration and upload
require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
  console.log("🧪 Testing Cloudinary Configuration...\n");

  // Check credentials
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("❌ Cloudinary credentials missing!");
    console.error("Please set the following in your .env file:");
    console.error("  - CLOUDINARY_CLOUD_NAME");
    console.error("  - CLOUDINARY_API_KEY");
    console.error("  - CLOUDINARY_API_SECRET");
    process.exit(1);
  }

  console.log("✅ Cloudinary credentials found");
  console.log(`   Cloud Name: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(
    `   API Key: ${process.env.CLOUDINARY_API_KEY.substring(0, 5)}...`
  );
  console.log("");

  // Test connection by listing resources
  try {
    console.log("📡 Testing Cloudinary connection...");
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary connection successful!");
    console.log(`   Status: ${result.status}\n`);
  } catch (error) {
    console.error("❌ Cloudinary connection failed:");
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }

  // Test upload (optional - creates a small test image)
  try {
    console.log("📤 Testing image upload...");

    // Create a simple test image (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "fbi-cases/test",
          resource_type: "image",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(testImageBuffer);
    });

    console.log("✅ Test image uploaded successfully!");
    console.log(`   Public ID: ${uploadResult.public_id}`);
    console.log(`   URL: ${uploadResult.secure_url}`);
    console.log(`   Format: ${uploadResult.format}`);
    console.log(`   Size: ${uploadResult.bytes} bytes\n`);

    // Clean up - delete the test image
    console.log("🧹 Cleaning up test image...");
    await cloudinary.uploader.destroy(uploadResult.public_id);
    console.log("✅ Test image deleted\n");

    console.log(
      "🎉 All Cloudinary tests passed! Your configuration is working correctly.\n"
    );
  } catch (error) {
    console.error("❌ Image upload test failed:");
    console.error(`   Error: ${error.message}`);
    if (error.http_code) {
      console.error(`   HTTP Code: ${error.http_code}`);
    }
    process.exit(1);
  }
}

// Run test
testCloudinary().catch((error) => {
  console.error("\n❌ Test failed with error:");
  console.error(error);
  process.exit(1);
});

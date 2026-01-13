/**
 * Test script for Foundry AI integration
 * Run with: node test-foundry.js
 */

require("dotenv").config();

const FOUNDRY_ENDPOINT = process.env.FOUNDRY_ENDPOINT;
const FOUNDRY_API_KEY = process.env.FOUNDRY_API_KEY;
const FOUNDRY_MODEL = process.env.FOUNDRY_MODEL;

console.log("\n🧪 Testing Foundry AI Configuration...\n");

// Check environment variables
console.log("📋 Environment Variables Check:");
console.log(`   FOUNDRY_ENDPOINT: ${FOUNDRY_ENDPOINT ? "✓ Set" : "✗ Missing"}`);
console.log(`   FOUNDRY_API_KEY: ${FOUNDRY_API_KEY ? "✓ Set" : "✗ Missing"}`);
console.log(`   FOUNDRY_MODEL: ${FOUNDRY_MODEL ? "✓ Set" : "✗ Missing"}\n`);

if (!FOUNDRY_ENDPOINT || !FOUNDRY_API_KEY || !FOUNDRY_MODEL) {
  console.error("❌ Missing required environment variables!");
  console.error(
    "   Please set FOUNDRY_ENDPOINT, FOUNDRY_API_KEY, and FOUNDRY_MODEL in your .env file\n"
  );
  process.exit(1);
}

// Test API connection
async function testFoundryConnection() {
  try {
    console.log("🔄 Testing API connection...\n");

    // Try different endpoint formats
    const endpointFormats = [];

    // If endpoint contains "/openai/deployments/", use Azure OpenAI format
    if (FOUNDRY_ENDPOINT.includes("/openai/deployments/")) {
      const separator = FOUNDRY_ENDPOINT.includes("?") ? "&" : "?";
      endpointFormats.push(
        `${FOUNDRY_ENDPOINT}/chat/completions${separator}api-version=2024-02-15-preview`
      );
    }

    // Add Azure Foundry format with models path (try this early)
    endpointFormats.push(
      `${FOUNDRY_ENDPOINT}/models/chat/completions?api-version=2024-05-01-preview`
    );

    // Add standard formats
    endpointFormats.push(
      `${FOUNDRY_ENDPOINT}/v1/chat/completions`,
      `${FOUNDRY_ENDPOINT}/chat/completions`,
      FOUNDRY_ENDPOINT // If endpoint already includes the path
    );

    let lastError = null;

    // Try different authentication methods
    const authMethods = [
      { name: "api-key", header: { "api-key": FOUNDRY_API_KEY } },
      {
        name: "Bearer token",
        header: { Authorization: `Bearer ${FOUNDRY_API_KEY}` },
      },
    ];

    for (const url of endpointFormats) {
      for (const authMethod of authMethods) {
        try {
          const payload = {
            model: FOUNDRY_MODEL,
            messages: [
              {
                role: "user",
                content:
                  "Hello! Please respond with 'Foundry AI is working correctly.'",
              },
            ],
            temperature: 0.1,
          };

          console.log(`📤 Trying endpoint: ${url}`);
          console.log(`🔐 Using auth: ${authMethod.name}`);
          console.log("📦 Payload:", JSON.stringify(payload, null, 2));
          console.log("");

          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authMethod.header,
            },
            body: JSON.stringify(payload),
          });

          console.log(
            `📥 Response Status: ${response.status} ${response.statusText}\n`
          );

          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch (e) {
              errorData = {
                error: {
                  message: await response
                    .text()
                    .catch(() => response.statusText),
                },
              };
            }
            lastError = errorData;

            // If 401/403, try next auth method
            if (response.status === 401 || response.status === 403) {
              console.warn(
                `⚠️  Auth method '${authMethod.name}' failed: ${response.status} ${response.statusText}`
              );
              console.warn("   Trying next auth method...\n");
              continue;
            }

            // For other errors, try next endpoint format
            console.warn(
              `⚠️  Endpoint failed: ${response.status} ${response.statusText}`
            );
            console.warn("   Error:", JSON.stringify(errorData, null, 2));
            console.warn("   Trying next format...\n");
            break; // Break out of auth loop, try next endpoint
          }

          const data = await response.json();
          console.log("✅ Success! API Response:");
          console.log(JSON.stringify(data, null, 2));
          console.log("");

          const answer =
            data?.choices?.[0]?.message?.content ||
            data?.choices?.[0]?.message?.text ||
            "No response content";

          console.log("💬 AI Response:", answer);
          console.log(`\n✅ Foundry AI integration is working correctly!\n`);
          console.log(`   Endpoint: ${url}`);
          console.log(`   Auth method: ${authMethod.name}\n`);
          return; // Success, exit function
        } catch (error) {
          // If it's not an auth error, try next endpoint
          if (
            !error.message.includes("401") &&
            !error.message.includes("403")
          ) {
            lastError = error;
            console.warn(`⚠️  Endpoint failed: ${error.message}`);
            console.warn("   Trying next format...\n");
            break; // Break out of auth loop, try next endpoint
          }
          lastError = error;
          console.warn(
            `⚠️  Auth method '${authMethod.name}' failed: ${error.message}`
          );
          console.warn("   Trying next auth method...\n");
        }
      }
    }

    // If all formats failed
    console.error("❌ All endpoint formats failed!\n");
    console.error("Last error:", lastError);
    console.error("\n💡 Suggestions:");
    console.error("   1. Check if FOUNDRY_ENDPOINT includes the full path");
    console.error(
      "   2. Verify the endpoint URL format for your Azure Foundry setup"
    );
    console.error("   3. Check if the model name (FOUNDRY_MODEL) is correct");
    console.error("   4. Verify the API key has proper permissions");
    console.error(
      "   5. Try checking Azure portal for the correct endpoint format\n"
    );
    process.exit(1);
  } catch (error) {
    console.error("\n❌ Test failed with error:");
    console.error("   Message:", error.message);
    if (error.stack) {
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run test
testFoundryConnection();

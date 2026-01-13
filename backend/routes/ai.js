const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const Case = require("../models/Case");
const fs = require("fs");
const path = require("path");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Analyze case with AI
router.post("/analyze/:caseId", async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (caseItem.images.length === 0) {
      return res.status(400).json({
        error: "No images found to analyze. Please upload images first.",
      });
    }

    // Build context from case data
    const caseContext = `
Case Information:
- Title: ${caseItem.incidentTitle}
- Description: ${caseItem.description}
- Location: ${caseItem.locationDescription}
- Date Reported: ${caseItem.dateReported}
- Severity: ${caseItem.severity}
- Status: ${caseItem.status}
- Number of Images: ${caseItem.images.length}
    `.trim();

    // Prepare messages for OpenAI Vision API
    const messages = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are a professional forensic investigator and evidence analyst. Your role is to provide detailed, factual observations based ONLY on what you can clearly see in the images and the case information provided. Do NOT make assumptions, speculations, or inferences beyond what is directly observable.

**CRITICAL INSTRUCTION:** Never give generic responses like "I'm unable to provide a detailed forensic analysis" or "general overview." You MUST provide specific, detailed observations about what is actually visible in each image.

**OBSERVATION PROTOCOL:**
1. **Image Description**: Provide a detailed, objective description of what is visible in each image. Describe colors, shapes, objects, people, text, and spatial relationships exactly as they appear.
2. **Object Identification**: List all objects, people, text, and elements that are clearly visible. Be specific about quantities, sizes, and positions.
3. **Environmental Details**: Note location indicators, time of day, weather conditions, lighting, and any background elements.
4. **Physical Evidence**: Document any items that could be considered evidence (documents, objects, marks, damage, etc.) with precise descriptions.
5. **Anomalies**: Note anything unusual or out of place that is clearly visible, but do not speculate about causes.
6. **Text/Content**: Transcribe any readable text, numbers, or markings exactly as they appear, including fonts, colors, and context.

**CASE CONTEXT INTEGRATION:**
- Cross-reference observations with the provided case details
- Note any consistencies or discrepancies between images and case description
- Identify specific details that support or contradict the reported incident

**REPORTING REQUIREMENTS:**
- Use factual, objective language only
- Specify which image each observation comes from when multiple images exist
- Include measurements, colors, and other specific details when clearly visible
- Do not speculate about causes, motives, or unseen events
- If something is unclear or ambiguous, state this explicitly
- Provide comprehensive details rather than vague summaries

**Case Context:** ${caseContext}

**Analysis Focus:** Analyze each image individually and provide specific, detailed observations. For each image, describe exactly what you see including:
- Exact colors, shapes, and textures visible
- Specific objects and their positions relative to other elements
- Any text, numbers, or markings that can be read
- Environmental conditions and lighting
- Any damage, marks, or unusual features
- Spatial relationships between all visible elements

Structure your response by analyzing each image separately, then provide cross-references between images if multiple exist. Be extremely detailed and specific - avoid any generic statements.`,
          },
        ],
      },
    ];

    // Add images to the message - use Cloudinary URLs directly (faster than base64)
    for (const image of caseItem.images) {
      // Use secureUrl if available, otherwise fall back to url
      const imageUrl = image.secureUrl || image.url;
      if (imageUrl) {
        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: imageUrl, // Cloudinary URLs are publicly accessible
          },
        });
      } else if (image.data) {
        // Fallback for old images stored as base64 (backward compatibility)
        const base64Image = image.data.toString("base64");
        messages[0].content.push({
          type: "image_url",
          image_url: {
            url: `data:${image.contentType};base64,${base64Image}`,
          },
        });
      }
    }

    // Use OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Use gpt-4o for vision
      messages: messages,
      // No token limit - let AI respond fully
      temperature: 0.1, // Lower temperature for more factual responses
    });

    const analysis = response.choices[0].message.content;

    // Parse the analysis into summary and insights
    const summaryMatch =
      analysis.match(/Image \d+.*?:\s*(.*?)(?=\nImage|\n\*\*|\n\n|$)/s) ||
      analysis.match(/^(.*?)(?=\n\*\*|\n\n|$)/s);

    // Extract key insights - look for image-specific observations
    const insights = [];
    const imageMatches = analysis.match(/Image \d+:.*?(?=Image \d+|$)/gs);

    if (imageMatches) {
      imageMatches.forEach((match, index) => {
        insights.push(
          `**Image ${index + 1} Observations:** ${match
            .replace(/Image \d+:\s*/, "")
            .trim()}`
        );
      });
    }

    // If no image-specific matches, try to extract meaningful paragraphs
    if (insights.length < 1) {
      const paragraphs = analysis
        .split("\n\n")
        .filter(
          (p) =>
            p.trim().length > 20 &&
            !p.toLowerCase().includes("case context") &&
            !p.toLowerCase().includes("analysis focus") &&
            !p.toLowerCase().includes("observation protocol")
        );
      insights.push(...paragraphs.slice(0, 10).map((p) => p.trim()));
    }

    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : "Detailed forensic image analysis completed.";

    // Save analysis to case
    caseItem.aiAnalysis = {
      summary: summary,
      insights: insights,
      analyzedAt: new Date(),
    };

    await caseItem.save();

    res.json({
      message: "Case analyzed successfully",
      analysis: caseItem.aiAnalysis,
    });
  } catch (error) {
    console.error("AI Analysis error:", error);
    res.status(500).json({ error: "Failed to analyze case: " + error.message });
  }
});

// Get AI analysis for a case
router.get("/analyze/:caseId", async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    if (!caseItem.aiAnalysis) {
      return res
        .status(404)
        .json({ error: "No AI analysis available for this case" });
    }

    res.json(caseItem.aiAnalysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat/QA endpoint for asking questions about a case
router.post("/chat/:caseId", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    const caseItem = await Case.findById(req.params.caseId);
    if (!caseItem) {
      return res.status(404).json({ error: "Case not found" });
    }

    // Build case context
    const caseContext = `
Case Information:
- Title: ${caseItem.incidentTitle}
- Description: ${caseItem.description || "No description provided"}
- Location: ${caseItem.locationDescription || "No location provided"}
- Date Reported: ${
      caseItem.dateReported
        ? new Date(caseItem.dateReported).toLocaleString()
        : "Not specified"
    }
- Severity: ${caseItem.severity}
- Status: ${caseItem.status}
- Status Reason: ${caseItem.statusReason || "Not provided"}
- Number of Images: ${caseItem.images.length}
${
  caseItem.aiAnalysis
    ? `- Previous Analysis Available: Yes (analyzed on ${new Date(
        caseItem.aiAnalysis.analyzedAt
      ).toLocaleString()})`
    : "- Previous Analysis Available: No"
}
    `.trim();

    // Prepare messages
    const messages = [
      {
        role: "system",
        content: `You are a professional forensic investigator assistant. Your role is to provide detailed, factual observations based ONLY on what you can clearly see in the images and the case information provided. Do NOT make assumptions, speculations, or inferences beyond what is directly observable in the evidence.

When answering questions:
1. Base responses on visible evidence and documented case details only
2. If something is not visible or documented, state this clearly
3. Provide specific, verifiable observations from images when relevant
4. Cross-reference information between case details and visual evidence
5. Be precise about what can be confirmed vs. what is speculative

Maintain professional, objective language focused on facts rather than interpretation.`,
      },
    ];

    // Build user message with context and question
    const userContent = [
      {
        type: "text",
        text: `${caseContext}

User Question: ${question}

Please provide a detailed, helpful answer based on the case information above. If images are available, reference what you can see in them. Be specific and professional in your response.`,
      },
    ];

    // Add images if available - use Cloudinary URLs directly (faster than base64)
    if (caseItem.images && caseItem.images.length > 0) {
      // Include all images - no limit
      for (const image of caseItem.images) {
        // Use secureUrl if available, otherwise fall back to url
        const imageUrl = image.secureUrl || image.url;
        if (imageUrl) {
          userContent.push({
            type: "image_url",
            image_url: {
              url: imageUrl, // Cloudinary URLs are publicly accessible
            },
          });
        } else if (image.data) {
          // Fallback for old images stored as base64 (backward compatibility)
          const base64Image = image.data.toString("base64");
          userContent.push({
            type: "image_url",
            image_url: {
              url: `data:${image.contentType};base64,${base64Image}`,
            },
          });
        }
      }
    }

    messages.push({
      role: "user",
      content: userContent,
    });

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model:
        caseItem.images && caseItem.images.length > 0
          ? "gpt-4o"
          : "gpt-4o-mini", // Use vision model if images exist
      messages: messages,
      // No token limit - let AI respond fully
      temperature: 0.1, // Lower temperature for more factual responses
    });

    const answer = response.choices[0].message.content;

    res.json({
      answer: answer,
      question: question,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to process question: " + error.message,
    });
  }
});

// AI-powered location normalization
router.post("/normalize-location", async (req, res) => {
  try {
    const { location } = req.body;

    if (!location || !location.trim()) {
      return res.json({
        normalizedLocation: "United States",
        coordinates: {
          lat: 39.8283,
          lng: -98.5795,
        },
      });
    }

    const prompt = `You are a location normalization assistant for an FBI case management system. Your task is to determine the most likely location based on the input.

Input location: "${location}"

Rules:
1. If the location is clearly a US city, state, or region, return it in the format: "City, State, USA" or "State, USA"
2. If it's a common abbreviation (like "nyc", "la", "sf"), expand it to the full name
3. If it's a misspelling or partial name (like "noah", "hyderabad", "amstredam"), determine the most likely intended location:
   - For US locations: Return as "City, State, USA" or "State, USA"
   - For non-US locations: Return the full location name with country
4. If the location is ambiguous or truly unknown, default to "United States"
5. Always prioritize US locations if the input could match multiple places
6. For common misspellings, correct them (e.g., "amstredam" -> "Amsterdam, Netherlands" or if context suggests US, try to find US match)

Examples:
- "nyc" -> "New York, NY, USA"
- "noah" -> "Noah, AR, USA" (if it's a US place) or determine the most likely location
- "hyderabad" -> "Hyderabad, India" (if not US) or "Hyderabad, AL, USA" (if US context)
- "amstredam" -> "Amsterdam, Netherlands" or correct to US location if context suggests

Return ONLY a JSON object with this exact format:
{
  "normalizedLocation": "City, State, USA",
  "confidence": "high|medium|low",
  "reasoning": "brief explanation"
}

Be concise and accurate.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use cheaper model for location normalization
      messages: [
        {
          role: "system",
          content:
            "You are a location normalization expert. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      // No token limit - let AI respond fully
      temperature: 0.3,
    });

    const content = response.choices[0].message.content.trim();

    // Try to parse JSON from response
    let aiResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch =
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        aiResult = JSON.parse(content);
      }
    } catch (error) {
      console.warn("Failed to parse AI location response:", error);
      // Fallback: try to extract location from text
      const locationMatch = content.match(/"normalizedLocation":\s*"([^"]+)"/);
      if (locationMatch) {
        aiResult = { normalizedLocation: locationMatch[1] };
      } else {
        // Last resort: use the input with ", USA" appended
        aiResult = {
          normalizedLocation: `${location.trim()}, USA`,
          confidence: "low",
        };
      }
    }

    const normalizedLocation =
      aiResult.normalizedLocation || `${location.trim()}, USA`;

    // Get coordinates for the normalized location
    const coords = await geocodeLocation(normalizedLocation);

    res.json({
      normalizedLocation,
      coordinates: coords || {
        lat: 39.8283,
        lng: -98.5795,
      },
      confidence: aiResult.confidence || "medium",
      reasoning: aiResult.reasoning || "",
    });
  } catch (error) {
    console.error("AI location normalization error:", error);
    // Fallback to basic normalization
    const fallbackLocation = `${
      req.body.location?.trim() || "United States"
    }, USA`;
    res.json({
      normalizedLocation: fallbackLocation,
      coordinates: {
        lat: 39.8283,
        lng: -98.5795,
      },
      confidence: "low",
      reasoning: "AI service unavailable, using fallback",
    });
  }
});

// Helper function for geocoding (reuse from cases if needed, or use Nominatim)
async function geocodeLocation(location) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "FBI-Case-Management-System",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return null;
}

module.exports = router;

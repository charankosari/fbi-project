// Location normalization and geocoding utilities

interface LocationCoordinates {
  lat: number;
  lng: number;
  normalizedLocation: string;
}

// Common location abbreviations and their full names
const locationMappings: Record<string, string> = {
  // US Cities
  nyc: "New York, NY, USA",
  "new york city": "New York, NY, USA",
  "new york": "New York, NY, USA",
  la: "Los Angeles, CA, USA",
  "los angeles": "Los Angeles, CA, USA",
  sf: "San Francisco, CA, USA",
  "san francisco": "San Francisco, CA, USA",
  chi: "Chicago, IL, USA",
  chicago: "Chicago, IL, USA",
  dc: "Washington, DC, USA",
  "washington dc": "Washington, DC, USA",
  "washington d.c.": "Washington, DC, USA",
  miami: "Miami, FL, USA",
  boston: "Boston, MA, USA",
  seattle: "Seattle, WA, USA",
  philly: "Philadelphia, PA, USA",
  philadelphia: "Philadelphia, PA, USA",
  phoenix: "Phoenix, AZ, USA",
  houston: "Houston, TX, USA",
  dallas: "Dallas, TX, USA",
  atlanta: "Atlanta, GA, USA",
  denver: "Denver, CO, USA",
  portland: "Portland, OR, USA",
  // States
  california: "California, USA",
  texas: "Texas, USA",
  florida: "Florida, USA",
  newyork: "New York, NY, USA",
  // Unknown/Default
  unknown: "United States",
  "": "United States",
};

// Common US city coordinates (fallback if geocoding fails)
const cityCoordinates: Record<string, LocationCoordinates> = {
  "New York, NY, USA": {
    lat: 40.7128,
    lng: -74.006,
    normalizedLocation: "New York, NY, USA",
  },
  "Los Angeles, CA, USA": {
    lat: 34.0522,
    lng: -118.2437,
    normalizedLocation: "Los Angeles, CA, USA",
  },
  "Chicago, IL, USA": {
    lat: 41.8781,
    lng: -87.6298,
    normalizedLocation: "Chicago, IL, USA",
  },
  "Houston, TX, USA": {
    lat: 29.7604,
    lng: -95.3698,
    normalizedLocation: "Houston, TX, USA",
  },
  "Phoenix, AZ, USA": {
    lat: 33.4484,
    lng: -112.074,
    normalizedLocation: "Phoenix, AZ, USA",
  },
  "Philadelphia, PA, USA": {
    lat: 39.9526,
    lng: -75.1652,
    normalizedLocation: "Philadelphia, PA, USA",
  },
  "San Antonio, TX, USA": {
    lat: 29.4241,
    lng: -98.4936,
    normalizedLocation: "San Antonio, TX, USA",
  },
  "San Diego, CA, USA": {
    lat: 32.7157,
    lng: -117.1611,
    normalizedLocation: "San Diego, CA, USA",
  },
  "Dallas, TX, USA": {
    lat: 32.7767,
    lng: -96.797,
    normalizedLocation: "Dallas, TX, USA",
  },
  "San Jose, CA, USA": {
    lat: 37.3382,
    lng: -121.8863,
    normalizedLocation: "San Jose, CA, USA",
  },
  "Austin, TX, USA": {
    lat: 30.2672,
    lng: -97.7431,
    normalizedLocation: "Austin, TX, USA",
  },
  "Jacksonville, FL, USA": {
    lat: 30.3322,
    lng: -81.6557,
    normalizedLocation: "Jacksonville, FL, USA",
  },
  "San Francisco, CA, USA": {
    lat: 37.7749,
    lng: -122.4194,
    normalizedLocation: "San Francisco, CA, USA",
  },
  "Indianapolis, IN, USA": {
    lat: 39.7684,
    lng: -86.1581,
    normalizedLocation: "Indianapolis, IN, USA",
  },
  "Columbus, OH, USA": {
    lat: 39.9612,
    lng: -82.9988,
    normalizedLocation: "Columbus, OH, USA",
  },
  "Fort Worth, TX, USA": {
    lat: 32.7555,
    lng: -97.3308,
    normalizedLocation: "Fort Worth, TX, USA",
  },
  "Charlotte, NC, USA": {
    lat: 35.2271,
    lng: -80.8431,
    normalizedLocation: "Charlotte, NC, USA",
  },
  "Seattle, WA, USA": {
    lat: 47.6062,
    lng: -122.3321,
    normalizedLocation: "Seattle, WA, USA",
  },
  "Denver, CO, USA": {
    lat: 39.7392,
    lng: -104.9903,
    normalizedLocation: "Denver, CO, USA",
  },
  "Washington, DC, USA": {
    lat: 38.9072,
    lng: -77.0369,
    normalizedLocation: "Washington, DC, USA",
  },
  "Boston, MA, USA": {
    lat: 42.3601,
    lng: -71.0589,
    normalizedLocation: "Boston, MA, USA",
  },
  "Miami, FL, USA": {
    lat: 25.7617,
    lng: -80.1918,
    normalizedLocation: "Miami, FL, USA",
  },
  "Atlanta, GA, USA": {
    lat: 33.749,
    lng: -84.388,
    normalizedLocation: "Atlanta, GA, USA",
  },
  "Portland, OR, USA": {
    lat: 45.5152,
    lng: -122.6784,
    normalizedLocation: "Portland, OR, USA",
  },
  "United States": {
    lat: 39.8283,
    lng: -98.5795,
    normalizedLocation: "United States",
  }, // Center of USA
};

/**
 * Normalizes a location string using AI when direct mappings fail
 * (e.g., "nyc" -> "New York, NY, USA", "noah" -> "Noah, AR, USA")
 */
export const normalizeLocation = async (location: string): Promise<string> => {
  if (!location || location.trim() === "") {
    return "United States";
  }

  const normalized = location.trim().toLowerCase();

  // Check direct mappings first (fast path)
  if (locationMappings[normalized]) {
    return locationMappings[normalized];
  }

  // Check if it's already a full location name
  for (const [key, value] of Object.entries(locationMappings)) {
    if (value.toLowerCase() === normalized) {
      return value;
    }
  }

  // If it contains "unknown" or is very short, default to USA
  if (normalized.includes("unknown") || normalized.length < 2) {
    return "United States";
  }

  // Try to find partial matches in known locations
  for (const [key, value] of Object.entries(locationMappings)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  // Use AI to determine the most likely location
  try {
    const response = await fetch(
      `https://fbi-backend-production-402c.up.railway.app/api/ai/normalize-location`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location: location.trim() }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.normalizedLocation) {
        return data.normalizedLocation;
      }
    }
  } catch (error) {
    console.warn("AI location normalization failed:", error);
  }

  // Fallback: If it looks like a city name, try to append ", USA"
  if (
    normalized.length > 2 &&
    !normalized.includes("usa") &&
    !normalized.includes("united states")
  ) {
    // Capitalize first letter of each word
    const capitalized = normalized
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    return `${capitalized}, USA`;
  }

  // Last resort: return as-is but ensure it has USA
  if (!normalized.includes("usa") && !normalized.includes("united states")) {
    return `${location.trim()}, USA`;
  }

  return location.trim();
};

/**
 * Gets coordinates for a normalized location
 * Uses fallback coordinates if geocoding is not available
 */
export const getLocationCoordinates = async (
  normalizedLocation: string
): Promise<LocationCoordinates> => {
  // Check if we have cached coordinates
  if (cityCoordinates[normalizedLocation]) {
    return cityCoordinates[normalizedLocation];
  }

  // Try geocoding using OpenStreetMap Nominatim
  try {
    const coords = await geocodeLocation(normalizedLocation);
    if (coords) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        normalizedLocation,
      };
    }
  } catch (error) {
    console.warn("Geocoding failed, using fallback:", error);
  }

  // Fallback to center of USA
  return {
    lat: 39.8283,
    lng: -98.5795,
    normalizedLocation: normalizedLocation || "United States",
  };
};

/**
 * Simple geocoding using OpenStreetMap Nominatim (free, no API key needed)
 */
const geocodeLocation = async (
  location: string
): Promise<{ lat: number; lng: number } | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        location
      )}&limit=1`,
      {
        headers: {
          "User-Agent": "FBI-Case-Management-System", // Required by Nominatim
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
};

/**
 * Process location before saving: normalize and get coordinates
 * Uses AI to intelligently determine location if not found in mappings
 */
export const processLocation = async (
  location: string
): Promise<{
  normalizedLocation: string;
  coordinates: LocationCoordinates;
}> => {
  // Normalize location using AI if needed
  const normalized = await normalizeLocation(location);

  // Try to get coordinates - if AI normalization was used, it may have returned coordinates
  // Otherwise, geocode the normalized location
  let coordinates: LocationCoordinates;

  try {
    // Check if we can get coordinates from AI endpoint (it returns coordinates too)
    const response = await fetch(
      `https://fbi-backend-production-402c.up.railway.app/api/ai/normalize-location`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ location: location.trim() }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.coordinates) {
        coordinates = {
          lat: data.coordinates.lat,
          lng: data.coordinates.lng,
          normalizedLocation: data.normalizedLocation || normalized,
        };
        return {
          normalizedLocation: data.normalizedLocation || normalized,
          coordinates,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to get coordinates from AI endpoint:", error);
  }

  // Fallback to geocoding the normalized location
  coordinates = await getLocationCoordinates(normalized);

  return {
    normalizedLocation: normalized,
    coordinates,
  };
};

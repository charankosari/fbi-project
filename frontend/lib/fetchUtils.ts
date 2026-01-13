/**
 * Fetch utility with no timeout limits
 * Use this for all API calls that might take a long time
 */

export const fetchWithNoTimeout = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Create AbortController but don't set a timeout
  const controller = new AbortController();

  // Merge with existing signal if provided
  const signal = options.signal || controller.signal;

  return fetch(url, {
    ...options,
    signal,
    // No timeout - let requests run as long as needed
  });
};

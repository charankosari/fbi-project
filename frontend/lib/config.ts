// API configuration
// In production (when built), we want to use relative paths (empty string) 
// so requests go to the same domain as the frontend
const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000');

export { API_URL };

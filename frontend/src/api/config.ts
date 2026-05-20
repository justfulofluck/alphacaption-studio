/**
 * API Configuration
 */

// Centralized API base URL logic
// Priority: 
// 1. VITE_API_BASE_URL environment variable (with protocol upgrade if needed)
// 2. Protocol-aware fallback to current hostname on port 5000
const getApiBaseUrl = () => {
    let envUrl = import.meta.env.VITE_API_BASE_URL;

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Check if we are running on localhost (for local development)
    const isLocalhost = hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.');

    // If we are on your production domain, ALWAYS use the standard URL
    if (hostname === 'app.vcaptiona.com' || hostname === 'vcaptiona.com') {
        return `https://${hostname}`;
    }

    if (isLocalhost) {
        return `http://${hostname}:5000`;
    }

    if (envUrl) {
        // Ensure protocol matches if it's missing
        if (!envUrl.startsWith('http')) {
            envUrl = `${protocol}//${envUrl}`;
        }
        // Upgrade to https if needed
        if (protocol === 'https:' && envUrl.startsWith('http:')) {
            return envUrl.replace('http:', 'https:');
        }
        return envUrl;
    }

    // Default fallback without port 5000 for standard domains
    return `${protocol}//${hostname}`;
};

export const API_BASE_URL = getApiBaseUrl();

/**
 * Utility functions for the application
 */

/**
 * Get display name from full name (first 2 words)
 * Example: "R. WENDRA WILENDRA SUKARNO M.MT" → "R. WENDRA"
 * Example: "IMAN CANGGA WIGUNA S.Kom" → "IMAN CANGGA"
 */
export function getDisplayName(fullName: string | null | undefined): string {
  if (!fullName) return 'Unknown';
  
  const words = fullName.trim().split(/\s+/);
  
  if (words.length === 0) return 'Unknown';
  if (words.length === 1) return words[0];
  
  // Return first 2 words
  return words.slice(0, 2).join(' ');
}

/**
 * Get initials from name (for avatars)
 * Example: "R. WENDRA" → "RW"
 * Example: "IMAN CANGGA" → "IC"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  
  const words = name.trim().split(/\s+/);
  
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  
  // Return first letter of first 2 words
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return '';
  }
}

/**
 * Format datetime to readable string
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return d.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

/**
 * Format time to readable string
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    
    // If less than 24 hours, show time
    if (diff < 86400000) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    
    // If less than 7 days, show day name
    if (diff < 604800000) {
      return d.toLocaleDateString('id-ID', { weekday: 'short' });
    }
    
    // Otherwise show date
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string | null | undefined, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + '...';
}

/**
 * Get avatar URL (handle both relative and absolute paths)
 */
export const DEFAULT_AVATAR_URL = '/default-avatar.svg';

function normalizeRemoteAvatarUrl(value: string): string {
  return value.replace(/^https?:\/(?!\/)/i, (match) => {
    return match.toLowerCase().startsWith('https') ? 'https://' : 'http://';
  });
}

export function getAvatarUrl(avatar: string | null | undefined): string {
  if (!avatar) return DEFAULT_AVATAR_URL;

  const value = String(avatar).trim();
  if (!value) return DEFAULT_AVATAR_URL;

  if (/default-avatar\.png$/i.test(value) || /default-avatar\.svg$/i.test(value)) {
    return DEFAULT_AVATAR_URL;
  }

  if (/^(data:|blob:|https?:\/\/)/i.test(value)) {
    return value;
  }

  if (/^\/?uploads\/https?:\/?/i.test(value)) {
    const stripped = value.replace(/^\/?uploads\//i, '');
    return normalizeRemoteAvatarUrl(stripped);
  }

  if (/^\/?uploads\//i.test(value)) {
    return value.startsWith('/') ? value : `/${value}`;
  }

  if (value.startsWith('/')) {
    return value;
  }

  if (/^https?:\/?/i.test(value)) {
    return normalizeRemoteAvatarUrl(value);
  }

  return `/uploads/${value}`;
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Parse CSV string to array
 */
export function parseCsv(csv: string | null | undefined): string[] {
  if (!csv) return [];
  
  return csv
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Get display names from CSV list of full names
 * Example: "R. WENDRA WILENDRA SUKARNO M.MT, IMAN CANGGA WIGUNA S.Kom" 
 *       → ["R. WENDRA", "IMAN CANGGA"]
 */
export function getDisplayNamesFromCsv(csv: string | null | undefined): string[] {
  if (!csv) return [];
  
  return csv
    .split(',')
    .map(item => getDisplayName(item.trim()))
    .filter(Boolean);
}

/**
 * Format display names for UI (comma separated)
 * Example: ["R. WENDRA", "IMAN CANGGA"] → "R. WENDRA, IMAN CANGGA"
 */
export function formatDisplayNames(names: string[]): string {
  if (!names || names.length === 0) return '';
  return names.join(', ');
}

/**
 * Format file size to human readable
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate random ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

/**
 * Create a stable URL-safe slug from text
 */
export function slugify(text: string | null | undefined): string {
  if (!text) return 'workspace';

  return text
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    || 'workspace';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

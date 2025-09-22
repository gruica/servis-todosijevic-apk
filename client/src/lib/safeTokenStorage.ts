// Safe token storage with cookie fallback for mobile web compatibility
// Fixes localStorage issues on mobile browsers in private mode or restricted WebViews

/**
 * Safely gets an item from storage with localStorage->cookie fallback
 */
export function safeGetItem(key) {
  try {
    // Try localStorage first
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        return value;
      }
    }
  } catch (error) {
    console.warn(`localStorage unavailable for ${key}, trying cookie fallback:`, error);
  }
  
  // Fallback to cookies for mobile browsers
  try {
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(name) === 0) {
        return cookie.substring(name.length, cookie.length);
      }
    }
  } catch (error) {
    console.warn(`Cookie fallback failed for ${key}:`, error);
  }
  
  return null;
}

/**
 * Safely sets an item in storage with localStorage->cookie fallback
 */
export function safeSetItem(key, value) {
  try {
    // Try localStorage first
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (error) {
    console.warn(`localStorage unavailable for ${key}, using cookie fallback:`, error);
  }
  
  // Fallback to cookies for mobile browsers
  try {
    // Set secure cookie with 30 day expiration (same as JWT token expiration)
    const expires = new Date();
    expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    const expiresString = expires.toUTCString();
    
    // Use secure cookie settings appropriate for environment
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = `${key}=${encodeURIComponent(value)}; expires=${expiresString}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    document.cookie = cookieValue;
    return true;
  } catch (error) {
    console.error(`Both localStorage and cookie fallback failed for ${key}:`, error);
    return false;
  }
}

/**
 * Safely removes an item from storage (both localStorage and cookies)
 */
export function safeRemoveItem(key) {
  let removed = false;
  
  // Try localStorage first
  try {
    if (typeof localStorage !== 'undefined' && localStorage.removeItem) {
      localStorage.removeItem(key);
      removed = true;
    }
  } catch (error) {
    console.warn(`localStorage removal failed for ${key}:`, error);
  }
  
  // Remove from cookies as well
  try {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    removed = true;
  } catch (error) {
    console.warn(`Cookie removal failed for ${key}:`, error);
  }
  
  return removed;
}

/**
 * Check if any storage mechanism is available
 */
export function isStorageAvailable() {
  try {
    // Test localStorage
    if (typeof localStorage !== 'undefined') {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    }
  } catch (error) {
    // localStorage failed, check if cookies work
    try {
      document.cookie = '__cookie_test__=test; path=/;';
      const cookieWorks = document.cookie.indexOf('__cookie_test__') !== -1;
      document.cookie = '__cookie_test__=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      return cookieWorks;
    } catch (cookieError) {
      console.error('No storage mechanism available:', error, cookieError);
      return false;
    }
  }
  
  return false;
}
// Safe token storage with cookie fallback for mobile web compatibility
// Fixes localStorage issues on mobile browsers in private mode or restricted WebViews

/**
 * Safely gets an item from storage with localStorage->cookie fallback
 */
export function safeGetItem(key: string): string | null {
  console.log(`[MOBILE-DEBUG] GET ${key}: Starting...`);
  
  try {
    // Try localStorage first
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        console.log(`[MOBILE-DEBUG] GET ${key}: localStorage SUCCESS`);
        return value;
      }
      console.log(`[MOBILE-DEBUG] GET ${key}: localStorage EMPTY`);
    } else {
      console.log(`[MOBILE-DEBUG] GET ${key}: localStorage UNAVAILABLE`);
    }
  } catch (error) {
    console.log(`[MOBILE-DEBUG] GET ${key}: localStorage ERROR:`, error);
  }
  
  // Fallback to cookies for mobile browsers
  try {
    console.log(`[MOBILE-DEBUG] GET ${key}: Trying cookie fallback`);
    const name = key + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    
    console.log(`[MOBILE-DEBUG] GET ${key}: Found ${cookieArray.length} cookies`);
    
    for (let i = 0; i < cookieArray.length; i++) {
      let cookie = cookieArray[i];
      while (cookie.charAt(0) === ' ') {
        cookie = cookie.substring(1);
      }
      if (cookie.indexOf(name) === 0) {
        const value = cookie.substring(name.length, cookie.length);
        console.log(`[MOBILE-DEBUG] GET ${key}: Cookie SUCCESS`);
        return value;
      }
    }
    console.log(`[MOBILE-DEBUG] GET ${key}: Cookie NOT FOUND`);
  } catch (error) {
    console.log(`[MOBILE-DEBUG] GET ${key}: Cookie ERROR:`, error);
  }
  
  console.log(`[MOBILE-DEBUG] GET ${key}: FINAL RESULT: null`);
  return null;
}

/**
 * Safely sets an item in storage with localStorage->cookie fallback
 */
export function safeSetItem(key: string, value: string): boolean {
  console.log(`[MOBILE-DEBUG] SET ${key}: Starting...`);
  
  try {
    // Try localStorage first
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, value);
      console.log(`[MOBILE-DEBUG] SET ${key}: localStorage SUCCESS`);
      return true;
    }
    console.log(`[MOBILE-DEBUG] SET ${key}: localStorage UNAVAILABLE`);
  } catch (error) {
    console.log(`[MOBILE-DEBUG] SET ${key}: localStorage ERROR:`, error);
  }
  
  // Fallback to cookies for mobile browsers
  try {
    console.log(`[MOBILE-DEBUG] SET ${key}: Trying cookie fallback`);
    
    // Set secure cookie with 30 day expiration (same as JWT token expiration)
    const expires = new Date();
    expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days
    const expiresString = expires.toUTCString();
    
    // Use secure cookie settings appropriate for environment
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = `${key}=${encodeURIComponent(value)}; expires=${expiresString}; path=/; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    
    console.log(`[MOBILE-DEBUG] SET ${key}: Cookie value length: ${cookieValue.length}`);
    console.log(`[MOBILE-DEBUG] SET ${key}: Using HTTPS: ${isSecure}`);
    
    document.cookie = cookieValue;
    console.log(`[MOBILE-DEBUG] SET ${key}: Cookie SET SUCCESS`);
    return true;
  } catch (error) {
    console.log(`[MOBILE-DEBUG] SET ${key}: Cookie ERROR:`, error);
    return false;
  }
}

/**
 * Safely removes an item from storage (both localStorage and cookies)
 */
export function safeRemoveItem(key: string): boolean {
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
export function isStorageAvailable(): boolean {
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
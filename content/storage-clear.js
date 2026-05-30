// CHAFF Storage Guard — clears tracking storage when tabs close
(function() {
  'use strict';
  chrome.storage.local.get(['shieldEnabled','autoClearEnabled'], function(s) {
    if (s.shieldEnabled === false || s.autoClearEnabled === false) return;

    // Notify background this tab is active (for cleanup tracking)
    try {
      chrome.runtime.sendMessage({ type: 'TAB_ACTIVE', url: location.href });
    } catch(e) {}

    // Clear sessionStorage on unload (last defense)
    window.addEventListener('beforeunload', function() {
      try { sessionStorage.clear(); } catch(e) {}
    });

    // Clear sensitive cookies on page hide (bfcache navigation)
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        try {
          // Clear third-party cookies set by this page
          const cookies = document.cookie.split(';');
          cookies.forEach(function(c) {
            const name = c.split('=')[0].trim();
            // Only clear tracking cookies, not essential ones
            if (name.startsWith('_ga') || name.startsWith('_gid') || name.startsWith('_fbp') ||
                name.startsWith('__utm') || name.startsWith('_gcl') || name.startsWith('_hj') ||
                name.startsWith('fr') || name.startsWith('IDE') || name.startsWith('NID') ||
                name.startsWith('test_cookie') || name.startsWith('_uetsid')) {
              document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
              document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + location.hostname;
              document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + location.hostname;
            }
          });
        } catch(e) {}
      }
    });

    // Clear localStorage items that look like trackers
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(function(key) {
        const k = key.toLowerCase();
        if (k.includes('analytics') || k.includes('tracking') || k.includes('_ga') ||
            k.includes('_fb') || k.includes('amplitude') || k.includes('mixpanel') ||
            k.includes('segment') || k.includes('hotjar') || k.includes('clarity') ||
            k.includes('mouseflow') || k.includes('heap') || k.includes('pendo')) {
          localStorage.removeItem(key);
        }
      });
    } catch(e) {}
  });
})();
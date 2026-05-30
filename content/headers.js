// CHAFF Header Protection — Do Not Track, Referer Stripping, Client Hints Blocking
(function() {
  'use strict';
  chrome.storage.local.get(['shieldEnabled','headersProtectionEnabled'], function(s) {
    if (s.shieldEnabled === false || s.headersProtectionEnabled === false) return;

    // Set Do Not Track signal
    if (navigator.doNotTrack !== '1') {
      try {
        Object.defineProperty(navigator, 'doNotTrack', {
          get: () => '1',
          configurable: true
        });
      } catch(e) {}
    }

    // Block navigator.maxTouchPoints fingerprinting (randomize)
    if (navigator.maxTouchPoints !== undefined) {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        get: () => Math.random() > 0.7 ? 1 : 0,
        configurable: true
      });
    }

    // Block navigator.connection fingerprinting
    if (navigator.connection) {
      Object.defineProperty(navigator, 'connection', {
        get: () => undefined,
        configurable: true
      });
    }

    // Block navigator.getBattery fingerprinting
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 0.5 + Math.random() * 0.5,
        addEventListener: () => {},
        removeEventListener: () => {},
        onchargingchange: null,
        onchargingtimechange: null,
        ondischargingtimechange: null,
        onlevelchange: null
      });
    }

    // Block navigator.webkitGetUserMedia / getUserMedia fingerprinting noise
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const origEnumerate = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
      navigator.mediaDevices.enumerateDevices = async function() {
        const devices = await origEnumerate();
        return devices.map(d => ({
          deviceId: d.deviceId,
          groupId: d.groupId,
          kind: d.kind,
          label: '' // Strip device labels (they contain unique IDs)
        }));
      };
    }

    // Block navigator.permissions.query for persistent-storage (prevents storage tracking)
    if (navigator.permissions && navigator.permissions.query) {
      const origQuery = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = function(desc) {
        if (desc && desc.name === 'persistent-storage') {
          return Promise.resolve({ state: 'denied', onchange: null });
        }
        return origQuery(desc);
      };
    }

    // Block navigator.xr (WebXR fingerprinting)
    if (navigator.xr) {
      try { delete navigator.xr; } catch(e) {
        Object.defineProperty(navigator, 'xr', { get: () => undefined, configurable: true });
      }
    }

    // Spoof screen resolution noise (subtle)
    const origScreen = window.screen;
    const screenNoise = () => Math.floor(Math.random() * 2);
    try {
      Object.defineProperty(window, 'screen', {
        get: () => new Proxy(origScreen, {
          get: function(target, prop) {
            const val = target[prop];
            if (prop === 'availWidth' || prop === 'availHeight' || prop === 'width' || prop === 'height') {
              return typeof val === 'number' ? val + screenNoise() : val;
            }
            return val;
          }
        }),
        configurable: true
      });
    } catch(e) {}
  });
})();
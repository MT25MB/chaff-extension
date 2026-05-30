// CHAFF Extra Fingerprint Protection — Audio, Timezone, Language, Geolocation
(function() {
  'use strict';
  chrome.storage.local.get(['shieldEnabled','fingerprintExtraEnabled'], function(s) {
    if (s.shieldEnabled === false || s.fingerprintExtraEnabled === false) return;

    // Deterministic hash for per-domain consistency
    let sk = sessionStorage.getItem('_chaff');
    if (!sk) {
      sk = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('');
      sessionStorage.setItem('_chaff', sk);
    }
    function h(salt) {
      const str = sk + location.hostname + (salt||'');
      let n = 2166136261;
      for (let i = 0; i < str.length; i++) { n ^= str.charCodeAt(i); n = Math.imul(n,16777619)>>>0; }
      return (n & 0xFFFFFF) / 0xFFFFFF;
    }
    function ri(min,max,salt) { return Math.floor(h(salt)*(max-min+1))+min; }

    // AudioContext fingerprint noise
    if (window.AudioContext || window.webkitAudioContext) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const origCreateOscillator = AC.prototype.createOscillator;
      AC.prototype.createOscillator = function() {
        const osc = origCreateOscillator.call(this);
        const origFreq = Object.getOwnPropertyDescriptor(OscillatorNode.prototype, 'frequency');
        if (origFreq && origFreq.set) {
          const origSet = origFreq.set;
          Object.defineProperty(osc.frequency, 'value', {
            get: function() { return origFreq.get.call(this); },
            set: function(v) { return origSet.call(this, v + (Math.random() - 0.5) * 0.001); },
            configurable: true
          });
        }
        return osc;
      };
      const origCreateDynamicsCompressor = AC.prototype.createDynamicsCompressor;
      AC.prototype.createDynamicsCompressor = function() {
        const comp = origCreateDynamicsCompressor.call(this);
        const origThreshold = Object.getOwnPropertyDescriptor(DynamicsCompressorNode.prototype, 'threshold');
        if (origThreshold && origThreshold.get) {
          const origGet = origThreshold.get;
          Object.defineProperty(comp.threshold, 'value', {
            get: function() { return origGet.call(this) + (Math.random() - 0.5) * 0.001; },
            configurable: true
          });
        }
        return comp;
      };
      const origGetOutputTimestamp = AC.prototype.getOutputTimestamp;
      if (origGetOutputTimestamp) {
        AC.prototype.getOutputTimestamp = function() {
          const ts = origGetOutputTimestamp.call(this);
          return { contextTime: ts.contextTime, performanceTime: ts.performanceTime + (Math.random() - 0.5) * 0.0001 };
        };
      }
    }

    // Timezone spoofing
    const timezones = [
      'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
      'Europe/London','Europe/Berlin','Europe/Paris','Europe/Madrid',
      'Asia/Tokyo','Asia/Shanghai','Asia/Kolkata','Australia/Sydney'
    ];
    const fakeTz = timezones[ri(0, timezones.length - 1, 'tz')];
    try {
      const origDateTimeFormat = Intl.DateTimeFormat;
      const origResolvedOptions = origDateTimeFormat.prototype.resolvedOptions;
      origDateTimeFormat.prototype.resolvedOptions = function() {
        const opts = origResolvedOptions.call(this);
        opts.timeZone = fakeTz;
        return opts;
      };
    } catch(e) {}

    // Language spoofing
    const languages = [
      ['en-US','en'],['en-GB','en'],['en-CA','en'],['en-AU','en'],
      ['de-DE','de'],['fr-FR','fr'],['es-ES','es'],['it-IT','it'],
      ['pt-BR','pt'],['ja-JP','ja'],['zh-CN','zh'],['ko-KR','ko']
    ];
    const fakeLang = languages[ri(0, languages.length - 1, 'lang')];
    Object.defineProperty(navigator, 'language', { get: () => fakeLang[0], configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => [...fakeLang], configurable: true });

    // Geolocation spoofing — return a plausible location
    const fakeLocations = [
      { lat: 40.7128, lng: -74.0060 },  // New York
      { lat: 51.5074, lng: -0.1278 },   // London
      { lat: 48.8566, lng: 2.3522 },    // Paris
      { lat: 35.6762, lng: 139.6503 },  // Tokyo
      { lat: -33.8688, lng: 151.2093 }, // Sydney
      { lat: 52.5200, lng: 13.4050 },   // Berlin
      { lat: 41.9028, lng: 12.4964 },   // Rome
      { lat: 37.7749, lng: -122.4194 }  // San Francisco
    ];
    const fakeLoc = fakeLocations[ri(0, fakeLocations.length - 1, 'geo')];

    if (navigator.geolocation) {
      const origGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
      const origWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);

      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        const jitterLat = fakeLoc.lat + (Math.random() - 0.5) * 0.01;
        const jitterLng = fakeLoc.lng + (Math.random() - 0.5) * 0.01;
        setTimeout(() => {
          success({
            coords: {
              latitude: jitterLat,
              longitude: jitterLng,
              accuracy: 10 + Math.random() * 50,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        }, 100 + Math.random() * 200);
      };

      navigator.geolocation.watchPosition = function(success, error, options) {
        navigator.geolocation.getCurrentPosition(success, error, options);
        return 1;
      };
    }
  });
})();
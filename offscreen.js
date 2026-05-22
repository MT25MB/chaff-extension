// CHAFF Offscreen Document
// Loads noise URLs in hidden iframes so tracking scripts actually execute.
// This makes the noise real — surveillance systems see genuine page visits.

const MAX_CONCURRENT = 3;
const LOAD_DURATION_MS = 10000; // keep page loaded for 10s so scripts run

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'LOAD_NOISE') return;
  loadNoisePages(msg.urls);
});

function loadNoisePages(urls) {
  const toLoad = urls.slice(0, MAX_CONCURRENT);
  toLoad.forEach((url, i) => {
    // Stagger loading to look more human
    setTimeout(() => loadInIframe(url), i * 2000);
  });
}

function loadInIframe(url) {
  try {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = [
      'position:absolute',
      'width:1280px',
      'height:720px',
      'opacity:0.001', // near-invisible but actually renders
      'pointer-events:none',
      'left:-9999px',
      'top:-9999px',
    ].join(';');

    // Allow scripts to run (needed for trackers to fire)
    // But restrict dangerous capabilities
    iframe.sandbox = 'allow-scripts allow-same-origin allow-forms';
    iframe.src = url;

    iframe.onload = () => {
      // Page loaded — trackers have fired. Remove after duration.
      setTimeout(() => {
        try { iframe.remove(); } catch(e) {}
      }, LOAD_DURATION_MS);
    };

    iframe.onerror = () => {
      try { iframe.remove(); } catch(e) {}
    };

    document.body.appendChild(iframe);

  } catch(e) {
    console.warn('[CHAFF offscreen] Failed to load:', url, e);
  }
}
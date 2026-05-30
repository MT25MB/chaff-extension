// CHAFF Background Service Worker
const NOISE_SITES = [
  "https://www.weather.gov","https://www.loc.gov","https://en.wikipedia.org/wiki/Special:Random",
  "https://www.bbc.com","https://www.reuters.com","https://www.theguardian.com",
  "https://www.nature.com","https://www.sciencedaily.com","https://arstechnica.com",
  "https://www.wired.com","https://www.npr.org","https://www.pbs.org",
  "https://www.propublica.org","https://news.ycombinator.com","https://www.reddit.com/r/todayilearned",
  "https://www.reddit.com/r/science","https://www.khanacademy.org","https://www.goodreads.com",
  "https://www.imdb.com","https://www.history.com","https://www.smithsonianmag.com",
  "https://www.theatlantic.com","https://www.vox.com","https://archive.org",
  "https://www.investopedia.com","https://www.healthline.com","https://www.snopes.com",
  "https://www.merriam-webster.com","https://www.consumerreports.org","https://www.gutenberg.org"
];

const TRACKING_PARAMS = [
  'utm_source','utm_medium','utm_campaign','utm_term','utm_content',
  'fbclid','gclid','gclsrc','dclid','gbraid','wbraid',
  'mc_cid','mc_eid',
  '_hsenc','_hsmi','hsCtaTracking',
  'msclkid','twclid',
  'oly_enc_id','oly_anon_id',
  '_openstat','vero_id','wickedid',
  'yclid','mkt_tok',
  '__s','_ga','_gl','li_fat_id',
  'tt_medium','tt_content'
];

const DEFAULTS = {
  shieldEnabled: true, fingerprintEnabled: true,
  noiseEnabled: true, exifEnabled: true,
  noiseIntensity: 2, statsNoise: 0,
  fingerprintExtraEnabled: true,
  headersProtectionEnabled: true,
  autoClearEnabled: false,
  stripTrackingParams: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const s = await chrome.storage.local.get(null);
  if (s.shieldEnabled === undefined) {
    await chrome.storage.local.set(DEFAULTS);
  } else {
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (s[k] === undefined) await chrome.storage.local.set({ [k]: v });
    }
  }
  scheduleNoise();
  console.log('[CHAFF] Shield activated. The sky fills with noise.');
});

function scheduleNoise() {
  chrome.alarms.clearAll();
  chrome.alarms.create('noise', { delayInMinutes: 5, periodInMinutes: 20 + Math.random() * 20 });
}

// --- Offscreen Document ---
let offscreenCreated = false;

async function ensureOffscreen() {
  if (offscreenCreated) return;
  try {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['IFRAME_SCRIPTING'],
      justification: 'Load noise pages in hidden iframes to generate decoy tracking signals'
    });
    offscreenCreated = true;
  } catch(e) {
    offscreenCreated = true;
  }
}

// --- Noise Generation ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'noise') return;
  const s = await chrome.storage.local.get(['shieldEnabled','noiseEnabled','noiseIntensity','statsNoise']);
  if (s.shieldEnabled === false || s.noiseEnabled === false) return;

  const count = s.noiseIntensity || 2;
  const selected = [];
  for (let i = 0; i < count; i++) {
    selected.push(NOISE_SITES[Math.floor(Math.random() * NOISE_SITES.length)]);
  }

  try {
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: 'LOAD_NOISE', urls: selected });
  } catch(e) {
    for (const url of selected) {
      try {
        await fetch(url, { signal: AbortSignal.timeout(5000) });
      } catch(e) {}
    }
  }

  const now = Date.now();
  await chrome.storage.local.set({
    statsNoise: (s.statsNoise || 0) + count,
    lastNoiseTime: now
  });
});

chrome.runtime.onSuspend.addListener(() => {
  offscreenCreated = false;
});

// --- URL Tracking Parameter Stripping ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const s = await chrome.storage.local.get(['stripTrackingParams']);
  if (s.stripTrackingParams === false) return;

  try {
    const url = new URL(details.url);
    let changed = false;
    for (const param of TRACKING_PARAMS) {
      if (url.searchParams.has(param)) {
        url.searchParams.delete(param);
        changed = true;
      }
    }
    if (changed) {
      chrome.tabs.update(details.tabId, { url: url.toString() });
    }
  } catch(e) {}
});

// --- Auto-Clear Storage on Tab Close ---
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  const s = await chrome.storage.local.get(['shieldEnabled','autoClearEnabled']);
  if (s.shieldEnabled === false || s.autoClearEnabled === false) return;

  try {
    if (chrome.browsingData) {
      chrome.browsingData.remove({
        originTypes: { unprotected_web: true },
        since: Date.now() - 86400000
      }, {
        cookies: true,
        localStorage: true,
        sessionStorage: true,
        indexedDB: true,
        cache: true
      });
    }
  } catch(e) {}
});

// --- Message Handler ---
chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'GET_STATS') { chrome.storage.local.get(['statsNoise'], reply); return true; }
  if (msg.type === 'SET') {
    const validKeys = [
      'shieldEnabled','fingerprintEnabled','noiseEnabled','exifEnabled','noiseIntensity',
      'fingerprintExtraEnabled','headersProtectionEnabled','autoClearEnabled','stripTrackingParams'
    ];
    if (validKeys.includes(msg.key)) {
      chrome.storage.local.set({ [msg.key]: msg.val });
      if (['noiseEnabled','noiseIntensity'].includes(msg.key)) scheduleNoise();
    }
  }
});
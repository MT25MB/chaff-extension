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

const DEFAULTS = {
  shieldEnabled: true, fingerprintEnabled: true,
  noiseEnabled: true, exifEnabled: true,
  noiseIntensity: 2, statsNoise: 0
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

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== 'noise') return;
  const s = await chrome.storage.local.get(['shieldEnabled','noiseEnabled','noiseIntensity','statsNoise']);
  if (s.shieldEnabled === false || s.noiseEnabled === false) return;
  const count = s.noiseIntensity || 2;
  for (let i = 0; i < count; i++) {
    const url = NOISE_SITES[Math.floor(Math.random() * NOISE_SITES.length)];
    try {
      await fetch(url, { method:'GET', headers:{'Accept':'text/html','Cache-Control':'no-cache'}, signal: AbortSignal.timeout(5000) });
    } catch(e) {}
  }
  await chrome.storage.local.set({ statsNoise: (s.statsNoise || 0) + count });
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg.type === 'GET_STATS') { chrome.storage.local.get(['statsNoise'], reply); return true; }
  if (msg.type === 'SET') {
    const validKeys = ['shieldEnabled','fingerprintEnabled','noiseEnabled','exifEnabled','noiseIntensity'];
    if (validKeys.includes(msg.key)) {
      chrome.storage.local.set({ [msg.key]: msg.val });
      if (['noiseEnabled','noiseIntensity'].includes(msg.key)) scheduleNoise();
    }
  }
});
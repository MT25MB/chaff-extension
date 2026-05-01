const $ = id => document.getElementById(id);
const labels = {1:'1 decoy visit / hour',2:'2 decoy visits / hour',3:'4 decoy visits / hour',4:'6 decoy visits / hour',5:'10 decoy visits / hour'};

async function init() {
  const s = await chrome.storage.local.get(['shieldEnabled','fingerprintEnabled','noiseEnabled','exifEnabled','noiseIntensity','statsNoise']);
  $('master').checked  = s.shieldEnabled !== false;
  $('fp').checked      = s.fingerprintEnabled !== false;
  $('noise').checked   = s.noiseEnabled !== false;
  $('exif').checked    = s.exifEnabled !== false;
  $('intensity').value = s.noiseIntensity || 2;
  $('sNoise').textContent = (s.statsNoise || 0).toLocaleString();
  $('ilabel').textContent = labels[s.noiseIntensity || 2];
  const sk = sessionStorage.getItem('_chaff');
  $('sKey').textContent = sk ? sk.slice(0,6).toUpperCase() : 'NEW';
  updateState(s.shieldEnabled !== false);
}

function updateState(on) {
  $('tagline').textContent = on ? 'Shield Active' : 'Shield Paused';
  $('tagline').style.color = on ? '#4ade80' : '#555';
}
function set(key,val) { chrome.runtime.sendMessage({type:'SET',key,val}); }

$('master').addEventListener('change', e => { set('shieldEnabled',e.target.checked); updateState(e.target.checked); });
$('fp').addEventListener('change', e => set('fingerprintEnabled',e.target.checked));
$('noise').addEventListener('change', e => set('noiseEnabled',e.target.checked));
$('exif').addEventListener('change', e => set('exifEnabled',e.target.checked));
$('intensity').addEventListener('input', e => { const v=parseInt(e.target.value); $('ilabel').textContent=labels[v]; set('noiseIntensity',v); });
init();
// CHAFF Fingerprint Randomization — runs at document_start before any page JS
(function() {
  'use strict';
  let sk = sessionStorage.getItem('_chaff');
  if (!sk) {
    sk = Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('');
    sessionStorage.setItem('_chaff', sk);
  }
  function h(salt) {
    const s = sk + location.hostname + (salt||'');
    let n = 2166136261;
    for (let i = 0; i < s.length; i++) { n ^= s.charCodeAt(i); n = Math.imul(n,16777619)>>>0; }
    return (n & 0xFFFFFF) / 0xFFFFFF;
  }
  function ri(min,max,salt) { return Math.floor(h(salt)*(max-min+1))+min; }
  function clamp(v) { return Math.max(0,Math.min(255,Math.round(v))); }

  // Canvas
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origGetImgData = CanvasRenderingContext2D.prototype.getImageData;
  function noiseCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx || !canvas.width || !canvas.height) return;
    try {
      const d = origGetImgData.call(ctx,0,0,canvas.width,canvas.height);
      const n = h('cv')*6;
      for (let i=0;i<d.data.length;i+=4) {
        d.data[i]=clamp(d.data[i]+(Math.random()-.5)*n);
        d.data[i+1]=clamp(d.data[i+1]+(Math.random()-.5)*n);
        d.data[i+2]=clamp(d.data[i+2]+(Math.random()-.5)*n);
      }
      ctx.putImageData(d,0,0);
    } catch(e) {}
  }
  HTMLCanvasElement.prototype.toDataURL = function(...a) { noiseCanvas(this); return origToDataURL.apply(this,a); };
  CanvasRenderingContext2D.prototype.getImageData = function(...a) {
    const d = origGetImgData.apply(this,a);
    const n = h('gid')*4;
    for (let i=0;i<d.data.length;i+=4) {
      d.data[i]=clamp(d.data[i]+(Math.random()-.5)*n);
      d.data[i+1]=clamp(d.data[i+1]+(Math.random()-.5)*n);
      d.data[i+2]=clamp(d.data[i+2]+(Math.random()-.5)*n);
    }
    return d;
  };

  // WebGL
  const renderers = [
    'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)',
    'ANGLE (AMD, Radeon RX 5500 XT Direct3D11 vs_5_0 ps_5_0)'
  ];
  const fakeR = renderers[ri(0,renderers.length-1,'wglr')];
  const fakeV = ['Google Inc. (Intel)','Google Inc. (NVIDIA)','Google Inc. (AMD)'][ri(0,2,'wglv')];
  ['WebGLRenderingContext','WebGL2RenderingContext'].forEach(cls => {
    if (!window[cls]) return;
    const orig = window[cls].prototype.getParameter;
    window[cls].prototype.getParameter = function(p) {
      if (p===37445) return fakeV; if (p===37446) return fakeR; return orig.call(this,p);
    };
  });

  // Hardware
  Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>ri(2,16,'hc'),configurable:true});
  Object.defineProperty(navigator,'deviceMemory',{get:()=>[2,4,8,16][ri(0,3,'dm')],configurable:true});
  Object.defineProperty(navigator,'plugins',{get:()=>[],configurable:true});

  // Timing jitter
  const origNow = Performance.prototype.now;
  Performance.prototype.now = function() { return origNow.call(this)+(Math.random()-.5)*2; };
  const origDN = Date.now; Date.now = ()=>origDN()+Math.floor((Math.random()-.5)*10);

  // WebRTC
  if (window.RTCPeerConnection) {
    const RPC = window.RTCPeerConnection;
    window.RTCPeerConnection = function(cfg,...a) { if (cfg&&cfg.iceServers) cfg.iceServers=[]; return new RPC(cfg,...a); };
    window.RTCPeerConnection.prototype = RPC.prototype;
  }
})();
// CHAFF EXIF Stripper — removes GPS and metadata from image uploads
(function() {
  'use strict';
  chrome.storage.local.get(['shieldEnabled','exifEnabled'], function(s) {
    if (s.shieldEnabled === false || s.exifEnabled === false) return;

    function strip(file, done) {
      if (!file.type.startsWith('image/')) return done(file);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width=img.naturalWidth; c.height=img.naturalHeight;
        c.getContext('2d').drawImage(img,0,0);
        URL.revokeObjectURL(url);
        const mime = file.type.includes('png') ? 'image/png' : 'image/jpeg';
        c.toBlob(blob => {
          done(blob ? new File([blob],file.name,{type:mime,lastModified:Date.now()}) : file);
        }, mime, 0.92);
      };
      img.onerror = () => { URL.revokeObjectURL(url); done(file); };
      img.src = url;
    }
    function toast(msg) {
      const t = document.createElement('div');
      t.textContent = msg;
      Object.assign(t.style,{position:'fixed',bottom:'20px',right:'20px',zIndex:'2147483647',
        background:'#0f1f0f',color:'#4ade80',border:'1px solid #1e3a1e',padding:'10px 16px',
        borderRadius:'8px',fontFamily:'system-ui',fontSize:'13px',fontWeight:'600',
        boxShadow:'0 4px 20px rgba(0,0,0,.5)',transition:'opacity .5s',pointerEvents:'none'});
      document.body.appendChild(t);
      setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),500);},3000);
    }
    document.addEventListener('change', e => {
      const inp = e.target;
      if (inp.tagName!=='INPUT'||inp.type!=='file'||!inp.files.length) return;
      if (!Array.from(inp.files).some(f=>f.type.startsWith('image/'))) return;
      const dt = new DataTransfer(); let done=0;
      Array.from(inp.files).forEach(file => {
        strip(file, clean => { dt.items.add(clean); if (++done===inp.files.length) { inp.files=dt.files; toast('CHAFF: GPS data removed from photo'); } });
      });
    }, true);
  });
})();
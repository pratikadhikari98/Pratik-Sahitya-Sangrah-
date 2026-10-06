// ============================================================
//  ADMIN-EXTRA.JS — एडमिन प्यानलका थप सुविधाहरू
//  📢 सूचना सम्पादन · 🌐 साइट/बारेमा · 💾 Backup/Restore · 🔐 PIN र मेनु
//  ✂️ फोटो क्रप · 👁 पूर्वावलोकन
//  सबै डाटा data/poems.json भित्र (news, site, order) राखिन्छ।
// ============================================================
(function () {
  const C = window.AdminCore;
  if (!C) return;
  const { h, $, body, msg } = C;
  let unlocked = false;

  const backBar = (extra) => `
    <div class="admin-actions">
      ${extra || ''}
      <button class="admin-btn ghost" onclick="AdminCore.viewList()">← सूचीमा फर्कनुस्</button>
    </div>`;

  async function refreshPublic(db) {
    if (typeof applyRemoteData === 'function') applyRemoteData(db);
    if (typeof refreshSite === 'function') refreshSite();
  }

  // ======================================================
  //  ✂️ फोटो क्रप (३:४) — कभरको अनुपात
  // ======================================================
  C.crop = function (file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.onload = () => {
        const VW = 240, VH = 320;
        const w = img.naturalWidth, hgt = img.naturalHeight;
        const base = Math.max(VW / w, VH / hgt);
        let zoom = 1, s = base, x = (VW - w * s) / 2, y = (VH - hgt * s) / 2;
        const ov = document.createElement('div');
        ov.className = 'ax-overlay';
        ov.innerHTML = `
          <div class="ax-box">
            <div class="ax-title">✂️ कभर मिलाउनुस् (३:४)</div>
            <div class="ax-crop-view" id="axView"><img id="axImg" alt="" draggable="false" /></div>
            <input type="range" id="axZoom" min="1" max="3" step="0.01" value="1" class="ax-range" />
            <div class="admin-note" style="margin:6px 0">औँलाले सार्नुस् · स्लाइडरले ठूलो/सानो</div>
            <div class="admin-actions" style="justify-content:center">
              <button class="admin-btn" id="axOk">✔ क्रप गर्नुस्</button>
              <button class="admin-btn ghost" id="axRaw">जस्तो छ त्यस्तै</button>
              <button class="admin-btn ghost" id="axNo">रद्द</button>
            </div>
          </div>`;
        document.body.appendChild(ov);
        const view = ov.querySelector('#axView');
        const im = ov.querySelector('#axImg');
        im.src = url;
        im.style.width = w + 'px';
        im.style.height = hgt + 'px';
        const clamp = () => {
          x = Math.min(0, Math.max(VW - w * s, x));
          y = Math.min(0, Math.max(VH - hgt * s, y));
        };
        const draw = () => { clamp(); im.style.transform = `translate(${x}px,${y}px) scale(${s})`; };
        draw();
        let drag = null;
        view.addEventListener('pointerdown', e => { drag = { px: e.clientX, py: e.clientY, x, y }; view.setPointerCapture(e.pointerId); });
        view.addEventListener('pointermove', e => { if (!drag) return; x = drag.x + e.clientX - drag.px; y = drag.y + e.clientY - drag.py; draw(); });
        const up = () => { drag = null; };
        view.addEventListener('pointerup', up);
        view.addEventListener('pointercancel', up);
        ov.querySelector('#axZoom').oninput = e => {
          const cx = (VW / 2 - x) / s, cy = (VH / 2 - y) / s; // केन्द्रको बिन्दु
          zoom = +e.target.value;
          s = base * zoom;
          x = VW / 2 - cx * s;
          y = VH / 2 - cy * s;
          draw();
        };
        const close = val => { URL.revokeObjectURL(url); ov.remove(); resolve(val); };
        ov.querySelector('#axNo').onclick = () => close(null);
        ov.querySelector('#axRaw').onclick = () => close(file);
        ov.querySelector('#axOk').onclick = () => {
          const cv = document.createElement('canvas');
          cv.width = 720; cv.height = 960;
          const ctx = cv.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, 720, 960);
          ctx.drawImage(img, -x / s, -y / s, VW / s, VH / s, 0, 0, 720, 960);
          cv.toBlob(b => close(b ? new File([b], 'cover.jpg', { type: 'image/jpeg' }) : file), 'image/jpeg', 0.92);
        };
      };
      img.src = url;
    });
  };

  // ======================================================
  //  👁 पूर्वावलोकन — पाठकले जस्तो देखिने
  // ======================================================
  C.preview = function (p) {
    const catMap = { kavita: 'कविता', lekh: 'लेख', gazal: 'गजल' };
    let dateLabel = p.date || '';
    try {
      const bs = engToBS(new Date(p.date));
      if (bs) dateLabel = `${toNepaliNum(bs.day)} ${NEPALI_MONTHS_BS[bs.month - 1]} ${toNepaliNum(bs.year)}`;
    } catch (e) {}
    let size = 19;
    const ov = document.createElement('div');
    ov.className = 'ax-overlay ax-preview';
    ov.innerHTML = `
      <div class="ax-preview-bar">
        <button class="admin-btn ghost small" id="pvClose">✕ बन्द</button>
        <span style="flex:1"></span>
        <button class="admin-btn ghost small" id="pvMinus">A−</button>
        <button class="admin-btn ghost small" id="pvPlus">A+</button>
      </div>
      <div class="modal-body">
        ${p.draft ? '<div class="admin-note">📝 Draft — साइटमा देखिँदैन</div>' : ''}
        <h1 class="poem-title-large">${h(String(p.title || '').trim() || '(शीर्षक छैन)')}</h1>
        <div class="poem-meta-row">
          <span class="poem-meta-badge accent">${catMap[p.category] || ''}</span>
          <span class="poem-meta-badge">⏱ ${h(p.readTime || '')}</span>
          <span class="poem-meta-badge">📅 ${h(dateLabel)}</span>
        </div>
        <div class="poem-divider"></div>
        <div class="poem-content" id="pvText" style="font-size:${size}px">${h(p.content || '')}</div>
        <div class="poem-tags">${(p.tags || []).map(t => `<span class="poem-tag">#${h(t)}</span>`).join('')}</div>
      </div>`;
    document.body.appendChild(ov);
    const t = ov.querySelector('#pvText');
    ov.querySelector('#pvClose').onclick = () => ov.remove();
    ov.querySelector('#pvPlus').onclick = () => { size = Math.min(34, size + 2); t.style.fontSize = size + 'px'; };
    ov.querySelector('#pvMinus').onclick = () => { size = Math.max(13, size - 2); t.style.fontSize = size + 'px'; };
  };

  // ======================================================
  //  📢 सूचना (blackboard) सम्पादन
  // ======================================================
  window.adminNews = function () {
    const db = C.normDB(window.REMOTE_DB);
    let list = (db.news || window.BASE_NEWS || (typeof NEWS_DATA !== 'undefined' ? NEWS_DATA : []))
      .map(n => ({ id: n.id, text: n.text }));
    const draw = () => {
      body().innerHTML = `
        <div class="admin-section-title">📢 सूचनाहरू (${list.length})</div>
        <p class="admin-note">होमपेजको कालो पाटीमा आफैं बदलिँदै देखिने सूचना। सादा पाठ (emoji सहित) लेख्नुस्।</p>
        <div class="admin-msg" id="adminMsg" style="display:none"></div>
        <div class="admin-list">
          ${list.map((n, i) => `
            <div class="admin-news-row">
              <textarea class="admin-textarea ax-news" data-i="${i}" rows="2">${h(n.text)}</textarea>
              <div class="admin-news-btns">
                <button class="admin-btn ghost small" data-act="up" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
                <button class="admin-btn ghost small" data-act="down" data-i="${i}" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="admin-btn danger small" data-act="del" data-i="${i}">🗑️</button>
              </div>
            </div>`).join('') || '<p class="admin-note">कुनै सूचना छैन — होमपेजमा स्वागत सन्देश देखिन्छ।</p>'}
        </div>
        <div class="admin-actions">
          <button class="admin-btn ghost" id="nAdd">➕ नयाँ सूचना</button>
          <button class="admin-btn" id="nSave">💾 सेभ गर्नुस्</button>
          ${db.news ? '<button class="admin-btn ghost" id="nReset">↩️ सुरुको अवस्थामा</button>' : ''}
          <button class="admin-btn ghost" onclick="AdminCore.viewList()">रद्द</button>
        </div>`;
      body().querySelectorAll('.ax-news').forEach(el => el.oninput = () => { list[+el.dataset.i].text = el.value; });
      body().querySelectorAll('[data-act]').forEach(el => el.onclick = () => {
        const i = +el.dataset.i, a = el.dataset.act;
        if (a === 'del') list.splice(i, 1);
        if (a === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
        if (a === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
        draw();
      });
      $('nAdd').onclick = () => { list.push({ id: 'n' + Date.now(), text: '' }); draw(); };
      $('nSave').onclick = async () => {
        const clean = list.map((n, i) => ({ id: String(n.id || 'n' + Date.now() + i), text: String(n.text).trim() })).filter(n => n.text);
        msg('सेभ गर्दैछु...');
        try {
          const saved = await C.mutateDB(d => { d.news = clean; }, 'Update notices');
          await refreshPublic(saved);
          C.viewList();
          msg('✅ सूचना सेभ भयो।');
        } catch (e) { msg('सेभ भएन: ' + e.message, true); }
      };
      const rs = $('nReset');
      if (rs) rs.onclick = async () => {
        if (!confirm('सूचनाहरू news/*.js फाइलका सुरुका सूचनामा फर्काउने?')) return;
        try {
          const saved = await C.mutateDB(d => { d.news = null; }, 'Reset notices');
          await refreshPublic(saved);
          C.viewList();
        } catch (e) { msg('भएन: ' + e.message, true); }
      };
    };
    draw();
  };

  // ======================================================
  //  🌐 साइट — नाम र "बारेमा" पेज
  // ======================================================
  window.adminSite = function () {
    const db = C.normDB(window.REMOTE_DB);
    const site = db.site || {};
    const ab = site.about || {};
    let photoFile = null, photoUrl = '';
    body().innerHTML = `
      <div class="admin-section-title">🌐 साइट र "बारेमा" पेज</div>
      <p class="admin-note">खाली छोडिएको ठाउँमा अहिलेकै विवरण रहन्छ।</p>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <label class="admin-label">साइटको नाम (हेडरमा)</label>
      <input class="admin-input" id="sName" value="${h(site.siteName || '')}" placeholder="प्रतीक साहित्य संग्रह" />
      <label class="admin-label">नाम (बारेमा)</label>
      <input class="admin-input" id="aName" value="${h(ab.name || '')}" />
      <label class="admin-label">परिचय (subtitle)</label>
      <input class="admin-input" id="aSub" value="${h(ab.subtitle || '')}" />
      <label class="admin-label">ठेगाना</label>
      <input class="admin-input" id="aLoc" value="${h(ab.location || '')}" />
      <label class="admin-label">फोन</label>
      <input class="admin-input" id="aPhone" value="${h(ab.phone || '')}" inputmode="tel" />
      <label class="admin-label">Email</label>
      <input class="admin-input" id="aMail" value="${h(ab.email || '')}" inputmode="email" />
      <label class="admin-label">Facebook link (https://...)</label>
      <input class="admin-input" id="aFb" value="${h(ab.facebook || '')}" />
      <label class="admin-label">प्रोफाइल फोटो</label>
      <div class="admin-cover-box">
        <div class="admin-preview" id="aPrev">${ab.photo ? `<img src="${h(ab.photo)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />` : ''}</div>
        <div class="admin-cover-tools">
          <input type="file" id="aFile" accept="image/*" style="display:none" />
          <button type="button" class="admin-btn ghost" id="aPick">📷 फोटो छान्नुस्</button>
        </div>
      </div>
      <div class="admin-actions">
        <button class="admin-btn" id="aSave">💾 सेभ गर्नुस्</button>
        <button class="admin-btn ghost" onclick="AdminCore.viewList()">रद्द</button>
      </div>`;
    $('aPick').onclick = () => $('aFile').click();
    $('aFile').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      photoFile = f;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(f);
      $('aPrev').innerHTML = `<img src="${photoUrl}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px" />`;
    };
    $('aSave').onclick = async () => {
      const v = id => $(id).value.trim();
      const fb = v('aFb'), mail = v('aMail'), phone = v('aPhone');
      if (fb && !/^https?:\/\/\S+$/.test(fb)) return msg('Facebook link https:// बाट सुरु हुनुपर्छ।', true);
      if (mail && !/^[^\s@<>"']+@[^\s@<>"']+$/.test(mail)) return msg('Email मिलेन।', true);
      if (phone && !/^[+\d\s\-]{5,20}$/.test(phone)) return msg('फोन नम्बरमा अङ्क मात्र हुनुपर्छ।', true);
      $('aSave').disabled = true;
      msg('सेभ गर्दैछु...');
      try {
        let photo = ab.photo || '';
        if (photoFile) {
          const { b64, ext } = await C.compressImage(photoFile, 800);
          const path = `covers/admin-about-${Date.now().toString(36)}.${ext}`;
          const cfg = C.cfg();
          await C.api(path, 'PUT', { message: 'Update about photo', content: b64, branch: cfg.branch || 'main' });
          if (C.isAdminCover(photo)) C.deleteFileQuiet(photo);
          photo = path;
        }
        const next = { siteName: v('sName'), about: { name: v('aName'), subtitle: v('aSub'), location: v('aLoc'), phone, email: mail, facebook: fb, photo } };
        const saved = await C.mutateDB(d => { d.site = next; }, 'Update site settings');
        await refreshPublic(saved);
        C.viewList();
        msg('✅ सेभ भयो। "बारेमा" पेजमा १–२ मिनेटमा देखिन्छ।');
      } catch (e) {
        msg('सेभ भएन: ' + e.message, true);
        $('aSave').disabled = false;
      }
    };
  };

  // ======================================================
  //  💾 Backup / Restore
  // ======================================================
  window.adminBackup = function () {
    body().innerHTML = `
      <div class="admin-section-title">💾 Backup र Restore</div>
      <p class="admin-note">सबै रचना, सम्पादन, क्रम, सूचना र साइट सेटिङ एउटै JSON फाइलमा डाउनलोड हुन्छ।
        कभर फोटोहरू <code>covers/</code> मा GitHub मै रहन्छन् (JSON मा नाम मात्र हुन्छ)।</p>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <div class="admin-actions">
        <button class="admin-btn" id="bkDown">⬇️ Backup डाउनलोड</button>
        <button class="admin-btn ghost" id="bkUp">⬆️ Backup बाट फर्काउनुस्</button>
        <input type="file" id="bkFile" accept="application/json,.json" style="display:none" />
      </div>
      ${backBar()}`;
    $('bkDown').onclick = async () => {
      msg('ताजा डाटा तान्दैछु...');
      try {
        const { db } = await C.readDB();
        const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        const d = new Date();
        a.href = URL.createObjectURL(blob);
        a.download = `sahitya-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        msg('✅ Backup डाउनलोड भयो।');
      } catch (e) { msg('भएन: ' + e.message, true); }
    };
    $('bkUp').onclick = () => $('bkFile').click();
    $('bkFile').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const parsed = JSON.parse(await f.text());
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.poems) || !Array.isArray(parsed.hidden) || typeof parsed.overrides !== 'object') {
          return msg('यो Backup फाइल मिलेन।', true);
        }
        const norm = C.normDB(parsed);
        const info = `नयाँ रचना: ${norm.poems.length}, सम्पादित: ${Object.keys(norm.overrides).length}, लुकाइएका: ${norm.hidden.length}`;
        if (!confirm(`अहिलेको सबै एडमिन डाटा यो Backup ले बदल्छ।\n${info}\nजारी राख्ने?`)) return;
        msg('फर्काउँदैछु...');
        const saved = await C.mutateDB(d => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, norm); }, 'Restore backup');
        await refreshPublic(saved);
        C.viewList();
        msg('✅ Backup फर्कियो।');
      } catch (err) { msg('फर्काउन सकिएन: ' + err.message, true); }
    };
  };

  // ======================================================
  //  🔐 सुरक्षा — PIN र मेनु
  // ======================================================
  async function sha(text) {
    try {
      if (crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) {}
    let x = 5381; for (let i = 0; i < text.length; i++) x = ((x << 5) + x + text.charCodeAt(i)) | 0; // पुरानो ब्राउजरका लागि
    return 'f' + (x >>> 0).toString(16);
  }
  const newSalt = () => Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b => b.toString(16).padStart(2, '0')).join('');

  let fails = 0, lockUntil = 0;
  function viewPin() {
    body().innerHTML = `
      <div class="admin-section-title">🔐 PIN हाल्नुस्</div>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <input class="admin-input" id="pinIn" type="password" inputmode="numeric" autocomplete="off" placeholder="PIN" />
      <div class="admin-actions">
        <button class="admin-btn" id="pinOk">खोल्नुस्</button>
        <button class="admin-btn ghost" onclick="closeAdmin()">रद्द</button>
        <button class="admin-btn ghost" id="pinForgot">PIN बिर्सिएँ</button>
      </div>`;
    const go = async () => {
      if (Date.now() < lockUntil) return msg(`धेरै गलत प्रयास — ${Math.ceil((lockUntil - Date.now()) / 1000)} सेकेन्ड पर्खनुस्।`, true);
      const cfg = C.cfg();
      const ok = (await sha(cfg.pinSalt + $('pinIn').value)) === cfg.pinHash;
      if (ok) { unlocked = true; fails = 0; C.ready() ? C.viewList() : window.adminSettings(); return; }
      fails++;
      $('pinIn').value = '';
      if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; return msg('५ पटक गलत — ३० सेकेन्ड पर्खनुस्।', true); }
      msg('PIN मिलेन।', true);
    };
    $('pinOk').onclick = go;
    $('pinIn').onkeydown = e => { if (e.key === 'Enter') go(); };
    $('pinForgot').onclick = () => {
      if (!confirm('PIN बिर्सिएको भए यो ब्राउजरको एडमिन सेटिङ (GitHub token सहित) मेटिन्छ। फेरि token हाल्नुपर्छ। जारी राख्ने?')) return;
      C.resetCfg();
      C.applyMenu();
      unlocked = true;
      window.adminSettings();
    };
    setTimeout(() => $('pinIn') && $('pinIn').focus(), 50);
  }
  C.gate = function () {
    const cfg = C.cfg();
    if (!cfg.pinHash || unlocked) return false;
    viewPin();
    return true;
  };

  window.adminSecurity = function () {
    const cfg = C.cfg();
    body().innerHTML = `
      <div class="admin-section-title">🔐 सुरक्षा</div>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <label class="admin-check"><input type="checkbox" id="sMenu" ${cfg.showInMenu ? 'checked' : ''} /> यो फोनमा ⋮ मेनुमा "एडमिन प्यानल" देखाउने</label>
      <p class="admin-note">बन्द भए अरू पाठकले मेनुमा एडमिन देख्दैनन्। खोल्ने तरिका: होमपेजको 📖 लोगोमा ५ पटक छिटो छुनुस्, वा ठेगानाको अन्त्यमा <code>#admin</code> राख्नुस्।</p>
      <div class="admin-section-title">PIN</div>
      <p class="admin-note">${cfg.pinHash ? 'PIN राखिएको छ।' : 'PIN राखिएको छैन।'} PIN यही फोन/ब्राउजरमा मात्र लागू हुन्छ — प्यानल खोल्नुअघि सोधिन्छ।
        यसले GitHub token को सुरक्षा गर्दैन; token भएको फोन सुरक्षित राख्नुहोस्।</p>
      <label class="admin-label">${cfg.pinHash ? 'नयाँ PIN' : 'PIN (४–८ अङ्क)'}</label>
      <input class="admin-input" id="sPin" type="password" inputmode="numeric" autocomplete="off" />
      <label class="admin-label">PIN फेरि</label>
      <input class="admin-input" id="sPin2" type="password" inputmode="numeric" autocomplete="off" />
      <div class="admin-actions">
        <button class="admin-btn" id="sSave">💾 सेभ गर्नुस्</button>
        ${cfg.pinHash ? '<button class="admin-btn danger" id="sRemove">PIN हटाउनुस्</button>' : ''}
        <button class="admin-btn ghost" onclick="AdminCore.viewList()">← फर्कनुस्</button>
      </div>`;
    $('sMenu').onchange = e => { C.patchCfg({ showInMenu: e.target.checked }); C.applyMenu(); };
    $('sSave').onclick = async () => {
      const a = $('sPin').value, b = $('sPin2').value;
      if (!a && !b) return msg('PIN राखेको छैन — केही बदलिएन।');
      if (!/^\d{4,8}$/.test(a)) return msg('PIN ४ देखि ८ अङ्कको हुनुपर्छ।', true);
      if (a !== b) return msg('दुई PIN मिलेनन्।', true);
      const salt = newSalt();
      C.patchCfg({ pinSalt: salt, pinHash: await sha(salt + a) });
      unlocked = true;
      window.adminSecurity();
      msg('✅ PIN सेभ भयो।');
    };
    const rm = $('sRemove');
    if (rm) rm.onclick = () => {
      if (!confirm('PIN हटाउने?')) return;
      const c = C.cfg();
      C.patchCfg({ pinHash: '', pinSalt: '' });
      window.adminSecurity();
      msg('PIN हटाइयो।');
    };
  };
})();

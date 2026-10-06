// ============================================================
//  ADMIN.JS — एडमिन प्यानल (GitHub API बाट वेबसाइट भित्रैबाट कविता/कभर थप्ने, हटाउने)
//  डाटा  : data/poems.json  (नयाँ रचना + लुकाइएका + सम्पादित)
//  फोटो : covers/admin-*.webp
// ============================================================
(function () {
  const LS_KEY = 'sahitya_admin_cfg';
  const DB_PATH = 'data/poems.json';
  const COLORS = ['#dc143c', '#1e5aa8', '#1b7a4b', '#6a3fa0', '#c25b00', '#2b2b2b'];
  const CATS = { kavita: 'कविता', lekh: 'लेख', gazal: 'गजल' };

  let cfg = loadCfg();
  let form = null; // चलिरहेको फारमको अवस्था

  const $ = id => document.getElementById(id);
  const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function loadCfg() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (e) { return {}; } }
  function saveCfg() { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); }
  const ready = () => cfg.owner && cfg.repo && cfg.token;

  // ---------- modal ----------
  function ensureModal() {
    if ($('adminModal')) return;
    const d = document.createElement('div');
    d.className = 'modal-overlay';
    d.id = 'adminModal';
    d.innerHTML = `
      <div class="modal-content">
        <header class="header modal-site-header">
      <div class="header-left" onclick="closeAdmin()" style="cursor:pointer" title="गृहपृष्ठ">
        <div class="logo-icon">📖</div>
        <div class="logo-text">
          <span class="logo-main">प्रतीक साहित्य संग्रह</span>
          <span class="logo-sub">Kavita • Lekh • Gazal</span>
        </div>
      </div>
    </header>
        <div class="admin-title" style="padding:16px 16px 0;font-weight:700">🔐 एडमिन प्यानल</div>
        <div class="admin-body" id="adminBody"></div>
      </div>`;
    document.body.appendChild(d);
  }

  window.openAdmin = function () {
    if (typeof closeDropdown === 'function') closeDropdown();
    ensureModal();
    setTimeout(() => {
      $('adminModal').classList.add('open');
      document.body.style.overflow = 'hidden';
      if (typeof pushOverlayState === 'function') pushOverlayState('admin');
      ready() ? viewList() : viewSettings();
    }, 140);
  };
  window.closeAdmin = function () {
    const m = $('adminModal');
    if (!m || !m.classList.contains('open')) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
    if (typeof popOverlayStateIfMatches === 'function') popOverlayStateIfMatches('admin');
  };
  window.addEventListener('popstate', () => {
    const m = $('adminModal');
    if (m && m.classList.contains('open') && !(history.state && history.state.overlay === 'admin')) {
      m.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  const body = () => $('adminBody');
  function msg(text, err) {
    const el = $('adminMsg');
    if (el) { el.className = 'admin-msg' + (err ? ' err' : ''); el.textContent = text; el.style.display = text ? 'block' : 'none'; }
  }

  // ---------- GitHub API ----------
  function b64FromText(str) {
    const bytes = new TextEncoder().encode(str);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function textFromB64(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(u);
  }
  async function api(path, method, payload) {
    method = method || 'GET';
    let url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;
    if (method === 'GET') url += `?ref=${encodeURIComponent(cfg.branch || 'main')}&t=${Date.now()}`;
    const r = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + cfg.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: payload ? JSON.stringify(payload) : undefined
    });
    if (r.status === 404 && method === 'GET') return null;
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = new Error(data.message || 'HTTP ' + r.status);
      e.status = r.status;
      throw e;
    }
    return data;
  }
  function normDB(db) {
    db = db || {};
    return { poems: db.poems || [], hidden: db.hidden || [], overrides: db.overrides || {} };
  }
  async function readDB() {
    const f = await api(DB_PATH);
    if (!f) return { db: normDB(), sha: null };
    return { db: normDB(JSON.parse(textFromB64(f.content))), sha: f.sha };
  }
  // पढ्ने → बदल्ने → लेख्ने (conflict भए १ पटक फेरि प्रयास)
  async function mutateDB(fn, message) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const { db, sha } = await readDB();
      await fn(db);
      try {
        await api(DB_PATH, 'PUT', {
          message,
          content: b64FromText(JSON.stringify(db, null, 2)),
          branch: cfg.branch || 'main',
          sha: sha || undefined
        });
        return db;
      } catch (e) {
        if (e.status === 409 && attempt === 0) continue;
        throw e;
      }
    }
  }
  async function deleteFileQuiet(path) {
    try {
      const f = await api(path);
      if (f && f.sha) await api(path, 'DELETE', { message: 'Remove cover ' + path, sha: f.sha, branch: cfg.branch || 'main' });
    } catch (e) { /* फोटो हटाउन नसके पनि ठीक छ */ }
  }
  const isAdminCover = p => /^covers\/admin-[\w-]+\.(webp|jpg)$/.test(p || '');

  // फोटो घटाएर WebP बनाउने (WebP नमिल्ने ब्राउजरमा JPEG) (धेरै ठूलो फोटोले साइट ढिलो नहोस्)
  function compressImage(file, maxSide) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let out = c.toDataURL('image/webp', 0.85);
        let ext = 'webp';
        if (!out.startsWith('data:image/webp')) { out = c.toDataURL('image/jpeg', 0.85); ext = 'jpg'; }
        resolve({ b64: out.split(',')[1], ext });
      };
      img.onerror = () => reject(new Error('फोटो पढ्न सकिएन'));
      img.src = url;
    });
  }

  // ---------- VIEW: सेटिङ ----------
  function viewSettings() {
    body().innerHTML = `
      <div class="admin-section-title">⚙️ GitHub जडान</div>
      <p class="admin-note">
        GitHub → Settings → Developer settings → <b>Fine-grained tokens</b> मा यही repository मात्र छानेर
        <b>Contents: Read and write</b> अनुमति भएको token बनाउनुस्। Token यही फोन/ब्राउजरमा मात्र सेभ हुन्छ।
      </p>
      <label class="admin-label">GitHub username (owner)</label>
      <input class="admin-input" id="cfOwner" value="${h(cfg.owner || '')}" autocomplete="off" />
      <label class="admin-label">Repository नाम</label>
      <input class="admin-input" id="cfRepo" value="${h(cfg.repo || '')}" autocomplete="off" />
      <label class="admin-label">Branch</label>
      <input class="admin-input" id="cfBranch" value="${h(cfg.branch || 'main')}" autocomplete="off" />
      <label class="admin-label">Access Token</label>
      <input class="admin-input" id="cfToken" type="password" value="${h(cfg.token || '')}" autocomplete="off" />
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <div class="admin-actions">
        <button class="admin-btn" id="cfSave">जाँच गरी सेभ गर्नुस्</button>
        ${ready() ? '<button class="admin-btn ghost" onclick="adminBack()">रद्द</button>' : ''}
        ${ready() ? '<button class="admin-btn danger" id="cfLogout">Token हटाउनुस्</button>' : ''}
      </div>`;
    $('cfSave').onclick = async () => {
      const next = {
        owner: $('cfOwner').value.trim(),
        repo: $('cfRepo').value.trim(),
        branch: $('cfBranch').value.trim() || 'main',
        token: $('cfToken').value.trim()
      };
      if (!next.owner || !next.repo || !next.token) return msg('सबै खाली ठाउँ भर्नुस्।', true);
      const prev = cfg;
      cfg = next;
      $('cfSave').disabled = true;
      msg('जाँच गर्दैछु...');
      try {
        const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
          headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json' }
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || 'HTTP ' + r.status);
        if (j.permissions && j.permissions.push === false) throw new Error('यो token ले लेख्ने अनुमति (Contents: write) पाएको छैन।');
        saveCfg();
        viewList();
      } catch (e) {
        cfg = prev;
        msg('जडान भएन: ' + e.message, true);
        $('cfSave').disabled = false;
      }
    };
    const lo = $('cfLogout');
    if (lo) lo.onclick = () => { cfg = {}; localStorage.removeItem(LS_KEY); viewSettings(); };
  }
  window.adminBack = () => (ready() ? viewList() : closeAdmin());

  // ---------- VIEW: सूची ----------
  function currentList() {
    const db = normDB(window.REMOTE_DB);
    const hidden = new Set(db.hidden);
    const base = (window.BASE_KAVITA || []).filter(p => !hidden.has(p.id)).map(p => {
      const merged = Object.assign({}, p, db.overrides[p.id] || {});
      return Object.assign(merged, { _base: true });
    });
    const added = db.poems.map(p => Object.assign({}, p, { _base: false }));
    return { items: base.concat(added), hidden: (window.BASE_KAVITA || []).filter(p => hidden.has(p.id)) };
  }
  function thumbHTML(p) {
    const color = p.coverColor ? ` style="--cover-color:${h(p.coverColor)}"` : '';
    const inner = p.cover ? `<img src="${h(p.cover)}" alt="" />` : '';
    return `<div class="admin-thumb"><div class="book-face"${color}>${inner}</div></div>`;
  }
  function viewList() {
    const { items, hidden } = currentList();
    body().innerHTML = `
      <div class="admin-actions" style="margin-top:0">
        <button class="admin-btn" onclick="adminNew()">➕ नयाँ रचना</button>
        <button class="admin-btn ghost" onclick="adminZip()">📦 ZIP बाट साइट अपडेट</button>
        <button class="admin-btn ghost" onclick="adminSettings()">⚙️ सेटिङ</button>
      </div>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <div class="admin-section-title">रचनाहरू (${items.length})</div>
      <div class="admin-list">
        ${items.map(p => `
          <div class="admin-item">
            ${thumbHTML(p)}
            <div class="admin-item-info">
              <div class="admin-item-title">${String(p.title || '').trim() ? h(String(p.title).trim()) : '(शीर्षक छैन)'}</div>
              <div class="admin-item-sub">${CATS[p.category] || p.category} · ${p.cover ? 'फोटो कभर' : 'टेक्स्ट कभर'}</div>
            </div>
            <button class="admin-btn ghost small" onclick="adminEdit('${h(p.id)}')">✏️</button>
            <button class="admin-btn danger small" onclick="adminDelete('${h(p.id)}')">🗑️</button>
          </div>`).join('') || '<p class="admin-note">कुनै रचना छैन।</p>'}
      </div>
      ${hidden.length ? `
        <div class="admin-section-title">हटाइएका रचनाहरू</div>
        <div class="admin-list">
          ${hidden.map(p => `
            <div class="admin-item">
              <div class="admin-item-info"><div class="admin-item-title">${h(String(p.title).trim())}</div></div>
              <button class="admin-btn ghost small" onclick="adminRestore('${h(p.id)}')">↩️ फर्काउनुस्</button>
            </div>`).join('')}
        </div>` : ''}`;
    // GitHub बाट ताजा डाटा तान्ने (अरू ठाउँबाट बदलिएको भए)
    if (!window._adminSynced) {
      window._adminSynced = true;
      readDB().then(({ db }) => {
        if (JSON.stringify(db) !== JSON.stringify(normDB(window.REMOTE_DB))) {
          applyRemoteData(db);
          refreshSite();
          if ($('adminModal').classList.contains('open') && !form) viewList();
        }
      }).catch(() => {});
    }
  }
  window.adminSettings = viewSettings;
  window.AdminCore = { cfg: () => cfg, ready, body, msg, h, $, viewList, refreshAfterZip: () => {} };

  // ---------- VIEW: फारम ----------
  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  window.adminNew = function () {
    openForm({ id: 'a' + Date.now(), title: '', category: 'kavita', tags: [], cover: '', coverColor: COLORS[0], date: today(), readTime: '', featured: false, content: '' }, false);
  };
  window.adminEdit = function (id) {
    const it = currentList().items.find(p => p.id === id);
    if (!it) return;
    openForm(Object.assign({}, it), !!it._base);
  };
  function openForm(poem, isBase) {
    form = { poem, isBase, file: null, mode: poem.cover ? 'image' : 'text', origCover: poem.cover || '', previewUrl: '' };
    if (!poem.coverColor) poem.coverColor = COLORS[0];
    renderForm();
  }
  function renderForm() {
    const p = form.poem;
    body().innerHTML = `
      <label class="admin-label">शीर्षक</label>
      <input class="admin-input" id="fTitle" value="${h(String(p.title).trim())}" />
      <div class="admin-row">
        <div>
          <label class="admin-label">प्रकार</label>
          <select class="admin-select" id="fCat">
            ${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${p.category === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="admin-label">मिति</label>
          <input class="admin-input" id="fDate" type="date" value="${h(p.date)}" />
        </div>
      </div>
      <label class="admin-label">ट्याग (कमाले छुट्याउनुस्)</label>
      <input class="admin-input" id="fTags" value="${h((p.tags || []).map(t => String(t).trim()).join(', '))}" />
      <label class="admin-label">छन्द / पढ्ने समय (वैकल्पिक)</label>
      <input class="admin-input" id="fRead" value="${h(p.readTime || '')}" />

      <label class="admin-label">कभर</label>
      <div class="admin-seg">
        <button type="button" id="mImg" class="${form.mode === 'image' ? 'active' : ''}">🖼️ फोटो कभर</button>
        <button type="button" id="mTxt" class="${form.mode === 'text' ? 'active' : ''}">🔤 टेक्स्ट कभर</button>
      </div>
      <div class="admin-cover-box">
        <div class="admin-preview" id="fPreview"></div>
        <div class="admin-cover-tools" id="fTools"></div>
      </div>

      <label class="admin-label">रचना</label>
      <textarea class="admin-textarea" id="fContent">${h(p.content)}</textarea>
      <label class="admin-check"><input type="checkbox" id="fFeat" ${p.featured ? 'checked' : ''} /> मुख्य (featured)</label>

      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <div class="admin-actions">
        <button class="admin-btn" id="fSave">💾 सेभ गर्नुस्</button>
        <button class="admin-btn ghost" id="fCancel">रद्द</button>
      </div>`;
    $('fTitle').oninput = updatePreview;
    $('mImg').onclick = () => { collect(); form.mode = 'image'; renderForm(); };
    $('mTxt').onclick = () => { collect(); form.mode = 'text'; renderForm(); };
    $('fCancel').onclick = () => { form = null; viewList(); };
    $('fSave').onclick = saveForm;
    renderCoverTools();
    updatePreview();
  }
  function collect() {
    const p = form.poem;
    p.title = $('fTitle').value;
    p.category = $('fCat').value;
    p.date = $('fDate').value;
    p.tags = $('fTags').value.split(/[,،]/).map(t => t.replace(/['"`\\#]/g, '').trim()).filter(Boolean);
    p.readTime = $('fRead').value.trim();
    p.content = $('fContent').value;
    p.featured = $('fFeat').checked;
  }
  function renderCoverTools() {
    const t = $('fTools');
    if (form.mode === 'image') {
      const has = form.file || form.poem.cover;
      t.innerHTML = `
        <input type="file" id="fFile" accept="image/*" style="display:none" />
        <button type="button" class="admin-btn ghost" id="fPick">📷 फोटो छान्नुस्</button>
        ${has ? '<button type="button" class="admin-btn danger" id="fDrop">🗑️ फोटो हटाउनुस्</button>' : ''}
        <span class="admin-note" style="margin:0">फोटो हटाएमा शीर्षक नै कभरमा देखिन्छ।</span>`;
      $('fPick').onclick = () => $('fFile').click();
      $('fFile').onchange = e => {
        const f = e.target.files[0];
        if (!f) return;
        if (form.previewUrl) URL.revokeObjectURL(form.previewUrl);
        form.file = f;
        form.previewUrl = URL.createObjectURL(f);
        renderCoverTools();
        updatePreview();
      };
      const drop = $('fDrop');
      if (drop) drop.onclick = () => {
        collect();
        form.file = null;
        form.poem.cover = '';
        form.mode = 'text';
        renderForm();
      };
    } else {
      t.innerHTML = `
        <span class="admin-note" style="margin:0">कभरको रङ</span>
        <div class="admin-colors">
          ${COLORS.map(c => `<div class="admin-color ${form.poem.coverColor === c ? 'active' : ''}" data-c="${c}" style="background:${c}"></div>`).join('')}
        </div>`;
      t.querySelectorAll('.admin-color').forEach(el => el.onclick = () => { form.poem.coverColor = el.dataset.c; renderCoverTools(); updatePreview(); });
    }
  }
  function updatePreview() {
    const p = form.poem;
    const title = $('fTitle') ? $('fTitle').value : p.title;
    const color = /^#[0-9a-f]{3,8}$/i.test(p.coverColor || '') ? ` style="--cover-color:${p.coverColor}"` : '';
    const src = form.mode === 'image' ? (form.previewUrl || p.cover) : '';
    $('fPreview').innerHTML = src
      ? `<div class="book-face"${color}><img src="${h(src)}" alt="" /></div>`
      : `<div class="book-face is-text"${color}><div class="book-text-cover"><div class="book-text-title">${h(title.trim())}</div></div></div>`;
  }

  async function saveForm() {
    collect();
    const p = form.poem;
    if (!p.title.trim()) return msg('शीर्षक लेख्नुस्।', true);
    if (!p.content.trim()) return msg('रचना लेख्नुस्।', true);
    p.title = p.title.trim();
    $('fSave').disabled = true;
    msg('GitHub मा सेभ गर्दैछु... (फोटो भए केही सेकेन्ड लाग्छ)');
    try {
      let newCover = form.mode === 'image' ? form.poem.cover : '';
      let uploaded = null;
      if (form.mode === 'image' && form.file) {
        const { b64, ext } = await compressImage(form.file, 1000);
        uploaded = `covers/admin-${p.id}-${Date.now().toString(36)}.${ext}`;
        await api(uploaded, 'PUT', { message: 'Add cover for ' + p.title, content: b64, branch: cfg.branch || 'main' });
        newCover = uploaded;
      }
      const poem = {
        id: p.id, title: p.title, category: p.category, tags: p.tags, cover: newCover,
        coverColor: p.coverColor, date: p.date || today(), readTime: p.readTime, featured: !!p.featured, content: p.content
      };
      const wasBase = form.isBase;
      const db = await mutateDB(d => {
        if (wasBase) d.overrides[poem.id] = poem;
        else {
          const i = d.poems.findIndex(x => x.id === poem.id);
          if (i >= 0) d.poems[i] = poem; else d.poems.push(poem);
        }
      }, (wasBase ? 'Edit poem: ' : 'Save poem: ') + poem.title);
      // पुरानो admin फोटो अब प्रयोग नभए हटाउने
      if (isAdminCover(form.origCover) && form.origCover !== newCover) deleteFileQuiet(form.origCover);
      applyRemoteData(db);
      refreshSite();
      form = null;
      viewList();
      msg('✅ सेभ भयो। सार्वजनिक साइटमा १–२ मिनेटमा देखिन्छ।');
    } catch (e) {
      msg('सेभ भएन: ' + e.message + (e.status === 401 || e.status === 403 ? ' — Token/अनुमति जाँच्नुस्।' : ''), true);
      $('fSave').disabled = false;
    }
  }

  // ---------- हटाउने / फर्काउने ----------
  window.adminDelete = async function (id) {
    const it = currentList().items.find(p => p.id === id);
    if (!it) return;
    if (!confirm(`"${String(it.title).trim()}" हटाउने?`)) return;
    msg('हटाउँदैछु...');
    try {
      const db = await mutateDB(d => {
        if (it._base) {
          if (!d.hidden.includes(id)) d.hidden.push(id);
          delete d.overrides[id];
        } else {
          d.poems = d.poems.filter(x => x.id !== id);
        }
      }, 'Delete poem: ' + String(it.title).trim());
      if (isAdminCover(it.cover)) deleteFileQuiet(it.cover);
      applyRemoteData(db);
      refreshSite();
      viewList();
      msg('🗑️ हटाइयो।');
    } catch (e) { msg('हटाउन सकिएन: ' + e.message, true); }
  };
  window.adminRestore = async function (id) {
    msg('फर्काउँदैछु...');
    try {
      const db = await mutateDB(d => { d.hidden = d.hidden.filter(x => x !== id); }, 'Restore poem ' + id);
      applyRemoteData(db);
      refreshSite();
      viewList();
    } catch (e) { msg('फर्काउन सकिएन: ' + e.message, true); }
  };
})();

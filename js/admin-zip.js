// ============================================================
//  ADMIN-ZIP.JS — ZIP फाइल छानेर GitHub मा नगई सिधै साइट अपडेट गर्ने
//  १) ZIP ब्राउजरमै खोल्छ   २) repo सँग तुलना गरी Commit preview देखाउँछ
//  ३) एउटै Commit (Git Data API) मा सबै फाइल पठाउँछ   ४) चाहे फिर्ता (revert) गर्न मिल्छ
// ============================================================
(function () {
  const C = window.AdminCore;
  const LS_LAST = 'sahitya_last_zip_commit';
  const IGNORE = [/(^|\/)__MACOSX\//, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /^\.git\//, /^\.github\//];
  const PROTECT = [/^data\/poems\.json$/, /^covers\/admin-/, /^CNAME$/];
  const TEXT_EXT = /(\.(html|css|js|json|md|txt|xml|svg|webmanifest|csv)|(^|\/)CNAME)$/i;
  const IMG_EXT = /\.(png|jpe?g|gif|webp|ico)$/i;
  const MAX_FILE = 25 * 1024 * 1024;
  let S = null; // चलिरहेको विश्लेषण

  const h = s => C.h(s);
  const $ = id => document.getElementById(id);
  const msg = (t, e) => C.msg(t, e);
  const kb = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
  const isProtected = p => PROTECT.some(r => r.test(p));

  // ---------- GitHub API ----------
  async function gh(path, method, payload) {
    const cfg = C.cfg();
    const r = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}/${path}`, {
      method: method || 'GET',
      cache: 'no-store',
      headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: payload ? JSON.stringify(payload) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.message || 'HTTP ' + r.status); e.status = r.status; throw e; }
    return d;
  }
  const branch = () => C.cfg().branch || 'main';
  async function getHead() {
    const ref = await gh('git/ref/heads/' + branch());
    const commit = await gh('git/commits/' + ref.object.sha);
    return { head: ref.object.sha, treeSha: commit.tree.sha };
  }

  // ---------- ZIP पढ्ने (कुनै बाहिरी library बिना) ----------
  async function readZip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let e = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    }
    if (e < 0) throw new Error('यो ZIP फाइल होइन।');
    const total = dv.getUint16(e + 10, true);
    let p = dv.getUint32(e + 16, true);
    const dec = new TextDecoder();
    const out = [];
    for (let n = 0; n < total; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP बिग्रिएको छ।');
      const method = dv.getUint16(p + 10, true);
      const csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true);
      const lo = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
      p += 46 + nl + el + cl;
      if (name.endsWith('/')) continue;
      const lnl = dv.getUint16(lo + 26, true), lel = dv.getUint16(lo + 28, true);
      const start = lo + 30 + lnl + lel;
      const raw = u8.subarray(start, start + csize);
      let data;
      if (method === 0) data = raw.slice();
      else if (method === 8) {
        if (typeof DecompressionStream === 'undefined') throw new Error('यो ब्राउजरले ZIP खोल्न सक्दैन — Chrome/Safari अपडेट गर्नुस्।');
        data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      } else throw new Error('ZIP को compression समर्थित छैन: ' + name);
      out.push({ path: name.replace(/\\/g, '/'), data });
    }
    return out;
  }

  async function gitSha(bytes) {
    const head = new TextEncoder().encode('blob ' + bytes.length + '\0');
    const all = new Uint8Array(head.length + bytes.length);
    all.set(head); all.set(bytes, head.length);
    const d = await crypto.subtle.digest('SHA-1', all);
    return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function toB64(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromB64(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  // ---------- विश्लेषण ----------
  async function analyze(buf) {
    const { head, treeSha } = await getHead();
    const tree = await gh('git/trees/' + treeSha + '?recursive=1');
    const existing = new Map();
    (tree.tree || []).forEach(t => { if (t.type === 'blob') existing.set(t.path, t); });
    const topDirs = new Set([...existing.keys()].filter(p => p.includes('/')).map(p => p.split('/')[0]));

    let files = await readZip(buf);
    files = files.filter(f => !IGNORE.some(r => r.test(f.path)));
    if (files.some(f => f.path.startsWith('/') || f.path.split('/').includes('..'))) throw new Error('ZIP मा असुरक्षित path छ।');
    if (!files.length) throw new Error('ZIP भित्र फाइल भेटिएन।');

    // GitHub को "Download ZIP" मा repo-main/ जस्तो माथिल्लो फोल्डर हुन्छ — हटाउने
    const first = files[0].path.split('/')[0];
    let root = '';
    if (files.every(f => f.path.includes('/') && f.path.split('/')[0] === first)) {
      if (files.some(f => f.path === first + '/index.html') || !topDirs.has(first)) root = first + '/';
    }
    if (root) files = files.map(f => ({ path: f.path.slice(root.length), data: f.data }));

    const items = [];
    let same = 0;
    const seen = new Set();
    for (const f of files) {
      seen.add(f.path);
      if (f.data.length > MAX_FILE) { items.push({ path: f.path, status: 'big', size: f.data.length, checked: false }); continue; }
      const sha = await gitSha(f.data);
      const old = existing.get(f.path);
      if (old && old.sha === sha) { same++; continue; }
      const prot = isProtected(f.path);
      items.push({
        path: f.path, status: old ? 'mod' : 'new', data: f.data, size: f.data.length,
        oldSha: old && old.sha, oldSize: old && old.size, mode: (old && old.mode) || '100644',
        protected: prot, checked: !prot
      });
    }
    // zip मा नभएका फाइल (हटाउने विकल्प)
    const dels = [];
    existing.forEach((t, path) => {
      if (!seen.has(path) && !IGNORE.some(r => r.test(path))) {
        dels.push({ path, status: 'del', oldSha: t.sha, oldSize: t.size, mode: t.mode, protected: isProtected(path), checked: !isProtected(path) });
      }
    });
    const order = { new: 0, mod: 1, big: 2 };
    items.sort((a, b) => (order[a.status] - order[b.status]) || a.path.localeCompare(b.path));
    return { head, items, dels, same, delOn: false, root };
  }

  // ---------- सानो line diff ----------
  function lineDiff(a, b) {
    let s = 0;
    while (s < a.length && s < b.length && a[s] === b[s]) s++;
    let ea = a.length, eb = b.length;
    while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
    const A = a.slice(s, ea), B = b.slice(s, eb);
    const n = A.length, m = B.length;
    let ops = [];
    for (let i = 0; i < s; i++) ops.push([' ', a[i]]);
    if (n * m > 2500000) {
      A.forEach(x => ops.push(['-', x])); B.forEach(x => ops.push(['+', x]));
    } else {
      const w = m + 1, T = new Uint16Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
        T[i * w + j] = A[i] === B[j] ? T[(i + 1) * w + j + 1] + 1 : Math.max(T[(i + 1) * w + j], T[i * w + j + 1]);
      let i = 0, j = 0;
      while (i < n && j < m) {
        if (A[i] === B[j]) { ops.push([' ', A[i]]); i++; j++; }
        else if (T[(i + 1) * w + j] >= T[i * w + j + 1]) ops.push(['-', A[i++]]);
        else ops.push(['+', B[j++]]);
      }
      while (i < n) ops.push(['-', A[i++]]);
      while (j < m) ops.push(['+', B[j++]]);
    }
    for (let i = ea; i < a.length; i++) ops.push([' ', a[i]]);
    return ops;
  }
  function diffHTML(ops) {
    const keep = new Array(ops.length).fill(false);
    ops.forEach((o, i) => { if (o[0] !== ' ') for (let k = Math.max(0, i - 2); k <= Math.min(ops.length - 1, i + 2); k++) keep[k] = true; });
    let html = '', gap = false, add = 0, rem = 0;
    ops.forEach((o, i) => {
      if (o[0] === '+') add++; if (o[0] === '-') rem++;
      if (!keep[i]) { gap = true; return; }
      if (gap) { html += '<div class="gap">⋯</div>'; gap = false; }
      html += `<div class="${o[0] === '+' ? 'add' : o[0] === '-' ? 'rem' : ''}">${o[0]} ${h(o[1])}</div>`;
    });
    return { html, add, rem };
  }
  window.adminZipDiff = async function (i) {
    const it = S.items[i], box = $('zd' + i);
    if (box.dataset.open) { box.innerHTML = ''; delete box.dataset.open; return; }
    box.dataset.open = 1;
    box.innerHTML = '<div class="gap">लोड हुँदैछ...</div>';
    try {
      const old = await gh('git/blobs/' + it.oldSha);
      const a = new TextDecoder().decode(fromB64(old.content)).split('\n');
      const b = new TextDecoder().decode(it.data).split('\n');
      const d = diffHTML(lineDiff(a, b));
      box.innerHTML = `<div class="gap">+${d.add} / −${d.rem} लाइन</div>` + d.html;
    } catch (e) { box.innerHTML = '<div class="rem">diff देखाउन सकिएन: ' + h(e.message) + '</div>'; }
  };

  // ---------- VIEW: ZIP छान्ने ----------
  function lastCommit() { try { return JSON.parse(localStorage.getItem(LS_LAST)); } catch (e) { return null; } }
  window.adminZip = function () {
    S = null;
    const last = lastCommit();
    C.body().innerHTML = `
      <div class="admin-actions" style="margin-top:0"><button class="admin-btn ghost" onclick="adminBackToList()">← सूचीमा</button></div>
      <div class="admin-section-title">📦 ZIP बाट साइट अपडेट</div>
      <p class="admin-note">
        GitHub मा नगई यहीँबाट पूरै साइटको नयाँ ZIP हाल्न मिल्छ। पहिले के-के बदलिन्छ भन्ने <b>Commit preview</b> देखिन्छ,
        तपाईंले पुष्टि गरेपछि मात्र सेभ हुन्छ। फोल्डरसहित (repo-main/...) वा नभएको दुवै ZIP चल्छ।
      </p>
      <input type="file" id="zipFile" accept=".zip,application/zip" style="display:none" />
      <div class="zip-drop">
        <button class="admin-btn" id="zipPick">📁 ZIP फाइल छान्नुस्</button>
        <div style="margin-top:8px">भएका कविता/कभर (<code>data/poems.json</code>, <code>covers/admin-*</code>) ZIP ले नबदल्ने गरी सुरक्षित राखिन्छ।</div>
      </div>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      ${last ? `
        <div class="zip-commit">
          <div class="zip-commit-head"><span>पछिल्लो ZIP अपडेट</span><span>${h(new Date(last.at).toLocaleString())}</span></div>
          <div class="zip-commit-body">
            <div>${h(last.msg)}</div>
            <div class="admin-note">${last.files} फाइल · commit <code>${h(last.after.slice(0, 7))}</code></div>
            <button class="admin-btn danger small" id="zipRevert">↩️ यो अपडेट फिर्ता गर्नुस्</button>
          </div>
        </div>` : ''}`;
    $('zipPick').onclick = () => $('zipFile').click();
    $('zipFile').onchange = async e => {
      const f = e.target.files[0];
      if (!f) return;
      msg('ZIP खोल्दै र GitHub सँग तुलना गर्दै...');
      try {
        S = await analyze(await f.arrayBuffer());
        S.name = f.name;
        renderPreview();
      } catch (err) { msg('ZIP जाँच भएन: ' + err.message, true); }
    };
    const rv = $('zipRevert');
    if (rv) rv.onclick = revertLast;
  };
  window.adminBackToList = () => C.viewList();

  // ---------- VIEW: Commit preview ----------
  function active() {
    return S.items.filter(i => i.checked && i.status !== 'big').concat(S.delOn ? S.dels.filter(i => i.checked) : []);
  }
  function stats() {
    const a = active();
    return {
      n: a.filter(i => i.status === 'new').length,
      m: a.filter(i => i.status === 'mod').length,
      d: a.filter(i => i.status === 'del').length,
      bytes: a.reduce((t, i) => t + (i.data ? i.size : 0), 0)
    };
  }
  function rowHTML(it, idx, list) {
    const badge = { new: ['new', '🆕 नयाँ'], mod: ['mod', '✏️ बदलिएको'], del: ['del', '🗑️ हटाइने'], big: ['skip', '⚠️ धेरै ठूलो'] }[it.status];
    const canDiff = it.status === 'mod' && TEXT_EXT.test(it.path) && list === 'items';
    const img = it.data && IMG_EXT.test(it.path) && it.status !== 'big';
    let url = '';
    if (img) { it._url = it._url || URL.createObjectURL(new Blob([it.data])); url = it._url; }
    return `
      <div class="zip-row">
        <div class="zip-row-top">
          <input type="checkbox" ${it.checked ? 'checked' : ''} ${it.status === 'big' ? 'disabled' : ''} data-list="${list}" data-i="${idx}" />
          <span class="zip-path">${h(it.path)}</span>
          <span class="zip-badge ${badge[0]}">${badge[1]}</span>
        </div>
        <div class="zip-sub">
          <span>${it.status === 'del' ? kb(it.oldSize || 0) : it.status === 'mod' ? kb(it.oldSize || 0) + ' → ' + kb(it.size) : kb(it.size)}</span>
          ${it.protected ? '<span>🔒 सुरक्षित — पूर्वनिर्धारित रूपमा छोडिने</span>' : ''}
          ${it.status === 'big' ? '<span>२५ MB भन्दा ठूलो, अपलोड हुँदैन</span>' : ''}
          ${canDiff ? `<button class="zip-link" onclick="adminZipDiff(${idx})">के बदलियो हेर्नुस्</button>` : ''}
        </div>
        ${url ? `<img class="zip-img" src="${url}" alt="" />` : ''}
        ${canDiff ? `<div class="zip-diff" id="zd${idx}"></div>` : ''}
      </div>`;
  }
  function renderPreview() {
    const st = stats();
    const cfg = C.cfg();
    const defMsg = 'Update site from admin panel (ZIP) — ' + new Date().toISOString().slice(0, 10);
    C.body().innerHTML = `
      <div class="admin-actions" style="margin-top:0"><button class="admin-btn ghost" onclick="adminZip()">← अर्को ZIP</button></div>
      <div class="admin-section-title">🔍 Commit preview — ${h(S.name)}</div>
      <div class="zip-commit">
        <div class="zip-commit-head">
          <span>${h(cfg.owner)}/${h(cfg.repo)} · <b>${h(branch())}</b></span>
          <span>base <code>${h(S.head.slice(0, 7))}</code></span>
        </div>
        <div class="zip-commit-body">
          <label class="admin-label" style="margin-top:0">Commit message</label>
          <input class="admin-input" id="zMsg" value="${h(defMsg)}" />
          <div class="zip-stats" id="zStats"></div>
          ${S.root ? `<div class="admin-note">ZIP को माथिल्लो फोल्डर <code>${h(S.root)}</code> हटाइयो।</div>` : ''}
        </div>
      </div>
      <div class="zip-list" id="zList">
        ${S.items.length ? S.items.map((it, i) => rowHTML(it, i, 'items')).join('') : '<div class="zip-row">परिवर्तन भेटिएन — ZIP र साइट उस्तै छन्।</div>'}
      </div>
      ${S.dels.length ? `
        <label class="admin-check"><input type="checkbox" id="zDelOn" /> ZIP मा नभएका ${S.dels.length} फाइल पनि हटाउने</label>
        <div class="zip-list" id="zDels" style="display:none">${S.dels.map((it, i) => rowHTML(it, i, 'dels')).join('')}</div>` : ''}
      <div class="zip-progress" id="zProg" style="display:none"><div></div></div>
      <div class="admin-msg" id="adminMsg" style="display:none"></div>
      <div class="admin-actions">
        <button class="admin-btn" id="zGo">✅ Commit गर्नुस्</button>
        <button class="admin-btn ghost" onclick="adminZip()">रद्द</button>
      </div>`;
    const upd = () => {
      const s = stats();
      $('zStats').innerHTML = `
        <span class="zip-stat">🆕 ${s.n} नयाँ</span><span class="zip-stat">✏️ ${s.m} बदलिएको</span>
        <span class="zip-stat">🗑️ ${s.d} हटाइने</span><span class="zip-stat">⏭️ ${S.same} उस्तै</span>
        <span class="zip-stat">⬆️ ${kb(s.bytes)}</span>`;
      $('zGo').disabled = active().length === 0;
    };
    document.querySelectorAll('.zip-row input[type=checkbox]').forEach(cb => cb.onchange = () => {
      S[cb.dataset.list][+cb.dataset.i].checked = cb.checked; upd();
    });
    const d = $('zDelOn');
    if (d) d.onchange = () => { S.delOn = d.checked; $('zDels').style.display = d.checked ? 'block' : 'none'; upd(); };
    $('zGo').onclick = commit;
    upd();
  }

  // ---------- Commit ----------
  async function pool(list, n, fn) {
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => {
      while (i < list.length) { const k = i++; await fn(list[k], k); }
    }));
  }
  async function commit() {
    const sel = active();
    if (!sel.length) return;
    const message = ($('zMsg').value || '').trim() || 'Update site from admin panel (ZIP)';
    const delCount = sel.filter(i => i.status === 'del').length;
    if (delCount && !confirm(`${delCount} फाइल साइटबाट हटिनेछन्। निश्चित हुनुहुन्छ?`)) return;
    $('zGo').disabled = true;
    const prog = $('zProg'); prog.style.display = 'block';
    const bar = prog.firstElementChild;
    try {
      const { head, treeSha } = await getHead(); // अहिलेको ताजा head (बीचमा एडमिनले सेभ गरेको भए पनि ठीक)
      const up = sel.filter(i => i.status !== 'del');
      let done = 0;
      msg('फाइल अपलोड हुँदैछन्... 0/' + up.length);
      await pool(up, 4, async it => {
        const r = await gh('git/blobs', 'POST', { content: toB64(it.data), encoding: 'base64' });
        it.newSha = r.sha;
        done++; bar.style.width = Math.round(done / up.length * 80) + '%';
        msg('फाइल अपलोड हुँदैछन्... ' + done + '/' + up.length);
      });
      msg('Commit बनाउँदैछु...');
      const entries = sel.map(it => it.status === 'del'
        ? { path: it.path, mode: it.mode || '100644', type: 'blob', sha: null }
        : { path: it.path, mode: it.mode || '100644', type: 'blob', sha: it.newSha });
      const tree = await gh('git/trees', 'POST', { base_tree: treeSha, tree: entries });
      bar.style.width = '90%';
      const c = await gh('git/commits', 'POST', { message, tree: tree.sha, parents: [head] });
      await gh('git/refs/heads/' + branch(), 'PATCH', { sha: c.sha });
      bar.style.width = '100%';
      localStorage.setItem(LS_LAST, JSON.stringify({ before: head, after: c.sha, msg: message, files: sel.length, at: Date.now() }));
      const cfg = C.cfg();
      C.body().innerHTML = `
        <div class="admin-section-title">✅ Commit भयो</div>
        <div class="zip-commit"><div class="zip-commit-head"><span>${h(cfg.owner)}/${h(cfg.repo)} · ${h(branch())}</span><span><code>${h(c.sha.slice(0, 7))}</code></span></div>
          <div class="zip-commit-body">${h(message)}<div class="admin-note">${sel.length} फाइल बदलिए। साइटमा १–२ मिनेटमा देखिन्छ — त्यसपछि पेज refresh गर्नुस् (PWA भए बन्द गरेर फेरि खोल्नुस्)।</div>
          <a class="admin-btn small" style="display:inline-block;text-decoration:none" target="_blank" rel="noopener" href="https://github.com/${h(cfg.owner)}/${h(cfg.repo)}/commit/${h(c.sha)}">GitHub मा हेर्नुस् ↗</a></div></div>
        <div class="admin-actions"><button class="admin-btn ghost" onclick="adminZip()">← ZIP पृष्ठ</button><button class="admin-btn ghost" onclick="adminBackToList()">सूचीमा</button></div>`;
    } catch (e) {
      msg('Commit भएन: ' + e.message + (e.status === 401 || e.status === 403 || e.status === 404 ? ' — Token को अनुमति (Contents: Read and write) जाँच्नुस्।' : ''), true);
      $('zGo').disabled = false;
    }
  }

  // ---------- फिर्ता (नयाँ revert commit — इतिहास नमेटिने) ----------
  async function revertLast() {
    const last = lastCommit();
    if (!last) return;
    if (!confirm('पछिल्लो ZIP अपडेट फिर्ता गर्ने?')) return;
    msg('फिर्ता गर्दैछु...');
    try {
      const { head } = await getHead();
      if (head !== last.after) throw new Error('यो अपडेटपछि साइटमा अरू परिवर्तन भइसकेका छन्, त्यसैले स्वतः फिर्ता गरिएन।');
      const before = await gh('git/commits/' + last.before);
      const c = await gh('git/commits', 'POST', { message: 'Revert: ' + last.msg, tree: before.tree.sha, parents: [head] });
      await gh('git/refs/heads/' + branch(), 'PATCH', { sha: c.sha });
      localStorage.removeItem(LS_LAST);
      adminZip();
      msg('↩️ फिर्ता भयो (नयाँ revert commit बन्यो)।');
    } catch (e) { msg('फिर्ता गर्न सकिएन: ' + e.message, true); }
  }
})();

// ===== SEARCH.JS - Real-time Search =====

document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('searchToggleBtn');
  const wrap = document.getElementById('searchBarWrap');
  const input = document.getElementById('searchInput');
  const closeBtn = document.getElementById('searchClose');
  const results = document.getElementById('searchResults');

  toggleBtn.addEventListener('click', () => {
    wrap.classList.add('open');
    setTimeout(() => input.focus(), 200);
  });

  closeBtn.addEventListener('click', closeSearch);

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    if (!query) { results.innerHTML = ''; return; }
    doSearch(query);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  function closeSearch() {
    wrap.classList.remove('open');
    input.value = '';
    results.innerHTML = '';
  }

  function doSearch(query) {
    const found = KAVITA_DATA.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.content.toLowerCase().includes(query) ||
      p.tags.some(t => t.toLowerCase().includes(query)) ||
      p.category.toLowerCase().includes(query)
    );

    if (found.length === 0) {
      results.innerHTML = `<div class="search-no-result">🔍 "${input.value}" भेटिएन</div>`;
      return;
    }

    results.innerHTML = found.map(p => `
      <div class="search-result-item" onclick="closeSearch(); openPoem('${p.id}')">
        <div class="search-result-cover" style="background:linear-gradient(135deg,#1a2744,#e8690a);display:flex;align-items:center;justify-content:center;font-size:24px;">
          ${p.cover ? `<img src="${p.cover}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />` : p.coverEmoji}
        </div>
        <div class="search-result-info">
          <div class="title">${highlightMatch(p.title, query)}</div>
          <div class="meta">${getCategoryLabel(p.category)} • ${p.readTime}</div>
          <div class="meta">${p.tags.map(t => '#'+t).join(' ')}</div>
        </div>
      </div>
    `).join('');
  }

  function closeSearch() {
    wrap.classList.remove('open');
    input.value = '';
    results.innerHTML = '';
  }

  window.closeSearch = closeSearch;
});

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark style="background:var(--accent);color:#fff;border-radius:3px;padding:0 2px;">$1</mark>');
}

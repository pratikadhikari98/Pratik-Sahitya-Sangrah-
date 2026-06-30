// ===== BOOKMARK.JS - Save/Unsave poems =====

function getBookmarks() {
  return JSON.parse(localStorage.getItem('pratik_bookmarks') || '[]');
}

function isBookmarked(id) {
  return getBookmarks().includes(id);
}

function toggleBookmark() {
  if (!currentPoem) return;
  const bookmarks = getBookmarks();
  const idx = bookmarks.indexOf(currentPoem.id);

  if (idx === -1) {
    bookmarks.push(currentPoem.id);
    document.getElementById('bookmarkBtn').textContent = '🔖';
    showToast('🔖 सेभ गरियो!');
  } else {
    bookmarks.splice(idx, 1);
    document.getElementById('bookmarkBtn').textContent = '🏷️';
    showToast('हटाइयो');
  }

  localStorage.setItem('pratik_bookmarks', JSON.stringify(bookmarks));
  renderCards(); // refresh bookmark icons on cards
}

function showBookmarks() {
  closeDropdown();
  const bookmarks = getBookmarks();
  const saved = KAVITA_DATA.filter(p => bookmarks.includes(p.id));
  const body = document.getElementById('bookmarkBody');

  if (saved.length === 0) {
    body.innerHTML = `<div class="empty-state"><div class="icon">🔖</div><p>अहिलेसम्म केही सेभ गर्नुभएको छैन</p></div>`;
  } else {
    body.innerHTML = saved.map(p => `
      <div class="search-result-item" onclick="closeBookmarkModal(); openPoem('${p.id}')">
        <div class="search-result-cover" style="background:linear-gradient(135deg,#1a2744,#e8690a);display:flex;align-items:center;justify-content:center;font-size:24px;border-radius:6px;width:44px;height:60px;flex-shrink:0;">
          ${p.cover ? `<img src="${p.cover}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" />` : p.coverEmoji}
        </div>
        <div class="search-result-info">
          <div class="title">${p.title}</div>
          <div class="meta">${getCategoryLabel(p.category)} • ${p.readTime}</div>
        </div>
        <button onclick="event.stopPropagation(); removeBookmark('${p.id}')" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--text2);">✕</button>
      </div>
    `).join('');
  }

  document.getElementById('bookmarkModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function removeBookmark(id) {
  const bookmarks = getBookmarks().filter(b => b !== id);
  localStorage.setItem('pratik_bookmarks', JSON.stringify(bookmarks));
  showBookmarks();
  renderCards();
}

function closeBookmarkModal() {
  document.getElementById('bookmarkModal').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

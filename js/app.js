// ===== APP.JS - Main Application Logic =====

let currentFilter = 'all';
let currentTag = null;
let currentPoem = null;
let heroInterval = null;
let heroIndex = 0;
let heroSlides = [];
let isEnglish = false;

// Blackboard/News vars
let newsInterval = null;
let newsIndex = 0;

// ===== NEPALI HELPERS =====
const NEPALI_NUMS  = ['०','१','२','३','४','५','६','७','८','९'];
const NEPALI_DAYS  = ['आइतबार','सोमबार','मंगलबार','बुधबार','बिहिबार','शुक्रबार','शनिबार'];
const NEPALI_MONTHS_BS = ['बैशाख','जेठ','असार','साउन','भदौ','असोज','कार्तिक','मंसिर','पुस','माघ','फागुन','चैत'];

function toNepaliNum(n) {
  return String(n).split('').map(d => NEPALI_NUMS[+d] !== undefined ? NEPALI_NUMS[+d] : d).join('');
}
function pad2(n) { return String(n).padStart(2, '0'); }

// ===== NEPALI DATE CONVERSION (BS) =====
const BS_START = [
  { bs: [2079, 1, 1], eng: [2022, 4, 14] },
  { bs: [2080, 1, 1], eng: [2023, 4, 14] },
  { bs: [2081, 1, 1], eng: [2024, 4, 13] },
  { bs: [2082, 1, 1], eng: [2025, 4, 14] },
  { bs: [2083, 1, 1], eng: [2026, 4, 14] },
  { bs: [2084, 1, 1], eng: [2027, 4, 14] },
];

const BS_DAYS = {
  2079: [31,32,31,32,31,30,30,30,29,30,29,31],
  2080: [31,32,31,32,31,30,30,30,29,30,29,31],
  2081: [31,31,32,31,31,31,30,29,30,30,29,31],
  2082: [31,32,31,32,31,30,30,30,29,30,29,31],
  2083: [31,32,31,32,31,30,30,30,29,30,29,31],
  2084: [31,32,31,31,31,31,30,29,30,30,29,31],
};

function engToBS(engDate) {
  try {
    let ref = null;
    for (let i = BS_START.length - 1; i >= 0; i--) {
      const r = BS_START[i];
      const refDate = new Date(r.eng[0], r.eng[1] - 1, r.eng[2]);
      if (engDate >= refDate) {
        ref = { bsYear: r.bs[0], bsMonth: 0, bsDay: 1, refDate };
        break;
      }
    }
    if (!ref) return null;
    let diff = Math.floor((engDate - ref.refDate) / 86400000);
    let y = ref.bsYear;
    let m = 0;
    let d = 1;
    while (diff > 0) {
      const daysInMonth = (BS_DAYS[y] && BS_DAYS[y][m]) ? BS_DAYS[y][m] : 30;
      const left = daysInMonth - d;
      if (diff <= left) { d += diff; diff = 0; }
      else { diff -= (left + 1); d = 1; m++; if (m >= 12) { m = 0; y++; } }
    }
    return { year: y, month: m + 1, day: d };
  } catch(e) { return null; }
}

// ===== CLOCK =====
function startClock() {
  function tick() {
    try {
      const el = document.getElementById('liveClock');
      if (!el) return;
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes();
      const s = now.getSeconds();
      const ampm = h >= 12 ? 'बेलुका' : 'बिहान';
      if (h === 0) h = 12;
      else if (h > 12) h -= 12;
      const time = `${toNepaliNum(pad2(h))}:${toNepaliNum(pad2(m))}:${toNepaliNum(pad2(s))} ${ampm}`;
      const weekday = NEPALI_DAYS[now.getDay()];
      const bs = engToBS(now);
      const date = bs
        ? `${weekday}, ${toNepaliNum(bs.day)} ${NEPALI_MONTHS_BS[bs.month - 1]} ${toNepaliNum(bs.year)}`
        : weekday;
      el.textContent = `${date} | ${time}`;
    } catch(e) {}
  }
  tick();
  setInterval(tick, 1000);
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderTags();
  renderCards();
  startHeroAuto();
  setupHeroSwipe();
  setupTabs();
  setupMenu();
  startClock();
  renderBlackboard();
  startBlackboardAuto();
  setupBlackboardSwipe();
});

// ===== BACK BUTTON / SWIPE — close modal instead of exiting app =====
window.addEventListener('popstate', () => {
  const modal = document.getElementById('poemModal');
  if (modal && modal.classList.contains('open')) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
    currentPoem = null;
  }
  const bookmarkModal = document.getElementById('bookmarkModal');
  if (bookmarkModal && bookmarkModal.classList.contains('open')) {
    bookmarkModal.classList.remove('open');
    document.body.style.overflow = '';
  }
  // Also close the 3-dots dropdown menu if open
  const dropdown = document.getElementById('dropdownMenu');
  if (dropdown && dropdown.classList.contains('open')) {
    dropdown.classList.remove('open');
  }
});

// ===== HERO SLIDES =====
function renderHero() {
  heroSlides = [...KAVITA_DATA].sort(() => Math.random() - 0.5);
  const container = document.getElementById('heroSlides');
  const dotsContainer = document.getElementById('heroDots');

  container.innerHTML = heroSlides.map(p => `
    <div class="hero-slide" onclick="openPoem('${p.id}')" ${!p.cover ? 'style="background: linear-gradient(135deg,#1a2744 0%,#2d4a7a 100%)"' : ''}>
      ${p.cover ? `<img src="${p.cover}" class="hero-slide-bg" alt="" onerror="this.style.display='none';this.closest('.hero-slide').style.background='linear-gradient(135deg,#1a2744 0%,#2d4a7a 100%)'" />` : ''}
      <div class="hero-slide-overlay"></div>
      <div class="hero-slide-info">
        <div class="hero-slide-tag">${getCategoryLabel(p.category)}</div>
        <div class="hero-slide-title">${p.title}</div>
        <div class="hero-slide-btn">${isEnglish ? 'Read Now' : 'पढ्नुस्'}</div>
      </div>
      <div class="hero-slide-cover">
        ${p.cover
          ? `<img src="${p.cover}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${p.coverEmoji || '📖'}'}))" />`
          : p.coverEmoji}
      </div>
    </div>
  `).join('');

  dotsContainer.innerHTML = heroSlides.map((_, i) =>
    `<div class="hero-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></div>`
  ).join('');
}

function goToSlide(index) {
  heroIndex = index;
  document.getElementById('heroSlides').style.transform = `translateX(-${heroIndex * 100}%)`;
  document.querySelectorAll('.hero-dot').forEach((d, i) => d.classList.toggle('active', i === heroIndex));
}

function startHeroAuto() {
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(() => {
    heroIndex = (heroIndex + 1) % (heroSlides.length || 1);
    goToSlide(heroIndex);
  }, 4000);
}

// ===== HERO TOUCH SWIPE =====
function setupHeroSwipe() {
  const section = document.getElementById('heroSection');
  if (!section) return;
  let startX = 0;
  let isDragging = false;

  section.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
    clearInterval(heroInterval);
  }, { passive: true });

  section.addEventListener('touchend', e => {
    if (!isDragging) return;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        heroIndex = (heroIndex + 1) % heroSlides.length;
      } else {
        heroIndex = (heroIndex - 1 + heroSlides.length) % heroSlides.length;
      }
      goToSlide(heroIndex);
    }
    isDragging = false;
    startHeroAuto();
  }, { passive: true });

  // Mouse drag for desktop
  section.addEventListener('mousedown', e => {
    startX = e.clientX;
    isDragging = true;
    clearInterval(heroInterval);
  });
  section.addEventListener('mouseup', e => {
    if (!isDragging) return;
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) heroIndex = (heroIndex + 1) % heroSlides.length;
      else heroIndex = (heroIndex - 1 + heroSlides.length) % heroSlides.length;
      goToSlide(heroIndex);
    }
    isDragging = false;
    startHeroAuto();
  });
}

// ===== BLACKBOARD / NEWS SECTION =====
function renderBlackboard() {
  const slides = document.getElementById('blackboardSlides');
  const dots = document.getElementById('blackboardDots');
  if (!slides || !dots) return;
  const data = (typeof NEWS_DATA !== 'undefined' && NEWS_DATA.length > 0)
    ? NEWS_DATA
    : [{ id: 'default', text: '📢 प्रतीक साहित्य संग्रहमा स्वागत छ!' }];

  slides.innerHTML = data.map(n => `
    <div class="blackboard-slide">
      <div class="blackboard-text">${n.text}</div>
    </div>
  `).join('');

  dots.innerHTML = data.map((_, i) =>
    `<div class="blackboard-dot ${i === 0 ? 'active' : ''}" onclick="goToNews(${i})"></div>`
  ).join('');
}

function goToNews(index) {
  const data = (typeof NEWS_DATA !== 'undefined') ? NEWS_DATA : [];
  newsIndex = index;
  const slides = document.getElementById('blackboardSlides');
  if (slides) slides.style.transform = `translateX(-${newsIndex * 100}%)`;
  document.querySelectorAll('.blackboard-dot').forEach((d, i) => d.classList.toggle('active', i === newsIndex));
}

function startBlackboardAuto() {
  if (newsInterval) clearInterval(newsInterval);
  const len = (typeof NEWS_DATA !== 'undefined' && NEWS_DATA.length > 0) ? NEWS_DATA.length : 1;
  newsInterval = setInterval(() => {
    newsIndex = (newsIndex + 1) % len;
    goToNews(newsIndex);
  }, 5000);
}

function setupBlackboardSwipe() {
  const section = document.getElementById('blackboardSection');
  if (!section) return;
  let startX = 0;
  const len = () => (typeof NEWS_DATA !== 'undefined' && NEWS_DATA.length > 0) ? NEWS_DATA.length : 1;

  section.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    clearInterval(newsInterval);
  }, { passive: true });

  section.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 30) {
      if (diff > 0) newsIndex = (newsIndex + 1) % len();
      else newsIndex = (newsIndex - 1 + len()) % len();
      goToNews(newsIndex);
    }
    startBlackboardAuto();
  }, { passive: true });

  section.addEventListener('mousedown', e => {
    startX = e.clientX;
    clearInterval(newsInterval);
  });
  section.addEventListener('mouseup', e => {
    const diff = startX - e.clientX;
    if (Math.abs(diff) > 30) {
      if (diff > 0) newsIndex = (newsIndex + 1) % len();
      else newsIndex = (newsIndex - 1 + len()) % len();
      goToNews(newsIndex);
    }
    startBlackboardAuto();
  });
}

// ===== TAGS =====
function renderTags() {
  const allTags = [...new Set(KAVITA_DATA.flatMap(p => p.tags))];
  const wrap = document.getElementById('tagFilterWrap');
  wrap.innerHTML =
    `<button class="tag-chip active" onclick="filterByTag(null, this)">${isEnglish ? 'All' : 'सबै'}</button>` +
    allTags.map(t => `<button class="tag-chip" onclick="filterByTag('${t}', this)">#${t}</button>`).join('');
}

function filterByTag(tag, btn) {
  currentTag = tag;
  document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderCards();
}

// ===== TABS =====
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      currentTag = null;
      const first = document.querySelector('.tag-chip');
      document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
      if (first) first.classList.add('active');
      renderCards();
    });
  });
}

// ===== RENDER CARDS =====
function renderCards() {
  let data = [...KAVITA_DATA];

  if (currentFilter === 'new') {
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
  } else if (currentFilter !== 'all') {
    data = data.filter(p => p.category === currentFilter);
  }

  if (currentTag) {
    data = data.filter(p => p.tags.includes(currentTag));
  }

  const popular = [...KAVITA_DATA].sort(() => Math.random() - 0.5);
  document.getElementById('popularCards').innerHTML = popular.map(p => createCard(p, true)).join('');

  const allContainer = document.getElementById('allCards');
  allContainer.innerHTML = data.length === 0
    ? `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📭</div>
        <p>${isEnglish ? 'No works found' : 'कुनै रचना भेटिएन'}</p>
       </div>`
    : data.map(p => createCard(p, false)).join('');
}

function createCard(poem, isScroll) {
  const saved = isBookmarked(poem.id);
  return `
    <div class="card ${isScroll ? 'card-scroll' : ''}" onclick="openPoem('${poem.id}')">
      <div class="card-cover">
        ${poem.cover
          ? `<img src="${poem.cover}" style="width:100%;height:100%;object-fit:cover;" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${poem.coverEmoji || '📖'}'}))" />`
          : poem.coverEmoji}
      </div>
      <div class="card-body">
        <div class="card-category">${getCategoryLabel(poem.category)}</div>
        <div class="card-title">${poem.title}</div>
        <div class="card-meta">
          <span class="card-read-time">⏱ ${poem.readTime}</span>
          <span class="card-bookmark ${saved ? 'saved' : ''}">${saved ? '🔖' : '🏷️'}</span>
        </div>
      </div>
      <button class="card-read-btn" onclick="event.stopPropagation(); openPoem('${poem.id}')">
        ${isEnglish ? 'Read' : 'पढ्नुस्'}
      </button>
    </div>
  `;
}

function getCategoryLabel(cat) {
  const map = {
    kavita:  isEnglish ? 'Poem'  : 'कविता',
    kabita:  isEnglish ? 'Poem'  : 'कविता',
    lekh:    isEnglish ? 'Essay' : 'लेख',
    gazal:   isEnglish ? 'Gazal' : 'गजल',
  };
  return map[cat] || cat;
}

// ===== OPEN POEM =====
function openPoem(id) {
  const poem = KAVITA_DATA.find(p => p.id === id);
  if (!poem) return;
  currentPoem = poem;

  document.getElementById('bookmarkBtn').textContent = isBookmarked(poem.id) ? '🔖' : '🏷️';

  const poemDate = new Date(poem.date);
  const bs = engToBS(poemDate);
  const dateLabel = bs
    ? `${toNepaliNum(bs.day)} ${NEPALI_MONTHS_BS[bs.month - 1]} ${toNepaliNum(bs.year)}`
    : poem.date;

  document.getElementById('modalBody').innerHTML = `
    <div class="poem-cover-large">
      ${poem.cover
        ? `<img src="${poem.cover}" style="width:100%;height:100%;object-fit:cover;border-radius:16px;" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${poem.coverEmoji || '📖'}'}))" />`
        : poem.coverEmoji}
    </div>
    <h1 class="poem-title-large">${poem.title}</h1>
    <div class="poem-meta-row">
      <span class="poem-meta-badge accent">${getCategoryLabel(poem.category)}</span>
      <span class="poem-meta-badge">⏱ ${poem.readTime}</span>
      <span class="poem-meta-badge">📅 ${dateLabel}</span>
    </div>
    <div class="poem-divider"></div>
    <div class="poem-content">${poem.content}</div>
    <div class="poem-tags">
      ${poem.tags.map(t => `<span class="poem-tag" onclick="filterByTagFromModal('${t}')">#${t}</span>`).join('')}
    </div>
  `;

  document.getElementById('poemModal').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Add a history entry so back-swipe/back-button closes modal instead of exiting app
  pushOverlayState('poem');
}

function closeModal() {
  if (!document.getElementById('poemModal').classList.contains('open')) return;
  document.getElementById('poemModal').classList.remove('open');
  document.body.style.overflow = '';
  currentPoem = null;

  popOverlayStateIfMatches('poem');
}

function filterByTagFromModal(tag) {
  closeModal();
  currentTag = tag;
  currentFilter = 'all';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.filter === 'all'));
  renderTags();
  setTimeout(() => {
    const chip = [...document.querySelectorAll('.tag-chip')].find(c => c.textContent === '#' + tag);
    if (chip) chip.classList.add('active');
    renderCards();
  }, 100);
}

// ===== RANDOM POEM =====
function showRandomPoem() {
  closeDropdown();
  const idx = Math.floor(Math.random() * KAVITA_DATA.length);
  openPoem(KAVITA_DATA[idx].id);
}

// ===== SECTION NAV =====
function showSection(section) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  if (section === 'bookmarks') showBookmarks();
  if (section === 'home') { closeModal(); closeBookmarkModal(); }
}

// ===== MENU =====
function setupMenu() {
  document.getElementById('menuBtn').addEventListener('click', e => {
    e.stopPropagation();
    const dropdown = document.getElementById('dropdownMenu');
    const opening = !dropdown.classList.contains('open');
    dropdown.classList.toggle('open');
    if (opening) pushOverlayState('menu');
  });
  document.addEventListener('click', closeDropdown);
  document.getElementById('dropdownMenu').addEventListener('click', e => e.stopPropagation());

  document.getElementById('langToggle').addEventListener('change', function() {
    isEnglish = this.checked;
    renderHero();
    renderTags();
    renderCards();
  });
}

function closeDropdown() {
  const dropdown = document.getElementById('dropdownMenu');
  if (!dropdown.classList.contains('open')) return;
  dropdown.classList.remove('open');
  popOverlayStateIfMatches('menu');
}

// ===== Shared overlay history helper =====
// Used by poem modal, bookmark modal, and dropdown menu so back-swipe/back-button
// closes the topmost overlay instead of exiting the app.
function pushOverlayState(name) {
  if (!history.state || history.state.overlay !== name) {
    history.pushState({ overlay: name }, '');
  }
}
function popOverlayStateIfMatches(name) {
  if (history.state && history.state.overlay === name) {
    history.back();
  }
}


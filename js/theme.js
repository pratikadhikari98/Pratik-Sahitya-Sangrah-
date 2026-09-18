// ===== THEME.JS =====

document.addEventListener('DOMContentLoaded', () => {

  // ── Layout is always Grid now; clear any old saved preference ──
  document.documentElement.setAttribute('data-layout', 'grid');
  localStorage.removeItem('layout');

  // ── Day / Night ──
  const nightBtn = document.getElementById('themeBtn');
  const savedNight = localStorage.getItem('theme') || 'light';
  applyNight(savedNight);
  nightBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyNight(next);
    localStorage.setItem('theme', next);
  });

  // ── Colour Theme ──
  const savedHTheme = localStorage.getItem('htheme') || 'kalika';
  applyHTheme(savedHTheme);
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      applyHTheme(btn.dataset.htheme);
      localStorage.setItem('htheme', btn.dataset.htheme);
    });
  });

});

function applyNight(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
}

function applyHTheme(htheme) {
  document.documentElement.setAttribute('data-htheme', htheme);
  document.querySelectorAll('.theme-swatch').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.htheme === htheme)
  );
}

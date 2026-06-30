// ===== ABOUT.JS — Magazine About Page Logic =====

document.addEventListener('DOMContentLoaded', () => {
  renderHero();
  renderContact();
});

// ===== HERO =====
function renderHero() {
  const d = ABOUT_DATA;

  // Background photo
  const bg = document.getElementById('aboutHeroBg');
  if (d.photo) {
    const img = new Image();
    img.onload = () => {
      bg.style.backgroundImage = `url('${d.photo}')`;
    };
    img.onerror = () => {
      // Photo नभए emoji fallback
      bg.classList.add('no-photo');
      bg.textContent = d.photoEmoji || '✍️';
    };
    img.src = d.photo;
  } else {
    bg.classList.add('no-photo');
    bg.textContent = d.photoEmoji || '✍️';
  }

  document.getElementById('aboutQuote').textContent = `"${d.quote}"`;
  document.getElementById('aboutQuoteAuthor').textContent = d.quoteAuthor;
  document.getElementById('aboutName').textContent = d.name;
  document.getElementById('aboutSubtitle').textContent = d.subtitle;
  document.getElementById('aboutLocation').textContent = '📍 ' + d.location;

  // Photo description (from data/description.js)
  const descEl = document.getElementById('aboutPhotoDesc');
  if (descEl && typeof PHOTO_DESCRIPTION !== 'undefined' && PHOTO_DESCRIPTION) {
    descEl.textContent = PHOTO_DESCRIPTION;
  }
}

// ===== CONTACT =====
const SOCIAL_SVG = {
  facebook: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z"/></svg>`,
  youtube: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#FF0000" d="M23.5 6.2s-.23-1.64-.94-2.36c-.9-.94-1.9-.94-2.36-1C17 2.5 12 2.5 12 2.5h-.01s-5 0-8.2.34c-.46.06-1.46.06-2.36 1-.71.72-.94 2.36-.94 2.36S0 8.1 0 10v1.78c0 1.9.23 3.8.23 3.8s.23 1.64.94 2.36c.9.94 2.08.91 2.6 1.01 1.9.18 8.06.31 8.06.31s5.02 0 8.21-.34c.46-.06 1.46-.06 2.36-1 .71-.72.94-2.36.94-2.36s.23-1.9.23-3.8V10c0-1.9-.07-3.8-.07-3.8zM9.55 14.6V8.1l6.34 3.26-6.34 3.24z"/></svg>`,
  email: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.46v13.08c0 .85-.69 1.46-1.5 1.46H21V8.65l-9 6.59-9-6.59v11.35H1.5C.69 20 0 19.39 0 18.54V5.46c0-.39.14-.74.4-1.02C.7 4.1 1.16 3.9 1.6 3.9h.34L12 11.2l10.06-7.3h.34c.44 0 .9.2 1.2.54.26.28.4.63.4 1.02z"/><path fill="#FBBC05" d="M21 8.65v10.35h2.5c.4 0 .77-.16 1.04-.43.27-.27.46-.65.46-1.03V5.46c0-.39-.14-.74-.4-1.02L21 8.65z"/><path fill="#34A853" d="M0 5.46v12.13c0 .38.19.76.46 1.03.27.27.64.43 1.04.43H3.9V8.65L0 5.46z"/><path fill="#4285F4" d="M22.4 3.9h-.34L12 11.2 1.94 3.9H1.6C1.16 3.9.7 4.1.4 4.44L12 12.93 23.6 4.44c-.3-.34-.76-.54-1.2-.54z"/></svg>`
};

function renderContact() {
  const c = ABOUT_DATA.contact;
  const links = [
    { icon: SOCIAL_SVG.facebook, name: 'Facebook', label: 'सामाजिक', href: c.facebook, show: !!c.facebook },
    { icon: SOCIAL_SVG.youtube,  name: 'YouTube',  label: 'च्यानल',  href: c.youtube,  show: !!c.youtube },
    { icon: SOCIAL_SVG.email,    name: 'Gmail',    label: 'सम्पर्क', href: `mailto:${c.email}`, show: !!c.email },
  ].filter(l => l.show);

  document.getElementById('aboutContact').innerHTML = links.map(l => `
    <a class="contact-btn" href="${l.href}" target="_blank" rel="noopener">
      <span class="c-icon">${l.icon}</span>
      <div class="contact-btn-inner">
        <span class="c-label">${l.label}</span>
        <span class="c-name">${l.name}</span>
      </div>
    </a>
  `).join('');
}

// ===== NEPALI NUMBER HELPER =====
const NEPALI_NUMS = ['०','१','२','३','४','५','६','७','८','९'];
function toNepaliNum(n) {
  return String(n).split('').map(d => NEPALI_NUMS[+d] ?? d).join('');
}

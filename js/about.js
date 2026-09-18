// ===== ABOUT.JS — Clean profile-card About page =====

document.addEventListener('DOMContentLoaded', () => {
  renderProfile();
  renderContact();
  renderSites();
});

// ===== PROFILE (photo + name + subtitle + location) =====
function renderProfile() {
  const d = ABOUT_DATA;

  const photo = document.getElementById('profilePhoto');
  if (d.photo) {
    photo.src = d.photo;
  } else {
    photo.style.display = 'none';
  }

  document.getElementById('profileName').textContent = d.name || '';
  document.getElementById('profileSubtitle').textContent = d.subtitle || '';

  const locEl = document.getElementById('profileLocation');
  if (d.location) {
    locEl.innerHTML = `📍 ${d.location}`;
  } else {
    locEl.style.display = 'none';
  }
}

// ===== CONTACT / DETAILS =====
const SOCIAL_SVG = {
  facebook: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#1877F2" d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z"/></svg>`,
  email: `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="#EA4335" d="M24 5.46v13.08c0 .85-.69 1.46-1.5 1.46H21V8.65l-9 6.59-9-6.59v11.35H1.5C.69 20 0 19.39 0 18.54V5.46c0-.39.14-.74.4-1.02C.7 4.1 1.16 3.9 1.6 3.9h.34L12 11.2l10.06-7.3h.34c.44 0 .9.2 1.2.54.26.28.4.63.4 1.02z"/><path fill="#FBBC05" d="M21 8.65v10.35h2.5c.4 0 .77-.16 1.04-.43.27-.27.46-.65.46-1.03V5.46c0-.39-.14-.74-.4-1.02L21 8.65z"/><path fill="#34A853" d="M0 5.46v12.13c0 .38.19.76.46 1.03.27.27.64.43 1.04.43H3.9V8.65L0 5.46z"/><path fill="#4285F4" d="M22.4 3.9h-.34L12 11.2 1.94 3.9H1.6C1.16 3.9.7 4.1.4 4.44L12 12.93 23.6 4.44c-.3-.34-.76-.54-1.2-.54z"/></svg>`,
  phone: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  location: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
};

function renderContact() {
  const d = ABOUT_DATA;
  const c = d.contact || {};
  const rows = [
    { icon: SOCIAL_SVG.location, label: 'ठेगाना',   value: d.location,   href: null,               show: !!d.location },
    { icon: SOCIAL_SVG.phone,    label: 'फोन',      value: c.phone,      href: `tel:${c.phone}`,   show: !!c.phone },
    { icon: SOCIAL_SVG.email,    label: 'Email',    value: c.email,      href: `mailto:${c.email}`,show: !!c.email },
    { icon: SOCIAL_SVG.facebook, label: 'Facebook', value: 'प्रोफाइल हेर्नुस्', href: c.facebook,   show: !!c.facebook },
  ].filter(r => r.show);

  document.getElementById('aboutContact').innerHTML = rows.map(r => `
    ${r.href
      ? `<a class="contact-btn" href="${r.href}" target="_blank" rel="noopener">`
      : `<div class="contact-btn">`}
      <span class="c-icon">${r.icon}</span>
      <div class="contact-btn-inner">
        <span class="c-label">${r.label}</span>
        <span class="c-name">${r.value}</span>
      </div>
    ${r.href ? '</a>' : '</div>'}
  `).join('');
}

// ===== OTHER WEBSITES =====
function renderSites() {
  const sites = ABOUT_DATA.otherWebsites || [];
  const el = document.getElementById('aboutSites');
  if (!el) return;

  if (!sites.length) {
    el.innerHTML = `<div class="about-sites-empty">छिट्टै थपिनेछ...</div>`;
    return;
  }

  el.innerHTML = sites.map(s => `
    <a class="about-site-link" href="${s.url}" target="_blank" rel="noopener">🔗 ${s.name}</a>
  `).join('');
}

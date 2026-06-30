// ===== SHARE.JS - Social sharing =====

function sharePoem() {
  document.getElementById('shareModal').classList.add('open');
}

function closeShareModal() {
  document.getElementById('shareModal').classList.remove('open');
}

function getShareText() {
  if (!currentPoem) return '';
  const preview = currentPoem.content.split('\n').slice(0,3).join('\n');
  return `📖 ${currentPoem.title}\n\n${preview}\n\n— प्रतीक साहित्य संग्रह`;
}

function getShareUrl() {
  return `${window.location.origin}${window.location.pathname}?poem=${currentPoem?.id || ''}`;
}

function shareToWhatsApp() {
  const text = encodeURIComponent(getShareText() + '\n\n' + getShareUrl());
  window.open(`https://wa.me/?text=${text}`, '_blank');
  closeShareModal();
}

function shareToFacebook() {
  const url = encodeURIComponent(getShareUrl());
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
  closeShareModal();
}

function shareToTwitter() {
  const text = encodeURIComponent(getShareText().slice(0, 200));
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  closeShareModal();
}

function copyLink() {
  const text = getShareText();
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 कपी गरियो!');
    closeShareModal();
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 कपी गरियो!');
    closeShareModal();
  });
}

// Close share modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('shareModal').addEventListener('click', function(e) {
    if (e.target === this) closeShareModal();
  });
});

// Announcement banner — reads from Firestore (shared), shows on all pages.
(function () {
  // Try Firestore first, fall back to localStorage cache
  async function getAnnouncement() {
    // Check session dismissal first
    if (sessionStorage.getItem('yawdis_announcement_dismissed')) return null;

    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        const doc = await firebase.firestore().collection('site_settings').doc('global').get();
        if (doc.exists) {
          const data = doc.data();
          if (data.announcementEnabled && data.announcementText) {
            return data.announcementText;
          }
          return null;
        }
      } catch (err) {
        console.warn('Failed to load announcement from Firestore:', err);
      }
    }

    // Fallback to localStorage
    const text = localStorage.getItem('yawdis_announcement_text');
    const enabled = localStorage.getItem('yawdis_announcement_enabled') === 'true';
    return (enabled && text) ? text : null;
  }

  getAnnouncement().then(text => {
    if (!text) return;

    const banner = document.createElement('div');
    banner.id = 'announcement-banner';
    banner.style.cssText = `
      background: var(--maroon, #6b1919);
      color: #fff;
      text-align: center;
      padding: 10px 32px;
      font-size: 0.82rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      position: relative;
      z-index: 300;
    `;
    banner.textContent = text;

    document.body.insertBefore(banner, document.body.firstChild);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Dismiss announcement');
    closeBtn.style.cssText = `
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: rgba(255,255,255,0.7);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    `;
    closeBtn.addEventListener('click', () => {
      banner.remove();
      sessionStorage.setItem('yawdis_announcement_dismissed', '1');
    });

    banner.appendChild(closeBtn);
  });
})();

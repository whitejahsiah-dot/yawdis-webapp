// ── Google Maps configuration ──
//
// 1. In Google Cloud Console, create/select a project and enable the
//    "Maps JavaScript API".
// 2. Create an API key (APIs & Services → Credentials → Create Credentials → API key).
// 3. IMPORTANT: restrict the key (Application restrictions → HTTP referrers)
//    to your site's domain(s) once it's live, e.g. https://your-domain.com/*,
//    plus http://localhost:8000/* for local testing via `php -S localhost:8000`.
//    Maps JavaScript API keys are designed to be used in client-side code —
//    referrer restriction (not secrecy) is what keeps the key from being
//    abused by other sites. Update the referrer list here once your real
//    domain is decided/live.
// 4. Paste the key below, replacing the placeholder string.
//
// This file is loaded by find-us.html before the Google Maps script.
window.YAWDIS_MAPS_CONFIG = {
  apiKey: 'AIzaSyDRr3lDV_wbxrWYRrXrB-TkDm0V2LG0MW0'
};

# Yawdi's — Web App

Full-featured static storefront for Yawdi's Canadian condiment brand. No framework, no build step, no server required — open any HTML file in a browser or host on any static host (Netlify, GitHub Pages, Shopify custom storefront, etc.).

---

## Pages

| File | Purpose |
|---|---|
| `index.html` | English homepage |
| `index-fr.html` | French homepage (mirrors index.html) |
| `shop.html` | Full product listing |
| `bundle.html` | Interactive bundle builder |
| `community.html` | Community recipe wall |
| `story.html` | Our Story + press coverage |
| `find-us.html` | Store locator with Google Maps |
| `backend/admin.html` | Firebase-authenticated admin console (kept out of the public nav) |

---

## Features

### 🛒 Shopping Cart
- Slide-in cart drawer accessible from every page via the bag icon
- Persists across pages using `localStorage` (`yawdis-cart` key)
- Automatic **free shipping** unlocked at 4+ jars (otherwise $8.99)
- Live jar count badge on the cart icon
- Upsell prompt inside the drawer counting jars left to unlock free shipping
- Checkout button links to `https://www.yawdi.ca/shop` (configurable)

### 🔍 Search
- Full-page search overlay triggered by the magnifying glass icon
- Searches all 5 products by name and description in real time
- Highlighted keyword matches in results
- "Add to Cart" directly from search results

### 👤 Account System
- Slide-in account drawer — sign in or create account from any page
- **Login:** username + password (no email needed to log in)
- **Sign up:** username, email (required), password (min 6 chars) + confirmation
- Passwords hashed with SHA-256 via `crypto.subtle` (falls back to integer hash on non-HTTPS)
- All data stored in browser `localStorage` — no backend required
- Account icon updates to show user's initials when logged in
- Session persists until the user signs out

### 📧 Marketing Email List
- Every account registration saves the email to a separate `yawdis-marketing-emails` localStorage key
- Emails are stored independently of account/password data for easy export
- **To retrieve collected emails**, open the browser console on any page and run:
  ```js
  JSON.parse(localStorage.getItem('yawdis-marketing-emails'))
  ```

### 🌶️ Bundle Builder (`bundle.html`)
- Interactive product grid — all 5 products with +/− quantity selectors
- Live summary panel: per-item line totals, subtotal, shipping, grand total
- Prices pulled directly from the shared `PRODUCTS` array — always in sync with shop prices
- Free shipping banner appears automatically when 4+ jars are selected
- "Add Bundle to Cart" button writes directly to the shared cart and opens the cart drawer

### 🍽️ Community Wall (`community.html`)
- Community recipe cards are loaded from the shared Firestore `recipes` collection (click any card to open a detail modal)
- **Likes** — no account needed. Counts are stored in the shared Firestore `likes` collection; this browser's liked/unliked state is kept in `localStorage` as an abuse guard.
- **Comments** — no account needed. Visitors just enter a **Name** and **Comment**. New comments are saved with status `pending` and are **not shown publicly** until an admin approves them in `backend/admin.html`.
- Comment count only counts **approved** comments; pending/rejected comments are never shown to visitors.
- All comment text is HTML-escaped when rendered, so pasted `<script>`/HTML cannot execute (tested against a script-injection payload during development).

### 🛠️ Admin Console (`backend/admin.html`)
- Separate dark-themed console, intentionally unbranded and not linked from the site nav — open it directly at `backend/admin.html`.
- Uses Firebase Authentication for sign-in. Admin access is granted only when the signed-in user's UID has a matching document in the Firestore `admins` collection.
- **Comments tab:** Pending / Approved / Rejected / All views; each comment shows name, text, which recipe it's on, submission date, AI moderation details, and status. **Approve**, **Reject**, or **Delete** each comment.
- **Recipes tab:** add/edit recipes, upload images, manage recipe sections, undo the last edit, and use a recoverable Trash view.
- **Stores tab:** add/edit/delete store locations shown on the map — name, address, latitude/longitude, and a repeatable product + aisle list per store.
- **Story Page tab:** add/edit/reorder narrative sections and press items, including images, video/audio embed links, calls to action, undo, and Trash/Restore.
- Changes are saved to shared Firestore collections, so they are available to every visitor and on every device. The panel does not store shared admin content in browser `localStorage`.

### 📍 Where You Can Find Us (`find-us.html`)
- Store locator page linked from the main navbar on every page.
- Stores are managed entirely from the **"Stores" tab in `backend/admin.html`** — add, edit, or delete locations (name, address, optional latitude/longitude, and a product + aisle list per store) with no code editing required. Changes save to the shared Firestore `stores` collection and `find-us.html` reads from that collection directly. Stores without coordinates still appear in the list but do not receive a map marker.
- `stores-data.js` contains optional one-time sample seed data for an empty Firestore collection; it is not the live source of truth after seeding.
- Uses the Google Maps JavaScript API. **Setup required** (map shows a friendly "coming soon" message until configured):
  1. In [Google Cloud Console](https://console.cloud.google.com/), enable the **Maps JavaScript API** for your project.
  2. Create an API key (APIs & Services → Credentials).
  3. Restrict the key by **HTTP referrer** to your domain(s) — this is the correct way to protect a client-side Maps key (the key is meant to be visible in the page source; referrer restriction is what prevents abuse, not secrecy).
  4. Paste the key into `maps-config.js` (`GOOGLE_MAPS_API_KEY` placeholder).
- The 3 sample stores in `stores-data.js` are placeholders — replace with your real retail locations.

### 🍎 Shop Page Nutrition & Barcode (`shop.html`)
- Each product card has a collapsed **"Nutritional Facts & Barcode"** section that expands in place.
- Nutrition figures and barcode numbers come from the `nutrition` / `barcode` fields on each product in `cart.js` → `PRODUCTS` — **these are placeholder values**, not verified lab data. Replace them with your real Nutrition Facts panel numbers and real UPC barcodes before launch.
- Removed the redundant marketing sentence from each card (e.g. "Tropical sweet heat...") since that info is already covered by the existing "Pairs Well With" box, which is unchanged.

### 📖 Our Story (`story.html`)
- Story sections and press items are loaded from Firestore and can be managed from the **"Story Page" tab in `backend/admin.html`**.
- The initial seed contains 3 story sections: Origins, Founder/Leadership, Mission & Vision.
- **Press grid** initially contains 5 press items:
  - Culinaire Magazine (image + Issuu link)
  - CityLine TV (embedded YouTube video)
  - Women of Influence (image + article link)
  - Bet On Yourself Podcast (embedded Spotify player — listeners can play without leaving the page)
  - Loblaw (image + article link)

### 🇫🇷 French Page (`index-fr.html`)
- Full French translation of the homepage
- All interactive features work identically (French aria-labels wired in `cart.js`)
- Links to the same product pages and community

---

## Product Catalogue

Defined in `cart.js` → `PRODUCTS` array. Edit there to change names, prices, images, or add/remove products.

| ID | Name | Price |
|---|---|---|
| `mango` | Mango Pepper Jelly | $9.49 |
| `red-pepper` | Red Bell Pepper Jelly | $8.99 |
| `jerk` | Jerk Marinade | $8.49 |
| `lavender` | Lavender Pepper Jelly | $9.49 |
| `pineapple` | Pineapple Pepper Jelly | $8.99 |

Product images are in `content/Full Labels/`.

---

## File Structure

```
index.html          — English homepage
index-fr.html       — French homepage
shop.html           — Shop page
bundle.html         — Bundle builder
community.html      — Community recipes
story.html          — Our Story + press
find-us.html        — Store locator (Google Maps)
backend/admin.html   — Firebase-authenticated admin console (unbranded, dark theme)
styles.css          — Global stylesheet (CSS variables, all components)
cart.js             — Shared JS module: cart, search, accounts, products, Firebase data services
stores-data.js      — Optional sample store seed data
recipes-data.js     — Optional sample recipe seed data
story-data.js       — Optional sample story/press seed data
firebase-config.js  — Firebase project configuration
firestore.rules.txt — Firestore read/write security rules
storage.rules.txt   — Firebase Storage upload security rules
functions/          — Node.js Firebase Cloud Function for comment moderation
maps-config.js       — Google Maps API key placeholder + setup instructions
content/
  Full Labels/      — Product label images (used on shop + bundle)
  Silo Images/      — Product silo images (used on homepage tiles)
  Glam Shots/       — Lifestyle product photos
  AboutUs/          — Story page and press images
```

---

## Tech Stack

- **Pure HTML5 / CSS3 / Vanilla JavaScript** — no front-end framework or build step
- **Fonts:** Playfair Display + Inter via Google Fonts
- **Storage:** Browser `localStorage` for cart, browser account/session data, liked-state guard, and marketing emails; Firebase Firestore for shared recipes, stores, likes, comments, story content, and press content
- **Authentication:** Firebase Authentication for admin sign-in
- **File uploads:** Firebase Storage for admin-managed recipe and story images
- **Comment moderation:** Firebase Cloud Functions + OpenAI moderation API; the OpenAI key is stored as a Firebase Secret
- **Password security:** SHA-256 via `crypto.subtle` Web API
- **Hosting:** Works on any static host — Netlify, Vercel, GitHub Pages, etc.

---

## Customisation Checklist for New Owner

- [ ] Update checkout URL in `cart.js` → search for `yawdi.ca/shop`
- [ ] Update social links in all footers (Instagram, Facebook)
- [ ] Update press links/images in `story.html` as new coverage is added
- [ ] Replace `content/` images with updated product photography as needed
- [ ] Update product prices in `cart.js` → `PRODUCTS` array
- [ ] Replace `© 2025 Yawdi's` in footers with current year/brand name
- [ ] Connect a real email marketing service (Mailchimp, Klaviyo, etc.) by adding their embed form or API call inside the `AccountState.register()` flow in `cart.js`

---

## localStorage Keys Reference

| Key | Contents |
|---|---|
| `yawdis-cart` | Array of cart items `{id, name, price, size, img, qty}` |
| `yawdis-accounts` | Array of registered users `{name, email, hash}` |
| `yawdis-session` | Currently logged-in user `{name, email}` |
| `yawdis-liked-posts` | IDs of posts liked by this browser; shared like counts are stored in Firestore |
| `yawdis-marketing-emails` | Array of collected email strings |

---

## Architecture Note: Static Front End with Firebase Backend

The public pages are plain HTML, CSS, and JavaScript, so there is no front-end build step. Firebase provides the shared backend used by the admin panel and public content pages:

- Firestore stores shared recipes, stores, likes, comments, story sections, and press items.
- Firebase Authentication protects the admin sign-in.
- Firestore Security Rules allow public reads where appropriate but restrict content management to users listed in the `admins` collection.
- Firebase Storage stores uploaded recipe and story images, with file type, size, and admin checks in `storage.rules.txt`.
- The `moderateComment` Cloud Function sends new comments through OpenAI moderation, then marks them `approved`, `pending`, or `rejected`. Comments that require human review are handled in `backend/admin.html`.

The cart, browser account/session data, marketing email list, and this browser's liked-state guard still use `localStorage`. They are intentionally separate from the shared Firestore content system.

The initial content in `stores-data.js`, `recipes-data.js`, and `story-data.js` is optional seed data. Once seeded, Firestore is the live source of truth and administrators can update content without editing the public HTML files.

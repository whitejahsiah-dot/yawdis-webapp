// ── Yawdi's Cart & Search Module ──

// NOTE: nutrition/barcode values below are PLACEHOLDER data (clearly not real
// lab-verified facts). Replace with your actual Nutrition Facts panel figures
// and real UPC/barcode numbers before going live — see README.md.
const PRODUCTS = [
  {
    id: 'mango',
    name: "Mango Pepper Jelly",
    type: 'Pepper Jelly',
    price: 9.49,
    size: '250 mL',
    img: 'content/FullLabels/Mango.png',
    tags: ['mango', 'cheese board', 'brie', 'salmon', 'chicken', 'glaze', 'sweet', 'tropical'],
    pairs: ['Warm Brie', 'Salmon', 'Cream cheese', 'Chicken'],
    nutrition: { servingSize: '2 tbsp (30 g)', servingsPerContainer: 8, calories: 60, fat: 0, carbs: 15, sugar: 13, protein: 0, sodium: 10 },
    barcode: '0 61234 00011 4'
  },
  {
    id: 'red-pepper',
    name: 'Red Pepper Jelly',
    type: 'Pepper Jelly',
    price: 8.99,
    size: '250 mL',
    img: 'content/FullLabels/RedPepper.png',
    tags: ['red pepper', 'cheese board', 'ham', 'pork chops', 'brie', 'panini', 'sweet', 'tangy'],
    pairs: ['Ham & pork chops', 'Brie', 'Panini', 'Turkey'],
    nutrition: { servingSize: '2 tbsp (30 g)', servingsPerContainer: 8, calories: 55, fat: 0, carbs: 14, sugar: 12, protein: 0, sodium: 15 },
    barcode: '0 61234 00022 0'
  },
  {
    id: 'jerk',
    name: 'Jerk Marinade',
    type: 'Marinade',
    price: 8.49,
    size: '250 mL',
    img: 'content/FullLabels/jerk.png',
    tags: ['jerk', 'chicken', 'pork', 'salmon', 'tofu', 'vegetables', 'spicy', 'jamaican', 'marinade', 'hot'],
    pairs: ['Chicken', 'Pork', 'Salmon', 'Tofu'],
    nutrition: { servingSize: '1 tbsp (15 g)', servingsPerContainer: 16, calories: 20, fat: 0.5, carbs: 3, sugar: 2, protein: 0, sodium: 190 },
    barcode: '0 61234 00033 7'
  },
  {
    id: 'lavender',
    name: 'Lavender Pepper Jelly',
    type: 'Pepper Jelly',
    price: 9.49,
    size: '250 mL',
    img: 'content/FullLabels/Lavender.png',
    tags: ['lavender', 'lamb', 'pork', 'chicken', 'ice cream', 'yogurt', 'floral', 'elegant'],
    pairs: ['Lamb chops', 'Cheesecake', 'Ice cream', 'Crackers'],
    nutrition: { servingSize: '2 tbsp (30 g)', servingsPerContainer: 8, calories: 60, fat: 0, carbs: 15, sugar: 13, protein: 0, sodium: 10 },
    barcode: '0 61234 00044 3'
  },
  {
    id: 'pineapple',
    name: 'Pineapple Pepper Jelly',
    type: 'Pepper Jelly',
    price: 8.99,
    size: '250 mL',
    img: 'content/FullLabels/Pineapple.png',
    tags: ['pineapple', 'pork', 'chicken', 'seafood', 'ice cream', 'spring rolls', 'tropical', 'citrus'],
    pairs: ['Chicken tenders', 'Ham', 'Samosas', 'Pork chops'],
    nutrition: { servingSize: '2 tbsp (30 g)', servingsPerContainer: 8, calories: 55, fat: 0, carbs: 14, sugar: 12, protein: 0, sodium: 10 },
    barcode: '0 61234 00055 9'
  }
];

// id -> display title, used by community.html and admin.html so comment
// moderation can show which recipe/page a comment belongs to.
const COMMUNITY_POST_TITLES = {
  'jerk-bbq-wings-red-pepper': 'Jerk-BBQ Wings with Red Pepper Jelly',
  'jerk-salmon-air-fryer': 'Jerk Salmon in the Air Fryer',
  'beer-mustard-potato-salad': 'Beer Mustard Potato Salad',
  'roast-beef-sandwich': 'Roast Beef Sandwich',
  'jerk-portobello-mushroom': 'Jerk Portobello Mushroom',
  'mango-salad': 'Mango Salad',
  'west-indian-roast-beef': 'West-Indian Style Roast Beef',
  'jerk-chicken': 'Jerk Chicken'
};

// ── Firebase (shared backend) ──
//
// Firestore + Firebase Auth power comments/likes/stores so changes made by
// the admin (or comments left by any visitor) are visible to EVERY visitor,
// on any device/network — not just the browser that made them.
// window.YAWDIS_FIREBASE_CONFIG comes from firebase-config.js (loaded before
// this file on every page, since the announcement banner
// reads shared settings from Firestore). The config value itself is safe to be public; real
// protection is Firestore Security Rules + Firebase Authentication.
if (typeof firebase !== 'undefined' && window.YAWDIS_FIREBASE_CONFIG && !firebase.apps.length) {
  firebase.initializeApp(window.YAWDIS_FIREBASE_CONFIG);
}
const db = (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) ? firebase.firestore() : null;

const AdminAuth = {
  onChange(callback) { firebase.auth().onAuthStateChanged(callback); },
  signIn(email, password) { return firebase.auth().signInWithEmailAndPassword(email, password); },
  signOut() { return firebase.auth().signOut(); },
  current() { return firebase.auth().currentUser; }
};

// ── Media Uploads (Firebase Storage, admin-only) ──
//
// Lets backend/admin.html upload real image files instead of pasting a URL.
// Only used on admin pages (requires firebase-storage-compat.js loaded);
// Storage Security Rules restrict writes to the signed-in admin and cap
// file size/type, mirroring the Firestore admins/ check.
const MediaUpload = {
  MAX_BYTES: 5 * 1024 * 1024, // 5MB

  async uploadImage(file, folder) {
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
    if (file.size > this.MAX_BYTES) throw new Error('Image is too large (max 5MB).');
    const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `${folder}/${Date.now()}-${safeName}`;
    const ref = firebase.storage().ref(path);
    await ref.put(file);
    return await ref.getDownloadURL();
  }
};

// ── Community Likes & Comments (no login required to participate) ──
//
// Backed by Firestore, so comments/likes are visible to every visitor on any
// device/network — not just the browser that created them. New comments
// save with status "pending" and only become public once an admin approves
// them in backend/admin.html (see firestore.rules.txt for enforcement).
const CommunityStore = {
  LIKED_KEY: 'yawdis-liked-posts', // local-only: which posts THIS device has liked (abuse guard)

  loadLikedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(this.LIKED_KEY) || '[]')); }
    catch { return new Set(); }
  },
  saveLikedSet(set) { localStorage.setItem(this.LIKED_KEY, JSON.stringify([...set])); },

  async getLikeState(postId) {
    const snap = await db.collection('likes').doc(postId).get();
    const count = snap.exists ? (snap.data().count || 0) : 0;
    return { count, likedByThisDevice: this.loadLikedSet().has(postId) };
  },

  // Toggling is the abuse-mitigation: a browser can only be in a liked or
  // unliked state per post, so it can't repeatedly add likes for the same post.
  async toggleLike(postId) {
    const likedSet = this.loadLikedSet();
    const wasLiked = likedSet.has(postId);
    const delta = wasLiked ? -1 : 1;
    const ref = db.collection('likes').doc(postId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const current = snap.exists ? (snap.data().count || 0) : 0;
      tx.set(ref, { count: Math.max(0, current + delta) }, { merge: true });
    });
    if (wasLiked) likedSet.delete(postId); else likedSet.add(postId);
    this.saveLikedSet(likedSet);
    const snap = await ref.get();
    return { count: snap.data().count || 0, likedByThisDevice: !wasLiked };
  },

  // name/text are trimmed + length-capped here; they are still escaped again
  // at render time (never trust stored data to be safe to inject as HTML).
  async addComment(postId, name, text) {
    const clean = (s, max) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
    const cleanName = clean(name, 60) || 'Anonymous';
    const cleanText = clean(text, 500);
    if (!cleanText) return null;
    const doc = {
      postId,
      name: cleanName,
      text: cleanText,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };
    const ref = await db.collection('comments').add(doc);
    return { id: ref.id, postId, name: cleanName, text: cleanText, status: 'pending', createdAt: new Date().toISOString() };
  },

  async approvedComments(postId) {
    const snap = await db.collection('comments')
      .where('postId', '==', postId)
      .where('status', '==', 'approved')
      .get();
    return snap.docs.map(d => this._fromDoc(d)).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  },

  async approvedCount(postId) {
    return (await this.approvedComments(postId)).length;
  },

  // admin-only — Firestore rules restrict unfiltered reads to the authenticated admin
  async allComments() {
    const snap = await db.collection('comments').get();
    return snap.docs.map(d => this._fromDoc(d)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async setStatus(id, status) { await db.collection('comments').doc(id).update({ status }); },
  async deleteComment(id) { await db.collection('comments').doc(id).delete(); },

  _fromDoc(d) {
    const data = d.data();
    return {
      id: d.id,
      postId: data.postId,
      name: data.name,
      text: data.text,
      status: data.status,
      aiCategory: data.aiCategory || null,
      aiConfidence: typeof data.aiConfidence === 'number' ? data.aiConfidence : null,
      aiReason: data.aiReason || null,
      createdAt: (data.createdAt && data.createdAt.toDate) ? data.createdAt.toDate().toISOString() : new Date().toISOString()
    };
  }
};

// ── Store Locator (editable from backend/admin.html, no hardcoding required) ──
//
// Backed by Firestore so a store the admin adds is visible to every visitor,
// on any device/network — not just the admin's own browser. Reading stores
// requires no login; adding/editing/deleting is restricted to the
// authenticated admin by Firestore Security Rules.
const StoresStore = {
  async getAll() {
    const snap = await db.collection('stores').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async get(id) {
    const snap = await db.collection('stores').doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },
  async add(store) {
    const ref = await db.collection('stores').add(store);
    return { id: ref.id, ...store };
  },
  async update(id, updates) { await db.collection('stores').doc(id).update(updates); },
  async delete(id) { await db.collection('stores').doc(id).delete(); },

  // One-time admin-only helper: populates the sample stores from
  // stores-data.js if the "stores" collection is still empty.
  async seedIfEmpty() {
    const existing = await this.getAll();
    if (existing.length > 0) return 0;
    const seed = (typeof STORES !== 'undefined' ? STORES : []);
    for (const store of seed) {
      const { id, ...rest } = store;
      await this.add(rest);
    }
    return seed.length;
  }
};

// ── Community Recipes (editable from backend/admin.html, no hardcoding required) ──
//
// Backed by Firestore, so a recipe the admin adds shows up for every visitor
// on any device, with the exact same card/modal/like/comment behaviour as
// the original hand-written recipes. Reading recipes requires no login;
// adding/editing/deleting is admin-only (Firestore Security Rules).
const RecipeStore = {
  async getAll() {
    const snap = await db.collection('recipes').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => this._fromDoc(d)).filter(r => !r.deleted);
  },
  // Soft-deleted recipes, for the admin's Trash view.
  async getTrash() {
    const snap = await db.collection('recipes').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => this._fromDoc(d)).filter(r => !!r.deleted);
  },
  async get(id) {
    const snap = await db.collection('recipes').doc(id).get();
    return snap.exists ? this._fromDoc(snap) : null;
  },
  async add(recipe) {
    const doc = { ...recipe, createdAt: firebase.firestore.FieldValue.serverTimestamp() };
    const ref = await db.collection('recipes').add(doc);
    return { id: ref.id, ...recipe };
  },
  // Saves the pre-edit content as previousVersion so a single "Undo Last Edit" is possible.
  async update(id, updates) {
    const snap = await db.collection('recipes').doc(id).get();
    const previousVersion = snap.exists ? this._contentFields(snap.data()) : null;
    await db.collection('recipes').doc(id).update({ ...updates, previousVersion });
  },
  // Swaps the current content with the saved previousVersion (toggles back and forth).
  async undoEdit(id) {
    const snap = await db.collection('recipes').doc(id).get();
    if (!snap.exists) return false;
    const data = snap.data();
    if (!data.previousVersion) return false;
    const currentContent = this._contentFields(data);
    await db.collection('recipes').doc(id).update({ ...data.previousVersion, previousVersion: currentContent });
    return true;
  },
  // Soft delete: hides the recipe everywhere but keeps it recoverable from the admin Trash.
  async delete(id) { await db.collection('recipes').doc(id).update({ deleted: true, deletedAt: firebase.firestore.FieldValue.serverTimestamp() }); },
  async restore(id) { await db.collection('recipes').doc(id).update({ deleted: false }); },
  async permanentDelete(id) { await db.collection('recipes').doc(id).delete(); },

  // One-time admin-only helper: populates the 8 original recipes from
  // recipes-data.js if the "recipes" collection is still empty.
  async seedIfEmpty() {
    const existing = await this.getAll();
    if (existing.length > 0) return 0;
    const seed = (typeof RECIPES_SEED !== 'undefined' ? RECIPES_SEED : []);
    for (const recipe of seed) { await this.add(recipe); }
    return seed.length;
  },

  // Strips history/soft-delete metadata so it isn't nested into itself when saved as a snapshot.
  _contentFields(data) {
    const { previousVersion, deleted, deletedAt, createdAt, ...content } = data;
    return content;
  },

  _fromDoc(d) {
    const data = d.data();
    return { id: d.id, ...data, createdAt: (data.createdAt && data.createdAt.toDate) ? data.createdAt.toDate().toISOString() : new Date().toISOString() };
  }
};

// ── Our Story Page (editable from backend/admin.html, no hardcoding required) ──
//
// Narrative sections and press items are both backed by Firestore so the
// admin can add a new section, edit any section's text/media, reorder, or
// delete — without touching story.html's code or design. Both support a
// single-step "Undo Last Edit" and a soft-delete Trash (Restore / Delete
// Forever), the same as RecipeStore above.
const StoryStore = {
  async getSections() {
    const snap = await db.collection('story_sections').orderBy('order', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !s.deleted);
  },
  async getSectionsTrash() {
    const snap = await db.collection('story_sections').orderBy('order', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => !!s.deleted);
  },
  async getSection(id) {
    const snap = await db.collection('story_sections').doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },
  async addSection(section) {
    const ref = await db.collection('story_sections').add(section);
    return { id: ref.id, ...section };
  },
  async updateSection(id, updates) {
    const snap = await db.collection('story_sections').doc(id).get();
    const previousVersion = snap.exists ? this._contentFields(snap.data()) : null;
    await db.collection('story_sections').doc(id).update({ ...updates, previousVersion });
  },
  async undoSectionEdit(id) {
    const snap = await db.collection('story_sections').doc(id).get();
    if (!snap.exists) return false;
    const data = snap.data();
    if (!data.previousVersion) return false;
    const currentContent = this._contentFields(data);
    await db.collection('story_sections').doc(id).update({ ...data.previousVersion, previousVersion: currentContent });
    return true;
  },
  async deleteSection(id) { await db.collection('story_sections').doc(id).update({ deleted: true, deletedAt: firebase.firestore.FieldValue.serverTimestamp() }); },
  async restoreSection(id) { await db.collection('story_sections').doc(id).update({ deleted: false }); },
  async permanentDeleteSection(id) { await db.collection('story_sections').doc(id).delete(); },

  async getPressItems() {
    const snap = await db.collection('press_items').orderBy('order', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !p.deleted);
  },
  async getPressItemsTrash() {
    const snap = await db.collection('press_items').orderBy('order', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => !!p.deleted);
  },
  async getPressItem(id) {
    const snap = await db.collection('press_items').doc(id).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },
  async addPressItem(item) {
    const ref = await db.collection('press_items').add(item);
    return { id: ref.id, ...item };
  },
  async updatePressItem(id, updates) {
    const snap = await db.collection('press_items').doc(id).get();
    const previousVersion = snap.exists ? this._contentFields(snap.data()) : null;
    await db.collection('press_items').doc(id).update({ ...updates, previousVersion });
  },
  async undoPressItemEdit(id) {
    const snap = await db.collection('press_items').doc(id).get();
    if (!snap.exists) return false;
    const data = snap.data();
    if (!data.previousVersion) return false;
    const currentContent = this._contentFields(data);
    await db.collection('press_items').doc(id).update({ ...data.previousVersion, previousVersion: currentContent });
    return true;
  },
  async deletePressItem(id) { await db.collection('press_items').doc(id).update({ deleted: true, deletedAt: firebase.firestore.FieldValue.serverTimestamp() }); },
  async restorePressItem(id) { await db.collection('press_items').doc(id).update({ deleted: false }); },
  async permanentDeletePressItem(id) { await db.collection('press_items').doc(id).delete(); },

  // One-time admin-only helper: populates the original 3 sections + 5 press
  // items from story-data.js if those collections are still empty.
  async seedIfEmpty() {
    const existingSections = await this.getSections();
    const existingPress = await this.getPressItems();
    let count = 0;
    if (!existingSections.length && typeof STORY_SECTIONS_SEED !== 'undefined') {
      for (const section of STORY_SECTIONS_SEED) { await this.addSection(section); count++; }
    }
    if (!existingPress.length && typeof PRESS_ITEMS_SEED !== 'undefined') {
      for (const item of PRESS_ITEMS_SEED) { await this.addPressItem(item); count++; }
    }
    return count;
  },

  // Strips history/soft-delete metadata so it isn't nested into itself when saved as a snapshot.
  _contentFields(data) {
    const { previousVersion, deleted, deletedAt, ...content } = data;
    return content;
  }
};



// ── Cart State ──

const CartState = {
  items: [],

  load() {
    try { this.items = JSON.parse(localStorage.getItem('yawdis-cart') || '[]'); }
    catch (e) { this.items = []; }
  },

  save() {
    localStorage.setItem('yawdis-cart', JSON.stringify(this.items));
  },

  add(productId) {
    const product = PRODUCTS.find(p => p.id === productId);
    if (!product) return;
    const existing = this.items.find(i => i.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        size: product.size,
        img: product.img,
        qty: 1
      });
    }
    this.save();
    updateBadge();
    showAddedFeedback(productId);
    renderCart();
  },

  remove(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this.save();
    updateBadge();
    renderCart();
  },

  setQty(productId, qty) {
    if (qty <= 0) { this.remove(productId); return; }
    const item = this.items.find(i => i.id === productId);
    if (item) { item.qty = qty; this.save(); updateBadge(); renderCart(); }
  },

  total() {
    return this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  },

  count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  }
};

function updateBadge() {
  const count = CartState.count();
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = count;
    b.style.display = count === 0 ? 'none' : '';
  });
}

function showAddedFeedback(productId) {
  document.querySelectorAll(`[data-cart-id="${productId}"]`).forEach(btn => {
    const orig = btn.innerHTML;
    btn.innerHTML = '&#10003; Added!';
    btn.classList.add('btn-added');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('btn-added');
    }, 1500);
  });
}

// ── Search Overlay ──

function buildSearchOverlay() {
  if (document.getElementById('yw-search-overlay')) return;
  const el = document.createElement('div');
  el.id = 'yw-search-overlay';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Product search');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="yw-search-backdrop" id="yw-search-backdrop"></div>
    <div class="yw-search-panel">
      <div class="yw-search-header">
        <div class="yw-search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input type="search" id="yw-search-input" placeholder="Search products\u2026" autocomplete="off" spellcheck="false" aria-label="Search products" />
        </div>
        <button class="yw-search-close" id="yw-search-close" aria-label="Close search">&times;</button>
      </div>
      <div id="yw-search-results" class="yw-search-results" role="list" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById('yw-search-backdrop').addEventListener('click', closeSearch);
  document.getElementById('yw-search-close').addEventListener('click', closeSearch);
  document.getElementById('yw-search-input').addEventListener('input', handleSearchInput);
}

function openSearch() {
  buildSearchOverlay();
  document.getElementById('yw-search-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('yw-search-input').focus(), 60);
  renderSearchResults(PRODUCTS, '');
}

function closeSearch() {
  const el = document.getElementById('yw-search-overlay');
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}

function handleSearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderSearchResults(PRODUCTS, ''); return; }
  const results = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.type.toLowerCase().includes(q) ||
    p.tags.some(t => t.toLowerCase().includes(q))
  );
  renderSearchResults(results, q);
}

function renderSearchResults(results, q) {
  const container = document.getElementById('yw-search-results');
  if (!results.length) {
    container.innerHTML = `<p class="yw-search-empty">No products found${q ? ` for \u201c<strong>${escHtml(q)}</strong>\u201d` : ''}.</p>`;
    return;
  }
  container.innerHTML = results.map(p => `
    <div class="yw-search-item" role="listitem">
      <a href="shop.html#${p.id}" class="yw-search-item-link" onclick="closeSearch()">
        <div class="yw-search-item-img">
          <img src="${escHtml(p.img)}" alt="${escHtml(p.name)}" loading="lazy" />
        </div>
        <div class="yw-search-item-info">
          <span class="yw-search-item-type">${escHtml(p.type)}</span>
          <strong class="yw-search-item-name">${highlightMatch(p.name, q)}</strong>
          <span class="yw-search-item-price">$${p.price.toFixed(2)} <em>${escHtml(p.size)}</em></span>
        </div>
      </a>
      <button class="btn btn-maroon btn-sm yw-search-add-btn" data-cart-id="${p.id}" aria-label="Add ${escHtml(p.name)} to cart">Add</button>
    </div>
  `).join('');
}

function highlightMatch(text, q) {
  if (!q) return escHtml(text);
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escHtml(text).replace(new RegExp(`(${safe})`, 'gi'), '<mark class="yw-hl">$1</mark>');
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Cart Drawer ──

function buildCartDrawer() {
  if (document.getElementById('yw-cart-drawer')) return;
  const el = document.createElement('div');
  el.id = 'yw-cart-drawer';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Shopping cart');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `
    <div class="yw-cart-backdrop" id="yw-cart-backdrop"></div>
    <div class="yw-cart-panel">
      <div class="yw-cart-header">
        <h2>Your Cart <span class="yw-cart-count" id="yw-cart-count"></span></h2>
        <button class="yw-cart-close" id="yw-cart-close" aria-label="Close cart">&times;</button>
      </div>
      <div class="yw-cart-body" id="yw-cart-body"></div>
      <div class="yw-cart-footer" id="yw-cart-footer"></div>
    </div>
  `;
  document.body.appendChild(el);
  document.getElementById('yw-cart-backdrop').addEventListener('click', closeCart);
  document.getElementById('yw-cart-close').addEventListener('click', closeCart);

  el.addEventListener('click', e => {
    const qtyBtn = e.target.closest('.yw-qty-btn');
    if (qtyBtn) {
      const id = qtyBtn.closest('.yw-cart-item').dataset.itemId;
      const delta = qtyBtn.dataset.delta === '+' ? 1 : -1;
      const item = CartState.items.find(i => i.id === id);
      if (item) CartState.setQty(id, item.qty + delta);
    }
    const removeBtn = e.target.closest('.yw-remove-btn');
    if (removeBtn) {
      CartState.remove(removeBtn.closest('.yw-cart-item').dataset.itemId);
    }
  });
}

function renderCart() {
  buildCartDrawer();
  const body = document.getElementById('yw-cart-body');
  const footer = document.getElementById('yw-cart-footer');
  const countEl = document.getElementById('yw-cart-count');

  const count = CartState.count();
  const total = CartState.total();
  const shipping = 8.99;

  if (countEl) countEl.textContent = count > 0 ? `(${count})` : '';

  if (!CartState.items.length) {
    body.innerHTML = `
      <div class="yw-cart-empty">
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        <p>Your cart is empty.</p>
        <a href="shop.html" class="btn btn-maroon btn-sm" onclick="closeCart()">Shop Now</a>
      </div>`;
    footer.innerHTML = '';
    return;
  }

  body.innerHTML = CartState.items.map(item => `
    <div class="yw-cart-item" data-item-id="${item.id}">
      <div class="yw-cart-item-img">
        <img src="${escHtml(item.img)}" alt="${escHtml(item.name)}" loading="lazy" />
      </div>
      <div class="yw-cart-item-details">
        <p class="yw-cart-item-name">${escHtml(item.name)}</p>
        <p class="yw-cart-item-size">${escHtml(item.size)}</p>
        <div class="yw-qty-row">
          <button class="yw-qty-btn" data-delta="-" aria-label="Decrease quantity">\u2212</button>
          <span class="yw-qty-display">${item.qty}</span>
          <button class="yw-qty-btn" data-delta="+" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="yw-cart-item-right">
        <span class="yw-cart-item-total">$${(item.price * item.qty).toFixed(2)}</span>
        <button class="yw-remove-btn" aria-label="Remove ${escHtml(item.name)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  footer.innerHTML = `
    <div class="yw-cart-totals">
      <div class="yw-total-row"><span>Subtotal</span><span>$${total.toFixed(2)}</span></div>
      <div class="yw-total-row">
        <span>Shipping</span>
        <span>$${shipping.toFixed(2)}</span>
      </div>
      <div class="yw-total-row yw-grand-total">
        <span>Total</span>
        <span>$${(total + shipping).toFixed(2)}</span>
      </div>
    </div>
    <a href="https://www.yawdi.ca/shop" target="_blank" rel="noopener" class="btn btn-maroon" style="width:100%;justify-content:center;margin-top:18px;">Checkout</a>
    <button class="btn btn-outline" style="width:100%;justify-content:center;margin-top:10px;" onclick="closeCart()">Continue Shopping</button>
  `;
}

function openCart() {
  buildCartDrawer();
  renderCart();
  document.getElementById('yw-cart-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const el = document.getElementById('yw-cart-drawer');
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}

// ── Account ──
// The sign-in/create-account system has been removed site-wide (no feature
// requires it anymore). pwHash() is kept because admin.html reuses it to
// hash the admin passcode.

async function pwHash(password) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // fallback for non-secure contexts
    let h = 0;
    for (let i = 0; i < password.length; i++) h = (Math.imul(31, h) + password.charCodeAt(i)) | 0;
    return String(Math.abs(h));
  }
}

// ── Init ──

document.addEventListener('DOMContentLoaded', () => {
  // When shopify-cart.js is on the page it owns the cart drawer, badge and add-to-cart buttons
  const shopifyCart = !!window.YawdisCart;
  CartState.load();
  if (!shopifyCart) updateBadge();

  document.querySelectorAll('[aria-label="Search"], [aria-label="Rechercher"]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); openSearch(); });
  });

  if (!shopifyCart) {
    document.querySelectorAll('.cart-link').forEach(el => {
      el.addEventListener('click', e => { e.preventDefault(); openCart(); });
    });
  }

  // Mobile hamburger — reveals nav-left as a dropdown (checkbox has no CSS-only sibling target)
  const navToggle = document.getElementById('nav-toggle');
  const navLeft = document.querySelector('.nav-left');
  if (navToggle && navLeft) {
    navToggle.addEventListener('change', () => navLeft.classList.toggle('open', navToggle.checked));
    navLeft.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => { navToggle.checked = false; navLeft.classList.remove('open'); });
    });
  }

  // Delegated handler for all [data-cart-id] buttons across the page
  document.addEventListener('click', e => {
    if (shopifyCart) return;
    const btn = e.target.closest('[data-cart-id]');
    if (!btn) return;
    e.preventDefault();
    CartState.add(btn.dataset.cartId);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); shopifyCart ? window.YawdisCart.closeDrawer() : closeCart(); }
  });
});

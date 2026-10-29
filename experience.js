// Yawdi's — experience layer.
// Adds motion on top of the existing pages without changing their content:
// headline + section reveals, staggered cards (including ones rendered later by
// Shopify/Firestore), hero jar intro, nav polish, fly-to-cart, value-bar marquee.
import { animate, scroll, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@12.29.3/+esm";

const root = document.documentElement;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const EASE = [0.2, 0.8, 0.2, 1];
const narrow = window.matchMedia("(max-width: 1024px)"); // matches the swipe-row breakpoint in experience.css
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

window.__xp = true;
if (!reduce) root.classList.add("xp-motion");

// ── What gets revealed, and how ──
const TEXT = [
  ".hero-home-text > *", ".product-strip-header > *", ".section-center > *",
  ".promo-banner-text > *", ".about-strip-text > *", ".shop-header > *",
  ".community-hero-left > *", ".story-hero > *", ".find-us-header > *",
  ".press-section-header > *", ".community-cta-text > *", ".story-text > *",
  ".community-controls-row", ".load-more-wrap",
].join(",");
const CARDS = [
  ".product-tile", ".recipe-card", ".shop-card", ".community-card",
  ".press-card", ".find-us-store-card", ".footer-col", ".promo-banner-img img",
  ".find-us-map-panel", ".shop-sidebar",
].join(",");
const FRAMES = [
  ".about-strip-img img", ".community-hero-right img",
  ".community-cta-img img", ".story-img:not(.logo-img) img",
].join(",");

// ── Batched reveal: everything entering view in the same frame staggers together ──
let queue = [];
let flushScheduled = false;

function finish(el) {
  el.removeAttribute("data-xp");
  el.style.opacity = "";
  el.style.transform = "";
  el.style.transition = "";
  el.style.clipPath = "";
}

function flush() {
  flushScheduled = false;
  const batch = queue.sort((a, b) => {
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    return ra.top - rb.top || ra.left - rb.left;
  });
  queue = [];
  batch.forEach((el, i) => {
    const kind = el.dataset.xp;
    if (reduce) return finish(el);
    el.style.transition = "none"; // CSS hover transitions would fight per-frame updates
    const delay = Math.min(i, 8) * 0.07;
    let anim;
    if (kind === "frame") {
      anim = animate(el, { clipPath: ["inset(0% 0% 100% 0%)", "inset(0% 0% 0% 0%)"], opacity: [1, 1], scale: [1.12, 1] },
        { duration: 1.1, delay, ease: EASE });
    } else if (kind === "line") {
      // h1: slide each masked line up
      el.style.opacity = "1";
      anim = animate(el.querySelectorAll(".xp-line > span"), { y: ["105%", "0%"] }, { duration: 0.9, delay: stagger(0.09, { startDelay: delay }), ease: EASE });
    } else {
      anim = animate(el, { opacity: [0, 1], y: [kind === "card" ? 36 : 20, 0] }, { duration: 0.8, delay, ease: EASE });
    }
    anim.then(() => {
      if (kind === "line") { el.querySelectorAll(".xp-line > span").forEach(s => (s.style.transform = "")); el.removeAttribute("data-xp"); el.style.opacity = ""; }
      else finish(el);
    });
  });
}

function enqueue(el) {
  queue.push(el);
  if (!flushScheduled) { flushScheduled = true; requestAnimationFrame(flush); }
}

function splitLines(h1) {
  if (h1.dataset.xpSplit) return;
  h1.dataset.xpSplit = "1";
  const lines = [[]];
  [...h1.childNodes].forEach(n => (n.nodeName === "BR" ? lines.push([]) : lines.at(-1).push(n)));
  h1.textContent = "";
  lines.filter(l => l.some(n => n.textContent.trim())).forEach(nodes => {
    const outer = document.createElement("span"), inner = document.createElement("span");
    outer.className = "xp-line";
    inner.append(...nodes);
    outer.append(inner);
    h1.append(outer);
  });
}

function tag(el, kind) {
  if (el.dataset.xp || el.dataset.xpSeen) return;
  if (el.closest(".site-nav, #yw-cart-drawer, #yw-search-overlay, .cc-modal-backdrop")) return;
  // In the phone/tablet swipe rows, cards start off-screen sideways; reveal the row as one piece instead
  if (narrow.matches && el.parentElement?.matches(".recipe-row, .press-grid")) { tag(el.parentElement, "card"); return; }
  el.dataset.xpSeen = "1";
  if (el.matches("h1")) { splitLines(el); kind = "line"; }
  el.dataset.xp = kind;
  inView(el, () => enqueue(el), { amount: 0.15 });
}

function scan(scope) {
  if (!(scope instanceof Element)) return;
  const pick = (sel, kind) => {
    if (scope.matches(sel)) tag(scope, kind);
    scope.querySelectorAll(sel).forEach(el => tag(el, kind));
  };
  pick(TEXT, "text");
  pick(CARDS, "card");
  pick(FRAMES, "frame");
}

// ── Emoji → line icons, site-wide (incl. text the cart and like counters re-render later) ──
const GLYPH_PATHS = {
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  gift: '<path d="M4 11h16v9H4z"/><path d="M3 8h18v3H3z"/><path d="M12 8v12"/><path d="M12 8c-1.5-3-5-3.5-5-1.2C7 8 9.5 8 12 8z"/><path d="M12 8c1.5-3 5-3.5 5-1.2C17 8 14.5 8 12 8z"/>',
  chat: '<path d="M4 5h16v11H10l-5 4v-4H4z"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
};
const GLYPH_FOR = { "\u2665": "heart", "\u2661": "heart", "\u26A1": "bolt", "\u{1F381}": "gift", "\u{1F4AC}": "chat" };
const GLYPH_SRC = "(\u2665|\u2661|\u26A1|\u{1F381}|\u{1F4AC})\uFE0F?";
const GLYPH_RE = new RegExp(GLYPH_SRC, "u");

function glyph(ch, textNode) {
  // A filled heart means "liked"; decorative hearts in eyebrows stay as outlines
  const filled = ch === "\u2665" && !textNode.parentElement?.closest(".eyebrow");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", `xp-glyph xp-glyph-${GLYPH_FOR[ch]}${filled ? " is-filled" : ""}`);
  svg.innerHTML = GLYPH_PATHS[GLYPH_FOR[ch]];
  return svg;
}

function swapGlyphs(scope) {
  if (!(scope instanceof Element || scope instanceof Text)) return;
  const texts = [];
  if (scope instanceof Text) texts.push(scope);
  else {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) texts.push(walker.currentNode);
  }
  texts.forEach(t => {
    if (!GLYPH_RE.test(t.data) || t.parentElement?.closest("script, style, textarea, title, svg")) return;
    const frag = document.createDocumentFragment();
    t.data.split(new RegExp(GLYPH_SRC, "gu")).forEach((part, i) => {
      if (i % 2) frag.append(glyph(part, t));
      else if (part) frag.append(part);
    });
    t.replaceWith(frag);
  });
}

swapGlyphs(document.body);

scan(document.body);
// Shop, community, story and find-us render cards after load — reveal those too.
new MutationObserver(records => {
  records.forEach(r => r.addedNodes.forEach(n => { scan(n); swapGlyphs(n); }));
}).observe(document.body, { childList: true, subtree: true });

// Filters/tabs hide and show cards in place; give the visible ones a quick re-stagger.
document.addEventListener("click", e => {
  if (reduce || !e.target.closest(".filter-btn, .tab-btn")) return;
  requestAnimationFrame(() => {
    const cards = $$(".shop-card, .community-card").filter(c => c.offsetParent !== null && !c.dataset.xp);
    if (!cards.length) return;
    cards.forEach(c => (c.style.transition = "none"));
    animate(cards, { opacity: [0, 1], y: [16, 0] }, { duration: 0.45, delay: stagger(0.04), ease: EASE })
      .then(() => cards.forEach(finish));
  });
});

// ── Home hero: jar carousel — drag/swipe, trackpad side-scroll, click a side jar, arrow keys or dots ──
// Slides come from the page's own product tiles, so names, images and links match the site.
const stageEl = document.querySelector(".hero-home-images");
const tiles = $$(".product-tile");
if (stageEl && tiles.length > 1) {
  const items = tiles.map(t => {
    const img = t.querySelector("img");
    return { src: img.getAttribute("src"), alt: img.alt, name: t.querySelector("h3")?.textContent.trim() || img.alt, href: t.querySelector("a[href]")?.getAttribute("href") || "#" };
  });
  // The carousel now shows every product, so the tile strip below it is redundant
  tiles[0].closest(".product-strip")?.remove();
  // Open on the hero's own left / main / right jars so the first view matches the live site
  const heroSrcs = [".hero-jar-left", ".hero-jar-main", ".hero-jar-right"].map(s => stageEl.querySelector(s)?.getAttribute("src"));
  const rank = it => { const i = heroSrcs.indexOf(it.src); return i < 0 ? 3 : i; };
  items.sort((a, b) => rank(a) - rank(b));
  const n = items.length;
  let pos = Math.max(0, items.findIndex(it => it.src === heroSrcs[1]));

  const wrapEl = document.createElement("div");
  wrapEl.className = "xp-carousel";
  wrapEl.setAttribute("role", "region");
  wrapEl.setAttribute("aria-roledescription", "carousel");
  wrapEl.setAttribute("aria-label", "Our products");
  wrapEl.tabIndex = 0;
  const slides = items.map((it, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "xp-slide";
    b.setAttribute("aria-label", it.name);
    b.innerHTML = `<img src="${it.src}" alt="" draggable="false" />`;
    wrapEl.append(b);
    return b;
  });
  const label = document.createElement("div");
  label.className = "xp-carousel-label";
  label.innerHTML = `<a class="xp-carousel-name" aria-live="polite"></a><div class="xp-dots"></div>`;
  const nameEl = label.querySelector(".xp-carousel-name");
  const dots = items.map((it, i) => {
    const d = document.createElement("button");
    d.type = "button";
    d.setAttribute("aria-label", `Show ${it.name}`);
    d.addEventListener("click", () => goTo(Math.round(pos) + shortest(i - mod(Math.round(pos)))));
    label.querySelector(".xp-dots").append(d);
    return d;
  });
  stageEl.classList.add("xp-has-carousel");
  stageEl.append(wrapEl, label);

  const mod = v => ((v % n) + n) % n;
  const shortest = d => { d = mod(d); return d > n / 2 ? d - n : d; };
  const spacing = () => wrapEl.clientWidth * 0.34;

  let shown = -1;
  function render() {
    const sp = spacing();
    slides.forEach((el, i) => {
      let d = mod(i - pos);
      if (d > n / 2) d -= n;
      const a = Math.abs(d);
      const scale = 1 - Math.min(a, 2) * 0.3;
      el.style.transform = `translateX(${d * sp}px) scale(${scale})`;
      el.style.opacity = String(a > 1.4 ? Math.max(0, 1 - (a - 1.4) * 2.5) : 1);
      el.style.zIndex = String(100 - Math.round(a * 10));
      el.style.filter = a > 0.5 ? `saturate(${1 - Math.min(a, 1) * 0.15})` : "";
      el.tabIndex = -1;
      el.setAttribute("aria-hidden", String(a > 1.4));
    });
    const front = mod(Math.round(pos));
    if (front !== shown) {
      shown = front;
      nameEl.textContent = items[front].name;
      nameEl.href = items[front].href;
      dots.forEach((d, i) => d.setAttribute("aria-current", String(i === front)));
      if (!reduce) animate(nameEl, { opacity: [0, 1], y: [8, 0] }, { duration: 0.35, ease: EASE });
    }
  }

  let tween = null;
  function goTo(target) {
    tween?.stop();
    if (reduce) { pos = target; return render(); }
    tween = animate(pos, target, { type: "spring", stiffness: 170, damping: 24, onUpdate: v => { pos = v; render(); } });
  }
  const step = dir => goTo(Math.round(pos) + dir);

  // Drag / swipe (vertical swipes still scroll the page on touch: touch-action: pan-y)
  let drag = null;
  wrapEl.addEventListener("pointerdown", e => {
    if (e.button !== 0) return;
    tween?.stop();
    drag = { x: e.clientX, start: pos, lastX: e.clientX, lastT: performance.now(), v: 0, moved: false, target: e.target.closest(".xp-slide") };
  });
  window.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; wrapEl.classList.add("is-dragging"); wrapEl.setPointerCapture?.(e.pointerId); }
    if (!drag.moved) return;
    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT); // px per ms
    drag.lastX = e.clientX; drag.lastT = now;
    pos = drag.start - dx / spacing();
    render();
  });
  const endDrag = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    wrapEl.classList.remove("is-dragging");
    if (!d.moved) {
      // Plain click: bring a side jar to the front
      const i = slides.indexOf(d.target);
      if (i >= 0) { const off = shortest(i - mod(Math.round(pos))); if (off) goTo(Math.round(pos) + off); }
      return;
    }
    // Flick: a fast swipe moves one jar even if the drag was short
    const from = Math.round(d.start);
    let target = Math.round(pos);
    if (Math.abs(d.v) > 0.4 && target === from) target = from - Math.sign(d.v);
    goTo(target);
  };
  window.addEventListener("pointerup", endDrag);
  window.addEventListener("pointercancel", endDrag);

  // Trackpad sideways scroll / shift+wheel; plain vertical wheel keeps scrolling the page
  let wheelAcc = 0, wheelLock = 0;
  wrapEl.addEventListener("wheel", e => {
    const dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (Math.abs(dx) <= Math.abs(e.deltaY) && !e.shiftKey) return;
    e.preventDefault();
    if (performance.now() < wheelLock) return;
    wheelAcc += dx;
    if (Math.abs(wheelAcc) > 40) { step(Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = performance.now() + 380; }
  }, { passive: false });

  wrapEl.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  });
  window.addEventListener("resize", render);
  render();

  if (!reduce) animate(wrapEl, { opacity: [0, 1], y: [120, 0] }, { type: "spring", stiffness: 90, damping: 16, delay: 0.25 });
}

// ── Swipe rows (recipes, press): dots that follow the swipe on smaller screens (row layout itself is CSS) ──
// Press cards arrive later from Firestore, so dots rebuild whenever the row's cards change.
const ROW_CARDS = ".recipe-card, .press-card";
$$(".recipe-row, .press-grid").forEach(row => {
  const dotsEl = document.createElement("div");
  dotsEl.className = "xp-row-dots";
  row.after(dotsEl);
  let cards = [], dots = [];
  const sync = () => {
    const max = row.scrollWidth - row.clientWidth;
    const i = max > 0 ? Math.round((row.scrollLeft / max) * (cards.length - 1)) : 0;
    dots.forEach((d, j) => d.setAttribute("aria-current", String(j === i)));
  };
  const build = () => {
    cards = [...row.children].filter(c => c.matches(ROW_CARDS));
    dotsEl.textContent = "";
    dots = cards.length < 2 ? [] : cards.map((card, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `Show ${card.querySelector("h3")?.textContent.trim() || "item " + (i + 1)}`);
      b.addEventListener("click", () => row.scrollTo({ left: card.offsetLeft - row.offsetLeft - 20, behavior: reduce ? "auto" : "smooth" }));
      dotsEl.append(b);
      return b;
    });
    sync();
  };
  row.addEventListener("scroll", sync, { passive: true });
  new MutationObserver(build).observe(row, { childList: true });
  // Mouse drag to swipe (touch already swipes natively). Snap is paused mid-drag, then the nearest card settles in.
  let drag = null;
  row.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse" || e.button !== 0 || row.scrollWidth <= row.clientWidth) return;
    drag = { x: e.clientX, left: row.scrollLeft, moved: false };
  });
  window.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; row.classList.add("is-dragging"); }
    if (drag.moved) row.scrollLeft = drag.left - dx;
  });
  window.addEventListener("pointerup", () => {
    if (!drag) return;
    const moved = drag.moved;
    drag = null;
    if (!moved) return;
    // Swallow the click that ends a drag so links inside cards don't fire
    const swallow = ev => { ev.preventDefault(); ev.stopPropagation(); };
    row.addEventListener("click", swallow, true);
    setTimeout(() => row.removeEventListener("click", swallow, true), 0);
    const near = cards.reduce((best, c) => Math.abs(c.offsetLeft - row.offsetLeft - 20 - row.scrollLeft) < Math.abs(best.offsetLeft - row.offsetLeft - 20 - row.scrollLeft) ? c : best, cards[0]);
    row.classList.remove("is-dragging");
    if (near) row.scrollTo({ left: near.offsetLeft - row.offsetLeft - 20, behavior: reduce ? "auto" : "smooth" });
  });
  row.addEventListener("dragstart", e => { if (row.scrollWidth > row.clientWidth) e.preventDefault(); });
  build();
});

// ── Find Us: flavour filter, city/store search, and "near me" sorting ──
// Works off the same store records the page already loads (name, address, lat/lng, products + aisle).
const storeList = document.getElementById("find-us-list");
if (storeList && typeof StoresStore !== "undefined" && typeof PRODUCTS !== "undefined") {
  const JAR_IMG = {
    mango: "Mango-Silo-NoShadow.png", "red-pepper": "Red-Pepper-Silo-NoShadow.png", jerk: "JerkSilo-NoShadow.png",
    lavender: "Lavender-Silo-NoShadow.png", pineapple: "PineappleSilo.png",
  };
  const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const state = { flavour: "all", query: "", origin: null };
  let stores = new Map();

  const bar = document.createElement("div");
  bar.className = "xp-finder";
  bar.innerHTML = `
    <div class="xp-finder-row">
      <label class="xp-finder-search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <span class="xp-sr">Search by city or store</span>
        <input type="search" placeholder="Search by city or store" autocomplete="off" />
      </label>
      <button type="button" class="xp-finder-locate">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>
        <span>Use my location</span>
      </button>
    </div>
    <div class="xp-finder-chips" role="group" aria-label="Filter by flavour">
      <button type="button" class="xp-chip" data-flavour="all" aria-pressed="true">All flavours</button>
      ${PRODUCTS.map(p => `<button type="button" class="xp-chip" data-flavour="${p.id}" aria-pressed="false">${JAR_IMG[p.id] ? `<img src="content/SiloImages/${JAR_IMG[p.id]}" alt="" />` : ""}${p.id === "red-pepper" ? "Red Pepper" : p.name.replace(/ Pepper Jelly$/, "")}</button>`).join("")}
    </div>
    <p class="xp-finder-status" aria-live="polite"></p>`;
  document.querySelector(".find-us-layout")?.before(bar);
  const statusEl = bar.querySelector(".xp-finder-status");
  const locateBtn = bar.querySelector(".xp-finder-locate");

  const emptyEl = document.createElement("div");
  emptyEl.className = "xp-finder-empty";
  emptyEl.hidden = true;
  emptyEl.innerHTML = `<p>No stores match that yet.</p><a href="shop.html" class="btn btn-maroon btn-sm">Shop online instead</a>`;

  // Distance in km between two lat/lng points (haversine)
  const km = (a, b) => {
    const r = x => (x * Math.PI) / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(h));
  };
  const coords = s => (Number.isFinite(Number(s?.lat)) && Number.isFinite(Number(s?.lng)) && s.lat !== "" && s.lng !== "") ? { lat: Number(s.lat), lng: Number(s.lng) } : null;

  let applying = false;
  function apply() {
    const cards = $$(".find-us-store-card", storeList);
    if (!cards.length) return;
    applying = true;
    const q = norm(state.query.trim());
    const flavourName = PRODUCTS.find(p => p.id === state.flavour)?.name;
    let shown = 0;

    cards.forEach(card => {
      const s = stores.get(card.dataset.storeId);
      const carries = state.flavour === "all" || (s?.products || []).some(p => p.productId === state.flavour);
      const matches = !q || norm(`${s?.name} ${s?.address}`).includes(q);
      const visible = carries && matches;
      card.hidden = !visible;
      if (visible) shown++;
      // Point at the matching jar's aisle
      card.querySelectorAll(".find-us-store-product").forEach((el, i) => {
        el.classList.toggle("is-match", state.flavour !== "all" && s?.products?.[i]?.productId === state.flavour);
      });
      // Distance badge when the visitor shared their location
      let badge = card.querySelector(".xp-distance");
      const c = coords(s);
      const d = state.origin && c ? km(state.origin, c) : null;
      card.dataset.distance = d ?? "";
      if (d == null) badge?.remove();
      else {
        if (!badge) { badge = document.createElement("span"); badge.className = "xp-distance"; card.prepend(badge); }
        badge.textContent = d < 10 ? `${d.toFixed(1)} km away` : `${Math.round(d)} km away`;
      }
    });

    if (state.origin) {
      [...cards].sort((a, b) => (a.dataset.distance === "" ? Infinity : +a.dataset.distance) - (b.dataset.distance === "" ? Infinity : +b.dataset.distance))
        .forEach(c => storeList.append(c));
    }
    storeList.append(emptyEl);
    emptyEl.hidden = shown > 0;

    // Keep map pins in step with the list (markers is the page's own global, once the map has loaded)
    if (typeof markers !== "undefined") markers.forEach(m => m.setVisible(!cards.find(c => c.dataset.storeId === m.storeId)?.hidden));

    const parts = [`Showing ${shown} of ${cards.length} store${cards.length === 1 ? "" : "s"}`];
    if (flavourName) parts.push(`carrying ${flavourName}`);
    if (q) parts.push(`matching “${state.query.trim()}”`);
    if (state.origin) parts.push("nearest first");
    statusEl.textContent = parts.join(" · ");

    if (!reduce) {
      const vis = cards.filter(c => !c.hidden);
      vis.forEach(c => (c.style.transition = "none"));
      if (vis.length) animate(vis, { opacity: [0, 1], y: [10, 0] }, { duration: 0.35, delay: stagger(0.04), ease: EASE }).then(() => vis.forEach(finish));
    }
    requestAnimationFrame(() => (applying = false));
  }

  bar.querySelector(".xp-finder-chips").addEventListener("click", e => {
    const chip = e.target.closest(".xp-chip");
    if (!chip) return;
    state.flavour = chip.dataset.flavour;
    $$(".xp-chip", bar).forEach(c => c.setAttribute("aria-pressed", String(c === chip)));
    apply();
  });
  let typing;
  bar.querySelector("input").addEventListener("input", e => {
    clearTimeout(typing);
    typing = setTimeout(() => { state.query = e.target.value; apply(); }, 150);
  });
  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) { statusEl.textContent = "Your browser can't share a location. Try searching by city instead."; return; }
    locateBtn.disabled = true;
    locateBtn.querySelector("span").textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition(pos => {
      state.origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      locateBtn.disabled = false;
      locateBtn.classList.add("is-on");
      locateBtn.querySelector("span").textContent = "Sorted by distance";
      apply();
      if (typeof map !== "undefined" && map) { map.panTo(state.origin); map.setZoom(9); }
    }, () => {
      locateBtn.disabled = false;
      locateBtn.querySelector("span").textContent = "Use my location";
      statusEl.textContent = "We couldn't get your location. Try searching by city instead.";
    }, { timeout: 10000, maximumAge: 300000 });
  });

  StoresStore.getAll().then(list => {
    stores = new Map(list.map(s => [s.id, s]));
    apply();
  }).catch(() => {});
  // The page re-renders the list once its own fetch finishes; filter whatever it draws
  new MutationObserver(() => { if (!applying) apply(); }).observe(storeList, { childList: true });
}

// ── Nav: current page, compact on scroll, progress hairline ──
const nav = document.querySelector(".site-nav");
const here = location.pathname.split("/").pop() || "index.html";
$$(".nav-left a").forEach(a => {
  if (a.getAttribute("href")?.split("#")[0] === here) a.setAttribute("aria-current", "page");
});
if (nav) {
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
if (!reduce) {
  const bar = document.createElement("div");
  bar.className = "xp-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.append(bar);
  scroll(animate(bar, { scaleX: [0, 1] }, { ease: "linear" }));
}

// ── Fly-to-cart: a jar arcs from the card to the cart icon (cart.js still does the real work) ──
const visibleCart = () => $$(".cart-link").find(c => c.getBoundingClientRect().width > 0);
document.addEventListener("click", e => {
  if (reduce) return;
  const btn = e.target.closest("[data-cart-id]");
  if (!btn || btn.closest("#yw-cart-drawer")) return;
  const card = btn.closest(".product-tile, .shop-card, .recipe-card, .community-card, .cc-modal-panel, article, li");
  const img = card?.querySelector("img");
  const cart = visibleCart();
  if (!img || !cart) return;
  const a = img.getBoundingClientRect(), b = cart.getBoundingClientRect();
  if (!a.width) return;
  const fly = document.createElement("img");
  fly.src = img.currentSrc || img.src;
  fly.alt = "";
  fly.className = "xp-flyer";
  fly.style.left = a.left + a.width / 2 - 36 + "px";
  fly.style.top = a.top + a.height / 2 - 36 + "px";
  document.body.append(fly);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  animate(fly, { x: [0, dx * 0.5, dx], y: [0, Math.min(dy, 0) - 80, dy], scale: [1.3, 0.9, 0.2], opacity: [1, 1, 0.6] },
    { duration: 0.75, ease: "easeInOut" }).then(() => fly.remove());
}, true);

// Badge bump whenever cart.js changes the count (ignore the initial render)
const readyAt = performance.now() + 800;
$$(".cart-badge").forEach(badge => {
  new MutationObserver(() => {
    if (reduce || performance.now() < readyAt) return;
    animate(badge, { scale: [1, 1.7, 1] }, { duration: 0.45, delay: 0.6, ease: EASE });
    const link = badge.closest(".cart-link");
    if (link) animate(link, { rotate: [0, -12, 10, -5, 0] }, { duration: 0.55, delay: 0.6 });
  }).observe(badge, { childList: true, characterData: true, subtree: true });
});

// ── Value bar → slow marquee (same three lines, repeated) ──
$$(".footer-bar").forEach(barEl => {
  const inner = barEl.querySelector(".footer-bar-inner");
  if (reduce || !inner) return;
  const items = [...inner.children];
  barEl.classList.add("xp-marquee");
  const setWidth = inner.scrollWidth || 1;
  const perHalf = Math.max(1, Math.ceil(window.innerWidth / setWidth) + 1);
  for (let i = 1; i < perHalf * 2; i++) {
    items.forEach(it => {
      const c = it.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      inner.append(c);
    });
  }
});

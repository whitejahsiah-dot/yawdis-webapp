// Cart drawer + Shopify integration, rendered with the site's own CSS.
// Requires shopify-config.js loaded first and the shopify-buy SDK on the page:
// <script src="https://sdks.shopifycdn.com/js-buy-sdk/v2/latest/index.umd.min.js"></script>
(function () {
  const cfg = window.YAWDIS_SHOPIFY;
  if (!cfg || !cfg.storefrontAccessToken || cfg.storefrontAccessToken.startsWith("PASTE_")) {
    console.warn("[Yawdi's] Shopify token not set in shopify-config.js — cart is in demo mode.");
    document.dispatchEvent(new CustomEvent("yawdis:shopify-unconfigured"));
  }

  const configured = cfg && !cfg.storefrontAccessToken.startsWith("PASTE_");
  let client = null;

  if (configured) {
    client = ShopifyBuy.buildClient({
      domain: cfg.domain,
      storefrontAccessToken: cfg.storefrontAccessToken
    });
  }

  // ── local cart state (variantId → qty) persisted in localStorage ──
  const LS_KEY = "yawdis_cart";
  const loadCart = () => JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  const saveCart = (items) => localStorage.setItem(LS_KEY, JSON.stringify(items));

  function cartCount() {
    return loadCart().reduce((n, i) => n + i.qty, 0);
  }

  // ── drawer DOM, injected once ──
  function injectDrawer() {
    if (document.getElementById("cart-drawer")) return;
    const el = document.createElement("div");
    el.innerHTML = `
      <div id="cart-overlay" class="cart-overlay" hidden></div>
      <aside id="cart-drawer" class="cart-drawer" aria-hidden="true">
        <div class="cart-drawer-head">
          <h3>Your Cart</h3>
          <button class="cart-close" aria-label="Close cart">&times;</button>
        </div>
        <div class="cart-drawer-body" id="cart-items"></div>
        <div class="cart-drawer-foot">
          <div class="cart-ship-note" id="cart-ship-note"></div>
          <div class="cart-total-row">
            <span>Subtotal</span>
            <strong id="cart-subtotal">$0.00</strong>
          </div>
          <button class="btn btn-maroon cart-checkout" id="cart-checkout" style="width:100%;justify-content:center;">
            Checkout
          </button>
          <p class="cart-foot-note">Taxes and shipping calculated at checkout.</p>
        </div>
      </aside>`;
    while (el.firstChild) document.body.appendChild(el.firstChild);

    document.getElementById("cart-overlay").addEventListener("click", closeDrawer);
    document.querySelector(".cart-close").addEventListener("click", closeDrawer);
    document.getElementById("cart-checkout").addEventListener("click", goToCheckout);
  }

  function openDrawer() {
    renderCart();
    document.getElementById("cart-overlay").hidden = false;
    document.getElementById("cart-drawer").classList.add("open");
    document.getElementById("cart-drawer").setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    document.getElementById("cart-overlay").hidden = true;
    document.getElementById("cart-drawer").classList.remove("open");
    document.getElementById("cart-drawer").setAttribute("aria-hidden", "true");
  }

  // ── render cart items ──
  async function renderCart() {
    const wrap = document.getElementById("cart-items");
    const items = loadCart();
    wrap.innerHTML = "";
    let subtotal = 0;
    let jarCount = 0;

    if (!items.length) {
      wrap.innerHTML = `<p class="cart-empty">Your cart is empty.<br/>Add a jar of island flavour!</p>`;
    }

    items.forEach((item, idx) => {
      subtotal += item.price * item.qty;
      jarCount += item.qty;
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div class="cart-item-img"><img src="${item.image || ""}" alt="${item.title}" /></div>
        <div class="cart-item-info">
          <strong>${item.title}</strong>
          <span class="cart-item-variant">${item.variantTitle || "250 mL"}</span>
          <span class="cart-item-price">$${item.price.toFixed(2)}</span>
          <div class="cart-qty">
            <button data-act="dec" aria-label="Decrease">−</button>
            <span>${item.qty}</span>
            <button data-act="inc" aria-label="Increase">+</button>
          </div>
        </div>
        <button class="cart-item-remove" aria-label="Remove">&times;</button>`;
      row.querySelector('[data-act="dec"]').addEventListener("click", () => updateQty(idx, item.qty - 1));
      row.querySelector('[data-act="inc"]').addEventListener("click", () => updateQty(idx, item.qty + 1));
      row.querySelector(".cart-item-remove").addEventListener("click", () => updateQty(idx, 0));
      wrap.appendChild(row);
    });

    document.getElementById("cart-subtotal").textContent = "$" + subtotal.toFixed(2);

    // Bundle threshold from Firestore (shared) with localStorage fallback
    const threshold = await getBundleThreshold();
    const note = document.getElementById("cart-ship-note");
    if (jarCount >= threshold) {
      note.innerHTML = `&#127873; <strong>Free shipping unlocked!</strong> You've got ${threshold}+ jars.`;
      note.classList.add("unlocked");
    } else if (jarCount > 0) {
      note.innerHTML = `Add <strong>${threshold - jarCount} more jar${threshold - jarCount > 1 ? "s" : ""}</strong> for free shipping.`;
      note.classList.remove("unlocked");
    } else {
      note.innerHTML = "";
      note.classList.remove("unlocked");
    }

    updateBadges();
  }

  async function getBundleThreshold() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      try {
        const doc = await firebase.firestore().collection('site_settings').doc('global').get();
        if (doc.exists && doc.data().bundleThreshold) {
          return parseInt(doc.data().bundleThreshold, 10);
        }
      } catch (err) {
        console.warn('Failed to load bundle threshold from Firestore:', err);
      }
    }
    return parseInt(localStorage.getItem("yawdis_bundle_threshold") || "4", 10);
  }

  function updateQty(idx, qty) {
    const items = loadCart();
    if (qty <= 0) items.splice(idx, 1);
    else items[idx].qty = qty;
    saveCart(items);
    renderCart();
  }

  // ── nav badges across all pages ──
  function updateBadges() {
    document.querySelectorAll(".cart-badge").forEach(b => {
      const n = cartCount();
      b.textContent = n;
      b.style.display = n ? "flex" : "none";
    });
  }

  // ── public API: add product by config key, open drawer ──
  async function addToCart(productKey, qty = 1) {
    if (!configured) { openDrawer(); return; }
    // Accept a config key ("redPepper") or the site's product id ("red-pepper")
    const key = cfg.products[productKey] ? productKey
      : Object.keys(cfg.products).find(k => cfg.products[k].elementId === productKey);
    const meta = cfg.products[key];
    if (!meta) return console.warn("[Yawdi's] unknown product key:", productKey);

    const existing = meta._variant;
    if (existing) return addVariant(existing, qty);

    const product = await client.product.fetchByHandle(meta.handle);
    const variant = product.variants[0];
    meta._variant = {
      variantId: variant.id,
      title: product.title,
      variantTitle: variant.title === "Default Title" ? "250 mL" : variant.title,
      price: parseFloat(variant.price.amount ?? variant.price),
      image: product.images[0] ? product.images[0].src : ""
    };
    addVariant(meta._variant, qty);
  }

  function addVariant(v, qty) {
    const items = loadCart();
    const found = items.find(i => i.variantId === v.variantId);
    if (found) found.qty += qty;
    else items.push({ ...v, qty });
    saveCart(items);
    openDrawer();
  }

  // ── checkout handoff ──
  // Shopify removed the Storefront checkout API this SDK version uses, so create a cart with the
  // Storefront Cart API and send the shopper to its checkoutUrl. (A /cart/<variant>:<qty> permalink
  // only works for products published to the Online Store channel; this works for anything the
  // storefront token can see.)
  const CART_CREATE = `mutation($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) { cart { checkoutUrl } userErrors { message } }
  }`;

  async function goToCheckout() {
    const items = loadCart();
    if (!items.length) return;
    if (!configured) {
      alert("Connect your Shopify token in shopify-config.js to enable checkout.");
      return;
    }
    const btn = document.getElementById("cart-checkout");
    btn.disabled = true;
    btn.textContent = "Preparing checkout…";
    try {
      const res = await fetch(`https://${cfg.domain}/api/2025-07/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Storefront-Access-Token": cfg.storefrontAccessToken },
        body: JSON.stringify({
          query: CART_CREATE,
          variables: { lines: items.map(i => ({ merchandiseId: i.variantId, quantity: i.qty })) }
        })
      });
      const json = await res.json();
      const result = json.data && json.data.cartCreate;
      const errors = (json.errors || []).concat(result ? result.userErrors : []);
      if (!result || !result.cart || errors.length) throw new Error(errors.map(e => e.message).join("; ") || "No cart returned");
      window.location.href = result.cart.checkoutUrl;
    } catch (err) {
      console.error("[Yawdi's] checkout failed:", err);
      alert("Sorry, we couldn't start checkout. Please try again in a moment.");
      btn.disabled = false;
      btn.textContent = "Checkout";
    }
  }

  // ── live price sync: pulls real Shopify prices into product cards ──
  async function syncPrices() {
    if (!configured) return;
    await Promise.all(Object.entries(cfg.products).map(async ([key, meta]) => {
      try {
        const product = await client.product.fetchByHandle(meta.handle);
        if (!product) return;
        meta._product = product;
        const card = document.getElementById(meta.elementId);
        if (!card) return;
        const prices = product.variants.map(v => parseFloat(v.price.amount ?? v.price));
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const priceEl = card.querySelector(".shop-card-price");
        if (priceEl) {
          priceEl.textContent = (prices.length > 1 && min !== max)
            ? "From $" + min.toFixed(2)
            : "$" + min.toFixed(2);
        }
        const sizeEl = card.querySelector(".shop-card-size");
        const v0 = product.variants[0];
        if (sizeEl && v0 && v0.title !== "Default Title") sizeEl.textContent = v0.title;
        const titleEl = card.querySelector(".shop-card-body h3");
        if (titleEl) titleEl.textContent = product.title.replace(/^YAWDI'?S\s*/i, "");
      } catch (e) {
        console.warn("[Yawdi's] price sync failed for", key, e);
      }
    }));
  }

  // ── wire nav cart links on every page ──
  document.addEventListener("DOMContentLoaded", () => {
    injectDrawer();
    updateBadges();
    syncPrices();
    document.querySelectorAll(".cart-link").forEach(a => {
      a.addEventListener("click", (e) => { e.preventDefault(); openDrawer(); });
    });
    // any element with data-add-to-cart="productKey" becomes an add-to-cart button
    document.querySelectorAll("[data-add-to-cart]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        addToCart(el.getAttribute("data-add-to-cart"));
      });
    });
    // data-cart-id buttons (shop cards, search results) are often rendered after load, so delegate
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-cart-id]");
      if (!btn) return;
      e.preventDefault();
      addToCart(btn.getAttribute("data-cart-id"));
    });
  });

  window.YawdisCart = { addToCart, openDrawer, closeDrawer, cartCount, loadCart };
})();

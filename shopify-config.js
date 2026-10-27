// Shopify Storefront configuration.
// 1. Paste your Storefront API access token below (Shopify admin → Apps → Website Storefront → API credentials).
// 2. Set each product's handle (Shopify admin → Products → click product → handle is in the URL/SEO section).
window.YAWDIS_SHOPIFY = {
  domain: "yawdis.myshopify.com",
  storefrontAccessToken: "e089bad5fa7cc21079273680a04cd577",
  products: {
    mango:     { handle: "yawdis-mango-pepper-jelly",       elementId: "mango" },
    redPepper: { handle: "pepper-jelly",                    elementId: "red-pepper" },
    jerk:      { handle: "yawdis-jerk-marinade",            elementId: "jerk" },
    lavender:  { handle: "yawdis-lavender-pepper-jelly",    elementId: "lavender" },
    pineapple: { handle: "yawdis-pineapple-pepper-jelly",   elementId: "pineapple" },
    giftCard:  { handle: "yawdis-corner-shop-gift-card",    elementId: "gift-card" },
    merch:     { handle: "yawdis-merch",                    elementId: "merch" },
    giftBox:   { handle: "customized-gift-boxes",           elementId: "gift-box" }
  }
};

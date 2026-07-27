(function () {
  if (window.MCAutoFreeCapLoaded) return;
  window.MCAutoFreeCapLoaded = true;

  var config = window.theme && window.theme.autoFreeCap ? window.theme.autoFreeCap : {};
  var BASE_THRESHOLD_CENTS = Number(config.thresholdCents) || 15000;
  var THRESHOLDS_BY_CURRENCY = config.thresholdsByCurrency || {
    GBP: 15000,
    USD: 20000,
    EUR: 17500,
    CAD: 30000,
    AED: 75000
  };
  var GIFT_PRODUCT_HANDLE = config.productHandle || 'cap-man-size';
  var GIFT_SEARCH_TERM = 'Cap - Man Size';
  var GIFT_PROPERTY_NAME = config.propertyName || '_auto_free_cap';
  var LEGACY_GIFT_PROPERTY_NAME = config.legacyPropertyName || '_cart_free_gift';
  var GIFT_PROPERTY_VALUE = 'true';

  var routes = (window.theme && window.theme.routes && window.theme.routes.cart) || {};
  var themeRoutes = (window.theme && window.theme.routes) || {};
  var isSyncing = false;
  var pendingSync = false;
  var giftVariantPromise = null;

  function jsonRoute(route) {
    return route.slice(-3) === '.js' ? route : route + '.js';
  }

  function cartRoute(key, fallback) {
    return jsonRoute(routes[key] || fallback);
  }

  function fetchCart() {
    return fetch(cartRoute('base', '/cart'), {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function (response) {
      return response.json();
    });
  }

  function changeCart(payload) {
    return fetch(cartRoute('change', '/cart/change'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json();
    });
  }

  function addGift(variantId) {
    var properties = {};
    properties[GIFT_PROPERTY_NAME] = GIFT_PROPERTY_VALUE;

    return fetch(cartRoute('add', '/cart/add'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          id: Number(variantId),
          quantity: 1,
          properties: properties
        }]
      })
    }).then(function (response) {
      return response.json();
    });
  }

  function activeCurrency() {
    if (window.theme && typeof window.theme.getDisplayedCurrencyCode === 'function') {
      try { return String(window.theme.getDisplayedCurrencyCode()).toUpperCase(); } catch (e) {}
    }
    var shopifyCurrency = window.Shopify && window.Shopify.currency;
    var currency = (shopifyCurrency && shopifyCurrency.active) || config.currentCurrency || 'GBP';
    return String(currency).toUpperCase();
  }

  function activeThresholdCents() {
    var currency = activeCurrency();
    if (THRESHOLDS_BY_CURRENCY[currency]) return THRESHOLDS_BY_CURRENCY[currency];

    var otherThreshold = Number(config.otherThresholdCents);
    if (otherThreshold > 0) return otherThreshold;

    var marketRate = 1;
    if (window.theme && typeof window.theme.getDisplayedCurrencyRate === 'function') {
      marketRate = parseFloat(window.theme.getDisplayedCurrencyRate()) || 1;
    } else {
      var rate = window.Shopify && window.Shopify.currency && window.Shopify.currency.rate;
      var parsedRate = parseFloat(rate);
      marketRate = Number.isFinite(parsedRate) && parsedRate > 0 ? parsedRate : 1;
    }

    return Math.round(BASE_THRESHOLD_CENTS * marketRate);
  }

  function hasGiftProperty(item) {
    var properties = item.properties || {};
    return String(properties[GIFT_PROPERTY_NAME]) === GIFT_PROPERTY_VALUE
      || String(properties[LEGACY_GIFT_PROPERTY_NAME]) === GIFT_PROPERTY_VALUE;
  }

  function isAutoGiftItem(item, variantId) {
    var matchesVariant = variantId == null || String(item.variant_id) === String(variantId);
    return matchesVariant && hasGiftProperty(item);
  }

  function isGiftVariant(item, variantId) {
    return String(item.variant_id) === String(variantId);
  }

  function qualifyingSubtotal(cart, variantId) {
    return (cart.items || []).reduce(function (total, item) {
      if (hasGiftProperty(item)) return total;

      var linePrice = typeof item.final_line_price === 'number'
        ? item.final_line_price
        : item.line_price;

      return total + (Number(linePrice) || 0);
    }, 0);
  }

  function productUrl(handle) {
    var productsBase = themeRoutes.products || '/products';
    return productsBase.replace(/\/$/, '') + '/' + handle + '.js';
  }

  function firstAvailableVariantId(product) {
    var variants = product && product.variants ? product.variants : [];
    var availableVariant = variants.find(function (variant) {
      return variant.available;
    });

    return (availableVariant || variants[0] || {}).id || null;
  }

  function fetchProductVariant(handle) {
    return fetch(productUrl(handle), {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function (response) {
      if (!response.ok) throw new Error('Gift product not found');
      return response.json();
    }).then(firstAvailableVariantId);
  }

  function searchGiftVariant() {
    var searchUrl = themeRoutes.predictive_search_url || '/search/suggest';

    return fetch(searchUrl + '.json?q=' + encodeURIComponent(GIFT_SEARCH_TERM) + '&resources[type]=product&resources[limit]=5', {
      method: 'GET',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).then(function (response) {
      if (!response.ok) throw new Error('Gift product search failed');
      return response.json();
    }).then(function (data) {
      var products = (((data || {}).resources || {}).results || {}).products || [];
      var product = products.find(function (item) {
        return String(item.title || '').toLowerCase() === GIFT_SEARCH_TERM.toLowerCase();
      }) || products[0];
      var match = product && product.url ? product.url.match(/\/products\/([^/?#]+)/) : null;

      return match ? fetchProductVariant(match[1]) : null;
    });
  }

  function giftVariantId() {
    if (window.MCAutoFreeCap && window.MCAutoFreeCap.variantId) {
      return Promise.resolve(window.MCAutoFreeCap.variantId);
    }

    if (config.variantId) return Promise.resolve(config.variantId);
    if (giftVariantPromise) return giftVariantPromise;

    giftVariantPromise = fetchProductVariant(GIFT_PRODUCT_HANDLE)
      .catch(searchGiftVariant)
      .then(function (variantId) {
        return variantId || null;
      });

    return giftVariantPromise;
  }

  function refreshCartPage() {
    var cartSection = document.querySelector('[data-section-type="cart"]');
    if (!cartSection || !cartSection.dataset.sectionId || !routes.base) return Promise.resolve();

    return fetch(routes.base + '?section_id=' + cartSection.dataset.sectionId)
      .then(function (response) {
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var sourceCart = doc.querySelector('[data-section-type="cart"]');

        if (sourceCart) cartSection.innerHTML = sourceCart.innerHTML;
      })
      .catch(function () {});
  }

  function dispatchCartRefresh(cart) {
    document.dispatchEvent(new CustomEvent('apps:product-added-to-cart', {
      detail: {
        cart: cart,
        source: 'auto-free-cap'
      }
    }));

    document.dispatchEvent(new CustomEvent('cart:updated', {
      detail: {
        cart: cart,
        source: 'auto-free-cap'
      }
    }));

    refreshCartPage();
  }

  function afterCartMutation() {
    return fetchCart().then(function (cart) {
      dispatchCartRefresh(cart);
      return cart;
    });
  }

  function syncCart(cart) {
    if (isSyncing) {
      pendingSync = true;
      return;
    }

    isSyncing = true;

    Promise.all([Promise.resolve(cart || fetchCart()), giftVariantId()])
      .then(function (values) {
        var currentCart = values[0];
        var variantId = values[1];
        if (!variantId) return currentCart;

        var items = currentCart.items || [];
        var autoGiftItems = items.filter(hasGiftProperty);

        var customerGiftItem = items.find(function (item) {
          return isGiftVariant(item, variantId) && !isAutoGiftItem(item, variantId);
        });
        var autoGiftItem = autoGiftItems[0];
        var isEligible = qualifyingSubtotal(currentCart, variantId) >= activeThresholdCents();

        function changeAutoGiftItemsToQuantity(quantity) {
          var sequence = Promise.resolve();

          autoGiftItems.forEach(function (item) {
            if (item.quantity === quantity) return;
            sequence = sequence.then(function () {
              return changeCart({ id: item.key, quantity: quantity });
            });
          });

          return sequence.then(afterCartMutation);
        }

        // In popup mode the customer chooses the gift variant in the popup.
        if (window.MCFreeGiftPopupEnabled) {
          if (!isEligible && autoGiftItems.length) {
            return changeAutoGiftItemsToQuantity(0);
          }

          if (isEligible && autoGiftItems.some(function (item) { return item.quantity !== 1; })) {
            return changeAutoGiftItemsToQuantity(1);
          }

          return currentCart;
        }

        if (isEligible && !autoGiftItem && !customerGiftItem) {
          return addGift(variantId).then(afterCartMutation);
        }

        if (!isEligible && autoGiftItem) {
          return changeCart({ id: autoGiftItem.key, quantity: 0 }).then(afterCartMutation);
        }

        if (isEligible && autoGiftItem && autoGiftItem.quantity !== 1) {
          return changeCart({ id: autoGiftItem.key, quantity: 1 }).then(afterCartMutation);
        }

        if (autoGiftItems.length > 1) {
          return changeCart({ id: autoGiftItems[1].key, quantity: 0 }).then(afterCartMutation);
        }

        return currentCart;
      })
      .catch(function () {})
      .finally(function () {
        isSyncing = false;

        if (pendingSync) {
          pendingSync = false;
          fetchCart().then(syncCart);
        }
      });
  }

  document.addEventListener('cart:updated', function (event) {
    if (event.detail && event.detail.source === 'auto-free-cap') return;
    syncCart(event.detail && event.detail.cart);
  });

  document.addEventListener('apps:product-added-to-cart', function (event) {
    if (event.detail && event.detail.source === 'auto-free-cap') return;
    fetchCart().then(syncCart);
  });

  document.addEventListener('cart:update', function () {
    fetchCart().then(syncCart);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      fetchCart().then(syncCart);
    });
  } else {
    fetchCart().then(syncCart);
  }
})();

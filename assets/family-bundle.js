/* ================================================================
 *  Family Bundle — Product page + Cart bundle management
 *  Guard against duplicate loading
 * ================================================================ */
if (!window._familyBundleLoaded) {
window._familyBundleLoaded = true;

(function() {
  'use strict';

  var moneyFormat = window.theme.moneyFormat || '{{amount}}';

  function formatMoney(cents) {
    var amt = (cents / 100).toFixed(2);
    var n = Math.floor(cents / 100);
    return moneyFormat
      .replace('{{amount_with_comma_separator}}', amt.replace('.', ','))
      .replace('{{amount_no_decimals_with_comma_separator}}', n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','))
      .replace('{{amount_no_decimals}}', n)
      .replace('{{amount}}', amt);
  }

  /* ================================================================
   *  SECTION A — Product page bundle builder
   * ================================================================ */
  function initProductBundle() {
    var bundle = document.querySelector('[data-family-bundle]');
    if (!bundle) return;

    var parentTitle = bundle.getAttribute('data-parent-title') || 'Family Bundle';
    var parentHandle = bundle.getAttribute('data-parent-handle') || '';
    var totalPriceEl = bundle.querySelector('[data-bundle-total-price]');

    /* Consistent label mapping — single source of truth */
    var ROLE_LABELS = { kid: 'Cub', girl: 'Girl', man: 'Man', women: 'Woman', woman: 'Woman' };
    var ROLE_CART_LABELS = { kid: 'Boy Cub', girl: 'Girl Cub', man: 'Man', women: 'Woman', woman: 'Woman' };
    var BIS_KLAVIYO_PUBLIC_KEY = 'SHh2fV';
    var BIS_KLAVIYO_FORM_ID = 'Te5fz7';
    var allBtns = [];

    /* Keep Shopify option order as rendered in Liquid.
       This matches the main product variant order and avoids mis-sorting values like "2X-Large". */

    // Hide standalone quantity selector & Buy it now
    ['.product__controls-group-quantity',
     '.product-block--quantity-selector',
     '[data-quantity-selector]'
    ].forEach(function(sel) {
      var el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });
    var dynCheckout = document.querySelector('.product-form__controls-group--checkout, .shopify-payment-button');
    if (dynCheckout) dynCheckout.style.display = 'none';

    function syncStickyBarPrice(total) {
      var sp = document.querySelector('.sticky-atc-bar__price [data-price]');
      if (sp) sp.textContent = formatMoney(total);
      var sc = document.querySelector('.sticky-atc-bar__price [data-compare-price]');
      if (sc) sc.textContent = '';
    }

    function isChipOutOfStock(chip) {
      return !!chip && chip.getAttribute('data-available') !== 'true';
    }

    function ensureMemberStockError(member) {
      var info = member.querySelector(':scope > .family-bundle__member-header .family-bundle__member-info');
      if (!info) return null;
      var el = info.querySelector('.family-bundle__member-stock-error');
      if (!el) {
        el = document.createElement('span');
        el.className = 'family-bundle__member-stock-error';
        info.appendChild(el);
      }
      return el;
    }

    function clearMemberStockError(member) {
      var el = member.querySelector('.family-bundle__member-stock-error');
      if (el) {
        el.textContent = '';
        el.style.display = 'none';
      }
    }

    function setMemberStockError(member, msg) {
      var el = ensureMemberStockError(member);
      if (!el) return;
      el.textContent = msg;
      el.style.display = 'inline';
    }

    function rowHasOutOfStockSelection(row) {
      var selected = row.querySelectorAll('[data-bundle-chip].selected');
      if (!selected.length) return false;
      var hasOos = false;
      selected.forEach(function(chip) {
        if (isChipOutOfStock(chip)) hasOos = true;
      });
      return hasOos;
    }

    function memberHasOutOfStockSelection(member) {
      var toggle = member.querySelector('[data-bundle-toggle]');
      if (toggle && !toggle.checked) return false;
      var rows = member.querySelectorAll('.family-bundle__option-row');
      for (var r = 0; r < rows.length; r++) {
        if (rowHasOutOfStockSelection(rows[r])) return true;
      }
      return false;
    }

    function bundleHasOutOfStockSelection() {
      var members = bundle.querySelectorAll('[data-bundle-member]');
      for (var i = 0; i < members.length; i++) {
        if (memberHasOutOfStockSelection(members[i])) return true;
      }
      return false;
    }

    function markOutOfStockMemberErrors() {
      bundle.querySelectorAll('[data-bundle-member]').forEach(function(member) {
        if (memberHasOutOfStockSelection(member)) {
          setMemberStockError(member, 'Selected variant is out of stock');
        } else {
          clearMemberStockError(member);
        }
      });
    }

    function updateAtcAvailability() {
      var blocked = bundleHasOutOfStockSelection();
      allBtns.forEach(function(btn) {
        if (!btn) return;
        btn.classList.toggle('family-bundle__atc-disabled', blocked);
        btn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
      });
      if (!blocked) {
        bundle.querySelectorAll('[data-bundle-member]').forEach(clearMemberStockError);
      }
    }

    function ensureKlaviyoOnsiteLoaded() {
      if (!BIS_KLAVIYO_PUBLIC_KEY) return;

      window._klOnsite = window._klOnsite || [];
      window._klOnsite.push(['account', BIS_KLAVIYO_PUBLIC_KEY]);

      var existing = document.querySelector('script[data-family-bundle-klaviyo]');
      if (existing) return;

      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://static.klaviyo.com/onsite/js/klaviyo.js?company_id=' + encodeURIComponent(BIS_KLAVIYO_PUBLIC_KEY);
      script.setAttribute('data-family-bundle-klaviyo', 'true');
      document.head.appendChild(script);
    }

    function openKlaviyoBackInStockForm(chip) {
      var member = chip.closest('[data-bundle-member]');
      var memberLabelEl = member ? member.querySelector('.family-bundle__member-label') : null;
      var memberLabel = memberLabelEl ? memberLabelEl.textContent.trim() : 'Selected member';
      var variantValue = chip.getAttribute('data-value') || '';
      var row = chip.closest('.family-bundle__option-row');
      var variant = member && row ? getSelectedVariantFromRow(member, row) : null;

      if (!BIS_KLAVIYO_PUBLIC_KEY || !BIS_KLAVIYO_FORM_ID) {
        showError('Notify form is not configured.');
        return;
      }

      ensureKlaviyoOnsiteLoaded();

      window._learnq = window._learnq || [];
      window._learnq.push(['account', BIS_KLAVIYO_PUBLIC_KEY]);
      window._learnq.push(['track', 'Family Bundle Back In Stock Requested', {
        family_bundle_parent: parentTitle,
        member: memberLabel,
        variant: variantValue,
        variant_id: variant ? String(variant.id) : ''
      }]);

      window._klOnsite = window._klOnsite || [];
      window._klOnsite.push(['account', BIS_KLAVIYO_PUBLIC_KEY]);
      window._klOnsite.push(['openForm', BIS_KLAVIYO_FORM_ID]);
    }

    function getSelectedVariant(memberEl) {
      var variants = [];
      try { variants = JSON.parse(memberEl.querySelector('[data-bundle-variants]').textContent); } catch(e) { return null; }
      var chipGroups = memberEl.querySelectorAll('[data-bundle-chips]');
      if (chipGroups.length === 0) return variants[0] || null;
      var selections = {};
      chipGroups.forEach(function(g) {
        var sel = g.querySelector('.selected');
        var pos = g.getAttribute('data-option-position');
        if (sel && pos) selections[pos] = sel.getAttribute('data-value');
      });
      if (Object.keys(selections).length === 0) return null;
      return variants.find(function(v) {
        return Object.keys(selections).every(function(pos) {
          return v['option' + pos] === selections[pos];
        });
      }) || null;
    }

    function getSelectedVariantFromRow(memberEl, rowEl) {
      var variants = [];
      try { variants = JSON.parse(memberEl.querySelector('[data-bundle-variants]').textContent); } catch(e) { return null; }
      var chipGroups = rowEl.querySelectorAll('[data-bundle-chips]');
      if (chipGroups.length === 0) return variants[0] || null;
      var selections = {};
      chipGroups.forEach(function(g) {
        var sel = g.querySelector('.selected');
        var pos = g.getAttribute('data-option-position');
        if (sel && pos) selections[pos] = sel.getAttribute('data-value');
      });
      if (Object.keys(selections).length === 0) return null;
      return variants.find(function(v) {
        return Object.keys(selections).every(function(pos) {
          return v['option' + pos] === selections[pos];
        });
      }) || null;
    }

    function updateTotal() {
      var total = 0;
      bundle.querySelectorAll('[data-bundle-member]').forEach(function(m) {
        var toggle = m.querySelector('[data-bundle-toggle]');
        if (toggle && !toggle.checked) return;
        var memberTotal = 0;
        var rows = m.querySelectorAll('.family-bundle__option-row');
        if (rows.length === 0) {
          var variant = getSelectedVariant(m);
          var qty = parseInt((m.querySelector('[data-bundle-qty]') || { value: 1 }).value) || 1;
          if (variant) memberTotal += variant.price * qty;
        } else {
          rows.forEach(function(row) {
            var variant = getSelectedVariantFromRow(m, row);
            var qtyInput = row.querySelector('[data-bundle-qty]');
            var qty = parseInt((qtyInput || { value: 1 }).value) || 1;
            var rowPrice = variant ? variant.price * qty : 0;

            /* Check if this row is inside a clone section */
            var cloneSection = row.closest('.family-bundle__additional-section');
            if (cloneSection) {
              var clonePriceEl = cloneSection.querySelector('[data-bundle-clone-price]');
              if (clonePriceEl) clonePriceEl.textContent = formatMoney(rowPrice);
            }
            memberTotal += rowPrice;
          });
        }
        total += memberTotal;
        /* Update the original member header price (not clone prices) */
        var headerPrice = m.querySelector(':scope > .family-bundle__member-header [data-bundle-member-price]');
        if (headerPrice) headerPrice.textContent = formatMoney(memberTotal);
      });
      if (totalPriceEl) totalPriceEl.textContent = formatMoney(total);
      syncStickyBarPrice(total);
    }


    // Chip & qty events
    bundle.addEventListener('click', function(e) {
      var chip = e.target.closest('[data-bundle-chip]');
      if (chip) {
        var group = chip.closest('[data-bundle-chips]');
        var wasSelected = chip.classList.contains('selected');

        /* Clicking an already-selected chip deselects it */
        if (wasSelected) {
          chip.classList.remove('selected');
          chip.classList.remove('oos-selected');
          updateTotal();
          updateAtcAvailability();
          hideError();
          return;
        }

        group.querySelectorAll('[data-bundle-chip]').forEach(function(c) {
          c.classList.remove('selected');
          c.classList.remove('oos-selected');
        });
        chip.classList.add('selected');
        if (isChipOutOfStock(chip)) {
          chip.classList.add('oos-selected');
          openKlaviyoBackInStockForm(chip);
        }
        var row = group.previousElementSibling;
        if (row) {
          var lbl = row.querySelector('[data-bundle-selected-value]');
          if (lbl) lbl.textContent = chip.getAttribute('data-value');
        }
        updateTotal();
        updateAtcAvailability();
        hideError();
        return;
      }
      var minus = e.target.closest('[data-bundle-qty-minus]');
      var plus = e.target.closest('[data-bundle-qty-plus]');
      if (minus || plus) {
        var qtyInline = (minus || plus).closest('.family-bundle__qty-inline');
        if (!qtyInline) return;
        var input = qtyInline.querySelector('[data-bundle-qty]');
        if (!input) return;
        var val = parseInt(input.value) || 1;

        if (minus) {
          if (val > 1) {
            val--;
          } else {
            /* If qty is 1, remove clone rows or disable primary member rows */
            var additionalSection = (minus).closest('.family-bundle__additional-section');
            if (additionalSection) {
              additionalSection.remove();
              updateTotal();
              updateAtcAvailability();
              return;
            }

            var member = (minus).closest('[data-bundle-member]');
            var memberToggle = member ? member.querySelector('[data-bundle-toggle]') : null;
            if (member && memberToggle && memberToggle.checked) {
              memberToggle.checked = false;
              member.classList.add('disabled');
              updateTotal();
              updateIncludesText();
              updateAtcAvailability();
              hideError();
              return;
            }
          }
        }
        if (plus && val < 10) val++;
        input.value = val;
        updateTotal();
        updateAtcAvailability();
        return;
      }
    });

    /* ── ADD ANOTHER SIZE ROW (full section with header) ── */
    bundle.addEventListener('click', function(e) {
      var addBtn = e.target.closest('[data-bundle-add-another]');
      if (!addBtn) return;

      var member = addBtn.closest('[data-bundle-member]');
      var sizeRows = member.querySelector('[data-bundle-size-rows]');
      if (!sizeRows) return;

      var firstRow = sizeRows.querySelector('.family-bundle__option-row');
      if (!firstRow) return;

      /* Get the member label text */
      var labelEl = member.querySelector('.family-bundle__member-label');
      var labelText = labelEl ? labelEl.textContent.trim() : 'Size';

      /* Build a full additional section */
      var section = document.createElement('div');
      section.className = 'family-bundle__additional-section family-bundle__size-row-clone';

      /* Header row: label + price + remove */
      var header = document.createElement('div');
      header.className = 'family-bundle__member-header';
      header.innerHTML = '<div class="family-bundle__member-info">' +
        '<span class="family-bundle__member-label fs-body-75">ADDITIONAL ' + labelText + '</span>' +
        '</div>' +
        '<span class="family-bundle__member-price fs-body-100" data-bundle-clone-price>£0.00</span>' +
        '<div class="family-bundle__member-actions">' +
        '<button type="button" class="family-bundle__row-remove" data-bundle-remove-row>REMOVE</button>' +
        '</div>';
      section.appendChild(header);

      /* Clone the size chips + qty row */
      var rowClone = firstRow.cloneNode(true);
      rowClone.classList.add('family-bundle__option-row');
      rowClone.querySelectorAll('.selected').forEach(function(c) { c.classList.remove('selected'); });
      var qtyInput = rowClone.querySelector('[data-bundle-qty]');
      if (qtyInput) qtyInput.value = 1;

      var cloneChips = rowClone.querySelector('[data-bundle-chips]');
      if (cloneChips) {
        /* Auto-select first available size */
        var firstAvail = cloneChips.querySelector('[data-available="true"]');
        if (firstAvail) firstAvail.classList.add('selected');
      }

      section.appendChild(rowClone);
      sizeRows.appendChild(section);
      updateTotal();
      updateAtcAvailability();
    });

    /* Remove cloned section */
    bundle.addEventListener('click', function(e) {
      var removeBtn = e.target.closest('[data-bundle-remove-row]');
      if (!removeBtn) return;
      var section = removeBtn.closest('.family-bundle__size-row-clone');
      if (section) {
        section.remove();
        updateTotal();
        updateAtcAvailability();
        return;
      }
    });

    bundle.addEventListener('change', function(e) {
      var toggle = e.target.closest('[data-bundle-toggle]');
      if (!toggle) return;
      toggle.closest('[data-bundle-member]').classList.toggle('disabled', !toggle.checked);
      updateTotal();
      updateIncludesText();
      updateAtcAvailability();
      hideError();
    });

    /* Update "Includes Man & Cub" text beside price */
    function updateIncludesText() {
      var includesEl = document.querySelector('[data-bundle-includes]');
      if (!includesEl) return;

      var tplSingle = includesEl.getAttribute('data-tpl-single') || 'Includes {members} Only';
      var tplDuo = includesEl.getAttribute('data-tpl-duo') || 'Includes both {members}';
      var tplFamily = includesEl.getAttribute('data-tpl-family') || 'Includes for the whole Family';

      var roleLabels = ROLE_LABELS;
      var activeNames = [];

      bundle.querySelectorAll('[data-bundle-member]').forEach(function(m) {
        var toggle = m.querySelector('[data-bundle-toggle]');
        if (toggle && toggle.checked) {
          var role = m.getAttribute('data-bundle-member');
          activeNames.push(roleLabels[role] || role);
        }
      });

      if (activeNames.length === 0) {
        includesEl.textContent = '';
      } else if (activeNames.length === 1) {
        includesEl.textContent = tplSingle.replace('{members}', activeNames[0]);
      } else if (activeNames.length === 2) {
        var duo = activeNames[0] + ' & ' + activeNames[1];
        includesEl.textContent = tplDuo.replace('{members}', duo);
      } else {
        includesEl.textContent = tplFamily;
      }
    }

    // ── ADD TO CART ── (scoped to product section, not global)
    var productSection = bundle.closest('[data-section-id]') || bundle.closest('.shopify-section') || document;
    var addToCartBtn = productSection.querySelector('[data-add-to-cart]');
    var stickyAddBtn = document.querySelector('.sticky-atc-bar [data-add-to-cart]');
    var productForm = addToCartBtn ? addToCartBtn.closest('form') : null;
    allBtns = [addToCartBtn, stickyAddBtn].filter(Boolean);

    function interceptAdd(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      addBundleToCart();
      return false;
    }

    /* Intercept ALL ways the parent product could be added:
       - form submit (native + theme JS)
       - button click (theme JS often binds here)
       - Use capture phase to fire BEFORE theme handlers */
    if (productForm) {
      productForm.addEventListener('submit', interceptAdd, true);
    }
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', interceptAdd, true);
    }
    if (stickyAddBtn) {
      stickyAddBtn.addEventListener('click', interceptAdd, true);
    }

    /* Also remove the theme's form attribute so it can't submit natively */
    if (productForm) {
      productForm.setAttribute('data-bundle-intercepted', 'true');
      productForm.onsubmit = function(e) { e.preventDefault(); return false; };
    }

    var isAdding = false;

    function addBundleToCart() {
      if (isAdding) return;
      if (bundleHasOutOfStockSelection()) {
        markOutOfStockMemberErrors();
        hideError();
        updateAtcAvailability();
        return;
      }

      var items = [];
      var enabledCount = 0;
      var bundleId = 'FB-' + Date.now();
      var cleanTitle = parentTitle.replace(/\s*\([^)]*\)\s*/g, '').trim();
      // Read gift note if present on product page
      var giftNoteEl = document.querySelector('[data-mc-gift-textarea]');
      var giftNote = giftNoteEl ? giftNoteEl.value.trim() : '';

      var members = bundle.querySelectorAll('[data-bundle-member]');
      for (var i = 0; i < members.length; i++) {
        var m = members[i];
        var toggle = m.querySelector('[data-bundle-toggle]');
        if (toggle && !toggle.checked) continue;
        clearMemberStockError(m);
        enabledCount++;
        var role = m.getAttribute('data-bundle-member');
        var label = ROLE_CART_LABELS[role] || role;

        var rows = m.querySelectorAll('.family-bundle__option-row');
        if (rows.length === 0) {
          /* Default variant product - no size picker */
          var variant = getSelectedVariant(m);
          if (!variant) { showError('Please select a valid option for ' + label); return; }
          if (!variant.available) {
            setMemberStockError(m, 'Selected variant is out of stock');
            hideError();
            return;
          }
          var props1 = { 'Bundle': cleanTitle, 'For': label, '_bundle_id': bundleId };
          if (parentHandle) props1['_bundle_parent_handle'] = parentHandle;
          if (giftNote) props1['Gift Message'] = giftNote;
          items.push({ id: variant.id, quantity: 1, properties: props1 });
        } else {
          for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var chipGroups = row.querySelectorAll('[data-bundle-chips]');
            var hasSelection = false;
            chipGroups.forEach(function(g) { if (g.querySelector('.selected')) hasSelection = true; });
            if (!hasSelection) {
              showError('Please select a size for ' + label);
              return;
            }

            var variant = getSelectedVariantFromRow(m, row);
            if (!variant) { showError('Please select a valid size for ' + label); return; }
            if (rowHasOutOfStockSelection(row) || !variant.available) {
              setMemberStockError(m, 'Selected variant is out of stock');
              hideError();
              return;
            }

            var qtyInput = row.querySelector('[data-bundle-qty]');
            var qty = parseInt((qtyInput || { value: 1 }).value) || 1;

            var props2 = { 'Bundle': cleanTitle, 'For': label, '_bundle_id': bundleId };
            if (parentHandle) props2['_bundle_parent_handle'] = parentHandle;
            if (giftNote) props2['Gift Message'] = giftNote;
            items.push({ id: variant.id, quantity: qty, properties: props2 });
          }
        }
      }

      if (enabledCount === 0) { showError('Please toggle on at least one family member'); return; }
      hideError();
      isAdding = true;
      allBtns.forEach(function(b) { b.classList.add('btn--loading'); b.disabled = true; });

      fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ items: items })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.status === 422 || res.status === 404) {
          throw new Error(res.description || 'Could not add items');
        }

        // Tell the theme: "a product was added to cart"
        // Theme will: 1) update cart count badges, 2) refresh quick cart HTML
        document.dispatchEvent(new CustomEvent('apps:product-added-to-cart'));

        // Wait for theme to finish re-rendering quick cart, then open it
        // Use MutationObserver instead of fragile setTimeout
        var qcContainer = document.querySelector('.quick-cart__container');
        if (qcContainer) {
          var addObserver = new MutationObserver(function() {
            addObserver.disconnect();
            // Theme has re-rendered — now open the drawer and init buttons
            var cartIcon = document.querySelector('[data-js-cart-icon]');
            if (cartIcon) cartIcon.click();
            initBundleCartButtons();
          });
          addObserver.observe(qcContainer, { childList: true, subtree: false });
          // Fallback if observer doesn't fire within 1s (e.g., quick cart disabled)
          setTimeout(function() {
            addObserver.disconnect();
            initBundleCartButtons();
          }, 1000);
        } else {
          // No quick cart container — just re-init buttons
          setTimeout(function() { initBundleCartButtons(); }, 300);
        }

        // Reset buttons
        allBtns.forEach(function(b) { b.classList.remove('btn--loading'); b.disabled = false; });
        var btnText = addToCartBtn ? addToCartBtn.querySelector('[data-add-to-cart-text]') : null;
        if (btnText) {
          var orig = btnText.textContent;
          btnText.textContent = 'Added to Bag!';
          setTimeout(function() { btnText.textContent = orig; }, 2000);
        }
        isAdding = false;
      })
      .catch(function(err) {
        allBtns.forEach(function(b) { b.classList.remove('btn--loading'); b.disabled = false; });
        isAdding = false;
        showError(err.message || 'Something went wrong. Please try again.');
      });
    }

    function showError(msg) {
      var el = bundle.querySelector('.family-bundle__error');
      if (el) { el.textContent = msg; el.style.display = 'block'; }
    }
    function hideError() {
      var el = bundle.querySelector('.family-bundle__error');
      if (el) el.style.display = 'none';
    }

    updateTotal();
    updateIncludesText();
    updateAtcAvailability();
    ensureKlaviyoOnsiteLoaded();
  }

  /* ================================================================
   *  SECTION B — Cart bundle management (quick cart + cart page)
   * ================================================================ */
  function initBundleCartButtons() {
    document.querySelectorAll('[data-remove-bundle]').forEach(function(btn) {
      if (btn._bundleInit) return;
      btn._bundleInit = true;

      btn.addEventListener('click', function() {
        var group = btn.closest('[data-bundle-group]');
        var keys = [];
        if (group) {
          group.querySelectorAll('[data-input-item]').forEach(function(el) {
            keys.push(el.getAttribute('data-key'));
          });
        }
        if (!keys.length) return;

        btn.textContent = 'Removing...';
        btn.disabled = true;
        if (group) {
          group.style.transition = 'opacity 0.15s ease';
          group.style.opacity = '0.3';
        }

        var updates = {};
        keys.forEach(function(k) { updates[k] = 0; });

        fetch('/cart/update.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: JSON.stringify({ updates: updates })
        })
        .then(function(r) { return r.json(); })
        .then(function(cartData) {
          // On full cart page, just reload (most reliable)
          var isCartPage = window.location.pathname.indexOf('/cart') !== -1
            && !document.querySelector('.quick-cart__wrapper.active');
          if (isCartPage) {
            location.reload();
            return;
          }

          // In quick cart: let theme re-render everything properly
          document.dispatchEvent(new CustomEvent('apps:product-added-to-cart'));

          // Update count immediately for perceived speed
          document.querySelectorAll('[data-cart-count], [data-js-cart-count]').forEach(function(el) {
            el.textContent = cartData.item_count;
          });
          var countSup = document.querySelector('.quick-cart__heading sup');
          if (countSup) countSup.textContent = cartData.item_count;

          // Animate out the group while theme fetches new content
          if (group) {
            group.style.maxHeight = group.offsetHeight + 'px';
            group.offsetHeight; // force reflow
            group.style.transition = 'opacity 0.2s ease, max-height 0.25s ease, margin 0.25s ease';
            group.style.opacity = '0';
            group.style.maxHeight = '0';
            group.style.overflow = 'hidden';
            group.style.marginBottom = '0';
          }

          // Observer handles re-init after theme finishes re-rendering
        })
        .catch(function(err) {
          // Reset button state on error
          btn.textContent = 'Remove Bundle';
          btn.disabled = false;
          if (group) {
            group.style.transition = 'opacity 0.15s ease';
            group.style.opacity = '1';
          }
          console.error('Failed to remove bundle:', err);
        });
      });
    });

    // Allow quantity 0 on bundle items
    document.querySelectorAll('.quick-cart__bundle-sub-item .quantity-input__input, .cart__bundle-sub-item .quantity-input__input').forEach(function(input) {
      if (!input._minSet) {
        input._minSet = true;
        input.setAttribute('min', '0');
      }
    });
  }

  /* ================================================================
   *  SECTION C — Auto re-init when theme re-renders cart content
   *  Watches for DOM changes in quick cart and cart page
   * ================================================================ */
  var _cartObserver1 = null;
  var _cartObserver2 = null;

  var _reinitTimer = null;
  function debouncedReinit() {
    clearTimeout(_reinitTimer);
    _reinitTimer = setTimeout(initBundleCartButtons, 150);
  }

  function watchCartChanges() {
    /* Disconnect existing observers to prevent memory leaks */
    if (_cartObserver1) { _cartObserver1.disconnect(); _cartObserver1 = null; }
    if (_cartObserver2) { _cartObserver2.disconnect(); _cartObserver2 = null; }

    // Quick cart — watch full subtree so we catch items re-renders
    var qcContainer = document.querySelector('.quick-cart__container');
    if (qcContainer) {
      _cartObserver1 = new MutationObserver(debouncedReinit);
      _cartObserver1.observe(qcContainer, { childList: true, subtree: true });
    }

    // Full cart page container
    var cartContainer = document.querySelector('.cart__items');
    if (cartContainer) {
      _cartObserver2 = new MutationObserver(debouncedReinit);
      _cartObserver2.observe(cartContainer, { childList: true, subtree: true });
    }
  }

  // Expose for external calls
  window.initBundleRemoveButtons = initBundleCartButtons;

  // ── INIT ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initProductBundle();
      initBundleCartButtons();
      watchCartChanges();
    });
  } else {
    initProductBundle();
    initBundleCartButtons();
    watchCartChanges();
  }

})();

} // end duplicate load guard

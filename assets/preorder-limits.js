(function() {
  if (window._preorderLimitsLoaded) return;
  window._preorderLimitsLoaded = true;

  var PRODUCT_SELECTOR = '[data-section-type="product"], [data-section-type="featured-product"]';
  var BUTTON_SELECTOR = '[data-add-to-cart], [data-buy-now-button]';
  var cartQuantities = {};
  var cartPromise = null;
  var initTimer = null;

  function uniqueButtons(container) {
    var buttons = Array.prototype.slice.call(container.querySelectorAll(BUTTON_SELECTOR));
    var stickyButtons = Array.prototype.slice.call(document.querySelectorAll(
      '.sticky-atc-bar [data-add-to-cart], .sticky-atc-bar [data-buy-now-button]'
    ));

    stickyButtons.forEach(function(button) {
      if (buttons.indexOf(button) === -1) buttons.push(button);
    });

    return buttons;
  }

  function toInt(value) {
    var number = parseInt(value, 10);
    return Number.isFinite(number) ? number : 0;
  }

  function positiveQuantity(value) {
    var quantity = toInt(value);
    return quantity > 0 ? quantity : 1;
  }

  function parseJson(script) {
    if (!script || !script.textContent) return null;

    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return null;
    }
  }

  function byId(items) {
    return (items || []).reduce(function(map, item) {
      map[String(item.id)] = item;
      return map;
    }, {});
  }

  function getCartQuantities(force) {
    if (cartPromise && !force) return cartPromise;

    cartPromise = fetch('/cart.js', {
      method: 'GET',
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(cart) {
        cartQuantities = {};
        (cart.items || []).forEach(function(item) {
          var variantId = String(item.variant_id || item.id);
          cartQuantities[variantId] = (cartQuantities[variantId] || 0) + toInt(item.quantity);
        });
        document.dispatchEvent(new CustomEvent('preorder:cart-quantities-updated'));
        return cartQuantities;
      })
      .catch(function() {
        cartQuantities = {};
        return cartQuantities;
      })
      .finally(function() {
        cartPromise = null;
      });

    return cartPromise;
  }

  function variantCartQuantity(variantId) {
    return cartQuantities[String(variantId)] || 0;
  }

  function remainingForVariant(variant) {
    if (!variant || !variant.preorder_managed) return null;
    return Math.max(0, toInt(variant.preorder_remaining) - variantCartQuantity(variant.id));
  }

  function variantTitle(variant) {
    if (!variant || !variant.title || variant.title === 'Default Title') return 'variant';
    return variant.title;
  }

  function remainingText(remaining, variant) {
    if (remaining <= 0) return 'This preorder ' + variantTitle(variant) + ' is sold out.';
    if (remaining === 1) return 'Only 1 ' + variantTitle(variant) + ' is left for preorder.';
    return 'Only ' + remaining + ' ' + variantTitle(variant) + ' are left for preorder.';
  }

  function setButtonPreorderBlock(button, blocked, soldOutText) {
    if (!button) return;

    var text = button.querySelector('[data-add-to-cart-text], [data-buy-now-text]');
    if (text && !button.dataset.preorderLimitOriginalText) {
      button.dataset.preorderLimitOriginalText = text.textContent;
    }

    if (blocked) {
      if (!button.disabled && button.getAttribute('aria-disabled') !== 'true') {
        button.dataset.preorderLimitDisabled = 'true';
      }

      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
      button.classList.add('preorder-limit-disabled');

      if (soldOutText && text) text.textContent = soldOutText;
      return;
    }

    if (button.dataset.preorderLimitDisabled === 'true') {
      button.disabled = false;
      button.removeAttribute('disabled');
      button.setAttribute('aria-disabled', 'false');
      delete button.dataset.preorderLimitDisabled;
    }

    button.classList.remove('preorder-limit-disabled');

    if (text && button.dataset.preorderLimitOriginalText) {
      text.textContent = button.dataset.preorderLimitOriginalText;
    }
  }

  function setButtonsPreorderBlock(buttons, blocked, soldOutText) {
    buttons.forEach(function(button) {
      setButtonPreorderBlock(button, blocked, soldOutText);
    });
  }

  function setButtonsPreorderMode(buttons, isPreorder) {
    buttons.forEach(function(button) {
      if (!button.hasAttribute('data-add-to-cart')) return;

      var text = button.querySelector('[data-add-to-cart-text]');
      if (!text) return;

      if (!button.dataset.preorderDefaultText) {
        button.dataset.preorderDefaultText = button.dataset.normalText || text.textContent;
      }

      var preorderText = button.dataset.preorderText || 'Pre-order';
      text.textContent = isPreorder ? preorderText : button.dataset.preorderDefaultText;
      button.dataset.productPreorder = isPreorder ? 'true' : 'false';
    });
  }

  function setPreorderProperties(container, isPreorder) {
    container.querySelectorAll('[data-preorder-property]').forEach(function(input) {
      input.disabled = !isPreorder;
    });
  }

  function refreshCartAfterAllowedAdd() {
    window.setTimeout(function() {
      getCartQuantities(true);
    }, 800);

    window.setTimeout(function() {
      getCartQuantities(true);
    }, 1800);
  }

  function ensureProductMessage(container) {
    var message = container.querySelector('[data-preorder-limit-message]');
    if (message) return message;

    message = document.createElement('p');
    message.className = 'mc-preorder-limit-message fs-body-75';
    message.setAttribute('data-preorder-limit-message', '');
    message.setAttribute('role', 'alert');
    message.hidden = true;

    var buyNowBlock = container.querySelector('[data-buy-now-block]');
    var submitGroup = container.querySelector('.product-form__controls-group--submit');
    var quantityGroup = container.querySelector('.product__controls-group-quantity');
    var anchor = buyNowBlock || submitGroup || quantityGroup;

    if (anchor) {
      anchor.insertAdjacentElement('afterend', message);
    } else {
      container.appendChild(message);
    }

    return message;
  }

  function showMessage(message, text) {
    if (!message) return;
    message.textContent = text || '';
    message.hidden = !text;
  }

  function initProduct(container) {
    if (!container || container._preorderLimitsInit) return;

    var data = parseJson(container.querySelector('[data-preorder-limits-json]'));
    if (!data || data.has_preorder_variant !== true) return;

    container._preorderLimitsInit = true;

    var variants = byId(data.variants);
    var form = container.querySelector('[data-product-form]');
    var buttons = uniqueButtons(container);
    var message = ensureProductMessage(container);
    var variantChoiceTouched = false;

    function selectedVariant() {
      if (!form) return null;

      var select = form.querySelector('[data-variant-select], [name="id"]');
      if (!select) return null;

      return variants[String(select.value)] || null;
    }

    function selectedQuantity() {
      if (!form) return 1;

      var quantityInput = form.querySelector('[name="quantity"]');
      return positiveQuantity(quantityInput ? quantityInput.value : 1);
    }

    function validate() {
      var variant = selectedVariant();
      var variantUnavailable = !!variant && variant.available !== true;
      var useProductDefaultPreorder = data.product_preorder_enabled === true && !variantChoiceTouched;
      var isPreorder = !!variant && (variant.preorder_enabled === true || useProductDefaultPreorder) && !variantUnavailable;
      setPreorderProperties(container, isPreorder);

      if (variantUnavailable) {
        showMessage(message, '');
        setButtonsPreorderMode(buttons, false);
        setButtonsPreorderBlock(buttons, true, 'Sold out');
        return false;
      }

      if (!variant || !variant.preorder_managed) {
        showMessage(message, '');
        setButtonsPreorderBlock(buttons, false);
        setButtonsPreorderMode(buttons, isPreorder);
        return true;
      }

      var remaining = remainingForVariant(variant);
      var quantity = selectedQuantity();
      var blocked = remaining <= 0 || quantity > remaining;
      var text = '';

      if (blocked) {
        text = remainingText(remaining, variant);
      } else if (remaining <= 3) {
        text = remainingText(remaining, variant);
      }

      showMessage(message, text);

      if (blocked) {
        setButtonsPreorderMode(buttons, isPreorder);
        setButtonsPreorderBlock(buttons, true, remaining <= 0 ? 'Sold out' : null);
      } else {
        setButtonsPreorderBlock(buttons, false);
        setButtonsPreorderMode(buttons, isPreorder);
      }

      return !blocked;
    }

    function intercept(event) {
      if (validate()) {
        refreshCartAfterAllowedAdd();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    if (form) form.addEventListener('submit', intercept, true);

    buttons.forEach(function(button) {
      button.addEventListener('click', intercept, true);
    });

    container.addEventListener('change', function(event) {
      if (
        event.target.matches('[data-variant-select], [name="id"]') ||
        (event.target.name && event.target.name.indexOf('options[') === 0)
      ) {
        variantChoiceTouched = true;
      }

      window.setTimeout(validate, 0);
    });

    container.addEventListener('click', function(event) {
      if (event.target.closest('[data-button]')) {
        variantChoiceTouched = true;
      }

      if (
        event.target.closest('[data-add-quantity]') ||
        event.target.closest('[data-subtract-quantity]') ||
        event.target.closest('[data-button]')
      ) {
        window.setTimeout(validate, 0);
      }
    });

    document.addEventListener('preorder:cart-quantities-updated', validate);
    getCartQuantities().then(validate);
    validate();
  }

  function memberVariants(member) {
    if (!member._preorderBundleVariants) {
      member._preorderBundleVariants = parseJson(member.querySelector('[data-bundle-variants]')) || [];
    }

    return member._preorderBundleVariants;
  }

  function bundleHasPreorderVariant(bundle) {
    return Array.prototype.slice.call(bundle.querySelectorAll('[data-bundle-member]')).some(function(member) {
      return memberVariants(member).some(function(variant) {
        return variant.preorder_enabled === true;
      });
    });
  }

  function rowSelections(row, ignoredGroup) {
    var selections = {};

    row.querySelectorAll('[data-bundle-chips]').forEach(function(group) {
      if (group === ignoredGroup) return;

      var selected = group.querySelector('[data-bundle-chip].selected');
      var position = group.getAttribute('data-option-position');
      if (selected && position) selections[position] = selected.getAttribute('data-value');
    });

    return selections;
  }

  function variantMatches(variant, selections) {
    return Object.keys(selections).every(function(position) {
      return variant['option' + position] === selections[position];
    });
  }

  function selectedBundleVariant(member, row) {
    var variants = memberVariants(member);
    var selections = rowSelections(row);

    if (!Object.keys(selections).length) return variants[0] || null;

    return variants.find(function(variant) {
      return variantMatches(variant, selections);
    }) || null;
  }

  function valueHasAvailableVariant(member, row, group, value) {
    var variants = memberVariants(member);
    var selections = rowSelections(row, group);
    var position = group.getAttribute('data-option-position');

    if (!position) return true;
    selections[position] = value;

    return variants.some(function(variant) {
      return variant.available && variantMatches(variant, selections);
    });
  }

  function syncBundleChips(bundle) {
    bundle.querySelectorAll('[data-bundle-member]').forEach(function(member) {
      member.querySelectorAll('.family-bundle__option-row').forEach(function(row) {
        row.querySelectorAll('[data-bundle-chips]').forEach(function(group) {
          group.querySelectorAll('[data-bundle-chip]').forEach(function(chip) {
            var available = valueHasAvailableVariant(member, row, group, chip.getAttribute('data-value'));
            chip.setAttribute('data-available', available ? 'true' : 'false');
            chip.classList.toggle('sold-out', !available);
            chip.classList.toggle('oos-selected', !available && chip.classList.contains('selected'));
          });
        });
      });
    });
  }

  function ensureMemberError(member) {
    var info = member.querySelector(':scope > .family-bundle__member-header .family-bundle__member-info');
    if (!info) return null;

    var error = info.querySelector('.family-bundle__member-stock-error');
    if (!error) {
      error = document.createElement('span');
      error.className = 'family-bundle__member-stock-error';
      info.appendChild(error);
    }

    return error;
  }

  function setMemberError(member, text) {
    var error = ensureMemberError(member);
    if (!error) return;

    error.dataset.preorderLimitError = 'true';
    error.textContent = text;
    error.style.display = 'inline';
  }

  function clearPreorderMemberErrors(bundle) {
    bundle.querySelectorAll('.family-bundle__member-stock-error[data-preorder-limit-error]').forEach(function(error) {
      error.textContent = '';
      error.style.display = 'none';
      delete error.dataset.preorderLimitError;
    });
  }

  function setBundleError(bundle, text) {
    var error = bundle.querySelector('.family-bundle__error');
    if (!error) return;

    if (text) {
      error.dataset.preorderLimitError = 'true';
      error.textContent = text;
      error.style.display = 'block';
      return;
    }

    if (error.dataset.preorderLimitError === 'true') {
      error.textContent = '';
      error.style.display = 'none';
      delete error.dataset.preorderLimitError;
    }
  }

  function initFamilyBundle(bundle) {
    if (!bundle || bundle._preorderLimitsInit) return;

    var parentDefaultPreorder = bundle.dataset.parentPreorderEnabled === 'true';
    if (!parentDefaultPreorder && !bundleHasPreorderVariant(bundle)) return;

    bundle._preorderLimitsInit = true;

    var productSection = bundle.closest('[data-section-id]') || document;
    var buttons = uniqueButtons(productSection);
    var bundleChoiceTouched = false;

    function collectRows() {
      var rows = [];

      bundle.querySelectorAll('[data-bundle-member]').forEach(function(member) {
        var toggle = member.querySelector('[data-bundle-toggle]');
        if (toggle && !toggle.checked) return;

        member.querySelectorAll('.family-bundle__option-row').forEach(function(row) {
          var variant = selectedBundleVariant(member, row);
          if (!variant || !variant.preorder_managed) return;

          var quantityInput = row.querySelector('[data-bundle-qty]');
          rows.push({
            member: member,
            row: row,
            variant: variant,
            quantity: positiveQuantity(quantityInput ? quantityInput.value : 1)
          });
        });
      });

      return rows;
    }

    function hasSelectedPreorderVariant() {
      return Array.prototype.slice.call(bundle.querySelectorAll('[data-bundle-member]')).some(function(member) {
        var toggle = member.querySelector('[data-bundle-toggle]');
        if (toggle && !toggle.checked) return false;

        return Array.prototype.slice.call(member.querySelectorAll('.family-bundle__option-row')).some(function(row) {
          var variant = selectedBundleVariant(member, row);
          return !!variant && variant.preorder_enabled === true && variant.available === true;
        });
      });
    }

    function validate() {
      syncBundleChips(bundle);
      clearPreorderMemberErrors(bundle);

      var selectedPreorder = (parentDefaultPreorder && !bundleChoiceTouched) || hasSelectedPreorderVariant();
      var rows = collectRows();
      var totals = {};
      var errors = [];

      rows.forEach(function(rowData) {
        var id = String(rowData.variant.id);
        if (!totals[id]) {
          totals[id] = {
            variant: rowData.variant,
            quantity: 0,
            rows: []
          };
        }

        totals[id].quantity += rowData.quantity;
        totals[id].rows.push(rowData);
      });

      Object.keys(totals).forEach(function(id) {
        var total = totals[id];
        var remaining = remainingForVariant(total.variant);

        if (remaining === null || total.quantity <= remaining) return;

        var text = remainingText(remaining, total.variant);
        errors.push(text);
        total.rows.forEach(function(rowData) {
          setMemberError(rowData.member, text);
        });
      });

      setBundleError(bundle, errors[0] || '');

      if (errors.length > 0) {
        setButtonsPreorderMode(buttons, selectedPreorder);
        setButtonsPreorderBlock(buttons, true);
      } else {
        setButtonsPreorderBlock(buttons, false);
        setButtonsPreorderMode(buttons, selectedPreorder);
      }

      return errors.length === 0;
    }

    bundle._preorderLimitsValidate = validate;

    function intercept(event) {
      if (validate()) {
        refreshCartAfterAllowedAdd();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }

    buttons.forEach(function(button) {
      button.addEventListener('click', intercept, true);
    });

    bundle.addEventListener('click', function(event) {
      if (
        event.target.closest('[data-bundle-chip]') ||
        event.target.closest('[data-bundle-add-another]') ||
        event.target.closest('[data-bundle-remove-row]')
      ) {
        bundleChoiceTouched = true;
      }

      window.setTimeout(validate, 0);
    });

    bundle.addEventListener('change', function(event) {
      if (event.target.closest('[data-bundle-toggle]')) {
        bundleChoiceTouched = true;
      }

      window.setTimeout(validate, 0);
    });

    document.addEventListener('preorder:cart-quantities-updated', validate);
    getCartQuantities().then(validate);
    validate();
  }

  function initAll() {
    document.querySelectorAll(PRODUCT_SELECTOR).forEach(initProduct);
    document.querySelectorAll('[data-family-bundle]').forEach(initFamilyBundle);
  }

  function scheduleInitAll() {
    if (initTimer) return;

    initTimer = window.setTimeout(function() {
      initTimer = null;
      initAll();
    }, 50);
  }

  document.addEventListener('DOMContentLoaded', scheduleInitAll);
  document.addEventListener('shopify:section:load', scheduleInitAll);
  document.addEventListener('apps:product-added-to-cart', function() {
    getCartQuantities(true).then(scheduleInitAll);
  });
  document.addEventListener('cart:updated', function() {
    getCartQuantities(true).then(scheduleInitAll);
  });

  new MutationObserver(scheduleInitAll).observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  if (document.readyState === 'interactive' || document.readyState === 'complete') initAll();

  window.MCPreorderLimits = {
    validateBundle: function(bundle) {
      if (!bundle) return true;
      initFamilyBundle(bundle);

      if (typeof bundle._preorderLimitsValidate === 'function') {
        return bundle._preorderLimitsValidate();
      }

      return true;
    }
  };
})();

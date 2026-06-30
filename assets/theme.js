var SECTION_ID_ATTR$1 = 'data-section-id';

function Section(container, properties) {
  this.container = validateContainerElement(container);
  this.id = container.getAttribute(SECTION_ID_ATTR$1);
  this.extensions = [];

  // eslint-disable-next-line es5/no-es6-static-methods
  Object.assign(this, validatePropertiesObject(properties));

  this.onLoad();
}

Section.prototype = {
  onLoad: Function.prototype,
  onUnload: Function.prototype,
  onSelect: Function.prototype,
  onDeselect: Function.prototype,
  onBlockSelect: Function.prototype,
  onBlockDeselect: Function.prototype,

  extend: function extend(extension) {
    this.extensions.push(extension); // Save original extension

    // eslint-disable-next-line es5/no-es6-static-methods
    var extensionClone = Object.assign({}, extension);
    delete extensionClone.init; // Remove init function before assigning extension properties

    // eslint-disable-next-line es5/no-es6-static-methods
    Object.assign(this, extensionClone);

    if (typeof extension.init === 'function') {
      extension.init.apply(this);
    }
  }
};

function validateContainerElement(container) {
  if (!(container instanceof Element)) {
    throw new TypeError(
      'Theme Sections: Attempted to load section. The section container provided is not a DOM element.'
    );
  }
  if (container.getAttribute(SECTION_ID_ATTR$1) === null) {
    throw new Error(
      'Theme Sections: The section container provided does not have an id assigned to the ' +
        SECTION_ID_ATTR$1 +
        ' attribute.'
    );
  }

  return container;
}

function validatePropertiesObject(value) {
  if (
    (typeof value !== 'undefined' && typeof value !== 'object') ||
    value === null
  ) {
    throw new TypeError(
      'Theme Sections: The properties object provided is not a valid'
    );
  }

  return value;
}

// Object.assign() polyfill from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
  // Must be writable: true, enumerable: false, configurable: true
  Object.defineProperty(Object, 'assign', {
    value: function assign(target) {
      if (target == null) {
        // TypeError if undefined or null
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var to = Object(target);

      for (var index = 1; index < arguments.length; index++) {
        var nextSource = arguments[index];

        if (nextSource != null) {
          // Skip over if undefined or null
          for (var nextKey in nextSource) {
            // Avoid bugs when hasOwnProperty is shadowed
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    },
    writable: true,
    configurable: true
  });
}

/*
 * @shopify/theme-sections
 * -----------------------------------------------------------------------------
 *
 * A framework to provide structure to your Shopify sections and a load and unload
 * lifecycle. The lifecycle is automatically connected to theme editor events so
 * that your sections load and unload as the editor changes the content and
 * settings of your sections.
 */

var SECTION_TYPE_ATTR = 'data-section-type';
var SECTION_ID_ATTR = 'data-section-id';

window.Shopify = window.Shopify || {};
window.Shopify.theme = window.Shopify.theme || {};
window.Shopify.theme.sections = window.Shopify.theme.sections || {};

var registered = (window.Shopify.theme.sections.registered =
  window.Shopify.theme.sections.registered || {});
var instances = (window.Shopify.theme.sections.instances =
  window.Shopify.theme.sections.instances || []);

function register(type, properties) {
  if (typeof type !== 'string') {
    throw new TypeError(
      'Theme Sections: The first argument for .register must be a string that specifies the type of the section being registered'
    );
  }

  if (typeof registered[type] !== 'undefined') {
    throw new Error(
      'Theme Sections: A section of type "' +
        type +
        '" has already been registered. You cannot register the same section type twice'
    );
  }

  function TypedSection(container) {
    Section.call(this, container, properties);
  }

  TypedSection.constructor = Section;
  TypedSection.prototype = Object.create(Section.prototype);
  TypedSection.prototype.type = type;

  return (registered[type] = TypedSection);
}

function load(types, containers) {
  types = normalizeType(types);

  if (typeof containers === 'undefined') {
    containers = document.querySelectorAll('[' + SECTION_TYPE_ATTR + ']');
  }

  containers = normalizeContainers(containers);

  types.forEach(function(type) {
    var TypedSection = registered[type];

    if (typeof TypedSection === 'undefined') {
      return;
    }

    containers = containers.filter(function(container) {
      // Filter from list of containers because container already has an instance loaded
      if (isInstance(container)) {
        return false;
      }

      // Filter from list of containers because container doesn't have data-section-type attribute
      if (container.getAttribute(SECTION_TYPE_ATTR) === null) {
        return false;
      }

      // Keep in list of containers because current type doesn't match
      if (container.getAttribute(SECTION_TYPE_ATTR) !== type) {
        return true;
      }

      instances.push(new TypedSection(container));

      // Filter from list of containers because container now has an instance loaded
      return false;
    });
  });
}

function unload(selector) {
  var instancesToUnload = getInstances(selector);

  instancesToUnload.forEach(function(instance) {
    var index = instances
      .map(function(e) {
        return e.id;
      })
      .indexOf(instance.id);
    instances.splice(index, 1);
    instance.onUnload();
  });
}

function getInstances(selector) {
  var filteredInstances = [];

  // Fetch first element if its an array
  if (NodeList.prototype.isPrototypeOf(selector) || Array.isArray(selector)) {
    var firstElement = selector[0];
  }

  // If selector element is DOM element
  if (selector instanceof Element || firstElement instanceof Element) {
    var containers = normalizeContainers(selector);

    containers.forEach(function(container) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.container === container;
        })
      );
    });

    // If select is type string
  } else if (typeof selector === 'string' || typeof firstElement === 'string') {
    var types = normalizeType(selector);

    types.forEach(function(type) {
      filteredInstances = filteredInstances.concat(
        instances.filter(function(instance) {
          return instance.type === type;
        })
      );
    });
  }

  return filteredInstances;
}

function getInstanceById(id) {
  var instance;

  for (var i = 0; i < instances.length; i++) {
    if (instances[i].id === id) {
      instance = instances[i];
      break;
    }
  }
  return instance;
}

function isInstance(selector) {
  return getInstances(selector).length > 0;
}

function normalizeType(types) {
  // If '*' then fetch all registered section types
  if (types === '*') {
    types = Object.keys(registered);

    // If a single section type string is passed, put it in an array
  } else if (typeof types === 'string') {
    types = [types];

    // If single section constructor is passed, transform to array with section
    // type string
  } else if (types.constructor === Section) {
    types = [types.prototype.type];

    // If array of typed section constructors is passed, transform the array to
    // type strings
  } else if (Array.isArray(types) && types[0].constructor === Section) {
    types = types.map(function(TypedSection) {
      return TypedSection.prototype.type;
    });
  }

  types = types.map(function(type) {
    return type.toLowerCase();
  });

  return types;
}

function normalizeContainers(containers) {
  // Nodelist with entries
  if (NodeList.prototype.isPrototypeOf(containers) && containers.length > 0) {
    containers = Array.prototype.slice.call(containers);

    // Empty Nodelist
  } else if (
    NodeList.prototype.isPrototypeOf(containers) &&
    containers.length === 0
  ) {
    containers = [];

    // Handle null (document.querySelector() returns null with no match)
  } else if (containers === null) {
    containers = [];

    // Single DOM element
  } else if (!Array.isArray(containers) && containers instanceof Element) {
    containers = [containers];
  }

  return containers;
}

if (window.Shopify.designMode) {
  document.addEventListener('shopify:section:load', function(event) {
    var container;
    var id = event.detail.sectionId;

    if (window.Shopify.visualPreviewMode) {
      container = event.target.querySelector("[data-section-id]");
    } else {
      container = event.target.querySelector(
        '[' + SECTION_ID_ATTR + '="' + id + '"]'
      );
    }

    if (container !== null) {
      load(container.getAttribute(SECTION_TYPE_ATTR), container);
    }
  });

  document.addEventListener('shopify:section:unload', function(event) {
    var id = event.detail.sectionId;
    var container = event.target.querySelector(
      '[' + SECTION_ID_ATTR + '="' + id + '"]'
    );
    var instance = getInstances(container)[0];

    if (typeof instance === 'object') {
      unload(container);
    }
  });

  document.addEventListener('shopify:section:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onSelect(event);
    }
  });

  document.addEventListener('shopify:section:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onDeselect(event);
    }
  });

  document.addEventListener('shopify:block:select', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockSelect(event);
    }
  });

  document.addEventListener('shopify:block:deselect', function(event) {
    var instance = getInstanceById(event.detail.sectionId);

    if (typeof instance === 'object') {
      instance.onBlockDeselect(event);
    }
  });
}

function n$2(n,t){return void 0===t&&(t=document),t.querySelector(n)}function t$2(n,t){return void 0===t&&(t=document),[].slice.call(t.querySelectorAll(n))}function c$1(n,t){return Array.isArray(n)?n.forEach(t):t(n)}function r$2(n){return function(t,r,e){return c$1(t,function(t){return t[n+"EventListener"](r,e)})}}function e$2(n,t,c){return r$2("add")(n,t,c),function(){return r$2("remove")(n,t,c)}}function o$2(n){return function(t){var r=arguments;return c$1(t,function(t){var c;return (c=t.classList)[n].apply(c,[].slice.call(r,1))})}}function u$1(n){o$2("add").apply(void 0,[n].concat([].slice.call(arguments,1)));}function i$1(n){o$2("remove").apply(void 0,[n].concat([].slice.call(arguments,1)));}function l(n){o$2("toggle").apply(void 0,[n].concat([].slice.call(arguments,1)));}function a$1(n,t){return n.classList.contains(t)}

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var isMobile$2 = {exports: {}};

isMobile$2.exports = isMobile;
isMobile$2.exports.isMobile = isMobile;
isMobile$2.exports.default = isMobile;

var mobileRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i;

var tabletRE = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series[46]0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino|android|ipad|playbook|silk/i;

function isMobile (opts) {
  if (!opts) opts = {};
  var ua = opts.ua;
  if (!ua && typeof navigator !== 'undefined') ua = navigator.userAgent;
  if (ua && ua.headers && typeof ua.headers['user-agent'] === 'string') {
    ua = ua.headers['user-agent'];
  }
  if (typeof ua !== 'string') return false

  var result = opts.tablet ? tabletRE.test(ua) : mobileRE.test(ua);

  if (
    !result &&
    opts.tablet &&
    opts.featureDetect &&
    navigator &&
    navigator.maxTouchPoints > 1 &&
    ua.indexOf('Macintosh') !== -1 &&
    ua.indexOf('Safari') !== -1
  ) {
    result = true;
  }

  return result
}

var isMobile$1 = isMobile$2.exports;

var browser = {exports: {}};

(function (module, exports) {

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {
  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];

  if (root) {
    this.root(root);
  }
  /** @type function() */


  this.handle = Delegate.prototype.handle.bind(this); // Cache of event listeners removed during an event cycle

  this._removedListeners = [];
}
/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.root = function (root) {
  var listenerMap = this.listenerMap;
  var eventType; // Remove master event listeners

  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }

    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  } // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here


  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }

    return this;
  }
  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */


  this.rootElement = root; // Set up master event listeners

  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }

  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};
/**
 * @param {string} eventType
 * @returns boolean
 */


Delegate.prototype.captureForType = function (eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};
/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {boolean} [useCapture] see 'useCapture' in <https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener>
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.on = function (eventType, selector, handler, useCapture) {
  var root;
  var listenerMap;
  var matcher;
  var matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  } // handler can be passed as
  // the second or third argument


  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // Fallback to sensible defaults
  // if useCapture not set


  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0]; // Add master handler for type if not created yet

  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }

    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null; // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.

    matcher = matchesRoot.bind(this); // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = Element.prototype.matches;
  } // Add to the list of listeners


  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });
  return this;
};
/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */


Delegate.prototype.off = function (eventType, selector, handler, useCapture) {
  var i;
  var listener;
  var listenerMap;
  var listenerList;
  var singleEventType; // Handler can be passed as
  // the second or third argument

  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  } // If useCapture not set, remove
  // all event listeners


  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];

  if (!listenerList || !listenerList.length) {
    return this;
  } // Remove only parameter matches
  // if specified


  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      this._removedListeners.push(listener);

      listenerList.splice(i, 1);
    }
  } // All listeners removed


  if (!listenerList.length) {
    delete listenerMap[eventType]; // Remove the main handler

    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};
/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */


Delegate.prototype.handle = function (event) {
  var i;
  var l;
  var type = event.type;
  var root;
  var phase;
  var listener;
  var returned;
  var listenerList = [];
  var target;
  var eventIgnore = 'ftLabsDelegateIgnore';

  if (event[eventIgnore] === true) {
    return;
  }

  target = event.target; // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8

  if (target.nodeType === 3) {
    target = target.parentNode;
  } // Handle SVG <use> elements in IE


  if (target.correspondingUseElement) {
    target = target.correspondingUseElement;
  }

  root = this.rootElement;
  phase = event.eventPhase || (event.target !== event.currentTarget ? 3 : 2); // eslint-disable-next-line default-case

  switch (phase) {
    case 1:
      //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
      break;

    case 2:
      //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) {
        listenerList = listenerList.concat(this.listenerMap[0][type]);
      }

      if (this.listenerMap[1] && this.listenerMap[1][type]) {
        listenerList = listenerList.concat(this.listenerMap[1][type]);
      }

      break;

    case 3:
      //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
      break;
  }

  var toFire = []; // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.

  l = listenerList.length;

  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i]; // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.

      if (!listener) {
        break;
      }

      if (target.tagName && ["button", "input", "select", "textarea"].indexOf(target.tagName.toLowerCase()) > -1 && target.hasAttribute("disabled")) {
        // Remove things that have previously fired
        toFire = [];
      } // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      else if (listener.matcher.call(target, listener.matcherParam, target)) {
          toFire.push([event, target, listener]);
        }
    } // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached


    if (target === root) {
      break;
    }

    l = listenerList.length; // Fall back to parentNode since SVG children have no parentElement in IE

    target = target.parentElement || target.parentNode; // Do not traverse up to document root when using parentNode, though

    if (target instanceof HTMLDocument) {
      break;
    }
  }

  var ret;

  for (i = 0; i < toFire.length; i++) {
    // Has it been removed during while the event function was fired
    if (this._removedListeners.indexOf(toFire[i][2]) > -1) {
      continue;
    }

    returned = this.fire.apply(this, toFire[i]); // Stop propagation to subsequent
    // callbacks if the callback returned
    // false

    if (returned === false) {
      toFire[i][0][eventIgnore] = true;
      toFire[i][0].preventDefault();
      ret = false;
      break;
    }
  }

  return ret;
};
/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */


Delegate.prototype.fire = function (event, target, listener) {
  return listener.handler.call(target, event, target);
};
/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}
/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesRoot(selector, element) {
  if (this.rootElement === window) {
    return (// Match the outer document (dispatched from document)
      element === document || // The <html> element (dispatched from document.body or document.documentElement)
      element === document.documentElement || // Or the window itself (dispatched from window)
      element === window
    );
  }

  return this.rootElement === element;
}
/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */


function matchesId(id, element) {
  return id === element.id;
}
/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */


Delegate.prototype.destroy = function () {
  this.off();
  this.root();
};

var _default = Delegate;
exports.default = _default;
module.exports = exports.default;
}(browser, browser.exports));

var Delegate = /*@__PURE__*/getDefaultExportFromCjs(browser.exports);

var pageTransition = (() => {
  const pageTransitionOverlay = document.querySelector("#page-transition-overlay");
  const animationDuration = 200;
  if (pageTransitionOverlay) {
    pageTransitionOverlay.classList.remove("skip-transition");
    setTimeout(function () {
      pageTransitionOverlay.classList.remove("active");
    }, 0);
    setTimeout(() => {
      // Prevent the theme editor from seeing this
      pageTransitionOverlay.classList.remove("active");
    }, animationDuration);
    const delegate = new Delegate(document.body);
    delegate.on("click", 'a[href]:not([href^="#"]):not(.no-transition):not([href^="mailto:"]):not([href^="tel:"]):not([target="_blank"]):not([href="javascript:void(0)"])', onClickedToLeave);
    window.onpageshow = function (e) {
      if (e.persisted) {
        pageTransitionOverlay.classList.remove("active");
      }
    };
  }
  function onClickedToLeave(event, target) {
    // avoid interupting open-in-new-tab click
    if (event.ctrlKey || event.metaKey) return;
    event.preventDefault();

    // Hint to browser to prerender destination
    let linkHint = document.createElement("link");
    linkHint.setAttribute("rel", "prerender");
    linkHint.setAttribute("href", target.href);
    document.head.appendChild(linkHint);
    setTimeout(() => {
      window.location.href = target.href;
    }, animationDuration);
    pageTransitionOverlay.classList.add("active");
  }
});

/*!
* tabbable 5.3.3
* @license MIT, https://github.com/focus-trap/tabbable/blob/master/LICENSE
*/
var candidateSelectors = ['input', 'select', 'textarea', 'a[href]', 'button', '[tabindex]:not(slot)', 'audio[controls]', 'video[controls]', '[contenteditable]:not([contenteditable="false"])', 'details>summary:first-of-type', 'details'];
var candidateSelector = /* #__PURE__ */candidateSelectors.join(',');
var NoElement = typeof Element === 'undefined';
var matches = NoElement ? function () {} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
var getRootNode = !NoElement && Element.prototype.getRootNode ? function (element) {
  return element.getRootNode();
} : function (element) {
  return element.ownerDocument;
};
/**
 * @param {Element} el container to check in
 * @param {boolean} includeContainer add container to check
 * @param {(node: Element) => boolean} filter filter candidates
 * @returns {Element[]}
 */

var getCandidates = function getCandidates(el, includeContainer, filter) {
  var candidates = Array.prototype.slice.apply(el.querySelectorAll(candidateSelector));

  if (includeContainer && matches.call(el, candidateSelector)) {
    candidates.unshift(el);
  }

  candidates = candidates.filter(filter);
  return candidates;
};
/**
 * @callback GetShadowRoot
 * @param {Element} element to check for shadow root
 * @returns {ShadowRoot|boolean} ShadowRoot if available or boolean indicating if a shadowRoot is attached but not available.
 */

/**
 * @callback ShadowRootFilter
 * @param {Element} shadowHostNode the element which contains shadow content
 * @returns {boolean} true if a shadow root could potentially contain valid candidates.
 */

/**
 * @typedef {Object} CandidatesScope
 * @property {Element} scope contains inner candidates
 * @property {Element[]} candidates
 */

/**
 * @typedef {Object} IterativeOptions
 * @property {GetShadowRoot|boolean} getShadowRoot true if shadow support is enabled; falsy if not;
 *  if a function, implies shadow support is enabled and either returns the shadow root of an element
 *  or a boolean stating if it has an undisclosed shadow root
 * @property {(node: Element) => boolean} filter filter candidates
 * @property {boolean} flatten if true then result will flatten any CandidatesScope into the returned list
 * @property {ShadowRootFilter} shadowRootFilter filter shadow roots;
 */

/**
 * @param {Element[]} elements list of element containers to match candidates from
 * @param {boolean} includeContainer add container list to check
 * @param {IterativeOptions} options
 * @returns {Array.<Element|CandidatesScope>}
 */


var getCandidatesIteratively = function getCandidatesIteratively(elements, includeContainer, options) {
  var candidates = [];
  var elementsToCheck = Array.from(elements);

  while (elementsToCheck.length) {
    var element = elementsToCheck.shift();

    if (element.tagName === 'SLOT') {
      // add shadow dom slot scope (slot itself cannot be focusable)
      var assigned = element.assignedElements();
      var content = assigned.length ? assigned : element.children;
      var nestedCandidates = getCandidatesIteratively(content, true, options);

      if (options.flatten) {
        candidates.push.apply(candidates, nestedCandidates);
      } else {
        candidates.push({
          scope: element,
          candidates: nestedCandidates
        });
      }
    } else {
      // check candidate element
      var validCandidate = matches.call(element, candidateSelector);

      if (validCandidate && options.filter(element) && (includeContainer || !elements.includes(element))) {
        candidates.push(element);
      } // iterate over shadow content if possible


      var shadowRoot = element.shadowRoot || // check for an undisclosed shadow
      typeof options.getShadowRoot === 'function' && options.getShadowRoot(element);
      var validShadowRoot = !options.shadowRootFilter || options.shadowRootFilter(element);

      if (shadowRoot && validShadowRoot) {
        // add shadow dom scope IIF a shadow root node was given; otherwise, an undisclosed
        //  shadow exists, so look at light dom children as fallback BUT create a scope for any
        //  child candidates found because they're likely slotted elements (elements that are
        //  children of the web component element (which has the shadow), in the light dom, but
        //  slotted somewhere _inside_ the undisclosed shadow) -- the scope is created below,
        //  _after_ we return from this recursive call
        var _nestedCandidates = getCandidatesIteratively(shadowRoot === true ? element.children : shadowRoot.children, true, options);

        if (options.flatten) {
          candidates.push.apply(candidates, _nestedCandidates);
        } else {
          candidates.push({
            scope: element,
            candidates: _nestedCandidates
          });
        }
      } else {
        // there's not shadow so just dig into the element's (light dom) children
        //  __without__ giving the element special scope treatment
        elementsToCheck.unshift.apply(elementsToCheck, element.children);
      }
    }
  }

  return candidates;
};

var getTabindex = function getTabindex(node, isScope) {
  if (node.tabIndex < 0) {
    // in Chrome, <details/>, <audio controls/> and <video controls/> elements get a default
    // `tabIndex` of -1 when the 'tabindex' attribute isn't specified in the DOM,
    // yet they are still part of the regular tab order; in FF, they get a default
    // `tabIndex` of 0; since Chrome still puts those elements in the regular tab
    // order, consider their tab index to be 0.
    // Also browsers do not return `tabIndex` correctly for contentEditable nodes;
    // so if they don't have a tabindex attribute specifically set, assume it's 0.
    //
    // isScope is positive for custom element with shadow root or slot that by default
    // have tabIndex -1, but need to be sorted by document order in order for their
    // content to be inserted in the correct position
    if ((isScope || /^(AUDIO|VIDEO|DETAILS)$/.test(node.tagName) || node.isContentEditable) && isNaN(parseInt(node.getAttribute('tabindex'), 10))) {
      return 0;
    }
  }

  return node.tabIndex;
};

var sortOrderedTabbables = function sortOrderedTabbables(a, b) {
  return a.tabIndex === b.tabIndex ? a.documentOrder - b.documentOrder : a.tabIndex - b.tabIndex;
};

var isInput = function isInput(node) {
  return node.tagName === 'INPUT';
};

var isHiddenInput = function isHiddenInput(node) {
  return isInput(node) && node.type === 'hidden';
};

var isDetailsWithSummary = function isDetailsWithSummary(node) {
  var r = node.tagName === 'DETAILS' && Array.prototype.slice.apply(node.children).some(function (child) {
    return child.tagName === 'SUMMARY';
  });
  return r;
};

var getCheckedRadio = function getCheckedRadio(nodes, form) {
  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].checked && nodes[i].form === form) {
      return nodes[i];
    }
  }
};

var isTabbableRadio = function isTabbableRadio(node) {
  if (!node.name) {
    return true;
  }

  var radioScope = node.form || getRootNode(node);

  var queryRadios = function queryRadios(name) {
    return radioScope.querySelectorAll('input[type="radio"][name="' + name + '"]');
  };

  var radioSet;

  if (typeof window !== 'undefined' && typeof window.CSS !== 'undefined' && typeof window.CSS.escape === 'function') {
    radioSet = queryRadios(window.CSS.escape(node.name));
  } else {
    try {
      radioSet = queryRadios(node.name);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s', err.message);
      return false;
    }
  }

  var checked = getCheckedRadio(radioSet, node.form);
  return !checked || checked === node;
};

var isRadio = function isRadio(node) {
  return isInput(node) && node.type === 'radio';
};

var isNonTabbableRadio = function isNonTabbableRadio(node) {
  return isRadio(node) && !isTabbableRadio(node);
};

var isZeroArea = function isZeroArea(node) {
  var _node$getBoundingClie = node.getBoundingClientRect(),
      width = _node$getBoundingClie.width,
      height = _node$getBoundingClie.height;

  return width === 0 && height === 0;
};

var isHidden = function isHidden(node, _ref) {
  var displayCheck = _ref.displayCheck,
      getShadowRoot = _ref.getShadowRoot;

  // NOTE: visibility will be `undefined` if node is detached from the document
  //  (see notes about this further down), which means we will consider it visible
  //  (this is legacy behavior from a very long way back)
  // NOTE: we check this regardless of `displayCheck="none"` because this is a
  //  _visibility_ check, not a _display_ check
  if (getComputedStyle(node).visibility === 'hidden') {
    return true;
  }

  var isDirectSummary = matches.call(node, 'details>summary:first-of-type');
  var nodeUnderDetails = isDirectSummary ? node.parentElement : node;

  if (matches.call(nodeUnderDetails, 'details:not([open]) *')) {
    return true;
  } // The root node is the shadow root if the node is in a shadow DOM; some document otherwise
  //  (but NOT _the_ document; see second 'If' comment below for more).
  // If rootNode is shadow root, it'll have a host, which is the element to which the shadow
  //  is attached, and the one we need to check if it's in the document or not (because the
  //  shadow, and all nodes it contains, is never considered in the document since shadows
  //  behave like self-contained DOMs; but if the shadow's HOST, which is part of the document,
  //  is hidden, or is not in the document itself but is detached, it will affect the shadow's
  //  visibility, including all the nodes it contains). The host could be any normal node,
  //  or a custom element (i.e. web component). Either way, that's the one that is considered
  //  part of the document, not the shadow root, nor any of its children (i.e. the node being
  //  tested).
  // If rootNode is not a shadow root, it won't have a host, and so rootNode should be the
  //  document (per the docs) and while it's a Document-type object, that document does not
  //  appear to be the same as the node's `ownerDocument` for some reason, so it's safer
  //  to ignore the rootNode at this point, and use `node.ownerDocument`. Otherwise,
  //  using `rootNode.contains(node)` will _always_ be true we'll get false-positives when
  //  node is actually detached.


  var nodeRootHost = getRootNode(node).host;
  var nodeIsAttached = (nodeRootHost === null || nodeRootHost === void 0 ? void 0 : nodeRootHost.ownerDocument.contains(nodeRootHost)) || node.ownerDocument.contains(node);

  if (!displayCheck || displayCheck === 'full') {
    if (typeof getShadowRoot === 'function') {
      // figure out if we should consider the node to be in an undisclosed shadow and use the
      //  'non-zero-area' fallback
      var originalNode = node;

      while (node) {
        var parentElement = node.parentElement;
        var rootNode = getRootNode(node);

        if (parentElement && !parentElement.shadowRoot && getShadowRoot(parentElement) === true // check if there's an undisclosed shadow
        ) {
          // node has an undisclosed shadow which means we can only treat it as a black box, so we
          //  fall back to a non-zero-area test
          return isZeroArea(node);
        } else if (node.assignedSlot) {
          // iterate up slot
          node = node.assignedSlot;
        } else if (!parentElement && rootNode !== node.ownerDocument) {
          // cross shadow boundary
          node = rootNode.host;
        } else {
          // iterate up normal dom
          node = parentElement;
        }
      }

      node = originalNode;
    } // else, `getShadowRoot` might be true, but all that does is enable shadow DOM support
    //  (i.e. it does not also presume that all nodes might have undisclosed shadows); or
    //  it might be a falsy value, which means shadow DOM support is disabled
    // Since we didn't find it sitting in an undisclosed shadow (or shadows are disabled)
    //  now we can just test to see if it would normally be visible or not, provided it's
    //  attached to the main document.
    // NOTE: We must consider case where node is inside a shadow DOM and given directly to
    //  `isTabbable()` or `isFocusable()` -- regardless of `getShadowRoot` option setting.


    if (nodeIsAttached) {
      // this works wherever the node is: if there's at least one client rect, it's
      //  somehow displayed; it also covers the CSS 'display: contents' case where the
      //  node itself is hidden in place of its contents; and there's no need to search
      //  up the hierarchy either
      return !node.getClientRects().length;
    } // Else, the node isn't attached to the document, which means the `getClientRects()`
    //  API will __always__ return zero rects (this can happen, for example, if React
    //  is used to render nodes onto a detached tree, as confirmed in this thread:
    //  https://github.com/facebook/react/issues/9117#issuecomment-284228870)
    //
    // It also means that even window.getComputedStyle(node).display will return `undefined`
    //  because styles are only computed for nodes that are in the document.
    //
    // NOTE: THIS HAS BEEN THE CASE FOR YEARS. It is not new, nor is it caused by tabbable
    //  somehow. Though it was never stated officially, anyone who has ever used tabbable
    //  APIs on nodes in detached containers has actually implicitly used tabbable in what
    //  was later (as of v5.2.0 on Apr 9, 2021) called `displayCheck="none"` mode -- essentially
    //  considering __everything__ to be visible because of the innability to determine styles.

  } else if (displayCheck === 'non-zero-area') {
    // NOTE: Even though this tests that the node's client rect is non-zero to determine
    //  whether it's displayed, and that a detached node will __always__ have a zero-area
    //  client rect, we don't special-case for whether the node is attached or not. In
    //  this mode, we do want to consider nodes that have a zero area to be hidden at all
    //  times, and that includes attached or not.
    return isZeroArea(node);
  } // visible, as far as we can tell, or per current `displayCheck` mode


  return false;
}; // form fields (nested) inside a disabled fieldset are not focusable/tabbable
//  unless they are in the _first_ <legend> element of the top-most disabled
//  fieldset


var isDisabledFromFieldset = function isDisabledFromFieldset(node) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(node.tagName)) {
    var parentNode = node.parentElement; // check if `node` is contained in a disabled <fieldset>

    while (parentNode) {
      if (parentNode.tagName === 'FIELDSET' && parentNode.disabled) {
        // look for the first <legend> among the children of the disabled <fieldset>
        for (var i = 0; i < parentNode.children.length; i++) {
          var child = parentNode.children.item(i); // when the first <legend> (in document order) is found

          if (child.tagName === 'LEGEND') {
            // if its parent <fieldset> is not nested in another disabled <fieldset>,
            // return whether `node` is a descendant of its first <legend>
            return matches.call(parentNode, 'fieldset[disabled] *') ? true : !child.contains(node);
          }
        } // the disabled <fieldset> containing `node` has no <legend>


        return true;
      }

      parentNode = parentNode.parentElement;
    }
  } // else, node's tabbable/focusable state should not be affected by a fieldset's
  //  enabled/disabled state


  return false;
};

var isNodeMatchingSelectorFocusable = function isNodeMatchingSelectorFocusable(options, node) {
  if (node.disabled || isHiddenInput(node) || isHidden(node, options) || // For a details element with a summary, the summary element gets the focus
  isDetailsWithSummary(node) || isDisabledFromFieldset(node)) {
    return false;
  }

  return true;
};

var isNodeMatchingSelectorTabbable = function isNodeMatchingSelectorTabbable(options, node) {
  if (isNonTabbableRadio(node) || getTabindex(node) < 0 || !isNodeMatchingSelectorFocusable(options, node)) {
    return false;
  }

  return true;
};

var isValidShadowRootTabbable = function isValidShadowRootTabbable(shadowHostNode) {
  var tabIndex = parseInt(shadowHostNode.getAttribute('tabindex'), 10);

  if (isNaN(tabIndex) || tabIndex >= 0) {
    return true;
  } // If a custom element has an explicit negative tabindex,
  // browsers will not allow tab targeting said element's children.


  return false;
};
/**
 * @param {Array.<Element|CandidatesScope>} candidates
 * @returns Element[]
 */


var sortByOrder = function sortByOrder(candidates) {
  var regularTabbables = [];
  var orderedTabbables = [];
  candidates.forEach(function (item, i) {
    var isScope = !!item.scope;
    var element = isScope ? item.scope : item;
    var candidateTabindex = getTabindex(element, isScope);
    var elements = isScope ? sortByOrder(item.candidates) : element;

    if (candidateTabindex === 0) {
      isScope ? regularTabbables.push.apply(regularTabbables, elements) : regularTabbables.push(element);
    } else {
      orderedTabbables.push({
        documentOrder: i,
        tabIndex: candidateTabindex,
        item: item,
        isScope: isScope,
        content: elements
      });
    }
  });
  return orderedTabbables.sort(sortOrderedTabbables).reduce(function (acc, sortable) {
    sortable.isScope ? acc.push.apply(acc, sortable.content) : acc.push(sortable.content);
    return acc;
  }, []).concat(regularTabbables);
};

var tabbable = function tabbable(el, options) {
  options = options || {};
  var candidates;

  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([el], options.includeContainer, {
      filter: isNodeMatchingSelectorTabbable.bind(null, options),
      flatten: false,
      getShadowRoot: options.getShadowRoot,
      shadowRootFilter: isValidShadowRootTabbable
    });
  } else {
    candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorTabbable.bind(null, options));
  }

  return sortByOrder(candidates);
};

var focusable = function focusable(el, options) {
  options = options || {};
  var candidates;

  if (options.getShadowRoot) {
    candidates = getCandidatesIteratively([el], options.includeContainer, {
      filter: isNodeMatchingSelectorFocusable.bind(null, options),
      flatten: true,
      getShadowRoot: options.getShadowRoot
    });
  } else {
    candidates = getCandidates(el, options.includeContainer, isNodeMatchingSelectorFocusable.bind(null, options));
  }

  return candidates;
};

var isTabbable = function isTabbable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches.call(node, candidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorTabbable(options, node);
};

var focusableCandidateSelector = /* #__PURE__ */candidateSelectors.concat('iframe').join(',');

var isFocusable = function isFocusable(node, options) {
  options = options || {};

  if (!node) {
    throw new Error('No node provided');
  }

  if (matches.call(node, focusableCandidateSelector) === false) {
    return false;
  }

  return isNodeMatchingSelectorFocusable(options, node);
};

/*!
* focus-trap 6.9.4
* @license MIT, https://github.com/focus-trap/focus-trap/blob/master/LICENSE
*/

function ownKeys(object, enumerableOnly) {
  var keys = Object.keys(object);

  if (Object.getOwnPropertySymbols) {
    var symbols = Object.getOwnPropertySymbols(object);
    enumerableOnly && (symbols = symbols.filter(function (sym) {
      return Object.getOwnPropertyDescriptor(object, sym).enumerable;
    })), keys.push.apply(keys, symbols);
  }

  return keys;
}

function _objectSpread2(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = null != arguments[i] ? arguments[i] : {};
    i % 2 ? ownKeys(Object(source), !0).forEach(function (key) {
      _defineProperty(target, key, source[key]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
  }

  return target;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var activeFocusTraps = function () {
  var trapQueue = [];
  return {
    activateTrap: function activateTrap(trap) {
      if (trapQueue.length > 0) {
        var activeTrap = trapQueue[trapQueue.length - 1];

        if (activeTrap !== trap) {
          activeTrap.pause();
        }
      }

      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex === -1) {
        trapQueue.push(trap);
      } else {
        // move this existing trap to the front of the queue
        trapQueue.splice(trapIndex, 1);
        trapQueue.push(trap);
      }
    },
    deactivateTrap: function deactivateTrap(trap) {
      var trapIndex = trapQueue.indexOf(trap);

      if (trapIndex !== -1) {
        trapQueue.splice(trapIndex, 1);
      }

      if (trapQueue.length > 0) {
        trapQueue[trapQueue.length - 1].unpause();
      }
    }
  };
}();

var isSelectableInput = function isSelectableInput(node) {
  return node.tagName && node.tagName.toLowerCase() === 'input' && typeof node.select === 'function';
};

var isEscapeEvent = function isEscapeEvent(e) {
  return e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27;
};

var isTabEvent = function isTabEvent(e) {
  return e.key === 'Tab' || e.keyCode === 9;
};

var delay = function delay(fn) {
  return setTimeout(fn, 0);
}; // Array.find/findIndex() are not supported on IE; this replicates enough
//  of Array.findIndex() for our needs


var findIndex = function findIndex(arr, fn) {
  var idx = -1;
  arr.every(function (value, i) {
    if (fn(value)) {
      idx = i;
      return false; // break
    }

    return true; // next
  });
  return idx;
};
/**
 * Get an option's value when it could be a plain value, or a handler that provides
 *  the value.
 * @param {*} value Option's value to check.
 * @param {...*} [params] Any parameters to pass to the handler, if `value` is a function.
 * @returns {*} The `value`, or the handler's returned value.
 */


var valueOrHandler = function valueOrHandler(value) {
  for (var _len = arguments.length, params = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    params[_key - 1] = arguments[_key];
  }

  return typeof value === 'function' ? value.apply(void 0, params) : value;
};

var getActualTarget = function getActualTarget(event) {
  // NOTE: If the trap is _inside_ a shadow DOM, event.target will always be the
  //  shadow host. However, event.target.composedPath() will be an array of
  //  nodes "clicked" from inner-most (the actual element inside the shadow) to
  //  outer-most (the host HTML document). If we have access to composedPath(),
  //  then use its first element; otherwise, fall back to event.target (and
  //  this only works for an _open_ shadow DOM; otherwise,
  //  composedPath()[0] === event.target always).
  return event.target.shadowRoot && typeof event.composedPath === 'function' ? event.composedPath()[0] : event.target;
};

var createFocusTrap = function createFocusTrap(elements, userOptions) {
  // SSR: a live trap shouldn't be created in this type of environment so this
  //  should be safe code to execute if the `document` option isn't specified
  var doc = (userOptions === null || userOptions === void 0 ? void 0 : userOptions.document) || document;

  var config = _objectSpread2({
    returnFocusOnDeactivate: true,
    escapeDeactivates: true,
    delayInitialFocus: true
  }, userOptions);

  var state = {
    // containers given to createFocusTrap()
    // @type {Array<HTMLElement>}
    containers: [],
    // list of objects identifying tabbable nodes in `containers` in the trap
    // NOTE: it's possible that a group has no tabbable nodes if nodes get removed while the trap
    //  is active, but the trap should never get to a state where there isn't at least one group
    //  with at least one tabbable node in it (that would lead to an error condition that would
    //  result in an error being thrown)
    // @type {Array<{
    //   container: HTMLElement,
    //   tabbableNodes: Array<HTMLElement>, // empty if none
    //   focusableNodes: Array<HTMLElement>, // empty if none
    //   firstTabbableNode: HTMLElement|null,
    //   lastTabbableNode: HTMLElement|null,
    //   nextTabbableNode: (node: HTMLElement, forward: boolean) => HTMLElement|undefined
    // }>}
    containerGroups: [],
    // same order/length as `containers` list
    // references to objects in `containerGroups`, but only those that actually have
    //  tabbable nodes in them
    // NOTE: same order as `containers` and `containerGroups`, but __not necessarily__
    //  the same length
    tabbableGroups: [],
    nodeFocusedBeforeActivation: null,
    mostRecentlyFocusedNode: null,
    active: false,
    paused: false,
    // timer ID for when delayInitialFocus is true and initial focus in this trap
    //  has been delayed during activation
    delayInitialFocusTimer: undefined
  };
  var trap; // eslint-disable-line prefer-const -- some private functions reference it, and its methods reference private functions, so we must declare here and define later

  /**
   * Gets a configuration option value.
   * @param {Object|undefined} configOverrideOptions If true, and option is defined in this set,
   *  value will be taken from this object. Otherwise, value will be taken from base configuration.
   * @param {string} optionName Name of the option whose value is sought.
   * @param {string|undefined} [configOptionName] Name of option to use __instead of__ `optionName`
   *  IIF `configOverrideOptions` is not defined. Otherwise, `optionName` is used.
   */

  var getOption = function getOption(configOverrideOptions, optionName, configOptionName) {
    return configOverrideOptions && configOverrideOptions[optionName] !== undefined ? configOverrideOptions[optionName] : config[configOptionName || optionName];
  };
  /**
   * Finds the index of the container that contains the element.
   * @param {HTMLElement} element
   * @returns {number} Index of the container in either `state.containers` or
   *  `state.containerGroups` (the order/length of these lists are the same); -1
   *  if the element isn't found.
   */


  var findContainerIndex = function findContainerIndex(element) {
    // NOTE: search `containerGroups` because it's possible a group contains no tabbable
    //  nodes, but still contains focusable nodes (e.g. if they all have `tabindex=-1`)
    //  and we still need to find the element in there
    return state.containerGroups.findIndex(function (_ref) {
      var container = _ref.container,
          tabbableNodes = _ref.tabbableNodes;
      return container.contains(element) || // fall back to explicit tabbable search which will take into consideration any
      //  web components if the `tabbableOptions.getShadowRoot` option was used for
      //  the trap, enabling shadow DOM support in tabbable (`Node.contains()` doesn't
      //  look inside web components even if open)
      tabbableNodes.find(function (node) {
        return node === element;
      });
    });
  };
  /**
   * Gets the node for the given option, which is expected to be an option that
   *  can be either a DOM node, a string that is a selector to get a node, `false`
   *  (if a node is explicitly NOT given), or a function that returns any of these
   *  values.
   * @param {string} optionName
   * @returns {undefined | false | HTMLElement | SVGElement} Returns
   *  `undefined` if the option is not specified; `false` if the option
   *  resolved to `false` (node explicitly not given); otherwise, the resolved
   *  DOM node.
   * @throws {Error} If the option is set, not `false`, and is not, or does not
   *  resolve to a node.
   */


  var getNodeForOption = function getNodeForOption(optionName) {
    var optionValue = config[optionName];

    if (typeof optionValue === 'function') {
      for (var _len2 = arguments.length, params = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        params[_key2 - 1] = arguments[_key2];
      }

      optionValue = optionValue.apply(void 0, params);
    }

    if (optionValue === true) {
      optionValue = undefined; // use default value
    }

    if (!optionValue) {
      if (optionValue === undefined || optionValue === false) {
        return optionValue;
      } // else, empty string (invalid), null (invalid), 0 (invalid)


      throw new Error("`".concat(optionName, "` was specified but was not a node, or did not return a node"));
    }

    var node = optionValue; // could be HTMLElement, SVGElement, or non-empty string at this point

    if (typeof optionValue === 'string') {
      node = doc.querySelector(optionValue); // resolve to node, or null if fails

      if (!node) {
        throw new Error("`".concat(optionName, "` as selector refers to no known node"));
      }
    }

    return node;
  };

  var getInitialFocusNode = function getInitialFocusNode() {
    var node = getNodeForOption('initialFocus'); // false explicitly indicates we want no initialFocus at all

    if (node === false) {
      return false;
    }

    if (node === undefined) {
      // option not specified: use fallback options
      if (findContainerIndex(doc.activeElement) >= 0) {
        node = doc.activeElement;
      } else {
        var firstTabbableGroup = state.tabbableGroups[0];
        var firstTabbableNode = firstTabbableGroup && firstTabbableGroup.firstTabbableNode; // NOTE: `fallbackFocus` option function cannot return `false` (not supported)

        node = firstTabbableNode || getNodeForOption('fallbackFocus');
      }
    }

    if (!node) {
      throw new Error('Your focus-trap needs to have at least one focusable element');
    }

    return node;
  };

  var updateTabbableNodes = function updateTabbableNodes() {
    state.containerGroups = state.containers.map(function (container) {
      var tabbableNodes = tabbable(container, config.tabbableOptions); // NOTE: if we have tabbable nodes, we must have focusable nodes; focusable nodes
      //  are a superset of tabbable nodes

      var focusableNodes = focusable(container, config.tabbableOptions);
      return {
        container: container,
        tabbableNodes: tabbableNodes,
        focusableNodes: focusableNodes,
        firstTabbableNode: tabbableNodes.length > 0 ? tabbableNodes[0] : null,
        lastTabbableNode: tabbableNodes.length > 0 ? tabbableNodes[tabbableNodes.length - 1] : null,

        /**
         * Finds the __tabbable__ node that follows the given node in the specified direction,
         *  in this container, if any.
         * @param {HTMLElement} node
         * @param {boolean} [forward] True if going in forward tab order; false if going
         *  in reverse.
         * @returns {HTMLElement|undefined} The next tabbable node, if any.
         */
        nextTabbableNode: function nextTabbableNode(node) {
          var forward = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
          // NOTE: If tabindex is positive (in order to manipulate the tab order separate
          //  from the DOM order), this __will not work__ because the list of focusableNodes,
          //  while it contains tabbable nodes, does not sort its nodes in any order other
          //  than DOM order, because it can't: Where would you place focusable (but not
          //  tabbable) nodes in that order? They have no order, because they aren't tabbale...
          // Support for positive tabindex is already broken and hard to manage (possibly
          //  not supportable, TBD), so this isn't going to make things worse than they
          //  already are, and at least makes things better for the majority of cases where
          //  tabindex is either 0/unset or negative.
          // FYI, positive tabindex issue: https://github.com/focus-trap/focus-trap/issues/375
          var nodeIdx = focusableNodes.findIndex(function (n) {
            return n === node;
          });

          if (nodeIdx < 0) {
            return undefined;
          }

          if (forward) {
            return focusableNodes.slice(nodeIdx + 1).find(function (n) {
              return isTabbable(n, config.tabbableOptions);
            });
          }

          return focusableNodes.slice(0, nodeIdx).reverse().find(function (n) {
            return isTabbable(n, config.tabbableOptions);
          });
        }
      };
    });
    state.tabbableGroups = state.containerGroups.filter(function (group) {
      return group.tabbableNodes.length > 0;
    }); // throw if no groups have tabbable nodes and we don't have a fallback focus node either

    if (state.tabbableGroups.length <= 0 && !getNodeForOption('fallbackFocus') // returning false not supported for this option
    ) {
      throw new Error('Your focus-trap must have at least one container with at least one tabbable node in it at all times');
    }
  };

  var tryFocus = function tryFocus(node) {
    if (node === false) {
      return;
    }

    if (node === doc.activeElement) {
      return;
    }

    if (!node || !node.focus) {
      tryFocus(getInitialFocusNode());
      return;
    }

    node.focus({
      preventScroll: !!config.preventScroll
    });
    state.mostRecentlyFocusedNode = node;

    if (isSelectableInput(node)) {
      node.select();
    }
  };

  var getReturnFocusNode = function getReturnFocusNode(previousActiveElement) {
    var node = getNodeForOption('setReturnFocus', previousActiveElement);
    return node ? node : node === false ? false : previousActiveElement;
  }; // This needs to be done on mousedown and touchstart instead of click
  // so that it precedes the focus event.


  var checkPointerDown = function checkPointerDown(e) {
    var target = getActualTarget(e);

    if (findContainerIndex(target) >= 0) {
      // allow the click since it ocurred inside the trap
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      // immediately deactivate the trap
      trap.deactivate({
        // if, on deactivation, we should return focus to the node originally-focused
        //  when the trap was activated (or the configured `setReturnFocus` node),
        //  then assume it's also OK to return focus to the outside node that was
        //  just clicked, causing deactivation, as long as that node is focusable;
        //  if it isn't focusable, then return focus to the original node focused
        //  on activation (or the configured `setReturnFocus` node)
        // NOTE: by setting `returnFocus: false`, deactivate() will do nothing,
        //  which will result in the outside click setting focus to the node
        //  that was clicked, whether it's focusable or not; by setting
        //  `returnFocus: true`, we'll attempt to re-focus the node originally-focused
        //  on activation (or the configured `setReturnFocus` node)
        returnFocus: config.returnFocusOnDeactivate && !isFocusable(target, config.tabbableOptions)
      });
      return;
    } // This is needed for mobile devices.
    // (If we'll only let `click` events through,
    // then on mobile they will be blocked anyways if `touchstart` is blocked.)


    if (valueOrHandler(config.allowOutsideClick, e)) {
      // allow the click outside the trap to take place
      return;
    } // otherwise, prevent the click


    e.preventDefault();
  }; // In case focus escapes the trap for some strange reason, pull it back in.


  var checkFocusIn = function checkFocusIn(e) {
    var target = getActualTarget(e);
    var targetContained = findContainerIndex(target) >= 0; // In Firefox when you Tab out of an iframe the Document is briefly focused.

    if (targetContained || target instanceof Document) {
      if (targetContained) {
        state.mostRecentlyFocusedNode = target;
      }
    } else {
      // escaped! pull it back in to where it just left
      e.stopImmediatePropagation();
      tryFocus(state.mostRecentlyFocusedNode || getInitialFocusNode());
    }
  }; // Hijack Tab events on the first and last focusable nodes of the trap,
  // in order to prevent focus from escaping. If it escapes for even a
  // moment it can end up scrolling the page and causing confusion so we
  // kind of need to capture the action at the keydown phase.


  var checkTab = function checkTab(e) {
    var target = getActualTarget(e);
    updateTabbableNodes();
    var destinationNode = null;

    if (state.tabbableGroups.length > 0) {
      // make sure the target is actually contained in a group
      // NOTE: the target may also be the container itself if it's focusable
      //  with tabIndex='-1' and was given initial focus
      var containerIndex = findContainerIndex(target);
      var containerGroup = containerIndex >= 0 ? state.containerGroups[containerIndex] : undefined;

      if (containerIndex < 0) {
        // target not found in any group: quite possible focus has escaped the trap,
        //  so bring it back in to...
        if (e.shiftKey) {
          // ...the last node in the last group
          destinationNode = state.tabbableGroups[state.tabbableGroups.length - 1].lastTabbableNode;
        } else {
          // ...the first node in the first group
          destinationNode = state.tabbableGroups[0].firstTabbableNode;
        }
      } else if (e.shiftKey) {
        // REVERSE
        // is the target the first tabbable node in a group?
        var startOfGroupIndex = findIndex(state.tabbableGroups, function (_ref2) {
          var firstTabbableNode = _ref2.firstTabbableNode;
          return target === firstTabbableNode;
        });

        if (startOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target, false))) {
          // an exception case where the target is either the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle shift+tab as if focus were on the container's
          //  first tabbable node, and go to the last tabbable node of the LAST group
          startOfGroupIndex = containerIndex;
        }

        if (startOfGroupIndex >= 0) {
          // YES: then shift+tab should go to the last tabbable node in the
          //  previous group (and wrap around to the last tabbable node of
          //  the LAST group if it's the first tabbable node of the FIRST group)
          var destinationGroupIndex = startOfGroupIndex === 0 ? state.tabbableGroups.length - 1 : startOfGroupIndex - 1;
          var destinationGroup = state.tabbableGroups[destinationGroupIndex];
          destinationNode = destinationGroup.lastTabbableNode;
        }
      } else {
        // FORWARD
        // is the target the last tabbable node in a group?
        var lastOfGroupIndex = findIndex(state.tabbableGroups, function (_ref3) {
          var lastTabbableNode = _ref3.lastTabbableNode;
          return target === lastTabbableNode;
        });

        if (lastOfGroupIndex < 0 && (containerGroup.container === target || isFocusable(target, config.tabbableOptions) && !isTabbable(target, config.tabbableOptions) && !containerGroup.nextTabbableNode(target))) {
          // an exception case where the target is the container itself, or
          //  a non-tabbable node that was given focus (i.e. tabindex is negative
          //  and user clicked on it or node was programmatically given focus)
          //  and is not followed by any other tabbable node, in which
          //  case, we should handle tab as if focus were on the container's
          //  last tabbable node, and go to the first tabbable node of the FIRST group
          lastOfGroupIndex = containerIndex;
        }

        if (lastOfGroupIndex >= 0) {
          // YES: then tab should go to the first tabbable node in the next
          //  group (and wrap around to the first tabbable node of the FIRST
          //  group if it's the last tabbable node of the LAST group)
          var _destinationGroupIndex = lastOfGroupIndex === state.tabbableGroups.length - 1 ? 0 : lastOfGroupIndex + 1;

          var _destinationGroup = state.tabbableGroups[_destinationGroupIndex];
          destinationNode = _destinationGroup.firstTabbableNode;
        }
      }
    } else {
      // NOTE: the fallbackFocus option does not support returning false to opt-out
      destinationNode = getNodeForOption('fallbackFocus');
    }

    if (destinationNode) {
      e.preventDefault();
      tryFocus(destinationNode);
    } // else, let the browser take care of [shift+]tab and move the focus

  };

  var checkKey = function checkKey(e) {
    if (isEscapeEvent(e) && valueOrHandler(config.escapeDeactivates, e) !== false) {
      e.preventDefault();
      trap.deactivate();
      return;
    }

    if (isTabEvent(e)) {
      checkTab(e);
      return;
    }
  };

  var checkClick = function checkClick(e) {
    var target = getActualTarget(e);

    if (findContainerIndex(target) >= 0) {
      return;
    }

    if (valueOrHandler(config.clickOutsideDeactivates, e)) {
      return;
    }

    if (valueOrHandler(config.allowOutsideClick, e)) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();
  }; //
  // EVENT LISTENERS
  //


  var addListeners = function addListeners() {
    if (!state.active) {
      return;
    } // There can be only one listening focus trap at a time


    activeFocusTraps.activateTrap(trap); // Delay ensures that the focused element doesn't capture the event
    // that caused the focus trap activation.

    state.delayInitialFocusTimer = config.delayInitialFocus ? delay(function () {
      tryFocus(getInitialFocusNode());
    }) : tryFocus(getInitialFocusNode());
    doc.addEventListener('focusin', checkFocusIn, true);
    doc.addEventListener('mousedown', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('touchstart', checkPointerDown, {
      capture: true,
      passive: false
    });
    doc.addEventListener('click', checkClick, {
      capture: true,
      passive: false
    });
    doc.addEventListener('keydown', checkKey, {
      capture: true,
      passive: false
    });
    return trap;
  };

  var removeListeners = function removeListeners() {
    if (!state.active) {
      return;
    }

    doc.removeEventListener('focusin', checkFocusIn, true);
    doc.removeEventListener('mousedown', checkPointerDown, true);
    doc.removeEventListener('touchstart', checkPointerDown, true);
    doc.removeEventListener('click', checkClick, true);
    doc.removeEventListener('keydown', checkKey, true);
    return trap;
  }; //
  // TRAP DEFINITION
  //


  trap = {
    get active() {
      return state.active;
    },

    get paused() {
      return state.paused;
    },

    activate: function activate(activateOptions) {
      if (state.active) {
        return this;
      }

      var onActivate = getOption(activateOptions, 'onActivate');
      var onPostActivate = getOption(activateOptions, 'onPostActivate');
      var checkCanFocusTrap = getOption(activateOptions, 'checkCanFocusTrap');

      if (!checkCanFocusTrap) {
        updateTabbableNodes();
      }

      state.active = true;
      state.paused = false;
      state.nodeFocusedBeforeActivation = doc.activeElement;

      if (onActivate) {
        onActivate();
      }

      var finishActivation = function finishActivation() {
        if (checkCanFocusTrap) {
          updateTabbableNodes();
        }

        addListeners();

        if (onPostActivate) {
          onPostActivate();
        }
      };

      if (checkCanFocusTrap) {
        checkCanFocusTrap(state.containers.concat()).then(finishActivation, finishActivation);
        return this;
      }

      finishActivation();
      return this;
    },
    deactivate: function deactivate(deactivateOptions) {
      if (!state.active) {
        return this;
      }

      var options = _objectSpread2({
        onDeactivate: config.onDeactivate,
        onPostDeactivate: config.onPostDeactivate,
        checkCanReturnFocus: config.checkCanReturnFocus
      }, deactivateOptions);

      clearTimeout(state.delayInitialFocusTimer); // noop if undefined

      state.delayInitialFocusTimer = undefined;
      removeListeners();
      state.active = false;
      state.paused = false;
      activeFocusTraps.deactivateTrap(trap);
      var onDeactivate = getOption(options, 'onDeactivate');
      var onPostDeactivate = getOption(options, 'onPostDeactivate');
      var checkCanReturnFocus = getOption(options, 'checkCanReturnFocus');
      var returnFocus = getOption(options, 'returnFocus', 'returnFocusOnDeactivate');

      if (onDeactivate) {
        onDeactivate();
      }

      var finishDeactivation = function finishDeactivation() {
        delay(function () {
          if (returnFocus) {
            tryFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation));
          }

          if (onPostDeactivate) {
            onPostDeactivate();
          }
        });
      };

      if (returnFocus && checkCanReturnFocus) {
        checkCanReturnFocus(getReturnFocusNode(state.nodeFocusedBeforeActivation)).then(finishDeactivation, finishDeactivation);
        return this;
      }

      finishDeactivation();
      return this;
    },
    pause: function pause() {
      if (state.paused || !state.active) {
        return this;
      }

      state.paused = true;
      removeListeners();
      return this;
    },
    unpause: function unpause() {
      if (!state.paused || !state.active) {
        return this;
      }

      state.paused = false;
      updateTabbableNodes();
      addListeners();
      return this;
    },
    updateContainerElements: function updateContainerElements(containerElements) {
      var elementsAsArray = [].concat(containerElements).filter(Boolean);
      state.containers = elementsAsArray.map(function (element) {
        return typeof element === 'string' ? doc.querySelector(element) : element;
      });

      if (state.active) {
        updateTabbableNodes();
      }

      return this;
    }
  }; // initialize container elements

  trap.updateContainerElements(elements);
  return trap;
};

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// Older browsers don't support event options, feature detect it.

// Adopted and modified solution from Bohdan Didukh (2017)
// https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi

var hasPassiveEvents = false;
if (typeof window !== 'undefined') {
  var passiveTestOptions = {
    get passive() {
      hasPassiveEvents = true;
      return undefined;
    }
  };
  window.addEventListener('testPassive', null, passiveTestOptions);
  window.removeEventListener('testPassive', null, passiveTestOptions);
}

var isIosDevice = typeof window !== 'undefined' && window.navigator && window.navigator.platform && (/iP(ad|hone|od)/.test(window.navigator.platform) || window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);


var locks = [];
var documentListenerAdded = false;
var initialClientY = -1;
var previousBodyOverflowSetting = void 0;
var previousBodyPaddingRight = void 0;

// returns true if `el` should be allowed to receive touchmove events.
var allowTouchMove = function allowTouchMove(el) {
  return locks.some(function (lock) {
    if (lock.options.allowTouchMove && lock.options.allowTouchMove(el)) {
      return true;
    }

    return false;
  });
};

var preventDefault$1 = function preventDefault(rawEvent) {
  var e = rawEvent || window.event;

  // For the case whereby consumers adds a touchmove event listener to document.
  // Recall that we do document.addEventListener('touchmove', preventDefault, { passive: false })
  // in disableBodyScroll - so if we provide this opportunity to allowTouchMove, then
  // the touchmove event on document will break.
  if (allowTouchMove(e.target)) {
    return true;
  }

  // Do not prevent if the event has more than one touch (usually meaning this is a multi touch gesture like pinch to zoom).
  if (e.touches.length > 1) return true;

  if (e.preventDefault) e.preventDefault();

  return false;
};

var setOverflowHidden = function setOverflowHidden(options) {
  // If previousBodyPaddingRight is already set, don't set it again.
  if (previousBodyPaddingRight === undefined) {
    var _reserveScrollBarGap = !!options && options.reserveScrollBarGap === true;
    var scrollBarGap = window.innerWidth - document.documentElement.clientWidth;

    if (_reserveScrollBarGap && scrollBarGap > 0) {
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.paddingRight = scrollBarGap + 'px';
    }
  }

  // If previousBodyOverflowSetting is already set, don't set it again.
  if (previousBodyOverflowSetting === undefined) {
    previousBodyOverflowSetting = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
};

var restoreOverflowSetting = function restoreOverflowSetting() {
  if (previousBodyPaddingRight !== undefined) {
    document.body.style.paddingRight = previousBodyPaddingRight;

    // Restore previousBodyPaddingRight to undefined so setOverflowHidden knows it
    // can be set again.
    previousBodyPaddingRight = undefined;
  }

  if (previousBodyOverflowSetting !== undefined) {
    document.body.style.overflow = previousBodyOverflowSetting;

    // Restore previousBodyOverflowSetting to undefined
    // so setOverflowHidden knows it can be set again.
    previousBodyOverflowSetting = undefined;
  }
};

// https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollHeight#Problems_and_solutions
var isTargetElementTotallyScrolled = function isTargetElementTotallyScrolled(targetElement) {
  return targetElement ? targetElement.scrollHeight - targetElement.scrollTop <= targetElement.clientHeight : false;
};

var handleScroll = function handleScroll(event, targetElement) {
  var clientY = event.targetTouches[0].clientY - initialClientY;

  if (allowTouchMove(event.target)) {
    return false;
  }

  if (targetElement && targetElement.scrollTop === 0 && clientY > 0) {
    // element is at the top of its scroll.
    return preventDefault$1(event);
  }

  if (isTargetElementTotallyScrolled(targetElement) && clientY < 0) {
    // element is at the bottom of its scroll.
    return preventDefault$1(event);
  }

  event.stopPropagation();
  return true;
};

var disableBodyScroll = function disableBodyScroll(targetElement, options) {
  // targetElement must be provided
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('disableBodyScroll unsuccessful - targetElement must be provided when calling disableBodyScroll on IOS devices.');
    return;
  }

  // disableBodyScroll must not have been called on this targetElement before
  if (locks.some(function (lock) {
    return lock.targetElement === targetElement;
  })) {
    return;
  }

  var lock = {
    targetElement: targetElement,
    options: options || {}
  };

  locks = [].concat(_toConsumableArray(locks), [lock]);

  if (isIosDevice) {
    targetElement.ontouchstart = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        initialClientY = event.targetTouches[0].clientY;
      }
    };
    targetElement.ontouchmove = function (event) {
      if (event.targetTouches.length === 1) {
        // detect single touch.
        handleScroll(event, targetElement);
      }
    };

    if (!documentListenerAdded) {
      document.addEventListener('touchmove', preventDefault$1, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = true;
    }
  } else {
    setOverflowHidden(options);
  }
};

var enableBodyScroll = function enableBodyScroll(targetElement) {
  if (!targetElement) {
    // eslint-disable-next-line no-console
    console.error('enableBodyScroll unsuccessful - targetElement must be provided when calling enableBodyScroll on IOS devices.');
    return;
  }

  locks = locks.filter(function (lock) {
    return lock.targetElement !== targetElement;
  });

  if (isIosDevice) {
    targetElement.ontouchstart = null;
    targetElement.ontouchmove = null;

    if (documentListenerAdded && locks.length === 0) {
      document.removeEventListener('touchmove', preventDefault$1, hasPassiveEvents ? { passive: false } : undefined);
      documentListenerAdded = false;
    }
  } else if (!locks.length) {
    restoreOverflowSetting();
  }
};

var n$1=function(n){if("object"!=typeof(t=n)||Array.isArray(t))throw "state should be an object";var t;},t$1=function(n,t,e,c){return (r=n,r.reduce(function(n,t,e){return n.indexOf(t)>-1?n:n.concat(t)},[])).reduce(function(n,e){return n.concat(t[e]||[])},[]).map(function(n){return n(e,c)});var r;},e$1=a(),c=e$1.on,r$1=e$1.emit,o$1=e$1.hydrate;function a(e){void 0===e&&(e={});var c={};return {getState:function(){return Object.assign({},e)},hydrate:function(r){return n$1(r),Object.assign(e,r),function(){var n=["*"].concat(Object.keys(r));t$1(n,c,e);}},on:function(n,t){return (n=[].concat(n)).map(function(n){return c[n]=(c[n]||[]).concat(t)}),function(){return n.map(function(n){return c[n].splice(c[n].indexOf(t),1)})}},emit:function(r,o,u){var a=("*"===r?[]:["*"]).concat(r);(o="function"==typeof o?o(e):o)&&(n$1(o),Object.assign(e,o),a=a.concat(Object.keys(o))),t$1(a,c,e,u);}}}

function wrapIframes () {
  let elements = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  elements.forEach(el => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("rte__iframe");
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    el.src = el.src;
  });
}

function wrapTables () {
  let elements = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  elements.forEach(el => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("rte__table-wrapper");
    wrapper.tabIndex = 0;
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
  });
}

const classes$I = {
  visible: "is-visible",
  active: "active",
  fixed: "is-fixed"
};
const selectors$1J = {
  closeBtn: "[data-modal-close]",
  wash: ".modal__wash",
  modalContent: ".modal__content"
};
const modal = node => {
  const focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const modalContent = n$2(selectors$1J.modalContent, node);
  const delegate = new Delegate(document);
  delegate.on("click", selectors$1J.wash, () => _close());
  const events = [e$2(n$2(selectors$1J.closeBtn, node), "click", e => {
    e.preventDefault();
    _close();
  }), e$2(node, "keydown", _ref => {
    let {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  }), c("modal:open", (state, _ref2) => {
    let {
      modalContent,
      narrow = false
    } = _ref2;
    l(node, "modal--narrow", narrow);
    _renderModalContent(modalContent);
    _open();
  })];
  const _renderModalContent = content => {
    const clonedContent = content.cloneNode(true);
    modalContent.innerHTML = "";
    modalContent.appendChild(clonedContent);
    wrapIframes(t$2("iframe", modalContent));
    wrapTables(t$2("table", modalContent));
  };
  const _open = () => {
    // Due to this component being shared between templates we have to
    // animate around it being fixed to the window
    u$1(node, classes$I.active);
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    focusTrap.activate();
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };
  const _close = () => {
    focusTrap.deactivate();
    i$1(node, classes$I.active);
    document.body.setAttribute("data-fluorescent-overlay-open", "false");
    enableBodyScroll(node);
    setTimeout(() => {
      modalContent.innerHTML = "";
    }, 300);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
};

var AnimateProductItem = (items => {
  const events = [];
  items.forEach(item => {
    const imageOne = n$2(".product-item__image--one", item);
    const imageTwo = n$2(".product-item__image--two", item);
    t$2(".product-item-options__list", item);
    events.push(e$2(item, "mouseenter", () => {
      enterItemAnimation(imageOne, imageTwo);
    }));
    events.push(e$2(item, "mouseleave", () => {
      leaveItemAnimation(imageOne, imageTwo);
    }));
  });
  function enterItemAnimation(imageOne, imageTwo, optionsElements) {
    if (imageTwo) {
      u$1(imageTwo, "active");
    }
  }
  function leaveItemAnimation(imageOne, imageTwo, optionsElements) {
    if (imageTwo) {
      i$1(imageTwo, "active");
    }
  }
  return {
    destroy() {
      events.forEach(unsubscribe => unsubscribe());
    }
  };
});

function getMediaQuery(querySize) {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--media-".concat(querySize));
  if (!value) {
    console.warn("Invalid querySize passed to getMediaQuery");
    return false;
  }
  return value;
}

var intersectionWatcher = (function (node) {
  let instant = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  const margin = window.matchMedia(getMediaQuery("above-720")).matches ? 200 : 100;
  let threshold = 0;
  if (!instant) {
    threshold = Math.min(margin / node.offsetHeight, 0.5);
  }
  const observer = new IntersectionObserver(_ref => {
    let [{
      isIntersecting: visible
    }] = _ref;
    if (visible) {
      u$1(node, "is-visible");
      observer.disconnect();
    }
  }, {
    threshold: threshold
  });
  observer.observe(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.disconnect();
    }
  };
});

/**
 * delayOffset takes an array of selectors and sets the `--delay-offset-multiplier` variable in the correct order
 * @param {node} element The section element
 * @param {items} array Array of animation items
 */
var delayOffset = (function (node, items) {
  let offsetStart = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  let delayOffset = offsetStart;
  items.forEach(selector => {
    const items = t$2(selector, node);
    items.forEach(item => {
      item.style.setProperty("--delay-offset-multiplier", delayOffset);
      delayOffset++;
    });
  });
});

var shouldAnimate = (node => {
  return a$1(node, "animation") && !a$1(document.documentElement, "prefers-reduced-motion");
});

const selectors$1I = {
  sectionBlockItems: ".section-blocks > *",
  image: ".image-with-text__image .image__img",
  imageSmall: ".image-with-text__small-image .image__img",
  imageCaption: ".image-with-text__image-caption"
};
var animateImageWithText = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1I.image, selectors$1I.imageSmall, selectors$1I.imageCaption]);
  delayOffset(node, [selectors$1I.sectionBlockItems], 6);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1H = {
  sectionBlockItems: ".section-blocks > *",
  image: ".image-with-text-split__image .image__img"
};
var animateImageWithTextSplit = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1H.image]);
  delayOffset(node, [selectors$1H.sectionBlockItems], 6);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1G = {
  content: ".testimonials__item-content > *",
  image: ".testimonials__item-product-image",
  imageCaption: ".testimonials__item-product-title",
  item: ".animation--item"
};
const classes$H = {
  imageRight: "testimonials__item--image-placement-right"
};
var animateTestimonials = (node => {
  const delayItems = [];

  // Create an array of selectors for the animation elements
  // in the order they should animate in
  if (a$1(node, classes$H.imageRight)) {
    delayItems.push(selectors$1G.content);
    delayItems.push(selectors$1G.image);
    delayItems.push(selectors$1G.imageCaption);
  } else {
    delayItems.push(selectors$1G.image);
    delayItems.push(selectors$1G.imageCaption);
    delayItems.push(selectors$1G.content);
  }

  // Add the animation delay offset variables
  delayOffset(node, delayItems, 2);
  delayOffset(node, [selectors$1G.item]);
});

const selectors$1F = {
  content: ".quote__item-inner > *"
};
var animateQuotes = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1F.content]);
});

const selectors$1E = {
  sectionBlockItems: ".animation--section-introduction > *",
  controls: ".animation--controls",
  items: ".animation--item"
};
var animateListSlider = (node => {
  const delayItems = [selectors$1E.sectionBlockItems, selectors$1E.controls, selectors$1E.items];

  // Add the animation delay offset variables
  delayOffset(node, delayItems);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1D = {
  introductionItems: ".section-introduction > *",
  media: ".complete-the-look__image-wrapper .image__img, .complete-the-look__image-wrapper .video",
  product: ".complete-the-look__product",
  products: ".complete-the-look__products"
};
const classes$G = {
  imageLeft: "complete-the-look--image-left"
};
var animateCompleteTheLook = (node => {
  const delayItems = [];
  delayItems.push(selectors$1D.introductionItems);

  // Create an array of selectors for the animation elements
  // in the order they should animate in
  if (a$1(node, classes$G.imageLeft) || window.matchMedia(getMediaQuery("below-720")).matches) {
    delayItems.push(selectors$1D.media);
    delayItems.push(selectors$1D.products);
    delayItems.push(selectors$1D.product);
  } else {
    delayItems.push(selectors$1D.products);
    delayItems.push(selectors$1D.product);
    delayItems.push(selectors$1D.media);
  }

  // Add the animation delay offset variables
  delayOffset(node, delayItems);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$1C = {
  introductionItems: ".section-introduction > *",
  image: ".shoppable-image__image-wrapper .image__img",
  hotspots: ".shoppable-item__hotspot-wrapper"
};
var animateShoppableImage = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1C.introductionItems, selectors$1C.image, selectors$1C.hotspots]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$1B = {
  introductionItems: ".section-introduction > *",
  carousel: ".shoppable-feature__secondary-content .shoppable-feature__carousel-outer",
  hotspots: ".shoppable-item__hotspot-wrapper",
  mobileDrawerItems: ".animation--shoppable-feature-mobile-drawer  .shoppable-feature__carousel-outer > *:not(.swiper-pagination)"
};
var animateShoppableFeature = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1B.introductionItems, selectors$1B.carousel], 1);
  delayOffset(node, [selectors$1B.hotspots], 1);
  // Add separate delay offsets for mobile drawer
  delayOffset(node, [selectors$1B.mobileDrawerItems], 1);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$1A = {
  textContent: ".image-hero-split-item__text-container-inner > *"
};
var animateImageHeroSplit = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1A.textContent], 1);
});

const selectors$1z = {
  textContent: ".image-hero__text-container-inner > *"
};
var animateImageHero = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1z.textContent], 3);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const classes$F = {
  animation: "animation--image-compare"
};
const selectors$1y = {
  introductionItems: ".animation--section-introduction > *",
  image: ".image_compare__image-wrapper .image__img",
  labels: ".image-compare__label-container",
  sliderLine: ".image-compare__slider-line",
  sliderButton: ".image-compare__slider-button"
};
var animateImageCompare = (node => {
  delayOffset(node, [selectors$1y.introductionItems, selectors$1y.image, selectors$1y.labels, selectors$1y.sliderLine, selectors$1y.sliderButton]);
  const margin = window.matchMedia(getMediaQuery("above-720")).matches ? 200 : 100;
  const threshold = Math.min(margin / node.offsetHeight, 0.5);
  const observer = new IntersectionObserver(_ref => {
    let [{
      isIntersecting: visible
    }] = _ref;
    if (visible) {
      u$1(node, "is-visible");

      // Enable slider controls by removing animation class after animation duration
      setTimeout(() => {
        i$1(node, classes$F.animation);
      }, 1200);
      observer.disconnect();
    }
  }, {
    threshold: threshold
  });
  observer.observe(node);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$1x = {
  textContent: ".video__text-container > *"
};
var animateVideo = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1x.textContent], 3);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1w = {
  textContent: ".video-hero__text-container > *"
};
var animateVideoHero = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1w.textContent], 3);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1v = {
  articleHeading: "\n    .article__image-container,\n    .article__header-inner > *\n  ",
  articleContent: ".article__content"
};
var animateArticle = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1v.articleHeading, selectors$1v.articleContent]);
  const articleHeading = t$2(selectors$1v.articleHeading, node);
  const articleContent = n$2(selectors$1v.articleContent, node);
  const observers = articleHeading.map(item => intersectionWatcher(item));
  observers.push(intersectionWatcher(articleContent));
  return {
    destroy() {
      observers.forEach(observer => observer.destroy());
    }
  };
});

const selectors$1u = {
  image: ".collection-banner__image-container",
  content: ".collection-banner__text-container-inner > *"
};
var animateCollectionBanner = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1u.image, selectors$1u.content]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1t = {
  stickyAnnouncement: ".announcement-bar:not([data-enable-sticky-announcement-bar='never'])",
  stickyHeader: ".header[data-enable-sticky-header='true']",
  divider: ".collection__divider",
  partial: "[data-partial]",
  filterBar: "[data-filter-bar]",
  mobileFilterBar: "[data-mobile-filters]",
  productItems: ".animation--item:not(.animation--item-revealed)"
};
const classes$E = {
  hideProducts: "animation--collection-products-hide",
  itemRevealed: "animation--item-revealed",
  stickyFilterBar: "filter-bar--sticky"
};
var animateCollection = (node => {
  const stickyAnnouncement = n$2(selectors$1t.stickyAnnouncement, document);
  const stickyHeader = n$2(selectors$1t.stickyHeader, document);
  const divider = n$2(selectors$1t.divider, document);
  const partial = n$2(selectors$1t.partial, node);
  const filterbarEl = n$2(selectors$1t.filterBar, node);
  const mobileFilterBarEl = n$2(selectors$1t.mobileFilterBar, node);
  let filterbarObserver = null;
  let mobileFilterBarObserver = null;
  if (filterbarEl) {
    filterbarObserver = intersectionWatcher(filterbarEl, true);
  }
  if (mobileFilterBarEl) {
    mobileFilterBarObserver = intersectionWatcher(mobileFilterBarEl, true);
  }
  setupProductItem();
  function setupProductItem() {
    let productItems = t$2(selectors$1t.productItems, node);
    delayOffset(node, [selectors$1t.productItems]);
    setTimeout(() => {
      u$1(productItems, classes$E.itemRevealed);
    }, 0);
  }

  // Scroll to top of collection grid after applying filters
  // to show the newly filtered list of products
  function _scrollIntoView() {
    const dividerHeight = divider ? 1 : 0;
    let stickyAnnouncementHeight = 0;
    if (stickyAnnouncement) {
      if (window.matchMedia(getMediaQuery("below-960")).matches && stickyAnnouncement.getAttribute("data-enable-sticky-announcement-bar").includes("mobile") || stickyAnnouncement.getAttribute("data-enable-sticky-announcement-bar").includes("desktop")) {
        stickyAnnouncementHeight = stickyAnnouncement.getBoundingClientRect().height;
      }
    }
    const stickyHeaderHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
    const y = node.getBoundingClientRect().top + window.scrollY + dividerHeight - stickyAnnouncementHeight - stickyHeaderHeight;
    window.scrollTo({
      top: y,
      behavior: "smooth"
    });
  }
  function updateContents() {
    setupProductItem();
    i$1(partial, classes$E.hideProducts);
    _scrollIntoView();
  }
  function infiniteScrollReveal() {
    setupProductItem();
  }
  return {
    updateContents,
    infiniteScrollReveal,
    destroy() {
      var _filterbarObserver, _mobileFilterBarObser;
      (_filterbarObserver = filterbarObserver) === null || _filterbarObserver === void 0 || _filterbarObserver.destroy();
      (_mobileFilterBarObser = mobileFilterBarObserver) === null || _mobileFilterBarObser === void 0 || _mobileFilterBarObser.destroy();
    }
  };
});

const selectors$1s = {
  saleAmount: ".animation--sale-amount",
  sectionBlockItems: ".animation--section-blocks > *",
  saleItems: ".sale-promotion .sale-promotion__type,\n  .sale-promotion .sale-promotion__unit-currency,\n  .sale-promotion .sale-promotion__unit-percent,\n  .sale-promotion .sale-promotion__unit-off,\n  .sale-promotion .sale-promotion__amount,\n  .sale-promotion .sale-promotion__per-month,\n  .sale-promotion .sale-promotion__per-year,\n  .sale-promotion .sale-promotion__terms,\n  .sale-promotion .sales-banner__button"
};
var animateSalesBanner = (node => {
  const leftColumnDelayItems = [selectors$1s.saleAmount, selectors$1s.saleItems];
  const rightColumnDelayItems = [selectors$1s.sectionBlockItems];

  // Add the animation delay offset variables
  delayOffset(node, leftColumnDelayItems);
  delayOffset(node, rightColumnDelayItems, 1);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1r = {
  sectionBlockItems: ".section-blocks > *"
};
var animateCountdownBanner = (node => {
  const observer = intersectionWatcher(node);
  delayOffset(node, [selectors$1r.sectionBlockItems]);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1q = {
  items: "\n  .sales-banner__bar-item--heading,\n  .sales-banner__bar-text,\n  .sales-banner__button,\n  .countdown-banner__bar-item--heading,\n  .countdown-banner__bar-item--timer,\n  .countdown-banner__bar-text,\n  .countdown-banner__button"
};
var animateCountdownBar = (node => {
  const observer = intersectionWatcher(node);
  delayOffset(node, [selectors$1q.items]);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

var animatePromotionBar = (node => {
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1p = {
  headerItems: ".animation--blog-header > *",
  articleItem: ".article-item",
  pagination: ".blog__pagination"
};
var animateBlog = (node => {
  delayOffset(node, [selectors$1p.headerItems, selectors$1p.articleItem, selectors$1p.pagination]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1o = {
  flyouts: "[data-filter-modal]",
  animationFilterDrawerItem: ".animation--filter-drawer-item"
};
const classes$D = {
  animationRevealed: "animation--filter-bar-revealed",
  animationFilterDrawerItem: "animation--filter-drawer-item"
};
var animateFilterDrawer = (node => {
  const flyouts = t$2(selectors$1o.flyouts, node);
  flyouts.forEach(_setupItemOffsets);

  // Set the position offset on each time to be animated
  function _setupItemOffsets(flyout) {
    delayOffset(flyout, [selectors$1o.animationFilterDrawerItem]);
  }

  // Trigger the reveal animation when the drawer is opened
  function open(flyout) {
    u$1(flyout, classes$D.animationRevealed);
  }

  // Reset the reveal animation when the drawer is closed
  function close(flyouts) {
    i$1(flyouts, classes$D.animationRevealed);
  }
  return {
    open,
    close
  };
});

const selectors$1n = {
  sidebar: ".filter-sidebar-inner",
  sidebarItem: ".animation--filter-drawer-item"
};
const classes$C = {
  animationRevealed: "animation--filter-sidebar-revealed"
};
var animateFilterSidebar = (node => {
  const sidebar = n$2(selectors$1n.sidebar, node);

  // Set the position offset on each time to be animated
  delayOffset(sidebar, [selectors$1n.sidebarItem]);

  // Trigger the reveal animation when the drawer is opened
  function open(sidebar) {
    u$1(sidebar, classes$C.animationRevealed);
  }

  // Reset the reveal animation when the drawer is closed
  function close(sidebar) {
    i$1(sidebar, classes$C.animationRevealed);
  }
  return {
    open,
    close
  };
});

const selectors$1m = {
  animationItem: ".animation--drawer-menu-item"
};
const classes$B = {
  animationRevealed: "animation--drawer-menu-revealed"
};
var animateDrawerMenu = (node => {
  delayOffset(node, [selectors$1m.animationItem]);

  // Trigger the reveal animation when the drawer is opened
  function open() {
    if (shouldAnimate(node)) {
      u$1(node, classes$B.animationRevealed);
    }
  }

  // Trigger the reveal animation when the drawer is opened
  function close() {
    if (shouldAnimate(node)) {
      i$1(node, classes$B.animationRevealed);
    }
  }
  return {
    open,
    close
  };
});

const selectors$1l = {
  animationItem: ".animation--quick-cart-items > *, .animation--quick-cart-footer"
};
const classes$A = {
  animationRevealed: "animation--quick-cart-revealed"
};
var animateQuickCart = (node => {
  setup();

  // Trigger the reveal animation when the drawer is opened
  function open() {
    u$1(node, classes$A.animationRevealed);
  }

  // Reset the reveal animation when the drawer is closed
  function close() {
    i$1(node, classes$A.animationRevealed);
  }

  // Setup delay offsets
  function setup() {
    delayOffset(node, [selectors$1l.animationItem]);
  }
  return {
    open,
    close,
    setup
  };
});

const selectors$1k = {
  animationItems: ".animation--quick-view-items > *"
};
const classes$z = {
  animationRevealed: "animation--quick-view-revealed"
};
var animateQuickView = (node => {
  function animate() {
    // Add the animation delay offset variables
    delayOffset(node, [selectors$1k.animationItems]);

    // Trigger the reveal animation when the quick view is opened.
    // We can't use the `.is-visible` class added in `quick-view-modal.js`
    // because it can be added before the content is fetched.
    setTimeout(() => {
      u$1(node, classes$z.animationRevealed);
    }, 0);
  }
  function reset() {
    i$1(node, classes$z.animationRevealed);
  }
  return {
    animate,
    reset
  };
});

const selectors$1j = {
  columns: ".meganav__list-parent > li",
  image: ".meganav__promo-image .image__img",
  overlay: ".meganav__secondary-promo-overlay",
  promoItems: ".meganav__secondary-promo-text > *",
  hasPromo: "meganav--has-promo",
  promoLeft: "meganav--promo-position-left"
};
var animateMeganav = (node => {
  const delayItems = [];
  const columnItems = t$2(selectors$1j.columns, node);
  if (a$1(node, selectors$1j.hasPromo)) {
    delayOffset(node, [selectors$1j.image, selectors$1j.overlay, selectors$1j.promoItems]);
    if (a$1(node, selectors$1j.promoLeft)) {
      // Set columnItem initial delay to i + 1 of previously delayed
      assignColumnDelays(columnItems, 4);
    } else {
      assignColumnDelays(columnItems);
    }
  } else {
    assignColumnDelays(columnItems);
  }

  // Add the animation delay offset variables
  delayOffset(node, delayItems);
  function assignColumnDelays(items) {
    let delayMultiplier = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    let columnOffset;
    items.forEach((item, i) => {
      const leftOffset = item.getBoundingClientRect ? item.getBoundingClientRect().left : item.offsetLeft;
      if (i === 0) columnOffset = leftOffset;
      if (columnOffset != leftOffset) {
        columnOffset = leftOffset;
        delayMultiplier++;
      }
      item.style.setProperty("--delay-offset-multiplier", delayMultiplier);
    });
  }
});

const selectors$1i = {
  heading: ".list-collections__heading",
  productItems: ".animation--item"
};
var animateListCollections = (node => {
  delayOffset(node, [selectors$1i.heading, selectors$1i.productItems]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$1h = {
  gridItems: ".grid-item"
};
var animateGrid = (node => {
  delayOffset(node, [selectors$1h.gridItems]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$1g = {
  animationItems: ".animation--purchase-confirmation-item",
  animationFooterItems: ".animation--purchase-confirmation-footer-item"
};
const classes$y = {
  animationRevealed: "animation--purchase-confirmation-revealed"
};
var animatePurchaseConfirmation = (node => {
  function animate() {
    // Add the animation delay offset variables
    delayOffset(node, [selectors$1g.animationItems]);
    delayOffset(node, [selectors$1g.animationFooterItems]);

    // Trigger the reveal animation when the quick view is opened.
    setTimeout(() => {
      u$1(node, classes$y.animationRevealed);
    }, 0);
  }
  function reset() {
    i$1(node, classes$y.animationRevealed);
  }
  return {
    animate,
    reset
  };
});

const selectors$1f = {
  pageItems: ".page-section__inner > *"
};
var animatePage = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1f.pageItems]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer.forEach(observer => observer.destroy());
    }
  };
});

const selectors$1e = {
  items: ".collapsible-row-list__inner > *"
};
var animateCollapsibleRowList = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$1e.items]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1d = {
  items: ".animation--section-blocks > *"
};
var animateRichText = (node => {
  delayOffset(node, [selectors$1d.items]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1c = {
  headerItems: ".animation--section-introduction > *",
  articleItem: ".article-item"
};
var animateBlogPosts = (node => {
  delayOffset(node, [selectors$1c.headerItems, selectors$1c.articleItem]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1b = {
  intro: ".animation--section-introduction > *",
  items: ".animation--item"
};
var animateFeaturedCollectionGrid = (node => {
  delayOffset(node, [selectors$1b.intro, selectors$1b.items]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$1a = {
  productItems: ".animation--item",
  introductionItems: ".animation--section-introduction > *"
};
var animateCollectionListGrid = (node => {
  delayOffset(node, [selectors$1a.introductionItems, selectors$1a.productItems]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$19 = {
  animationItems: ".animation--store-availability-drawer-items > *"
};
const classes$x = {
  animationRevealed: "animation--store-availability-drawer-revealed"
};
var animateStoreAvailabilityDrawer = (node => {
  function animate() {
    // Set the position offset on each time to be animated
    const items = t$2(selectors$19.animationItems, node);
    items.forEach((item, i) => {
      item.style.setProperty("--position-offset-multiplier", i);
    });

    // Trigger the reveal animation when the quick view is opened.
    // We can't use the `.is-visible` class added in `quick-view-modal.js`
    // because it can be added before the content is fetched.
    setTimeout(() => {
      u$1(node, classes$x.animationRevealed);
    }, 0);
  }
  function reset() {
    i$1(node, classes$x.animationRevealed);
  }
  return {
    animate,
    reset
  };
});

const selectors$18 = {
  media: ".animation--product-media"
};
var animateProduct = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$18.media]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$17 = {
  headerItems: ".animation--section-introduction > *",
  animationItem: ".animation--item"
};
var animateContactForm = (node => {
  delayOffset(node, [selectors$17.headerItems, selectors$17.animationItem]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$16 = {
  divider: ".search__divider",
  partial: "[data-partial]",
  filterBar: "[data-filter-bar]",
  mobileFilterBar: "[data-mobile-filters]",
  productItems: ".animation--item:not(.animation--item-revealed)",
  stickyAnnouncement: ".announcement-bar:not([data-enable-sticky-announcement-bar='never'])",
  stickyHeader: ".header[data-enable-sticky-header='true']"
};
const classes$w = {
  hideProducts: "animation--search-products-hide",
  itemRevealed: "animation--item-revealed"
};
var animateSearch = (node => {
  const stickyAnnouncement = n$2(selectors$16.stickyAnnouncement);
  const stickyHeader = n$2(selectors$16.stickyHeader, document);
  const partial = n$2(selectors$16.partial, node);
  const filterbarEl = n$2(selectors$16.filterBar, node);
  const mobileFilterBarEl = n$2(selectors$16.mobileFilterBar, node);
  let filterbarObserver = null;
  let mobileFilterBarObserver = null;
  if (filterbarEl) {
    filterbarObserver = intersectionWatcher(filterbarEl, true);
  }
  if (mobileFilterBarEl) {
    mobileFilterBarObserver = intersectionWatcher(mobileFilterBarEl, true);
  }
  _setupProductItem();
  function _setupProductItem() {
    let productItems = t$2(selectors$16.productItems, node);
    delayOffset(node, [selectors$16.productItems]);
    setTimeout(() => {
      u$1(productItems, classes$w.itemRevealed);
    }, 0);
  }

  // Scroll to top of search grid after applying filters
  // to show the newly filtered list of products
  function _scrollIntoView() {
    const divider = n$2(selectors$16.divider, node);
    const dividerHeight = divider ? 1 : 0;
    let stickyAnnouncementHeight = 0;
    const stickyHeaderHeight = stickyHeader ? stickyHeader.getBoundingClientRect().height : 0;
    if (stickyAnnouncement) {
      if (window.matchMedia(getMediaQuery("below-960")).matches && stickyAnnouncement.getAttribute("data-enable-sticky-announcement-bar").includes("mobile") || stickyAnnouncement.getAttribute("data-enable-sticky-announcement-bar").includes("desktop")) {
        stickyAnnouncementHeight = stickyAnnouncement.getBoundingClientRect().height;
      }
    }
    const y = partial.getBoundingClientRect().top + window.scrollY + dividerHeight - stickyAnnouncementHeight - stickyHeaderHeight - filterbarEl.getBoundingClientRect().height;
    window.scrollTo({
      top: y,
      behavior: "smooth"
    });
  }
  function updateContents() {
    _setupProductItem();
    // Remove the fade out class
    i$1(partial, classes$w.hideProducts);
    _scrollIntoView();
  }
  function infiniteScrollReveal() {
    _setupProductItem();
  }
  return {
    updateContents,
    infiniteScrollReveal,
    destroy() {
      var _filterbarObserver, _mobileFilterBarObser;
      (_filterbarObserver = filterbarObserver) === null || _filterbarObserver === void 0 || _filterbarObserver.destroy();
      (_mobileFilterBarObser = mobileFilterBarObserver) === null || _mobileFilterBarObser === void 0 || _mobileFilterBarObser.destroy();
    }
  };
});

const selectors$15 = {
  content: ".animation--section-blocks > *"
};
var animateSearchBanner = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$15.content]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$14 = {
  headerItems: ".animation--section-introduction > *",
  columnItems: ".multi-column__grid-item"
};
var animateMultiColumn = (node => {
  delayOffset(node, [selectors$14.headerItems, selectors$14.columnItems]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer.destroy();
    }
  };
});

const selectors$13 = {
  textContent: ".password__text-container-inner > *"
};
var animatePassword = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$13.textContent], 3);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$12 = {
  animationItem: ".animation--popup-item"
};
const classes$v = {
  animationRevealed: "animation--popup-revealed"
};
var animatePopup = (node => {
  delayOffset(node, [selectors$12.animationItem]);

  // Trigger the reveal animation when the drawer is opened
  function open() {
    if (shouldAnimate(node)) {
      u$1(node, classes$v.animationRevealed);
    }
  }

  // Trigger the reveal animation when the drawer is opened
  function close() {
    if (shouldAnimate(node)) {
      i$1(node, classes$v.animationRevealed);
    }
  }
  return {
    open,
    close
  };
});

const selectors$11 = {
  items: ".animation--section-blocks > *"
};
var animateNewsletter = (node => {
  delayOffset(node, [selectors$11.items]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$10 = {
  items: ".animation--section-blocks > *"
};
var animateNewsletterCompact = (node => {
  delayOffset(node, [selectors$10.items]);
  const observer = intersectionWatcher(node, true);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$$ = {
  headerItems: ".animation--section-introduction > *",
  eventItems: ".event-item"
};
var animateEvents = (node => {
  delayOffset(node, [selectors$$.headerItems]);
  const observer = intersectionWatcher(node, true);
  function animateEventItems() {
    delayOffset(node, [selectors$$.eventItems]);
    setTimeout(() => {
      u$1(node, "animate-event-items");
    }, 50);
  }
  return {
    animateEventItems,
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$_ = {
  giantHeading: ".animation--giant-heading",
  sectionBlockItems: ".animation--section-blocks > *"
};
var animatePromoBanner = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$_.giantHeading, selectors$_.sectionBlockItems]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

var animateScrollingContent = (node => {
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$Z = {
  controls: ".product-tabs__tab-buttons",
  items: ".product-tabs__tab-list-wrapper",
  accordionItems: ".accordion"
};
var animateProductTabs = (node => {
  // Add the animation delay offset variables
  delayOffset(node, [selectors$Z.controls, selectors$Z.items]);
  delayOffset(node, [selectors$Z.accordionItems]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

const selectors$Y = {
  intro: ".animation--section-introduction > *",
  items: ".animation--item"
};
var animateApps = (node => {
  delayOffset(node, [selectors$Y.intro, selectors$Y.items]);
  const observer = intersectionWatcher(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.destroy();
    }
  };
});

var videoIntersectionWatcher = (function (node) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    instant: false,
    callback: false
  };
  const margin = window.matchMedia(getMediaQuery("above-720")).matches ? 200 : 100;
  let threshold = 0;
  if (!options.instant) {
    threshold = Math.min(margin / node.offsetHeight, 0.5);
  }
  const observer = new IntersectionObserver(_ref => {
    let [{
      isIntersecting: visible
    }] = _ref;
    if (options.callback) {
      options.callback(visible);
    } else if (visible) {
      u$1(node, "is-visible");
      observer.disconnect();
    }
  }, {
    threshold: threshold
  });
  observer.observe(node);
  return {
    destroy() {
      observer === null || observer === void 0 || observer.disconnect();
    }
  };
});

function makeRequest(method, url) {
  return new Promise(function (resolve, reject) {
    let xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(this.status));
      }
    };
    xhr.onerror = function () {
      reject(new Error(this.status));
    };
    xhr.send();
  });
}

const classes$u = {
  active: "active"
};
const selectors$X = {
  drawerTrigger: "[data-store-availability-drawer-trigger]",
  closeBtn: "[data-store-availability-close]",
  productTitle: "[data-store-availability-product-title]",
  variantTitle: "[data-store-availability-variant-title]",
  storeListContainer: "[data-store-list-container]",
  storeListContent: "[data-store-availability-list-content]",
  wash: "[data-store-availability-drawer-wash]",
  parentWrapper: "[data-store-availability-container]"
};
const storeAvailabilityDrawer = node => {
  var focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const wash = n$2(selectors$X.wash, node.parentNode);
  const productTitleContainer = n$2(selectors$X.productTitle);
  const variantTitleContainer = n$2(selectors$X.variantTitle);
  const storeListContainer = n$2(selectors$X.storeListContainer, node);
  let storeAvailabilityDrawerAnimate = null;
  if (shouldAnimate(node)) {
    storeAvailabilityDrawerAnimate = animateStoreAvailabilityDrawer(node);
  }
  const events = [e$2([n$2(selectors$X.closeBtn, node), wash], "click", e => {
    e.preventDefault();
    _close();
  }), e$2(node, "keydown", _ref => {
    let {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  })];
  const _handleClick = target => {
    const parentContainer = target.closest(selectors$X.parentWrapper);
    const {
      baseUrl,
      variantId,
      productTitle,
      variantTitle
    } = parentContainer.dataset;
    const variantSectionUrl = "".concat(baseUrl, "/variants/").concat(variantId, "/?section_id=store-availability");
    makeRequest("GET", variantSectionUrl).then(storeAvailabilityHTML => {
      let container = document.createElement("div");
      container.innerHTML = storeAvailabilityHTML;
      productTitleContainer.innerText = productTitle;
      // Shopify returns string null on variant titles for products without varians
      variantTitleContainer.innerText = variantTitle === "null" ? "" : variantTitle;
      const storeList = n$2(selectors$X.storeListContent, container);
      storeListContainer.innerHTML = "";
      storeListContainer.appendChild(storeList);
    }).then(_open);
  };
  const _open = () => {
    u$1(node, classes$u.active);
    if (shouldAnimate(node)) {
      storeAvailabilityDrawerAnimate.animate();
    }
    node.setAttribute("aria-hidden", "false");
    focusTrap.activate();
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };
  const _close = () => {
    focusTrap.deactivate();
    i$1(node, classes$u.active);
    node.setAttribute("aria-hidden", "true");
    setTimeout(() => {
      if (shouldAnimate(node)) {
        storeAvailabilityDrawerAnimate.reset();
      }
      document.body.setAttribute("data-fluorescent-overlay-open", "false");
      enableBodyScroll(node);
    }, 500);
  };
  const delegate = new Delegate(document.body);
  delegate.on("click", selectors$X.drawerTrigger, (_, target) => _handleClick(target));
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
};

const {
  strings: {
    accessibility: strings$7
  }
} = window.theme;
const handleTab = () => {
  let tabHandler = null;
  const formElments = ["INPUT", "TEXTAREA", "SELECT"];
  // Determine if the user is a mouse or keyboard user
  function handleFirstTab(e) {
    if (e.keyCode === 9 && !formElments.includes(document.activeElement.tagName)) {
      document.body.classList.add("user-is-tabbing");
      tabHandler();
      tabHandler = e$2(window, "mousedown", handleMouseDownOnce);
    }
  }
  function handleMouseDownOnce() {
    document.body.classList.remove("user-is-tabbing");
    tabHandler();
    tabHandler = e$2(window, "keydown", handleFirstTab);
  }
  tabHandler = e$2(window, "keydown", handleFirstTab);
};
const focusFormStatus = node => {
  const formStatus = n$2(".form-status", node);
  if (!formStatus) return;
  const focusElement = n$2("[data-form-status]", formStatus);
  if (!focusElement) return;
  focusElement.focus();
};
const prefersReducedMotion = () => {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
function backgroundVideoHandler(container) {
  const pause = n$2(".video-pause", container);
  const video = container.getElementsByTagName("VIDEO")[0];
  if (!pause || !video) return;
  const pauseVideo = () => {
    video.pause();
    pause.innerText = strings$7.play_video;
  };
  const playVideo = () => {
    video.play();
    pause.innerText = strings$7.pause_video;
  };
  if (prefersReducedMotion()) {
    pauseVideo();
  }
  const pauseListener = e$2(pause, "click", e => {
    e.preventDefault();
    if (video.paused) {
      playVideo();
    } else {
      pauseVideo();
    }
  });
  return () => pauseListener();
}

const classes$t = {
  hidden: "hidden"
};
var sectionClasses = (() => {
  function adjustClasses() {
    const sections = t$2(".main .shopify-section");
    sections.forEach(section => {
      const {
        firstElementChild: child
      } = section;

      // Specific to recommended hidden products
      if (child && child.classList.contains(classes$t.hidden)) {
        u$1(section, classes$t.hidden);
      }
    });
  }
  adjustClasses();
  e$2(document, "shopify:section:load", adjustClasses);
});

const dispatchCustomEvent = function (eventName) {
  let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const detail = {
    detail: data
  };
  const event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

/**
 * Returns a product JSON object when passed a product URL
 * @param {*} url
 */

/**
 * Find a match in the project JSON (using a ID number) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Number} value Accepts Number (e.g. 6908023078973)
 * @returns {Object} The variant object once a match has been successful. Otherwise null will be return
 */
function getVariantFromId(product, value) {
  _validateProductStructure(product);

  if (typeof value !== 'number') {
    throw new TypeError(value + ' is not a Number.');
  }

  var result = product.variants.filter(function(variant) {
    return variant.id === value;
  });

  return result[0] || null;
}

/**
 * Convert the Object (with 'name' and 'value' keys) into an Array of values, then find a match & return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Object} collection Object with 'name' and 'value' keys (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromSerializedArray(product, collection) {
  _validateProductStructure(product);

  // If value is an array of options
  var optionArray = _createOptionArrayFromOptionCollection(product, collection);
  return getVariantFromOptionArray(product, optionArray);
}

/**
 * Find a match in the project JSON (using Array with option values) and return the variant (as an Object)
 * @param {Object} product Product JSON object
 * @param {Array} options List of submitted values (e.g. ['36', 'Black'])
 * @returns {Object || null} The variant object once a match has been successful. Otherwise null will be returned
 */
function getVariantFromOptionArray(product, options) {
  _validateProductStructure(product);
  _validateOptionsArray(options);

  var result = product.variants.filter(function(variant) {
    return options.every(function(option, index) {
      return variant.options[index] === option;
    });
  });

  return result[0] || null;
}

/**
 * Creates an array of selected options from the object
 * Loops through the project.options and check if the "option name" exist (product.options.name) and matches the target
 * @param {Object} product Product JSON object
 * @param {Array} collection Array of object (e.g. [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }])
 * @returns {Array} The result of the matched values. (e.g. ['36', 'Black'])
 */
function _createOptionArrayFromOptionCollection(product, collection) {
  _validateProductStructure(product);
  _validateSerializedArray(collection);

  var optionArray = [];

  collection.forEach(function(option) {
    for (var i = 0; i < product.options.length; i++) {
      if (product.options[i].name.toLowerCase() === option.name.toLowerCase()) {
        optionArray[i] = option.value;
        break;
      }
    }
  });

  return optionArray;
}

/**
 * Check if the product data is a valid JS object
 * Error will be thrown if type is invalid
 * @param {object} product Product JSON object
 */
function _validateProductStructure(product) {
  if (typeof product !== 'object') {
    throw new TypeError(product + ' is not an object.');
  }

  if (Object.keys(product).length === 0 && product.constructor === Object) {
    throw new Error(product + ' is empty.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted like jQuery's serializeArray()
 * @param {Array} collection Array of object [{ name: "Size", value: "36" }, { name: "Color", value: "Black" }]
 */
function _validateSerializedArray(collection) {
  if (!Array.isArray(collection)) {
    throw new TypeError(collection + ' is not an array.');
  }

  if (collection.length === 0) {
    return [];
  }

  if (collection[0].hasOwnProperty('name')) {
    if (typeof collection[0].name !== 'string') {
      throw new TypeError(
        'Invalid value type passed for name of option ' +
          collection[0].name +
          '. Value should be string.'
      );
    }
  } else {
    throw new Error(collection[0] + 'does not contain name key.');
  }
}

/**
 * Validate the structure of the array
 * It must be formatted as list of values
 * @param {Array} collection Array of object (e.g. ['36', 'Black'])
 */
function _validateOptionsArray(options) {
  if (Array.isArray(options) && typeof options[0] === 'object') {
    throw new Error(options + 'is not a valid array of options.');
  }
}

// Public Methods
// -----------------------------------------------------------------------------

/**
 * Returns a URL with a variant ID query parameter. Useful for updating window.history
 * with a new URL based on the currently select product variant.
 * @param {string} url - The URL you wish to append the variant ID to
 * @param {number} id  - The variant ID you wish to append to the URL
 * @returns {string} - The new url which includes the variant ID query parameter
 */

function getUrlWithVariant(url, id) {
  if (/variant=/.test(url)) {
    return url.replace(/(variant=)[^&]+/, '$1' + id);
  } else if (/\?/.test(url)) {
    return url.concat('&variant=').concat(id);
  }

  return url.concat('?variant=').concat(id);
}

const selectors$W = {
  sentinal: ".scroll-sentinal",
  scrollButtons: ".scroll-button",
  scrollViewport: "[data-scroll-container-viewport]"
};
const scrollContainer = node => {
  const sentinals = t$2(selectors$W.sentinal, node);
  const buttons = t$2(selectors$W.scrollButtons, node);
  const {
    axis,
    startAtEnd
  } = node.dataset;
  const scrollAttribute = axis == "vertical" ? "scrollTop" : "scrollLeft";
  const scrollerViewport = n$2(selectors$W.scrollViewport, node);
  window.addEventListener("load", () => {
    u$1(node, "scroll-container-initialized");
    if (startAtEnd === "true") {
      _startAtEnd();
    }
  }, {
    once: true
  });
  const events = [e$2(buttons, "click", e => {
    const button = e.currentTarget;
    const scrollAttribute = axis == "vertical" ? "scrollTop" : "scrollLeft";
    const scrollOffset = 100;
    if (button.dataset.position === "start") {
      if (scrollerViewport[scrollAttribute] < scrollOffset * 1.5) {
        scrollerViewport[scrollAttribute] = 0;
      } else {
        scrollerViewport[scrollAttribute] -= scrollOffset;
      }
    } else {
      scrollerViewport[scrollAttribute] += scrollOffset;
    }
  })];
  const ioOptions = {
    root: scrollerViewport
  };
  const intersectionObserver = new IntersectionObserver(function (entries) {
    entries.forEach(entry => {
      const position = entry.target.dataset.position;
      const visible = entry.isIntersecting;
      node.setAttribute("data-at-".concat(position), visible ? "true" : "false");
    });
  }, ioOptions);
  sentinals.forEach(sentinal => {
    intersectionObserver.observe(sentinal);
  });
  const scrollTo = element => {
    const scrollDistance = axis == "vertical" ? element.offsetTop - element.getBoundingClientRect().height : element.offsetLeft - element.getBoundingClientRect().width;
    scrollerViewport[scrollAttribute] = scrollDistance;
  };
  const scrollToSelector = selector => {
    const element = node.querySelector(selector);
    if (!element) return;
    scrollTo(element);
  };
  const unload = () => {
    sentinals.forEach(sentinal => {
      intersectionObserver.unobserve(sentinal);
    });
    events.forEach(unsubscribe => unsubscribe());
  };
  function _startAtEnd() {
    const scrollAttribute = axis == "vertical" ? "scrollTop" : "scrollLeft";
    const scrollDirection = axis == "vertical" ? "scrollHeight" : "scrollWidth";
    scrollerViewport[scrollAttribute] = scrollerViewport[scrollDirection] * 2;
    node.dataset.startAtEnd = false;
  }
  return {
    scrollTo,
    scrollToSelector,
    unload
  };
};

var n,e,i,o,t,r,f,d,p,u=[];function w(n,a){return e=window.pageXOffset,o=window.pageYOffset,r=window.innerHeight,d=window.innerWidth,void 0===i&&(i=e),void 0===t&&(t=o),void 0===p&&(p=d),void 0===f&&(f=r),(a||o!==t||e!==i||r!==f||d!==p)&&(!function(n){for(var w=0;w<u.length;w++)u[w]({x:e,y:o,px:i,py:t,vh:r,pvh:f,vw:d,pvw:p},n);}(n),i=e,t=o,f=r,p=d),requestAnimationFrame(w)}function srraf(e){return u.indexOf(e)<0&&u.push(e),n=n||w(performance.now()),{update:function(){return w(performance.now(),!0),this},destroy:function(){u.splice(u.indexOf(e),1);}}}

const atBreakpointChange = (breakpointToWatch, callback) => {
  const _screenUnderBP = () => {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return viewportWidth <= breakpointToWatch;
  };
  let screenUnderBP = _screenUnderBP();
  const widthWatcher = srraf(_ref => {
    let {
      vw
    } = _ref;
    const currentScreenWidthUnderBP = vw <= breakpointToWatch;
    if (currentScreenWidthUnderBP !== screenUnderBP) {
      screenUnderBP = currentScreenWidthUnderBP;
      return callback();
    }
  });
  const unload = () => {
    widthWatcher.destroy();
  };
  return {
    unload
  };
};

const sel$4 = {
  container: ".social-share",
  button: ".social-share__button",
  popup: ".social-sharing__popup",
  copyURLButton: ".social-share__copy-url",
  successMessage: ".social-share__success-message"
};
const classes$s = {
  hidden: "hidden",
  linkCopied: "social-sharing__popup--success"
};
var SocialShare = (node => {
  if (!node) return Function();
  const button = n$2(sel$4.button, node);
  const popup = n$2(sel$4.popup, node);
  const copyURLButton = n$2(sel$4.copyURLButton, node);
  const successMessage = n$2(sel$4.successMessage, node);
  let clickListener = e$2(window, "click", handleClick);

  // Hide copy button on old browsers
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    u$1(copyURLButton, classes$s.hidden);
  }
  function handleClick(evt) {
    const buttonClicked = evt.target.closest(sel$4.button) === button;
    const popupClicked = evt.target.closest(sel$4.popup) === popup;
    const copyURLClicked = evt.target.closest(sel$4.copyURLButton) === copyURLButton;
    let isActive = false;
    if (buttonClicked) {
      isActive = button.getAttribute("aria-expanded") === "true";
    }

    // click happend outside of this popup
    if (!popupClicked) {
      close();
    }

    // click happend in this social button and the button is not active
    if (buttonClicked && !isActive) {
      open();
    }
    if (copyURLClicked) {
      const {
        url
      } = copyURLButton.dataset;
      writeToClipboard(url).then(showSuccessMessage, showErrorMessage);
    }
  }
  function close() {
    button.setAttribute("aria-expanded", false);
    popup.setAttribute("aria-hidden", true);
  }
  function open() {
    button.setAttribute("aria-expanded", true);
    popup.setAttribute("aria-hidden", false);
  }
  function writeToClipboard(str) {
    return navigator.clipboard.writeText(str);
  }
  function showMessage(message) {
    successMessage.innerHTML = message;
    i$1(successMessage, classes$s.hidden);
    u$1(popup, classes$s.linkCopied);
    setTimeout(() => {
      u$1(successMessage, classes$s.hidden);
      i$1(popup, classes$s.linkCopied);
    }, 2000);
  }
  function showSuccessMessage() {
    const {
      successMessage
    } = copyURLButton.dataset;
    showMessage(successMessage);
  }
  function showErrorMessage() {
    const {
      errorMessage
    } = copyURLButton.dataset;
    showMessage(errorMessage || "Error copying link.");
  }
  function destroy() {
    close();
    clickListener();
  }
  return destroy;
});

/*!
 * slide-anim
 * https://github.com/yomotsu/slide-anim
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
const pool = [];
const inAnimItems = {
    add(el, defaultStyle, timeoutId, onCancelled) {
        const inAnimItem = { el, defaultStyle, timeoutId, onCancelled };
        this.remove(el);
        pool.push(inAnimItem);
    },
    remove(el) {
        const index = inAnimItems.findIndex(el);
        if (index === -1)
            return;
        const inAnimItem = pool[index];
        clearTimeout(inAnimItem.timeoutId);
        inAnimItem.onCancelled();
        pool.splice(index, 1);
    },
    find(el) {
        return pool[inAnimItems.findIndex(el)];
    },
    findIndex(el) {
        let index = -1;
        pool.some((item, i) => {
            if (item.el === el) {
                index = i;
                return true;
            }
            return false;
        });
        return index;
    }
};

const CSS_EASEOUT_EXPO = 'cubic-bezier( 0.19, 1, 0.22, 1 )';
function slideDown(el, options = {}) {
    return new Promise((resolve) => {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        const _isVisible = isVisible(el);
        const hasEndHeight = typeof options.endHeight === 'number';
        const display = options.display || 'block';
        const duration = options.duration || 400;
        const onCancelled = options.onCancelled || function () { };
        const defaultStyle = el.getAttribute('style') || '';
        const style = window.getComputedStyle(el);
        const defaultStyles = getDefaultStyles(el, display);
        const isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        const contentHeight = defaultStyles.height;
        const minHeight = defaultStyles.minHeight;
        const paddingTop = defaultStyles.paddingTop;
        const paddingBottom = defaultStyles.paddingBottom;
        const borderTop = defaultStyles.borderTop;
        const borderBottom = defaultStyles.borderBottom;
        const cssDuration = `${duration}ms`;
        const cssEasing = CSS_EASEOUT_EXPO;
        const cssTransition = [
            `height ${cssDuration} ${cssEasing}`,
            `min-height ${cssDuration} ${cssEasing}`,
            `padding ${cssDuration} ${cssEasing}`,
            `border-width ${cssDuration} ${cssEasing}`
        ].join();
        const startHeight = _isVisible ? style.height : '0px';
        const startMinHeight = _isVisible ? style.minHeight : '0px';
        const startPaddingTop = _isVisible ? style.paddingTop : '0px';
        const startPaddingBottom = _isVisible ? style.paddingBottom : '0px';
        const startBorderTopWidth = _isVisible ? style.borderTopWidth : '0px';
        const startBorderBottomWidth = _isVisible ? style.borderBottomWidth : '0px';
        const endHeight = (() => {
            if (hasEndHeight)
                return `${options.endHeight}px`;
            return !isBorderBox ?
                `${contentHeight - paddingTop - paddingBottom}px` :
                `${contentHeight + borderTop + borderBottom}px`;
        })();
        const endMinHeight = `${minHeight}px`;
        const endPaddingTop = `${paddingTop}px`;
        const endPaddingBottom = `${paddingBottom}px`;
        const endBorderTopWidth = `${borderTop}px`;
        const endBorderBottomWidth = `${borderBottom}px`;
        if (startHeight === endHeight &&
            startPaddingTop === endPaddingTop &&
            startPaddingBottom === endPaddingBottom &&
            startBorderTopWidth === endBorderTopWidth &&
            startBorderBottomWidth === endBorderBottomWidth) {
            resolve();
            return;
        }
        requestAnimationFrame(() => {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.visibility = 'visible';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(() => {
                el.style.height = endHeight;
                el.style.minHeight = endMinHeight;
                el.style.paddingTop = endPaddingTop;
                el.style.paddingBottom = endPaddingBottom;
                el.style.borderTopWidth = endBorderTopWidth;
                el.style.borderBottomWidth = endBorderBottomWidth;
            });
        });
        const timeoutId = setTimeout(() => {
            resetStyle(el);
            el.style.display = display;
            if (hasEndHeight) {
                el.style.height = `${options.endHeight}px`;
                el.style.overflow = `hidden`;
            }
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideUp(el, options = {}) {
    return new Promise((resolve) => {
        if (inAnimItems.findIndex(el) !== -1)
            return;
        const _isVisible = isVisible(el);
        const display = options.display || 'block';
        const duration = options.duration || 400;
        const onCancelled = options.onCancelled || function () { };
        if (!_isVisible) {
            resolve();
            return;
        }
        const defaultStyle = el.getAttribute('style') || '';
        const style = window.getComputedStyle(el);
        const isBorderBox = /border-box/.test(style.getPropertyValue('box-sizing'));
        const minHeight = pxToNumber(style.getPropertyValue('min-height'));
        const paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
        const paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
        const borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
        const borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
        const contentHeight = el.scrollHeight;
        const cssDuration = duration + 'ms';
        const cssEasing = CSS_EASEOUT_EXPO;
        const cssTransition = [
            `height ${cssDuration} ${cssEasing}`,
            `padding ${cssDuration} ${cssEasing}`,
            `border-width ${cssDuration} ${cssEasing}`
        ].join();
        const startHeight = !isBorderBox ?
            `${contentHeight - paddingTop - paddingBottom}px` :
            `${contentHeight + borderTop + borderBottom}px`;
        const startMinHeight = `${minHeight}px`;
        const startPaddingTop = `${paddingTop}px`;
        const startPaddingBottom = `${paddingBottom}px`;
        const startBorderTopWidth = `${borderTop}px`;
        const startBorderBottomWidth = `${borderBottom}px`;
        requestAnimationFrame(() => {
            el.style.height = startHeight;
            el.style.minHeight = startMinHeight;
            el.style.paddingTop = startPaddingTop;
            el.style.paddingBottom = startPaddingBottom;
            el.style.borderTopWidth = startBorderTopWidth;
            el.style.borderBottomWidth = startBorderBottomWidth;
            el.style.display = display;
            el.style.overflow = 'hidden';
            el.style.transition = cssTransition;
            el.style.webkitTransition = cssTransition;
            requestAnimationFrame(() => {
                el.style.height = '0';
                el.style.minHeight = '0';
                el.style.paddingTop = '0';
                el.style.paddingBottom = '0';
                el.style.borderTopWidth = '0';
                el.style.borderBottomWidth = '0';
            });
        });
        const timeoutId = setTimeout(() => {
            resetStyle(el);
            el.style.display = 'none';
            inAnimItems.remove(el);
            resolve();
        }, duration);
        inAnimItems.add(el, defaultStyle, timeoutId, onCancelled);
    });
}
function slideStop(el) {
    const elementObject = inAnimItems.find(el);
    if (!elementObject)
        return;
    const style = window.getComputedStyle(el);
    const height = style.height;
    const paddingTop = style.paddingTop;
    const paddingBottom = style.paddingBottom;
    const borderTopWidth = style.borderTopWidth;
    const borderBottomWidth = style.borderBottomWidth;
    resetStyle(el);
    el.style.height = height;
    el.style.paddingTop = paddingTop;
    el.style.paddingBottom = paddingBottom;
    el.style.borderTopWidth = borderTopWidth;
    el.style.borderBottomWidth = borderBottomWidth;
    el.style.overflow = 'hidden';
    inAnimItems.remove(el);
}
function isVisible(el) {
    return el.offsetHeight !== 0;
}
function resetStyle(el) {
    el.style.visibility = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    el.style.overflow = '';
    el.style.transition = '';
    el.style.webkitTransition = '';
}
function getDefaultStyles(el, defaultDisplay = 'block') {
    const defaultStyle = el.getAttribute('style') || '';
    const style = window.getComputedStyle(el);
    el.style.visibility = 'hidden';
    el.style.display = defaultDisplay;
    const width = pxToNumber(style.getPropertyValue('width'));
    el.style.position = 'absolute';
    el.style.width = `${width}px`;
    el.style.height = '';
    el.style.minHeight = '';
    el.style.paddingTop = '';
    el.style.paddingBottom = '';
    el.style.borderTopWidth = '';
    el.style.borderBottomWidth = '';
    const minHeight = pxToNumber(style.getPropertyValue('min-height'));
    const paddingTop = pxToNumber(style.getPropertyValue('padding-top'));
    const paddingBottom = pxToNumber(style.getPropertyValue('padding-bottom'));
    const borderTop = pxToNumber(style.getPropertyValue('border-top-width'));
    const borderBottom = pxToNumber(style.getPropertyValue('border-bottom-width'));
    const height = el.scrollHeight;
    el.setAttribute('style', defaultStyle);
    return {
        height,
        minHeight,
        paddingTop,
        paddingBottom,
        borderTop,
        borderBottom
    };
}
function pxToNumber(px) {
    return +px.replace(/px/, '');
}

function localStorageAvailable() {
  var test = "test";
  try {
    localStorage.setItem(test, test);
    if (localStorage.getItem(test) !== test) {
      return false;
    }
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
const PREFIX = "fluco_";
function getStorage(key) {
  if (!localStorageAvailable()) return null;
  return JSON.parse(localStorage.getItem(PREFIX + key));
}
function removeStorage(key) {
  if (!localStorageAvailable()) return null;
  localStorage.removeItem(PREFIX + key);
  return true;
}
function setStorage(key, val) {
  if (!localStorageAvailable()) return null;
  localStorage.setItem(PREFIX + key, val);
  return true;
}

var _window$flu$states$3;
const routes = window.theme.routes.cart || {};
const paths = {
  base: "".concat(routes.base || "/cart", ".js"),
  add: "".concat(routes.add || "/cart/add", ".js"),
  change: "".concat(routes.change || "/cart/change", ".js"),
  clear: "".concat(routes.clear || "/cart/clear", ".js"),
  update: "".concat(routes.update || "/cart/update", ".js")
};
const {
  strings: {
    cart: strings$6
  }
} = window.theme;
const useCustomEvents$3 = (_window$flu$states$3 = window.flu.states) === null || _window$flu$states$3 === void 0 ? void 0 : _window$flu$states$3.useCustomEvents;

// Add a `sorted` key that orders line items
// in the order the customer added them if possible
function sortCart(cart) {
  const order = getStorage("cart_order") || [];
  if (order.length) {
    cart.sorted = [...cart.items].sort((a, b) => order.indexOf(a.variant_id) - order.indexOf(b.variant_id));
    return cart;
  }
  cart.sorted = cart.items;
  return cart;
}
function updateItem(key, quantity) {
  return fetch(paths.change, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      id: key,
      quantity
    })
  }).then(res => {
    if (res.status == "422") {
      const error = {
        code: 422,
        message: strings$6.quantityError
      };
      handleError(error, "changeItem", key);
    } else {
      return res.json();
    }
  }).then(cart => {
    if (!cart) return;
    r$1("cart:updated", {
      cart
    });
    r$1("quick-cart:updated");
    if (useCustomEvents$3) {
      dispatchCustomEvent("cart:updated", {
        cart
      });
    }
    return sortCart(cart);
  });
}
function changeItem(line, itemKey, quantity) {
  return fetch(paths.change, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      line,
      quantity
    })
  }).then(res => {
    if (res.status == "422") {
      const error = {
        code: 422,
        message: strings$6.quantityError
      };
      handleError(error, "changeItem", itemKey);
    } else {
      return res.json();
    }
  }).then(cart => {
    r$1("cart:updated", {
      cart
    });
    r$1("quick-cart:updated");
    if (useCustomEvents$3) {
      dispatchCustomEvent("cart:updated", {
        cart
      });
    }
    return sortCart(cart);
  });
}
function addItemById(id, quantity) {
  r$1("cart:updating");
  let data = {
    items: [{
      id,
      quantity
    }]
  };
  return fetch(paths.add, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  }).then(r => r.json()).then(res => {
    if (res.status == "422") {
      const error = {
        code: 422,
        message: res.description
      };
      handleError(error, "addItemById", id);
    }
    return get().then(cart => {
      r$1("quick-cart:updated");
      r$1("cart:updated", {
        cart
      });
      if (useCustomEvents$3) {
        dispatchCustomEvent("cart:updated", {
          cart: sortCart(cart)
        });
      }
      return {
        res,
        cart
      };
    });
  });
}
function get() {
  return fetch(paths.base, {
    method: "GET",
    credentials: "include"
  }).then(res => res.json()).then(data => {
    const sortedData = sortCart(data);
    return sortedData;
  });
}
function addItem(form) {
  r$1("cart:updating");
  return fetch(paths.add, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest"
    },
    body: serialize(form)
  }).then(r => r.json()).then(res => {
    if (res.status == "422") {
      const error = {
        code: 422,
        message: res.description
      };
      handleError(error, "addItem", null);
    }
    return get().then(cart => {
      const order = getStorage("cart_order") || [];
      const newOrder = [res.variant_id, ...order.filter(i => i !== res.variant_id)];
      setStorage("cart_order", JSON.stringify(newOrder));
      r$1("cart:updated", {
        cart: sortCart(cart)
      });
      r$1("quick-cart:updated");
      r$1("quick-view:close");
      if (useCustomEvents$3) {
        dispatchCustomEvent("cart:updated", {
          cart: sortCart(cart)
        });
      }
      return {
        item: res,
        cart: sortCart(cart)
      };
    });
  });
}
function handleError(error, source, itemKeyOrId) {
  if (useCustomEvents$3) {
    dispatchCustomEvent("cart:error", {
      errorMessage: error.message
    });
  }
  if (source === "changeItem") {
    r$1("quick-cart:error", null, {
      key: itemKeyOrId,
      errorMessage: strings$6.quantityError
    });
    r$1("cart:error", null, {
      key: itemKeyOrId,
      errorMessage: strings$6.quantityError
    });
  } else if (source === "addItemById") {
    r$1("quick-add:error", null, {
      id: itemKeyOrId,
      errorMessage: strings$6.quantityError
    });
  }
  throw error;
}

// !
//  Serialize all form data into a SearchParams string
//  (c) 2020 Chris Ferdinandi, MIT License, https://gomakethings.com
//  @param  {Node}   form The form to serialize
//  @return {String}      The serialized form data
//
function serialize(form) {
  var arr = [];
  Array.prototype.slice.call(form.elements).forEach(function (field) {
    if (!field.name || field.disabled || ["file", "reset", "submit", "button"].indexOf(field.type) > -1) {
      return;
    }
    if (field.type === "select-multiple") {
      Array.prototype.slice.call(field.options).forEach(function (option) {
        if (!option.selected) return;
        arr.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(option.value));
      });
      return;
    }
    if (["checkbox", "radio"].indexOf(field.type) > -1 && !field.checked) {
      return;
    }
    arr.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value));
  });
  return arr.join("&");
}
var cart = {
  addItem,
  get,
  updateItem,
  addItemById
};

/**
 * Currency Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help with currency formatting
 *
 * Current contents
 * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
 *
 * Taken from https://github.com/Shopify/theme-scripts/blob/master/packages/theme-currency/currency.js
 */

const moneyFormat = window.theme.moneyFormat || "${{amount}}";

/**
 * Format money values based on your shop currency settings
 * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
 * or 3.00 dollars
 * @param  {String} format - shop money_format setting
 * @return {String} value - formatted value
 */
function formatMoney(cents, format) {
  if (typeof cents === "string") {
    cents = cents.replace(".", "");
  }
  let value = "";
  const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  const formatString = format || moneyFormat;
  function formatWithDelimiters(number) {
    let precision = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
    let thousands = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : ",";
    let decimal = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : ".";
    if (isNaN(number) || number == null) {
      return 0;
    }
    number = (number / 100.0).toFixed(precision);
    const parts = number.split(".");
    const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1".concat(thousands));
    const centsAmount = parts[1] ? decimal + parts[1] : "";
    return dollarsAmount + centsAmount;
  }
  switch (formatString.match(placeholderRegex)[1]) {
    case "amount":
      value = formatWithDelimiters(cents, 2);
      break;
    case "amount_no_decimals":
      value = formatWithDelimiters(cents, 0);
      break;
    case "amount_with_comma_separator":
      value = formatWithDelimiters(cents, 2, ".", ",");
      break;
    case "amount_no_decimals_with_comma_separator":
      value = formatWithDelimiters(cents, 0, ".", ",");
      break;
    case "amount_with_apostrophe_separator":
      value = formatWithDelimiters(cents, 2, "'", ".");
      break;
    case "amount_no_decimals_with_space_separator":
      value = formatWithDelimiters(cents, 0, " ", ",");
      break;
    case "amount_with_space_separator":
      value = formatWithDelimiters(cents, 2, " ", ",");
      break;
    case "amount_with_period_and_space_separator":
      value = formatWithDelimiters(cents, 2, " ", ".");
      break;
    default:
      value = formatWithDelimiters(cents, 2);
      break;
  }
  return formatString.replace(placeholderRegex, value);
}

// Fetch the product data from the .js endpoint because it includes
// more data than the .json endpoint.

var getProduct = (handle => cb => fetch("".concat(window.theme.routes.products, "/").concat(handle, ".js")).then(res => res.json()).then(data => cb(data)).catch(err => console.log(err.message)));

function accordion(node, options) {
  const labels = t$2(".accordion__label", node);
  const content = t$2(".accordion__content", node);

  // Make it accessible by keyboard
  labels.forEach(label => {
    label.href = "#";
  });
  content.forEach(t => u$1(t, "measure"));
  const labelClick = e$2(labels, "click", e => {
    e.preventDefault();
    const label = e.currentTarget;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    if (isVisible(content)) {
      _close(label, group, content);
    } else {
      _open(label, group, content);
    }
  });
  function _open(label, group, content) {
    slideDown(content);
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  }
  function _close(label, group, content) {
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  }
  if (options.firstOpen) {
    // Open first accordion label
    const {
      parentNode: group,
      nextElementSibling: content
    } = labels[0];
    _open(labels[0], group, content);
  }
  function destroy() {
    return () => labelClick();
  }
  return {
    destroy
  };
}
function Accordions(elements) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  if (Array.isArray(elements) && !elements.length) return;
  const defaultOptions = {
    firstOpen: true
  };
  const opts = Object.assign(defaultOptions, options);
  let accordions = [];
  if (elements.length) {
    accordions = elements.map(node => accordion(node, opts));
  } else {
    accordions.push(accordion(elements, opts));
  }
  function unload() {
    accordions.forEach(accordion => accordion.destroy());
  }
  return {
    unload
  };
}

let loaded$2 = null;
function loadMediaFeatures() {
  if (loaded$2 !== null) return loaded$2;
  loaded$2 = new Promise(resolve => {
    window.Shopify.loadFeatures([{
      name: "model-viewer-ui",
      version: "1.0"
    }, {
      name: "shopify-xr",
      version: "1.0"
    }, {
      name: "video-ui",
      version: "1.0"
    }], () => {
      if ("YT" in window && Boolean(YT.loaded)) {
        resolve();
      } else {
        window.onYouTubeIframeAPIReady = function () {
          resolve();
        };
      }
    });
  });
  return loaded$2;
}

function Media(node) {
  if (!node) return;
  const {
    Shopify,
    YT
  } = window;
  const {
    icons
  } = window.theme;
  const elements = t$2("[data-interactive]", node);
  if (!elements.length) return;
  const acceptedTypes = ["video", "model", "external_video"];
  let activeMedia = null;
  let instances = {};
  const selectors = {
    mediaContainer: ".media",
    videoPoster: ".mobile-media-carousel__poster"
  };
  const mediaContainers = t$2(selectors.mediaContainer, node);
  let hasMobileVideoModal = false;
  mediaContainers.forEach(mediaContainer => {
    if (mediaContainer.dataset.hasMobileVideoModal === "true") {
      hasMobileVideoModal = true;
      return;
    }
  });
  elements.forEach(initElement);
  function initElement(el) {
    const {
      mediaId,
      mediaType
    } = el.dataset;
    if (!mediaType || !acceptedTypes.includes(mediaType)) return;
    if (Object.keys(instances).includes(mediaId)) return;
    let instance = {
      id: mediaId,
      type: mediaType,
      container: el,
      media: el.children[0]
    };
    switch (instance.type) {
      case "video":
        instance.player = new Shopify.Plyr(instance.media, {
          loop: {
            active: el.dataset.loop == "true"
          }
        });
        break;
      case "external_video":
        {
          if (hasMobileVideoModal) {
            const photoSwipe = import(flu.chunks.photoswipe);
            const videoPoster = n$2(selectors.videoPoster, instance.container);
            let photoSwipeInstance;
            photoSwipe.then(_ref => {
              let {
                PhotoSwipeLightbox,
                PhotoSwipe
              } = _ref;
              photoSwipeInstance = new PhotoSwipeLightbox({
                dataSource: [{
                  html: instance.media.outerHTML
                }],
                pswpModule: PhotoSwipe,
                mainClass: "pswp--product-lightbox",
                closeSVG: icons.close,
                arrowPrev: false,
                arrowNext: false,
                zoom: false,
                counter: false
              });
              photoSwipeInstance.init();
              e$2(videoPoster, "click", () => {
                photoSwipeInstance.loadAndOpen();
              });
            });
          }
          break;
        }
      case "model":
        instance.viewer = new Shopify.ModelViewerUI(n$2("model-viewer", el));
        e$2(n$2(".model-poster", el), "click", e => {
          e.preventDefault();
          playModel(instance);
        });
        break;
    }
    if (instance.player) {
      if (instance.type === "video") {
        instance.player.on("playing", () => {
          pauseActiveMedia(instance);
          activeMedia = instance;
        });
      } else if (instance.type === "external_video") {
        instance.player.addEventListener("onStateChange", event => {
          if (event.data === 1) {
            pauseActiveMedia(instance);
            activeMedia = instance;
          }
        });
      }
    }
  }
  function playModel(instance) {
    pauseActiveMedia(instance);
    instance.viewer.play();
    u$1(instance.container, "model-active");
    activeMedia = instance;
    setTimeout(() => {
      n$2("model-viewer", instance.container).focus();
    }, 300);
  }
  function pauseActiveMedia(instance) {
    if (!activeMedia || instance == activeMedia) return;
    if (activeMedia.player) {
      if (activeMedia.type === "video") {
        activeMedia.player.pause();
      } else if (activeMedia.type === "external_video") {
        activeMedia.player.pauseVideo();
      }
      activeMedia = null;
      return;
    }
    if (activeMedia.viewer) {
      i$1(activeMedia.container, "model-active");
      activeMedia.viewer.pause();
      activeMedia = null;
    }
  }
  return {
    pauseActiveMedia
  };
}

const selectors$V = {
  idInput: '[name="id"]',
  optionInput: '[name^="options"]',
  quantityInput: "[data-quantity-input]",
  formQuantity: '[name="quantity"]',
  propertyInput: '[name^="properties"]'
};
function ProductForm(container, form, prod) {
  let config = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
  const product = validateProductObject(prod);
  const listeners = [];
  const getOptions = () => {
    return _serializeOptionValues(optionInputs, function (item) {
      var regex = /(?:^(options\[))(.*?)(?:[\]](?![\]]))/;
      item.name = regex.exec(item.name)[2]; // Use just the value between 'options[' and ']'
      return item;
    });
  };
  const getVariant = () => {
    return getVariantFromSerializedArray(product, getOptions());
  };
  const getProperties = () => {
    const properties = _serializePropertyValues(propertyInputs, function (propertyName) {
      var regex = /(?:^(properties\[))(.*?)(?:\])/;
      var name = regex.exec(propertyName)[2]; // Use just the value between 'properties[' and ']'
      return name;
    });
    return Object.entries(properties).length === 0 ? null : properties;
  };
  const getQuantity = () => {
    return formQuantityInput[0] ? Number.parseInt(formQuantityInput[0].value, 10) : 1;
  };
  const getProductFormEventData = () => ({
    options: getOptions(),
    variant: getVariant(),
    properties: getProperties(),
    quantity: getQuantity()
  });
  const onFormEvent = cb => {
    if (typeof cb === "undefined") return;
    return event => {
      event.dataset = getProductFormEventData();
      cb(event);
    };
  };
  const setIdInputValue = value => {
    let idInputElement = form.querySelector(selectors$V.idInput);
    if (!idInputElement) {
      idInputElement = document.createElement("input");
      idInputElement.type = "hidden";
      idInputElement.name = "id";
      form.appendChild(idInputElement);
    }
    idInputElement.value = value.toString();
  };
  const onSubmit = event => {
    event.dataset = getProductFormEventData();
    setIdInputValue(event.dataset.variant.id);
    if (config.onFormSubmit) {
      config.onFormSubmit(event);
    }
  };
  const initInputs = (selector, cb) => {
    const elements = [...container.querySelectorAll(selector)];
    return elements.map(element => {
      listeners.push(e$2(element, "change", onFormEvent(cb)));
      return element;
    });
  };
  listeners.push(e$2(form, "submit", onSubmit));
  const optionInputs = initInputs(selectors$V.optionInput, config.onOptionChange);
  const formQuantityInput = initInputs(selectors$V.quantityInput, config.onQuantityChange);
  const propertyInputs = initInputs(selectors$V.propertyInput, config.onPropertyChange);
  const destroy = () => {
    listeners.forEach(unsubscribe => unsubscribe());
  };
  return {
    getVariant,
    destroy
  };
}
function validateProductObject(product) {
  if (typeof product !== "object") {
    throw new TypeError(product + " is not an object.");
  }
  if (typeof product.variants[0].options === "undefined") {
    throw new TypeError("Product object is invalid. Make sure you use the product object that is output from {{ product | json }} or from the http://[your-product-url].js route");
  }
  return product;
}
function _serializeOptionValues(inputs, transform) {
  return inputs.reduce(function (options, input) {
    if (input.checked ||
    // If input is a checked (means type radio or checkbox)
    input.type !== "radio" && input.type !== "checkbox" // Or if its any other type of input
    ) {
      options.push(transform({
        name: input.name,
        value: input.value
      }));
    }
    return options;
  }, []);
}
function _serializePropertyValues(inputs, transform) {
  return inputs.reduce(function (properties, input) {
    if (input.checked ||
    // If input is a checked (means type radio or checkbox)
    input.type !== "radio" && input.type !== "checkbox" // Or if its any other type of input
    ) {
      properties[transform(input.name)] = input.value;
    }
    return properties;
  }, {});
}

var preventDefault = (fn => e => {
  e.preventDefault();
  fn();
});

const selectors$U = {
  imageById: id => "[data-media-item-id='".concat(id, "']"),
  imageWrapper: "[data-product-media-wrapper]",
  inYourSpace: "[data-in-your-space]"
};
const classes$r = {
  hidden: "hidden"
};
function switchImage (container, imageId, inYourSpaceButton) {
  const newImage = n$2(selectors$U.imageWrapper + selectors$U.imageById(imageId), container);
  const otherImages = t$2("".concat(selectors$U.imageWrapper, ":not(").concat(selectors$U.imageById(imageId), ")"), container);
  newImage && i$1(newImage, classes$r.hidden);

  // Update view in space button
  if (inYourSpaceButton) {
    if (newImage.dataset.mediaType === "model") {
      inYourSpaceButton.setAttribute("data-shopify-model3d-id", newImage.dataset.mediaItemId);
    }
  }
  otherImages.forEach(image => u$1(image, classes$r.hidden));
}

function quantityInput (container) {
  const quantityWrapper = n$2(".quantity-input", container);
  if (!quantityWrapper) return;
  const quantityInput = n$2("[data-quantity-input]", quantityWrapper);
  const addQuantity = n$2("[data-add-quantity]", quantityWrapper);
  const subtractQuantity = n$2("[data-subtract-quantity]", quantityWrapper);
  const handleAddQuantity = () => {
    const currentValue = parseInt(quantityInput.value);
    const newValue = currentValue + 1;
    quantityInput.value = newValue;
    quantityInput.dispatchEvent(new Event("change"));
  };
  const handleSubtractQuantity = () => {
    const currentValue = parseInt(quantityInput.value);
    if (currentValue === 1) return;
    const newValue = currentValue - 1;
    quantityInput.value = newValue;
    quantityInput.dispatchEvent(new Event("change"));
  };
  const events = [e$2(addQuantity, "click", handleAddQuantity), e$2(subtractQuantity, "click", handleSubtractQuantity)];
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

const selectors$T = {
  popupTrigger: "[data-popup-trigger]"
};
const informationPopup = node => {
  const events = [];
  const popupTriggers = t$2(selectors$T.popupTrigger, node);
  if (!popupTriggers.length) {
    return;
  }
  const listener = e$2(popupTriggers, "click", e => {
    e.preventDefault();
    e.stopPropagation();
    const {
      modalContentId
    } = e.target.dataset;
    const content = n$2("#".concat(modalContentId), node);
    r$1("modal:open", null, {
      modalContent: content
    });
  });
  events.push(listener);
  function unload() {
    events.forEach(evt => evt());
  }
  return {
    unload
  };
};

const selectors$S = {
  moreButton: "[data-more-media]",
  moreBar: "[data-more-media-bar]",
  productMedia: "[data-product-media]"
};
const states = {
  closed: "closed",
  beforeOpen: "beforeOpen",
  opening: "opening",
  open: "open"
};
const moreMedia = node => {
  if (!node) return;
  const moreButton = n$2(selectors$S.moreButton, node);
  if (!moreButton) return;
  const moreBar = n$2(selectors$S.moreBar, node);
  const productMedia = n$2(selectors$S.productMedia, node);
  const initialAR = parseFloat(window.getComputedStyle(productMedia).aspectRatio);
  let isOpen = false;
  const updateText = open => {
    moreButton.innerHTML = moreButton.dataset[open ? "langLessMedia" : "langMoreMedia"];
  };
  const close = () => {
    if (!isOpen) return;
    if (!isFinite(initialAR)) {
      // If AR is NaN it's either 'auto' or unsupported by the browser,
      // in which case we can't transition it. Instead, jump directly to
      // the final state.
      productMedia.dataset.productMedia = states.closed;
      isOpen = false;
      updateText(false);
      return;
    }
    productMedia.dataset.productMedia = states.opening;
    window.requestAnimationFrame(() => {
      const transitionEnd = e$2(productMedia, "transitionend", () => {
        transitionEnd();
        productMedia.dataset.productMedia = states.closed;
        isOpen = false;
      });
      productMedia.dataset.productMedia = states.beforeOpen;
      updateText(false);
    });
  };
  const scrollIntoView = variantImage => {
    if (!variantImage) return;
    variantImage.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest"
    });
  };
  const setOpen = () => {
    productMedia.dataset.productMedia = states.open;
    isOpen = true;
  };
  const open = function (variantImage) {
    let skipTransition = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    if (isOpen) return;
    if (!isFinite(initialAR)) {
      // If AR is NaN it's either 'auto' or unsupported by the browser,
      // in which case we can't transition it. Instead, jump directly to
      // the final state.
      setOpen();
      updateText(true);
      return;
    }
    productMedia.dataset.productMedia = states.beforeOpen;
    window.requestAnimationFrame(() => {
      const {
        width
      } = productMedia.getBoundingClientRect();
      const {
        scrollHeight
      } = productMedia;
      const gridGap = parseInt(window.getComputedStyle(productMedia).rowGap, 10);
      const barBottom = parseInt(window.getComputedStyle(moreBar).bottom, 10);
      const openAspectRatio = width / (scrollHeight - gridGap - barBottom);
      productMedia.style.setProperty("--overflow-gallery-aspect-ratio-open", openAspectRatio);

      // skipTransition is only true on variant change with a variant image and hidden media
      // required to improve scrolling while expanding media
      if (skipTransition) {
        const transitionCopy = productMedia.style.transition;
        productMedia.style.transition = "none";
        setOpen();
        scrollIntoView(variantImage);
        productMedia.style.transition = transitionCopy;
      } else {
        const transitionEnd = e$2(productMedia, "transitionend", e => {
          if (e.target !== productMedia) {
            // Ignore any bubble up even from image load transitions, etc.
            return;
          }
          transitionEnd();
          scrollIntoView(variantImage);
          setOpen();
        });
        productMedia.dataset.productMedia = states.opening;
      }
      updateText(true);
    });
  };
  const clickListener = e$2(moreButton, "click", () => {
    isOpen ? close() : open();
  });
  const events = [clickListener];
  const unload = () => {
    events.forEach(evt => evt());
  };
  return {
    open,
    unload
  };
};

const {
  strings: {
    products: strings$5
  }
} = window.theme;
const selectors$R = {
  price: "[data-price]",
  comparePrice: "[data-compare-price]",
  defaultProductContainer: ".product__top",
  quickProductContainer: ".quick-product"
};
function updatePrices (container, variant, isProductPage) {
  const price = t$2(selectors$R.price, container);
  const comparePrice = t$2(selectors$R.comparePrice, container);
  const unavailableString = strings$5.product.unavailable;
  if (!variant) {
    price.forEach(el => el.innerHTML = unavailableString);
    comparePrice.forEach(el => el.innerHTML = "");
    return;
  }
  const defaultProdContainer = n$2(selectors$R.defaultProductContainer, container);
  const quickProdContainer = n$2(selectors$R.quickProductContainer, document);
  let productContainer;
  if (isProductPage) {
    productContainer = defaultProdContainer;
  } else {
    productContainer = quickProdContainer;
  }
  const {
    zeroPriceDisplay,
    zeroPriceCustomContent,
    soldOutPriceDisplay,
    soldOutPriceCustomContent
  } = productContainer.dataset;
  let priceContentType = "price";
  let priceContent = formatMoney(variant.price);
  if (variant.available) {
    if (variant.compare_at_price === null && variant.price === 0) {
      if (zeroPriceDisplay === "hide") {
        priceContentType = "hide";
        priceContent = "";
      } else {
        if (zeroPriceDisplay === "replace") {
          priceContentType = "custom";
          priceContent = zeroPriceCustomContent;
        }
      }
    }
  } else {
    if (soldOutPriceDisplay === "hide") {
      priceContentType = "hide";
      priceContent = "";
    } else {
      if (soldOutPriceDisplay === "replace") {
        priceContentType = "custom";
        priceContent = soldOutPriceCustomContent;
      }
    }
  }
  if (isProductPage) {
    defaultProdContainer.setAttribute("data-price-display-type", priceContentType);
  } else {
    quickProdContainer.setAttribute("data-price-display-type", priceContentType);
  }
  price.forEach(el => el.innerHTML = priceContent);
  comparePrice.forEach(el => el.innerHTML = variant.compare_at_price > variant.price && priceContentType === "price" ? formatMoney(variant.compare_at_price) : "");
}

const selectors$Q = {
  productSku: "[data-product-sku]",
  productSkuContainer: ".product__vendor_and_sku"
};
const {
  strings: {
    products: strings$4
  }
} = window.theme;
function updateSku (container, variant) {
  const skuContainer = n$2(selectors$Q.productSkuContainer, container);
  if (!skuContainer) return;
  const skuElement = n$2(selectors$Q.productSku, container);
  if (!skuElement) return;
  const {
    sku
  } = strings$4.product;
  const skuString = value => "".concat(sku, ": ").concat(value);
  if (!variant || !variant.sku) {
    skuElement.innerText = "";
    skuContainer.setAttribute("data-showing-sku", false);
    return;
  }
  skuElement.innerText = skuString(variant.sku);
  skuContainer.setAttribute("data-showing-sku", true);
}

function updateBuyButton (btn, variant) {
  const text = n$2("[data-add-to-cart-text]", btn);
  const {
    langAvailable,
    langUnavailable,
    langSoldOut
  } = btn.dataset;
  if (!variant) {
    btn.setAttribute("disabled", "disabled");
    text.textContent = langUnavailable;
  } else if (variant.available) {
    btn.removeAttribute("disabled");
    text.textContent = langAvailable;
  } else {
    btn.setAttribute("disabled", "disabled");
    text.textContent = langSoldOut;
  }
}

const selectors$P = {
  accordionShell: ".accordion.product-reviews",
  accordionContent: ".accordion__content"
};
const classes$q = {
  hidden: "hidden",
  accordion: "accordion"
};
function reviewsHandler (node, container) {
  if (!node) return;
  const parentAppBlockContainer = node.parentNode;
  const accordion = n$2(selectors$P.accordionShell, container);
  const accordionContent = n$2(selectors$P.accordionContent, accordion);

  // Move the contents of the reviews app into the accordion shell
  // Then move the contents with the accrdion back into the original
  // location.
  accordionContent.appendChild(node);
  parentAppBlockContainer.appendChild(accordion);
  u$1(parentAppBlockContainer, classes$q.accordion);
  i$1(accordion, classes$q.hidden);
}

function OptionButtons(els) {
  const groups = els.map(createOptionGroup);
  function destroy() {
    groups && groups.forEach(group => group());
  }
  return {
    groups,
    destroy
  };
}
function createOptionGroup(el) {
  const select = n$2("select", el);
  const buttons = t$2("[data-button]", el);
  const buttonClick = e$2(buttons, "click", e => {
    e.preventDefault();
    const buttonEl = e.currentTarget;
    const {
      optionHandle
    } = buttonEl.dataset;
    buttons.forEach(btn => {
      l(btn, "selected", btn.dataset.optionHandle === optionHandle);
    });
    const opt = n$2("[data-value-handle=\"".concat(optionHandle, "\"]"), select);
    opt.selected = true;
    select.dispatchEvent(new Event("change"));
  });
  return () => buttonClick();
}

const selectors$O = {
  counterContainer: "[data-inventory-counter]",
  inventoryMessage: ".inventory-counter__message",
  countdownBar: ".inventory-counter__bar",
  progressBar: ".inventory-counter__bar-progress"
};
const classes$p = {
  hidden: "hidden",
  inventoryLow: "inventory--low",
  inventoryEmpty: "inventory--empty",
  inventoryUnavailable: "inventory--unavailable"
};
const inventoryCounter = (container, config) => {
  const variantsInventories = config.variantsInventories;
  const counterContainer = n$2(selectors$O.counterContainer, container);
  const inventoryMessageElement = n$2(selectors$O.inventoryMessage, container);
  const progressBar = n$2(selectors$O.progressBar, container);
  const {
    lowInventoryThreshold,
    showUntrackedQuantity,
    stockCountdownMax,
    unavailableText
  } = counterContainer.dataset;

  // If the threshold or countdownmax contains anything but numbers abort
  if (!lowInventoryThreshold.match(/^[0-9]+$/) || !stockCountdownMax.match(/^[0-9]+$/)) {
    return;
  }
  const threshold = parseInt(lowInventoryThreshold, 10);
  const countDownMax = parseInt(stockCountdownMax, 10);
  l(counterContainer, classes$p.hidden, !productIventoryValid(variantsInventories[config.id]));
  checkThreshold(variantsInventories[config.id]);
  setProgressBar(variantsInventories[config.id].inventory_quantity, variantsInventories[config.id].inventory_management);
  setInventoryMessage(variantsInventories[config.id].inventory_message);
  function checkThreshold(_ref) {
    let {
      inventory_policy,
      inventory_quantity,
      inventory_management
    } = _ref;
    i$1(counterContainer, classes$p.inventoryLow);
    if (inventory_management !== null) {
      if (inventory_quantity <= 0 && inventory_policy === "deny") {
        u$1(counterContainer, classes$p.inventoryEmpty);
        counterContainer.setAttribute("data-stock-category", "empty");
      } else if (inventory_quantity <= threshold || inventory_quantity <= 0 && inventory_policy === "continue") {
        counterContainer.setAttribute("data-stock-category", "low");
      } else {
        counterContainer.setAttribute("data-stock-category", "sufficient");
      }
    } else if (inventory_management === null && showUntrackedQuantity == "true") {
      counterContainer.setAttribute("data-stock-category", "sufficient");
    }
  }
  function setProgressBar(inventoryQuantity, inventoryManagement) {
    if (inventoryManagement === null && showUntrackedQuantity == "true") {
      progressBar.style.width = "".concat(100, "%");
      return;
    }
    if (inventoryQuantity <= 0) {
      progressBar.style.width = "".concat(0, "%");
      return;
    }
    const progressValue = inventoryQuantity < countDownMax ? inventoryQuantity / countDownMax * 100 : 100;
    progressBar.style.width = "".concat(progressValue, "%");
  }
  function setInventoryMessage(message) {
    inventoryMessageElement.innerText = message;
  }
  function productIventoryValid(product) {
    return product.inventory_message && (product.inventory_management !== null || product.inventory_management === null && showUntrackedQuantity == "true");
  }
  const update = variant => {
    if (!variant) {
      setUnavailable();
      return;
    }
    l(counterContainer, classes$p.hidden, !productIventoryValid(variantsInventories[variant.id]));
    checkThreshold(variantsInventories[variant.id]);
    setProgressBar(variantsInventories[variant.id].inventory_quantity, variantsInventories[variant.id].inventory_management);
    setInventoryMessage(variantsInventories[variant.id].inventory_message);
  };
  function setUnavailable() {
    i$1(counterContainer, classes$p.hidden);
    u$1(counterContainer, classes$p.inventoryUnavailable);
    counterContainer.setAttribute("data-stock-category", "unavailable");
    setProgressBar(0);
    setInventoryMessage(unavailableText);
  }
  return {
    update
  };
};

const selectors$N = {
  item: ".product-item",
  itemInner: ".product-item__inner",
  quickAddButton: '[data-quick-shop-trigger="quick-add"]',
  quickViewButton: '[data-quick-shop-trigger="quick-view"]',
  quickCart: ".quick-cart",
  purchaseConfirmation: ".purchase-confirmation-popup"
};
function ProductItem(container) {
  const items = t$2(selectors$N.item, container);
  if (!items.length) return;

  // Add z-index for quick-buy overlap
  items.forEach((item, i) => item.style.setProperty("--z-index-item", items.length - i));
  const productItemAnimations = AnimateProductItem(items);
  const quickAddButtons = t$2(selectors$N.quickAddButton, container);
  const quickViewButtons = t$2(selectors$N.quickViewButton, container);
  const quickCart = n$2(selectors$N.quickCart, document);
  const purchaseConfirmation = n$2(selectors$N.purchaseConfirmation, document);
  const events = [e$2(quickAddButtons, "click", e => {
    const buttonEl = e.currentTarget;
    u$1(buttonEl, "loading");

    // if quick cart and confirmation popup are disabled, use standard form submit
    if (!purchaseConfirmation && !quickCart) return;
    e.preventDefault();
    e.stopPropagation();
    const {
      productId
    } = buttonEl.dataset;
    if (!productId) return;
    cart.addItemById(productId, 1).then(_ref => {
      let {
        res
      } = _ref;
      i$1(buttonEl, "loading");
      if (purchaseConfirmation) {
        r$1("confirmation-popup:open", null, {
          product: res.items[0]
        });
      } else {
        r$1("quick-cart:updated");
        // Need a delay to allow quick-cart to refresh
        setTimeout(() => {
          r$1("quick-cart:open");
        }, 300);
      }
    });
  }), e$2(quickViewButtons, "click", e => {
    e.preventDefault();
    e.stopPropagation();
    const buttonEl = e.currentTarget;
    const {
      productUrl
    } = buttonEl.dataset;
    if (!productUrl) return;
    r$1("quick-view:open", null, {
      productUrl: productUrl
    });
  })];
  const unload = () => {
    productItemAnimations.destroy();
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

const selectors$M = {
  sliderContainer: ".swiper",
  visibleSlides: ".swiper-slide-visible"
};
const classes$o = {
  overflow: "has-overflow",
  carousel: "carousel"
};
var Carousel = (function (node) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  // Pass the swiper container or the contain section
  const swiperContainer = a$1(node, classes$o.carousel) ? node : n$2(selectors$M.sliderContainer, node);
  if (!swiperContainer) return;
  let carousel;
  const events = [];
  const defaultSwiperOptions = {
    slidesPerView: 2,
    grabCursor: true,
    preloadImages: false,
    watchSlidesProgress: true,
    on: {
      init: function () {
        handleOverflow(this.slides);
      },
      breakpoint: function () {
        onBreakpointChange(this.slides);
      }
    }
  };
  const nextButton = n$2("[data-next]", node);
  const prevButton = n$2("[data-prev]", node);
  const useNav = nextButton && prevButton;

  // Account for additional padding if slides overflow container
  const handleOverflow = slides => {
    // Allow breakpoints config settings to apply
    setTimeout(() => {
      const hasOverflow = a$1(swiperContainer, classes$o.overflow);
      const needsOverflow = t$2(selectors$M.visibleSlides, swiperContainer).length !== slides.length;
      if (!hasOverflow && needsOverflow) {
        u$1(swiperContainer, classes$o.overflow);
      } else if (hasOverflow && !needsOverflow) {
        i$1(swiperContainer, classes$o.overflow);
      }
    }, 0);
  };
  const onBreakpointChange = slides => {
    handleOverflow(slides);
  };
  function handleFocus(event) {
    const slide = event.target.closest(".swiper-slide");
    const slideIndex = [...slide.parentElement.children].indexOf(slide);

    // TODO: ideally this would be dependant on if slide didn't have
    // `swiper-slide-visible` class (so would slide only as needed)
    // however that doesn't work with mobile peek, so brut forcing for now
    // and will always sliding now

    if (document.body.classList.contains("user-is-tabbing")) {
      carousel.slideTo(slideIndex);
    }
  }
  import(flu.chunks.swiper).then(_ref => {
    let {
      Swiper,
      Navigation
    } = _ref;
    let swiperOptions = Object.assign(defaultSwiperOptions, options);

    // nextEl and prevEl can be passed in check if they are before
    // using the defaults
    if ("navigation" in swiperOptions) {
      swiperOptions = Object.assign(swiperOptions, {
        modules: [Navigation]
      });
    } else if (useNav) {
      swiperOptions = Object.assign(swiperOptions, {
        modules: [Navigation],
        navigation: {
          nextEl: nextButton,
          prevEl: prevButton
        }
      });
    }
    carousel = new Swiper(swiperContainer, swiperOptions);
    events.push(e$2(swiperContainer, "focusin", handleFocus));
  });
  return {
    destroy: () => {
      var _carousel;
      (_carousel = carousel) === null || _carousel === void 0 || _carousel.destroy();
      events.forEach(unsubscribe => unsubscribe());
    }
  };
});

const selectors$L = {
  wrappingContainer: ".product__block-featured-products",
  featuredProducts: "[data-featured-products]",
  featuredProductsContent: "[data-featured-products-content]",
  leftSideMobileFeaturedProducts: ".left-side-blocks.for-mobile [data-featured-products]"
};
const featuredProducts = node => {
  const featuredProducts = t$2(selectors$L.featuredProducts, node);
  if (!featuredProducts.length) return;
  let productItems;
  let mobileSwiper;
  let mobileFeaturedProducts;
  const {
    recommendationsType,
    productId: id,
    sectionId,
    enableMobileSwiper,
    maxRecommendations
  } = featuredProducts[0].dataset;
  if (recommendationsType === "app-recommendations") {
    handleRecommendedProducts();
  } else {
    // Merchant is using custom product list
    productItems = featuredProducts.map(productContainer => ProductItem(productContainer));
    handleMobileSwiper();
  }
  function handleRecommendedProducts() {
    const requestUrl = "".concat(window.theme.routes.productRecommendations, "?section_id=").concat(sectionId, "&limit=").concat(maxRecommendations, "&product_id=").concat(id, "&intent=complementary");
    fetch(requestUrl).then(response => response.text()).then(text => {
      const html = document.createElement("div");
      html.innerHTML = text;
      const recommendations = n$2(selectors$L.featuredProductsContent, html);
      if (recommendations && recommendations.innerHTML.trim().length) {
        featuredProducts.forEach(block => block.innerHTML = recommendations.innerHTML);
        productItems = featuredProducts.map(productContainer => ProductItem(productContainer));

        // Remove hidden flag as content has been fetched
        featuredProducts.forEach(block => {
          i$1(block.closest(selectors$L.wrappingContainer), "hidden");
        });
        handleMobileSwiper();
      }
    }).catch(error => {
      throw error;
    });
  }
  function handleMobileSwiper() {
    if (enableMobileSwiper !== "true") return;
    // Left column blocks are rendered twice to keep correct
    // ordering with right column blocks on mobile. Here we
    // target the mobile left version if it exists as it requires
    // the potential mobile swiper only.
    mobileFeaturedProducts = n$2(selectors$L.leftSideMobileFeaturedProducts, node) || n$2(selectors$L.featuredProducts, node);
    if (window.matchMedia(getMediaQuery("below-720")).matches) {
      _initMobileSwiper();
    }
    atBreakpointChange(720, () => {
      if (window.matchMedia(getMediaQuery("below-720")).matches) {
        _initMobileSwiper();
      } else {
        var _mobileSwiper;
        (_mobileSwiper = mobileSwiper) === null || _mobileSwiper === void 0 || _mobileSwiper.destroy();
      }
    });
  }
  function _initMobileSwiper() {
    mobileSwiper = Carousel(mobileFeaturedProducts, {
      slidesPerView: 2.1,
      spaceBetween: 12
    });
  }
  function unload() {
    var _productItems, _mobileSwiper2;
    (_productItems = productItems) === null || _productItems === void 0 || _productItems.forEach(item => item.unload());
    (_mobileSwiper2 = mobileSwiper) === null || _mobileSwiper2 === void 0 || _mobileSwiper2.destroy();
  }
  return {
    unload
  };
};

const classes$n = {
  disabled: "disabled"
};
const selectors$K = {
  variantsWrapper: ".product__variants-wrapper",
  variantsJson: "[data-variant-json]",
  input: ".dynamic-variant-input",
  inputWrap: ".dynamic-variant-input-wrap",
  inputWrapWithValue: option => "".concat(selectors$K.inputWrap, "[data-index=\"").concat(option, "\"]"),
  buttonWrap: ".dynamic-variant-button",
  buttonWrapWithValue: value => "".concat(selectors$K.buttonWrap, "[data-option-value=\"").concat(value, "\"]")
};

/**
 *  VariantAvailability
    - Cross out sold out or unavailable variants
    - Required markup:
      - class=dynamic-variant-input-wrap + data-index="option{{ forloop.index }}" to wrap select or button group
      - class=dynamic-variant-input + data-index="option{{ forloop.index }}" to wrap selects associated with variant potentially hidden if swatch / chip
      - class=dynamic-variant-button + data-value="{{ value | escape }}" to wrap button of swatch / chip
      - hidden product variants json markup
  * @param {node} container product container element
  * @returns {unload} remove event listeners
 */
function variantAvailability (container) {
  const variantsWrapper = n$2(selectors$K.variantsWrapper, container);

  // Variant options block do not exist
  if (!variantsWrapper) return;
  const {
    enableDynamicProductOptions,
    currentVariantId
  } = variantsWrapper.dataset;
  if (enableDynamicProductOptions === "false") return;
  const productVariants = JSON.parse(n$2(selectors$K.variantsJson, container).innerText);

  // Using associated selects as buy buttons may be disabled.
  const variantSelectors = t$2(selectors$K.input, container);
  const variantSelectorWrappers = t$2(selectors$K.inputWrap, container);
  const events = [];
  init();
  function init() {
    variantSelectors.forEach(el => {
      events.push(e$2(el, "change", handleChange));
    });
    setInitialAvailability();
  }
  function setInitialAvailability() {
    // Disable all options on initial load
    variantSelectorWrappers.forEach(group => disableVariantGroup(group));
    const initiallySelectedVariant = productVariants.find(variant => variant.id === parseInt(currentVariantId, 10));
    const currentlySelectedValues = initiallySelectedVariant.options.map((value, index) => {
      return {
        value,
        index: "option".concat(index + 1)
      };
    });
    const initialOptions = createAvailableOptionsTree(productVariants, currentlySelectedValues);
    for (const [option, values] of Object.entries(initialOptions)) {
      manageOptionState(option, values);
    }
  }

  // Create a list of all options. If any variant exists and is in stock with that option, it's considered available
  function createAvailableOptionsTree(variants, currentlySelectedValues) {
    // Reduce variant array into option availability tree
    return variants.reduce((options, variant) => {
      // Check each option group (e.g. option1, option2, option3) of the variant
      Object.keys(options).forEach(index => {
        if (variant[index] === null) return;
        let entry = options[index].find(option => option.value === variant[index]);
        if (typeof entry === "undefined") {
          // If option has yet to be added to the options tree, add it
          entry = {
            value: variant[index],
            soldOut: true
          };
          options[index].push(entry);
        }
        const currentOption1 = currentlySelectedValues.find(_ref => {
          let {
            index
          } = _ref;
          return index === "option1";
        });
        const currentOption2 = currentlySelectedValues.find(_ref2 => {
          let {
            index
          } = _ref2;
          return index === "option2";
        });
        switch (index) {
          case "option1":
            // Option1 inputs should always remain enabled based on all available variants
            entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            break;
          case "option2":
            // Option2 inputs should remain enabled based on available variants that match first option group
            if (currentOption1 && variant.option1 === currentOption1.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }
            break;
          case "option3":
            // Option 3 inputs should remain enabled based on available variants that match first and second option group
            if (currentOption1 && variant.option1 === currentOption1.value && currentOption2 && variant.option2 === currentOption2.value) {
              entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
            }
        }
      });
      return options;
    }, {
      option1: [],
      option2: [],
      option3: []
    });
  }
  function handleChange() {
    const currentlySelectedValues = variantSelectors.map(el => {
      return {
        value: el.value,
        index: el.id
      };
    });
    setAvailability(currentlySelectedValues);
  }
  function setAvailability(selectedValues) {
    // Object to hold all options by value.
    // This will be what sets a button/dropdown as
    // sold out or unavailable (not a combo set as purchasable)
    const valuesToManage = createAvailableOptionsTree(productVariants, selectedValues);

    // Loop through all option levels and send each
    // value w/ args to function that determines to show/hide/enable/disable
    for (const [option, values] of Object.entries(valuesToManage)) {
      manageOptionState(option, values);
    }
  }
  function manageOptionState(option, values) {
    const group = n$2(selectors$K.inputWrapWithValue(option), container);

    // Loop through each option value
    values.forEach(obj => {
      toggleVariantOption(group, obj);
    });
  }
  function toggleVariantOption(group, obj) {
    // Selecting by value so escape it
    const value = escapeQuotes(obj.value);

    // Do nothing if the option is a select dropdown
    if (a$1(group, "select-wrapper")) return;
    const button = n$2(selectors$K.buttonWrapWithValue(value), group);
    // Variant exists - enable & show variant
    i$1(button, classes$n.disabled);
    // Variant sold out - cross out option (remains selectable)
    if (obj.soldOut) {
      u$1(button, classes$n.disabled);
    }
  }
  function disableVariantGroup(group) {
    if (a$1(group, "select-wrapper")) return;
    t$2(selectors$K.buttonWrap, group).forEach(button => u$1(button, classes$n.disabled));
  }
  function escapeQuotes(str) {
    const escapeMap = {
      '"': '\\"',
      "'": "\\'"
    };
    return str.replace(/"|'/g, m => escapeMap[m]);
  }
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

const selectors$J = {
  siblingProducts: "[data-sibling-products]",
  siblingSwatch: "[data-sibling-swatch]",
  siblingLabelEl: "[data-sibling-label-value]"
};
function siblingProducts (container) {
  const siblingProducts = n$2(selectors$J.siblingProducts, container);
  if (!siblingProducts) return;
  const siblingSwatches = t$2(selectors$J.siblingSwatch, siblingProducts);
  const labelValueEl = n$2(selectors$J.siblingLabelEl, siblingProducts);
  const baseLabel = labelValueEl.innerText;
  const events = [];
  siblingSwatches.forEach(item => {
    events.push(e$2(item, "mouseout", () => handleOut()), e$2(item, "mouseover", e => handleOver(e)));
  });
  function handleOver(e) {
    const cutline = e.target.dataset.siblingCutline;
    labelValueEl.innerText = cutline;
  }
  function handleOut() {
    if (labelValueEl.innerText !== baseLabel) {
      labelValueEl.innerText = baseLabel;
    }
  }
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

function giftCardRecipient (container) {
  const displayRecipientFormContainer = n$2(".product-form__gift-card-recipient[data-source='product-display']", container);
  const formRecipientFormContainer = n$2(".product-form__gift-card-recipient[data-source='product-form']", container);
  if (!displayRecipientFormContainer || !formRecipientFormContainer) return;
  const sectionID = displayRecipientFormContainer.dataset.sectionId;
  const selectors = {
    display: {
      controlInput: "#display-gift-card-recipient-enable--".concat(sectionID),
      recipientForm: ".gift-card-recipient-fields",
      emailInput: "#display-gift-card-recipient-email--".concat(sectionID),
      nameInput: "#display-gift-card-recipient-name--".concat(sectionID),
      messageInput: "#display-gift-card-recipient-message--".concat(sectionID),
      sendOnInput: "#display-gift-card-recipient-send_on--".concat(sectionID),
      errors: ".product__gift-card-recipient-error"
    },
    form: {
      controlInput: "#form-gift-card-recipient-control--".concat(sectionID),
      emailInput: "#form-gift-card-recipient-email--".concat(sectionID),
      nameInput: "#form-gift-card-recipient-name--".concat(sectionID),
      messageInput: "#form-gift-card-recipient-message--".concat(sectionID),
      sendOnInput: "#form-gift-card-recipient-send_on--".concat(sectionID),
      offsetInput: "#form-gift-card-recipient-timezone-offset--".concat(sectionID)
    }
  };
  const elements = {
    display: {
      controlInput: n$2(selectors.display.controlInput, displayRecipientFormContainer),
      emailInput: n$2(selectors.display.emailInput, displayRecipientFormContainer),
      nameInput: n$2(selectors.display.nameInput, displayRecipientFormContainer),
      messageInput: n$2(selectors.display.messageInput, displayRecipientFormContainer),
      sendOnInput: n$2(selectors.display.sendOnInput, displayRecipientFormContainer),
      recipientForm: n$2(selectors.display.recipientForm, displayRecipientFormContainer),
      errors: t$2(selectors.display.errors, displayRecipientFormContainer)
    },
    form: {
      controlInput: n$2(selectors.form.controlInput, formRecipientFormContainer),
      emailInput: n$2(selectors.form.emailInput, formRecipientFormContainer),
      nameInput: n$2(selectors.form.nameInput, formRecipientFormContainer),
      messageInput: n$2(selectors.form.messageInput, formRecipientFormContainer),
      sendOnInput: n$2(selectors.form.sendOnInput, formRecipientFormContainer),
      offsetInput: n$2(selectors.form.offsetInput, formRecipientFormContainer)
    }
  };

  // Attach each display input to its associated form input
  Object.entries(elements.display).forEach(_ref => {
    let [key, value] = _ref;
    value.controls = elements.form[key];
  });
  const getInputs = type => {
    return [elements[type].emailInput, elements[type].nameInput, elements[type].messageInput, elements[type].sendOnInput];
  };
  const disableableInputs = () => {
    return [...getInputs("form"), elements.form.controlInput, elements.form.offsetInput];
  };
  const clearableInputs = () => {
    return [...getInputs("display"), ...getInputs("form")];
  };
  const disableInputs = (inputs, disable) => {
    inputs.forEach(input => {
      input.disabled = disable;
    });
  };
  const clearInputs = inputs => {
    inputs.forEach(input => {
      input.value = "";
    });
  };
  const clearErrors = () => {
    elements.display.errors.forEach(error => {
      u$1(error, "hidden");
    });
  };
  const handleChange = e => {
    const el = e.target;
    el.controls.value = el.value;
    if (el.type === "checkbox") {
      if (el.checked) {
        elements.display.recipientForm.style.display = "block";
      } else {
        clearInputs(clearableInputs());
        clearErrors();
        elements.display.recipientForm.style.display = "none";
      }
      disableInputs(disableableInputs(), !el.checked);
    }
  };

  // Hide the form version by default - the display version will update the form version inputs
  u$1(formRecipientFormContainer, "visually-hidden");

  // Disable form inputs by default
  disableInputs(disableableInputs(), true);
  elements.form.offsetInput.value = new Date().getTimezoneOffset();

  // Set up listeners for the display inputs
  const events = [e$2(elements.display.controlInput, "change", handleChange)];
  getInputs("display").forEach(input => {
    events.push(e$2(input, "change", handleChange));
  });
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
}

function stickyAtcBar (container) {
  const classes = {
    hidden: "hidden"
  };
  const selectors = {
    buyButtons: ".product-form__item--submit",
    changeOptionButton: "[data-change-option-trigger]",
    imageWrap: ".product__media",
    optionValues: ".sticky-atc-bar__meta-options",
    pageFooter: "footer",
    stickyAtcBar: ".sticky-atc-bar",
    variantSelector: ".product__variants-wrapper"
  };
  const elements = {
    buyButtons: n$2(selectors.buyButtons, container),
    pageFooter: n$2(selectors.pageFooter, document),
    stickyAtcBar: n$2(selectors.stickyAtcBar, container),
    variantSelector: n$2(selectors.variantSelector, container)
  };
  if (elements.stickyAtcBar == null) return;
  elements.imageWrap = n$2(selectors.imageWrap, elements.stickyAtcBar);
  elements.optionValues = n$2(selectors.optionValues, elements.stickyAtcBar);
  elements.changeOptionButton = n$2(selectors.changeOptionButton, elements.stickyAtcBar);
  const events = [];
  if (elements.changeOptionButton) {
    events.push(e$2(elements.changeOptionButton, "click", () => scrollToVariantSelector()));
  }
  let widthWatcher;
  const buyButtonsObserver = new IntersectionObserver(_ref => {
    let [{
      isIntersecting: visible
    }] = _ref;
    if (visible) {
      hideBar();
    } else {
      showBar();
    }
  });
  const footerObserver = new IntersectionObserver(_ref2 => {
    let [{
      isIntersecting: visible
    }] = _ref2;
    if (visible) {
      buyButtonsObserver.disconnect();
      hideBar();
    } else {
      buyButtonsObserver.observe(elements.buyButtons);
    }
  }, {
    threshold: 0.8
  });
  footerObserver.observe(elements.pageFooter);
  const showBar = () => {
    i$1(elements.stickyAtcBar, classes.hidden);
    setHeightVariable();
    widthWatcher = srraf(_ref3 => {
      let {
        pvw,
        vw
      } = _ref3;
      if (pvw !== vw) {
        setHeightVariable();
      }
    });
  };
  const hideBar = () => {
    var _widthWatcher;
    u$1(elements.stickyAtcBar, classes.hidden);
    (_widthWatcher = widthWatcher) === null || _widthWatcher === void 0 || _widthWatcher.destroy();
    clearHeightVariable();
  };
  const setHeightVariable = () => {
    document.documentElement.style.setProperty("--sticky-atc-bar-height", "".concat(elements.stickyAtcBar.offsetHeight, "px"));
  };
  const clearHeightVariable = () => {
    document.documentElement.style.setProperty("--sticky-atc-bar-height", "0px");
  };
  const scrollToVariantSelector = () => {
    elements.variantSelector.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
  };
  const switchCurrentImage = id => {
    switchImage(elements.imageWrap, id);
  };
  const updateOptionValues = variant => {
    const optionValueString = variant.options.join(", ");
    elements.optionValues.textContent = optionValueString;
  };
  const unload = () => {
    var _widthWatcher2;
    buyButtonsObserver === null || buyButtonsObserver === void 0 || buyButtonsObserver.disconnect();
    events.forEach(unsubscribe => unsubscribe());
    footerObserver === null || footerObserver === void 0 || footerObserver.disconnect();
    (_widthWatcher2 = widthWatcher) === null || _widthWatcher2 === void 0 || _widthWatcher2.destroy();
  };
  return {
    switchCurrentImage,
    unload,
    updateOptionValues
  };
}

// LERP returns a number between start and end based on the amt
// Often used to smooth animations
// Eg. Given: start = 0, end = 100
// - if amt = 0.1 then lerp will return 10
// - if amt = 0.5 then lerp will return 50
// - if amt = 0.9 then lerp will return 90
const lerp = (start, end, amt) => {
  return (1 - amt) * start + amt * end;
};

const selectors$I = {
  stickyContainer: "[data-sticky-container]",
  stickyFilterBar: ".filter-bar--sticky",
  root: ":root"
};
const classes$m = {
  hasSticky: "has-sticky-scroll"
};
function stickyScroll (node) {
  const stickyContainer = n$2(selectors$I.stickyContainer, node);
  if (!stickyContainer) return false;
  node.style.setProperty("--sticky-container-top", 0);

  // Init position vars

  let previousScrollY = window.scrollY; // The previous scroll position of the page
  let currentScrollAmount = 0; // To keep track of the amount scrolled per event

  // Height of the header bar
  //  Used for calculating position
  //  Set in `_observeHeight()` when the `--header-desktop-sticky-height` var is set
  let headerHeight = 0;

  // Height of the sticky filter bar
  //  Used for calculating position
  //  Set in `_observeHeight()` when the `--header-desktop-sticky-height` var is set
  let stickyFilterBarHeight = 0;
  const stickyFilterBar = n$2(selectors$I.stickyFilterBar);

  // Save the sticky filter bar height to a CSS variable
  const root = n$2(selectors$I.root, document);
  root.style.setProperty("--sticky-filter-bar-height", "0px");
  let stickyContainerTop = headerHeight; // The sticky container's `top` value
  let stickyContainerTopPrevious = stickyContainerTop;

  // The height of the sticky container
  //  Gets updated by a resize observer on the window and sticky container
  let stickyContainerHeight = stickyContainer.offsetHeight;

  // The height of the sticky container plus the height of the header
  let stickyContainerHeightWithHeaderAndBar = stickyContainerHeight + headerHeight;

  // The max amount for the sticky container `top` value
  //  This is equal to the number of pixels that the sticky container extends the viewport by
  //  Gets updated by a resize observer on the window and sticky container
  let stickyContainerMaxTop = stickyContainerHeightWithHeaderAndBar - window.innerHeight;

  // Watch scroll updates
  const scroller = srraf(_ref => {
    let {
      y
    } = _ref;
    _scrollHandler(y);

    // Update the sticky filter bar height CSS variable
    if (stickyFilterBar) stickyFilterBarHeight = stickyFilterBar.offsetHeight;
    root.style.setProperty("--sticky-filter-bar-height", "".concat(stickyFilterBarHeight, "px"));
  });
  const resizeObserver = new ResizeObserver(_observeHeight);

  // Resize observer on the window and the sticky container
  // Container contents may expand with interaction
  resizeObserver.observe(stickyContainer);
  resizeObserver.observe(document.documentElement);

  // Start the animation loop
  requestAnimationFrame(() => _updateStickyContainerTopLoop());
  function _observeHeight() {
    stickyContainerHeight = stickyContainer.offsetHeight;
    if (stickyFilterBar) stickyFilterBarHeight = stickyFilterBar.offsetHeight;
    headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-desktop-sticky-height").replace(/px/gi, ""));
    stickyContainerHeightWithHeaderAndBar = stickyContainerHeight + headerHeight + stickyFilterBarHeight;
    stickyContainerMaxTop = stickyContainerHeightWithHeaderAndBar - window.innerHeight;

    // Check if the sticky container is taller than the viewport and the node container has room
    // for the sticky container to scroll.
    //  The sticky container could be taller than its sibling so it won't have room to scroll.
    if (stickyContainerHeightWithHeaderAndBar > window.innerHeight && node.offsetHeight > stickyContainerHeightWithHeaderAndBar) {
      u$1(node, classes$m.hasSticky);
      _scrollHandler(window.scrollY);
    } else {
      i$1(node, classes$m.hasSticky);
    }
  }
  function _scrollHandler(y) {
    currentScrollAmount = previousScrollY - y;

    // The offset based on how far the page has been scrolled from last event
    const currentScrollOffset = stickyContainerTop + currentScrollAmount;
    const topMax = headerHeight + stickyFilterBarHeight; // The max top value while scrolling up
    const bottomMax = -stickyContainerMaxTop + headerHeight + stickyFilterBarHeight - 40; // The max top value while scrolling down

    // Find the current top value
    //  Based on the currentScrollOffset value within the range of topMax and bottomMax
    stickyContainerTop = Math.max(bottomMax, Math.min(currentScrollOffset, topMax));

    // Update the previous scroll position for next time.
    previousScrollY = y;
  }

  // This is an endless RAF loop used to update the `--sticky-container-top` CSS var.
  //  We're using this with a LERP function to smooth out the position updating
  //  instead of having large jumps while scrolling fast.
  function _updateStickyContainerTopLoop() {
    // We want to continue to update `--sticky-container-top` until fully into the stopped position
    if (stickyContainerTop !== stickyContainerTopPrevious) {
      stickyContainerTopPrevious = lerp(stickyContainerTopPrevious, stickyContainerTop, 0.5);
      node.style.setProperty("--sticky-container-top", "".concat(stickyContainerTopPrevious, "px"));
    }
    requestAnimationFrame(() => _updateStickyContainerTopLoop());
  }
  function destroy() {
    scroller === null || scroller === void 0 || scroller.destroy();
    resizeObserver === null || resizeObserver === void 0 || resizeObserver.disconnect();
  }
  return {
    destroy
  };
}

const {
  icons: icons$1
} = window.theme;
function productLightbox() {
  const lightboxImages = t$2(".lightbox-image", document);
  if (!lightboxImages.length) return;
  let productLightbox;
  import(flu.chunks.photoswipe).then(_ref => {
    let {
      PhotoSwipeLightbox,
      PhotoSwipe
    } = _ref;
    productLightbox = new PhotoSwipeLightbox({
      gallery: ".lightbox-media-container",
      children: ".product__media-item:not(.swiper-slide-duplicate) .lightbox-image",
      showHideAnimationType: "zoom",
      pswpModule: PhotoSwipe,
      mainClass: "pswp--product-lightbox",
      bgOpacity: 1,
      arrowPrevSVG: icons$1.chevron,
      arrowNextSVG: icons$1.chevron,
      closeSVG: icons$1.close,
      zoomSVG: icons$1.zoom
    });
    productLightbox.init();

    // Hide nav ui elements if single image
    productLightbox.on("firstUpdate", () => {
      const {
        pswp,
        options
      } = productLightbox;
      const productImageCount = options.dataSource.items.length;
      if (productImageCount === 1) {
        u$1(pswp.element, "pswp--is-single-image");
      }
    });
  });
}

const selectors$H = {
  unitPriceContainer: "[data-unit-price-container]",
  unitPrice: "[data-unit-price]",
  unitPriceBase: "[data-unit-base]"
};
const classes$l = {
  available: "unit-price--available"
};
const updateUnitPrices = (container, variant) => {
  const unitPriceContainers = t$2(selectors$H.unitPriceContainer, container);
  const unitPrices = t$2(selectors$H.unitPrice, container);
  const unitPriceBases = t$2(selectors$H.unitPriceBase, container);
  const showUnitPricing = !variant || !variant.unit_price;
  l(unitPriceContainers, classes$l.available, !showUnitPricing);
  if (!variant || !variant.unit_price) return;
  _replaceText(unitPrices, formatMoney(variant.unit_price));
  _replaceText(unitPriceBases, _getBaseUnit(variant.unit_price_measurement));
};
const _getBaseUnit = unitPriceMeasurement => {
  return unitPriceMeasurement.reference_value === 1 ? unitPriceMeasurement.reference_unit : unitPriceMeasurement.reference_value + unitPriceMeasurement.reference_unit;
};
const _replaceText = (nodeList, replacementText) => {
  nodeList.forEach(node => node.innerText = replacementText);
};

const ls = {
  get: () => JSON.parse(localStorage.getItem("fluco_sto_recentlyViewed")),
  set: val => localStorage.setItem("fluco_sto_recentlyViewed", JSON.stringify(val))
};
const updateRecentProducts = productHandle => {
  let recentlyViewed = [];
  if (ls.get() !== null) {
    recentlyViewed = ls.get().filter(storedHandle => storedHandle !== productHandle);
    recentlyViewed.unshift(productHandle);
    ls.set(recentlyViewed.slice(0, 16)); // 1 extra product to account for itself
  } else if (ls.get() === null) {
    recentlyViewed.push(productHandle);
    ls.set(recentlyViewed);
  }
};
const getRecentProducts = () => ls.get();

const storeAvailability = (container, product, variant) => {
  const update = variant => {
    container.innerHTML = "";
    if (!variant) return;
    const variantSectionUrl = "".concat(container.dataset.baseUrl, "/variants/").concat(variant.id, "/?section_id=store-availability");
    makeRequest("GET", variantSectionUrl).then(storeAvailabilityHTML => {
      if (storeAvailabilityHTML.trim() === "") return;

      // Remove section wrapper that throws nested sections error
      container.innerHTML = storeAvailabilityHTML.trim();
      container.innerHTML = container.firstElementChild.innerHTML;
      container.setAttribute("data-variant-id", variant.id);
      container.setAttribute("data-product-title", product.title);
      container.setAttribute("data-variant-title", variant.public_title);
    });
  };

  // Intialize
  update(variant);
  const unload = () => {
    container.innerHTML = "";
  };
  return {
    unload,
    update
  };
};

var _window$flu$states$2;
const selectors$G = {
  form: "[data-product-form]",
  addToCart: "[data-add-to-cart]",
  variantSelect: "[data-variant-select]",
  optionById: id => "[value='".concat(id, "']"),
  thumbs: "[data-product-thumbnails]",
  thumb: "[data-product-thumbnail]",
  thumbActive: "[data-product-thumbnail].active",
  thumbById: id => "[data-product-thumbnail][data-thumbnail-id='".concat(id, "']"),
  thumbListItemById: id => ".product-thumbnails__item[data-thumbnail-id='".concat(id, "']"),
  storeAvailability: "[data-store-availability-container]",
  quantityError: "[data-quantity-error]",
  productOption: ".product__option",
  optionLabelValue: "[data-selected-value-for-option]",
  displayedDiscount: "[data-discount-display]",
  displayedDiscountByVariantId: id => "[variant-discount-display][variant-id=\"".concat(id, "\"]"),
  nonSprRatingCountLink: ".product__rating-count-potential-link",
  mediaContainer: ".product__media-container",
  mediaContainerMobile: ".product__media-container.below-mobile",
  mobileCarousel: ".product__media-container.below-mobile.carousel",
  mediaContainerDesktop: ".product__media-container.above-mobile",
  mobileFeaturedImage: ".carousel_slide[data-is-featured='true']",
  priceWrapper: ".product__price",
  quickCart: ".quick-cart",
  purchaseConfirmation: ".purchase-confirmation-popup",
  productReviews: "#shopify-product-reviews",
  customOptionInputs: "[data-custom-option-input]",
  customOptionInputTargetsById: id => "[data-custom-option-target='".concat(id, "']"),
  giftCardRecipientContainer: ".product-form__gift-card-recipient",
  productMedia: "[data-product-media]",
  moreMediaButton: "[data-more-media]",
  header: "[data-section-type='header']",
  shouldAutoCollapse: '.product-accordion-group[data-auto-collapse="true"]'
};
const useCustomEvents$2 = (_window$flu$states$2 = window.flu.states) === null || _window$flu$states$2 === void 0 ? void 0 : _window$flu$states$2.useCustomEvents;
class Product {
  constructor(node) {
    this.container = node;
    const {
      isQuickView,
      isFullProduct,
      isFeaturedProduct,
      enableStickyContainer,
      loopMobileCarousel,
      hideMobileCarouselDots,
      enableMultipleVariantMedia,
      initialMediaId,
      sectionId,
      productHandle
    } = this.container.dataset;
    this.isQuickView = isQuickView === "true";
    // Note: isFullProduct = Featured Product section and Main product (excludes quickview)
    this.isFullProduct = isFullProduct === "true";
    this.isFeaturedProduct = isFeaturedProduct === "true";
    this.loopMobileCarousel = loopMobileCarousel === "true";
    this.hideMobileCarouselDots = hideMobileCarouselDots === "true";
    this.enableMultipleVariantMedia = enableMultipleVariantMedia;
    this.previousMediaId = initialMediaId;
    this.sectionId = sectionId;
    this.productHandle = productHandle;
    this.formElement = n$2(selectors$G.form, this.container);
    this.quantityError = n$2(selectors$G.quantityError, this.container);
    this.displayedDiscount = n$2(selectors$G.displayedDiscount, this.container);
    this.viewInYourSpace = n$2("[data-in-your-space]", this.container);
    this.viewInYourSpace && l(this.viewInYourSpace, "visible", isMobile$1());
    this.mediaContainerDesktop = n$2(selectors$G.mediaContainerDesktop, this.container);
    this.mobileQuery = window.matchMedia(getMediaQuery("below-960"));
    this.breakPointHandler = atBreakpointChange(960, () => {
      if (this.isFullProduct) {
        if (this.mobileQuery.matches) {
          this._initPhotoCarousel();
        } else {
          var _this$mobileSwiper;
          (_this$mobileSwiper = this.mobileSwiper) === null || _this$mobileSwiper === void 0 || _this$mobileSwiper.destroy();
        }
      }
      this._initStickyScroll();
    });
    this._initThumbnails();

    // Handle Surface pickup
    this.storeAvailabilityContainer = n$2(selectors$G.storeAvailability, this.container);
    this.availability = null;

    // Handle Shopify Product Reviews if they exist as a product block
    this.reviewsHandler = reviewsHandler(n$2(selectors$G.productReviews, this.container), this.container);

    // // non-SPR rating display
    let nonSprRatingCount = n$2(selectors$G.nonSprRatingCountLink, this.container);
    if (nonSprRatingCount && !n$2(selectors$G.productReviews, document)) {
      // The rating count links to "#shopify-product-reviews" but
      // if that block doesn't exist we should remove the link
      nonSprRatingCount.removeAttribute("href");
    }
    if (this.formElement) {
      const {
        productHandle,
        currentProductId
      } = this.formElement.dataset;
      const product = getProduct(productHandle);
      product(data => {
        var _variant$featured_med;
        const variant = getVariantFromId(data, parseInt(currentProductId));
        if (this.storeAvailabilityContainer && variant) {
          this.availability = storeAvailability(this.storeAvailabilityContainer, data, variant);
        }
        this.productForm = ProductForm(this.container, this.formElement, data, {
          onOptionChange: e => this.onOptionChange(e),
          onFormSubmit: e => this.onFormSubmit(e),
          onQuantityChange: e => this.onQuantityChange(e)
        });
        if (this.productThumbnailsScrollers.length && ((_variant$featured_med = variant.featured_media) === null || _variant$featured_med === void 0 ? void 0 : _variant$featured_med.id) == initialMediaId) {
          this.scrollThumbnailsToVariant(variant);
        }
        const productInventoryJson = n$2("[data-product-inventory-json]", this.container);
        if (productInventoryJson) {
          const jsonData = JSON.parse(productInventoryJson.innerHTML);
          const variantsInventories = jsonData.inventory;
          if (variantsInventories) {
            const config = {
              id: variant.id,
              variantsInventories
            };
            this.inventoryCounter = inventoryCounter(this.container, config);
          }
        }
      });
    }
    this.quantityInput = quantityInput(this.container);
    this.customOptionInputs = t$2(selectors$G.customOptionInputs, this.container);
    this.socialButtons = t$2("[data-social-share]", this.container);
    this.featuredProducts = featuredProducts(this.container);
    if (enableStickyContainer === "true") {
      this._initStickyScroll();
    }
    this._loadAccordions();
    this.optionButtons = OptionButtons(t$2("[data-option-buttons]", this.container));
    this.informationPopup = informationPopup(this.container);
    const productDescriptionWrapper = n$2(".product__description", this.container);
    if (productDescriptionWrapper) {
      wrapIframes(t$2("iframe", productDescriptionWrapper));
      wrapTables(t$2("table", productDescriptionWrapper));
    }
    const socialShareContainer = n$2(".social-share", this.container);
    if (socialShareContainer) {
      this.socialShare = SocialShare(socialShareContainer);
    }
    if (this.isFullProduct && this.productHandle) {
      updateRecentProducts(this.productHandle);
    }
    loadMediaFeatures().then(() => {
      this._loadMedia();
    });
    this._initEvents();

    // Handle dynamic variant options
    this.variantAvailability = variantAvailability(this.container);

    // Handle sibling products
    this.siblingProducts = siblingProducts(this.container);

    // Gift card recipient
    this.giftCardRecipient = giftCardRecipient(this.container);

    // Sticky ATC Bar
    this.stickyAtcBar = stickyAtcBar(this.container);

    // Header info for auto-collapse rows
    this.header = n$2(selectors$G.header, document);
    this.isStickyHeader = this.header.dataset.enableStickyHeader === "true";

    // Auto-collapse rows
    this.shouldAutoCollapse = this.container.querySelector(selectors$G.shouldAutoCollapse);
    if (this.shouldAutoCollapse) {
      this._autoCollapseRows();
    }
  }
  _initEvents() {
    this.events = [];
    if (this.productThumbnailItems.length) {
      // This will handle either desktop or mobile thumbnails
      this.events.push(e$2(this.productThumbnailItems, "click", e => {
        e.preventDefault();
        const {
          currentTarget: {
            dataset
          }
        } = e;
        this._switchCurrentImage(dataset.thumbnailId, this.viewInYourSpace);
      }));
    }

    // Adds listeners for each custom option, to sync input changes
    if (this.customOptionInputs) {
      this.customOptionInputs.forEach(input => {
        const id = input.dataset.customOptionInput;
        const target = n$2(selectors$G.customOptionInputTargetsById(id), this.container);
        this.events.push(e$2(input, "change", e => {
          // Update the hidden input within the form, per type
          if (e.target.type === "checkbox") {
            target.checked = e.target.checked;
          } else {
            target.value = e.target.value;
          }
        }));
      });
    }
  }
  _initStickyScroll() {
    if (this.mobileQuery.matches) {
      if (this.stickyScroll) {
        this.stickyScroll.destroy();
        this.stickyScroll = null;
      }
    } else if (!this.stickyScroll) {
      this.stickyScroll = stickyScroll(this.container);
    }
  }
  _initPhotoCarousel() {
    let swiperWrapper = n$2(selectors$G.mobileCarousel, this.container);
    if (!swiperWrapper) {
      return;
    }
    const mobileFeaturedImage = n$2(selectors$G.mobileFeaturedImage, swiperWrapper);
    const initialSlide = mobileFeaturedImage ? parseInt(mobileFeaturedImage.dataset.slideIndex) : 0;
    import(flu.chunks.swiper).then(_ref => {
      let {
        Swiper,
        Pagination
      } = _ref;
      this.mobileSwiper = new Swiper(swiperWrapper, {
        modules: [Pagination],
        slidesPerView: 1,
        spaceBetween: 4,
        grabCursor: true,
        pagination: this.hideMobileCarouselDots ? {} : {
          el: ".swiper-pagination",
          type: "bullets",
          dynamicBullets: true,
          dynamicMainBullets: 7,
          clickable: true
        },
        watchSlidesProgress: true,
        loop: this.loopMobileCarousel,
        autoHeight: true,
        initialSlide: initialSlide
      });
      this.mobileSwiper.on("slideChange", evt => {
        var _this$mediaContainers;
        if (this.viewInYourSpace) {
          const activeSlide = evt.slides[evt.activeIndex];
          if (activeSlide.dataset.mediaType === "model") {
            this.viewInYourSpace.setAttribute("data-shopify-model3d-id", activeSlide.dataset.mediaItemId);
          }
        }
        (_this$mediaContainers = this.mediaContainersMobile) === null || _this$mediaContainers === void 0 || _this$mediaContainers.pauseActiveMedia();
      });
    });
  }
  _initThumbnails() {
    this.productThumbnailItems = t$2(selectors$G.thumb, this.container);
    this.productThumbnailsScrollers = [];
    t$2(selectors$G.thumbs, this.container).forEach(element => {
      this.productThumbnailsScrollers.push(scrollContainer(element));
    });
  }
  _loadMedia() {
    this.mobileMedia = n$2(selectors$G.mediaContainerMobile, this.container);
    this.desktopMedia = n$2(selectors$G.mediaContainerDesktop, this.container);
    this.mobileMoreMedia = moreMedia(this.mobileMedia);
    this.desktopMoreMedia = moreMedia(this.desktopMedia);
    this.mediaContainers = Media(this.desktopMedia);
    this.mediaContainersMobile = Media(this.mobileMedia);
    this._initThumbnails();
    productLightbox();
    if (this.isFullProduct && this.mobileQuery.matches) {
      this._initPhotoCarousel();
    }
  }
  _loadAccordions() {
    this.accordions = [];
    const accordionElements = t$2(".accordion", this.container);
    accordionElements.forEach(accordion => {
      const accordionOpen = accordion.classList.contains("accordion--open");
      this.accordions.push(Accordions(accordion, {
        firstOpen: accordionOpen
      }));
      const accordionParent = accordion.parentElement;
      if (accordionParent.classList.contains("rte--product") && !accordionParent.classList.contains("accordion accordion--product")) {
        accordion.classList.add("rte--product", "accordion--product");
      }
    });
  }
  _autoCollapseRows() {
    const groups = t$2('.product-accordion-group[data-auto-collapse="true"]', this.container);
    const leftColumnGroups = [];
    const rightColumnGroups = [];
    groups.forEach(group => {
      const groupAccordionLabels = t$2(".accordion__label", group);
      if (!groupAccordionLabels.length) return;

      // There are 2 containers we care about with product blocks:
      //  - `product__top`
      //     - This holds the left and right column blocks, but the left column only displays on desktop
      //  - `product__bottom`
      //     - This holds the left column blocks so they can be displayed below the right column blocks on mobile
      //
      // Due to this structure, we're basically saying that there are 2 "column groups":
      //   - The left column
      //   - The right column
      //   - This also includes the mobile version of the left column
      //
      // As a result, the left and right column blocks will auto-close rows within their respective columns on desktop.
      // On mobile, the left and right columns are technically combined into the right column.
      if (group.closest(".product__primary-left")) {
        leftColumnGroups.push({
          group,
          groupAccordionLabels
        });
      } else {
        rightColumnGroups.push({
          group,
          groupAccordionLabels
        });
      }
      const onAutoCollapseClick = event => {
        const label = event.currentTarget;
        const content = label.nextElementSibling;
        if (!content) return; // no content
        if (isVisible(content)) return; // already open

        // Determine which column the current target is in and close any rows from groups in
        // the same column, as well as any other rows in the same group
        const currentColumnGroups = group.closest(".product__primary-left") ? leftColumnGroups : rightColumnGroups;

        // close any open rows in the same column
        currentColumnGroups.forEach(_ref2 => {
          let {
            group: columnGroup,
            groupAccordionLabels: columnGroupLabels
          } = _ref2;
          columnGroupLabels.forEach(columnLabel => {
            if (columnGroup === group && columnLabel === label) return;
            const columnContent = columnLabel.nextElementSibling;
            if (columnContent && isVisible(columnContent)) {
              this._closeOpenGroups(columnLabel, columnLabel.parentNode, columnContent);
            }
          });
        });
        setTimeout(() => {
          if (this._isInView(label) === false) {
            label.scrollIntoView({
              block: "start",
              behavior: "smooth"
            });
          }
        }, 200);
      };
      this.events.push(e$2(groupAccordionLabels, "click", onAutoCollapseClick));
    });
  }
  _closeOpenGroups(label, group, content) {
    slideStop(content);
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  }
  _isInView(element) {
    let headerHeight = 0;
    let mobileHeaderHeight = 0;
    let announcementHeight = 0;
    if (this.isStickyHeader) {
      //desktop
      headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-desktop-sticky-height").replace(/px/gi, ""));

      //mobile
      mobileHeaderHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--height-header").replace(/px/gi, ""));
      announcementHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--announcement-height").replace(/px/gi, ""));

      // set vars to use for scroll-margin-top on mobile.
      document.documentElement.style.setProperty("--mobile-sticky-header-height", "".concat(mobileHeaderHeight, "px"));
      document.documentElement.style.setProperty("--mobile-sticky-announcement-height", "".concat(announcementHeight, "px"));

      // On mobile '--header-desktop-sticky-height' is '0' so we have to set the headerHeight using the
      // using the mobile vars for proper in view calculation on mobile.
      if (headerHeight === 0) {
        headerHeight = mobileHeaderHeight + announcementHeight;
      }
    }
    const rect = element.getBoundingClientRect();
    return rect.top >= headerHeight && rect.bottom <= window.innerHeight;
  }
  _switchCurrentImage(id, viewInYourSpaceEl) {
    var _this$mediaContainers2, _this$mediaContainers3;
    (_this$mediaContainers2 = this.mediaContainersMobile) === null || _this$mediaContainers2 === void 0 || _this$mediaContainers2.pauseActiveMedia();
    (_this$mediaContainers3 = this.mediaContainers) === null || _this$mediaContainers3 === void 0 || _this$mediaContainers3.pauseActiveMedia();
    const mediaContainers = t$2(".product__media-container", this.container);
    mediaContainers.forEach(mediaContainer => {
      const galleryStyle = mediaContainer.getAttribute("data-gallery-style");
      if (galleryStyle === "thumbnails") {
        var _mediaContainer$query;
        // Remove active class from thumbnails
        mediaContainer.querySelectorAll(selectors$G.thumbActive).forEach(thumb => {
          thumb.classList.remove("active");
        });

        // Add active class to thumbnail
        (_mediaContainer$query = mediaContainer.querySelector(selectors$G.thumbById(id))) === null || _mediaContainer$query === void 0 || _mediaContainer$query.classList.add("active");
      }
      if (galleryStyle === "thumbnails" || this.isFeaturedProduct || this.isQuickView) {
        // Swap main image
        switchImage(mediaContainer.querySelector(".product__media"), id, viewInYourSpaceEl);
      }
    });
  }
  _refreshOverviewWithVariant(variant_id) {
    const requestURL = "".concat(window.location.pathname, "?section_id=").concat(this.sectionId, "&variant=").concat(variant_id);
    const target = n$2(".product__primary-left", this.container);
    const mediaContainers = t$2("".concat(selectors$G.mediaContainerDesktop, ", ").concat(selectors$G.mediaContainerMobile), target);
    mediaContainers.forEach(container => {
      u$1(container, "loading");
    });
    fetch(requestURL).then(response => response.text()).then(text => {
      var _this$featuredProduct;
      const source = new DOMParser().parseFromString(text, "text/html").querySelector(".product__primary-left");
      target.innerHTML = source.innerHTML;

      // unload left column components
      this._unloadMedia();
      this.accordions.forEach(accordion => accordion.unload());
      (_this$featuredProduct = this.featuredProducts) === null || _this$featuredProduct === void 0 || _this$featuredProduct.unload();
      this.events.forEach(unsubscribe => unsubscribe());

      // re-initialize left column components
      this._loadMedia();
      this._loadAccordions();
      this.featuredProducts = featuredProducts(this.container);
      this._initEvents();
      if (this.shouldAutoCollapse) {
        this._autoCollapseRows();
      }
    }).catch(error => {
      throw error;
    });
  }

  // When the user changes a product option
  onOptionChange(_ref3) {
    let {
      dataset: {
        variant
      },
      srcElement
    } = _ref3;
    // Update option label
    const optionParentWrapper = srcElement.closest(selectors$G.productOption);
    const optionLabel = n$2(selectors$G.optionLabelValue, optionParentWrapper);
    if (optionLabel) {
      optionLabel.textContent = srcElement.value;
    }
    const buyButtonEls = t$2(selectors$G.addToCart, this.container);
    const priceWrapper = n$2(selectors$G.priceWrapper, this.container);
    priceWrapper && l(priceWrapper, "hide", !variant);

    // Update prices to reflect selected variant
    updatePrices(this.container, variant, this.isFullProduct);

    // Update buy button
    buyButtonEls.forEach(buyButton => {
      updateBuyButton(buyButton, variant);
    });

    // Update unit pricing
    updateUnitPrices(this.container, variant);

    // Update sku
    updateSku(this.container, variant);

    // Update product availability content
    this.availability && this.availability.update(variant);

    // Update displayed discount
    if (this.displayedDiscount) {
      const newDiscountEl = variant && n$2(selectors$G.displayedDiscountByVariantId(variant.id), this.container);
      if (variant && newDiscountEl) {
        this.displayedDiscount.textContent = newDiscountEl.textContent;
      } else {
        this.displayedDiscount.textContent = "";
      }
    }
    this.inventoryCounter && this.inventoryCounter.update(variant);
    if (useCustomEvents$2) {
      dispatchCustomEvent("product:variant-change", {
        variant: variant
      });
    }
    if (!variant) {
      updateBuyButton(n$2("[data-add-to-cart]", this.container), false);
      this.availability && this.availability.unload();
      return;
    }

    // Update URL with selected variant
    const url = getUrlWithVariant(window.location.href, variant.id);
    window.history.replaceState({
      path: url
    }, "", url);

    // We need to set the id input manually so the Dynamic Checkout Button works
    const selectedVariantOpt = n$2("".concat(selectors$G.variantSelect, " ").concat(selectors$G.optionById(variant.id)), this.container);
    selectedVariantOpt.selected = true;

    // We need to dispatch an event so Shopify pay knows the form has changed
    this.formElement.dispatchEvent(new Event("change"));

    // Update selected variant image and thumb
    if (variant.featured_media) {
      if (this.enableMultipleVariantMedia === "true" && variant.featured_media.id != this.previousMediaId) {
        this._refreshOverviewWithVariant(variant.id);
        this.previousMediaId = variant.featured_media.id;
      } else if (this.isFullProduct) {
        if (this.mobileSwiper && !this.mobileSwiper.destroyed) {
          const slidesWrap = this.mobileSwiper.el;
          const targetSlide = n$2("[data-media-item-id=\"".concat(variant.featured_media.id, "\"]"), slidesWrap);
          if (targetSlide) {
            const targetSlideIndex = [...targetSlide.parentElement.children].indexOf(targetSlide);
            this.mobileSwiper.slideTo(targetSlideIndex);
          }
        } else {
          const imagesWrappers = t$2(".product__media-container");
          imagesWrappers.forEach(imagesWrap => {
            if (imagesWrap.dataset.galleryStyle === "thumbnails") {
              this._switchCurrentImage(variant.featured_media.id);
              this.scrollThumbnailsToVariant(variant);
            } else {
              if (this.isFeaturedProduct) {
                this._switchCurrentImage(variant.featured_media.id);
              } else {
                const targetImage = n$2("[data-media-id=\"".concat(variant.featured_media.id, "\"]"), imagesWrap);
                const moreMediaButton = n$2(selectors$G.moreMediaButton, imagesWrap);
                const productMedia = n$2(selectors$G.productMedia, imagesWrap);
                let visibleVariantImage = true;
                if (moreMediaButton) {
                  const mediaLimit = parseInt(productMedia.dataset.mediaLimit);
                  visibleVariantImage = productMedia.dataset.productMedia === "open" || mediaLimit >= variant.featured_media.position;
                }
                if (!moreMediaButton || visibleVariantImage) {
                  targetImage === null || targetImage === void 0 || targetImage.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                    inline: "nearest"
                  });
                } else if (!visibleVariantImage) {
                  if (imagesWrap.classList.contains("below-mobile")) {
                    this.mobileMoreMedia.open(targetImage, true);
                  } else {
                    this.desktopMoreMedia.open(targetImage, true);
                  }
                }
              }
            }
          });
        }
      } else {
        this._switchCurrentImage(variant.featured_media.id);
      }
    }

    // Update sticky add-to-cart variant image and option values
    if (this.stickyAtcBar) {
      if (variant.featured_media) {
        this.stickyAtcBar.switchCurrentImage(variant.featured_media.id);
      }
      this.stickyAtcBar.updateOptionValues(variant);
    }
  }
  scrollThumbnailsToVariant(variant) {
    if (!variant.featured_media) return;
    this.productThumbnailsScrollers.forEach(scroller => {
      scroller.scrollToSelector(selectors$G.thumbListItemById(variant.featured_media.id));
    });
  }

  // When user updates quantity
  onQuantityChange(_ref4) {
    let {
      dataset: {
        variant,
        quantity
      }
    } = _ref4;
    // Adjust the hidden quantity input within the form
    const quantityInputs = [...t$2('[name="quantity"]', this.formElement)];
    quantityInputs.forEach(quantityInput => {
      quantityInput.value = quantity;
    });
    if (useCustomEvents$2) {
      dispatchCustomEvent("product:quantity-update", {
        quantity: quantity,
        variant: variant
      });
    }
  }

  // When user submits the product form
  onFormSubmit(e) {
    const purchaseConfirmation = n$2(selectors$G.purchaseConfirmation, document);
    const quickCart = n$2(selectors$G.quickCart, document);
    const buttonEls = t$2(selectors$G.addToCart, this.container);
    buttonEls.forEach(button => {
      u$1(button, "loading");
    });

    // if quick cart and confirmation popup are enable submit form
    if (!purchaseConfirmation && !quickCart) return;
    e.preventDefault();
    u$1(this.quantityError, "hidden");
    cart.addItem(this.formElement).then(_ref5 => {
      let {
        item
      } = _ref5;
      buttonEls.forEach(button => {
        i$1(button, "loading");
      });
      if (purchaseConfirmation) {
        r$1("confirmation-popup:open", null, {
          product: item
        });
      } else {
        r$1("quick-cart:updated");
        // Need a delay to allow quick-cart to refresh
        setTimeout(() => {
          r$1("quick-cart:open");
        }, 300);
      }
      if (useCustomEvents$2) {
        dispatchCustomEvent("cart:item-added", {
          product: item
        });
      }
    }).catch(error => {
      cart.get(); // update local cart data
      if (error && error.message) {
        if (typeof error.message === "object") {
          const sectionID = n$2(selectors$G.giftCardRecipientContainer, this.container).dataset.sectionId;
          Object.entries(error.message).forEach(_ref6 => {
            let [key, value] = _ref6;
            const errorMessageID = "display-gift-card-recipient-".concat(key, "-error--").concat(sectionID);
            const errorMessage = n$2("#".concat(errorMessageID), this.container);
            const errorInput = n$2("#display-gift-card-recipient-".concat(key, "--").concat(sectionID), this.container);
            errorMessage.innerText = value;
            i$1(errorMessage, "hidden");
            errorInput.setAttribute("aria-invalid", true);
            errorInput.setAttribute("aria-describedby", errorMessageID);
          });
        } else {
          this.quantityError.innerText = error.message;
          i$1(this.quantityError, "hidden");
        }
      } else {
        this.quantityError.innerText = this.quantityError.getAttribute("data-fallback-error-message");
        i$1(this.quantityError, "hidden");
      }
      const buttonEls = t$2(selectors$G.addToCart, this.container);
      buttonEls.forEach(button => {
        i$1(button, "loading");
      });
    });
  }
  _unloadMedia() {
    var _this$mobileMoreMedia, _this$desktopMoreMedi, _this$mobileSwiper2;
    (_this$mobileMoreMedia = this.mobileMoreMedia) === null || _this$mobileMoreMedia === void 0 || _this$mobileMoreMedia.unload();
    (_this$desktopMoreMedi = this.desktopMoreMedia) === null || _this$desktopMoreMedi === void 0 || _this$desktopMoreMedi.unload();
    (_this$mobileSwiper2 = this.mobileSwiper) === null || _this$mobileSwiper2 === void 0 || _this$mobileSwiper2.destroy();
    this.productThumbnailsScrollers.forEach(scroller => scroller.unload());
  }
  unload() {
    var _this$quantityInput, _this$stickyScroll, _this$mobileMoreMedia2, _this$desktopMoreMedi2, _this$featuredProduct2, _this$variantAvailabi, _this$siblingProducts, _this$giftCardRecipie, _this$stickyAtcBar;
    this._unloadMedia();
    this.productForm.destroy();
    this.accordions.forEach(accordion => accordion.unload());
    this.optionButtons.destroy();
    (_this$quantityInput = this.quantityInput) === null || _this$quantityInput === void 0 || _this$quantityInput.unload();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$stickyScroll = this.stickyScroll) === null || _this$stickyScroll === void 0 || _this$stickyScroll.destroy();
    (_this$mobileMoreMedia2 = this.mobileMoreMedia) === null || _this$mobileMoreMedia2 === void 0 || _this$mobileMoreMedia2.unload();
    (_this$desktopMoreMedi2 = this.desktopMoreMedia) === null || _this$desktopMoreMedi2 === void 0 || _this$desktopMoreMedi2.unload();
    (_this$featuredProduct2 = this.featuredProducts) === null || _this$featuredProduct2 === void 0 || _this$featuredProduct2.unload();
    (_this$variantAvailabi = this.variantAvailability) === null || _this$variantAvailabi === void 0 || _this$variantAvailabi.unload();
    (_this$siblingProducts = this.siblingProducts) === null || _this$siblingProducts === void 0 || _this$siblingProducts.unload();
    (_this$giftCardRecipie = this.giftCardRecipient) === null || _this$giftCardRecipie === void 0 || _this$giftCardRecipie.unload();
    (_this$stickyAtcBar = this.stickyAtcBar) === null || _this$stickyAtcBar === void 0 || _this$stickyAtcBar.unload();
  }
}

var _window$flu$states$1;
const classes$k = {
  visible: "is-visible",
  active: "active",
  fixed: "is-fixed"
};
const selectors$F = {
  closeBtn: "[data-modal-close]",
  wash: ".modal__wash",
  modalContent: ".quick-view-modal__content",
  loadingMessage: ".quick-view-modal-loading-indicator",
  siblingSwatch: ".product__color-swatch--sibling-product"
};
const useCustomEvents$1 = (_window$flu$states$1 = window.flu.states) === null || _window$flu$states$1 === void 0 ? void 0 : _window$flu$states$1.useCustomEvents;
const quickViewModal = node => {
  const focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const wash = n$2(selectors$F.wash, node);
  const closeButton = n$2(selectors$F.closeBtn, node);
  const modalContent = n$2(selectors$F.modalContent, node);
  const loadingMessage = n$2(selectors$F.loadingMessage, node);
  let quickViewAnimation = null;
  if (shouldAnimate(node)) {
    quickViewAnimation = animateQuickView(node);
  }
  let product;
  const events = [e$2([wash, closeButton], "click", e => {
    e.preventDefault();
    _close();
  }), e$2(node, "keydown", _ref => {
    let {
      keyCode
    } = _ref;
    if (keyCode === 27) _close();
  }), c("quick-view:open", (state, _ref2) => {
    let {
      productUrl
    } = _ref2;
    _renderProductContent(productUrl);
    _open();
  }), c("quick-view:close", () => {
    _close();
  }), c("quick-view:refresh", (state, _ref3) => {
    let {
      productUrl
    } = _ref3;
    _renderProductContent(productUrl);
  })];
  const _renderProductContent = productUrl => {
    const xhrUrl = "".concat(productUrl).concat(productUrl.includes("?") ? "&" : "?", "view=quick-view");
    makeRequest("GET", xhrUrl).then(response => {
      let container = document.createElement("div");
      container.innerHTML = response;
      const productElement = n$2("[data-is-quick-view]", container);
      const siblingElements = t$2(selectors$F.siblingSwatch, container);
      siblingElements.forEach(sibling => {
        const productUrl = sibling.pathname;
        e$2(sibling, "click", e => {
          e.preventDefault();
          e.stopPropagation();
          r$1("quick-view:refresh", null, {
            productUrl: productUrl
          });
        });
      });
      i$1(modalContent, "empty");
      modalContent.innerHTML = "";
      modalContent.appendChild(productElement);
      const renderedProductElement = n$2("[data-is-quick-view]", modalContent);
      if (shouldAnimate(node)) {
        quickViewAnimation.animate();
      }
      product = new Product(renderedProductElement);
      if (useCustomEvents$1) {
        dispatchCustomEvent("quickview:loaded");
      }
    });
  };
  const _open = () => {
    u$1(node, classes$k.fixed);
    setTimeout(() => {
      u$1(node, classes$k.active);
      setTimeout(() => {
        u$1(node, classes$k.visible);
        focusTrap.activate();
      }, 50);
    }, 50);
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  };
  const _close = () => {
    focusTrap.deactivate();
    i$1(node, classes$k.visible);
    i$1(node, classes$k.active);
    document.body.setAttribute("data-fluorescent-overlay-open", "false");
    enableBodyScroll(node);
    r$1("quick-cart:scrollup");
    setTimeout(() => {
      var _product;
      i$1(node, classes$k.fixed);
      if (shouldAnimate(node)) {
        quickViewAnimation.reset();
      }
      modalContent.innerHTML = "";
      modalContent.appendChild(loadingMessage);
      u$1(modalContent, "empty");
      (_product = product) === null || _product === void 0 || _product.unload();
    }, 500);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    unload
  };
};

const classes$j = {
  visible: "is-visible"
};
const flashAlertModal = node => {
  // Setup all preassigned liquid flash alerts
  if (window.Shopify.designMode) {
    const delegate = new Delegate(document.body);
    delegate.on("click", "[data-flash-trigger]", (_, target) => {
      const {
        flashMessage
      } = target.dataset;
      _open(flashMessage);
    });
  }
  c("flart-alert", _ref => {
    let {
      alert
    } = _ref;
    _open(alert);
  });
  const _open = alertMessage => {
    if (!alertMessage) return;
    const messageContainer = n$2(".flash-alert__container", node);
    messageContainer.innerText = alertMessage;
    u$1(node, classes$j.visible);
    messageContainer.addEventListener("animationend", () => {
      i$1(node, classes$j.visible);
    }, {
      once: true
    });
  };
};

const selectors$E = {
  innerOverlay: ".header-overlay__inner"
};
const classes$i = {
  isVisible: "is-visible",
  isActive: "is-active"
};
const events = {
  show: "headerOverlay:show",
  hide: "headerOverlay:hide",
  hiding: "headerOverlay:hiding"
};
const headerOverlay = node => {
  if (!node) return;
  const overlay = node;
  const overlayInner = node.querySelector(selectors$E.innerOverlay);
  const overlayShowListener = c(events.show, () => _showOverlay());
  const overlayHideListener = c(events.hide, () => _hideOverlay());
  const _showOverlay = () => {
    o$1({
      headerOverlayOpen: true
    });
    overlay.classList.add(classes$i.isActive);
    setTimeout(() => {
      overlayInner.classList.add(classes$i.isVisible);
    }, 0);
  };
  const _hideOverlay = () => {
    o$1({
      headerOverlayOpen: false
    });
    r$1(events.hiding);
    overlayInner.classList.remove(classes$i.isVisible);
    setTimeout(() => {
      overlay.classList.remove(classes$i.isActive);
    }, 0);
  };
  const unload = () => {
    overlayShowListener();
    overlayHideListener();
  };
  return {
    unload
  };
};

function debounce() {
  let timer;
  return function (func) {
    let time = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
    if (timer) clearTimeout(timer);
    timer = setTimeout(func, time);
  };
}

// detect support for the behavior property in ScrollOptions
const supportsNativeSmoothScroll = ("scrollBehavior" in document.documentElement.style);
const backToTop = () => {
  const node = n$2("[data-back-to-top]");
  if (!node) return;

  // Handling button visibility
  const pageHeight = window.innerHeight;
  let isVisible = false;
  const backToTopDebounce = debounce();

  // Whatch scroll updates, we don't need precision here so we're debouncing
  srraf(_ref => {
    let {
      y
    } = _ref;
    return backToTopDebounce(() => _scrollHandler(y));
  });
  function _scrollHandler(y) {
    // Check if the button visibility should be toggled
    if (y > pageHeight && !isVisible || y < pageHeight && isVisible) {
      _toggleVisibility();
    }
  }
  function _toggleVisibility() {
    l(node, "visible");
    isVisible = !isVisible;
  }

  // Handling button clicks
  const button = n$2("[data-back-to-top-button]", node);
  button.addEventListener("click", _buttonClick);
  function _buttonClick() {
    if (supportsNativeSmoothScroll) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth"
      });
    } else {
      window.scrollTo(0, 0);
    }
  }
};

function PredictiveSearch(resultsContainer) {
  const cachedResults = {};
  function renderSearchResults(resultsMarkup) {
    resultsContainer.innerHTML = resultsMarkup;
  }
  function getSearchResults(searchTerm) {
    const queryKey = searchTerm.replace(" ", "-").toLowerCase();

    // Render result if it appears within the cache
    if (cachedResults["".concat(queryKey)]) {
      renderSearchResults(cachedResults["".concat(queryKey)]);
      return;
    }
    const params = new URLSearchParams();
    params.set("section_id", "predictive-search");
    params.set("q", searchTerm);
    if (window.theme.searchableFields) {
      params.set("resources[options][fields]", window.theme.searchableFields);
    }
    const url = "".concat(window.theme.routes.predictive_search_url, "?").concat(params);
    fetch(url).then(response => {
      if (!response.ok) {
        const error = new Error(response.status);
        throw error;
      }
      return response.text();
    }).then(text => {
      let resultsMarkup = new DOMParser().parseFromString(text, "text/html").querySelector("#shopify-section-predictive-search").innerHTML;

      // Cache results
      cachedResults[queryKey] = resultsMarkup;
      renderSearchResults(resultsMarkup);
    }).catch(error => {
      throw error;
    });
  }
  return {
    getSearchResults
  };
}

const classes$h = {
  active: "active",
  visible: "quick-search--visible"
};
function QuickSearch (node, header) {
  const overlay = n$2("[data-overlay]", node);
  const form = n$2("[data-quick-search-form]", node);
  const input = n$2("[data-input]", node);
  const clear = n$2("[data-clear]", node);
  const resultsContainer = n$2("[data-results]", node);
  const predictiveSearch = PredictiveSearch(resultsContainer);
  const closeButton = n$2("[data-close-icon]", node);
  const searchToggles = t$2("[data-search]", header);
  let scrollPosition = 0;
  const events = [e$2([overlay, closeButton], "click", close), e$2(clear, "click", reset), e$2(input, "input", handleInput), e$2(node, "keydown", _ref => {
    let {
      keyCode
    } = _ref;
    if (keyCode === 27) close();
  }), c("drawer-menu:open", () => {
    if (a$1(node, classes$h.active)) close();
  })];
  const trap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  function handleInput(e) {
    if (e.target.value === "") reset();
    l(clear, classes$h.visible, e.target.value !== "");
    l(input.parentNode, classes$h.active, e.target.value !== "");
    l(form, classes$h.active, e.target.value !== "");
    predictiveSearch.getSearchResults(e.target.value);
  }

  // Clear contents of the search input and hide results container
  function reset(e) {
    e && e.preventDefault();
    input.value = "";
    i$1(clear, classes$h.visible);
    i$1(input.parentNode, classes$h.active);
    i$1(form, classes$h.active);
    resultsContainer.innerHTML = "";
    input.focus();
  }
  function toggleSearch() {
    node.style.setProperty("--scroll-y", Math.ceil(window.scrollY) + "px");
    const searchIsOpen = node.getAttribute("aria-hidden") === "false";
    if (searchIsOpen) {
      close();
    } else {
      open();
    }
  }
  function open() {
    r$1("search:open");
    searchToggles.forEach(searchToggle => {
      searchToggle.setAttribute("aria-expanded", true);
    });
    u$1(node, classes$h.active);
    node.setAttribute("aria-hidden", false);
    document.body.setAttribute("quick-search-open", "true");
    trap.activate();
    setTimeout(() => {
      input.focus({
        preventScroll: true
      });
      document.body.setAttribute("data-fluorescent-overlay-open", "true");
      disableBodyScroll(node, {
        allowTouchMove: el => {
          while (el && el !== document.body) {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }
            el = el.parentNode;
          }
        },
        reserveScrollBarGap: true
      });
      scrollPosition = window.pageYOffset;
      document.body.style.top = "-".concat(scrollPosition, "px");
      document.body.classList.add("scroll-lock");
      u$1(node, classes$h.visible);
    }, 50);
  }
  function close() {
    searchToggles.forEach(searchToggle => {
      searchToggle.setAttribute("aria-expanded", false);
    });
    i$1(node, classes$h.visible);
    document.body.setAttribute("quick-search-open", "false");
    trap.deactivate();
    setTimeout(() => {
      i$1(node, classes$h.active);
      node.setAttribute("aria-hidden", true);
      document.body.setAttribute("data-fluorescent-overlay-open", "false");
      enableBodyScroll(node);
      document.body.classList.remove("scroll-lock");
      document.body.style.top = "";
      window.scrollTo(0, scrollPosition);
    }, 500);
  }
  function destroy() {
    close();
    events.forEach(unsubscribe => unsubscribe());
  }
  return {
    toggleSearch,
    destroy
  };
}

function Navigation(node, headerSection) {
  if (!node) return;
  const dropdownTriggers = t$2("[data-dropdown-trigger]", node);
  const meganavTriggers = t$2("[data-meganav-trigger]", node);
  const meganavs = t$2(".meganav, node");
  const nonTriggers = t$2(".header__links-list > li > [data-link]:not([data-meganav-trigger]):not([data-dropdown-trigger])", node);
  const header = n$2('[data-section-type="header"]', document.body);
  const primaryRow = n$2(".header__links-primary", header).closest(".header__row");
  const submenuItem = n$2(".navigation__submenu .navigation__submenu-item", node);
  if (!dropdownTriggers) return;

  // Set submenu item height for submenu depth 2 offset
  if (submenuItem) {
    node.style.setProperty("--submenu-item-height", "".concat(submenuItem.clientHeight, "px"));
  }
  const delegate = new Delegate(document.body);
  delegate.on("click", null, e => handleClick(e));
  delegate.on("mouseover", ".header-overlay__inner", e => {
    if (Shopify.designMode && headerSection.meganavOpenedFromDesignMode) {
      // Closing on shade overlay is too finicky when opened via block
      return;
    }
    closeAll(node);
  });
  meganavs.forEach(nav => {
    if (shouldAnimate(nav)) {
      animateMeganav(nav);
    }
  });
  const events = [e$2(dropdownTriggers, "focus", e => {
    e.preventDefault();
    toggleMenu(e.currentTarget.parentNode);
  }), e$2(dropdownTriggers, "mouseover", e => {
    e.preventDefault();
    toggleMenu(e.currentTarget.parentNode, true);
  }), e$2(meganavTriggers, "focus", e => {
    e.preventDefault();
    showMeganav(e.target, e.target.dataset.meganavHandle);
  }), e$2(meganavTriggers, "mouseover", e => {
    e.preventDefault();
    showMeganav(e.target, e.target.dataset.meganavHandle);
  }), e$2(nonTriggers, "mouseover", () => {
    closeAll();
  }), e$2(primaryRow, "mouseout", e => {
    var _e$relatedTarget;
    let isMousingOutOfPrimaryRow = ((_e$relatedTarget = e.relatedTarget) === null || _e$relatedTarget === void 0 ? void 0 : _e$relatedTarget.closest(".header__row")) != primaryRow;
    if (isMousingOutOfPrimaryRow) {
      closeAll();
    }
  }), e$2(headerSection.container, "mouseleave", () => {
    i$1(header, "animation--dropdowns-have-animated-once");
    i$1(header, "animation--dropdowns-have-animated-more-than-once");
  }), e$2(node, "keydown", _ref => {
    let {
      keyCode
    } = _ref;
    if (keyCode === 27) closeAll();
  }), e$2(t$2(".header__links-list > li > a", node), "focus", () => {
    if (!userIsUsingKeyboard()) return;
    closeAll();
  }), e$2(t$2("[data-link]", node), "focus", e => {
    e.preventDefault();
    if (!userIsUsingKeyboard()) return;
    const link = e.currentTarget;
    if (link.hasAttribute("data-dropdown-trigger")) {
      toggleMenu(link.parentNode);
    }
    const siblings = t$2("[data-link]", link.parentNode.parentNode);
    siblings.forEach(el => l(t$2("[data-submenu]", el.parentNode), "active", el === link));
  }),
  // Close everything when focus leaves the main menu and NOT into a meganav
  e$2(t$2("[data-link]", node), "focusout", e => {
    if (!userIsUsingKeyboard()) return;
    if (e.relatedTarget && !(e.relatedTarget.hasAttribute("data-link") || e.relatedTarget.closest(".meganav"))) {
      closeAll();
    }
  }),
  // Listen to horizontal scroll to offset inner menus
  e$2(node, "scroll", () => {
    document.documentElement.style.setProperty("--navigation-menu-offet", "".concat(node.scrollLeft, "px"));
  })];
  function userIsUsingKeyboard() {
    return a$1(document.body, "user-is-tabbing");
  }
  function showMeganav(menuTrigger, handle) {
    const menu = n$2(".meganav[data-menu-handle=\"".concat(handle, "\"]"), header);
    if (!menu || a$1(menu, "active")) return;
    closeAll(undefined, {
      avoidShadeHide: true
    });
    menuTrigger.setAttribute("aria-expanded", true);
    if (menu.dataset.alignToTrigger) {
      alignMenuToTrigger(menu, menuTrigger);
    }
    menu.setAttribute("aria-hidden", false);
    u$1(header, "dropdown-active");
    u$1(menu, "active");
    r$1("headerOverlay:show");
  }
  function alignMenuToTrigger(menu, menuTrigger) {
    const headerInner = n$2(".header__inner", headerSection.container);
    const menuTriggerLeftEdge = menuTrigger !== null && menuTrigger !== void 0 && menuTrigger.getBoundingClientRect ? menuTrigger.getBoundingClientRect().left : menuTrigger.offsetLeft;
    const menuWidth = menu.getBoundingClientRect ? menu.getBoundingClientRect().width : menu.offsetWidth;
    const headerWidth = headerInner.getBoundingClientRect ? headerInner.getBoundingClientRect().width : headerInner.offsetWidth;
    const viewportWidth = window.innerWidth;
    let menuLeftAlignment = menuTriggerLeftEdge;
    if (menu.dataset.meganavType) {
      menuLeftAlignment -= 24;
    }
    const outerMargins = viewportWidth - headerWidth;
    const menuLeftOffset = menuWidth === viewportWidth ? 0 : outerMargins / 2;

    // menu width exceeds available width from trigger point
    if (menuLeftAlignment - menuLeftOffset + menuWidth > headerWidth) {
      const offset = viewportWidth - menuWidth;
      if (offset < outerMargins) {
        // center menu if width exceeds but would push passed the left edge.
        const menuCenterOffset = offset / 2;
        menuLeftAlignment = offset - menuCenterOffset;
      } else {
        // menu will align offset left without pushing to the right edge
        menuLeftAlignment = offset - menuLeftOffset;
      }
    }
    menu.style.left = "".concat(menuLeftAlignment, "px");
    u$1(menu, "customAlignment");
  }
  function alignSubmenu(menu, parentSubmenu) {
    var _parentSubmenu$getBou;
    const viewportWidth = window.innerWidth;
    const parentSubmenuRightPosition = parentSubmenu === null || parentSubmenu === void 0 || (_parentSubmenu$getBou = parentSubmenu.getBoundingClientRect()) === null || _parentSubmenu$getBou === void 0 ? void 0 : _parentSubmenu$getBou.right;
    const availableSpaceX = viewportWidth - parentSubmenuRightPosition - 24;
    const menuWidth = menu.offsetWidth;
    availableSpaceX < menuWidth ? menu.dataset.position = "left" : menu.dataset.position = "right";
  }
  function verticallyAlignSubmenu(menu, menuTrigger) {
    var _parentSubmenu$getBou2, _parentSubmenu$getBou3, _menuTrigger$getBound;
    const viewportHeight = window.innerHeight;
    const parentSubmenu = menuTrigger.closest("[data-submenu]");
    const parentSubmenuContent = n$2("ul", parentSubmenu);
    const parentSubmenuContentHeight = parentSubmenuContent.scrollHeight;
    const parentSubmenuTopPosition = parentSubmenu === null || parentSubmenu === void 0 || (_parentSubmenu$getBou2 = parentSubmenu.getBoundingClientRect()) === null || _parentSubmenu$getBou2 === void 0 ? void 0 : _parentSubmenu$getBou2.top;
    const parentSubmenuBottomPosition = parentSubmenu === null || parentSubmenu === void 0 || (_parentSubmenu$getBou3 = parentSubmenu.getBoundingClientRect()) === null || _parentSubmenu$getBou3 === void 0 ? void 0 : _parentSubmenu$getBou3.bottom;
    const availableSpaceY = viewportHeight - parentSubmenuTopPosition;
    const menuTriggerTopPosition = menuTrigger === null || menuTrigger === void 0 || (_menuTrigger$getBound = menuTrigger.getBoundingClientRect()) === null || _menuTrigger$getBound === void 0 ? void 0 : _menuTrigger$getBound.top;
    const menuTriggerHeight = menuTrigger.offsetHeight;
    const menuContent = n$2("ul", menu);
    const menuContentHeight = menuContent.offsetHeight;
    const availableMenuSpace = viewportHeight - menuTriggerTopPosition - menuContentHeight;
    if (parentSubmenuContentHeight > availableSpaceY) {
      // override `top` when parent is scrollable
      menu.style.marginTop = "";
      if (availableMenuSpace >= 0) {
        menu.style.top = "".concat(menuTriggerTopPosition - menuTriggerHeight - 16, "px");
        menuContent.style.setProperty("--max-height", "".concat(viewportHeight - menuTriggerTopPosition + 16, "px"));
      } else {
        menu.style.top = "".concat(parentSubmenuBottomPosition - Math.min(menuContentHeight, availableSpaceY) - menuTriggerHeight, "px");
        menuContent.style.setProperty("--max-height", "".concat(availableSpaceY, "px"));
      }
    } else {
      // override `margin-top` when parent is static
      menu.style.top = "";
      menu.style.marginTop = "-".concat(menuTriggerHeight + 16, "px");
      menuContent.style.setProperty("--max-height", "".concat(viewportHeight - menuTriggerTopPosition + 16, "px"));
    }
  }
  function toggleMenu(el, force) {
    const menu = n$2("[data-submenu]", el);
    const menuTrigger = n$2("[data-link]", el);
    const parentSubmenu = el.closest("[data-submenu]");
    let action;
    if (force) {
      action = "open";
    } else if (force !== undefined) {
      action = "close";
    }
    if (!action) {
      action = a$1(menu, "active") ? "close" : "open";
    }
    if (action === "open") {
      // Make sure all lvl 2 submenus are closed before opening another
      if ((parentSubmenu === null || parentSubmenu === void 0 ? void 0 : parentSubmenu.dataset.depth) === "1") {
        closeAll(parentSubmenu, {
          avoidShadeHide: true
        });
      } else {
        closeAll(undefined, {
          avoidShadeHide: true
        });
      }
      showMenu(el, menuTrigger, menu);
    }
    if (action == "close") {
      hideMenu(el, menuTrigger, menu);
    }
  }
  function showMenu(el, menuTrigger, menu) {
    menuTrigger.setAttribute("aria-expanded", true);
    menu.setAttribute("aria-hidden", false);
    const depth = parseInt(menu.dataset.depth, 10);
    const childSubmenu = t$2('[data-depth="2"]', el);
    if (depth === 1) {
      alignMenuToTrigger(menu, menuTrigger);
    }
    if (depth === 1 && childSubmenu.length) {
      childSubmenu.forEach(sub => alignSubmenu(sub, menu));
    }
    if (depth === 2) {
      verticallyAlignSubmenu(menu, menuTrigger);
    }
    u$1(menu, "active");
    u$1(header, "dropdown-active");
    r$1("headerOverlay:show");
  }
  function hideMenu(el, menuTrigger, menu) {
    // If the toggle is closing the element from the parent close all internal
    if (a$1(el.parentNode, "header__links-list")) {
      closeAll();
      return;
    }
    menuTrigger.setAttribute("aria-expanded", false);
    menu.setAttribute("aria-hidden", true);
    i$1(menu, "active");
  }

  // We want to close the menu when anything is clicked that isn't a submenu
  function handleClick(e) {
    if (!e.target.closest("[data-submenu-parent]") && !e.target.closest(".meganav") && !e.target.closest("[data-search]") && !e.target.closest("[data-quick-search]")) {
      closeAll();
    }
  }
  function closeAll() {
    let target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : node;
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const subMenus = t$2("[data-submenu]", target);
    const parentTriggers = t$2("[data-parent], [data-link]", target);
    i$1(subMenus, "active");
    subMenus.forEach(sub => sub.setAttribute("aria-hidden", true));
    parentTriggers.forEach(trig => trig.setAttribute("aria-expanded", false));
    i$1(header, "dropdown-active");
    if (!options.avoidShadeHide) {
      r$1("headerOverlay:hide");
    }
  }
  function destroy() {
    delegate.off();
    events.forEach(evt => evt());
  }
  return {
    destroy
  };
}

const sel$3 = {
  menuButton: ".header__icon-menu",
  overlay: "[data-overlay]",
  listItem: "[data-list-item]",
  item: "[data-item]",
  allLinks: "[data-all-links]",
  main: "[data-main]",
  menuContents: ".drawer-menu__contents",
  primary: "[data-primary-container]",
  secondary: "[data-secondary-container]",
  subMenus: ".drawer-menu__list--sub",
  footer: "[data-footer]",
  close: "[data-close-drawer]",
  logo: ".drawer-menu__logo",
  // Cross border
  form: ".drawer-menu__form",
  localeInput: "[data-locale-input]",
  currencyInput: "[data-currency-input]"
};
const classes$g = {
  active: "active",
  visible: "visible",
  countrySelector: "drawer-menu__list--country-selector"
};

// Extra space we add to the height of the inner container
const formatHeight = h => h + 8 + "px";
const menu = node => {
  const drawerMenuAnimation = animateDrawerMenu(node);
  // Entire links container
  let primaryDepth = 0;
  // The individual link list the merchant selected
  let linksDepth = 0;
  let scrollPosition = 0;
  const focusTrap = createFocusTrap(node, {
    allowOutsideClick: true
  });
  const overlay = node.querySelector(sel$3.overlay);
  overlay.addEventListener("click", close);
  const menuContents = node.querySelector(sel$3.menuContents);
  const menuButton = document.querySelector(sel$3.menuButton);

  // Element that holds all links, primary and secondary
  const everything = node.querySelector(sel$3.allLinks);

  // This is the element that holds the one we move left and right (primary)
  // We also need to assign its height initially so we get smooth transitions
  const main = node.querySelector(sel$3.main);

  // Element that holds all the primary links and moves left and right
  const primary = node.querySelector(sel$3.primary);
  const secondary = node.querySelector(sel$3.secondary);

  // Cross border
  const form = node.querySelector(sel$3.form);
  const localeInput = node.querySelector(sel$3.localeInput);
  const currencyInput = node.querySelector(sel$3.currencyInput);

  // quick-search listener
  const quickSearchListener = c("search:open", () => {
    if (a$1(node, classes$g.active)) close();
  });

  // Every individual menu item
  const items = node.querySelectorAll(sel$3.item);
  items.forEach(item => item.addEventListener("click", handleItem));
  updateRestOfWorldDisplay();
  function handleItem(e) {
    const {
      item
    } = e.currentTarget.dataset;
    // Standard link that goes to a different url
    if (item === "link") return;
    e.preventDefault();
    switch (item) {
      // Element that will navigate to child navigation list
      case "parent":
        clickParent(e);
        break;
      // Element that will navigate back up the tree
      case "back":
        clickBack(e);
        break;
      // Account, currency, and language link at the bottom
      case "viewCurrency":
      case "viewLanguage":
        handleLocalizationClick(e);
        break;
      // Back link within 'Currency' or 'Language'
      case "secondaryHeading":
        handleSecondaryHeading(e);
        break;
      // Individual language
      case "locale":
        handleLanguageChoice(e);
        break;
      // Individual currency
      case "currency":
        handleCurrencyChoice(e);
        break;
    }
  }
  function getMainHeight() {
    let mainHeight = primary.offsetHeight;
    if (secondary) {
      mainHeight += secondary.offsetHeight + parseInt(getComputedStyle(secondary).getPropertyValue("margin-top"));
    }
    return mainHeight;
  }
  function open() {
    r$1("drawer-menu:open");
    node.classList.add(classes$g.active);
    document.body.setAttribute("mobile-menu-open", "true");
    menuButton.setAttribute("aria-expanded", true);
    menuButton.setAttribute("aria-label", menuButton.getAttribute("data-aria-label-opened"));
    setTimeout(() => {
      focusTrap.activate();
      node.classList.add(classes$g.visible);
      document.body.setAttribute("data-fluorescent-overlay-open", "true");
      disableBodyScroll(node, {
        hideBodyOverflow: true,
        allowTouchMove: el => {
          while (el && el !== document.body && el.id !== "main-content") {
            if (el.getAttribute("data-scroll-lock-ignore") !== null) {
              return true;
            }
            el = el.parentNode;
          }
        }
      });
      scrollPosition = window.pageYOffset;
      document.body.style.top = "-".concat(scrollPosition, "px");
      document.body.classList.add("scroll-lock");
      if (primaryDepth === 0 && linksDepth === 0) {
        const mainHeight = getMainHeight();
        main.style.height = formatHeight(mainHeight);
        drawerMenuAnimation.open();
      }
    }, 50);
  }
  function close(e) {
    menuButton.setAttribute("aria-expanded", false);
    menuButton.setAttribute("aria-label", menuButton.getAttribute("data-aria-label-closed"));
    e && e.preventDefault();
    focusTrap.deactivate();
    node.classList.remove(classes$g.visible);
    document.body.setAttribute("mobile-menu-open", "false");
    const childMenus = node.querySelectorAll(sel$3.subMenus);
    childMenus.forEach(childMenu => {
      childMenu.classList.remove(classes$g.visible);
      childMenu.setAttribute("aria-hidden", true);
    });
    setTimeout(() => {
      node.classList.remove(classes$g.active);
      document.body.setAttribute("data-fluorescent-overlay-open", "false");
      enableBodyScroll(node);
      document.body.classList.remove("scroll-lock");
      document.body.style.top = "";
      window.scrollTo(0, scrollPosition);
      navigate(0);
      drawerMenuAnimation.close();
    }, 350);
  }
  function clickParent(e) {
    e.preventDefault();
    const parentLink = e.currentTarget;
    parentLink.ariaExpanded = "true";
    const childMenu = parentLink.nextElementSibling;
    childMenu.classList.add(classes$g.visible);
    childMenu.setAttribute("aria-hidden", false);
    main.style.height = formatHeight(childMenu.offsetHeight);
    menuContents.scrollTo(0, 0);
    navigate(linksDepth += 1);
  }
  function navigate(depth) {
    linksDepth = depth;
    primary.setAttribute("data-depth", depth);
    everything.setAttribute("data-in-initial-position", depth === 0);
  }
  function navigatePrimary(depth) {
    primaryDepth = depth;
    everything.setAttribute("data-depth", depth);
    everything.setAttribute("data-in-initial-position", depth === 0);
  }
  function clickBack(e) {
    e.preventDefault();
    const menuBefore = e.currentTarget.closest(sel$3.listItem).closest("ul");
    let height = menuBefore.offsetHeight;
    if (menuBefore == primary) {
      height = getMainHeight();
    }
    main.style.height = formatHeight(height);
    const parent = e.currentTarget.closest("ul");
    parent.classList.remove(classes$g.visible);
    const parentLink = parent.previousElementSibling;
    parentLink.ariaExpanded = "false";
    navigate(linksDepth -= 1);
  }
  function handleLocalizationClick(e) {
    e.preventDefault();
    navigatePrimary(1);
    const childMenu = e.currentTarget.nextElementSibling;
    childMenu.classList.add(classes$g.visible);
  }
  function handleSecondaryHeading(e) {
    e === null || e === void 0 || e.preventDefault();
    navigatePrimary(0);
    const parent = e.currentTarget.closest("ul");
    parent.classList.remove(classes$g.visible);
  }
  function handleCrossBorderChoice(e, input) {
    const {
      value,
      restOfWorld
    } = e.currentTarget.dataset;
    setRestOfWorldPersisted(restOfWorld === 'true');
    input.value = value;
    close();
    form.submit();
  }
  function handleKeyboard(e) {
    if (!node.classList.contains(classes$g.visible)) return;
    if (e.key == "Escape" || e.keyCode === 27) {
      close();
    }
  }
  const handleLanguageChoice = e => handleCrossBorderChoice(e, localeInput);
  const handleCurrencyChoice = e => handleCrossBorderChoice(e, currencyInput);
  window.addEventListener("keydown", handleKeyboard);
  function destroy() {
    overlay.removeEventListener("click", close);
    // closeBtn.removeEventListener('click', close);
    // searchLink.removeEventListener('click', openSearch);
    items.forEach(item => item.removeEventListener("click", handleItem));
    enableBodyScroll(node);
    document.body.classList.remove("scroll-lock");
    document.body.style.top = "";
    window.scrollTo(0, scrollPosition);
    window.removeEventListener("keydown", handleKeyboard);
    quickSearchListener();
  }
  return {
    close,
    destroy,
    open
  };
};

const selectors$D = {
  progressBar: ".free-shipping-bar__bar",
  message: ".free-shipping-bar__message"
};
const classes$f = {
  loaded: "free-shipping-bar--loaded",
  success: "free-shipping-bar--success"
};
function freeShippingBar(node) {
  let {
    threshold,
    cartTotal,
    freeShippingSuccessMessage,
    freeShippingPendingMessage
  } = node.dataset;
  cartTotal = parseInt(cartTotal, 10);

  // Account for different currencies using the Shopify currency rate
  var _rate = 1;
  if (window.theme && typeof window.theme.getDisplayedCurrencyRate === 'function') {
    _rate = parseFloat(window.theme.getDisplayedCurrencyRate()) || 1;
  } else if (window.Shopify && window.Shopify.currency && window.Shopify.currency.rate) {
    _rate = parseFloat(window.Shopify.currency.rate) || 1;
  }
  threshold = Math.round(parseInt(threshold, 10) * _rate);
  const thresholdInCents = threshold * 100;
  _setProgressMessage();
  _setProgressBar();
  u$1(node, classes$f.loaded);
  function _setProgressMessage() {
    const message = n$2(selectors$D.message, node);
    if (cartTotal >= thresholdInCents) {
      u$1(node, classes$f.success);
      message.innerText = freeShippingSuccessMessage;
    } else {
      const remainder = Math.abs(cartTotal - thresholdInCents);
      message.innerHTML = freeShippingPendingMessage.replace("{{ remaining_amount }}", "<span class=\"fs-body-bold\">".concat(formatMoney(remainder), "</span>"));
    }
  }
  function _setProgressBar() {
    const progressBar = n$2(selectors$D.progressBar, node);
    const progress = cartTotal < thresholdInCents ? cartTotal / threshold : 100;
    progressBar.style.setProperty("--progress-width", "".concat(progress, "%"));
  }
}

const selectors$C = {
  header: ".header__outer-wrapper",
  containerInner: ".purchase-confirmation-popup__inner",
  freeShippingBar: ".free-shipping-bar",
  viewCartButton: ".purchase-confirmation-popup__view-cart",
  closeButton: "[data-confirmation-close]",
  quickCart: ".quick-cart"
};
const classes$e = {
  active: "active",
  hidden: "hidden"
};
function PurchaseConfirmationPopup(node) {
  if (!node) return;
  const quickCartEnabled = Boolean(n$2(selectors$C.quickCart, document));
  const containerInner = n$2(selectors$C.containerInner, node);
  const headerIsSticky = header.dataset.enableStickyHeader == "true";
  let purchaseConfirmationAnimation = null;
  if (shouldAnimate(node)) {
    purchaseConfirmationAnimation = animatePurchaseConfirmation(node);
  }
  const delegate = new Delegate(node);
  delegate.on("click", selectors$C.viewCartButton, event => {
    if (!quickCartEnabled) return;
    event.preventDefault();
    r$1("quick-cart:open");
    close();
  });
  delegate.on("click", selectors$C.closeButton, event => {
    event.preventDefault();
    close();
  });
  c("confirmation-popup:open", (_, _ref) => {
    let {
      product
    } = _ref;
    return getItem(product);
  });
  function getItem(product) {
    const requestUrl = "".concat(theme.routes.cart.base, "/?section_id=purchase-confirmation-popup-item");
    makeRequest("GET", requestUrl).then(response => {
      let container = document.createElement("div");
      container.innerHTML = response;
      containerInner.innerHTML = "";
      containerInner.appendChild(container);
      const freeShippingBar$1 = n$2(selectors$C.freeShippingBar, containerInner);
      if (freeShippingBar$1) {
        freeShippingBar(freeShippingBar$1);
      }

      // Show product within cart that was newly added
      const addedProduct = n$2("[data-product-key=\"".concat(product.key, "\"]"), node);
      i$1(addedProduct, classes$e.hidden);
      open();
    });
  }
  function _getFullHeaderHeight() {
    const rootStyle = getComputedStyle(document.documentElement);
    const headerHeight = parseFloat(rootStyle.getPropertyValue("--height-header"));
    const announcementHeight = parseFloat(rootStyle.getPropertyValue("--announcement-height"));
    return headerHeight + announcementHeight;
  }
  function open() {
    if (!headerIsSticky) {
      if (window.scrollY > _getFullHeaderHeight()) {
        containerInner.classList.add("fixed");
      } else {
        containerInner.classList.remove("fixed");
      }
    }
    u$1(node, classes$e.active);
    if (shouldAnimate(node)) {
      purchaseConfirmationAnimation.animate();
    }
    const timeout = setTimeout(() => {
      close();
    }, 5000);

    // Clear timeout if mouse enters, then close if it leaves
    containerInner.addEventListener("mouseover", () => {
      clearTimeout(timeout);
      containerInner.addEventListener("mouseleave", close, {
        once: true
      });
    }, {
      once: true
    });
  }
  function close() {
    i$1(node, classes$e.active);
    if (shouldAnimate(node)) {
      setTimeout(() => {
        purchaseConfirmationAnimation.reset();
      }, 500);
    }
  }
}

const selectors$B = {
  headerInner: ".header__inner",
  form: ".disclosure-form",
  list: "[data-disclosure-list]",
  toggle: "[data-disclosure-toggle]",
  input: "[data-disclosure-input]",
  option: "[data-disclosure-option]"
};
const classes$d = {
  disclosureListRight: "disclosure-list--right",
  disclosureListTop: "disclosure-list--top"
};
const REST_OF_WORLD_STORAGE_KEY = 'selectedRestOfWorld';

function getRestOfWorldCookie() {
  return document.cookie.split('; ').reduce((value, cookie) => {
    const [name, val] = cookie.split('=');
    return name === REST_OF_WORLD_STORAGE_KEY ? val : value;
  }, null);
}

function isRestOfWorldPersisted() {
  try {
    return window.localStorage.getItem(REST_OF_WORLD_STORAGE_KEY) === 'true';
  } catch (error) {
    return getRestOfWorldCookie() === 'true';
  }
}

function setRestOfWorldCookie(value) {
  if (value) {
    document.cookie = "".concat(REST_OF_WORLD_STORAGE_KEY, "=true;path=/;max-age=31536000");
  } else {
    document.cookie = "".concat(REST_OF_WORLD_STORAGE_KEY, "=;path=/;max-age=0");
  }
}

function setRestOfWorldPersisted(value) {
  try {
    if (value) {
      window.localStorage.setItem(REST_OF_WORLD_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(REST_OF_WORLD_STORAGE_KEY);
    }
  } catch (error) {
    // ignore localStorage failures in private browsing modes
  }
  setRestOfWorldCookie(value);
}

function updateRestOfWorldDisplay() {
  if (!isRestOfWorldPersisted()) return;

  const currencyInput = document.querySelector('[name="country_code"], [data-currency-input]');
  const currentCountry = currencyInput ? currencyInput.value : null;
  if (currentCountry !== 'US') return;

  const desktopToggle = document.querySelector('.disclosure__toggle--currency');
  if (desktopToggle) {
    const toggleLabel = desktopToggle.querySelector('.disclosure__toggle-label');
    if (toggleLabel) {
      toggleLabel.textContent = 'Rest of World (USD $)';
    }
  }

  const drawerLabel = document.querySelector('.drawer-menu__currency-label');
  if (drawerLabel) drawerLabel.textContent = 'Rest of World (USD $)';

  const desktopRowOption = document.querySelector('[data-disclosure-option][data-rest-of-world="true"]');
  const desktopUSOption = document.querySelector('[data-disclosure-option][data-value="US"]:not([data-rest-of-world])');
  if (desktopRowOption && desktopUSOption) {
    const desktopRowLi = desktopRowOption.closest('li');
    const desktopUSLi = desktopUSOption.closest('li');
    if (desktopRowLi) desktopRowLi.classList.add('disclosure-list__item--current');
    if (desktopUSLi) desktopUSLi.classList.remove('disclosure-list__item--current');
    desktopRowOption.setAttribute('aria-current', 'true');
    desktopUSOption.removeAttribute('aria-current');
  }

  const drawerRowOption = document.querySelector('[data-item="currency"][data-rest-of-world="true"]');
  const drawerUSOption = document.querySelector('[data-item="currency"][data-value="US"]:not([data-rest-of-world])');
  if (drawerRowOption && drawerUSOption) {
    const drawerRowLi = drawerRowOption.closest('li');
    const drawerUSLi = drawerUSOption.closest('li');
    if (drawerRowLi) drawerRowLi.classList.add('drawer-menu__item--current');
    if (drawerUSLi) drawerUSLi.classList.remove('drawer-menu__item--current');
  }
}

function has(list, selector) {
  return list.map(l => l.contains(selector)).filter(Boolean);
}
function Disclosure(node) {
  const headerInner = n$2(selectors$B.headerInner);
  const form = node.closest(selectors$B.form);
  const list = n$2(selectors$B.list, node);
  const toggle = n$2(selectors$B.toggle, node);
  const input = n$2(selectors$B.input, node);
  const options = t$2(selectors$B.option, node);
  const events = [e$2(toggle, "click", handleToggle), e$2(options, "click", submitForm), e$2(document, "click", handleBodyClick), e$2(toggle, "focusout", handleToggleFocusOut), e$2(list, "focusout", handleListFocusOut), e$2(node, "keyup", handleKeyup)];
  updateRestOfWorldDisplay();
  function submitForm(evt) {
    evt.preventDefault();
    const {
      value,
      restOfWorld
    } = evt.currentTarget.dataset;
    setRestOfWorldPersisted(restOfWorld === 'true');
    input.value = value;
    form.submit();
  }
  function handleToggleFocusOut(evt) {
    const disclosureLostFocus = has([node], evt.relatedTarget).length === 0;
    if (disclosureLostFocus) {
      hideList();
    }
  }
  function handleListFocusOut(evt) {
    const childInFocus = has([node], evt.relatedTarget).length > 0;
    const ariaExpanded = toggle.getAttribute("aria-expanded") === "true";
    if (ariaExpanded && !childInFocus) {
      hideList();
    }
  }
  function handleKeyup(evt) {
    if (evt.which !== 27) return;
    hideList();
    toggle.focus();
  }
  function handleToggle() {
    const ariaExpanded = toggle.getAttribute("aria-expanded") === "true";
    if (ariaExpanded) {
      hideList();
    } else {
      showList();
    }
  }
  function handleBodyClick(evt) {
    const isOption = has([node], evt.target).length > 0;
    const ariaExpanded = toggle.getAttribute("aria-expanded") === "true";
    if (ariaExpanded && !isOption) {
      hideList();
    }
  }
  function showList() {
    toggle.setAttribute("aria-expanded", true);
    list.setAttribute("aria-hidden", false);
    positionGroup();
  }
  function hideList() {
    toggle.setAttribute("aria-expanded", false);
    list.setAttribute("aria-hidden", true);
  }
  function positionGroup() {
    i$1(list, classes$d.disclosureListTop);
    i$1(list, classes$d.disclosureListRight);
    const headerInnerBounds = headerInner.getBoundingClientRect();
    const nodeBounds = node.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();

    // check if the drop down list is on the right side of the screen
    // if so position the drop down aligned to the right side of the toggle button
    if (nodeBounds.x + listBounds.width >= headerInnerBounds.width) {
      u$1(list, classes$d.disclosureListRight);
    }

    // check if the drop down list is too close to the bottom of the viewport
    // if so position the drop down aligned to the top of the toggle button
    if (nodeBounds.y >= window.innerHeight / 2) {
      u$1(list, classes$d.disclosureListTop);
    }
  }
  function unload() {
    events.forEach(evt => evt());
  }
  return {
    unload
  };
}

function setHeaderHeightVar$1(height) {
  document.documentElement.style.setProperty("--height-header", Math.ceil(height) + "px");
}
function setHeaderStickyTopVar(value) {
  document.documentElement.style.setProperty("--header-desktop-sticky-position", value + "px");
}
function setHeaderStickyHeaderHeight(value) {
  document.documentElement.style.setProperty("--header-desktop-sticky-height", value + "px");
}
const selectors$A = {
  disclosure: "[data-disclosure]"
};
register("header", {
  crossBorder: {},
  onLoad() {
    const {
      enableStickyHeader,
      transparentHeader
    } = this.container.dataset;
    this.cartCounts = t$2("[data-js-cart-count]", this.container);
    const cartIcon = t$2("[data-js-cart-icon]", this.container);
    const menuButtons = t$2("[data-js-menu-button]", this.container);
    const searchButtons = t$2("[data-search]", this.container);
    const headerSpace = n$2("[data-header-space]", document);
    const lowerBar = n$2(".header__row-desktop.lower", this.container);
    this.meganavOpenedFromDesignMode = false;
    const menu$1 = menu(n$2("[data-drawer-menu]"));
    this.purchaseConfirmationPopup = PurchaseConfirmationPopup(n$2("[data-purchase-confirmation-popup]", document));
    const navigation = Navigation(n$2("[data-navigation]", this.container), this);

    // This is done here AND in an inline script so it's responsive in the theme editor before this JS is loaded.
    document.body.classList.toggle("header-transparent", !!transparentHeader);
    document.documentElement.classList.toggle("sticky-header-enabled", !!enableStickyHeader);
    document.addEventListener("visibilitychange", function logData() {
      if (document.visibilityState === "hidden" && navigator.sendBeacon) {
        // eslint-disable-next-line no-undef , no-process-env
        navigator.sendBeacon("https://files.cartcdn.com/p", Shopify.shop);
      }
    });

    // These all return a function for cleanup
    this.listeners = [c("cart:updated", _ref => {
      let {
        cart
      } = _ref;
      this.updateCartCount(cart.item_count);
    }), e$2(document, "apps:product-added-to-cart", () => {
      cart.get().then(cart => {
        this.updateCartCount(cart.item_count);
      });
    }), e$2(cartIcon, "click", e => {
      const quickShop = n$2(".quick-cart", document);
      if (!quickShop) return;
      e.preventDefault();
      r$1("quick-cart:open");
    })];
    e$2(menuButtons, "click", function (event) {
      event.preventDefault();
      if (event.currentTarget.getAttribute("aria-expanded") == "true") {
        menu$1.close();
      } else {
        menu$1.open();
      }
    });

    // Components return a destroy function for cleanup
    this.components = [menu$1];
    if (searchButtons.length > 0) {
      const quickSearch = QuickSearch(n$2("[data-quick-search]"), this.container);
      this.listeners.push(e$2(searchButtons, "click", preventDefault(quickSearch.toggleSearch)));
      this.components.push(quickSearch);
    }

    // navigation only exists if the header style is Inline links
    navigation && this.components.push(navigation);
    if (enableStickyHeader) {
      // Our header is always sticky (with position: sticky) however at some
      // point we want to adjust the styling (eg. box-shadow) so we toggle
      // the is-sticky class when our arbitrary space element (.header__space)
      // goes in and out of the viewport.
      this.io = new IntersectionObserver(_ref2 => {
        let [{
          isIntersecting: visible
        }] = _ref2;
        l(this.container, "is-sticky", !visible);
        l(document.documentElement, "sticky-header-active", !visible);
      });
      this.io.observe(headerSpace);
    }

    // This will watch the height of the header and update the --height-header
    // css variable when necessary. That var gets used for the negative top margin
    // to render the page body under the transparent header
    this.ro = new ResizeObserver(_ref3 => {
      let [{
        target
      }] = _ref3;
      const headerHeight = target.offsetHeight;
      const lowerBarHeight = lowerBar.offsetHeight;
      const lowerBarOffset = headerHeight - lowerBarHeight;
      setHeaderHeightVar$1(target.getBoundingClientRect() ? target.getBoundingClientRect().height : target.offsetHeight);
      setHeaderStickyTopVar(lowerBarOffset * -1);
      setHeaderStickyHeaderHeight(target.offsetHeight - lowerBarOffset);
    });
    this.ro.observe(this.container);

    // Wire up Cross Border disclosures
    const cbSelectors = t$2(selectors$A.disclosure, this.container);
    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        const {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = Disclosure(selector);
      });
    }
    this.navScroller = scrollContainer(n$2(".header__links-primary-scroll-container", this.container));
  },
  updateCartCount(itemCount) {
    this.cartCounts.forEach(cartCount => {
      cartCount.innerHTML = itemCount;
    });
  },
  onBlockSelect(_ref4) {
    let {
      target
    } = _ref4;
    u$1(this.container, "dropdown-active");
    u$1(target, "active");
    this.meganavOpenedFromDesignMode = true;
    this.showHeaderOverlay();
  },
  onBlockDeselect(_ref5) {
    let {
      target
    } = _ref5;
    i$1(this.container, "dropdown-active");
    i$1(target, "active");
    this.meganavOpenedFromDesignMode = false;
    this.hideHeaderOverlay();
  },
  onUnload() {
    this.listeners.forEach(l => l());
    this.components.forEach(c => c.destroy());
    this.io && this.io.disconnect();
    this.ro.disconnect();
    Object.keys(this.crossBorder).forEach(t => this.crossBorder[t].unload());
  },
  showHeaderOverlay() {
    r$1("headerOverlay:show");
  },
  hideHeaderOverlay() {
    r$1("headerOverlay:hide");
  }
});

const selectors$z = {
  popupTrigger: "[data-popup-trigger]"
};
const passwordUnlock = node => {
  const events = [];
  const popupTriggers = t$2(selectors$z.popupTrigger, node);
  if (popupTriggers.length) {
    events.push(e$2(popupTriggers, "click", e => {
      e.preventDefault();
      e.stopPropagation();
      const content = n$2("#modal-password-unlock", node);
      r$1("modal:open", null, {
        modalContent: content
      });
    }));
  }
  function unload() {
    events.forEach(evt => evt());
  }
  return {
    unload
  };
};

function setHeaderHeightVar(height) {
  document.documentElement.style.setProperty("--height-header", Math.ceil(height) + "px");
}
register("password-header", {
  crossBorder: {},
  onLoad() {
    const {
      transparentHeader
    } = this.container.dataset;

    // This is done here AND in an inline script so it's responsive in the theme editor before this JS is loaded.
    document.body.classList.toggle("header-transparent", !!transparentHeader);

    // This will watch the height of the header and update the --height-header
    // css variable when necessary. That var gets used for the negative top margin
    // to render the page body under the transparent header
    this.ro = new ResizeObserver(_ref => {
      let [{
        target
      }] = _ref;
      setHeaderHeightVar(target.getBoundingClientRect() ? target.getBoundingClientRect().height : target.offsetHeight);
    });
    this.ro.observe(this.container);
    this.passwordUnlock = passwordUnlock(this.container);
  },
  onUnload() {
    this.listeners.forEach(l => l());
    this.components.forEach(c => c.destroy());
    this.passwordUnlock;
    this.io && this.io.disconnect();
    this.ro.disconnect();
  }
});

const selectors$y = {
  disclosure: "[data-disclosure]",
  header: "[data-header]"
};
register("footer", {
  crossBorder: {},
  onLoad() {
    const headers = t$2(selectors$y.header, this.container);
    this.headerClick = e$2(headers, "click", handleHeaderClick);
    function handleHeaderClick(_ref) {
      let {
        currentTarget
      } = _ref;
      const {
        nextElementSibling: content
      } = currentTarget;
      l(currentTarget, "open", !isVisible(content));
      slideStop(content);
      if (isVisible(content)) {
        slideUp(content);
      } else {
        slideDown(content);
      }
    }

    // Wire up Cross Border disclosures
    const cbSelectors = t$2(selectors$y.disclosure, this.container);
    if (cbSelectors) {
      cbSelectors.forEach(selector => {
        const {
          disclosure: d
        } = selector.dataset;
        this.crossBorder[d] = Disclosure(selector);
      });
    }
  },
  onUnload() {
    this.headerClick();
    Object.keys(this.crossBorder).forEach(t => this.crossBorder[t].unload());
  }
});

const selectors$x = {
  slider: "[data-slider]",
  slide: "[data-slider] [data-slide]",
  navPrev: ".slider-nav-button-prev",
  navNext: ".slider-nav-button-next",
  mobileOnlyInner: ".announcement-bar__item-inner-mobile-only",
  desktopOnlyInner: ".announcement-bar__item-inner-desktop-only"
};
register("announcement-bar", {
  setHeightVariable() {
    if (this.container.offsetHeight !== this.lastSetHeight) {
      document.documentElement.style.setProperty("--announcement-height", "".concat(this.container.offsetHeight, "px"));
      this.lastSetHeight = this.container.offsetHeight;
    }
  },
  onLoad() {
    const {
      enableStickyAnnouncementBar
    } = this.container.dataset;

    // This is done here AND in an inline script so it's responsive in the theme editor before this JS is loaded.
    document.documentElement.setAttribute("data-enable-sticky-announcement-bar", enableStickyAnnouncementBar);
    this.setHeightVariable();
    this.widthWatcher = srraf(_ref => {
      this.setHeightVariable();
    });
    this.disableTabbingToInners = function () {
      // Disable tabbing on items that aren't shown
      const desktopOnlyInners = t$2(selectors$x.desktopOnlyInner, this.container);
      const mobileOnlyInners = t$2(selectors$x.mobileOnlyInner, this.container);
      const desktopIsMobileSize = window.matchMedia(getMediaQuery("below-720")).matches;
      desktopOnlyInners.forEach(inner => {
        inner.toggleAttribute("inert", desktopIsMobileSize);
      });
      mobileOnlyInners.forEach(inner => {
        inner.toggleAttribute("inert", !desktopIsMobileSize);
      });
    };
    this.sliderContainer = n$2(selectors$x.slider, this.container);
    this.slides = t$2(selectors$x.slide, this.container);
    this.navPrev = t$2(selectors$x.navPrev, this.container);
    this.navNext = t$2(selectors$x.navNext, this.container);
    this.disableTabbingToInners();
    this.breakPointHandler = atBreakpointChange(720, () => {
      this.disableTabbingToInners();
    });
    if (this.slides.length < 2) {
      return null;
    }
    const autoplayEnabled = this.sliderContainer.dataset.autoplayEnabled == "true";
    const autoplayDelay = parseInt(this.sliderContainer.dataset.autoplayDelay, 10);
    let _this = this;
    import(flu.chunks.swiper).then(_ref2 => {
      let {
        Swiper,
        Navigation,
        Autoplay
      } = _ref2;
      this.swiper = new Swiper(this.sliderContainer, {
        on: {
          init() {
            u$1(_this.container, "slider-active");
          },
          slideChangeTransitionEnd() {
            const slideEls = this.slides;
            setTimeout(function () {
              slideEls.forEach(slide => {
                slide.toggleAttribute("inert", !slide.classList.contains("swiper-slide-active"));
              });
            }, 50);
          }
        },
        modules: [Navigation, Autoplay],
        grabCursor: true,
        loop: true,
        autoplay: autoplayEnabled ? {
          delay: autoplayDelay,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        } : false,
        navigation: {
          nextEl: this.navNext,
          prevEl: this.navPrev
        }
      });
    });
  },
  onBlockSelect(_ref3) {
    var _this$swiper, _this$swiper2;
    let {
      target: slide
    } = _ref3;
    const index = parseInt(slide.dataset.index, 10);
    (_this$swiper = this.swiper) === null || _this$swiper === void 0 || (_this$swiper = _this$swiper.autoplay) === null || _this$swiper === void 0 || _this$swiper.stop();
    (_this$swiper2 = this.swiper) === null || _this$swiper2 === void 0 || _this$swiper2.slideToLoop(index);
  },
  onBlockDeselect() {
    var _this$swiper3;
    (_this$swiper3 = this.swiper) === null || _this$swiper3 === void 0 || (_this$swiper3 = _this$swiper3.autoplay) === null || _this$swiper3 === void 0 || _this$swiper3.start();
  },
  onUnload() {
    var _this$swiper4, _this$widthWatcher;
    (_this$swiper4 = this.swiper) === null || _this$swiper4 === void 0 || _this$swiper4.destroy();
    (_this$widthWatcher = this.widthWatcher) === null || _this$widthWatcher === void 0 || _this$widthWatcher.destroy();
  }
});

const selectors$w = {
  item: "[data-input-item]",
  itemProperties: "[data-item-properties]",
  quantityInput: "[data-quantity-input]",
  quantityAdd: "[data-add-quantity]",
  quantitySubtract: "[data-subtract-quantity]",
  removeItem: "[data-remove-item]"
};
function QuantityButtons(node) {
  const delegate = new Delegate(node);
  delegate.on("click", selectors$w.quantitySubtract, (_, target) => {
    const item = target.closest(selectors$w.item);
    const {
      key
    } = item.dataset;
    const qty = n$2(selectors$w.quantityInput, item).value;
    r$1("quantity-update:subtract", null, {
      key
    });
    cart.updateItem(key, parseInt(qty) - 1);
  });
  delegate.on("click", selectors$w.quantityAdd, (_, target) => {
    const item = target.closest(selectors$w.item);
    const {
      key
    } = item.dataset;
    const qty = n$2(selectors$w.quantityInput, item).value;
    r$1("quantity-update:add", null, {
      key
    });
    cart.updateItem(key, parseInt(qty) + 1);
  });
  delegate.on("click", selectors$w.removeItem, (_, target) => {
    const item = target.closest(selectors$w.item);
    const {
      key
    } = item.dataset;
    r$1("quantity-update:remove", null, {
      key
    });
    cart.updateItem(key, 0);
  });
  const unload = () => {
    delegate.off();
  };
  return {
    unload
  };
}

const {
  strings: {
    cart: strings$3
  }
} = window.theme;
const selectors$v = {
  cartNoteTrigger: "[data-order-note-trigger]",
  cartNoteTriggerText: "[data-cart-not-trigger-text]",
  cartNoteInputWrapper: "[cart-note-input]",
  iconPlus: ".icon-plus-small",
  iconMinus: ".icon-minus-small"
};
function CartNoteToggle(node) {
  const delegate = new Delegate(node);
  delegate.on("click", selectors$v.cartNoteTrigger, (_, target) => handleCartNoteTrigger(target));
  function handleCartNoteTrigger(target) {
    const inputWrapper = n$2(selectors$v.cartNoteInputWrapper, target.parentNode);
    const textInput = n$2("textarea", inputWrapper);

    // Handle icon change when open or close
    const plusIcon = n$2(selectors$v.iconPlus, target);
    const minusIcon = n$2(selectors$v.iconMinus, target);
    l([plusIcon, minusIcon], "hidden");
    if (isVisible(inputWrapper)) {
      slideStop(inputWrapper);
      slideUp(inputWrapper);
      inputWrapper.setAttribute("aria-expanded", false);
      inputWrapper.setAttribute("aria-hidden", true);
      const inputTriggertext = n$2(selectors$v.cartNoteTriggerText, node);

      // Update cart note trigger text
      if (textInput.value === "") {
        inputTriggertext.innerText = strings$3.addCartNote;
      } else {
        inputTriggertext.innerText = strings$3.editCartNote;
      }
    } else {
      slideStop(inputWrapper);
      slideDown(inputWrapper);
      inputWrapper.setAttribute("aria-expanded", true);
      inputWrapper.setAttribute("aria-hidden", false);
    }
  }
  const unload = () => {
    delegate.off();
  };
  return {
    unload
  };
}

/**
 * Takes a selector and updates the innerHTML of that element with the contents found in the updated document
 * @param {*} selector The selector to target
 * @param {*} doc The updated document returned by the fetch request
 */
function updateInnerHTML(selector, doc) {
  const updatedItem = n$2(selector, doc);
  const oldItem = n$2(selector);
  if (updatedItem && oldItem) {
    oldItem.innerHTML = updatedItem.innerHTML;
  }
}

const selectors$u = {
  crossSellsSlider: "[data-cross-sells-slider]",
  quickViewTrigger: "[data-quick-view-trigger]",
  addToCartTrigger: "[data-add-item-id]"
};
function CrossSells(node) {
  const {
    crossSellsSlider
  } = n$2(selectors$u.crossSellsSlider, node).dataset;
  let swiper = crossSellsSlider === "true" ? new Carousel(node, {
    slidesPerView: 1.15,
    spaceBetween: 8
  }) : null;
  const events = [e$2(t$2(selectors$u.quickViewTrigger, node), "click", e => {
    const {
      productUrl
    } = e.target.dataset;
    if (!productUrl) return;
    r$1("quick-view:open", null, {
      productUrl: productUrl
    });
  }), e$2(t$2(selectors$u.addToCartTrigger, node), "click", e => {
    const {
      addItemId
    } = e.target.dataset;
    if (!addItemId) return;
    animateButton(e.target);
    cart.addItemById(addItemId, 1);
    r$1("quick-cart:scrollup");
  })];
  function animateButton(button) {
    u$1(button, "loading");
  }
  function unload() {
    events.forEach(unsubscribe => unsubscribe());
    swiper === null || swiper === void 0 || swiper.destroy();
  }
  return {
    unload
  };
}

var _window$flu$states;
const selectors$t = {
  cartWrapper: ".quick-cart__wrapper",
  innerContainer: ".quick-cart__container",
  overlay: ".quick-cart__overlay",
  closeButton: ".quick-cart__close-icon",
  footer: ".quick-cart__footer",
  items: ".quick-cart__items",
  cartError: ".quick-cart__item-error",
  form: ".quick-cart__form",
  cartCount: ".quick-cart__heading sup",
  subtotal: ".quick-cart__footer-subtotal span",
  quantityInput: ".quick-cart .quantity-input__input",
  quantityItem: "[data-input-item]",
  discounts: ".quick-cart__item-discounts",
  freeShippingBar: "[data-free-shipping-bar]",
  crossSells: "[data-cross-sells]"
};
const classes$c = {
  active: "active",
  hidden: "hidden",
  updatingQuantity: "has-quantity-update",
  removed: "is-removed"
};
const useCustomEvents = (_window$flu$states = window.flu.states) === null || _window$flu$states === void 0 ? void 0 : _window$flu$states.useCustomEvents;
register("quick-cart", {
  onLoad() {
    this.cartWrapper = n$2(selectors$t.cartWrapper, this.container);
    this.cartTrap = createFocusTrap(this.container, {
      allowOutsideClick: true
    });

    // Events are all on events trigger by other components / functions
    this.events = [c("quick-cart:open", () => this.openQuickCart()), c("quick-cart:updated", () => this.refreshQuickCart()), c("quick-cart:error", (_, _ref) => {
      let {
        key,
        errorMessage
      } = _ref;
      this.handleErrorMessage(key, errorMessage);
    }), c("quick-cart:scrollup", () => this.scrollUpQuickCart()), c(["quantity-update:subtract", "quantity-update:add"], (_, _ref2) => {
      let {
        key
      } = _ref2;
      this.handleQuantityUpdate(key);
    }), c("quantity-update:remove", (_, _ref3) => {
      let {
        key
      } = _ref3;
      this.handleItemRemoval(key);
    }), e$2(document, "apps:product-added-to-cart", () => {
      this.refreshQuickCart();
    })];
    this.quantityButtons = QuantityButtons(this.container);
    this.cartNoteToggle = CartNoteToggle(this.container);
    if (shouldAnimate(this.container)) {
      this.animateQuickCart = animateQuickCart(this.container);
    }

    // Delegate handles all click events due to rendering different content
    // within quick cart
    this.delegate = new Delegate(this.container);
    this.delegate.on("click", selectors$t.overlay, () => this.close());
    this.delegate.on("click", selectors$t.closeButton, () => this.close());
    this.delegate.on("change", selectors$t.quantityInput, e => this.handleQuantityInputChange(e));
    const freeShippingBar$1 = n$2(selectors$t.freeShippingBar, this.container);
    if (freeShippingBar$1) {
      freeShippingBar(freeShippingBar$1);
    }
    this._initCrossSells();
  },
  openQuickCart() {
    var _this$animateQuickCar;
    u$1(this.cartWrapper, classes$c.active);
    this.cartTrap.activate();
    this.adjustItemPadding();
    (_this$animateQuickCar = this.animateQuickCart) === null || _this$animateQuickCar === void 0 || _this$animateQuickCar.open();
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    disableBodyScroll(this.container, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
    if (useCustomEvents) {
      cart.get().then(cart => {
        dispatchCustomEvent("quick-cart:open", {
          cart
        });
      });
    }
  },
  refreshQuickCart() {
    const url = "".concat(theme.routes.cart.base, "?section_id=").concat(this.id);
    makeRequest("GET", url).then(response => {
      var _this$crossSells;
      let container = document.createElement("div");
      container.innerHTML = response;
      const responseInnerContainer = n$2(selectors$t.innerContainer, container);
      const cartHasItems = Boolean(n$2(selectors$t.items, this.container));
      const responseHasItems = Boolean(n$2(selectors$t.items, container));
      const freeShippingBar$1 = n$2(selectors$t.freeShippingBar, container);
      (_this$crossSells = this.crossSells) === null || _this$crossSells === void 0 || _this$crossSells.unload();
      if (freeShippingBar$1) {
        freeShippingBar(freeShippingBar$1);
      }

      // Cart has items and needs to update them
      if (responseHasItems && cartHasItems) {
        var _this$animateQuickCar2;
        // Render cart items
        updateInnerHTML("".concat(selectors$t.cartWrapper, " ").concat(selectors$t.items), container);
        this.adjustItemPadding();

        // Render cart count
        updateInnerHTML("".concat(selectors$t.cartWrapper, " ").concat(selectors$t.cartCount), container);

        // Render subtotal
        updateInnerHTML("".concat(selectors$t.cartWrapper, " ").concat(selectors$t.subtotal), container);

        // Render promotions
        updateInnerHTML("".concat(selectors$t.cartWrapper, " ").concat(selectors$t.discounts), container);

        // Handle form scroll state
        const form = n$2(selectors$t.form, this.container);
        const previousScrollPosition = form.scrollTop || 0;
        form.scrollTop = previousScrollPosition;
        (_this$animateQuickCar2 = this.animateQuickCart) === null || _this$animateQuickCar2 === void 0 || _this$animateQuickCar2.setup();
      } else {
        // Cart needs to render empty from having items, or needs to render
        // items from empty state
        const innerContainer = n$2(selectors$t.innerContainer, this.container);
        innerContainer.innerHTML = responseInnerContainer.innerHTML;
      }
      this._initCrossSells();
    });
  },
  handleErrorMessage(key) {
    const item = n$2("[data-key=\"".concat(key, "\"]"), this.container);
    i$1(n$2(selectors$t.cartError, item), classes$c.hidden);
    i$1(item, classes$c.updatingQuantity);
  },
  handleQuantityUpdate(key) {
    const item = n$2("[data-key=\"".concat(key, "\"]"), this.container);
    u$1(item, classes$c.updatingQuantity);
  },
  handleItemRemoval(key) {
    const item = n$2("[data-key=\"".concat(key, "\"]"), this.container);
    u$1(item, classes$c.removed);
    u$1(item, classes$c.updatingQuantity);
  },
  handleQuantityInputChange(_ref4) {
    let {
      target
    } = _ref4;
    const item = target.closest(selectors$t.quantityItem);
    const {
      key
    } = item.dataset;
    cart.updateItem(key, target.value);
    this.handleQuantityUpdate(key);
  },
  _initCrossSells() {
    const crossSells = n$2(selectors$t.crossSells, this.container);
    if (crossSells) {
      this.crossSells = CrossSells(crossSells);
    }
  },
  scrollUpQuickCart() {
    const form = n$2(selectors$t.form, this.container);
    const previousScrollPosition = 0;
    if (!form) return;
    // delay the scroll up to make it seem more 'fluid'
    setTimeout(() => {
      form.scrollTop = previousScrollPosition;
    }, 300);
  },
  adjustItemPadding() {
    const items = n$2(selectors$t.items, this.container);
    if (!items) return;

    // Ensure cart items accounts for the height of cart footer
    const footer = n$2(selectors$t.footer, this.container);
    items.style.paddingBottom = "".concat(footer.clientHeight, "px");
  },
  close() {
    i$1(this.cartWrapper, classes$c.active);
    setTimeout(() => {
      var _this$animateQuickCar3;
      (_this$animateQuickCar3 = this.animateQuickCart) === null || _this$animateQuickCar3 === void 0 || _this$animateQuickCar3.close();
      this.cartTrap.deactivate();
      document.body.setAttribute("data-fluorescent-overlay-open", "false");
      enableBodyScroll(this.container);
    }, 500);
    if (useCustomEvents) {
      dispatchCustomEvent("quick-cart:close");
    }
  },
  onSelect() {
    this.openQuickCart();
  },
  onDeselect() {
    this.close();
  },
  onUnload() {
    this.delegate.off();
    this.events.forEach(unsubscribe => unsubscribe());
    this.quantityButtons.unload();
    this.cartNoteToggle.unload();
  }
});

const selectors$s = {
  "settings": "[data-timer-settings]",
  "days": "[data-days]",
  "hours": "[data-hours]",
  "minutes": "[data-minutes]",
  "seconds": "[data-seconds]"
};
const classes$b = {
  "active": "active",
  "hide": "hide",
  "complete": "complete"
};
function CountdownTimer(container) {
  const settings = n$2(selectors$s.settings, container);
  const {
    year,
    month,
    day,
    hour,
    minute,
    shopTimezone,
    timeZoneSelection,
    hideTimerOnComplete
  } = JSON.parse(settings.innerHTML);
  const daysEl = n$2(selectors$s.days, container);
  const hoursEl = n$2(selectors$s.hours, container);
  const minutesEl = n$2(selectors$s.minutes, container);
  const secondsEl = n$2(selectors$s.seconds, container);
  const timezoneString = timeZoneSelection === "shop" ? " GMT".concat(shopTimezone) : "";
  const countDownDate = new Date(Date.parse("".concat(month, " ").concat(day, ", ").concat(year, " ").concat(hour, ":").concat(minute).concat(timezoneString)));
  const countDownTime = countDownDate.getTime();
  const timerInterval = setInterval(timerLoop, 1000);
  timerLoop();
  u$1(container, classes$b.active);
  function timerLoop() {
    window.requestAnimationFrame(() => {
      // Get today's date and time
      const now = new Date().getTime();

      // Find the distance between now and the count down date
      const distance = countDownTime - now;

      // Time calculations for days, hours, minutes and seconds
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(distance % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
      const minutes = Math.floor(distance % (1000 * 60 * 60) / (1000 * 60));
      const seconds = Math.floor(distance % (1000 * 60) / 1000);

      // If the count down is finished, write some text
      if (distance < 0) {
        timerInterval && clearInterval(timerInterval);
        daysEl.innerHTML = 0;
        hoursEl.innerHTML = 0;
        minutesEl.innerHTML = 0;
        secondsEl.innerHTML = 0;
        u$1(container, classes$b.complete);
        if (hideTimerOnComplete) {
          u$1(container, classes$b.hide);
        }
      } else {
        daysEl.innerHTML = days;
        hoursEl.innerHTML = hours;
        minutesEl.innerHTML = minutes;
        secondsEl.innerHTML = seconds;
      }
    });
  }
  function destroy() {
    timerInterval && clearInterval(timerInterval);
  }
  return {
    destroy
  };
}

const selectors$r = {
  wash: ".popup__wash",
  dismissButtons: "[data-dismiss-popup]",
  tab: ".popup__tab",
  tabButton: ".popup__tab-button",
  tabDismiss: ".popup__tab-dismiss",
  newsletterForm: ".newsletter-form",
  formSuccessMessage: ".form-status__message--success",
  timer: "[data-countdown-timer]"
};
const classes$a = {
  visible: "visible"
};
function Popup(container) {
  const focusTrap = createFocusTrap(container, {
    allowOutsideClick: true
  });
  const popupAnimation = animatePopup(container);
  const wash = n$2(selectors$r.wash, container);
  const dismissButtons = t$2(selectors$r.dismissButtons, container);
  const formSuccessMessage = n$2(selectors$r.formSuccessMessage, container);
  const timer = n$2(selectors$r.timer, container);
  const {
    delayType,
    showOnExitIntent,
    id,
    isSignup,
    popupType
  } = container.dataset;
  const tab = n$2("".concat(selectors$r.tab, "[data-id=\"").concat(id, "\""));
  let {
    delayValue,
    hourFrequency
  } = container.dataset;
  delayValue = parseInt(delayValue, 10);
  hourFrequency = parseInt(hourFrequency, 10);
  const storageKey = "popup-".concat(id);
  const signupSubmittedKey = "signup-submitted-".concat(id);
  const formSuccessKey = "form-success-".concat(id);
  const signupDismissedKey = "signup-dismissed-".concat(id);
  const ageVerifiedKey = "age-verified-".concat(id);
  const isSignupPopup = isSignup === "true";
  const isAgeVerification = popupType === "age";
  let hasPoppedUp = false;
  let signupSubmitted = Boolean(getStorage(signupSubmittedKey));
  let formSuccessShown = Boolean(getStorage(formSuccessKey));
  let signupDismissed = Boolean(getStorage(signupDismissedKey));
  let ageVerified = Boolean(getStorage(ageVerifiedKey));
  let canPopUp = true;
  let countdownTimer = null;
  if (timer) {
    countdownTimer = CountdownTimer(timer);
  }
  ShouldPopUp();
  const events = [];
  if (!window.Shopify.designMode) {
    events.push(e$2(dismissButtons, "click", hidePopup));
  }
  if (!isAgeVerification && !window.Shopify.designMode) {
    // Only allow wash to be clickable for non age verification popups
    events.push(e$2(wash, "click", hidePopup));
    events.push(e$2(container, "keydown", _ref => {
      let {
        keyCode
      } = _ref;
      if (keyCode === 27) hidePopup();
    }));
  }
  if (isSignupPopup) {
    const form = n$2(selectors$r.newsletterForm, container);
    if (form) {
      events.push(e$2(form, "submit", onNewsletterSubmit));
    }
  }
  if (tab) {
    const tabButton = n$2(selectors$r.tabButton, tab);
    const tabDismiss = n$2(selectors$r.tabDismiss, tab);
    events.push(e$2(tabButton, "click", handleTabClick));
    events.push(e$2(tabDismiss, "click", hideTab));
  }

  // Show popup immediately if signup form was submitted
  if (isSignupPopup && formSuccessMessage && !formSuccessShown) {
    setStorage(formSuccessKey, JSON.stringify(new Date()));
    showPopup();
  } else {
    handleDelay();
    if (showOnExitIntent === "true" && !isMobile$1()) {
      handleExitIntent();
    }
  }
  function handleDelay() {
    if (!canPopUp) return;
    if (delayType === "timer") {
      setTimeout(() => {
        if (!hasPoppedUp) {
          showPopup();
          setStorage(storageKey, JSON.stringify(new Date()));
        }
      }, delayValue);
    } else if (delayType === "scroll") {
      // Delay window / page height calcs until window has loaded
      window.addEventListener("load", () => {
        const scrollPercent = delayValue / 100;
        const scrollTarget = (document.body.scrollHeight - window.innerHeight) * scrollPercent;
        const scrollListener = e$2(window, "scroll", () => {
          if (window.scrollY >= scrollTarget) {
            if (!hasPoppedUp) {
              showPopup();
              setStorage(storageKey, JSON.stringify(new Date()));
            }
            // Unbind listener
            scrollListener();
          }
        });
      }, {
        once: true
      });
    }
  }
  function handleExitIntent() {
    if (!canPopUp) return;
    const bodyLeave = e$2(document.body, "mouseout", e => {
      if (!e.relatedTarget && !e.toElement) {
        bodyLeave();
        if (!hasPoppedUp) {
          showPopup();
          setStorage(storageKey, JSON.stringify(new Date()));
          hasPoppedUp = true;
        }
      }
    });
  }
  function ShouldPopUp() {
    // To avoid popups appearing while in the editor we're disabling them
    // Popups will only be visible in customizer when selected
    if (window.Shopify.designMode) {
      canPopUp = false;
      return;
    }

    // If age has been verified then don't show popup
    // Or signup submitted or dismissed
    // don't show popup
    if (isAgeVerification && ageVerified || isSignupPopup && signupSubmitted) {
      canPopUp = false;
      return;
    }
    if (isSignupPopup && !signupSubmitted && signupDismissed) {
      canPopUp = false;
      if (tab) {
        showTab();
      }
      return;
    }

    // If no date has been set allow the popup to set the first when opened
    if (!isSignupPopup && !isAgeVerification && !getStorage(storageKey)) {
      return;
    }

    // Compare set date and allowed popup frequency hour diff
    const timeStart = new Date(getStorage(storageKey));
    const timeEnd = new Date();
    const hourDiff = (timeEnd - timeStart) / 1000 / 60 / 60;

    // Will not allow popup if the hour frequency is below the previously
    // set poppedup date.
    canPopUp = hourDiff > hourFrequency;
  }
  function handleTabClick() {
    showPopup();
    if (popupType === "flyout" && !window.Shopify.designMode) {
      const focusable = n$2("button, [href], input, select, textarea", container);
      if (focusable) {
        focusable.focus({
          preventScroll: true
        });
      }
    }
  }
  function showPopup() {
    u$1(container, classes$a.visible);
    popupAnimation.open();
    if (popupType === "popup" || popupType === "age") {
      if (!window.Shopify.designMode) {
        focusTrap.activate();
      }
      document.body.setAttribute("data-fluorescent-overlay-open", "true");
      disableBodyScroll(container);
    }
    hasPoppedUp = true;
    if (window.Shopify.designMode && tab) {
      // Show tab in theme editor
      showTab();
    } else if (tab) {
      // hide tab on popup open
      i$1(tab, classes$a.visible);
    }
  }
  function hidePopup() {
    i$1(container, classes$a.visible);
    if (isSignupPopup) {
      setStorage(signupDismissedKey, JSON.stringify(new Date()));
      // show tab on close, clicking the tab will open the popup again
      if (tab) {
        showTab();
      }
    }

    // Set storage when age verification popup has been dismissed
    // Age verification popups will always be shown until they are dismissed
    if (isAgeVerification) {
      setStorage(ageVerifiedKey, JSON.stringify(new Date()));
    }
    setTimeout(() => {
      popupAnimation.close();
      if (popupType === "popup" || popupType === "age") {
        focusTrap.deactivate();
        document.body.setAttribute("data-fluorescent-overlay-open", "false");
        enableBodyScroll(container);
      }
    }, 500);
  }
  function showTab() {
    u$1(tab, classes$a.visible);
  }
  function hideTab() {
    i$1(tab, classes$a.visible);
    // When tab is removed we want the popup to be able to open again if it has a frequency
    // We have to remove the storeage saying that the popup was dismissed
    removeStorage(signupDismissedKey);
  }
  function onNewsletterSubmit() {
    setStorage(signupSubmittedKey, JSON.stringify(new Date()));
  }
  function unload() {
    hidePopup();
    events.forEach(unsubscribe => unsubscribe());
    if (isAgeVerification) {
      enableBodyScroll(container);
    }
    countdownTimer && countdownTimer.destroy();
  }
  return {
    unload,
    showPopup,
    hidePopup
  };
}

register("popup", {
  onLoad() {
    this.popups = t$2("[data-popup]", this.container).map(popup => {
      return {
        contructor: Popup(popup),
        element: popup
      };
    });
  },
  onBlockSelect(_ref) {
    let {
      target
    } = _ref;
    const targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.showPopup();
  },
  onBlockDeselect(_ref2) {
    let {
      target
    } = _ref2;
    const targetPopup = this.popups.find(o => o.element === target);
    targetPopup.contructor.hidePopup();
  },
  onUnload() {
    this.popups.forEach(popup => {
      var _popup$contructor;
      return (_popup$contructor = popup.contructor) === null || _popup$contructor === void 0 ? void 0 : _popup$contructor.unload();
    });
  }
});

register("blog-posts", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateBlogPosts = animateBlogPosts(this.container);
    }
  },
  onUnload() {
    var _this$animateBlogPost;
    (_this$animateBlogPost = this.animateBlogPosts) === null || _this$animateBlogPost === void 0 || _this$animateBlogPost.destroy();
  }
});

const selectors$q = {
  itemTrigger: ".collapsible-row-list-item__trigger",
  header: "[data-section-type='header']"
};
register("collapsible-row-list", {
  onLoad() {
    this.items = t$2(selectors$q.itemTrigger, this.container);
    this.header = n$2(selectors$q.header, document);
    this.isStickyHeader = this.header.dataset.enableStickyHeader === "true";
    this.shouldAutoCollapse = this.container.dataset.autoCollapse === "true";
    this.clickHandlers = e$2(this.items, "click", e => {
      e.preventDefault();
      const {
        parentNode: group,
        nextElementSibling: content
      } = e.currentTarget;
      if (content && isVisible(content)) {
        this._close(e.currentTarget, group, content);
      } else {
        this._open(e.currentTarget, group, content);
      }
    });
    if (shouldAnimate(this.container)) {
      this.animateCollapsibleRowList = animateCollapsibleRowList(this.container);
    }
  },
  _closeOpenGroups(currentGroup) {
    for (const label of this.items) {
      const group = label.parentNode;
      if (group === currentGroup) continue;
      const content = label.nextElementSibling;
      if (content && isVisible(content)) {
        this._toggle(label, group, content, "up", false);
      }
    }
  },
  _open(label, group, content) {
    if (!content) return;
    if (this.shouldAutoCollapse) {
      this._closeOpenGroups(group);
      setTimeout(() => {
        if (this._isInView(label) === false) {
          label.scrollIntoView({
            block: "start",
            behavior: "smooth"
          });
        }
      }, 200);
    }
    this._toggle(label, group, content, "down", true);
  },
  _close(label, group, content) {
    if (!content) return;
    this._toggle(label, group, content, "up", false);
  },
  _isInView(element) {
    let headerHeight = 0;
    if (this.isStickyHeader) {
      headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-desktop-sticky-height").replace(/px/gi, ""));
    }
    const rect = element.getBoundingClientRect();
    return rect.top >= headerHeight && rect.bottom <= window.innerHeight;
  },
  _toggle(label, group, content, direction, isOpen) {
    slideStop(content);
    direction === "down" ? slideDown(content) : slideUp(content);
    group.setAttribute("data-open", isOpen);
    label.setAttribute("aria-expanded", isOpen);
    content.setAttribute("aria-hidden", !isOpen);
  },
  onBlockSelect(_ref) {
    let {
      target
    } = _ref;
    const label = n$2(selectors$q.itemTrigger, target);
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    this._open(label, group, content);
  },
  onUnload() {
    var _this$animateCollapsi;
    this.clickHandlers();
    (_this$animateCollapsi = this.animateCollapsibleRowList) === null || _this$animateCollapsi === void 0 || _this$animateCollapsi.destroy();
  }
});

register("collection-list-slider", {
  onLoad() {
    const {
      productsPerView,
      mobileProductsPerView
    } = this.container.dataset;
    this.events = [];
    this.perView = parseInt(productsPerView, 10);
    // 1.05 factor gives us a "peek" without CSS hacks
    // TODO: encapsulate this in carousel instead of duplication wherever
    // we call on carousel.  Can also simplify the config that we pass in
    // to something like perViewSmall, perViewMedium, perViewLarge and same with
    // spaceBetween?
    this.mobilePerView = parseInt(mobileProductsPerView, 10) * 1.05;
    this._initCarousel();
    if (shouldAnimate(this.container)) {
      this.animateListSlider = animateListSlider(this.container);
    }
  },
  _initCarousel() {
    // Between 720 - 960 the slides per view stay consistent with section
    // settings, with the exception of 5, which then shrinks down to 4 across.
    this.carousel = Carousel(this.container, {
      slidesPerView: this.mobilePerView,
      spaceBetween: 12,
      breakpoints: {
        720: {
          spaceBetween: 16,
          slidesPerView: this.perView === 5 ? this.perView - 1 : this.perView
        },
        1200: {
          spaceBetween: 24,
          slidesPerView: this.perView
        }
      }
    });
  },
  onUnload() {
    var _this$carousel, _this$animateListSlid;
    (_this$carousel = this.carousel) === null || _this$carousel === void 0 || _this$carousel.destroy();
    (_this$animateListSlid = this.animateListSlider) === null || _this$animateListSlid === void 0 || _this$animateListSlid.destroy();
  }
});

const selectors$p = {
  "timer": "[data-countdown-timer]"
};
register("countdown-banner", {
  onLoad() {
    const timers = t$2(selectors$p.timer, this.container);
    this.countdownTimers = [];
    timers.forEach(timer => {
      this.countdownTimers.push(CountdownTimer(timer));
    });
    if (shouldAnimate(this.container)) {
      this.animateCountdownBanner = animateCountdownBanner(this.container);
    }
  },
  onUnload() {
    var _this$animateCountdow;
    (_this$animateCountdow = this.animateCountdownBanner) === null || _this$animateCountdow === void 0 || _this$animateCountdow.destroy();
    this.countdownTimers.forEach(countdownTimer => countdownTimer.destroy());
  }
});

const selectors$o = {
  "timer": "[data-countdown-timer]"
};
register("countdown-bar", {
  onLoad() {
    const timers = t$2(selectors$o.timer, this.container);
    this.countdownTimers = [];
    timers.forEach(timer => {
      this.countdownTimers.push(CountdownTimer(timer));
    });
    if (shouldAnimate(this.container)) {
      this.animateCountdownBar = animateCountdownBar(this.container);
    }
  },
  onUnload() {
    var _this$animateCountdow;
    (_this$animateCountdow = this.animateCountdownBar) === null || _this$animateCountdow === void 0 || _this$animateCountdow.destroy();
    this.countdownTimers.forEach(countdownTimer => countdownTimer.destroy());
  }
});

register("featured-collection-grid", {
  onLoad() {
    const {
      productsPerView,
      mobileProductsPerView
    } = this.container.dataset;
    this.events = [];
    this.perView = parseInt(productsPerView, 10);
    this.mobilePerView = parseInt(mobileProductsPerView, 10) * 1.05;
    // 1.05 factor gives us a "peek" without CSS hacks
    // TODO: encapsulate this in carousel instead of duplication wherever
    // we call on carousel.  Can also simplify the config that we pass in
    // to something like perViewSmall, perViewMedium, perViewLarge and same with
    // spaceBetween?

    this.productItem = ProductItem(this.container);
    this.breakPointHandler = atBreakpointChange(960, () => {
      if (window.matchMedia(getMediaQuery("below-960")).matches) {
        this._initCarousel();
      } else {
        this.carousel.destroy();
      }
    });
    if (window.matchMedia(getMediaQuery("below-960")).matches) {
      this._initCarousel();
    }
    if (shouldAnimate(this.container)) {
      this.animateFeaturedCollectionGrid = animateFeaturedCollectionGrid(this.container);
    }
  },
  _initCarousel() {
    // Between 720 - 960 the slides per view stay consistent with section
    // settings, with the exception of 5, which then shrinks down to 4 across.
    this.carousel = Carousel(this.container, {
      slidesPerView: this.mobilePerView,
      spaceBetween: 12,
      breakpoints: {
        720: {
          spaceBetween: 16,
          slidesPerView: this.perView === 5 ? this.perView - 1 : this.perView
        }
      }
    });
  },
  onUnload() {
    var _this$carousel, _this$animateFeatured;
    (_this$carousel = this.carousel) === null || _this$carousel === void 0 || _this$carousel.destroy();
    (_this$animateFeatured = this.animateFeaturedCollectionGrid) === null || _this$animateFeatured === void 0 || _this$animateFeatured.destroy();
  }
});

const selectors$n = {
  navItems: ".featured-collection-slider__navigation-list-item",
  sliderContainer: ".carousel",
  navButtons: ".carousel__navigation-buttons"
};
const classes$9 = {
  selected: "selected",
  visible: "visible",
  fadeout: "fadeout",
  initReveal: "init-reveal",
  reveal: "reveal"
};
register("featured-collection-slider", {
  onLoad() {
    this.events = [];
    this.carousels = [];
    this._initCarousels();
    if (shouldAnimate(this.container)) {
      this.animateListSlider = animateListSlider(this.container);
    }
  },
  _initCarousels() {
    const {
      productsPerView,
      mobileProductsPerView
    } = this.container.dataset;
    this.perView = parseInt(productsPerView, 10);
    this.mobilePerView = parseInt(mobileProductsPerView, 10) * 1.05;
    // 1.05 factor gives us a "peek" without CSS hacks
    // TODO: encapsulate this in carousel instead of duplication wherever
    // we call on carousel.  Can also simplify the config that we pass in
    // to something like perViewSmall, perViewMedium, perViewLarge and same with
    // spaceBetween?

    this.productItem = ProductItem(this.container);
    this.carouselsElements = t$2(selectors$n.sliderContainer, this.container);
    this.navItems = t$2(selectors$n.navItems, this.container);
    this.navigationButtons = t$2(selectors$n.navButtons, this.container);
    this.navItems.forEach(button => this.events.push(e$2(button, "click", this._handleNavButton.bind(this))));
    this.carouselsElements.forEach((container, index) => {
      const navigationWrapper = n$2("[data-navigation=\"".concat(index, "\"]"), this.container);
      const nextButton = n$2("[data-next]", navigationWrapper);
      const prevButton = n$2("[data-prev]", navigationWrapper);
      this.carousels.push(Carousel(container, {
        slidesPerView: this.mobilePerView,
        spaceBetween: 13,
        // matches product grid
        navigation: {
          nextEl: nextButton,
          prevEl: prevButton
        },
        breakpoints: {
          720: {
            spaceBetween: 17,
            // matches product grid
            slidesPerView: this.perView === 5 ? this.perView - 1 : this.perView
          },
          1200: {
            spaceBetween: 25,
            // matches product grid
            slidesPerView: this.perView
          }
        }
      }));
    });
  },
  _handleNavButton(e) {
    e.preventDefault();
    const {
      navigationItem
    } = e.currentTarget.dataset;
    if (!a$1(e.currentTarget, classes$9.selected)) {
      this._hideAll();
      this._show(parseInt(navigationItem, 10));
    }
  },
  _hideAll() {
    i$1(this.navItems, classes$9.selected);
    i$1(this.navigationButtons, classes$9.visible);
    i$1(this.carouselsElements, classes$9.initReveal);
    i$1(this.carouselsElements, classes$9.reveal);
    if (shouldAnimate(this.container)) {
      u$1(this.carouselsElements, classes$9.fadeout);
      setTimeout(() => {
        i$1(this.carouselsElements, classes$9.visible);
      }, 300);
    } else {
      i$1(this.carouselsElements, classes$9.visible);
    }
  },
  _show(index) {
    const navigationWrapper = n$2("[data-navigation=\"".concat(index, "\"]"), this.container);
    u$1(navigationWrapper, classes$9.visible);
    const collection = n$2("[data-collection=\"".concat(index, "\"]"), this.container);
    if (this.navItems.length) {
      const navigationItem = n$2("[data-navigation-item=\"".concat(index, "\"]"), this.container);
      u$1(navigationItem, classes$9.selected);
    }
    if (shouldAnimate(this.container)) {
      u$1(collection, classes$9.fadeout);
      u$1(collection, classes$9.initReveal);
      setTimeout(() => {
        u$1(collection, classes$9.visible);
        i$1(collection, classes$9.fadeout);
        setTimeout(() => {
          u$1(collection, classes$9.reveal);
        }, 50);
      }, 300);
    } else {
      u$1(collection, classes$9.visible);
    }
  },
  onUnload() {
    var _this$animateListSlid;
    this.carousels.forEach(swiper => swiper.destroy());
    (_this$animateListSlid = this.animateListSlider) === null || _this$animateListSlid === void 0 || _this$animateListSlid.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
  },
  onBlockSelect(_ref) {
    let {
      target
    } = _ref;
    const {
      collection
    } = target.dataset;
    this._hideAll();
    this._show(parseInt(collection, 10));
  }
});

register("featured-product", {
  onLoad() {
    this.product = new Product(this.container);
    if (shouldAnimate(this.container)) {
      this.animateProduct = animateProduct(this.container);
    }
  },
  onBlockSelect(_ref) {
    let {
      target
    } = _ref;
    const label = n$2(".accordion__label", target);
    target.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideDown(content);
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  },
  onBlockDeselect(_ref2) {
    let {
      target
    } = _ref2;
    const label = n$2(".accordion__label", target);
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },
  onUnload() {
    var _this$animateProduct;
    this.product.unload();
    (_this$animateProduct = this.animateProduct) === null || _this$animateProduct === void 0 || _this$animateProduct.destroy();
  }
});

register("gallery-carousel", {
  onLoad() {
    const {
      loopCarousel,
      productsPerView,
      mobileProductsPerView
    } = this.container.dataset;

    // Convert loop setting string into boolean
    this.loopCarousel = loopCarousel === "true";
    this.perView = parseInt(productsPerView, 10) * 1.05;
    // 1.05 factor gives us a "peek" without CSS hacks
    // TODO: encapsulate this in carousel instead of duplication wherever
    // we call on carousel.  Can also simplify the config that we pass in
    // to something like perViewSmall, perViewMedium, perViewLarge and same with
    // spaceBetween?
    this.mobilePerView = parseInt(mobileProductsPerView, 10) * 1.05;
    this._initCarousel();
    if (shouldAnimate(this.container)) {
      this.animateListSlider = animateListSlider(this.container);
    }
  },
  _initCarousel() {
    // Between 720 - 960 the slides per view stay consistent with section
    // settings, with the exception of 5, which then shrinks down to 4 across.
    this.carousel = Carousel(this.container, {
      slidesPerView: this.mobilePerView,
      spaceBetween: 12,
      loop: this.loopCarousel,
      breakpoints: {
        720: {
          spaceBetween: 16,
          slidesPerView: this.perView
        },
        1200: {
          spaceBetween: 24,
          slidesPerView: this.perView
        }
      }
    });
  },
  onUnload() {
    var _this$carousel, _this$animateListSlid;
    (_this$carousel = this.carousel) === null || _this$carousel === void 0 || _this$carousel.destroy();
    (_this$animateListSlid = this.animateListSlider) === null || _this$animateListSlid === void 0 || _this$animateListSlid.destroy();
  }
});

const selectors$m = {
  recentlyViewed: "[data-recently-viewed]",
  carousel: ".carousel",
  carouselSlide: ".carousel__slide",
  navButtons: ".carousel__navigation-buttons"
};
register("recently-viewed-products", {
  onLoad() {
    const {
      limit,
      productsPerView,
      mobileProductsPerView,
      productHandle
    } = this.container.dataset;
    this.limit = parseInt(limit, 10);
    this.perView = parseInt(productsPerView, 10);
    this.mobilePerView = parseInt(mobileProductsPerView, 10) * 1.05;
    // 1.05 factor gives us a "peek" without CSS hacks
    // TODO: encapsulate this in carousel instead of duplication wherever
    // we call on carousel.  Can also simplify the config that we pass in
    // to something like perViewSmall, perViewMedium, perViewLarge and same with
    // spaceBetween?

    this.recentProductsContainer = n$2(".recently-viewed-products__slider-wrapper", this.container);

    // Grab products from localStorage
    const recentProducts = getRecentProducts();
    if (!(recentProducts || []).length) {
      this._removeSection();
      return;
    }
    const recentProductsTrimmed = recentProducts.filter(handle => handle !== productHandle) // don't show current product
    .slice(0, this.limit);
    if (recentProductsTrimmed.length >= 1) {
      this._renderProductItems(recentProductsTrimmed);
    } else {
      this._removeSection();
    }
  },
  _renderProductItems(productHandles) {
    const actions = productHandles.map(this._renderProductItem.bind(this));
    const results = Promise.all(actions);
    results.then(() => {
      const content = n$2(selectors$m.recentlyViewed, this.container);
      const carouselSlide = n$2(selectors$m.carouselSlide, this.container);
      this.productItem = ProductItem(this.container);
      if (shouldAnimate(this.container)) {
        this.animateListSlider = animateListSlider(this.container);
      }
      if (carouselSlide) {
        // Between 720 - 960 the slides per view stay consistent with section
        // settings, with the exception of 5, which then shrinks down to 4 across.
        this.carousel = Carousel(content, {
          slidesPerView: this.mobilePerView,
          spaceBetween: 12,
          breakpoints: {
            720: {
              spaceBetween: 16,
              slidesPerView: this.perView === 5 ? this.perView - 1 : this.perView
            },
            1200: {
              spaceBetween: 24,
              slidesPerView: this.perView
            }
          }
        });
      } else {
        this._removeSection(); // catch the situation where no product handles are valid
      }
    });
  },
  _renderProductItem(productHandle) {
    return new Promise(resolve => {
      const requestUrl = "".concat(theme.routes.products, "/").concat(productHandle, "?section_id=recently-viewed-product-item");
      makeRequest("GET", requestUrl).then(response => {
        let container = document.createElement("div");
        container.innerHTML = response;
        const productItem = container.querySelector("[data-recently-viewed-item]").innerHTML;
        this.recentProductsContainer.insertAdjacentHTML("beforeend", productItem);
        resolve();
      }).catch(() => {
        console.error("Recent product \"".concat(productHandle, "\" not found"));
        resolve(); // continue if product not found
      });
    });
  },
  _removeSection() {
    this.container.parentNode.removeChild(this.container);
  },
  onUnload() {
    var _this$carousel, _this$animateListSlid;
    (_this$carousel = this.carousel) === null || _this$carousel === void 0 || _this$carousel.destroy();
    (_this$animateListSlid = this.animateListSlider) === null || _this$animateListSlid === void 0 || _this$animateListSlid.destroy();
  }
});

const selectors$l = {
  recommendations: "[data-recommendations]",
  carouselSlide: ".carousel__slide"
};
register("recommended-products", {
  onLoad() {
    const {
      limit,
      productId: id,
      sectionId,
      productsPerView,
      mobileProductsPerView
    } = this.container.dataset;
    this.perView = parseInt(productsPerView, 10);
    this.mobilePerView = parseInt(mobileProductsPerView, 10) * 1.05;
    // 1.05 factor gives us a "peek" without CSS hacks
    // TODO: encapsulate this in carousel instead of duplication wherever
    // we call on carousel.  Can also simplify the config that we pass in
    // to something like perViewSmall, perViewMedium, perViewLarge and same with
    // spaceBetween?

    const content = n$2(selectors$l.recommendations, this.container);
    if (!content) return;
    const requestUrl = "".concat(window.theme.routes.productRecommendations, "?section_id=").concat(sectionId, "&limit=").concat(limit, "&product_id=").concat(id);
    const request = new XMLHttpRequest();
    request.open("GET", requestUrl, true);
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        let container = document.createElement("div");
        container.innerHTML = request.response;
        content.innerHTML = n$2(selectors$l.recommendations, container).innerHTML;
        const carousel = n$2(selectors$l.carouselSlide, content);
        this.productItem = ProductItem(this.container);
        if (shouldAnimate(this.container)) {
          this.animateListSlider = animateListSlider(this.container);
        }
        if (carousel) {
          // Between 720 - 960 the slides per view stay consistent with section
          // settings, with the exception of 5, which then shrinks down to 4 across.
          this.carousel = Carousel(content, {
            slidesPerView: this.mobilePerView,
            spaceBetween: 12,
            breakpoints: {
              720: {
                spaceBetween: 16,
                slidesPerView: this.perView === 5 ? this.perView - 1 : this.perView
              },
              1200: {
                spaceBetween: 24,
                slidesPerView: this.perView
              }
            }
          });
        } else {
          this._removeSection();
        }
      } else {
        // If request returns any errors remove the section markup
        this._removeSection();
      }
    };
    request.send();
  },
  _removeSection() {
    this.container.parentNode.removeChild(this.container);
  },
  onUnload() {
    var _this$carousel, _this$animateListSlid;
    (_this$carousel = this.carousel) === null || _this$carousel === void 0 || _this$carousel.destroy();
    (_this$animateListSlid = this.animateListSlider) === null || _this$animateListSlid === void 0 || _this$animateListSlid.destroy();
  }
});

const classes$8 = {
  activeDot: "slideshow-navigation__dot--active",
  navigationLoader: "slideshow-navigation__dot-loader"
};
const selectors$k = {
  slide: "[data-slide]",
  swiper: ".swiper",
  navigationPrev: ".slideshow-navigation__navigation-button--previous",
  navigationNext: ".slideshow-navigation__navigation-button--next",
  navigationDots: ".slideshow-navigation__dots",
  navigationDot: ".slideshow-navigation__dot",
  navigationLoader: ".slideshow-navigation__dot-loader",
  animatableItems: ".animation--section-blocks > *",
  pageFooter: "footer",
  video: "[data-background-video]",
  videoSlide: "[data-slide][data-slide-type='video']"
};
register("slideshow", {
  onLoad() {
    this.events = [];
    this.enableAutoplay = this.container.dataset.enableAutoplay;
    this.autoplayDuration = this.container.dataset.autoplay;
    this.pageFooter = n$2(selectors$k.pageFooter, document);
    this.slideshow = null;
    this.slideshowContainer = n$2(selectors$k.swiper, this.container);
    this.slides = t$2(selectors$k.slide, this.container);
    this.events.push(e$2(this.container, "focusin", () => this.handleFocus()));
    if (shouldAnimate(this.container)) {
      this.slideAnimations = this.slides.map(slide => delayOffset(slide, [selectors$k.animatableItems], 3));
      this.observer = intersectionWatcher(this.container);
    }
    if (this.slides.length > 1) {
      import(flu.chunks.swiper).then(_ref => {
        let {
          Swiper,
          Navigation,
          Autoplay,
          Pagination,
          EffectFade,
          EffectCreative
        } = _ref;
        const swiperOptions = {
          modules: [Navigation, Pagination],
          autoHeight: true,
          slidesPerView: 1,
          grabCursor: true,
          effect: "fade",
          fadeEffect: {
            crossFade: false
          },
          watchSlidesProgress: true,
          loop: true,
          navigation: {
            nextEl: selectors$k.navigationNext,
            prevEl: selectors$k.navigationPrev
          },
          preloadImages: false,
          // if this is true, it negates benefits of lazyloading
          pagination: {
            el: selectors$k.navigationDots,
            clickable: true,
            bulletActiveClass: classes$8.activeDot,
            bulletClass: "slideshow-navigation__dot",
            renderBullet: (_, className) => "\n                <button class=\"".concat(className, "\" type=\"button\">\n                  <div class=\"slideshow-navigation__dot-loader\"></div>\n                </button>")
          },
          on: {
            afterInit: swiper => {
              this.handleBulletLabels();
              this.manageVideoState(swiper.realIndex);
            },
            slideChange: swiper => {
              this.manageVideoState(swiper.realIndex);
            },
            slideChangeTransitionEnd: () => {
              const slideEls = this.slides;
              setTimeout(() => {
                slideEls.forEach(slide => {
                  const isActive = slide.classList.contains("swiper-slide-active");
                  slide.toggleAttribute("inert", !isActive);
                });
              }, 50);
            }
          }
        };
        if (this.enableAutoplay === "true") {
          swiperOptions.modules.push(Autoplay);
          swiperOptions.autoplay = {
            delay: this.autoplayDuration,
            disableOnInteraction: false
          };
          this.autoplayObserver = new IntersectionObserver(_ref2 => {
            let [{
              isIntersecting: visible
            }] = _ref2;
            if (visible) {
              this.playSlideshow();
            } else {
              this.pauseSlideshow();
            }
          });
          this.footerObserver = new IntersectionObserver(_ref3 => {
            let [{
              isIntersecting: visible
            }] = _ref3;
            if (visible) {
              this.autoplayObserver.disconnect();
              this.pauseSlideshow();
            } else {
              this.autoplayObserver.observe(this.slideshowContainer);
            }
          }, {
            threshold: 0.8
          });

          // blocking this function within 2 levels of iframes allows for the section preview to show and animate in the theme editor
          if (window.frames < 2) {
            this.footerObserver.observe(this.pageFooter);
          }
        }
        if (!prefersReducedMotion()) {
          swiperOptions.modules.push(EffectFade);
          swiperOptions.effect = "fade";
          swiperOptions.fadeEffect = {
            crossFade: false
          };
        } else {
          swiperOptions.modules.push(EffectCreative);
          swiperOptions.effect = "creative";
          swiperOptions.creativeEffect = {
            prev: {
              opacity: 0.99
            },
            next: {
              opacity: 1
            }
          };
        }
        this.slideshow = new Swiper(this.slideshowContainer, swiperOptions);
        this.navigationLoaderEls = t$2(selectors$k.navigationLoader, this.container);
        r$1("slideshow:initialized");
      });
    }
  },
  resetLoaderAnimation(loader) {
    i$1(loader, classes$8.navigationLoader);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // double RAF lets the document recompute styles
        u$1(loader, classes$8.navigationLoader);
      });
    });
  },
  pauseSlideshow() {
    this.slideshow.autoplay.stop();
    this.navigationLoaderEls.forEach(loader => {
      loader.style.animationPlayState = "paused";
    });
  },
  playSlideshow() {
    var _this$slideshow;
    (_this$slideshow = this.slideshow) === null || _this$slideshow === void 0 || _this$slideshow.autoplay.start();
    this.navigationLoaderEls.forEach(loader => {
      this.resetLoaderAnimation(loader);
      loader.style.animationPlayState = "running";
    });
  },
  manageVideoState(realIndex) {
    const formatedIndex = realIndex + 1;
    const realIndexString = formatedIndex.toString();
    // Slides get duplicated when swiper loops so we need to find all the videos
    const allVideoSlides = t$2(selectors$k.videoSlide, this.container);
    allVideoSlides.forEach(slide => {
      const video = slide.querySelector(selectors$k.video);
      if (!video) return;
      const pauseBtn = slide.querySelector("[js-video-pause-button]");
      const slideIndex = slide.dataset.slide;
      if (realIndexString === slideIndex) {
        // don't auto-play if user paused via a11y button
        if (video.dataset.a11yPriorityPause === "true") {
          return;
        }
        this.setPlayPause(video, pauseBtn, "play");
      } else {
        this.setPlayPause(video, pauseBtn, "pause");
      }
    });
  },
  setPlayPause(video, pauseBtn, state) {
    if (!video) return;
    const {
      strings: {
        accessibility: strings
      },
      icons
    } = window.theme;
    if (state === "pause") {
      video.pause();
      if (pauseBtn) {
        if (pauseBtn.dataset.pauseButtonContent === "icon") {
          pauseBtn.innerHTML = icons.play;
        } else {
          pauseBtn.innerText = strings.play_video;
        }
      }
    } else {
      video.play();
      if (pauseBtn) {
        if (pauseBtn.dataset.pauseButtonContent === "icon") {
          pauseBtn.innerHTML = icons.pause;
        } else {
          pauseBtn.innerText = strings.pause_video;
        }
      }
    }
  },
  handleFocus() {
    if (a$1(document.body, "user-is-tabbing")) {
      this.pauseSlideshow();
    }
  },
  handleBulletLabels() {
    const bullets = t$2(selectors$k.navigationDot, this.container);
    bullets.forEach((bullet, index) => {
      const associatedSlide = this.slides[index];
      const {
        bulletLabel
      } = associatedSlide.dataset;
      bullet.setAttribute("aria-label", bulletLabel);
    });
  },
  handleBlockSelect(slideIndex) {
    const index = parseInt(slideIndex, 10);
    if (!this.slideshow) return;
    this.slideshow.slideTo(index);
    this.pauseSlideshow();

    // sync background video when slide/block is updated
    // swiper realIndex is 0-based, data-slide is 1-based
    setTimeout(() => {
      this.manageVideoState(index - 1);
    }, 50);
  },
  handleBlockDeselect() {
    this.playSlideshow();
  },
  onBlockSelect(_ref4) {
    let {
      target
    } = _ref4;
    const {
      slide
    } = target.dataset;
    if (!slide) return;
    if (this.slideshow) {
      this.handleBlockSelect(slide);
    } else {
      // Listen for initalization if slideshow does not exist
      this.events.push(c("slideshow:initialized", () => {
        this.handleBlockSelect(slide);
      }));
    }
  },
  onBlockDeselect() {
    if (this.slideshow) {
      this.handleBlockDeselect();
    } else {
      // Listen for initalization if slideshow does not exist
      this.events.push(c("slideshow:initialized", () => {
        this.handleBlockDeselect();
      }));
    }
  },
  onUnload() {
    var _this$slideshow2, _this$observer, _this$autoplayObserve, _this$footerObserver;
    (_this$slideshow2 = this.slideshow) === null || _this$slideshow2 === void 0 || _this$slideshow2.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$observer = this.observer) === null || _this$observer === void 0 || _this$observer.destroy();
    (_this$autoplayObserve = this.autoplayObserver) === null || _this$autoplayObserve === void 0 || _this$autoplayObserve.disconnect();
    (_this$footerObserver = this.footerObserver) === null || _this$footerObserver === void 0 || _this$footerObserver.disconnect();
  }
});

let loaded$1 = null;
function loadYouTubeAPI() {
  // Loading was triggered by a previous call to function
  if (loaded$1 !== null) return loaded$1;

  // API has already loaded
  if (window.YT && window.YT.loaded) {
    loaded$1 = Promise.resolve();
    return loaded$1;
  }

  // Otherwise, load API
  loaded$1 = new Promise(resolve => {
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  });
  return loaded$1;
}

let loaded = null;
function loadVimeoAPI() {
  // Loading was triggered by a previous call to function
  if (loaded !== null) return loaded;

  // API has already loaded
  if (window.Vimeo) {
    loaded = Promise.resolve();
    return loaded;
  }

  // Otherwise, load API
  loaded = new Promise(resolve => {
    const tag = document.createElement("script");
    tag.src = "https://player.vimeo.com/api/player.js";
    tag.onload = resolve;
    document.body.appendChild(tag);
  });
  return loaded;
}

const selectors$j = {
  video: ".video__video",
  videoExternal: "[data-video-external-target]",
  image: ".video__image",
  overlay: ".video__overlay",
  text: ".video__text-container-wrapper",
  playTrigger: ".video__text-container-wrapper"
};
const classes$7 = {
  visible: "visible"
};
register("video", {
  onLoad() {
    this.events = [];
    const playTrigger = n$2(selectors$j.playTrigger, this.container);
    const video = n$2(selectors$j.video, this.container);
    const videoExternal = n$2(selectors$j.videoExternal, this.container);
    const image = n$2(selectors$j.image, this.container);
    const overlay = n$2(selectors$j.overlay, this.container);
    const text = n$2(selectors$j.text, this.container);
    if (videoExternal) {
      const {
        videoProvider,
        videoId,
        loop
      } = videoExternal.dataset;
      switch (videoProvider) {
        case "youtube":
          loadYouTubeAPI().then(() => {
            const player = new window.YT.Player(videoExternal, {
              videoId,
              playerVars: {
                autohide: 0,
                cc_load_policy: 0,
                controls: 1,
                iv_load_policy: 3,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                loop: loop,
                playlist: videoId
              },
              events: {
                onReady: () => {
                  player.getIframe().tabIndex = "-1";
                  this.events.push(e$2(playTrigger, "click", () => {
                    player.playVideo();
                  }));
                },
                onStateChange: event => {
                  if (event.data == YT.PlayerState.PLAYING) {
                    player.getIframe().tabIndex = "0";
                    hideCover();
                  }
                }
              }
            });
          });
          break;
        case "vimeo":
          loadVimeoAPI().then(() => {
            const player = new window.Vimeo.Player(videoExternal, {
              id: videoId,
              controls: true,
              keyboard: false
            });
            player.element.tabIndex = "-1";
            if (loop === "true") {
              player.setLoop(1);
            }
            this.events.push(e$2(playTrigger, "click", () => {
              player.play();
              player.element.tabIndex = "0";
              hideCover();
            }));
          });
          break;
      }
    }
    if (playTrigger) {
      if (video) {
        this.events.push(e$2(playTrigger, "click", () => {
          video.play();
        }));
      }
    }
    if (video) {
      this.events.push(e$2(video, "playing", () => {
        video.setAttribute("controls", "");
        hideCover();
      }));
    }
    function hideCover() {
      i$1(overlay, classes$7.visible);
      i$1(text, classes$7.visible);
      image && i$1(image, classes$7.visible);
    }
    if (shouldAnimate(this.container)) {
      this.animateVideo = animateVideo(this.container);
    }
  },
  onUnload() {
    var _this$animateVideo;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    this.events.forEach(unsubscribe => unsubscribe());
    this.videoHandler && this.videoHandler();
    (_this$animateVideo = this.animateVideo) === null || _this$animateVideo === void 0 || _this$animateVideo.destroy();
  }
});

const selectors$i = {
  playButton: "[data-play-button-block]",
  playButtonVideoContainer: "[data-play-button-block-video-container]",
  photoSwipeElement: ".pswp",
  video: ".play-button-block-video"
};
const {
  icons
} = window.theme;
const playButton = node => {
  let photoSwipeInstance;
  const playButton = n$2(selectors$i.playButton, node);
  const videoHtml = n$2(selectors$i.playButtonVideoContainer, node);
  const videoType = videoHtml.dataset.videoType;
  import(flu.chunks.photoswipe); // Load this ahead of needing

  const events = [e$2(playButton, "click", () => {
    import(flu.chunks.photoswipe).then(_ref => {
      let {
        PhotoSwipeLightbox,
        PhotoSwipe
      } = _ref;
      photoSwipeInstance = new PhotoSwipeLightbox({
        dataSource: [{
          html: videoHtml.outerHTML
        }],
        pswpModule: PhotoSwipe,
        mainClass: "pswp--video-lightbox",
        closeSVG: icons.close,
        arrowPrev: false,
        arrowNext: false,
        zoom: false,
        counter: false
      });
      photoSwipeInstance.init();
      photoSwipeInstance.loadAndOpen();
      photoSwipeInstance.on("bindEvents", () => {
        const instanceVideo = n$2(selectors$i.video, photoSwipeInstance.pswp.container);
        if (videoType == "shopify") {
          instanceVideo.play();
        } else {
          initExternalVideo(instanceVideo);
        }
      });
    });
  })];
  const initExternalVideo = video => {
    const {
      videoProvider,
      videoId
    } = video.dataset;
    switch (videoProvider) {
      case "youtube":
        loadYouTubeAPI().then(() => {
          const player = new window.YT.Player(video, {
            videoId,
            playerVars: {
              autohide: 0,
              cc_load_policy: 0,
              controls: 1,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              playlist: videoId
            },
            events: {
              onReady: () => {
                player.playVideo();
                player.getIframe().tabIndex = "0";
              }
            }
          });
        });
        break;
      case "vimeo":
        loadVimeoAPI().then(() => {
          const player = new window.Vimeo.Player(video, {
            id: videoId,
            controls: true,
            keyboard: false
          });
          player.play();
          player.element.tabIndex = "0";
        });
        break;
    }
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    photoSwipeInstance && photoSwipeInstance.destroy();
  };
  return {
    unload
  };
};

const checkAutoPlay = (video, mediaContainer) => {
  if (!video) return;
  const events = [e$2(window, "click", () => _handleAutoPlay()), e$2(window, "touchstart", () => _handleAutoPlay()), e$2(video, "playing", () => _handleVideoPlaying())];

  // Force autoplay after device interaction if in low power mode
  function _handleAutoPlay() {
    if (video.paused) {
      video.play();
    }
  }
  function _handleVideoPlaying() {
    mediaContainer.dataset.videoLoading = "false";
    events.forEach(unsubscribe => unsubscribe());
  }
};

const selectors$h = {
  mediaContainer: ".video-hero__media-container",
  video: ".video-hero__video",
  videoDefaultTemplate: "#default-video-template",
  videoMobileTemplate: "#mobile-video-template",
  currentVideoContainer: ".current-video-container",
  playButtonVideo: "[data-play-button-block-video]",
  playButtonBlock: ".play-button-block"
};
register("video-hero", {
  videoHandler: null,
  onLoad() {
    const playButtonVideos = t$2(selectors$h.playButtonVideo, this.container);
    this.mediaContainer = n$2(selectors$h.mediaContainer, this.container);
    if (playButtonVideos.length) {
      this.playButtons = playButtonVideos.map(block => playButton(block.closest(selectors$h.playButtonBlock)));
    }
    const hasVideo = this.mediaContainer.dataset.hasVideo === "true";
    const hasMobileVideo = this.mediaContainer.dataset.hasMobileVideo === "true";
    if (hasMobileVideo) {
      if (window.matchMedia(getMediaQuery("below-720")).matches) {
        this._updateVideoTemplate("mobile");
      } else {
        this._updateVideoTemplate("default");
      }
      atBreakpointChange(720, () => {
        if (window.matchMedia(getMediaQuery("below-720")).matches) {
          this._updateVideoTemplate("mobile");
        } else {
          this._updateVideoTemplate("default");
        }
      });
    } else if (hasVideo) {
      this._updateVideoTemplate("default");
    }
    if (shouldAnimate(this.container)) {
      this.animateVideoHero = animateVideoHero(this.container);
    }
  },
  _updateVideoTemplate(videoType) {
    const currentVideoContainer = n$2(selectors$h.currentVideoContainer, this.container);
    const videoTemplateSelector = videoType === "mobile" ? selectors$h.videoMobileTemplate : selectors$h.videoDefaultTemplate;
    const videoTemplate = n$2(videoTemplateSelector, this.mediaContainer);
    const currentVideoTemplate = videoTemplate.content.cloneNode(true);
    const currentVideoEl = n$2(selectors$h.video, currentVideoTemplate);

    // Manual reset of mute attr required for most browsers to autoplay
    if (currentVideoEl) {
      currentVideoEl.muted = true;
    }
    currentVideoContainer.innerHTML = "";
    currentVideoContainer.appendChild(currentVideoTemplate);
    this._playVideo(currentVideoEl);
  },
  _playVideo(video) {
    this.videoHandler = backgroundVideoHandler(this.container);

    // play function is required for mobile & Safari or video will stay paused
    if (video) {
      video.play();
      checkAutoPlay(video, this.mediaContainer);
    }

    // if video is still not ready, show the fallback image
    if (video && video.paused) {
      this.mediaContainer.dataset.videoLoading = "true";
    }
  },
  onUnload() {
    var _this$animateVideoHer;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    this.videoHandler && this.videoHandler();
    (_this$animateVideoHer = this.animateVideoHero) === null || _this$animateVideoHer === void 0 || _this$animateVideoHer.destroy();
  }
});

const selectors$g = {
  mediaContainer: ".video-with-text__media-container",
  video: ".video-with-text__video",
  videoDefaultTemplate: "#default-video-with-text-template",
  videoMobileTemplate: "#mobile-video-with-text-template",
  currentVideoContainer: ".current-video-with-text-container",
  playButtonVideo: "[data-play-button-block]",
  playButtonBlock: ".play-button-block"
};
register("video-with-text", {
  videoHandler: null,
  onLoad() {
    const playButtonVideos = t$2(selectors$g.playButtonVideo, this.container);
    this.mediaContainer = n$2(selectors$g.mediaContainer, this.container);
    if (playButtonVideos.length) {
      this.playButtons = playButtonVideos.map(block => playButton(block.closest(selectors$g.playButtonBlock)));
    }
    const hasVideo = this.mediaContainer.dataset.hasVideo === "true";
    const hasMobileVideo = this.mediaContainer.dataset.hasMobileVideo === "true";
    if (hasMobileVideo) {
      if (window.matchMedia(getMediaQuery("below-720")).matches) {
        this._updateVideoTemplate("mobile");
      } else {
        this._updateVideoTemplate("default");
      }
      atBreakpointChange(720, () => {
        if (window.matchMedia(getMediaQuery("below-720")).matches) {
          this._updateVideoTemplate("mobile");
        } else {
          this._updateVideoTemplate("default");
        }
      });
    } else if (hasVideo) {
      this._updateVideoTemplate("default");
    }
    if (shouldAnimate(this.container)) {
      this.animateVideoHero = animateVideoHero(this.container);
    }
  },
  _updateVideoTemplate(videoType) {
    const currentVideoContainer = n$2(selectors$g.currentVideoContainer, this.container);
    const videoTemplateSelector = videoType === "mobile" ? selectors$g.videoMobileTemplate : selectors$g.videoDefaultTemplate;
    const videoTemplate = n$2(videoTemplateSelector, this.mediaContainer);
    const currentVideoTemplate = videoTemplate.content.cloneNode(true);
    const currentVideoEl = n$2(selectors$g.video, currentVideoTemplate);

    // Manual reset of mute attr required for most browsers to autoplay
    if (currentVideoEl) {
      currentVideoEl.muted = true;
    }
    currentVideoContainer.innerHTML = "";
    currentVideoContainer.appendChild(currentVideoTemplate);
    this._playVideo(currentVideoEl);
  },
  _playVideo(video) {
    this.videoHandler = backgroundVideoHandler(this.container);

    // play function is required for mobile & Safari or video will stay paused
    if (video) {
      video.play();
      checkAutoPlay(video, this.mediaContainer);
    }

    // if video is still not ready, show the fallback image
    if (video && video.paused) {
      this.mediaContainer.dataset.videoLoading = "true";
    }
  },
  onUnload() {
    var _this$animateVideoHer;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    this.videoHandler && this.videoHandler();
    (_this$animateVideoHer = this.animateVideoHero) === null || _this$animateVideoHer === void 0 || _this$animateVideoHer.destroy();
  }
});

const selectors$f = {
  dots: ".navigation-dot"
};
const navigationDots = function (container) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  const navigationDots = t$2(selectors$f.dots, container);
  const events = [];
  navigationDots.forEach(dot => {
    events.push(e$2(dot, "click", e => _handleDotClick(e)));
  });
  const _handleDotClick = e => {
    e.preventDefault();
    if (e.target.classList.contains("is-selected")) return;
    if (options.onSelect) {
      const index = parseInt(e.target.dataset.index, 10);
      options.onSelect(index);
    }
  };
  const update = dotIndex => {
    if (typeof dotIndex !== "number") {
      console.debug("navigationDots#update: invalid index, ensure int is passed");
      return;
    }
    const activeClass = "is-selected";
    navigationDots.forEach(dot => i$1(dot, activeClass));
    u$1(navigationDots[dotIndex], activeClass);
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
  };
  return {
    update,
    unload
  };
};

const selectors$e = {
  slider: "[data-slider]",
  slide: "[data-slide]",
  logoNavButton: "[logo-nav-button]"
};
register("quote", {
  onLoad() {
    const sliderContainer = n$2(selectors$e.slider, this.container);
    const slides = t$2(selectors$e.slide, this.container);
    if (shouldAnimate(this.container)) {
      slides.forEach(slide => animateQuotes(slide));
      this.observer = intersectionWatcher(this.container);
    }
    if (slides.length < 2) {
      if (slides.length) u$1(slides[0], "swiper-slide-visible");
      return null;
    }
    const paginationStyle = sliderContainer.dataset.paginationStyle;
    const autoplayEnabled = sliderContainer.dataset.autoplayEnabled == "true";
    const autoplayDelay = parseInt(sliderContainer.dataset.autoplayDelay, 10);
    this.events = [];
    import(flu.chunks.swiper).then(_ref => {
      let {
        Swiper,
        Autoplay,
        Navigation,
        EffectFade
      } = _ref;
      this.swiper = new Swiper(sliderContainer, {
        modules: [Navigation, Autoplay, EffectFade],
        grabCursor: true,
        effect: "fade",
        fadeEffect: {
          crossFade: true
        },
        loop: true,
        autoplay: autoplayEnabled ? {
          delay: autoplayDelay,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        } : false,
        navigation: {
          nextEl: ".slider-nav-button-next",
          prevEl: ".slider-nav-button-prev"
        }
      });
      if (paginationStyle === "dots") {
        this.dotNavigation = navigationDots(this.container, {
          onSelect: dotIndex => {
            this.swiper.slideToLoop(dotIndex);
          }
        });
      } else if (paginationStyle === "logos") {
        this.logoNavButtons = t$2(selectors$e.logoNavButton, this.container);
        u$1(this.logoNavButtons[0], "active");
        this.logoNavButtons.forEach(button => {
          this.events.push(e$2(button, "click", e => {
            const index = parseInt(e.currentTarget.dataset.index, 10);
            this.swiper.slideToLoop(index);
          }));
        });
      }
      this.swiper.on("slideChange", () => {
        const index = this.swiper.realIndex;
        if (paginationStyle === "dots") {
          this.dotNavigation.update(index);
        } else if (paginationStyle === "logos") {
          const activeClass = "active";
          this.logoNavButtons.forEach(button => i$1(button, activeClass));
          u$1(this.logoNavButtons[index], activeClass);
        }
      });
    });
  },
  onBlockSelect(_ref2) {
    var _this$swiper, _this$swiper2;
    let {
      target: slide
    } = _ref2;
    const index = parseInt(slide.dataset.index, 10);
    (_this$swiper = this.swiper) === null || _this$swiper === void 0 || (_this$swiper = _this$swiper.autoplay) === null || _this$swiper === void 0 || _this$swiper.stop();
    (_this$swiper2 = this.swiper) === null || _this$swiper2 === void 0 || _this$swiper2.slideToLoop(index);
  },
  onBlockDeselect() {
    var _this$swiper3;
    (_this$swiper3 = this.swiper) === null || _this$swiper3 === void 0 || (_this$swiper3 = _this$swiper3.autoplay) === null || _this$swiper3 === void 0 || _this$swiper3.start();
  },
  onUnload() {
    var _this$swiper4, _this$dotNavigation, _this$observer;
    (_this$swiper4 = this.swiper) === null || _this$swiper4 === void 0 || _this$swiper4.destroy();
    (_this$dotNavigation = this.dotNavigation) === null || _this$dotNavigation === void 0 || _this$dotNavigation.unload();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$observer = this.observer) === null || _this$observer === void 0 || _this$observer.destroy();
  }
});

const selectors$d = {
  hotspotWrappers: ".shoppable-item",
  hotspots: ".shoppable-item__hotspot",
  productCard: ".shoppable-item__product-card",
  mobileDrawer: ".shoppable-feature-mobile-drawer",
  desktopSliderContainer: ".shoppable-feature__secondary-content",
  slider: ".swiper",
  slide: ".swiper-slide",
  sliderPagination: ".swiper-pagination",
  sliderImages: ".product-card-mini__image img",
  imageContainer: ".shoppable__image-container",
  sliderNavPrev: ".slider-nav-button-prev",
  sliderNavNext: ".slider-nav-button-next",
  drawerBackground: ".mobile-drawer__overlay",
  drawerCloseButton: ".mobile-drawer__close",
  quickAddButton: '[data-quick-shop-trigger="quick-add"]',
  quickViewButton: '[data-quick-shop-trigger="quick-view"]',
  quickCart: ".quick-cart",
  purchaseConfirmation: ".purchase-confirmation-popup"
};
const classes$6 = {
  animating: "shoppable-item--animating",
  unset: "shoppable-item--position-unset",
  hidden: "hidden",
  active: "active",
  drawerActive: "active",
  pulse: "shoppable-item__hotspot--pulse"
};
const sliderTypes = {
  Desktop: "desktop",
  Mobile: "mobile"
};
register("shoppable", {
  onLoad() {
    this.imageContainer = n$2(selectors$d.imageContainer, this.container);
    this.showHotspotCards = this.container.dataset.showHotspotCards === "true";
    this.productCards = t$2(selectors$d.productCard, this.container);
    this.hotspotContainers = t$2(selectors$d.hotspotWrappers, this.container);
    this.hotspots = t$2(selectors$d.hotspots, this.container);
    this.mobileDrawer = n$2(selectors$d.mobileDrawer, this.container);
    this.quickAddButtons = t$2(selectors$d.quickAddButton, this.container);
    this.quickViewButtons = t$2(selectors$d.quickViewButton, this.container);
    this.purchaseConfirmation = n$2(selectors$d.purchaseConfirmation, document);
    this.quickCart = n$2(selectors$d.quickCart, document);

    // Self terminating mouseenter events
    this.hotspotEvents = this.hotspots.map(hotspot => {
      return {
        element: hotspot,
        event: e$2(hotspot, "mouseenter", e => {
          i$1(e.currentTarget.parentNode, classes$6.animating);
          this.hotspotEvents.find(o => o.element === hotspot).event();
        })
      };
    });
    this.events = [e$2(this.hotspots, "click", e => this._hotspotClickHandler(e)), e$2(this.container, "keydown", _ref => {
      let {
        keyCode
      } = _ref;
      if (keyCode === 27) this._closeAll();
    }), e$2(this.quickAddButtons, "click", e => {
      const buttonEl = e.currentTarget;
      u$1(buttonEl, "loading");

      // if quick cart and confirmation popup are disabled, use standard form submit
      if (!purchaseConfirmation && !quickCart) return;
      e.preventDefault();
      e.stopPropagation();
      const {
        productId
      } = buttonEl.dataset;
      if (!productId) return;
      cart.addItemById(productId, 1).then(_ref2 => {
        let {
          res
        } = _ref2;
        i$1(buttonEl, "loading");
        if (this.purchaseConfirmation) {
          r$1("confirmation-popup:open", null, {
            product: res.items[0]
          });
        } else {
          r$1("quick-cart:updated");
          // Need a delay to allow quick-cart to refresh
          setTimeout(() => {
            r$1("quick-cart:open");
          }, 300);
        }
        if (window.matchMedia(getMediaQuery("below-960")).matches) {
          this._closeAll();
        }
      });
    }), e$2(this.quickViewButtons, "click", e => {
      e.preventDefault();
      e.stopPropagation();
      const buttonEl = e.currentTarget;
      const {
        productUrl
      } = buttonEl.dataset;
      if (!productUrl) return;
      r$1("quick-view:open", null, {
        productUrl: productUrl
      });
      if (window.matchMedia(getMediaQuery("below-960")).matches) {
        this._closeAll();
      }
    })];
    this._setupDrawer();
    this._createOrRecreateSlider();
    this.breakPointHandler = atBreakpointChange(960, () => {
      this._closeAll();
    });
    this.widthWatcher = srraf(_ref3 => {
      let {
        vw,
        pvw
      } = _ref3;
      const wasAboveBreakpoint = pvw >= 960,
        isAboveBreakpoint = vw >= 960;
      if (wasAboveBreakpoint !== isAboveBreakpoint) {
        this._createOrRecreateSlider();
      }
    });
    if (this.showHotspotCards) {
      this.events.push(e$2(document, "click", e => this._clickOutsideHandler(e)));

      // Predefine product card dimensions
      this.productCards.forEach(card => this._setCardDimensions(card));
      if (shouldAnimate(this.container)) {
        this.animateShoppableImage = animateShoppableImage(this.container);
      }


    } else {
      if (shouldAnimate(this.container)) {
        this.animateShoppableFeature = animateShoppableFeature(this.container);
      }
    }
    this._initPulseLoop();
  },
  _initPulseLoop() {
    const hotspots = t$2(selectors$d.hotspots, this.container);
    let pulseIndex = 0;
    this.pulseInterval = setInterval(() => {
      i$1(hotspots, classes$6.pulse);
      setTimeout(() => {
        u$1(hotspots[pulseIndex], classes$6.pulse);
        pulseIndex++;
        if (pulseIndex >= hotspots.length) {
          pulseIndex = 0;
        }
      }, 0);
    }, 3000);
  },
  _createOrRecreateSlider() {
    // This creates or recreates either a mobile or desktop slider as necessary
    const sliderType = window.matchMedia(getMediaQuery("above-960")).matches ? sliderTypes.Desktop : sliderTypes.Mobile;
    if (this.sliderType !== sliderType) {
      var _this$swiper;
      this.sliderType = sliderType;
      (_this$swiper = this.swiper) === null || _this$swiper === void 0 || _this$swiper.destroy();
      this.sliderInitalized = false;
      const sliderContainerSelector = sliderType === sliderTypes.Desktop ? selectors$d.desktopSliderContainer : selectors$d.mobileDrawer;
      this.sliderContainer = n$2(sliderContainerSelector, this.container);
      if (this.sliderContainer === null) return;
      this.slider = n$2(selectors$d.slider, this.sliderContainer);
      this.slides = t$2(selectors$d.slide, this.sliderContainer);
      this.sliderPagination = n$2(selectors$d.sliderPagination, this.sliderContainer);
      this.sliderNavNext = n$2(selectors$d.sliderNavNext, this.sliderContainer);
      this.sliderNavPrev = n$2(selectors$d.sliderNavPrev, this.sliderContainer);
      this.sliderImages = t$2(selectors$d.sliderImages, this.sliderContainer);
      if (this.slides.length < 2) {
        return;
      }
      const _this = this;
      import(flu.chunks.swiper).then(_ref4 => {
        let {
          Swiper,
          Navigation,
          Pagination
        } = _ref4;
        this.swiper = new Swiper(this.slider, {
          modules: [Navigation, Pagination],
          grabCursor: window.matchMedia(getMediaQuery("below-960")).matches,
          slidesPerView: 1,
          watchSlidesProgress: true,
          loop: true,
          navigation: {
            nextEl: this.sliderNavNext,
            prevEl: this.sliderNavPrev
          },
          pagination: {
            el: this.sliderPagination,
            type: "fraction"
          },
          on: {
            sliderFirstMove: function () {
              _this.sliderHasBeenInteractedWith = true;
            },
            activeIndexChange: function (swiper) {
              const index = swiper.realIndex;
              _this.sliderInitalized && _this._indicateActiveHotspot(index);
            },
            afterInit: function () {
              var _this$sliderImages;
              _this.sliderInitalized = true;
              (_this$sliderImages = _this.sliderImages) === null || _this$sliderImages === void 0 || _this$sliderImages.forEach(image => image.setAttribute("loading", "eager"));
              if (_this.sliderType !== sliderTypes.Mobile) {
                _this._indicateActiveHotspot(0);
              }
            },
            slideChangeTransitionEnd() {
              const slideEls = this.slides;
              setTimeout(function () {
                slideEls.forEach(slide => {
                  slide.toggleAttribute("inert", !slide.classList.contains("swiper-slide-active"));
                });
              }, 50);
            }
          }
        });
      });
    }
  },
  _indicateActiveHotspot(index) {
    this.hotspotContainers.forEach(spot => i$1(spot, classes$6.active));
    const dotWrapper = n$2(".shoppable-item[data-index='".concat(index, "']"), this.container);
    u$1(dotWrapper, classes$6.active);
  },
  _activateHotspot(index) {
    const wrapper = n$2(".shoppable-item[data-index='".concat(index, "']"), this.container);
    const card = n$2(selectors$d.productCard, wrapper);
    if (card && !window.matchMedia(getMediaQuery("below-960")).matches) {
      if (a$1(card, "hidden")) {
        this._closeAll();
        this._showCard(card);
        this._indicateActiveHotspot(index);
      } else {
        this._hideCard(card);
      }
    } else {
      if (this.swiper) {
        const isMobileSwiper = this.sliderType === sliderTypes.Mobile;
        this.swiper.slideToLoop(index, isMobileSwiper ? 0 : undefined);
        if (isMobileSwiper) {
          this._openDrawer();
        }
      } else {
        if (window.matchMedia(getMediaQuery("below-960")).matches) {
          this._openDrawer();
        }
      }
    }
  },
  _showCard(card) {
    this._setCardDimensions(card);
    card.setAttribute("aria-hidden", false);
    i$1(card, classes$6.hidden);
  },
  _hideCard(card) {
    card.setAttribute("aria-hidden", true);
    u$1(card, classes$6.hidden);
    // remove(wrapper, classes.active);
  },
  _setCardDimensions(card) {
    const cardHeight = card.offsetHeight;
    const cardWidth = card.offsetWidth;
    card.style.setProperty("--card-height", cardHeight + "px");
    card.style.setProperty("--card-width", cardWidth + "px");
  },
  _setupDrawer() {
    // TODO: should this and open/close drawer functions be moved to their own file?

    const drawerBackground = n$2(selectors$d.drawerBackground, this.container);
    const drawerCloseButton = n$2(selectors$d.drawerCloseButton, this.container);
    this.events.push(e$2(drawerBackground, "click", () => this._closeAll()));
    this.events.push(e$2(drawerCloseButton, "click", () => this._closeAll()));
  },
  _openDrawer() {
    u$1(this.mobileDrawer, classes$6.drawerActive);
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    disableBodyScroll(this.mobileDrawer);
  },
  _closeDrawer() {
    if (this.mobileDrawer) {
      i$1(this.mobileDrawer, classes$6.drawerActive);
      document.body.setAttribute("data-fluorescent-overlay-open", "false");
      enableBodyScroll(this.mobileDrawer);
    }
  },
  _hotspotClickHandler(e) {
    const wrapper = e.currentTarget.parentNode.parentNode;
    const hotspotIndex = parseInt(wrapper.dataset.index, 10);
    this._activateHotspot(hotspotIndex);
  },
  _clickOutsideHandler(e) {
    if (!e.target.closest(selectors$d.productCard) && !a$1(e.target, "shoppable-item__hotspot") && !window.matchMedia(getMediaQuery("below-960")).matches) {
      this._closeAll();
    }
  },
  _closeAll() {
    this.productCards.forEach(card => {
      this._hideCard(card);
    });
    this.hotspotContainers.forEach(spot => i$1(spot, classes$6.active));
    this._closeDrawer();
  },
  onBlockDeselect() {
    this._closeAll();
  },
  onBlockSelect(_ref5) {
    let {
      target: el
    } = _ref5;
    const index = parseInt(el.dataset.index, 10);
    if (window.matchMedia(getMediaQuery("below-960")).matches) {
      setTimeout(() => {
        this._activateHotspot(index);
      }, 10);
    } else {
      if (this.swiper) {
        this.swiper.slideToLoop(index);
      } else {
        this._activateHotspot(index);
      }
    }
  },
  onUnload() {
    var _this$swiper2, _this$widthWatcher, _this$animateShoppabl, _this$animateShoppabl2;
    (_this$swiper2 = this.swiper) === null || _this$swiper2 === void 0 || _this$swiper2.destroy();
    (_this$widthWatcher = this.widthWatcher) === null || _this$widthWatcher === void 0 || _this$widthWatcher.destroy();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$animateShoppabl = this.animateShoppableImage) === null || _this$animateShoppabl === void 0 || _this$animateShoppabl.destroy();
    (_this$animateShoppabl2 = this.animateShoppableFeature) === null || _this$animateShoppabl2 === void 0 || _this$animateShoppabl2.destroy();
    this.pulseInterval && clearInterval(this.pulseInterval);
  }
});

const selectors$c = {
  video: "video",
  quickAddButton: '[data-quick-shop-trigger="quick-add"]',
  quickViewButton: '[data-quick-shop-trigger="quick-view"]',
  quickCart: ".quick-cart",
  purchaseConfirmation: ".purchase-confirmation-popup"
};
register("complete-the-look", {
  videoHandler: null,
  onLoad() {
    const video = n$2(selectors$c.video, this.container);
    const quickAddButtons = t$2(selectors$c.quickAddButton, this.container);
    const quickViewButtons = t$2(selectors$c.quickViewButton, this.container);
    const quickCart = n$2(selectors$c.quickCart, document);
    const purchaseConfirmation = n$2(selectors$c.purchaseConfirmation, document);
    if (video) {
      this.videoHandler = backgroundVideoHandler(this.container);
    }
    this.events = [e$2(quickAddButtons, "click", e => {
      const buttonEl = e.currentTarget;
      u$1(buttonEl, "loading");

      // if quick cart and confirmation popup are disabled, use standard form submit
      if (!purchaseConfirmation && !quickCart) return;
      e.preventDefault();
      e.stopPropagation();
      const {
        productId
      } = buttonEl.dataset;
      if (!productId) return;
      cart.addItemById(productId, 1).then(_ref => {
        let {
          res
        } = _ref;
        i$1(buttonEl, "loading");
        if (purchaseConfirmation) {
          r$1("confirmation-popup:open", null, {
            product: res.items[0]
          });
        } else {
          r$1("quick-cart:updated");
          // Need a delay to allow quick-cart to refresh
          setTimeout(() => {
            r$1("quick-cart:open");
          }, 300);
        }
      });
    }), e$2(quickViewButtons, "click", e => {
      e.preventDefault();
      e.stopPropagation();
      const buttonEl = e.currentTarget;
      const {
        productUrl
      } = buttonEl.dataset;
      if (!productUrl) return;
      r$1("quick-view:open", null, {
        productUrl: productUrl
      });
    })];
    if (shouldAnimate(this.container)) {
      this.animateCompleteTheLook = animateCompleteTheLook(this.container);
    }
  },
  onUnload() {
    var _this$animateComplete;
    this.videoHandler && this.videoHandler();
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$animateComplete = this.animateCompleteTheLook) === null || _this$animateComplete === void 0 || _this$animateComplete.destroy();
  }
});

const selectors$b = {
  playButtonVideo: "[data-play-button-block-video]",
  playButtonBlock: ".play-button-block"
};
register("rich-text", {
  onLoad() {
    const playButtonVideos = t$2(selectors$b.playButtonVideo, this.container);
    if (playButtonVideos.length) {
      this.playButtons = playButtonVideos.map(block => playButton(block.closest(selectors$b.playButtonBlock)));
    }
    if (shouldAnimate(this.container)) {
      this.animateRichText = animateRichText(this.container);
    }
  },
  onUnload() {
    var _this$animateRichText;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    (_this$animateRichText = this.animateRichText) === null || _this$animateRichText === void 0 || _this$animateRichText.destroy();
  }
});

const selectors$a = {
  imageContainer: ".image-compare__image-container",
  labelContainer: ".image-compare__label-container",
  slider: ".image-compare__slider"
};
register("image-compare", {
  onLoad() {
    this.events = [];
    this._initSliders();
    if (shouldAnimate(this.container)) {
      this.animateImageCompare = animateImageCompare(this.container);
    }
  },
  _initSliders() {
    this.imageContainer = n$2(selectors$a.imageContainer, this.container);
    this.labelContainers = t$2(selectors$a.labelContainer, this.container);
    this.slider = n$2(selectors$a.slider, this.container);

    // Check if slider exists (must be some blocks to exist)
    this.slider && this.events.push(e$2(this.slider, "input", e => this.imageContainer.style.setProperty("--position", "".concat(e.target.value, "%"))), e$2(this.slider, "mousedown", () => this.hideLabelContainers()), e$2(this.slider, "touchstart", () => this.hideLabelContainers()), e$2(this.slider, "mouseup", () => this.showLabelContainers()), e$2(this.slider, "touchend", () => this.showLabelContainers()));
  },
  hideLabelContainers() {
    this.labelContainers.forEach(e => {
      e.style.setProperty("opacity", "0");
    });
  },
  showLabelContainers() {
    this.labelContainers.forEach(e => {
      e.style.setProperty("opacity", "1");
    });
  },
  onUnload() {
    var _this$animateImageCom;
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$animateImageCom = this.animateImageCompare) === null || _this$animateImageCom === void 0 || _this$animateImageCom.destroy();
  }
});

const selectors$9 = {
  playButtonVideo: "[data-play-button-block-video]",
  playButtonBlock: ".play-button-block"
};
register("image-with-text", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateImageWithText = animateImageWithText(this.container);
    }
    const playButtonVideos = t$2(selectors$9.playButtonVideo, this.container);
    if (playButtonVideos.length) {
      this.playButtons = playButtonVideos.map(block => playButton(block.closest(selectors$9.playButtonBlock)));
    }
  },
  onUnload() {
    var _this$animateImageWit;
    (_this$animateImageWit = this.animateImageWithText) === null || _this$animateImageWit === void 0 || _this$animateImageWit.destroy();
    this.playButtons && this.playButtons.forEach(button => button.unload());
  }
});

const selectors$8 = {
  playButtonVideo: "[data-play-button-block-video]",
  playButtonBlock: ".play-button-block"
};
register("image-with-text-split", {
  onLoad() {
    const playButtonVideos = t$2(selectors$8.playButtonVideo, this.container);
    if (playButtonVideos.length) {
      this.playButtons = playButtonVideos.map(block => playButton(block.closest(selectors$8.playButtonBlock)));
    }
    if (shouldAnimate(this.container)) {
      this.animateImageWithTextSplit = animateImageWithTextSplit(this.container);
    }
  },
  onUnload() {
    var _this$animateImageWit;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    (_this$animateImageWit = this.animateImageWithTextSplit) === null || _this$animateImageWit === void 0 || _this$animateImageWit.destroy();
  }
});

const selectors$7 = {
  playButtonVideo: "[data-play-button-block-video]",
  playButtonBlock: ".play-button-block"
};
register("image-hero", {
  onLoad() {
    const playButtonVideos = t$2(selectors$7.playButtonVideo, this.container);
    if (playButtonVideos.length) {
      this.playButtons = playButtonVideos.map(block => playButton(block.closest(selectors$7.playButtonBlock)));
    }
    if (shouldAnimate(this.container)) {
      this.animateImageHero = animateImageHero(this.container);
    }
  },
  onUnload() {
    var _this$animateImageHer;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    (_this$animateImageHer = this.animateImageHero) === null || _this$animateImageHer === void 0 || _this$animateImageHer.destroy();
  }
});

register("image-hero-split", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      // Setup animations per item
      t$2(".animation--item", this.container).forEach(item => animateImageHeroSplit(item));
    }
    this.observer = intersectionWatcher(this.container);
  },
  onUnload() {
    var _this$observer;
    this.playButtons && this.playButtons.forEach(button => button.unload());
    (_this$observer = this.observer) === null || _this$observer === void 0 || _this$observer.destroy();
  }
});

const selectors$6 = {
  item: ".testimonials__item",
  swiper: ".swiper",
  navigationNext: ".testimonials__navigation-button--next",
  navigationPrev: ".testimonials__navigation-button--prev",
  productImage: ".testimonials__item-product-image"
};
register("testimonials", {
  onLoad() {
    this.events = [];
    this.items = t$2(selectors$6.item, this.container);
    this.itemsContainer = n$2(selectors$6.swiper, this.container);
    if (shouldAnimate(this.container)) {
      this.itemAnimations = this.items.map(item => animateTestimonials(item));
      this.observer = intersectionWatcher(this.container);
    }
    if (this.items.length > 1) {
      import(flu.chunks.swiper).then(_ref => {
        let {
          Swiper,
          Navigation,
          EffectFade
        } = _ref;
        this.swiper = Swiper;
        this.swiperOptions = {
          modules: [Navigation, EffectFade],
          autoHeight: true,
          slidesPerView: 1,
          effect: "fade",
          loop: true,
          fadeEffect: {
            crossFade: true
          },
          grabCursor: true,
          navigation: {
            nextEl: selectors$6.navigationNext,
            prevEl: selectors$6.navigationPrev
          },
          breakpoints: {
            720: {
              spaceBetween: 42
            }
          },
          on: {
            slideChangeTransitionEnd() {
              const slideEls = this.slides;
              setTimeout(function () {
                slideEls.forEach(slide => {
                  slide.toggleAttribute("inert", !slide.classList.contains("swiper-slide-active"));
                });
              }, 50);
            }
          }
        };

        // We use fade for desktop size animatiosn and slide for under
        // 720px
        if (window.matchMedia(getMediaQuery("below-720")).matches) {
          this.swiperOptions.effect = "slide";
          this.swiperOptions.slidesPerView = "auto";
        }
        this.carousel = new Swiper(this.itemsContainer, this.swiperOptions);
        this.setMobileButtonOffset();
        r$1("testimonials:initialized");
      });
    } else if (this.items.length === 1) {
      u$1(this.items[0], "swiper-slide-visible");
    }
    atBreakpointChange(720, () => {
      if (this.items.length > 1) {
        this.carousel.destroy();
        if (window.matchMedia(getMediaQuery("below-720")).matches) {
          this.swiperOptions.effect = "slide";
          this.swiperOptions.slidesPerView = "auto";
        } else {
          this.swiperOptions.effect = "fade";
          this.swiperOptions.slidesPerView = 1;
        }
        this.carousel = new this.swiper(this.itemsContainer, this.swiperOptions);
      }
    });
  },
  setMobileButtonOffset() {
    // Mobile paddles should vertically center on the image instead of the item
    const firstImage = n$2(selectors$6.productImage, this.container);
    const mobileButtonHeight = 34;
    const halfMobileButtonHeight = mobileButtonHeight / 2;
    const halfImageHeight = firstImage.offsetHeight / 2;
    const offset = halfImageHeight + halfMobileButtonHeight;
    this.container.style.setProperty("--mobile-button-offset", "".concat(offset, "px"));
  },
  handleBlockSelect(slideIndex) {
    this.carousel.slideToLoop(parseInt(slideIndex, 10));
  },
  onBlockSelect(_ref2) {
    let {
      target
    } = _ref2;
    const {
      index
    } = target.dataset;
    if (this.carousel) {
      this.handleBlockSelect(index);
    } else {
      // Listen for initalization if carousel does not exist
      this.events.push(c("testimonials:initialized", () => {
        this.handleBlockSelect(index);
      }));
    }
  },
  onUnload() {
    var _this$observer;
    this.events.forEach(unsubscribe => unsubscribe());
    (_this$observer = this.observer) === null || _this$observer === void 0 || _this$observer.destroy();
  }
});

register("sales-banner", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateSalesBanner = animateSalesBanner(this.container);
    }
  },
  onUnload() {
    var _this$animateSalesBan;
    (_this$animateSalesBan = this.animateSalesBanner) === null || _this$animateSalesBan === void 0 || _this$animateSalesBan.destroy();
  }
});

register("promotion-bar", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animatePromotionBar = animatePromotionBar(this.container);
    }
  },
  onUnload() {
    var _this$animatePromotio;
    (_this$animatePromotio = this.animatePromotionBar) === null || _this$animatePromotio === void 0 || _this$animatePromotio.destroy();
  }
});

function _assertClassBrand(e, t, n) {
  if ("function" == typeof e ? e === t : e.has(t)) return arguments.length < 3 ? t : n;
  throw new TypeError("Private element is not present on this object");
}
function _checkPrivateRedeclaration(obj, privateCollection) {
  if (privateCollection.has(obj)) {
    throw new TypeError("Cannot initialize the same private elements twice on an object");
  }
}
function _classPrivateMethodInitSpec(obj, privateSet) {
  _checkPrivateRedeclaration(obj, privateSet);
  privateSet.add(obj);
}

/**
 * Extracts background videos from 'template's to be added to the DOM, and controls pause/play state through
 * a11y triggers and an intersection observer.
 * If two videos are enabled for desktop and mobile, update video templates by screen size.
 */
var _BackgroundVideo_brand = /*#__PURE__*/new WeakSet();
class BackgroundVideo extends HTMLElement {
  constructor() {
    super(...arguments);
    _classPrivateMethodInitSpec(this, _BackgroundVideo_brand);
  }
  connectedCallback() {
    const videoTemplate = this.querySelector("[js-background-video-template]");
    const hasVideo = this.dataset.hasVideo === "true";
    const hasMobileVideo = this.dataset.hasMobileVideo === "true";
    if (hasVideo && !hasMobileVideo) {
      _assertClassBrand(_BackgroundVideo_brand, this, _setVideoTemplate).call(this, videoTemplate, this);
    } else if (hasVideo & hasMobileVideo) {
      const videoMobileTemplate = this.querySelector("[js-mobile-background-video-template]");
      _assertClassBrand(_BackgroundVideo_brand, this, _initResponsiveVideoTemplate).call(this, this, videoTemplate, videoMobileTemplate);
    }
  }
  disconnectedCallback() {
    this.removeEventListener("toggle", this.handleToggle, true);
  }
}
function _initResponsiveVideoTemplate(container, videoTemplate, videoMobileTemplate) {
  const setTemplateByWidth = () => {
    if (window.matchMedia(getMediaQuery("above-720")).matches) {
      _assertClassBrand(_BackgroundVideo_brand, this, _setVideoTemplate).call(this, videoTemplate, container);
    } else {
      _assertClassBrand(_BackgroundVideo_brand, this, _setVideoTemplate).call(this, videoMobileTemplate, container);
    }
  };
  setTemplateByWidth();
  atBreakpointChange(720, setTemplateByWidth);
}
function _setVideoTemplate(videoTemplate, container) {
  const pauseBtn = container.querySelector("[js-video-pause-button]");
  const currentVideoContainer = container.querySelector("[js-current-background-video-container]");
  const currentVideoTemplate = videoTemplate.content.cloneNode(true);
  const currentVideoEl = currentVideoTemplate.querySelector("[data-background-video]");
  if (currentVideoEl) {
    currentVideoEl.muted = true;
  }
  currentVideoContainer.innerHTML = "";
  currentVideoContainer.appendChild(currentVideoTemplate);

  // Callback for intersectionWatcher helps leverage context from this file without needing to pass it
  const videoWatcherCallback = visible => _assertClassBrand(_BackgroundVideo_brand, this, _visibleVideoWatcher).call(this, currentVideoEl, pauseBtn, visible);
  _assertClassBrand(_BackgroundVideo_brand, this, _setPlayPause).call(this, currentVideoEl, pauseBtn, "pause");
  _assertClassBrand(_BackgroundVideo_brand, this, _videoA11yHandler).call(this, currentVideoEl, pauseBtn);
  videoIntersectionWatcher(currentVideoEl, {
    callback: videoWatcherCallback
  });
}
function _videoA11yHandler(video, pauseBtn) {
  if (!pauseBtn || !video) return;

  // Play/pause button will show when tabbing
  const togglePlayPause = e => {
    e.preventDefault();

    // Pausing via a11y tabbing is respected as priority state by the intersection observer
    if (video.paused) {
      _assertClassBrand(_BackgroundVideo_brand, this, _setPlayPause).call(this, video, pauseBtn, "play");
      video.dataset.a11yPriorityPause = false;
    } else {
      _assertClassBrand(_BackgroundVideo_brand, this, _setPlayPause).call(this, video, pauseBtn, "pause");
      video.dataset.a11yPriorityPause = true;
    }
  };

  // Mouse
  pauseBtn.addEventListener("click", e => togglePlayPause(e));

  // Keyboard
  pauseBtn.addEventListener("keydown", e => {
    if (e.key === "Enter") togglePlayPause(e);
  });
  pauseBtn.addEventListener("keyup", e => {
    if (e.key === " ") togglePlayPause(e);
  });
}
function _visibleVideoWatcher(video, pauseBtn, visible) {
  // Prioritize browser and device settings
  if (prefersReducedMotion()) {
    return;
  }
  if (visible && video.paused) {
    // Fade in video from poster for smooth transition, only on first entry
    if (video.dataset.videoLoaded === "false") {
      video.classList.add("background-video-fade-in");
      video.dataset.videoLoaded = "true";
    }

    // Play via intersection entry should only apply when paused state not from a11y tabbing
    if (video.dataset.a11yPriorityPause === "false") {
      _assertClassBrand(_BackgroundVideo_brand, this, _setPlayPause).call(this, video, pauseBtn, "play");
    }
  }
  if (!visible && !video.paused) {
    _assertClassBrand(_BackgroundVideo_brand, this, _setPlayPause).call(this, video, pauseBtn, "pause");
  }
}
function _setPlayPause(video, pauseBtn, state) {
  const {
    strings: {
      accessibility: strings
    },
    icons
  } = window.theme;
  if (state === "pause") {
    video.pause();
    if (pauseBtn.dataset.pauseButtonContent === "icon") {
      pauseBtn.innerHTML = icons.play;
    } else {
      pauseBtn.innerText = strings.play_video;
    }
  } else {
    video.play();
    if (pauseBtn.dataset.pauseButtonContent === "icon") {
      pauseBtn.innerHTML = icons.pause;
    } else {
      pauseBtn.innerText = strings.pause_video;
    }
  }
}
if (!customElements.get("background-video")) {
  customElements.define("background-video", BackgroundVideo);
}

register("grid", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateGrid = animateGrid(this.container);
    }
  },
  onUnload() {
    var _this$animateGrid;
    (_this$animateGrid = this.animateGrid) === null || _this$animateGrid === void 0 || _this$animateGrid.destroy();
  }
});

register("collection-list-grid", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateCollectionListGrid = animateCollectionListGrid(this.container);
    }
  },
  onUnload() {
    var _this$animateCollecti;
    (_this$animateCollecti = this.animateCollectionListGrid) === null || _this$animateCollecti === void 0 || _this$animateCollecti.destroy();
  }
});

register("contact-form", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateContactForm = animateContactForm(this.container);
    }
  },
  onUnload() {
    var _this$animateContactF;
    (_this$animateContactF = this.animateContactForm) === null || _this$animateContactF === void 0 || _this$animateContactF.destroy();
  }
});

const selectors$5 = {
  sliderContainer: ".carousel"
};
register("multi-column", {
  onLoad() {
    const {
      sliderOnMobile: sliderOnMobileString
    } = this.container.dataset;
    const sliderOnMobile = sliderOnMobileString === "true";
    if (sliderOnMobile && window.matchMedia(getMediaQuery("below-720")).matches) {
      this._initCarousel();
    }
    this.breakPointHandler = atBreakpointChange(720, () => {
      if (sliderOnMobile && window.matchMedia(getMediaQuery("below-720")).matches) {
        this._initCarousel();
      } else {
        var _this$carousel;
        (_this$carousel = this.carousel) === null || _this$carousel === void 0 || _this$carousel.destroy();
      }
    });
    if (shouldAnimate(this.container)) {
      this.animateMultiColumn = animateMultiColumn(this.container);
    }
  },
  _initCarousel() {
    const {
      mobileColumnsPerView
    } = this.container.dataset;
    this.mobilePerView = parseInt(mobileColumnsPerView, 10) * 1.05; // Peek value
    this.carouselElement = n$2(selectors$5.sliderContainer, this.container);
    this.carousel = Carousel(this.carouselElement, {
      slidesPerView: this.mobilePerView,
      spaceBetween: 12
    });
  },
  onUnload() {
    var _this$carousel2, _this$animateMultiCol;
    this.breakPointHandler.unload();
    (_this$carousel2 = this.carousel) === null || _this$carousel2 === void 0 || _this$carousel2.destroy();
    (_this$animateMultiCol = this.animateMultiColumn) === null || _this$animateMultiCol === void 0 || _this$animateMultiCol.destroy();
  }
});

register("newsletter", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateNewsletter = animateNewsletter(this.container);
    }
  },
  onUnload() {
    var _this$animateNewslett;
    (_this$animateNewslett = this.animateNewsletter) === null || _this$animateNewslett === void 0 || _this$animateNewslett.destroy();
  }
});

register("newsletter-compact", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateNewsletterCompact = animateNewsletterCompact(this.container);
    }
  },
  onUnload() {
    var _this$animateNewslett;
    (_this$animateNewslett = this.animateNewsletterCompact) === null || _this$animateNewslett === void 0 || _this$animateNewslett.destroy();
  }
});

const selectors$4 = {
  listContainer: "[data-events-eventbrite-container]",
  skeletonList: ".events__list--skeleton"
};
const endpoints = {
  org: token => "https://www.eventbriteapi.com//v3/users/me/organizations/?token=".concat(token),
  events: (id, token) => "https://www.eventbriteapi.com//v3/organizations/".concat(id, "/events/?token=").concat(token, "&expand=venue&status=live")
};
register("events", {
  onLoad() {
    this.accessToken = this.container.dataset.accessToken;
    this.eventCount = parseInt(this.container.dataset.eventCount, 10);
    this.imageAspectRatio = this.container.dataset.imageAspectRatio;
    this.learnMoreText = this.container.dataset.learnMoreText;
    this._fetchOrg();
    if (shouldAnimate(this.container)) {
      this.animateEvents = animateEvents(this.container);
      if (!this.accessToken) this.animateEvents.animateEventItems();
    }
  },
  /**
   * _fetchOrg gets the eventbrite organization data for this user
   */
  _fetchOrg() {
    if (!this.accessToken) return;
    fetch(endpoints.org(this.accessToken)).then(res => res.json()).then(res => {
      this._fetchEvents(res.organizations[0].id);
    });
  },
  /**
   * _fetchEvents gets the eventbrite events for this user
   * @param {number} id organization id
   */
  _fetchEvents(id) {
    if (!id) return;
    fetch(endpoints.events(id, this.accessToken)).then(res => res.json()).then(events => {
      this._renderEvents(events.events);
    });
  },
  /**
   * _renderEvents adds the event elements on the page
   * @param {array} events array of event objects
   */
  _renderEvents(events) {
    const listContainer = n$2(selectors$4.listContainer, this.container);
    const skeletonList = n$2(selectors$4.skeletonList, this.container);

    // Build a list of events
    let list = document.createElement("ul");
    list.className = "events__list";
    events.slice(0, this.eventCount).forEach(event => {
      list.innerHTML += this._renderEventItem(event);
    });

    // Append the list to the container on the page
    u$1(skeletonList, "hide");
    setTimeout(() => {
      listContainer.textContent = "";
      listContainer.appendChild(list);
      if (shouldAnimate(this.container)) {
        this.animateEvents.animateEventItems();
      }
    }, 300);
  },
  /**
   * _renderEventItem builds the html needed for an event item with the event data
   * @param {obj} event the event data
   * @returns eventItem
   */
  _renderEventItem(event) {
    var _event$logo;
    let eventItem = "\n      <li\n        class=\"\n          event-item\n          event-item--eventbrite\n          ".concat((_event$logo = event.logo) !== null && _event$logo !== void 0 && _event$logo.url ? "event-item--has-image" : "", "\n        \"\n      >\n        <a href=\"").concat(event.url, "\" class=\"event-item__link\">\n          <div class=\"event-item__image-wrapper\">\n            ").concat(this._renderImage(event), "\n            ").concat(this._renderDateBadge(event), "\n          </div>\n          <div class=\"event-item__details\">\n            ").concat(this._renderName(event), "\n            ").concat(this._renderDate(event), "\n            ").concat(this._renderVenue(event), "\n            ").concat(this._renderSummary(event), "\n            <span class=\"btn btn--callout event-item__callout\">\n              <span>").concat(this.learnMoreText, "</span>\n            </span>\n          </div>\n        </a>\n      </li>\n    ");
    return eventItem;
  },
  _renderImage(event) {
    var _event$logo2;
    let image = "";
    if ((_event$logo2 = event.logo) !== null && _event$logo2 !== void 0 && _event$logo2.url) {
      image = "\n        <div class=\"image ".concat(this.imageAspectRatio, " event-item__image image--animate animation--lazy-load\">\n          <img\n            src=\"").concat(event.logo.url, "\"\n            alt=\"").concat(event.name.text, "\"\n            loading=\"lazy\"\n            class=\"image__img\"\n            onload=\"javascript: this.closest('.image').classList.add('loaded')\"\n          >\n        </div>\n      ");
    }
    return image;
  },
  _renderDateBadge(event) {
    var _event$start;
    let html = "";
    if ((_event$start = event.start) !== null && _event$start !== void 0 && _event$start.local) {
      const date = new Date(event.start.local);
      html = "\n        <span class=\"event-item__date-badge\">\n          <span class=\"event-item__date-badge-day fs-body-bold fs-body-200\">\n            ".concat(new Intl.DateTimeFormat([], {
        day: "numeric"
      }).format(date), "\n          </span>\n          <span class=\"event-item__date-badge-month fs-accent\">\n            ").concat(new Intl.DateTimeFormat([], {
        month: "short"
      }).format(date), "\n          </span>\n        </span>\n      ");
    }
    return html;
  },
  _renderName(event) {
    var _event$name;
    let html = "";
    if ((_event$name = event.name) !== null && _event$name !== void 0 && _event$name.text) {
      html = "\n        <h4 class=\"event-item__name ff-heading fs-heading-5-base\">\n          ".concat(event.name.text, "\n        </h4>\n      ");
    }
    return html;
  },
  _renderDate(event) {
    var _event$start2;
    let html = "";
    if ((_event$start2 = event.start) !== null && _event$start2 !== void 0 && _event$start2.local) {
      const date = new Date(event.start.local);
      html = "\n        <p class=\"event-item__date fs-body-75\">\n          ".concat(date.toLocaleDateString([], {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      }), "\n          ").concat(date.toLocaleTimeString([], {
        timeZone: event.start.timezone,
        hour: "numeric",
        minute: "2-digit"
      }), "\n        </p>\n      ");
    }
    return html;
  },
  _renderVenue(event) {
    var _event$venue;
    let html = "";
    if ((_event$venue = event.venue) !== null && _event$venue !== void 0 && _event$venue.name) {
      html = "\n        <p class=\"event-item__venue fs-body-75\">\n          ".concat(event.venue.name, "\n        </p>\n      ");
    }
    return html;
  },
  _renderSummary(event) {
    let html = "";
    if (event.summary) {
      html = "\n        <p class=\"event-item__summary\">\n          ".concat(event.summary, "\n        </p>\n      ");
    }
    return html;
  },
  onUnload() {
    var _this$animateEvents;
    (_this$animateEvents = this.animateEvents) === null || _this$animateEvents === void 0 || _this$animateEvents.destroy();
  }
});

register("promo-banner", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animatePromoBanner = animatePromoBanner(this.container);
    }
  },
  onUnload() {
    var _this$animatePromoBan;
    (_this$animatePromoBan = this.animatePromoBanner) === null || _this$animatePromoBan === void 0 || _this$animatePromoBan.destroy();
  }
});

register("scrolling-content", {
  onLoad() {
    const marquee = n$2(".scrolling-content__marquee", this.container);
    const content = n$2(".scrolling-content__content", this.container);
    const clonedContent = this.tabProofClonedContent(content.cloneNode(true));
    let contentWidth = content.offsetWidth;
    if (contentWidth === 0) return;
    this.ro = new ResizeObserver(() => {
      let num = this.getNeededCloneCount(this.container, marquee, content);
      for (let i = 0; i < num; i++) {
        marquee.dataset.playScrollAnimation = "false";
        marquee.appendChild(clonedContent.cloneNode(true));
      }
      if (!a$1(document.documentElement, "prefers-reduced-motion")) {
        requestAnimationFrame(() => {
          marquee.dataset.playScrollAnimation = "true";
        });
      }
    });
    this.ro.observe(document.documentElement);
    if (shouldAnimate(this.container)) {
      this.animateScrollingContent = animateScrollingContent(this.container);
    }
  },
  getNeededCloneCount(target, marquee, content) {
    return Math.ceil((target.offsetWidth - marquee.offsetWidth) / content.offsetWidth) + 1;
  },
  tabProofClonedContent(clonedContent) {
    const linkEls = t$2("a", clonedContent);
    linkEls.forEach(linkEl => {
      linkEl.setAttribute("tabindex", "-1");
    });
    clonedContent.setAttribute("aria-hidden", true);
    return clonedContent;
  },
  onUnload() {
    var _this$animateScrollin;
    this.ro.disconnect();
    (_this$animateScrollin = this.animateScrollingContent) === null || _this$animateScrollin === void 0 || _this$animateScrollin.destroy();
  }
});

const selectors$3 = {
  tabLabels: "[data-tab-label]",
  tabItems: "[data-tab-item]",
  tabList: "[data-tab-list]",
  activeTabItem: "[data-tab-item][aria-hidden='false']",
  mobileAccordion: ".product-tabs__mobile-accordions",
  mobileLabel: ".accordion__label",
  header: "[data-section-type='header']"
};
register("product-tabs", {
  onLoad() {
    this.accordions = [];
    this.tabItems = t$2(selectors$3.tabItems, this.container);
    this.tabLabels = t$2(selectors$3.tabLabels, this.container);
    this.tabList = n$2(selectors$3.tabList, this.container);
    this.activeTabItem = n$2(selectors$3.activeTabItem, this.container);
    if (this.activeTabItem) {
      this._setTabHeight(this.activeTabItem);
    }
    this.clickHandlers = e$2(this.tabLabels, "click", e => {
      e.preventDefault();
      const contentID = e.currentTarget.getAttribute("aria-controls");
      const content = n$2("#".concat(contentID), this.container);
      this._closeAll();
      this._open(e.currentTarget, content);
    });
    const accordionElements = t$2(".accordion", this.container);
    accordionElements.forEach(accordion => {
      const accordionOpen = accordion.classList.contains("accordion--open");
      this.accordions.push(Accordions(accordion, {
        firstOpen: accordionOpen
      }));
      accordion.classList.add("rte--product", "accordion--product");
    });
    if (shouldAnimate(this.container)) {
      this.animateProductTabs = animateProductTabs(this.container);
    }

    // Header info for auto-collapse rows
    this.header = n$2(selectors$3.header, document);
    this.isStickyHeader = this.header.dataset.enableStickyHeader === "true";
    this.headerHeight = 0;
    this.announcementHeight = 0;

    // Auto-collapse rows
    this.mobileAccordion = n$2(selectors$3.mobileAccordion, this.container);
    this.shouldAutoCollapse = this.mobileAccordion.dataset.autoCollapse === "true";
    if (this.shouldAutoCollapse) {
      this._mobileAutoCollapse();
    }
  },
  _closeAll() {
    this.tabLabels.forEach(label => {
      const contentID = label.getAttribute("aria-controls");
      const content = n$2("#".concat(contentID), this.container);
      if (this._isVisible(content)) {
        this._close(label, content);
      }
    });
  },
  _open(label, content) {
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
    this._setTabHeight(content);
  },
  _close(label, content) {
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },
  _isVisible(content) {
    return content.getAttribute("aria-hidden") === "false";
  },
  _setTabHeight(content) {
    const height = content.offsetHeight;
    this.tabList.style.height = "".concat(height, "px");
  },
  // mobile accordion
  _mobileAutoCollapse() {
    this.mobileAccordion = n$2(selectors$3.mobileAccordion, this.container);
    if (!this.mobileAccordion) return;
    this.mobileLabels = t$2(selectors$3.mobileLabel, this.mobileAccordion);
    if (!this.mobileLabels.length) return;
    this.mobileAutoCollapseClick = e$2(this.mobileLabels, "click", event => {
      const label = event.currentTarget;
      const group = label.parentNode;
      const content = label.nextElementSibling;
      if (!content || isVisible(content)) return;
      this._closeOpenMobileRows(group);
      setTimeout(() => {
        const inViewData = this._isInView(label);
        if (!inViewData.inView) {
          window.scrollTo({
            top: window.scrollY + inViewData.elementTop - (this.headerHeight + this.announcementHeight),
            behavior: "smooth"
          });
        }
      }, 400);
    });
  },
  _closeOpenMobileRows(currentGroup) {
    for (const label of this.mobileLabels) {
      const group = label.parentNode;
      if (group === currentGroup) continue;
      const content = label.nextElementSibling;
      if (content && isVisible(content)) {
        slideStop(content);
        slideUp(content);
        group.setAttribute("data-open", false);
        label.setAttribute("aria-expanded", false);
        content.setAttribute("aria-hidden", true);
      }
    }
  },
  _isInView(element) {
    if (this.isStickyHeader) {
      this.headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--height-header").replace(/px/gi, ""));
      this.announcementHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--announcement-height").replace(/px/gi, ""));
    }
    const rect = element.getBoundingClientRect();
    return {
      inView: rect.top >= this.headerHeight + this.announcementHeight && rect.bottom <= window.innerHeight,
      elementTop: rect.top
    };
  },
  onBlockSelect(_ref) {
    let {
      target
    } = _ref;
    const contentID = target.getAttribute("aria-controls");
    const content = n$2("#".concat(contentID), this.container);
    this._closeAll();
    this._open(target, content);
  },
  onUnload() {
    var _this$animateProductT, _this$mobileAutoColla;
    this.clickHandlers();
    this.accordions.forEach(accordion => accordion.unload());
    (_this$animateProductT = this.animateProductTabs) === null || _this$animateProductT === void 0 || _this$animateProductT.destroy();
    (_this$mobileAutoColla = this.mobileAutoCollapseClick) === null || _this$mobileAutoColla === void 0 || _this$mobileAutoColla.call(this);
  }
});

register("apps", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateApps = animateApps(this.container);
    }
  },
  onUnload() {
    var _this$animateApps;
    (_this$animateApps = this.animateApps) === null || _this$animateApps === void 0 || _this$animateApps.destroy();
  }
});

const selectors$2 = {
  cart: '[data-section-type="cart"]',
  cartError: ".cart__form-item-error",
  cartItems: "[js-cart-items]",
  cartNoteTrigger: "[data-order-note-trigger]",
  cartSubtotalWrapper: "[js-cart-footer-subtotal-wrapper]",
  cartUpdateButton: ".cart__update",
  quantityInput: ".cart .quantity-input__input",
  quantityItem: "[data-input-item]",
  freeShippingBar: "[data-free-shipping-bar]",
  crossSells: "[data-cross-sells]"
};
const classes$5 = {
  updatingQuantity: "has-quantity-update",
  removed: "is-removed"
};
register("cart", {
  onLoad() {
    const cartNoteTrigger = n$2(selectors$2.cartNoteTrigger, this.container);
    const freeShippingBar$1 = n$2(selectors$2.freeShippingBar, this.container);
    const crossSells = n$2(selectors$2.crossSells, this.container);
    if (freeShippingBar$1) {
      freeShippingBar(freeShippingBar$1);
    }
    if (crossSells) {
      this.crossSellsContainer = crossSells;
      this.crossSells = CrossSells(this.crossSellsContainer);
    }
    if (cartNoteTrigger) this.cartNoteToggle = CartNoteToggle(this.container);
    this.quantityButtons = QuantityButtons(this.container);

    // Events are all on events trigger by other components / functions
    this.events = [c("cart:updated", () => this.refreshCart()), c("cart:error", (_, _ref) => {
      let {
        key,
        errorMessage
      } = _ref;
      this.handleErrorMessage(key, errorMessage);
    }), c(["quantity-update:subtract", "quantity-update:add"], (_, _ref2) => {
      let {
        key
      } = _ref2;
      this.handleQuantityUpdate(key);
    }), c("quantity-update:remove", (_, _ref3) => {
      let {
        key
      } = _ref3;
      this.handleItemRemoval(key);
    })];

    // Delegate handles all click events due to rendering different content
    // within cart
    this.delegate = new Delegate(this.container);
    this.delegate.on("change", selectors$2.quantityInput, e => this.handleQuantityInputChange(e));
  },
  refreshCart() {
    const url = "".concat(theme.routes.cart.base, "?section_id=").concat(this.id);
    const targetCartItems = n$2(selectors$2.cartItems, this.container);
    const targetCartSubtotalWrapper = n$2(selectors$2.cartSubtotalWrapper, this.container);
    fetch(url).then(response => response.text()).then(text => {
      const sourceDom = new DOMParser().parseFromString(text, "text/html");
      const sourceCartItems = n$2(selectors$2.cartItems, sourceDom);
      const sourceCartSubtotalWrapper = n$2(selectors$2.cartSubtotalWrapper, sourceDom);
      const sourceFreeShippingBar = n$2(selectors$2.freeShippingBar, sourceDom);
      const sourceCrossSells = n$2(selectors$2.crossSells, sourceDom);
      if (sourceCartItems) {
        targetCartItems.innerHTML = sourceCartItems.innerHTML;
        targetCartSubtotalWrapper.outerHTML = sourceCartSubtotalWrapper.outerHTML;
      } else {
        const sourceContainer = n$2(selectors$2.cart, sourceDom);
        this.container.innerHTML = sourceContainer.innerHTML;
      }
      if (sourceFreeShippingBar) {
        const freeShippingBar$1 = n$2(selectors$2.freeShippingBar, this.container);
        freeShippingBar$1.dataset.cartTotal = sourceFreeShippingBar.dataset.cartTotal;
        freeShippingBar(freeShippingBar$1);
      }
      if (sourceCrossSells) {
        // If the cross-sells are below the line items, the content is already replaced when the cart
        // items get updated, so we don't need to replace the content, but we need to "refresh" the
        // variable we're using to reference the container because it's been replaced.
        if (sourceCrossSells.getAttribute("data-position") == "below-subtotal") {
          this.crossSellsContainer.innerHTML = sourceCrossSells.innerHTML;
        } else {
          this.crossSellsContainer = n$2(selectors$2.crossSells, this.container);
        }
        this.crossSells.unload();
        this.crossSells = CrossSells(this.crossSellsContainer);
      }
    });
  },
  handleErrorMessage(key) {
    const item = n$2("[data-key=\"".concat(key, "\"]"), this.container);
    i$1(n$2(selectors$2.cartError, item), "hidden");
    i$1(item, classes$5.updatingQuantity);
  },
  handleQuantityInputChange(_ref4) {
    let {
      target
    } = _ref4;
    const item = target.closest(selectors$2.quantityItem);
    const {
      key
    } = item.dataset;
    cart.updateItem(key, target.value);
    this.handleQuantityUpdate(key);
  },
  handleQuantityUpdate(key) {
    const item = n$2("[data-key=\"".concat(key, "\"]"), this.container);
    u$1(item, classes$5.updatingQuantity);
  },
  handleItemRemoval(key) {
    const item = n$2("[data-key=\"".concat(key, "\"]"), this.container);
    u$1(item, classes$5.removed);
    u$1(item, classes$5.updatingQuantity);
  },
  onUnload() {
    var _this$cartNoteToggle;
    this.events.forEach(unsubscribe => unsubscribe());
    this.quantityButtons.unload();
    (_this$cartNoteToggle = this.cartNoteToggle) === null || _this$cartNoteToggle === void 0 || _this$cartNoteToggle.unload();
  }
});

register("product", {
  onLoad() {
    this.product = new Product(this.container);
    this.animateProduct = animateProduct(this.container);
  },
  onBlockSelect(_ref) {
    let {
      target
    } = _ref;
    const label = n$2(".accordion__label", target);
    target.scrollIntoView({
      block: "center",
      behavior: "smooth"
    });
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideDown(content);
    group.setAttribute("data-open", true);
    label.setAttribute("aria-expanded", true);
    content.setAttribute("aria-hidden", false);
  },
  onBlockDeselect(_ref2) {
    let {
      target
    } = _ref2;
    const label = n$2(".accordion__label", target);
    if (!label) return;
    const {
      parentNode: group,
      nextElementSibling: content
    } = label;
    slideStop(content);
    slideUp(content);
    group.setAttribute("data-open", false);
    label.setAttribute("aria-expanded", false);
    content.setAttribute("aria-hidden", true);
  },
  onUnload() {
    var _this$animateProduct;
    this.product.unload();
    (_this$animateProduct = this.animateProduct) === null || _this$animateProduct === void 0 || _this$animateProduct.destroy();
  }
});

/* @preserve
 * https://github.com/Elkfox/Ajaxinate
 * Copyright (c) 2017 Elkfox Co Pty Ltd (elkfox.com)
 * MIT License (do not remove above copyright!)
 */

/* Configurable options;
 *
 * method: scroll or click
 * container: selector of repeating content
 * pagination: selector of pagination container
 * offset: number of pixels before the bottom to start loading more on scroll
 * loadingText: 'Loading', The text shown during when appending new content
 * callback: null, callback function after new content is appended
 *
 * Usage;
 *
 * import {Ajaxinate} from 'ajaxinate';
 *
 * new Ajaxinate({
 *   offset: 5000,
 *   loadingText: 'Loading more...',
 * });
 */

/* eslint-env browser */
function Ajaxinate(config) {
  const settings = config || {};

  const defaults = {
    method: "scroll",
    container: "#AjaxinateContainer",
    pagination: "#AjaxinatePagination",
    offset: 0,
    loadingText: "Loading",
    callback: null,
  };

  // Merge custom configs with defaults
  this.settings = Object.assign(defaults, settings);

  // Functions
  this.addScrollListeners = this.addScrollListeners.bind(this);
  this.addClickListener = this.addClickListener.bind(this);
  this.checkIfPaginationInView = this.checkIfPaginationInView.bind(this);
  this.preventMultipleClicks = this.preventMultipleClicks.bind(this);
  this.removeClickListener = this.removeClickListener.bind(this);
  this.removeScrollListener = this.removeScrollListener.bind(this);
  this.removePaginationElement = this.removePaginationElement.bind(this);
  this.destroy = this.destroy.bind(this);

  // Selectors
  this.containerElement = document.querySelector(this.settings.container);
  this.paginationElement = document.querySelector(this.settings.pagination);
  this.initialize();
}

Ajaxinate.prototype.initialize = function initialize() {
  if (!this.containerElement) {
    return;
  }

  const initializers = {
    click: this.addClickListener,
    scroll: this.addScrollListeners,
  };

  initializers[this.settings.method]();
};

Ajaxinate.prototype.addScrollListeners = function addScrollListeners() {
  if (!this.paginationElement) {
    return;
  }

  document.addEventListener("scroll", this.checkIfPaginationInView);
  window.addEventListener("resize", this.checkIfPaginationInView);
  window.addEventListener("orientationchange", this.checkIfPaginationInView);
};

Ajaxinate.prototype.addClickListener = function addClickListener() {
  if (!this.paginationElement) {
    return;
  }

  this.nextPageLinkElement = this.paginationElement.querySelector("a");
  this.clickActive = true;

  if (
    typeof this.nextPageLinkElement !== "undefined" &&
    this.nextPageLinkElement !== null
  ) {
    this.nextPageLinkElement.addEventListener(
      "click",
      this.preventMultipleClicks
    );
  }
};

Ajaxinate.prototype.preventMultipleClicks = function preventMultipleClicks(
  event
) {
  event.preventDefault();

  if (!this.clickActive) {
    return;
  }

  this.nextPageLinkElement.innerText = this.settings.loadingText;
  this.nextPageUrl = this.nextPageLinkElement.href;
  this.clickActive = false;

  this.loadMore();
};

Ajaxinate.prototype.checkIfPaginationInView = function checkIfPaginationInView() {
  const top =
    this.paginationElement.getBoundingClientRect().top - this.settings.offset;
  const bottom =
    this.paginationElement.getBoundingClientRect().bottom +
    this.settings.offset;

  if (top <= window.innerHeight && bottom >= 0) {
    this.nextPageLinkElement = this.paginationElement.querySelector("a");
    this.removeScrollListener();

    if (this.nextPageLinkElement) {
      this.nextPageLinkElement.innerText = this.settings.loadingText;
      this.nextPageUrl = this.nextPageLinkElement.href;

      this.loadMore();
    }
  }
};

Ajaxinate.prototype.loadMore = function getTheHtmlOfTheNextPageWithAnAjaxRequest() {
  this.request = new XMLHttpRequest();
  this.request.onreadystatechange = function success() {
    if (this.request.readyState === 4 && this.request.status === 200) {
      var parser = new DOMParser();
      var htmlDoc = parser.parseFromString(
        this.request.responseText,
        "text/html"
      );
      var newContainer = htmlDoc.querySelectorAll(this.settings.container)[0];
      var newPagination = htmlDoc.querySelectorAll(this.settings.pagination)[0];
      this.containerElement.insertAdjacentHTML(
        "beforeend",
        newContainer.innerHTML
      );
      this.paginationElement.innerHTML = newPagination.innerHTML;
      if (
        this.settings.callback &&
        typeof this.settings.callback === "function"
      ) {
        this.settings.callback(this.request.responseXML);
      }
      this.initialize();
    }
  }.bind(this);
  this.request.open("GET", this.nextPageUrl);
  this.request.send();
};

Ajaxinate.prototype.removeClickListener = function removeClickListener() {
  this.nextPageLinkElement.removeEventListener(
    "click",
    this.preventMultipleClicks
  );
};

Ajaxinate.prototype.removePaginationElement = function removePaginationElement() {
  this.paginationElement.innerHTML = "";
  this.destroy();
};

Ajaxinate.prototype.removeScrollListener = function removeScrollListener() {
  document.removeEventListener("scroll", this.checkIfPaginationInView);
  window.removeEventListener("resize", this.checkIfPaginationInView);
  window.removeEventListener("orientationchange", this.checkIfPaginationInView);
};

Ajaxinate.prototype.destroy = function destroy() {
  const destroyers = {
    click: this.removeClickListener,
    scroll: this.removeScrollListener,
  };

  destroyers[this.settings.method]();

  return this;
};

const filtering = container => {
  const forms = t$2("[data-filter-form]", container);
  let formData, searchParams;
  setParams();
  function setParams(form) {
    form = form || forms[0];
    formData = new FormData(form);
    searchParams = new URLSearchParams(formData).toString();
  }

  // Takes the updated form element and updates all other forms with the updated values
  // @param {*} target
  function syncForms(target) {
    if (!target) return;
    const targetInputs = t$2("[data-filter-item-input]", target);
    targetInputs.forEach(targetInput => {
      const {
        nameEscaped,
        valueEscaped
      } = targetInput.dataset;
      if (targetInput.type === "checkbox" || targetInput.type === "radio") {
        const items = t$2("input[data-name-escaped='".concat(nameEscaped, "'][data-value-escaped='").concat(valueEscaped, "']"));
        items.forEach(input => {
          input.checked = targetInput.checked;
        });
      } else {
        const items = t$2("input[data-name-escaped='".concat(nameEscaped, "']"));
        items.forEach(input => {
          input.value = targetInput.value;
        });
      }
    });
  }
  function clearRangeInputs() {
    const rangeInputs = t$2("[data-range-input]", container);
    rangeInputs.forEach(input => {
      input.value = "";
    });
  }
  function resetForms() {
    forms.forEach(form => {
      form.reset();
    });
  }
  return {
    getState() {
      return {
        url: searchParams
      };
    },
    filtersUpdated(target, cb) {
      syncForms(target);
      setParams(target);
      r$1("filters:updated");
      return cb(this.getState());
    },
    removeFilters(target, cb) {
      r$1("filters:filter-removed");
      return cb({
        url: target[0].getAttribute("data-url-to-remove")
      });
    },
    removeRange(cb) {
      clearRangeInputs();
      setParams();
      return cb(this.getState());
    },
    clearAll(cb) {
      searchParams = "";
      resetForms();
      return cb(this.getState());
    }
  };
};

const FILTERS_REMOVE = "collection:filters:remove";
const EVERYTHING_CLEAR = "collection:clear";
const FILTERS_UPDATE = "collection:filters:update";
const updateFilters = target => r$1(FILTERS_UPDATE, null, {
  target
});
const removeFilters = target => r$1(FILTERS_REMOVE, null, {
  target
});
const filtersUpdated = cb => c(FILTERS_UPDATE, cb);
const filtersRemoved = cb => c(FILTERS_REMOVE, cb);
const everythingCleared = cb => c(EVERYTHING_CLEAR, cb);

const filterHandler = _ref => {
  let {
    container,
    renderCB
  } = _ref;
  let subscriptions = null;
  let filters = null;
  let delegate = null;
  filters = filtering(container);

  // Set initial evx state from collection url object
  o$1(filters.getState());
  subscriptions = [filtersRemoved((_, _ref2) => {
    let {
      target
    } = _ref2;
    filters.removeFilters(target, data => {
      renderCB(data.url);
      o$1(data)();
    });
  }), filtersUpdated((_, _ref3) => {
    let {
      target
    } = _ref3;
    filters.filtersUpdated(target, data => {
      renderCB(data.url);
      o$1(data)();
    });
  }), everythingCleared(() => {
    filters.clearAll(data => {
      renderCB(data.url);
      o$1(data)();
    });
  })];
  delegate = new Delegate(container);
  delegate.on("click", "[data-remove-filter], [data-remove-range]", e => {
    e.preventDefault();
    removeFilters([e.target]);
  });
  window.addEventListener("popstate", onPopstate);
  function onPopstate() {
    const url = new URL(window.location);
    const searchParams = url.search.replace("?", "");
    renderCB(searchParams, false);
    o$1({
      url: searchParams
    });
  }
  const unload = () => {
    delegate && delegate.off();
    subscriptions && subscriptions.forEach(unsubscribe => unsubscribe());
    window.removeEventListener("popstate", onPopstate);
  };
  return {
    unload
  };
};

const {
  strings: strings$2
} = window.theme;
const priceRange = container => {
  const inputs = t$2("input", container);
  const minInput = inputs[0];
  const maxInput = inputs[1];
  const events = [e$2(inputs, "change", onRangeChange)];
  const slider = n$2("[data-range-slider]", container);
  let min = Math.floor(minInput.value ? minInput.value : minInput.getAttribute("min"));
  let max = Math.floor(maxInput.value ? maxInput.value : maxInput.getAttribute("max"));
  import(flu.chunks.nouislider).then(_ref => {
    let {
      noUiSlider
    } = _ref;
    noUiSlider.create(slider, {
      start: [minInput.value ? minInput.value : minInput.getAttribute("min"), maxInput.value ? maxInput.value : maxInput.getAttribute("max")],
      handleAttributes: [{
        "aria-label": strings$2.accessibility.range_lower
      }, {
        "aria-label": strings$2.accessibility.range_upper
      }],
      connect: true,
      range: {
        "min": parseInt(minInput.getAttribute("min")),
        "max": parseInt(maxInput.getAttribute("max"))
      }
    });
    slider.noUiSlider.on("slide", e => {
      let maxNew, minNew;
      [minNew, maxNew] = e;
      minInput.value = Math.floor(minNew);
      maxInput.value = Math.floor(maxNew);
      setMinAndMaxValues();
    });
    slider.noUiSlider.on("set", e => {
      let maxNew, minNew;
      minNew = Math.floor(e[0]);
      maxNew = Math.floor(e[1]);
      if (minNew != min) {
        minInput.value = minNew;
        fireMinChangeEvent();
        min = Math.floor(minInput.value ? minInput.value : minInput.getAttribute("min"));
      }
      if (maxNew != max) {
        maxInput.value = maxNew;
        fireMaxChangeEvent();
        max = Math.floor(maxInput.value ? maxInput.value : maxInput.getAttribute("max"));
      }
      setMinAndMaxValues();
    });
    setMinAndMaxValues();
  });
  function setMinAndMaxValues() {
    if (maxInput.value) minInput.setAttribute("max", maxInput.value);
    if (minInput.value) maxInput.setAttribute("min", minInput.value);
    if (minInput.value === "") maxInput.setAttribute("min", 0);
    if (maxInput.value === "") minInput.setAttribute("max", maxInput.getAttribute("max"));
  }
  function adjustToValidValues(input) {
    const value = Number(input.value);
    const minNew = Number(input.getAttribute("min"));
    const maxNew = Number(input.getAttribute("max"));
    if (value < minNew) input.value = minNew;
    if (value > maxNew) input.value = maxNew;
  }
  function fireMinChangeEvent() {
    minInput.dispatchEvent(new Event("change", {
      bubbles: true
    }));
  }
  function fireMaxChangeEvent() {
    maxInput.dispatchEvent(new Event("change", {
      bubbles: true
    }));
  }
  function onRangeChange(event) {
    adjustToValidValues(event.currentTarget);
    setMinAndMaxValues();
    if (minInput.value === "" && maxInput.value === "") return;
    let currentMax, currentMin;
    [currentMin, currentMax] = slider.noUiSlider.get();
    currentMin = Math.floor(currentMin);
    currentMax = Math.floor(currentMax);
    if (currentMin !== Math.floor(minInput.value)) slider.noUiSlider.set([minInput.value, null]);
    if (currentMax !== Math.floor(maxInput.value)) slider.noUiSlider.set([null, maxInput.value]);
  }
  function validateRange() {
    inputs.forEach(input => setMinAndMaxValues());
  }
  const reset = () => {
    slider.noUiSlider.set([minInput.getAttribute("min"), maxInput.getAttribute("max")], false);
    minInput.value = "";
    maxInput.value = "";
    min = Math.floor(minInput.getAttribute("min"));
    max = Math.floor(maxInput.getAttribute("max"));
    setMinAndMaxValues();
  };
  const unload = () => {
    events.forEach(unsubscribe => unsubscribe());
    slider.noUiSlider.destroy();
  };
  return {
    unload,
    reset,
    validateRange
  };
};

const sel$2 = {
  drawer: "[data-filter-drawer]",
  drawerTitle: "[data-filter-drawer-title]",
  filter: "[data-filter]",
  filterDrawerPanel: "[data-filter-drawer-panel]",
  filterInput: "[data-filter-item-input]",
  filterItem: "[data-filter-item]",
  filterTarget: "[data-filter-drawer-target]",
  flyout: "[data-filter-modal]",
  button: "[data-button]",
  wash: "[data-drawer-wash]",
  sort: "[data-sort]",
  sortInput: "[data-sort-item-input]",
  close: "[data-close-icon]",
  group: ".filter-drawer__group",
  groupToggle: "[data-drawer-group-toggle]",
  groupContents: ".filter-drawer__group-filter-wrapper",
  panel: ".filter-drawer__panel",
  flyoutWrapper: "[data-filter-modal-wrapper]",
  priceRange: "[data-price-range]",
  rangeInput: "[data-range-input]",
  resultsCount: "[data-results-count]",
  activeFilters: "[data-active-filters]",
  activeFilterCount: "[data-active-filter-count]"
};
const classes$4 = {
  active: "active",
  activeFilters: "filters-active",
  fixed: "is-fixed",
  filterDisabled: "filter-item__content--disabled"
};
const filterDrawer = node => {
  if (!node) {
    return false;
  }
  const container = n$2(sel$2.drawer, node);
  if (!container) {
    return false;
  }
  let filterDrawerAnimation = null;
  if (shouldAnimate(node)) {
    filterDrawerAnimation = animateFilterDrawer(container);
  }
  const flyouts = t$2(sel$2.flyout, container);
  const wash = n$2(sel$2.wash, container);
  let rangeInputs = t$2(sel$2.rangeInput, container);
  let focusTrap = null;
  let range = null;
  let rangeContainer = n$2(sel$2.priceRange, container);
  const filterDrawerDebounce = debounce();
  const events = [];
  initPriceRange(rangeContainer);
  initEvents();
  function initEvents() {
    events.push(e$2(t$2(sel$2.filterTarget, node), "click", clickFlyoutTrigger), e$2(container, "change", changeHandler), e$2(wash, "click", clickWash), e$2(t$2("".concat(sel$2.button), container), "click", clickButton), e$2(t$2(sel$2.close, container), "click", clickWash), e$2(container, "keydown", _ref => {
      let {
        keyCode
      } = _ref;
      if (keyCode === 27) clickWash();
    }), e$2(rangeInputs, "change", rangeChanged));
  }
  function initPriceRange(rangeContainer) {
    if (rangeContainer) {
      range = priceRange(rangeContainer);
    }
  }

  // Elements are replaced when filters are re-rendered, so we need to get
  // up-to-date copies of these elements.
  function refreshElements() {
    rangeInputs = t$2(sel$2.rangeInput, container);
    rangeContainer = n$2(sel$2.priceRange, container);
  }
  function changeHandler(e) {
    const filterInput = e.target.closest("".concat(sel$2.filterInput, ", ").concat(sel$2.rangeInput, ", ").concat(sel$2.sortInput));
    if (filterInput) {
      filterChange(filterInput);
    }
  }
  function clickFlyoutTrigger(e) {
    e.preventDefault();
    const {
      filterDrawerTarget
    } = e.currentTarget.dataset;
    const modal = n$2("[data-filter-modal=\"".concat(filterDrawerTarget, "\"]"), container);
    focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    u$1(container, classes$4.fixed);
    setTimeout(() => {
      if (shouldAnimate(node)) {
        filterDrawerAnimation.open(modal);
      }
      u$1(container, classes$4.active);
      u$1(modal, classes$4.active);
    }, 0);
    modal.setAttribute("aria-hidden", "false");
    focusTrap.activate();
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    disableBodyScroll(node, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
  }
  function clickWash(e) {
    e && e.preventDefault();
    focusTrap && focusTrap.deactivate();
    i$1(flyouts, classes$4.active);
    i$1(container, classes$4.active);
    flyouts.forEach(flyout => flyout.setAttribute("aria-hidden", "true"));
    document.body.setAttribute("data-fluorescent-overlay-open", "false");
    enableBodyScroll(node);
    setTimeout(() => {
      i$1(container, classes$4.fixed);
      if (shouldAnimate(node)) {
        filterDrawerAnimation.close(flyouts);
      }
    }, 500);
  }
  function filterChange(filter) {
    var _range;
    if (filter.classList.contains(classes$4.filterDisabled)) {
      return;
    }
    checkForActiveModalitems(filter);
    (_range = range) === null || _range === void 0 || _range.validateRange();

    // Update results immediately for price filters and sort change
    if (filter.hasAttribute("data-range-input") || filter.hasAttribute("data-sort-item-input")) {
      updateFilters(container);
    } else {
      filterDrawerDebounce(() => updateFilters(container), 1000);
    }
  }
  function rangeChanged(e) {
    checkForActiveModalitems(e.currentTarget);
    const wrappingContainer = e.target.closest(sel$2.group);
    wrappingContainer && l(wrappingContainer, classes$4.activeFilters, rangeInputsHaveValue());
  }
  function clickButton(e) {
    e.preventDefault();
    const {
      button
    } = e.currentTarget.dataset;
    const scope = e.currentTarget.closest(sel$2.flyout);
    const {
      filterModal
    } = scope.dataset;
    if (button === "close") {
      clickWash();
    }

    // Sort flyouts
    if (filterModal === "__sort") {
      if (button === "clear-all") {
        t$2("[data-filter-modal=\"__sort\"] ".concat(sel$2.sort), container).forEach(element => {
          n$2("input", element).checked = false;
        });
        i$1(e.currentTarget.closest(sel$2.panel), classes$4.activeFilters);
      }
    } else {
      // Regular filter flyout

      if (button === "clear-all") {
        t$2("input", scope).forEach(input => {
          input.checked = false;
        });
        const panel = e.currentTarget.closest(sel$2.panel);
        i$1([...t$2(sel$2.group, panel), panel], classes$4.activeFilters);
        range && range.reset();
        updateFilters(container);
      }
      if (button === "group_toggle") {
        const group = n$2("#".concat(e.currentTarget.getAttribute("aria-controls")));
        const ariaExpanded = e.currentTarget.getAttribute("aria-expanded") === "true";
        slideStop(group);
        if (ariaExpanded) {
          closeGroup(e.currentTarget, group);
        } else {
          openGroup(e.currentTarget, group);
        }
      }
    }
  }
  function openGroup(button, group) {
    slideDown(group);
    button.setAttribute("aria-expanded", true);
    group.setAttribute("aria-hidden", false);
  }
  function closeGroup(button, group) {
    slideUp(group);
    button.setAttribute("aria-expanded", false);
    group.setAttribute("aria-hidden", true);
  }
  function containsCheckedInputs(items) {
    return items.some(input => input.checked);
  }
  function rangeInputsHaveValue() {
    return rangeInputs.some(input => input.value !== "");
  }
  function checkForActiveModalitems(currentTarget) {
    const panel = currentTarget.closest(sel$2.panel);
    if (!panel) return;
    const activeItems = containsCheckedInputs(t$2("input", panel)) || rangeInputsHaveValue();
    l(panel, classes$4.activeFilters, activeItems);
  }
  function renderFilters(updatedDoc) {
    const currentDrawerPanel = n$2(sel$2.filterDrawerPanel);
    if (currentDrawerPanel) {
      const updatedDrawerPanel = n$2(sel$2.filterDrawerPanel, updatedDoc);
      const updatedGroupToggles = t$2(sel$2.groupToggle, updatedDrawerPanel);

      // We're going to replace the current drawer content with the updated content, so we need to
      // loop through the current content to maintain the state of group toggles.
      updatedGroupToggles.forEach(groupToggle => {
        const currentGroupToggle = n$2("[data-drawer-group-toggle=\"".concat(groupToggle.getAttribute("data-drawer-group-toggle"), "\"]"), currentDrawerPanel);
        if (currentGroupToggle) {
          const currentGroupContent = n$2(sel$2.groupContents, currentGroupToggle.parentElement);
          const groupContent = n$2(sel$2.groupContents, groupToggle.parentElement);
          groupToggle.setAttribute("aria-expanded", currentGroupToggle.getAttribute("aria-expanded"));
          groupContent.setAttribute("aria-hidden", currentGroupContent.getAttribute("aria-hidden"));
        }
      });

      // We need to unload before we replace all of the content
      unload();
      currentDrawerPanel.innerHTML = updatedDrawerPanel.innerHTML;

      // Now that we've replaced the content, we need to re-init
      refreshElements();
      initEvents();
      initPriceRange(rangeContainer);
      updateInnerHTML("".concat(sel$2.drawer, " ").concat(sel$2.resultsCount), updatedDoc);
      updateInnerHTML("".concat(sel$2.drawer, " ").concat(sel$2.activeFilters), updatedDoc);
      updateInnerHTML("".concat(sel$2.drawer, " ").concat(sel$2.drawerTitle), updatedDoc);
      updateInnerHTML("[data-mobile-filters] [data-mobile-filters-toggle]", updatedDoc);
    }
  }
  function unload() {
    var _range2;
    events.forEach(unsubscribe => unsubscribe());
    (_range2 = range) === null || _range2 === void 0 || _range2.unload();
  }
  return {
    renderFilters,
    unload
  };
};

const sel$1 = {
  bar: "[data-filter-bar]",
  filterItem: "[data-filter-item]",
  dropdownToggle: "[data-dropdown-toggle]",
  group: "[data-filter-group]",
  groupLabel: "[data-filter-group-label]",
  groupValues: "[data-filter-group-values]",
  groupReset: "[data-filter-group-reset]",
  groupHeader: "[data-group-values-header]",
  priceRange: "[data-price-range]",
  rangeInput: "[data-range-input]",
  filterInput: "[data-filter-item-input]",
  sortToggle: "[data-sort-toggle]",
  sortValues: "[data-sort-values]",
  sortInput: "[data-sort-item-input]",
  resultsCount: "[data-results-count]",
  activeFilters: "[data-active-filters]",
  clearAll: "[data-clear-all-filters]"
};
const classes$3 = {
  activeFilters: "filters-active",
  filterDisabled: "filter-item__content--disabled",
  filterBarActive: "filter-bar__filters-inner--active",
  filterBarWashActive: "filter-bar--wash-active",
  filterGroupActive: "filter-group--active",
  filterGroupRight: "filter-group__values--right"
};

// eslint-disable-next-line valid-jsdoc
/**
 * A class to handle desktop filter bar functionality
 * @param {*} node the collection section container
 * @returns renderFilters and unload methods
 */
const filterBar = node => {
  if (!node) {
    return false;
  }

  // `node` is the colelction section container.
  // Using `container` here as the filter bar container to keep filter bar
  // and filter drawer DOM scope separate.
  const container = n$2(sel$1.bar, node);
  let groupLabels = t$2(sel$1.groupLabel, container);
  let rangeInputs = t$2(sel$1.rangeInput, container);
  let rangeContainer = n$2(sel$1.priceRange, container);
  let focusTrap = null;
  let range = null;
  const filterDebounce = debounce();
  const events = [];
  initPriceRange(rangeContainer);
  initEvents();
  function initEvents() {
    events.push(e$2(window, "click", clickHandler), e$2(container, "change", changeHandler), e$2(container, "keydown", _ref => {
      let {
        keyCode
      } = _ref;
      if (keyCode === 27) closeGroups();
    }));
  }
  function initPriceRange(rangeContainer) {
    if (rangeContainer) {
      range = priceRange(rangeContainer);
    }
  }

  // Elements are replaced when filters are re-rendered, so we need to get
  // up-to-date copies of these elements.
  function refreshElements() {
    groupLabels = t$2(sel$1.groupLabel, container);
    rangeInputs = t$2(sel$1.rangeInput, container);
    rangeContainer = n$2(sel$1.priceRange, container);
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * Delegates click events
   * @param {event} e click event
   */
  function clickHandler(e) {
    const group = e.target.closest(sel$1.group);
    const dropdownToggle = e.target.closest(sel$1.dropdownToggle);
    const groupReset = e.target.closest(sel$1.groupReset);
    const clearAll = e.target.closest(sel$1.clearAll);

    // If the click happened outside of a filter group
    // We don't want to close the groups if the click happened on a filter in a group
    if (!group) {
      closeGroups();
    }
    if (dropdownToggle) {
      toggleDropdown(dropdownToggle);
    }
    if (groupReset) {
      handleGroupReset(groupReset);
    }
    if (clearAll) {
      e.preventDefault();
      clearAllFilters();
    }
  }
  function clearAllFilters() {
    var _range;
    (_range = range) === null || _range === void 0 || _range.reset();
    t$2("".concat(sel$1.filterInput), container).forEach(input => {
      input.checked = false;
    });
    updateFilters(container);
  }
  function handleGroupReset(groupReset) {
    const group = groupReset.closest(sel$1.groupValues);
    const {
      filterType
    } = group.dataset;
    if (filterType === "price_range") {
      priceRangeRemove();
    } else {
      t$2(sel$1.filterInput, group).forEach(input => {
        input.checked = false;
      });
      updateFilters(container);
    }
  }
  function priceRangeRemove() {
    var _range2;
    (_range2 = range) === null || _range2 === void 0 || _range2.reset();
    checkForActiveFilters();
    updateFilters(container);
  }

  // eslint-disable-next-line valid-jsdoc
  /**
   * Delegates change events
   * @param {event} e change event
   */
  function changeHandler(e) {
    const filterInput = e.target.closest("".concat(sel$1.filterInput, ", ").concat(sel$1.sortInput, ", ").concat(sel$1.rangeInput));
    if (filterInput) {
      filterChange(filterInput);
    }
  }
  function closeGroups() {
    groupLabels.forEach(button => {
      hideDropdown(button);
    });
  }
  function toggleDropdown(button) {
    const ariaExpanded = button.getAttribute("aria-expanded") === "true";
    if (ariaExpanded) {
      closeGroups();
      hideDropdown(button);
    } else {
      closeGroups();
      showDropdown(button);
    }
  }
  function showDropdown(button) {
    const group = button.closest(sel$1.group);
    const dropdown = n$2("#".concat(button.getAttribute("aria-controls")), container);
    const {
      dropdownToggle
    } = button.dataset;
    button.setAttribute("aria-expanded", true);
    if (dropdown) {
      if (dropdownToggle === "filter-bar-filters") {
        slideStop(dropdown);
        slideDown(dropdown).then(() => {
          dropdown.setAttribute("aria-hidden", false);
        });
      } else {
        dropdown.setAttribute("aria-hidden", false);
        if (group) {
          u$1(group, classes$3.filterGroupActive);
          positionGroup(group, dropdown);

          // Lock the filter bar to stop horizontal scrolling
          u$1(container, classes$3.filterBarWashActive);
          focusTrap = createFocusTrap(group, {
            allowOutsideClick: true
          });
          focusTrap.activate();
        }
      }
    }
  }
  function hideDropdown(button) {
    const group = button.closest(sel$1.group);
    i$1(container, classes$3.filterBarWashActive);
    button.setAttribute("aria-expanded", false);
    const dropdown = n$2("#".concat(button.getAttribute("aria-controls")), container);
    const {
      dropdownToggle
    } = button.dataset;
    if (dropdown) {
      dropdown.setAttribute("aria-hidden", true);
      if (dropdownToggle === "filter-bar-filters") {
        slideStop(dropdown);
        slideUp(dropdown);
      } else if (group) {
        i$1(group, classes$3.filterGroupActive);
        focusTrap && focusTrap.deactivate();
      }
    }
  }
  function positionGroup(group, dropdown) {
    i$1(dropdown, classes$3.filterGroupRight);

    // The filter bar bounding rect
    const parentBounds = group.parentElement.getBoundingClientRect();
    // This filter groups bounding rect.
    // This will be around the toggle button
    // and what the drop down is positioned inside of
    const groupBounds = group.getBoundingClientRect();
    // The drop down bounding rect
    const dropdownBounds = dropdown.getBoundingClientRect();

    // Check if the drop down will stick out too far past the toggle button
    // Basicially checks if the drop down will overflow the page or not
    // 1. add the left side X position of the toggle button
    //    to the width of the drop down
    //    to get the left side position of the drop down
    // 2. If the left side of the drop down is past the width of the filter bar
    // 3. Add a class to the drop down to position it
    //    to the right side of the toggle button
    if (groupBounds.x + dropdownBounds.width >= parentBounds.width) {
      u$1(dropdown, classes$3.filterGroupRight);
    }
  }
  function updateGroupPositions() {
    const buttons = t$2(sel$1.dropdownToggle, container);
    buttons.forEach(button => {
      const ariaExpanded = button.getAttribute("aria-expanded") === "true";
      if (ariaExpanded) {
        const group = button.closest(sel$1.group);
        const dropdown = n$2("#".concat(button.getAttribute("aria-controls")), container);
        if (group && dropdown) {
          positionGroup(group, dropdown);
        }
      }
    });
  }
  function filterChange(filter) {
    var _range3;
    if (filter.classList.contains(classes$3.filterDisabled)) {
      return;
    }
    checkForActiveFilters();
    (_range3 = range) === null || _range3 === void 0 || _range3.validateRange();

    // Update results immediately for price filters and sort change
    if (filter.hasAttribute("data-range-input") || filter.hasAttribute("data-sort-item-input")) {
      updateFilters(container);
    } else {
      filterDebounce(() => updateFilters(container), 1000);
    }
  }
  function checkForActiveFilters() {
    const activeItems = containsCheckedInputs(t$2(sel$1.filterInput, container)) || rangeInputsHaveValue();
    l(container, classes$3.activeFilters, activeItems);
  }
  function rangeInputsHaveValue() {
    return rangeInputs.some(input => input.value !== "");
  }
  function containsCheckedInputs(items) {
    return items.some(input => input.checked);
  }
  function renderFilters(updatedDoc) {
    const currentBar = n$2(sel$1.bar);
    const updatedBar = n$2(sel$1.bar, updatedDoc);
    const updatedGroupLabels = t$2("".concat(sel$1.groupLabel, ":not(").concat(sel$1.sortToggle, ")"), updatedBar);
    const updatedSortToggle = n$2(sel$1.sortToggle, updatedBar);

    // We're going to replace the current bar with the updated content, so we need to
    // loop through the current content to maintain the state of any toggles.
    updatedGroupLabels.forEach(groupLabel => {
      const currentGroupLabel = n$2("[data-dropdown-toggle=\"".concat(groupLabel.getAttribute("data-dropdown-toggle"), "\"]"), currentBar);
      if (currentGroupLabel) {
        const currentGroupValues = n$2(sel$1.groupValues, currentGroupLabel.parentElement);
        const groupValues = n$2(sel$1.groupValues, groupLabel.parentElement);
        groupLabel.setAttribute("aria-expanded", currentGroupLabel.getAttribute("aria-expanded"));
        groupValues.setAttribute("aria-hidden", currentGroupValues.getAttribute("aria-hidden"));
      }
    });
    if (updatedSortToggle) {
      const updatedSortValues = n$2(sel$1.sortValues, updatedSortToggle.parentElement);
      const currentSortToggle = n$2(sel$1.sortToggle, currentBar);
      const currentSortValues = n$2(sel$1.sortValues, currentSortToggle.parentElement);
      updatedSortToggle.setAttribute("aria-expanded", currentSortToggle.getAttribute("aria-expanded"));
      updatedSortValues.setAttribute("aria-hidden", currentSortValues.getAttribute("aria-hidden"));
    }

    // We need to unload before we replace all of the content
    unload();
    currentBar.innerHTML = updatedBar.innerHTML;

    // Now that we've replaced the content, we need to re-init
    refreshElements();
    initEvents();
    initPriceRange(rangeContainer);
    updateGroupPositions();
  }
  function unload() {
    var _range4, _focusTrap;
    events.forEach(unsubscribe => unsubscribe());
    (_range4 = range) === null || _range4 === void 0 || _range4.unload();
    (_focusTrap = focusTrap) === null || _focusTrap === void 0 || _focusTrap.deactivate();
  }
  return {
    renderFilters,
    unload
  };
};

const sel = {
  sidebar: "[data-filter-sidebar]",
  sidebarToggle: '.filter-bar__button--filters[data-filter-location="sidebar"]',
  sidebarToggleText: ".filter-bar__button-text",
  filterBar: "[data-filter-bar]",
  filterBarClearAll: "[data-clear-all-filters]",
  filter: "[data-filter]",
  filterItem: "[data-filter-item]",
  filterInput: "[data-filter-item-input]",
  button: "[data-button]",
  group: ".filter-drawer__group",
  groupToggle: "[data-drawer-group-toggle]",
  groupContents: ".filter-drawer__group-filter-wrapper",
  priceRange: "[data-price-range]",
  rangeInput: "[data-range-input]"
};
const classes$2 = {
  active: "active",
  activeFilters: "filters-active",
  filterDisabled: "filter-item__content--disabled"
};
const filterSidebar = node => {
  if (!node) {
    return false;
  }
  const container = n$2(sel.sidebar, node);
  if (!container) {
    return false;
  }
  let filterSidebarAnimation = null;
  if (shouldAnimate(node)) {
    filterSidebarAnimation = animateFilterSidebar(container);
    if (container.getAttribute("aria-expanded") === "true") {
      filterSidebarAnimation.open(container);
    } else {
      filterSidebarAnimation.close(container);
    }
  }
  const filterBar = n$2(sel.filterBar, node);
  let rangeInputs = t$2(sel.rangeInput, container);
  let rangeContainer = n$2(sel.priceRange, container);
  let range = null;
  const filterDebounce = debounce();
  const events = [];
  initPriceRange(rangeContainer);
  initEvents();
  function initEvents() {
    events.push(e$2(window, "click", clickHandler), e$2(container, "change", changeHandler), e$2(n$2(sel.sidebarToggle, node), "click", clickSidebarToggle), e$2(t$2("".concat(sel.button), container), "click", clickButton));
  }
  function initPriceRange(rangeContainer) {
    if (rangeContainer) {
      range = priceRange(rangeContainer);
    }
  }

  // Elements are replaced when filters are re-rendered, so we need to get
  // up-to-date copies of these elements.
  function refreshElements() {
    rangeInputs = t$2(sel.rangeInput, container);
    rangeContainer = n$2(sel.priceRange, container);
  }
  function clickSidebarToggle(e) {
    e.preventDefault();
    const sidebarToggle = e.currentTarget;
    const {
      collapsedTitle,
      expandedTitle
    } = sidebarToggle.dataset;
    const buttonTextEl = n$2(sel.sidebarToggleText, sidebarToggle);
    if (container.getAttribute("aria-expanded") === "true") {
      container.setAttribute("aria-expanded", "false");
      buttonTextEl.innerText = collapsedTitle;
      setTimeout(() => {
        if (shouldAnimate(node)) {
          filterSidebarAnimation.close(container);
        }
      }, 0);
    } else {
      container.setAttribute("aria-expanded", "true");
      buttonTextEl.innerText = expandedTitle;
      setTimeout(() => {
        if (shouldAnimate(node)) {
          filterSidebarAnimation.open(container);
        }
      }, 0);
    }
  }
  function changeHandler(e) {
    const filterInput = e.target.closest("".concat(sel.filterInput, ", ").concat(sel.sortInput, ", ").concat(sel.rangeInput));
    if (filterInput) {
      filterChange(filterInput);
    }
  }
  function filterChange(filter) {
    var _range;
    if (filter.classList.contains(classes$2.filterDisabled)) {
      return;
    }
    checkForActiveFilters();
    (_range = range) === null || _range === void 0 || _range.validateRange();

    // Update results immediately for price filters and sort change
    if (filter.hasAttribute("data-range-input") || filter.hasAttribute("data-sort-item-input")) {
      updateFilters(container);
    } else {
      filterDebounce(() => updateFilters(container), 1000);
    }
  }
  function clickHandler(e) {
    const clearAll = e.target.closest(sel.filterBarClearAll);
    if (clearAll) {
      updateFilters(container);
    }
  }
  function clickButton(e) {
    e.preventDefault();
    const {
      button
    } = e.currentTarget.dataset;
    if (button === "clear-all") {
      var _range2;
      t$2("input", container).forEach(input => {
        input.checked = false;
      });
      (_range2 = range) === null || _range2 === void 0 || _range2.reset();
      updateFilters(container);
    }
    if (button === "group_toggle") {
      const group = n$2("#".concat(e.currentTarget.getAttribute("aria-controls")));
      const ariaExpanded = e.currentTarget.getAttribute("aria-expanded") === "true";
      slideStop(group);
      if (ariaExpanded) {
        closeGroup(e.currentTarget, group);
      } else {
        openGroup(e.currentTarget, group);
      }
    }
  }
  function openGroup(button, group) {
    slideDown(group);
    button.setAttribute("aria-expanded", true);
    group.setAttribute("aria-hidden", false);
  }
  function closeGroup(button, group) {
    slideUp(group);
    button.setAttribute("aria-expanded", false);
    group.setAttribute("aria-hidden", true);
  }
  function checkForActiveFilters() {
    const activeItems = containsCheckedInputs(t$2(sel.filterInput, container)) || rangeInputsHaveValue();
    l(filterBar, classes$2.activeFilters, activeItems);
  }
  function rangeInputsHaveValue() {
    return rangeInputs.some(input => input.value !== "");
  }
  function containsCheckedInputs(items) {
    return items.some(input => input.checked);
  }
  function renderFilters(updatedDoc) {
    const currentSidebar = n$2(sel.sidebar);
    const updatedSidebar = n$2(sel.sidebar, updatedDoc);
    const updatedGroupToggles = t$2(sel.groupToggle, updatedSidebar);

    // We're going to replace the current sidebar with the updated content, so we need to
    // loop through the current content to maintain the state of group toggles.
    updatedGroupToggles.forEach(groupToggle => {
      const currentGroupToggle = n$2("[data-drawer-group-toggle=\"".concat(groupToggle.getAttribute("data-drawer-group-toggle"), "\"]"), currentSidebar);
      if (currentGroupToggle) {
        const currentGroupContent = n$2(sel.groupContents, currentGroupToggle.parentElement);
        const groupContent = n$2(sel.groupContents, groupToggle.parentElement);
        groupToggle.setAttribute("aria-expanded", currentGroupToggle.getAttribute("aria-expanded"));
        groupContent.setAttribute("aria-hidden", currentGroupContent.getAttribute("aria-hidden"));
      }
    });

    // We need to unload before we replace all of the content
    unload();
    currentSidebar.innerHTML = updatedSidebar.innerHTML;

    // Now that we've replaced the content, we need to re-init
    refreshElements();
    initEvents();
    initPriceRange(rangeContainer);
    updateInnerHTML("".concat(sel.filterBar, " ").concat(sel.resultsCount), updatedDoc);
    updateInnerHTML("".concat(sel.filterBar, " ").concat(sel.activeFilters), updatedDoc);
    updateInnerHTML("".concat(sel.filterBar, " ").concat(sel.sidebarToggle), updatedDoc);
  }
  function unload() {
    var _range3;
    events.forEach(unsubscribe => unsubscribe());
    (_range3 = range) === null || _range3 === void 0 || _range3.unload();
  }
  return {
    renderFilters,
    unload
  };
};

const selectors$1 = {
  infiniteScrollContainer: ".collection__infinite-container",
  infiniteScrollTrigger: ".collection__infinite-trigger",
  partial: "[data-partial]",
  filterDrawer: "[data-filter-drawer]",
  filterBar: "[data-filter-bar]",
  filterSidebar: "[data-filter-sidebar]",
  loader: ".collection__loading",
  paginationItemCount: "[data-pagination-item-count]",
  productItems: ".product-item"
};
const classes$1 = {
  active: "is-active",
  hideProducts: "animation--collection-products-hide"
};
const {
  strings: strings$1
} = window.theme;
register("collection", {
  infiniteScroll: null,
  onLoad() {
    const {
      collectionItemCount,
      paginationType
    } = this.container.dataset;
    if (!parseInt(collectionItemCount)) return;
    this.filterDrawerEl = n$2(selectors$1.filterDrawer, this.container);
    this.filterbarEl = n$2(selectors$1.filterBar, this.container);
    this.paginationItemCount = n$2(selectors$1.paginationItemCount, this.container);
    if (this.filterDrawerEl || this.filterbarEl) {
      this.partial = n$2(selectors$1.partial, this.container);
      this.filterDrawer = filterDrawer(this.container);
      this.filterBar = filterBar(this.container);
      this.filterSidebar = filterSidebar(this.container);
      this.filterHandler = filterHandler({
        container: this.container,
        renderCB: this._renderView.bind(this)
      });
      if (this.filterSidebar && this.container.dataset.enableStickyFilterSidebar === "true") {
        this.mobileQuery = window.matchMedia(getMediaQuery("below-960"));
        this._initStickyScroll();
        this.breakPointHandler = atBreakpointChange(960, () => {
          this._initStickyScroll();
        });
      }
    }

    // Infinite scroll
    this.paginationType = paginationType;
    this.paginated = this.paginationType === "paginated";
    this.infiniteScrollTrigger = n$2(selectors$1.infiniteScrollTrigger, this.container);
    if (!this.paginated) {
      this._initInfiniteScroll();
    }
    this.productItem = ProductItem(this.container);
    if (shouldAnimate(this.container)) {
      this.animateCollection = animateCollection(this.container);
    }
  },
  _initStickyScroll() {
    if (this.mobileQuery.matches) {
      if (this.stickyScroll) {
        this.stickyScroll.destroy();
        this.stickyScroll = null;
      }
    } else if (!this.stickyScroll) {
      this.stickyScroll = stickyScroll(this.container);
    }
  },
  _initInfiniteScroll() {
    const infiniteScrollOptions = {
      container: selectors$1.infiniteScrollContainer,
      pagination: selectors$1.infiniteScrollTrigger,
      loadingText: "Loading...",
      callback: () => {
        var _this$animateCollecti;
        this.productItem && this.productItem.unload();
        this.productItem = ProductItem(this.container);
        (_this$animateCollecti = this.animateCollection) === null || _this$animateCollecti === void 0 || _this$animateCollecti.infiniteScrollReveal();
        this._updatePaginationCount();
        r$1("collection:updated");
      }
    };
    if (this.paginationType === "click") {
      infiniteScrollOptions.method = "click";
    }
    this.infiniteScroll = new Ajaxinate(infiniteScrollOptions);
  },
  _updatePaginationCount() {
    const productItemCount = t$2(selectors$1.productItems, this.container).length;
    const viewing = strings$1.pagination.viewing.replace("{{ of }}", "1-".concat(productItemCount)).replace("{{ total }}", this.partial.dataset.collectionProductsCount);
    this.paginationItemCount.innerHTML = "".concat(viewing, " ").concat(strings$1.pagination.products);
  },
  _renderView(searchParams) {
    let updateHistory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    const url = "".concat(window.location.pathname, "?section_id=").concat(this.container.dataset.sectionId, "&").concat(searchParams);
    const loading = n$2(selectors$1.loader, this.container);
    u$1(this.partial, classes$1.hideProducts);
    u$1(loading, classes$1.active);
    fetch(url).then(res => res.text()).then(res => {
      var _this$animateCollecti2;
      if (updateHistory) {
        this._updateURLHash(searchParams);
      }
      const doc = new DOMParser().parseFromString(res, "text/html");
      const updatedPartial = n$2(selectors$1.partial, doc);
      this.partial.innerHTML = updatedPartial.innerHTML;
      this.partial.dataset.collectionProductsCount = updatedPartial.dataset.collectionProductsCount;
      (_this$animateCollecti2 = this.animateCollection) === null || _this$animateCollecti2 === void 0 || _this$animateCollecti2.updateContents();
      if (!this.paginated && this.infiniteScrollTrigger) {
        this.infiniteScrollTrigger.innerHTML = "";
        this._initInfiniteScroll();
      }
      this.filterDrawer && this.filterDrawer.renderFilters(doc);
      this.filterBar && this.filterBar.renderFilters(doc);
      this.filterSidebar && this.filterSidebar.renderFilters(doc);
      this.productItem && this.productItem.unload();
      this.productItem = ProductItem(this.container);
      this.paginationItemCount = n$2(selectors$1.paginationItemCount, this.container);
      i$1(loading, classes$1.active);
      r$1("collection:updated");
    });
  },
  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", "".concat(window.location.pathname).concat(searchParams && "?".concat(searchParams)));
  },
  onUnload() {
    var _this$animateCollecti3;
    this.infiniteScroll && this.infiniteScroll.destroy();
    this.filterHandler && this.filterHandler.unload();
    this.filterDrawer && this.filterDrawer.unload();
    this.filterBar && this.filterBar.unload();
    this.filterSidebar && this.filterSidebar.unload();
    this.filtering && this.filtering.unload();
    this.productItem && this.productItem.unload();
    (_this$animateCollecti3 = this.animateCollection) === null || _this$animateCollecti3 === void 0 || _this$animateCollecti3.destroy();
  }
});

register("login", {
  onLoad() {
    const main = n$2('[data-part="login"]', this.container);
    const reset = n$2('[data-part="reset"]', this.container);
    const toggles = t$2("[data-toggle]", this.container);
    const loginError = n$2(".form-status__message--error", reset);
    const isSuccess = n$2(".form-status__message--success", reset);
    const successMessage = n$2("[data-success-message]", this.container);
    if (isSuccess) {
      u$1(successMessage, "visible");
      u$1([main, reset], "hide");
    }
    if (loginError) {
      toggleView();
    }
    function toggleView(e) {
      e && e.preventDefault();
      l([main, reset], "hide");
      main.setAttribute("aria-hidden", a$1(main, "hide"));
      reset.setAttribute("aria-hidden", a$1(reset, "hide"));
    }
    this.toggleClick = e$2(toggles, "click", toggleView);
  },
  onUnload() {
    this.toggleClick();
  }
});

register("addresses", {
  onLoad() {
    this.modals = t$2("[data-address-modal]", this.container);
    this.focusTrap = null;
    const overlays = t$2("[data-overlay]", this.container);
    const open = t$2("[data-open]", this.container);
    const close = t$2("[data-close]", this.container);
    const remove = t$2("[data-remove]", this.container);
    const countryOptions = t$2("[data-country-option]", this.container) || [];
    this.events = [e$2(open, "click", e => this.openModal(e)), e$2([...close, ...overlays], "click", e => this.closeModal(e)), e$2(remove, "click", e => this.removeAddress(e)), e$2(this.modals, "keydown", e => {
      if (e.keyCode === 27) this.closeModal(e);
    })];
    countryOptions.forEach(el => {
      const {
        formId
      } = el.dataset;
      const countrySelector = "AddressCountry_" + formId;
      const provinceSelector = "AddressProvince_" + formId;
      const containerSelector = "AddressProvinceContainer_" + formId;
      new window.Shopify.CountryProvinceSelector(countrySelector, provinceSelector, {
        hideElement: containerSelector
      });
    });
  },
  onUnload() {
    this.events.forEach(unsubscribe => unsubscribe());
  },
  openModal(e) {
    e.preventDefault();
    const {
      open: which
    } = e.currentTarget.dataset;
    const modal = this.modals.find(el => el.dataset.addressModal == which);
    u$1(modal, "active");
    this.focusTrap = createFocusTrap(modal, {
      allowOutsideClick: true
    });
    this.focusTrap.activate();
    document.body.setAttribute("data-fluorescent-overlay-open", "true");
    disableBodyScroll(modal, {
      allowTouchMove: el => {
        while (el && el !== document.body) {
          if (el.getAttribute("data-scroll-lock-ignore") !== null) {
            return true;
          }
          el = el.parentNode;
        }
      },
      reserveScrollBarGap: true
    });
    setTimeout(() => {
      u$1(modal, "visible");
    }, 50);
  },
  closeModal(e) {
    e.preventDefault();
    const modal = e.target.closest(".addresses__modal");
    document.body.setAttribute("data-fluorescent-overlay-open", "false");
    enableBodyScroll(modal);
    this.focusTrap.deactivate();
    i$1(modal, "visible");
    setTimeout(() => {
      i$1(modal, "active");
    }, 350);
  },
  removeAddress(e) {
    const {
      confirmMessage,
      target
    } = e.currentTarget.dataset;
    if (confirm(confirmMessage)) {
      window.Shopify.postLink(target, {
        parameters: {
          _method: "delete"
        }
      });
    }
  }
});

register("article", {
  onLoad() {
    focusFormStatus(this.container);
    const socialShareContainer = n$2(".social-share", this.container);
    if (socialShareContainer) {
      this.socialShare = SocialShare(socialShareContainer);
    }
    wrapIframes(t$2("iframe", this.container));
    wrapTables(t$2("table", this.container));
    if (shouldAnimate(this.container)) {
      this.animateArticle = animateArticle(this.container);
    }
  },
  onUnload() {
    var _this$animateArticle;
    this.socialShare && this.socialShare();
    (_this$animateArticle = this.animateArticle) === null || _this$animateArticle === void 0 || _this$animateArticle.destroy();
  }
});

register("password", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animatePassword = animatePassword(this.container);
    }
  },
  onUnload() {
    var _this$animatePassword;
    (_this$animatePassword = this.animatePassword) === null || _this$animatePassword === void 0 || _this$animatePassword.destroy();
  }
});

register("page", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animatePage = animatePage(this.container);
    }

    // Required to properly style RTE content
    wrapIframes(t$2("iframe", this.container));
    wrapTables(t$2("table", this.container));
  },
  onUnload() {
    var _this$animatePage;
    (_this$animatePage = this.animatePage) === null || _this$animatePage === void 0 || _this$animatePage.destroy();
  }
});

const selectors = {
  searchSection: ".search",
  searchBanner: ".search-header",
  infiniteScrollContainer: ".search__infinite-container",
  infiniteScrollTrigger: ".search__infinite-trigger",
  partial: "[data-partial]",
  filterDrawer: "[data-filter-drawer]",
  filterBar: "[data-filter-bar]",
  filterSidebar: "[data-filter-sidebar]",
  loader: ".search__loading",
  paginationItemCount: "[data-pagination-item-count]",
  searchItems: ".product-item, .search-item"
};
const classes = {
  active: "is-active",
  hideProducts: "animation--search-products-hide"
};
const {
  strings
} = window.theme;
register("search", {
  infiniteScroll: null,
  onLoad() {
    this.searchBannerEl = n$2(selectors.searchBanner, this.container);
    if (shouldAnimate(this.searchBannerEl)) {
      this.animateSearchBanner = animateSearchBanner(this.searchBannerEl);
    }
    const {
      paginationType
    } = this.container.dataset;
    this.searchSectionEl = n$2(selectors.searchSection, this.container);
    this.filterDrawerEl = n$2(selectors.filterDrawer, this.container);
    this.filterBarEl = n$2(selectors.filterBar, this.container);
    this.paginationItemCount = n$2(selectors.paginationItemCount, this.container);
    if (this.filterBarEl) {
      this.partial = n$2(selectors.partial, this.container);
      this.filterDrawer = filterDrawer(this.searchSectionEl);
      this.filterBar = filterBar(this.searchSectionEl);
      this.filterSidebar = filterSidebar(this.searchSectionEl);
      this.filterHandler = filterHandler({
        container: this.searchSectionEl,
        renderCB: this._renderView.bind(this)
      });
      if (this.filterSidebar && this.searchSectionEl.dataset.enableStickyFilterSidebar === "true") {
        this.mobileQuery = window.matchMedia(getMediaQuery("below-960"));
        this._initStickyScroll();
        this.breakPointHandler = atBreakpointChange(960, () => {
          this._initStickyScroll();
        });
      }
    }

    // Ininite scroll
    this.paginationType = paginationType;
    this.paginated = this.paginationType === "paginated";
    this.infiniteScrollTrigger = n$2(selectors.infiniteScrollTrigger, this.container);
    if (!this.paginated) {
      this._initInfiniteScroll();
    }
    this.productItem = ProductItem(this.container);
    if (shouldAnimate(this.searchSectionEl)) {
      this.animateSearch = animateSearch(this.searchSectionEl);
    }
  },
  _initStickyScroll() {
    if (this.mobileQuery.matches) {
      if (this.stickyScroll) {
        this.stickyScroll.destroy();
        this.stickyScroll = null;
      }
    } else if (!this.stickyScroll) {
      this.stickyScroll = stickyScroll(this.searchSectionEl);
    }
  },
  _initInfiniteScroll() {
    const infiniteScrollOptions = {
      container: selectors.infiniteScrollContainer,
      pagination: selectors.infiniteScrollTrigger,
      loadingText: "Loading...",
      callback: () => {
        var _this$animateSearch;
        this.productItem && this.productItem.unload();
        this.productItem = ProductItem(this.container);
        (_this$animateSearch = this.animateSearch) === null || _this$animateSearch === void 0 || _this$animateSearch.infiniteScrollReveal();
        this._updatePaginationCount();
        r$1("collection:updated");
      }
    };
    if (this.paginationType === "click") {
      infiniteScrollOptions.method = "click";
    }
    this.infiniteScroll = new Ajaxinate(infiniteScrollOptions);
  },
  _updatePaginationCount() {
    const searchItemCount = t$2(selectors.searchItems, this.container).length;
    const viewing = strings.pagination.viewing.replace("{{ of }}", "1-".concat(searchItemCount)).replace("{{ total }}", this.partial.dataset.searchResultsCount);
    this.paginationItemCount.innerHTML = "".concat(viewing, " ").concat(strings.pagination.results);
  },
  _renderView(searchParams) {
    let updateHistory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    const url = "".concat(window.location.pathname, "?section_id=").concat(this.container.dataset.sectionId, "&").concat(searchParams);
    const loading = n$2(selectors.loader, this.container);
    u$1(loading, classes.active);
    fetch(url).then(res => res.text()).then(res => {
      var _this$animateSearch2;
      if (updateHistory) {
        this._updateURLHash(searchParams);
      }
      const doc = new DOMParser().parseFromString(res, "text/html");
      const updatedPartial = n$2(selectors.partial, doc);
      this.partial.innerHTML = updatedPartial.innerHTML;
      this.partial.dataset.searchResultsCount = updatedPartial.dataset.searchResultsCount;
      (_this$animateSearch2 = this.animateSearch) === null || _this$animateSearch2 === void 0 || _this$animateSearch2.updateContents();
      if (!this.paginated && this.infiniteScrollTrigger) {
        this.infiniteScrollTrigger.innerHTML = "";
        this._initInfiniteScroll();
      }
      this.filterDrawer && this.filterDrawer.renderFilters(doc);
      this.filterBar && this.filterBar.renderFilters(doc);
      this.filterSidebar && this.filterSidebar.renderFilters(doc);
      this.productItem && this.productItem.unload();
      this.productItem = ProductItem(this.container);
      this.paginationItemCount = n$2(selectors.paginationItemCount, this.container);
      i$1(loading, classes.active);
      r$1("collection:updated");
    });
  },
  _updateURLHash(searchParams) {
    history.pushState({
      searchParams
    }, "", "".concat(window.location.pathname).concat(searchParams && "?".concat(searchParams)));
  },
  onUnload() {
    var _this$animateSearch3, _this$animateSearchBa;
    this.infiniteScroll && this.infiniteScroll.destroy();
    this.filterHandler && this.filterHandler.unload();
    this.filterDrawer && this.filterDrawer.unload();
    this.filterBar && this.filterBar.unload();
    this.filterSidebar && this.filterSidebar.unload();
    this.filtering && this.filtering.unload();
    this.productItem && this.productItem.unload();
    (_this$animateSearch3 = this.animateSearch) === null || _this$animateSearch3 === void 0 || _this$animateSearch3.destroy();
    (_this$animateSearchBa = this.animateSearchBanner) === null || _this$animateSearchBa === void 0 || _this$animateSearchBa.destroy();
  }
});

register("contact", {
  onLoad() {
    this.accordions = Accordions(t$2(".accordion", this.container));
    wrapIframes(t$2("iframe", this.container));
    wrapTables(t$2("table", this.container));
  },
  onUnload() {
    this.accordions.unload();
  }
});

register("blog", {
  onLoad() {
    const mobileNavSelect = n$2("#blog-mobile-nav", this.container);
    if (mobileNavSelect) {
      this.mobileNavSelectEvent = e$2(mobileNavSelect, "change", () => {
        window.location.href = mobileNavSelect.value;
      });
    }
    if (shouldAnimate(this.container)) {
      this.animateBlog = animateBlog(this.container);
    }
  },
  onUnload() {
    var _this$animateBlog;
    (_this$animateBlog = this.animateBlog) === null || _this$animateBlog === void 0 || _this$animateBlog.destroy();
    this.mobileNavSelectEvent && this.mobileNavSelectEvent.unsubscribe();
  }
});

register("collection-banner", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateCollectionBanner = animateCollectionBanner(this.container);
    }
  },
  onUnload() {
    var _this$animateCollecti;
    (_this$animateCollecti = this.animateCollectionBanner) === null || _this$animateCollecti === void 0 || _this$animateCollecti.destroy();
  }
});

register("list-collections", {
  onLoad() {
    if (shouldAnimate(this.container)) {
      this.animateListCollections = animateListCollections(this.container);
    }
  },
  onUnload() {
    var _this$animateListColl;
    (_this$animateListColl = this.animateListCollections) === null || _this$animateListColl === void 0 || _this$animateListColl.destroy();
  }
});

var _window$Shopify;

// eslint-disable-next-line no-prototype-builtins
if (!HTMLElement.prototype.hasOwnProperty("inert")) {
  import(flu.chunks.polyfillInert);
}

// Detect theme editor
if (window.Shopify.designMode === true) {
  u$1(document.documentElement, "theme-editor");
  document.documentElement.classList.add("theme-editor");
} else {
  const el = n$2(".theme-editor-scroll-offset", document);
  el && el.parentNode.removeChild(el);
}

// Function to load all sections
const loadSections = () => {
  load("*");
  o$1({
    SelectedProductSection: null
  });
};

// Call above function either immediately or bind on loaded event
if (document.readyState === "complete" || document.readyState === "interactive") {
  loadSections();
} else {
  e$2(document, "DOMContentLoaded", loadSections);
}
if (isMobile$1({
  tablet: true,
  featureDetect: true
})) {
  u$1(document.body, "is-mobile");
}

// Page transitions
pageTransition();

// a11y tab handler
handleTab();

// Apply contrast classes
sectionClasses();

// Load productlightbox
productLightbox();

// Quick view modal
const quickViewModalElement = n$2("[data-quick-view-modal]", document);
if (quickViewModalElement) {
  quickViewModal(quickViewModalElement);
}

// Setup modal
const modalElement = n$2("[data-modal]", document);
modal(modalElement);
const flashModal = n$2("[data-flash-alert]", document);
flashAlertModal(flashModal);

// Product availabilty drawer
const availabilityDrawer = n$2("[data-store-availability-drawer]", document);
storeAvailabilityDrawer(availabilityDrawer);

// Setup header overlay
const headerOverlayContainer = document.querySelector("[data-header-overlay]");
headerOverlay(headerOverlayContainer);

// Init back to top button
backToTop();

// Make it easy to see exactly what theme version
// this is by commit SHA
window.SHA = "6eebbbc7f2";
if (!sessionStorage.getItem("flu_stat_recorded") && !((_window$Shopify = window.Shopify) !== null && _window$Shopify !== void 0 && _window$Shopify.designMode)) {
  var _window$Shopify2, _window$Shopify3;
  // eslint-disable-next-line no-process-env
  fetch("https://stats.fluorescent.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...window.theme.coreData,
      s: (_window$Shopify2 = window.Shopify) === null || _window$Shopify2 === void 0 ? void 0 : _window$Shopify2.shop,
      r: (_window$Shopify3 = window.Shopify) === null || _window$Shopify3 === void 0 || (_window$Shopify3 = _window$Shopify3.theme) === null || _window$Shopify3 === void 0 ? void 0 : _window$Shopify3.role
    })
  });
  if (window.sessionStorage) {
    sessionStorage.setItem("flu_stat_recorded", "true");
  }
}

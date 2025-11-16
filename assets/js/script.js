'use strict';

/* -------------------------------------------------------------------------- */
/*  Theme-dependent client logos                                              */
/* -------------------------------------------------------------------------- */
const CLIENT_LOGO_SELECTOR = "[data-logo-light][data-logo-dark]";

/**
 * Swap client logo sources based on the active theme.
 *
 * @param {"light"|"dark"} mode
 */
const updateClientLogos = function (mode) {
  const normalizedMode = mode === "dark" ? "dark" : "light";
  const logoNodes = document.querySelectorAll(CLIENT_LOGO_SELECTOR);

  logoNodes.forEach((node) => {
    if (!(node instanceof HTMLImageElement)) { return; }

    const nextSrc = normalizedMode === "dark" ? node.dataset.logoDark : node.dataset.logoLight;
    if (nextSrc && node.getAttribute("src") !== nextSrc) {
      node.setAttribute("src", nextSrc);
    }

    const lightSrcset = node.dataset.logoLightSrcset;
    const darkSrcset = node.dataset.logoDarkSrcset;
    const nextSrcset = normalizedMode === "dark" ? darkSrcset : lightSrcset;

    if (nextSrcset !== undefined) {
      if (nextSrcset) {
        node.setAttribute("srcset", nextSrcset);
      } else {
        node.removeAttribute("srcset");
      }
    }
  });
};

/* -------------------------------------------------------------------------- */
/*  Color mode toggle                                                         */
/* -------------------------------------------------------------------------- */
(function initColorModeToggle() {
  const body = document.body;
  const toggle = document.querySelector("[data-theme-toggle]");
  if (!body || !toggle) { return; }

  const STORAGE_KEY = "preferred-color-mode";
  const DEFAULT_MODE = body.classList.contains("light-mode") ? "light" : "dark";

  const storage = (function () {
    try {
      const testKey = "__theme_pref__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      return window.localStorage;
    } catch (error) {
      return null;
    }
  })();

  const normalizeMode = function (value) {
    return value === "light" ? "light" : "dark";
  };

  const updateToggleAccessibility = function (mode) {
    const nextTarget = mode === "dark" ? "light" : "dark";
    toggle.setAttribute("aria-pressed", mode === "light" ? "true" : "false");
    toggle.setAttribute("data-theme-state", mode);
    toggle.setAttribute("aria-label", `Switch to ${nextTarget} mode`);
    toggle.setAttribute("title", `Switch to ${nextTarget} mode`);
  };

  const applyMode = function (mode) {
    const normalized = normalizeMode(mode);
    body.classList.remove("light-mode", "dark-mode");
    body.classList.add(`${normalized}-mode`);
    updateToggleAccessibility(normalized);
    updateClientLogos(normalized);
    return normalized;
  };

  const getStoredMode = function () {
    if (storage) {
      const stored = storage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    }

    if (window.matchMedia && typeof window.matchMedia === "function") {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      if (prefersLight && DEFAULT_MODE !== "light") {
        return "light";
      }
    }

    return DEFAULT_MODE;
  };

  if (!body.classList.contains("light-mode") && !body.classList.contains("dark-mode")) {
    body.classList.add(`${DEFAULT_MODE}-mode`);
  }

  const initialMode = applyMode(getStoredMode());

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, initialMode);
    } catch (error) {
      // Silently ignore storage errors.
    }
  }

  toggle.addEventListener("click", function () {
    const nextMode = body.classList.contains("dark-mode") ? "light" : "dark";
    const applied = applyMode(nextMode);
    if (storage) {
      try {
        storage.setItem(STORAGE_KEY, applied);
      } catch (error) {
        // Ignore storage write failures.
      }
    }
  });

  const HIDE_THRESHOLD = 120;

  const handleScroll = function () {
    if (window.scrollY > HIDE_THRESHOLD) {
      toggle.classList.add("is-hidden");
    } else {
      toggle.classList.remove("is-hidden");
    }
  };

  handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });
})();

/* -------------------------------------------------------------------------- */
/*  Floating page-up button (scroll-depth reveal + reduced-motion fallback)   */
/* -------------------------------------------------------------------------- */
(function initFloatingScrollTop() {
  const scrollTopBtn = document.querySelector("[data-scroll-top-btn]");
  if (!scrollTopBtn) { return; }

  let lastScrollSegment = 0;

  const toggleVisibility = function () {
    const currentY = window.scrollY;
    const currentSegment = Math.floor(currentY / window.innerHeight);

    if (currentSegment !== lastScrollSegment) {
      lastScrollSegment = currentSegment;
      if (currentSegment >= 3) {
        scrollTopBtn.classList.add("is-visible");
      }
    }

    if (currentY <= 80) {
      scrollTopBtn.classList.remove("is-visible");
    }
  };

  const scrollToTop = function () {
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      window.scrollTo(0, 0);
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  toggleVisibility();
  window.addEventListener("scroll", toggleVisibility, { passive: true });
  scrollTopBtn.addEventListener("click", scrollToTop);
})();

/* -------------------------------------------------------------------------- */
/*  Utility helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Toggle the `active` class on the provided element.
 * Safely exits when the element is undefined.
 *
 * @param {Element} elem - Target element that should toggle visibility.
 */
const elementToggleFunc = function (elem) {
  if (!elem) { return; }
  elem.classList.toggle("active");
};

/**
 * Prevent navigation for links that point to unavailable destinations.
 *
 * @param {MouseEvent} event
 */
const preventNavigation = function (event) {
  event.preventDefault();
  event.stopPropagation();
};

/**
 * Disable a link while keeping it focusable for screen readers.
 *
 * @param {HTMLAnchorElement} link
 */
const disableInteractiveLink = function (link) {
  if (!link) { return; }
  link.removeAttribute("href");
  link.removeAttribute("target");
  link.removeAttribute("rel");
  link.classList.add("blog-link--disabled");
  link.setAttribute("tabindex", "-1");
  link.removeEventListener("click", preventNavigation);
  link.addEventListener("click", preventNavigation);
};

/**
 * Enable a link with consistent defaults and accessibility cleanup.
 *
 * @param {HTMLAnchorElement} link
 * @param {string} href
 * @param {{target?: string, rel?: string}} [options]
 */
const enableInteractiveLink = function (link, href, options) {
  if (!link || !href) { return; }
  const { target = "_self", rel = null } = options || {};

  link.setAttribute("href", href);
  link.setAttribute("target", target);
  if (rel) {
    link.setAttribute("rel", rel);
  } else {
    link.removeAttribute("rel");
  }
  link.classList.remove("blog-link--disabled");
  link.removeAttribute("tabindex");
  link.removeEventListener("click", preventNavigation);
};



/* -------------------------------------------------------------------------- */
/*  Sidebar interaction (profile drawer toggle)                              */
/* -------------------------------------------------------------------------- */
const sidebar = document.querySelector("[data-sidebar]");
const sidebarBtn = document.querySelector("[data-sidebar-btn]");

if (sidebar && sidebarBtn) {
  /**
   * Apply a temporary max-height value to drive CSS transitions.
   *
   * @param {string|null} value - CSS length value or `null` to reset.
   */
  const setSidebarMaxHeight = function (value) {
    if (value === null) {
      sidebar.style.removeProperty("max-height");
      return;
    }

    sidebar.style.setProperty("max-height", value);
  };

  /**
   * Synchronize the aria-expanded attribute with active state.
   *
   * @param {boolean} isExpanded
   */
  const updateAriaExpanded = function (isExpanded) {
    sidebarBtn.setAttribute("aria-expanded", String(Boolean(isExpanded)));
  };

  /**
   * Reset inline height once the expand animation completes.
   *
   * @param {TransitionEvent} event
   */
  const handleExpandTransitionEnd = function (event) {
    if (event.propertyName !== "max-height") { return; }
    setSidebarMaxHeight("none");
    sidebar.removeEventListener("transitionend", handleExpandTransitionEnd);
  };

  updateAriaExpanded(sidebar.classList.contains("active"));

  sidebarBtn.addEventListener("click", function () {
    const isOpening = !sidebar.classList.contains("active");

    if (isOpening) {
      sidebar.classList.add("active");
      updateAriaExpanded(true);
      sidebar.removeEventListener("transitionend", handleExpandTransitionEnd);

      setSidebarMaxHeight(`${sidebar.scrollHeight}px`);
      sidebar.addEventListener("transitionend", handleExpandTransitionEnd);
      return;
    }

    sidebar.removeEventListener("transitionend", handleExpandTransitionEnd);

    const currentHeight = sidebar.scrollHeight;
    setSidebarMaxHeight(`${currentHeight}px`);

    void sidebar.offsetHeight;
    sidebar.classList.remove("active");
    updateAriaExpanded(false);

    const collapseCleanup = function () {
      setSidebarMaxHeight(null);
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(collapseCleanup);
    } else {
      collapseCleanup();
    }
  });
}
/* -------------------------------------------------------------------------- */
/*  Testimonials modal                                                        */
/* -------------------------------------------------------------------------- */
const testimonialsItems = document.querySelectorAll("[data-testimonials-item]");
const modalContainer = document.querySelector("[data-modal-container]");
const modalCloseBtn = document.querySelector("[data-modal-close-btn]");
const overlay = document.querySelector("[data-overlay]");

const modalImg = document.querySelector("[data-modal-img]");
const modalTitle = document.querySelector("[data-modal-title]");
const modalText = document.querySelector("[data-modal-text]");

/**
 * Toggle the testimonial modal and overlay visibility.
 *
 * @param {boolean} shouldOpen
 */
const setTestimonialsModalState = function (shouldOpen) {
  if (!modalContainer || !overlay) { return; }
  modalContainer.classList.toggle("active", Boolean(shouldOpen));
  overlay.classList.toggle("active", Boolean(shouldOpen));
};

/**
 * Populate modal content from the selected testimonial card.
 *
 * @param {Element} item - Testimonial card element.
 */
const openTestimonialsModal = function (item) {
  if (!item) { return; }

  const avatar = item.querySelector("[data-testimonials-avatar]");
  const title = item.querySelector("[data-testimonials-title]");
  const text = item.querySelector("[data-testimonials-text]");

  if (modalImg && avatar) {
    modalImg.src = avatar.src;
    modalImg.alt = avatar.alt;
  }

  if (modalTitle && title) {
    modalTitle.innerHTML = title.innerHTML;
  }

  if (modalText && text) {
    modalText.innerHTML = text.innerHTML;
  }

  setTestimonialsModalState(true);
};

for (let i = 0; i < testimonialsItems.length; i++) {
  const item = testimonialsItems[i];
  const itemAvatar = item.querySelector("[data-testimonials-avatar]");

  if (itemAvatar) {
    itemAvatar.dataset.lightboxDisabled = "true";
  }
  item.setAttribute("tabindex", item.getAttribute("tabindex") || "0");
  item.setAttribute("role", item.getAttribute("role") || "button");

  item.addEventListener("click", function () {
    openTestimonialsModal(item);
  });

  item.addEventListener("keydown", function (event) {
    const key = event.key;
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      openTestimonialsModal(item);
    }
  });
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener("click", function () {
    setTestimonialsModalState(false);
  });
}

if (overlay) {
  overlay.addEventListener("click", function () {
    setTestimonialsModalState(false);
  });
}



/* -------------------------------------------------------------------------- */
/*  Project modal constants                                                   */
/* -------------------------------------------------------------------------- */
const PROJECT_TEMPLATE_PATH = "project_template.html";


/* -------------------------------------------------------------------------- */
/*  Blog cards & redirects                                                    */
/* -------------------------------------------------------------------------- */
const isBlogPage = window.location.pathname.endsWith("blog.html");

const blogItems = document.querySelectorAll("[data-blog-item]");
const BLOG_POST_CLICK_EVENT = "blog_post_click";

/**
 * Send GA4 event when a blog card is clicked.
 *
 * @param {HTMLAnchorElement} link
 * @param {HTMLElement} container
 */
const trackBlogPostClick = function (link, container) {
  if (typeof window.gtag !== "function") { return; }

  const titleElement = container.querySelector("[data-blog-title]");
  const categoryElement = container.querySelector("[data-blog-category]");
  const dateElement = container.querySelector("[data-blog-date]");

  const postTitle = titleElement ? titleElement.textContent.trim() : "";
  const postCategory = categoryElement ? categoryElement.textContent.trim() : "";
  const postDate = dateElement ? dateElement.getAttribute("datetime") || dateElement.textContent.trim() : "";
  const postUrl = link.dataset.blogTarget || link.dataset.externalUrl || link.getAttribute("href") || "";
  const linkTarget = link.getAttribute("target") || "_self";
  const isExternal = linkTarget === "_blank" || Boolean(link.dataset.externalUrl);

  try {
    window.gtag("event", BLOG_POST_CLICK_EVENT, {
      event_category: "blog",
      event_label: postTitle || postUrl,
      post_title: postTitle,
      post_category: postCategory,
      post_date: postDate,
      post_url: postUrl,
      link_target: linkTarget,
      is_external: isExternal,
      transport_type: "beacon",
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  } catch (error) {
    console.warn("Failed to send blog post click event to GA4.", error);
  }
};

blogItems.forEach((item) => {
  const blogLink = item.querySelector("[data-blog-link]");
  const blogImage = item.querySelector("[data-blog-img]");

  if (!blogLink) { return; }

  blogLink.addEventListener("click", function () {
    trackBlogPostClick(blogLink, item);
  });

  if (isBlogPage) {
    const targetUrl = blogLink.dataset.blogTarget || blogLink.getAttribute("href");

    if (!targetUrl) {
      disableInteractiveLink(blogLink);
    } else {
      enableInteractiveLink(blogLink, targetUrl);
    }

    return;
  }

  const blogExternalUrl = blogLink.dataset.externalUrl;

  if (blogExternalUrl) {
    const existingTarget = isBlogPage ? "_self" : blogLink.getAttribute("target") || "_blank";
    const existingRel = isBlogPage
      ? null
      : blogLink.getAttribute("rel") || "noopener noreferrer";
    enableInteractiveLink(blogLink, blogExternalUrl, {
      target: existingTarget,
      rel: existingRel
    });
  } else {
    enableInteractiveLink(blogLink, PROJECT_TEMPLATE_PATH);
    blogLink.addEventListener("click", function (event) {
      event.preventDefault();
      window.location.href = PROJECT_TEMPLATE_PATH;
    });
  }

  if (blogImage) {
    blogImage.setAttribute("data-lightbox-disabled", "true");
    blogImage.classList.remove("media-lightbox__trigger");
    blogImage.removeAttribute("tabindex");
    blogImage.removeAttribute("role");
    blogImage.removeAttribute("aria-haspopup");
    blogImage.removeAttribute("aria-expanded");
  }

});

/* -------------------------------------------------------------------------- */
/*  Learning hub resource redirects                                           */
/* -------------------------------------------------------------------------- */
const learningResourceLinks = document.querySelectorAll(".resource-card");
const LEARNING_RESOURCE_CLICK_EVENT = "learning_hub_resource_click";

/**
 * Send GA4 event when a learning hub resource card is clicked.
 *
 * @param {HTMLAnchorElement} link
 */
const trackLearningResourceClick = function (link) {
  if (typeof window.gtag !== "function") { return; }

  const resourceItem = link.closest("[data-learning-filter-item]") || link.closest(".resource-item");
  const titleElement = resourceItem ? resourceItem.querySelector(".resource-title") : null;
  const categoryElement = resourceItem ? resourceItem.querySelector(".resource-category") : null;

  const resourceTitle = titleElement ? titleElement.textContent.trim() : "";
  const resourceCategory = categoryElement
    ? categoryElement.textContent.trim()
    : resourceItem && resourceItem.dataset.learningCategory
      ? resourceItem.dataset.learningCategory.trim()
      : "";
  const resourceUrl = link.dataset.externalUrl || link.getAttribute("href") || "";
  const linkTarget = link.getAttribute("target") || "_self";
  const isExternal = linkTarget === "_blank" || Boolean(link.dataset.externalUrl);

  try {
    window.gtag("event", LEARNING_RESOURCE_CLICK_EVENT, {
      event_category: "learning_hub",
      event_label: resourceTitle || resourceUrl,
      resource_title: resourceTitle,
      resource_category: resourceCategory,
      resource_url: resourceUrl,
      link_target: linkTarget,
      is_external: isExternal,
      transport_type: "beacon",
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  } catch (error) {
    console.warn("Failed to send learning resource click event to GA4.", error);
  }
};

learningResourceLinks.forEach((link) => {
  const isBlogCard = Boolean(link.closest("[data-blog-item]"));
  const blogTarget = link.dataset.blogTarget || link.getAttribute("href");

  link.addEventListener("click", function () {
    trackLearningResourceClick(link);
  });

  if (isBlogPage && isBlogCard) {
    if (!blogTarget) {
      disableInteractiveLink(link);
      return;
    }

    enableInteractiveLink(link, blogTarget);
    return;
  }

  const externalUrl = link.dataset.externalUrl;

  if (externalUrl) {
    const externalTarget = link.getAttribute("target") || "_blank";
    const externalRel = link.getAttribute("rel") || "noopener noreferrer";
    enableInteractiveLink(link, externalUrl, {
      target: externalTarget,
      rel: externalRel
    });
    return;
  }

  enableInteractiveLink(link, PROJECT_TEMPLATE_PATH);
  link.addEventListener("click", function (event) {
    event.preventDefault();
    window.location.href = PROJECT_TEMPLATE_PATH;
  });
});

/* -------------------------------------------------------------------------- */
/*  Media lightbox (images zoom + pan)                                        */
/* -------------------------------------------------------------------------- */
const mediaLightbox = (function ensureMediaLightbox() {
  let lightbox = document.querySelector("#mediaLightbox");

  if (!lightbox) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div class="media-lightbox" id="mediaLightbox" aria-hidden="true">
        <div class="media-lightbox__backdrop" data-lightbox-close></div>
        <div
          class="media-lightbox__dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged media preview"
          tabindex="-1"
        >
          <button class="media-lightbox__close" type="button" data-lightbox-close aria-label="Close preview">
            &times;
          </button>
          <div class="media-lightbox__controls" aria-hidden="false">
            <button class="media-lightbox__zoom" type="button" data-zoom="out" aria-label="Zoom out">
              &minus;
            </button>
            <span class="media-lightbox__zoom-level" aria-live="polite">100%</span>
            <button class="media-lightbox__zoom" type="button" data-zoom="in" aria-label="Zoom in">
              +
            </button>
          </div>
          <div class="media-lightbox__content">
            <img src="" alt="">
          </div>
        </div>
      </div>
    `.trim();

    lightbox = wrapper.firstElementChild;
    document.body.appendChild(lightbox);
  }

  return lightbox;
})();
const mediaLightboxImage = mediaLightbox ? mediaLightbox.querySelector(".media-lightbox__content img") : null;

if (mediaLightbox && mediaLightboxImage) {
  const mediaLightboxDialog = mediaLightbox.querySelector(".media-lightbox__dialog");
  const mediaLightboxContent = mediaLightbox.querySelector(".media-lightbox__content");
  const zoomButtons = mediaLightbox.querySelectorAll("[data-zoom]");
  const zoomLevelDisplay = mediaLightbox.querySelector(".media-lightbox__zoom-level");
  const closeTriggers = mediaLightbox.querySelectorAll("[data-lightbox-close]");

  /**
   * Clamp a numeric value between two bounds.
   *
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  const clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
  };

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const SCALE_STEP = 0.25;
  const SCALE_PRECISION = 100;
  const ZOOMED_CLASS = "media-lightbox--zoomed";

  let currentScale = MIN_SCALE;
  let activeTrigger = null;
  let lastFocusedElement = null;
  let isDragging = false;
  let lastPointerPosition = { x: 0, y: 0 };
  let translate = { x: 0, y: 0 };

  /**
   * Apply translation and scale transforms to the lightbox image.
   */
  const applyTransform = function () {
    clampTranslate();
    mediaLightboxImage.style.transform = `translate(${translate.x}px, ${translate.y}px) scale(${currentScale})`;
  };

  /**
   * Prevent the image from being dragged outside the viewport.
   */
  const clampTranslate = function () {
    if (!mediaLightboxImage) { return; }
    if (currentScale <= MIN_SCALE) {
      translate = { x: 0, y: 0 };
      return;
    }

    const baseWidth = mediaLightboxImage.offsetWidth || 0;
    const baseHeight = mediaLightboxImage.offsetHeight || 0;

    if (!baseWidth || !baseHeight) { return; }

    const maxX = (baseWidth * (currentScale - 1)) / 2;
    const maxY = (baseHeight * (currentScale - 1)) / 2;

    translate.x = clamp(translate.x, -maxX, maxX);
    translate.y = clamp(translate.y, -maxY, maxY);
  };

  /**
   * Update zoom indicator text and controls.
   */
  const updateZoomUi = function () {
    if (zoomLevelDisplay) {
      const percentage = Math.round(currentScale * 100);
      zoomLevelDisplay.textContent = `${percentage}%`;
    }

    mediaLightbox.classList.toggle(ZOOMED_CLASS, currentScale > MIN_SCALE + 0.01);

    zoomButtons.forEach((button) => {
      const direction = button.dataset.zoom;
      if (direction === "in") {
        button.disabled = currentScale >= MAX_SCALE - 0.001;
      } else if (direction === "out") {
        button.disabled = currentScale <= MIN_SCALE + 0.001;
      }
    });
  };

  /**
   * Apply an exact zoom level while keeping translations in bounds.
   *
   * @param {number} scale
   */
  const setScale = function (scale) {
    const nextScale = Math.round(clamp(scale, MIN_SCALE, MAX_SCALE) * SCALE_PRECISION) / SCALE_PRECISION;
    currentScale = nextScale;
    if (currentScale <= MIN_SCALE) {
      translate = { x: 0, y: 0 };
    }
    applyTransform();
    updateZoomUi();
  };

  /**
   * Increment or decrement the zoom level.
   *
   * @param {number} direction
   */
  const applyZoomChange = function (direction) {
    setScale(currentScale + direction * SCALE_STEP);
  };

  /**
   * Reset zoom and translation to their default state.
   */
  const resetZoom = function () {
    setScale(MIN_SCALE);
    translate = { x: 0, y: 0 };
    applyTransform();
  };

  /**
   * Start panning mode when the user drags on the zoomed image.
   *
   * @param {{x: number, y: number}} point
   */
  const startPan = function (point) {
    if (!mediaLightboxContent || currentScale <= MIN_SCALE + 0.01) { return; }

    isDragging = true;
    lastPointerPosition = { x: point.x, y: point.y };
    mediaLightboxContent.classList.add("is-panning");
  };

  /**
   * Continue panning the image while the pointer moves.
   *
   * @param {{x: number, y: number}} point
   */
  const movePan = function (point) {
    if (!isDragging || !mediaLightboxContent) { return; }

    const deltaX = point.x - lastPointerPosition.x;
    const deltaY = point.y - lastPointerPosition.y;

    translate.x += deltaX;
    translate.y += deltaY;
    applyTransform();

    lastPointerPosition = { x: point.x, y: point.y };
  };

  /**
   * Terminate panning and reset cursor styles.
   */
  const endPan = function () {
    if (!isDragging) { return; }

    isDragging = false;
    if (mediaLightboxContent) {
      mediaLightboxContent.classList.remove("is-panning");
    }
  };

  /**
   * Close the lightbox and restore focus to the triggering element.
   */
  function closeLightbox() {
    mediaLightbox.classList.remove("active", ZOOMED_CLASS);
    mediaLightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("media-lightbox-open");

    mediaLightboxImage.style.transform = "scale(1)";
    mediaLightboxImage.removeAttribute("src");
    mediaLightboxImage.removeAttribute("srcset");
    mediaLightboxImage.removeAttribute("sizes");
    mediaLightboxImage.alt = "";

    resetZoom();

    endPan();

    if (activeTrigger) {
      activeTrigger.setAttribute("aria-expanded", "false");
    }

    const focusTarget = activeTrigger || lastFocusedElement;
    if (focusTarget && typeof focusTarget.focus === "function") {
      focusTarget.focus({ preventScroll: true });
    }

    activeTrigger = null;
    lastFocusedElement = null;

    document.removeEventListener("keydown", handleKeydown, true);
  }

  /**
   * Allow keyboard shortcuts for zooming and closing the lightbox.
   *
   * @param {KeyboardEvent} event
   */
  function handleKeydown(event) {
    if (!mediaLightbox.classList.contains("active")) { return; }

    const key = event.key;

    if (key === "Escape") {
      event.preventDefault();
      closeLightbox();
      return;
    }

    if (key === "+" || (key === "=" && event.shiftKey)) {
      event.preventDefault();
      applyZoomChange(1);
    } else if (key === "-" || key === "_") {
      event.preventDefault();
      applyZoomChange(-1);
    }
  }

  /**
   * Render the lightbox with content from the trigger image.
   *
   * @param {HTMLElement} trigger
   */
  const openLightbox = function (trigger) {
    if (!trigger) { return; }

    if (activeTrigger && activeTrigger !== trigger) {
      activeTrigger.setAttribute("aria-expanded", "false");
    }

    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    activeTrigger = trigger;

    activeTrigger.setAttribute("aria-expanded", "true");

    const source = trigger.currentSrc || trigger.src;
    const srcset = trigger.getAttribute("srcset");
    mediaLightboxImage.src = source;
    mediaLightboxImage.srcset = srcset || "";
    mediaLightboxImage.sizes = trigger.getAttribute("sizes") || "";
    mediaLightboxImage.alt = trigger.alt || "";

    resetZoom();

    mediaLightbox.classList.add("active");
    mediaLightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("media-lightbox-open");

    document.addEventListener("keydown", handleKeydown, true);

    requestAnimationFrame(() => {
      if (mediaLightboxDialog) {
        mediaLightboxDialog.focus({ preventScroll: true });
      }
    });
  };

  /**
   * Determine if an image should be enhanced with lightbox behaviour.
   *
   * @param {HTMLImageElement} img
   * @returns {boolean}
   */
  const isEligibleForLightbox = function (img) {
    if (!(img instanceof HTMLImageElement)) { return false; }
    if (img.dataset.lightboxDisabled === "true") { return false; }
    if ("testimonialsAvatar" in img.dataset) { return false; }
    if (img.dataset.modalImg !== undefined) { return false; }
    if (img.closest("[data-testimonials-item]")) { return false; }
    if (img.closest(".contact-item")) { return false; }
    if (img.closest(".service-item")) { return false; }
    if (img.closest(".clients-item")) { return false; }
    if (img.closest(".media-placeholder--video")) { return false; }
    if (img.closest("[data-lightbox-ignore]") && img.dataset.lightboxOptIn !== "true") { return false; }
    if (img.closest("#mediaLightbox")) { return false; }

    return true;
  };

  /**
   * Bind lightbox events to a single image.
   *
   * @param {HTMLImageElement} img
   */
  const attachLightboxToImage = function (img) {
    if (!isEligibleForLightbox(img)) { return; }
    if (img.dataset.lightboxBound === "true") { return; }

    img.dataset.lightboxBound = "true";
    img.dataset.lightboxTrigger = "true";
    img.classList.add("media-lightbox__trigger");
    img.setAttribute("tabindex", img.getAttribute("tabindex") || "0");
    img.setAttribute("role", img.getAttribute("role") || "button");
    img.setAttribute("aria-haspopup", "dialog");
    img.setAttribute("aria-expanded", "false");

    img.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      openLightbox(img);
    });

    img.addEventListener("keydown", function (event) {
      const key = event.key;
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        openLightbox(img);
      }
    });
  };

  /**
   * Attach lightbox behaviour to all images within a root node.
   *
   * @param {Element|DocumentFragment|Document} [root=document]
   */
  const attachLightboxToImages = function (root = document) {
    const images = root instanceof Element || root instanceof DocumentFragment
      ? root.querySelectorAll("img")
      : document.querySelectorAll("img");

    images.forEach(attachLightboxToImage);
  };

  zoomButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const direction = this.dataset.zoom === "in" ? 1 : -1;
      applyZoomChange(direction);
    });
  });

  closeTriggers.forEach((trigger) => {
    trigger.addEventListener("click", closeLightbox);
  });

  mediaLightbox.addEventListener("click", function (event) {
    const target = event.target;
    if (target instanceof HTMLElement && target.dataset.lightboxClose !== undefined) {
      closeLightbox();
    }
  });

  mediaLightboxImage.addEventListener("mousedown", function (event) {
    if (currentScale <= MIN_SCALE + 0.01) { return; }
    event.preventDefault();
    startPan({ x: event.clientX, y: event.clientY });
  });

  window.addEventListener("mousemove", function (event) {
    if (!isDragging) { return; }
    event.preventDefault();
    movePan({ x: event.clientX, y: event.clientY });
  });

  window.addEventListener("mouseup", function () {
    if (!isDragging) { return; }
    endPan();
  });

  mediaLightboxImage.addEventListener("touchstart", function (event) {
    if (currentScale <= MIN_SCALE + 0.01) { return; }
    if (event.touches.length !== 1) { return; }
    const touch = event.touches[0];
    event.preventDefault();
    startPan({ x: touch.clientX, y: touch.clientY });
  }, { passive: false });

  window.addEventListener("touchmove", function (event) {
    if (!isDragging || event.touches.length !== 1) { return; }
    const touch = event.touches[0];
    event.preventDefault();
    movePan({ x: touch.clientX, y: touch.clientY });
  }, { passive: false });

  window.addEventListener("touchend", function () {
    if (!isDragging) { return; }
    endPan();
  });

  window.addEventListener("touchcancel", function () {
    if (!isDragging) { return; }
    endPan();
  });

  attachLightboxToImages();

  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLImageElement) {
          attachLightboxToImage(node);
        } else if (node instanceof HTMLElement) {
          attachLightboxToImages(node);
        }
      });
    });
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  setScale(MIN_SCALE);
}


/* -------------------------------------------------------------------------- */
/*  Portfolio gallery filters (buttons + custom select)                        */
/* -------------------------------------------------------------------------- */
const select = document.querySelector("[data-select]");
const selectItems = document.querySelectorAll("[data-select-item]");
const selectValue = document.querySelector("[data-select-value]");
const filterButtons = document.querySelectorAll("[data-filter-btn]");
const filterItems = document.querySelectorAll("[data-filter-item]");
const projectItems = document.querySelectorAll("[data-project-item]");

if (select) {
  select.addEventListener("click", function () {
    elementToggleFunc(this);
  });
}

selectItems.forEach((item) => {
  item.addEventListener("click", function () {
    const selectedValue = this.innerText.trim().toLowerCase();

    if (selectValue) {
      selectValue.innerText = this.innerText;
    }

    if (select) {
      elementToggleFunc(select);
    }

    filterFunc(selectedValue);
  });
});

/**
 * Normalize text used for filter comparisons.
 *
 * @param {string} value
 * @returns {string}
 */
const normalizeFilterValue = function (value) {
  return (value || "").trim().toLowerCase();
};

/**
 * Toggle portfolio cards to match the requested category.
 *
 * @param {string} selectedValue
 * @returns {boolean} true when at least one card is active.
 */
const filterFunc = function (selectedValue) {
  const normalizedValue = normalizeFilterValue(selectedValue) || "all";
  let hasActiveItem = false;

  filterItems.forEach((item) => {
    const itemCategory = normalizeFilterValue(item.dataset.category);
    const isMatch = normalizedValue === "all" || normalizedValue === itemCategory;

    item.classList.toggle("active", isMatch);
    hasActiveItem = hasActiveItem || isMatch;
  });

  return hasActiveItem;
};

let lastClickedButton = filterButtons[0] || null;

filterButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const selectedValue = normalizeFilterValue(this.innerText);

    if (selectValue) {
      selectValue.innerText = this.innerText;
    }

    filterFunc(selectedValue);

    if (lastClickedButton && lastClickedButton !== this) {
      lastClickedButton.classList.remove("active");
    }

    this.classList.add("active");
    lastClickedButton = this;
  });
});

/* -------------------------------------------------------------------------- */
/*  Portfolio project click analytics (GA4)                                   */
/* -------------------------------------------------------------------------- */
const PORTFOLIO_CLICK_EVENT = "portfolio_project_click";

/**
 * Send GA4 event when a portfolio project card is clicked.
 *
 * @param {HTMLAnchorElement} link
 * @param {HTMLElement} container
 */
const trackPortfolioProjectClick = function (link, container) {
  if (typeof window.gtag !== "function") { return; }

  const titleElement = container.querySelector("[data-project-title]");
  const categoryElement = container.querySelector("[data-project-category]");

  const projectTitle = titleElement ? titleElement.textContent.trim() : "";
  const projectCategory = categoryElement ? categoryElement.textContent.trim() : "";
  const projectUrl = link.dataset.externalUrl || link.getAttribute("href") || "";
  const linkTarget = link.getAttribute("target") || "_self";
  const isExternal = linkTarget === "_blank" || Boolean(link.dataset.externalUrl);

  try {
    window.gtag("event", PORTFOLIO_CLICK_EVENT, {
      event_category: "portfolio",
      event_label: projectTitle || projectUrl,
      project_title: projectTitle,
      project_category: projectCategory,
      project_url: projectUrl,
      link_target: linkTarget,
      is_external: isExternal,
      transport_type: "beacon",
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  } catch (error) {
    console.warn("Failed to send portfolio project click event to GA4.", error);
  }
};

if (projectItems.length > 0) {
  projectItems.forEach((item) => {
    const link = item.querySelector(".project-item-link");
    if (!(link instanceof HTMLAnchorElement)) { return; }

    link.addEventListener("click", function () {
      trackPortfolioProjectClick(link, item);
    });
  });
}


/* -------------------------------------------------------------------------- */
/*  Learning hub filters                                                      */
/* -------------------------------------------------------------------------- */
const learningSelect = document.querySelector("[data-learning-select]");
const learningSelectValue = document.querySelector("[data-learning-select-value]");
const learningFilterBtns = document.querySelectorAll("[data-learning-filter-btn]");
const learningFilterItems = document.querySelectorAll("[data-learning-filter-item]");

if (learningSelect) {
  learningSelect.addEventListener("click", function () { elementToggleFunc(this); });
}

/**
 * Toggle learning hub cards by data-learning-category.
 *
 * @param {string} selectedValue
 */
const learningFilterFunc = function (selectedValue) {
  const normalizedValue = (selectedValue || "all").trim().toLowerCase();

  learningFilterItems.forEach((item) => {
    const itemCategory = (item.dataset.learningCategory || "").trim().toLowerCase();

    if (normalizedValue === "all" || normalizedValue === itemCategory) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
};

if (learningFilterBtns.length > 0) {
  learningFilterBtns.forEach((button) => {
    button.addEventListener("click", function () {
      const selectedValue = this.innerText.trim().toLowerCase();

      learningFilterBtns.forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");

      if (learningSelectValue) {
        learningSelectValue.innerText = this.innerText.trim();
      }

      learningFilterFunc(selectedValue);

      if (learningSelect) {
        learningSelect.classList.remove("active");
      }
    });
  });

  learningFilterFunc("all");
}


/**
 * Programmatically trigger a portfolio filter button based on category name.
 *
 * @param {string} categoryName
 */
const activatePortfolioFilter = function (categoryName) {
  if (!categoryName) { return; }

  const normalizedCategory = normalizeFilterValue(categoryName);

  for (let i = 0; i < filterButtons.length; i++) {
    const button = filterButtons[i];
    if (normalizeFilterValue(button.innerText) === normalizedCategory) {
      button.click();
      return;
    }
  }

  const hasResults = filterFunc(normalizedCategory);

  if (!hasResults) {
    return;
  }

  if (selectValue) {
    const words = normalizedCategory.split(" ");
    for (let i = 0; i < words.length; i++) {
      words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
    }
    selectValue.innerText = words.join(" ");
  }

  if (select) {
    select.classList.remove("active");
  }
};

const PORTFOLIO_FILTER_PARAM = "category";
const PORTFOLIO_FILTER_STORAGE_KEY = "pending-portfolio-filter";

/**
 * Retrieve a stored portfolio filter from sessionStorage, clearing it afterward.
 *
 * @returns {string|null}
 */
const getStoredPortfolioFilter = function () {
  try {
    const value = sessionStorage.getItem(PORTFOLIO_FILTER_STORAGE_KEY);
    if (!value) { return null; }
    sessionStorage.removeItem(PORTFOLIO_FILTER_STORAGE_KEY);
    return value;
  } catch (error) {
    console.warn("Unable to access sessionStorage for portfolio filter.", error);
    return null;
  }
};

/**
 * Persist a pending portfolio filter in sessionStorage for cross-page navigation.
 *
 * @param {string} filterName
 */
const setStoredPortfolioFilter = function (filterName) {
  try {
    sessionStorage.setItem(PORTFOLIO_FILTER_STORAGE_KEY, normalizeFilterValue(filterName));
  } catch (error) {
    console.warn("Unable to store portfolio filter in sessionStorage.", error);
  }
};

/**
 * Apply portfolio filters from query parameters or stored session data.
 */
const applyPortfolioFilterFromQuery = function () {
  if (filterButtons.length === 0) { return; }

  let filterFromQuery = null;

  if (typeof URLSearchParams !== "undefined") {
    const searchParams = new URLSearchParams(window.location.search);
    filterFromQuery = searchParams.get(PORTFOLIO_FILTER_PARAM);
  }

  const normalizedQueryFilter = normalizeFilterValue(filterFromQuery);
  if (normalizedQueryFilter) {
    activatePortfolioFilter(normalizedQueryFilter);
    return;
  }

  const storedFilter = getStoredPortfolioFilter();
  if (storedFilter) {
    activatePortfolioFilter(storedFilter);
  }
};

applyPortfolioFilterFromQuery();

window.addEventListener("DOMContentLoaded", applyPortfolioFilterFromQuery);
window.addEventListener("load", applyPortfolioFilterFromQuery);
window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    applyPortfolioFilterFromQuery();
  }
});

/* -------------------------------------------------------------------------- */
/*  Contact form (Formspree helper + validation)                              */
/* -------------------------------------------------------------------------- */
const form = document.querySelector("[data-form]");
const formInputs = document.querySelectorAll("[data-form-input]");
const formBtn = document.querySelector("[data-form-btn]");
const formAlert = document.querySelector("[data-form-alert]");
const formAlertTitle = document.querySelector("[data-form-alert-title]");
const formAlertMessage = document.querySelector("[data-form-alert-message]");
const formAlertCloseBtn = document.querySelector("[data-form-alert-close]");
const CONTACT_FORM_SUBMIT_EVENT = "contact_form_submit";

/**
 * Send GA4 event when the contact form is submitted.
 *
 * @param {HTMLFormElement} formElement
 * @param {FormData} formData
 */
const trackContactFormSubmit = function (formElement, formData) {
  if (typeof window.gtag !== "function") { return; }
  if (!(formElement instanceof HTMLFormElement)) { return; }

  const hasName = Boolean((formData.get("fullname") || "").trim());
  const hasEmail = Boolean((formData.get("email") || "").trim());
  const hasMessage = Boolean((formData.get("message") || "").trim());
  const action = formElement.getAttribute("action") || "";

  try {
    window.gtag("event", CONTACT_FORM_SUBMIT_EVENT, {
      event_category: "contact",
      event_label: "Contact form submission",
      form_action: action,
      has_name: hasName,
      has_email: hasEmail,
      has_message: hasMessage,
      transport_type: "beacon",
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  } catch (error) {
    console.warn("Failed to send contact form submit event to GA4.", error);
  }
};

/**
 * Enable or disable the form submit button.
 *
 * @param {boolean} isEnabled
 */
const toggleFormButton = function (isEnabled) {
  if (!formBtn) { return; }
  if (isEnabled) {
    formBtn.removeAttribute("disabled");
  } else {
    formBtn.setAttribute("disabled", "");
  }
};

/**
 * Display a feedback message above the contact form.
 *
 * @param {string} title
 * @param {string} message
 * @param {boolean} [isError=false]
 */
const showFormAlert = function (title, message, isError = false) {
  if (!formAlert || !formAlertTitle || !formAlertMessage) { return; }
  formAlertTitle.textContent = title;
  formAlertMessage.textContent = message;
  formAlert.classList.toggle("form-alert-error", isError);
  formAlert.removeAttribute("hidden");
};

/**
 * Hide the feedback message.
 */
const hideFormAlert = function () {
  if (!formAlert) { return; }
  formAlert.setAttribute("hidden", "");
  formAlert.classList.remove("form-alert-error");
};

if (formAlertCloseBtn) {
  formAlertCloseBtn.addEventListener("click", hideFormAlert);
}

/**
 * Evaluate form validity after each field change to control the submit button.
 */
formInputs.forEach((input) => {
  input.addEventListener("input", function () {
    if (!form) { return; }
    toggleFormButton(form.checkValidity());
  });
});

if (form) {
  /**
   * Handle async submission via Formspree with graceful feedback states.
   */
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.checkValidity()) { return; }

    toggleFormButton(false);
    hideFormAlert();

    const formData = new FormData(form);

    trackContactFormSubmit(form, formData);

    try {
      const response = await fetch(form.action, {
        method: form.method || "POST",
        headers: { Accept: "application/json" },
        body: formData
      });

      if (response.ok) {
        form.reset();
        toggleFormButton(false);
        showFormAlert("Thank you!", "Your response has been submitted.");
      } else {
        const data = await response.json().catch(() => null);
        const errorMessage = data && data.error ? data.error : "Something went wrong. Please try again later.";
        toggleFormButton(true);
        showFormAlert("Oops!", errorMessage, true);
      }
    } catch (error) {
      toggleFormButton(true);
      showFormAlert("Oops!", "We couldn't send your message. Please try again later.", true);
    }
  });
}
/* -------------------------------------------------------------------------- */
/*  Media gallery layout toggles                                              */
/* -------------------------------------------------------------------------- */
const mediaLayoutButtons = document.querySelectorAll("[data-media-layout]");
const mediaGallery = document.querySelector("[data-media-gallery]");

if (mediaLayoutButtons.length > 0 && mediaGallery) {
  mediaLayoutButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetLayout = this.dataset.mediaLayout;
      if (!targetLayout) { return; }

      mediaGallery.classList.remove("masonry", "two-column");
      mediaGallery.classList.add(targetLayout);

      mediaLayoutButtons.forEach((btn) => {
        btn.classList.toggle("is-active", btn === button);
      });
    });
  });
}
/* -------------------------------------------------------------------------- */
/*  Global page navigation + state persistence                                */
/* -------------------------------------------------------------------------- */
const navigationLinks = document.querySelectorAll("[data-nav-link]");
const pages = document.querySelectorAll("[data-page]");

const ACTIVE_PAGE_KEY = "active-page";
const SCROLL_POSITION_KEY = "page-scroll-position";
const SKIP_SCROLL_RESTORE_KEY = "skip-scroll-restore";

/**
 * Normalize nav target strings for consistent comparisons.
 *
 * @param {string} value
 * @returns {string}
 */
const normalizePageName = function (value) {
  return (typeof value === "string" ? value : "")
    .trim()
    .toLowerCase();
};

/**
 * Determine the target page name from a navigation link element.
 *
 * @param {HTMLElement} link
 * @returns {string}
 */
const getNavTarget = function (link) {
  if (!(link instanceof HTMLElement)) { return ""; }
  const explicitTarget = normalizePageName(link.dataset.navTarget);
  if (explicitTarget) { return explicitTarget; }
  return normalizePageName(link.textContent);
};

/**
 * Safe sessionStorage wrapper to avoid runtime errors in private browsing.
 */
const sessionStorageController = (function createSessionStorageController() {
  try {
    const testKey = "__page_state__";
    sessionStorage.setItem(testKey, testKey);
    sessionStorage.removeItem(testKey);

    return {
      get(key) {
        try {
          return sessionStorage.getItem(key);
        } catch (error) {
          console.warn("Unable to read from sessionStorage.", error);
          return null;
        }
      },
      set(key, value) {
        try {
          sessionStorage.setItem(key, value);
        } catch (error) {
          console.warn("Unable to write to sessionStorage.", error);
        }
      },
      remove(key) {
        try {
          sessionStorage.removeItem(key);
        } catch (error) {
          console.warn("Unable to remove from sessionStorage.", error);
        }
      }
    };
  } catch (error) {
    console.warn("Session storage is not available. Page state will not persist.", error);
    return {
      get() { return null; },
      set() {},
      remove() {}
    };
  }
})();

/**
 * Activate a page article and matching nav link.
 *
 * @param {string} pageName
 * @param {{scrollToTop?: boolean}} [options]
 */
const activatePage = function (pageName, options = {}) {
  const { scrollToTop = true } = options;
  const normalizedPageName = normalizePageName(pageName);
  if (!normalizedPageName) { return; }

  for (let i = 0; i < pages.length; i++) {
    const pageIdentifier = normalizePageName(pages[i].dataset.page);
    const shouldActivate = pageIdentifier === normalizedPageName;
    pages[i].classList.toggle("active", shouldActivate);
  }

 /**
  * Attach click handlers to switch between single-page panels.
  */
 for (let i = 0; i < navigationLinks.length; i++) {
    const navTarget = getNavTarget(navigationLinks[i]);
    const shouldActivate = navTarget === normalizedPageName;
    navigationLinks[i].classList.toggle("active", shouldActivate);
  }

  sessionStorageController.set(ACTIVE_PAGE_KEY, normalizedPageName);

  if (scrollToTop) {
    window.scrollTo(0, 0);
  }
}

for (let i = 0; i < navigationLinks.length; i++) {
  const currentLink = navigationLinks[i];
  const targetPage = getNavTarget(currentLink);

  if (!targetPage) { continue; }

  currentLink.addEventListener("click", function () {
    activatePage(targetPage);
    if (targetPage === "resume" && typeof window.gtag === "function") {
      try {
        window.gtag("event", "resume_nav_click", {
          event_category: "navigation",
          event_label: "Resume navbar link",
          transport_type: "beacon",
          page_location: window.location.href,
          page_path: window.location.pathname
        });
      } catch (error) {
        console.warn("Failed to send Resume nav click event to GA4.", error);
      }
    }
  });
}


/**
 * Restore scroll position saved before navigation.
 */
const restoreScrollPosition = function () {
  const skipRestore = sessionStorageController.get(SKIP_SCROLL_RESTORE_KEY) === "true";
  if (skipRestore) {
    sessionStorageController.remove(SKIP_SCROLL_RESTORE_KEY);
    sessionStorageController.remove(SCROLL_POSITION_KEY);
    return;
  }

  const storedValue = sessionStorageController.get(SCROLL_POSITION_KEY);
  if (!storedValue) { return; }

  const y = parseInt(storedValue, 10);
  if (Number.isNaN(y)) { return; }

  window.scrollTo({ top: y, left: 0, behavior: "auto" });
};

window.addEventListener("beforeunload", function () {
  const skipRestore = sessionStorageController.get(SKIP_SCROLL_RESTORE_KEY) === "true";
  if (skipRestore) {
    sessionStorageController.remove(SCROLL_POSITION_KEY);
    return;
  }

  sessionStorageController.set(SCROLL_POSITION_KEY, String(window.scrollY || window.pageYOffset));
});

/**
 * Restore the previously active page from session storage.
 */
const restoreActivePage = function () {
  const storedPage = sessionStorageController.get(ACTIVE_PAGE_KEY);
  const normalizedStoredPage = normalizePageName(storedPage);

  if (normalizedStoredPage) {
    activatePage(normalizedStoredPage, { scrollToTop: false });
  }
};

window.addEventListener("load", function () {
  restoreActivePage();
  restoreScrollPosition();
});

window.addEventListener("pageshow", function (event) {
  if (event.persisted) {
    const skipRestore = sessionStorageController.get(SKIP_SCROLL_RESTORE_KEY) === "true";
    if (skipRestore) {
      sessionStorageController.remove(SKIP_SCROLL_RESTORE_KEY);
      sessionStorageController.remove(SCROLL_POSITION_KEY);
      return;
    }

    restoreActivePage();
    restoreScrollPosition();
  }
});

/* -------------------------------------------------------------------------- */
/*  Single-page templates (scroll synced sidebar nav)                         */
/* -------------------------------------------------------------------------- */
const singlePageNavbar = document.querySelector(".single-page-navbar");
const singlePageSidebar = document.querySelector(".single-page-sidebar");

if (singlePageNavbar && singlePageSidebar) {
  /**
   * Allow mouse wheel scrolling inside the sidebar when content overflows.
   *
   * @param {WheelEvent} event
   */
  const handleNavbarScroll = function (event) {
    const delta = event.deltaY || event.deltaX;

    if (!delta) { return; }
    if (singlePageSidebar.scrollHeight <= singlePageSidebar.clientHeight) { return; }

    event.preventDefault();
    singlePageSidebar.scrollTop += delta;
  };

  singlePageNavbar.addEventListener("wheel", handleNavbarScroll, { passive: false });
}

const sectionNavLinks = document.querySelectorAll("[data-section-link]");

if (sectionNavLinks.length > 0) {
  const sectionEntries = [];
  let activeLink = null;
  let pendingTargetEntry = null;
  let scrollRafId = null;
  let resizeRafId = null;

  /**
   * Calculate computed scroll-margin-top value for smooth scroll offset.
   *
   * @param {Element} element
   * @returns {number}
   */
  const getScrollMarginTop = function (element) {
    if (!element || typeof window === "undefined") { return 0; }
    const computed = window.getComputedStyle(element);
    const value = computed ? parseFloat(computed.scrollMarginTop || "0") : 0;
    return Number.isFinite(value) ? value : 0;
  };

  /**
   * Update the highlight state for the section navigation.
   *
   * @param {HTMLElement|null} nextLink
   */
  const setActiveSectionLink = function (nextLink) {
    if (!nextLink || nextLink === activeLink) { return; }
    activeLink = nextLink;
    sectionNavLinks.forEach((link) => {
      link.classList.toggle("active", link === nextLink);
    });
  };

  /**
   * Refresh the cached offset positions for each section target.
   */
  const computeSectionOffsets = function () {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    sectionEntries.forEach((entry) => {
      const rect = entry.target.getBoundingClientRect();
      entry.offset = rect.top + scrollY - entry.marginTop;
    });
    sectionEntries.sort((a, b) => a.offset - b.offset);
  };

  /**
   * Sync the active link based on current scroll position.
   */
  const syncActiveLink = function () {
    if (sectionEntries.length === 0) { return; }

    if (pendingTargetEntry) {
      const currentScroll = window.scrollY || window.pageYOffset || 0;
      const distance = Math.abs(currentScroll - pendingTargetEntry.offset);
      if (distance > 4) {
        return;
      }
      pendingTargetEntry = null;
    }

    const scrollPosition = (window.scrollY || window.pageYOffset || 0) + 12;
    let currentEntry = sectionEntries[0];

    for (let i = 0; i < sectionEntries.length; i++) {
      const entry = sectionEntries[i];
      if (scrollPosition >= entry.offset - 4) {
        currentEntry = entry;
      } else {
        break;
      }
    }

    if (currentEntry && currentEntry.link) {
      setActiveSectionLink(currentEntry.link);
    }
  };

  /**
   * Request animation frame to update active section highlight.
   */
  const requestSync = function () {
    if (scrollRafId !== null) { return; }
    scrollRafId = window.requestAnimationFrame(function () {
      scrollRafId = null;
      syncActiveLink();
    });
  };

  /**
   * Request animation frame to recalculate section offsets.
   */
  const requestRecompute = function () {
    if (resizeRafId !== null) { return; }
    resizeRafId = window.requestAnimationFrame(function () {
      resizeRafId = null;
      computeSectionOffsets();
      syncActiveLink();
    });
  };

  sectionNavLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (!href || !href.startsWith("#")) { return; }

    const target = document.querySelector(href);
    if (!target) { return; }

    const marginTop = getScrollMarginTop(target);
    const entry = { target, link, marginTop, offset: 0 };
    sectionEntries.push(entry);

    link.addEventListener("click", function (event) {
      event.preventDefault();

      setActiveSectionLink(link);
      pendingTargetEntry = entry;

      if (href === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      if (typeof history !== "undefined" && typeof history.replaceState === "function") {
        history.replaceState(null, "", href);
      }

      window.requestAnimationFrame(() => {
        computeSectionOffsets();
        requestSync();
      });
    });
  });

  if (sectionEntries.length > 0) {
    const initialHash = window.location.hash;
    computeSectionOffsets();

    if (initialHash) {
      const initialTarget = document.querySelector(initialHash);
      const initialEntry = sectionEntries.find((entry) => entry.target === initialTarget);
      if (initialEntry) {
        setActiveSectionLink(initialEntry.link);
      } else if (sectionEntries[0]) {
        setActiveSectionLink(sectionEntries[0].link);
      }
    } else if (sectionEntries[0]) {
      setActiveSectionLink(sectionEntries[0].link);
    }

    syncActiveLink();

    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestRecompute);
    window.addEventListener("orientationchange", requestRecompute);
    window.addEventListener("load", requestRecompute);
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) {
        requestRecompute();
      }
    });
  }
}
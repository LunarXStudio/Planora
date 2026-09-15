/* =========================================================
   PLANORA — script.js
   Vanilla JS only. No dependencies.
   Shared across index.html, checkout.html, privacy-policy.html,
   terms.html and refund-policy.html — every block below checks
   that its elements exist before running, so this one file is
   safe to include on every page.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* =========================================================
     0. STORAGE HELPERS
     Cart + favorites are persisted in localStorage so they
     survive refreshes and carry across pages (e.g. into
     checkout.html).
     ========================================================= */
  var STORAGE_CART = 'planora_cart';
  var STORAGE_FAVORITES = 'planora_favorites';

  function readStorage(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }
  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      /* localStorage unavailable (e.g. private mode) — fail silently */
    }
  }

  var cart = readStorage(STORAGE_CART, []);            // [{id, name, price, qty}]
  var favorites = readStorage(STORAGE_FAVORITES, []);  // [id, id, ...]

  function formatRupees(amount) {
    return '\u20B9' + Math.round(amount).toLocaleString('en-IN');
  }

  /* =========================================================
     1. HEADER SHADOW ON SCROLL (existing behaviour)
     ========================================================= */
  var header = document.getElementById('siteHeader');
  if (header) {
    function updateHeaderShadow() {
      if (window.scrollY > 8) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }
    updateHeaderShadow();
    window.addEventListener('scroll', updateHeaderShadow, { passive: true });
  }

  /* =========================================================
     2. MOBILE HAMBURGER MENU (existing behaviour)
     ========================================================= */
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    if (!navLinks || !menuToggle) return;
    navLinks.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', function () {
      var isOpen = navLinks.classList.toggle('open');
      menuToggle.classList.toggle('open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  /* =========================================================
     3. SMOOTH SCROLLING NAVIGATION (existing behaviour)
     ========================================================= */
  var headerHeight = header ? header.offsetHeight : 80;

  document.querySelectorAll('a[data-scroll]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId.charAt(0) !== '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - (headerHeight - 8);
      window.scrollTo({ top: targetPosition, behavior: 'smooth' });
      history.pushState(null, '', targetId);
    });
  });

  /* =========================================================
     4. SCROLL REVEAL ANIMATIONS (existing behaviour)
     ========================================================= */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if ('IntersectionObserver' in window) {
      var revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { revealObserver.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in-view'); });
    }
  }

  /* =========================================================
     5. NEWSLETTER FORM VALIDATION (existing behaviour)
     ========================================================= */
  var form = document.getElementById('newsletterForm');
  var emailInput = document.getElementById('newsletterEmail');
  var formMessage = document.getElementById('formMessage');

  function isValidEmail(value) {
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
  }
  function showFormMessage(text, isError) {
    if (!formMessage) return;
    formMessage.textContent = text;
    formMessage.classList.toggle('error', isError);
  }

  if (form && emailInput) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = emailInput.value.trim();
      if (value === '') { showFormMessage('Please enter your email address.', true); emailInput.focus(); return; }
      if (!isValidEmail(value)) { showFormMessage('That email address doesn\u2019t look right. Please check it.', true); emailInput.focus(); return; }
      showFormMessage('You\u2019re on the list. Welcome to Planora.', false);
      form.reset();
    });
  }

  /* =========================================================
     6. TOAST (existing behaviour, reused by cart + favorites)
     ========================================================= */
  var toast = document.getElementById('toast');
  var toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2400);
  }

  /* =========================================================
     7. PRODUCT DATA
     Read straight from the product cards already in the HTML,
     so the markup stays the single source of truth — no data
     duplicated between HTML and JS.
     ========================================================= */
  var productCards = document.querySelectorAll('.product-card[data-id]');
  var products = {}; // id -> { id, name, price, description, collections[] }

  productCards.forEach(function (card) {
    var id = card.getAttribute('data-id');
    var name = card.getAttribute('data-product');
    var price = parseFloat(card.getAttribute('data-price')) || 0;
    var collections = (card.getAttribute('data-collections') || '').split(' ').filter(Boolean);
    var descEl = card.querySelector('.product-body p');
    var description = descEl ? descEl.textContent.trim() : '';

    products[id] = { id: id, name: name, price: price, description: description, collections: collections };
  });

  /* =========================================================
     8. CART SYSTEM
     ========================================================= */
  var cartDrawer = document.getElementById('cartDrawer');
  var cartOverlay = document.getElementById('cartOverlay');
  var cartClose = document.getElementById('cartClose');
  var cartBtn = document.getElementById('cartBtn');
  var cartItemsEl = document.getElementById('cartItems');
  var cartSubtotalEl = document.getElementById('cartSubtotal');
  var cartCountEl = document.getElementById('cartCount');

  function saveCart() { writeStorage(STORAGE_CART, cart); }

  function cartTotalCount() {
    return cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }
  function cartSubtotal() {
    return cart.reduce(function (sum, item) { return sum + item.qty * item.price; }, 0);
  }

  function updateCartBadge() {
    if (!cartCountEl) return;
    cartCountEl.textContent = String(cartTotalCount());
    cartCountEl.classList.remove('bump');
    void cartCountEl.offsetWidth;
    cartCountEl.classList.add('bump');
  }

  function renderCart() {
    if (!cartItemsEl || !cartDrawer) return;
    cartItemsEl.innerHTML = '';

    cartDrawer.classList.toggle('is-empty', cart.length === 0);

    cart.forEach(function (item) {
      var line = document.createElement('div');
      line.className = 'cart-line';
      line.innerHTML =
        '<div class="cart-line-thumb">' + escapeHtml(item.name) + '</div>' +
        '<div>' +
          '<div class="cart-line-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="cart-line-price">' + formatRupees(item.price) + '</div>' +
          '<div class="cart-line-qty">' +
            '<button class="qty-btn" data-qty="-1" aria-label="Decrease quantity">\u2212</button>' +
            '<span>' + item.qty + '</span>' +
            '<button class="qty-btn" data-qty="1" aria-label="Increase quantity">+</button>' +
          '</div>' +
        '</div>' +
        '<button class="cart-line-remove" type="button">Remove</button>';

      line.querySelectorAll('[data-qty]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          changeQty(item.id, parseInt(btn.getAttribute('data-qty'), 10));
        });
      });
      line.querySelector('.cart-line-remove').addEventListener('click', function () {
        removeFromCart(item.id);
      });

      cartItemsEl.appendChild(line);
    });

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatRupees(cartSubtotal());
    updateCartBadge();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function addToCart(id, silent) {
    var product = products[id];
    if (!product) return;

    var existing = cart.find(function (item) { return item.id === id; });
    if (existing) existing.qty += 1;
    else cart.push({ id: id, name: product.name, price: product.price, qty: 1 });

    saveCart();
    renderCart();
    if (!silent) showToast('Added to cart \u2014 ' + product.name);
  }

  function changeQty(id, delta) {
    var item = cart.find(function (i) { return i.id === id; });
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
  }

  function removeFromCart(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
  }

  function openCart() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.add('open');
    cartOverlay.classList.add('show');
    cartDrawer.setAttribute('aria-hidden', 'false');
    if (cartBtn) cartBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('no-scroll');
  }
  function closeCart() {
    if (!cartDrawer || !cartOverlay) return;
    cartDrawer.classList.remove('open');
    cartOverlay.classList.remove('show');
    cartDrawer.setAttribute('aria-hidden', 'true');
    if (cartBtn) cartBtn.setAttribute('aria-expanded', 'false');
    if (!isModalOpen()) document.body.classList.remove('no-scroll');
  }

  if (cartBtn) cartBtn.addEventListener('click', openCart);
  if (cartClose) cartClose.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', function () { closeCart(); closeModal(); });

  /* "Buy now" on every product card adds a real item to the cart */
  document.querySelectorAll('[data-buy]').forEach(function (button) {
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      var card = button.closest('[data-id]');
      if (!card) return;
      addToCart(card.getAttribute('data-id'));
    });
  });

  renderCart();

  /* =========================================================
     9. FAVORITES (localStorage)
     ========================================================= */
  function saveFavorites() { writeStorage(STORAGE_FAVORITES, favorites); }

  function isFavorite(id) { return favorites.indexOf(id) !== -1; }

  function toggleFavorite(id) {
    var product = products[id];
    if (isFavorite(id)) {
      favorites = favorites.filter(function (f) { return f !== id; });
      if (product) showToast('Removed from favorites \u2014 ' + product.name);
    } else {
      favorites.push(id);
      if (product) showToast('Saved to favorites \u2014 ' + product.name);
    }
    saveFavorites();
    syncFavoriteButtons(id);
  }

  function syncFavoriteButtons(id) {
    var active = isFavorite(id);
    document.querySelectorAll('[data-fav]').forEach(function (btn) {
      var card = btn.closest('[data-id]');
      if (card && card.getAttribute('data-id') === id) {
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
        if (btn === document.activeElement) {
          btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
        }
      }
    });
    if (modalFavBtn && modalFavBtn.getAttribute('data-current-id') === id) {
      modalFavBtn.classList.toggle('active', active);
      modalFavBtn.setAttribute('aria-pressed', String(active));
    }
  }

  document.querySelectorAll('.product-card [data-fav]').forEach(function (btn) {
    var card = btn.closest('[data-id]');
    var id = card ? card.getAttribute('data-id') : null;
    if (id && isFavorite(id)) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (id) { btn.classList.add('bump'); toggleFavorite(id); }
    });
  });

  /* =========================================================
     10. PRODUCT DETAIL MODAL + 8-PAGE PREVIEW GALLERY
     ========================================================= */
  var modalOverlay = document.getElementById('modalOverlay');
  var productModal = document.getElementById('productModal');
  var modalClose = document.getElementById('modalClose');
  var modalTitle = document.getElementById('modalTitle');
  var modalDescription = document.getElementById('modalDescription');
  var modalPrice = document.getElementById('modalPrice');
  var modalAddToCart = document.getElementById('modalAddToCart');
  var modalFavBtn = document.getElementById('modalFavBtn');
  var galleryViewport = document.getElementById('galleryViewport');
  var galleryDots = document.getElementById('galleryDots');
  var galleryCaption = document.getElementById('galleryCaption');
  var galleryPrev = document.getElementById('galleryPrev');
  var galleryNext = document.getElementById('galleryNext');

  var PAGE_COUNT = 8;
  var currentPage = 0;
  var currentModalId = null;

  function isModalOpen() { return productModal && productModal.classList.contains('open'); }

  function buildGallery(productName) {
    if (!galleryViewport || !galleryDots) return;
    galleryViewport.innerHTML = '';
    galleryDots.innerHTML = '';

    for (var i = 0; i < PAGE_COUNT; i++) {
      var page = document.createElement('div');
      page.className = 'gallery-page' + (i === 0 ? ' active' : '');
      page.innerHTML =
        '<span>' + escapeHtml(productName) + '</span>' +
        '<span class="page-lines"><span></span><span></span><span></span></span>' +
        '<span style="font-size:0.75rem;">Page ' + (i + 1) + ' of ' + PAGE_COUNT + '</span>';
      galleryViewport.appendChild(page);

      var dot = document.createElement('span');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', function (idx) {
        return function () { goToPage(idx); };
      }(i));
      galleryDots.appendChild(dot);
    }
    currentPage = 0;
    if (galleryCaption) galleryCaption.textContent = 'Page 1 of ' + PAGE_COUNT;
  }

  function goToPage(index) {
    if (!galleryViewport) return;
    var pages = galleryViewport.querySelectorAll('.gallery-page');
    var dots = galleryDots ? galleryDots.querySelectorAll('span') : [];
    if (!pages.length) return;

    currentPage = (index + pages.length) % pages.length;

    pages.forEach(function (p, i) { p.classList.toggle('active', i === currentPage); });
    dots.forEach(function (d, i) { d.classList.toggle('active', i === currentPage); });
    if (galleryCaption) galleryCaption.textContent = 'Page ' + (currentPage + 1) + ' of ' + PAGE_COUNT;
  }

  if (galleryPrev) galleryPrev.addEventListener('click', function () { goToPage(currentPage - 1); });
  if (galleryNext) galleryNext.addEventListener('click', function () { goToPage(currentPage + 1); });

  function openModal(id) {
    var product = products[id];
    if (!product || !productModal || !modalOverlay) return;

    currentModalId = id;
    if (modalTitle) modalTitle.textContent = product.name;
    if (modalDescription) modalDescription.textContent = product.description;
    if (modalPrice) modalPrice.textContent = formatRupees(product.price);
    if (modalAddToCart) modalAddToCart.setAttribute('data-current-id', id);
    if (modalFavBtn) {
      modalFavBtn.setAttribute('data-current-id', id);
      var active = isFavorite(id);
      modalFavBtn.classList.toggle('active', active);
      modalFavBtn.setAttribute('aria-pressed', String(active));
    }

    buildGallery(product.name);

    productModal.classList.add('open');
    modalOverlay.classList.add('show');
    productModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }

  function closeModal() {
    if (!productModal || !modalOverlay) return;
    productModal.classList.remove('open');
    modalOverlay.classList.remove('show');
    productModal.setAttribute('aria-hidden', 'true');
    if (!cartDrawer || !cartDrawer.classList.contains('open')) {
      document.body.classList.remove('no-scroll');
    }
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', function () { closeModal(); closeCart(); });

  if (modalAddToCart) {
    modalAddToCart.addEventListener('click', function () {
      var id = modalAddToCart.getAttribute('data-current-id');
      if (id) addToCart(id);
    });
  }
  if (modalFavBtn) {
    modalFavBtn.addEventListener('click', function () {
      var id = modalFavBtn.getAttribute('data-current-id');
      if (id) toggleFavorite(id);
    });
  }

  /* Clicking a product card (but not its buy/fav buttons) opens the modal */
  productCards.forEach(function (card) {
    card.addEventListener('click', function () {
      openModal(card.getAttribute('data-id'));
    });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.getAttribute('data-id'));
      }
    });
  });

  /* Escape key closes whichever overlay is open */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeModal(); closeCart(); }
  });

  /* =========================================================
     11. COLLECTIONS FILTER + SEARCH
     ========================================================= */
  var filterPills = document.querySelectorAll('.filter-pill');
  var searchInput = document.getElementById('productSearch');
  var emptyState = document.getElementById('emptyState');
  var activeFilter = 'all';

  function applyFilters() {
    var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visibleCount = 0;

    productCards.forEach(function (card) {
      var collections = (card.getAttribute('data-collections') || '').split(' ');
      var name = (card.getAttribute('data-product') || '').toLowerCase();
      var descEl = card.querySelector('.product-body p');
      var desc = descEl ? descEl.textContent.toLowerCase() : '';

      var matchesFilter = activeFilter === 'all' || collections.indexOf(activeFilter) !== -1;
      var matchesSearch = term === '' || name.indexOf(term) !== -1 || desc.indexOf(term) !== -1;
      var visible = matchesFilter && matchesSearch;

      card.classList.toggle('is-hidden', !visible);
      if (visible) visibleCount += 1;
    });

    if (emptyState) emptyState.hidden = visibleCount !== 0;
  }

  filterPills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      filterPills.forEach(function (p) { p.classList.remove('active'); });
      pill.classList.add('active');
      activeFilter = pill.getAttribute('data-filter');
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', applyFilters);
  }

  /* Category cards jump to the shop grid pre-filtered by collection */
  document.querySelectorAll('[data-goto-collection]').forEach(function (card) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', function () {
      var collection = card.getAttribute('data-goto-collection');
      var targetPill = document.querySelector('.filter-pill[data-filter="' + collection + '"]');
      if (targetPill) targetPill.click();

      var shopSection = document.getElementById('bestsellers');
      if (shopSection) {
        var top = shopSection.getBoundingClientRect().top + window.pageYOffset - (headerHeight - 8);
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });

  applyFilters();

  /* =========================================================
     12. FAQ ACCORDION
     ========================================================= */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      /* Single-open accordion: close any other open item first */
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.toggle('open', !isOpen);
      question.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* =========================================================
     13. CHECKOUT PAGE (only runs when checkout markup exists)
     ========================================================= */
  var checkoutItemsEl = document.getElementById('checkoutItems');
  if (checkoutItemsEl) {
    var checkoutTotalEl = document.getElementById('checkoutTotal');
    var checkoutForm = document.getElementById('checkoutForm');
    var checkoutMessage = document.getElementById('checkoutMessage');

    function renderCheckout() {
      checkoutItemsEl.innerHTML = '';
      if (cart.length === 0) {
        checkoutItemsEl.innerHTML = '<p class="checkout-empty">Your cart is empty. <a href="index.html#bestsellers">Browse the shop</a> to add something first.</p>';
      } else {
        cart.forEach(function (item) {
          var row = document.createElement('div');
          row.className = 'checkout-line';
          row.innerHTML = '<span>' + escapeHtml(item.name) + ' \u00d7 ' + item.qty + '</span><span>' + formatRupees(item.price * item.qty) + '</span>';
          checkoutItemsEl.appendChild(row);
        });
      }
      if (checkoutTotalEl) checkoutTotalEl.textContent = formatRupees(cartSubtotal());
    }
    renderCheckout();

    if (checkoutForm) {
      checkoutForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (cart.length === 0) {
          if (checkoutMessage) { checkoutMessage.textContent = 'Your cart is empty — add a product before checking out.'; checkoutMessage.classList.add('error'); }
          return;
        }

        /* =====================================================
           STRIPE INTEGRATION POINT
           -----------------------------------------------------
           This is a front-end-only placeholder. To go live:

           1. Add the Stripe.js script tag to checkout.html:
              <script src="https://js.stripe.com/v3/"></script>

           2. Initialize Stripe with your publishable key:
              const stripe = Stripe('pk_live_...');

           3. Create a PaymentIntent on your server (Stripe
              requires a backend or serverless function — this
              cannot be done from static HTML/JS alone) using
              the cart total: renderCheckout() above already
              computes it via cartSubtotal().

           4. Mount Stripe Elements into #stripe-payment-element
              and call stripe.confirmPayment() on submit instead
              of the placeholder success message below.
           ===================================================== */

        if (checkoutMessage) {
          checkoutMessage.classList.remove('error');
          checkoutMessage.textContent = 'Payment integration coming soon \u2014 this checkout is ready to connect to Stripe.';
        }
      });
    }
  }

});

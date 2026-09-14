/* =========================================================
   PLANORA — script.js
   Vanilla JS only. No dependencies.
   Handles: sticky header shadow, mobile menu, smooth scroll,
   scroll-reveal animations, newsletter validation,
   and a front-end-only fake cart counter.
   ========================================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------- 1. Sticky header shadow on scroll ---------- */
  var header = document.getElementById('siteHeader');
  function updateHeaderShadow() {
    if (window.scrollY > 8) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  updateHeaderShadow();
  window.addEventListener('scroll', updateHeaderShadow, { passive: true });

  /* ---------- 2. Mobile hamburger menu ---------- */
  var menuToggle = document.getElementById('menuToggle');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    navLinks.classList.remove('open');
    menuToggle.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    var isOpen = navLinks.classList.toggle('open');
    menuToggle.classList.toggle('open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
  }

  menuToggle.addEventListener('click', toggleMenu);

  /* Close the mobile menu after a nav link is used */
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  /* ---------- 3. Smooth scrolling navigation ---------- */
  var headerHeight = header.offsetHeight;

  document.querySelectorAll('a[data-scroll]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId.charAt(0) !== '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();

      var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - (headerHeight - 8);

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      /* Keep the URL hash in sync without an extra jump */
      history.pushState(null, '', targetId);
    });
  });

  /* ---------- 4. Scroll reveal animations ---------- */
  var revealEls = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    /* Fallback: no IntersectionObserver support — just show everything */
    revealEls.forEach(function (el) {
      el.classList.add('in-view');
    });
  }

  /* ---------- 5. Newsletter form validation ---------- */
  var form = document.getElementById('newsletterForm');
  var emailInput = document.getElementById('newsletterEmail');
  var formMessage = document.getElementById('formMessage');

  function isValidEmail(value) {
    /* Simple, practical email pattern — not exhaustive RFC 5322 */
    var pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = emailInput.value.trim();

    if (value === '') {
      showFormMessage('Please enter your email address.', true);
      emailInput.focus();
      return;
    }

    if (!isValidEmail(value)) {
      showFormMessage('That email address doesn\u2019t look right. Please check it.', true);
      emailInput.focus();
      return;
    }

    /* Front-end only: no server call, just confirm success */
    showFormMessage('You\u2019re on the list. Welcome to Planora.', false);
    form.reset();
  });

  function showFormMessage(text, isError) {
    formMessage.textContent = text;
    formMessage.classList.toggle('error', isError);
  }

  /* ---------- 6. Fake shopping cart counter ---------- */
  var cartCount = document.getElementById('cartCount');
  var toast = document.getElementById('toast');
  var count = 0;
  var toastTimer = null;

  document.querySelectorAll('[data-buy]').forEach(function (button) {
    button.addEventListener('click', function () {
      var card = button.closest('[data-product]');
      var name = card ? card.getAttribute('data-product') : 'Item';

      count += 1;
      cartCount.textContent = String(count);

      /* Little bump animation on the counter */
      cartCount.classList.remove('bump');
      /* Force reflow so the animation can restart */
      void cartCount.offsetWidth;
      cartCount.classList.add('bump');

      showToast('Added to cart — ' + name);
    });
  });

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('show');
    }, 2400);
  }

});

/* ============================================================
   JARA ∆ — Main JavaScript
   main.js · /js/main.js

   TABLE OF CONTENTS
   1.  Config & Constants
   2.  Navigation — scroll behaviour
   3.  Hero Search — animated cycling text
   4.  Scroll Animations — IntersectionObserver
   5.  Trending Chips — interaction feedback
   6.  Init — runs everything on DOMContentLoaded
============================================================ */


/* ============================================================
   1. CONFIG & CONSTANTS
============================================================ */

// Search terms that cycle in the hero animated search bar
const SEARCH_TERMS = [
  'Generator...',
  'Hair Stylist...',
  'Assignment Typing...',
  'Cake...',
  'Laptop Repair...',
  'Fairly Used Books...',
  'Gas Cylinder...',
  'Photographer...',
  'Graphic Designer...',
  'Hostel Cleaning...',
  'Phone Charger...',
];

// How long each search term stays visible (ms)
const TERM_DISPLAY_DURATION = 2600;

// How long the fade transition takes (ms) — must match CSS transition
const TERM_FADE_DURATION = 300;


/* ============================================================
   2. NAVIGATION — Scroll Behaviour
   Adds a .is-scrolled class to the nav when the user
   scrolls past 20px, which CSS can use to increase the
   background opacity and add a stronger border.
============================================================ */
function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  function handleNavScroll() {
    if (window.scrollY > 20) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }

  // Run once immediately in case page loads mid-scroll
  handleNavScroll();

  window.addEventListener('scroll', handleNavScroll, { passive: true });
}


/* ============================================================
   3. HERO SEARCH — Animated Cycling Text
   Fades each search term in and out in sequence.
   Appends a blinking cursor element after the text.
============================================================ */
function initHeroSearch() {
  const textEl = document.getElementById('heroSearchText');
  if (!textEl) return;

  // Inject the blinking cursor span after the text node
  const cursor = document.createElement('span');
  cursor.className = 'hero__search-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  textEl.parentNode.insertBefore(cursor, textEl.nextSibling);

  let currentIndex = 0;

  function showNextTerm() {
    // 1. Fade out
    textEl.classList.add('is-fading');

    setTimeout(() => {
      // 2. Swap text while invisible
      currentIndex = (currentIndex + 1) % SEARCH_TERMS.length;
      textEl.textContent = SEARCH_TERMS[currentIndex];

      // 3. Fade back in
      textEl.classList.remove('is-fading');
    }, TERM_FADE_DURATION);
  }

  // Set the first term immediately
  textEl.textContent = SEARCH_TERMS[0];

  // Begin the cycle
  setInterval(showNextTerm, TERM_DISPLAY_DURATION);
}


/* ============================================================
   4. SCROLL ANIMATIONS — IntersectionObserver
   Watches elements with .fade-up or .stagger-children
   and adds .is-visible when they enter the viewport.
   This triggers the CSS transitions defined in style.css.
============================================================ */
function initScrollAnimations() {
  // Elements to observe
  const fadeTargets = document.querySelectorAll('.fade-up, .stagger-children');
  if (!fadeTargets.length) return;

  // IntersectionObserver fires when element is 10% into view
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Stop watching after it's revealed — no re-trigger
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px', // Trigger slightly before edge
    }
  );

  fadeTargets.forEach((el) => observer.observe(el));
}

/*
  HOW TO USE SCROLL ANIMATIONS IN HTML:
  ----------------------------------------
  Single element fade-in:
    <div class="fade-up"> ... </div>

  Grid of cards that stagger in one by one:
    <div class="stagger-children">
      <div class="category-card"> ... </div>
      <div class="category-card"> ... </div>
    </div>

  Add these classes directly in index.html on the
  section grids and titles. CSS handles the rest.
*/


/* ============================================================
   5. TRENDING CHIPS — Interaction Feedback
   Adds a brief visual "active" pulse when a trending
   chip is tapped/clicked before navigating away.
   Gives the UI a responsive, native-app feel.
============================================================ */
function initTrendingChips() {
  const chips = document.querySelectorAll('.trend-chip');
  if (!chips.length) return;

  chips.forEach((chip) => {
    chip.addEventListener('click', function (e) {
      // Add active state briefly for tap feedback
      this.classList.add('is-active');

      // Remove after animation — navigation will happen naturally
      setTimeout(() => {
        this.classList.remove('is-active');
      }, 300);
    });
  });
}


/* ============================================================
   6. SMOOTH SCROLL — Internal Anchor Links
   Intercepts clicks on href="#..." links and
   scrolls smoothly, accounting for the fixed nav height.
============================================================ */
function initSmoothScroll() {
  const NAV_HEIGHT = 68; // Must match --nav-height in style.css

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      if (!targetId) return;

      const target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();

      const top = target.getBoundingClientRect().top + window.scrollY - NAV_HEIGHT - 16;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}


/* ============================================================
   INIT — Run everything when the DOM is ready
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initHeroSearch();
  initScrollAnimations();
  initTrendingChips();
  initSmoothScroll();
});

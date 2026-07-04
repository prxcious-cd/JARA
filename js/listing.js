/* ============================================================
   JARA ∆ — Listing Details Page Logic
   js/listing.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in listing/index.html

   TABLE OF CONTENTS
   1.  State
   2.  Placeholder data  ← all blocks marked with FUTURE:
   3.  DOM references
   4.  URL parameter handling
   5.  Gallery — swipe, dots, auto-advance
   6.  Listing header render
   7.  Description render + read-more toggle
   8.  Seller card render
   9.  Contact options render
   10. Location render
   11. Similar listings render
   12. Save / favourite toggle
   13. Share listing
   14. More options bottom sheet
   15. Report listing
   16. Topbar scroll effect
   17. Pull-to-refresh
   18. Utility helpers
   19. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. STATE
  ========================================================== */
  const state = {
    listingId:    null,    // From URL ?id=
    listing:      null,
    currentSlide: 0,
    totalSlides:  0,
    isSaved:      false,
    isRefreshing: false,
  };


  /* ==========================================================
     2. PLACEHOLDER DATA
  ========================================================== */

  /* ---- LISTING ----
     FUTURE: Depending on the ?type= URL param, query one of:
       SELECT p.*, c.name AS category_name,
         pro.full_name, pro.business_name, pro.avatar_url,
         pro.is_verified, pro.is_premium, pro.whatsapp_number,
         pro.phone_number, pro.jara_id
       FROM products p
       JOIN profiles pro ON pro.id = p.owner_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = :listing_id

       (Same shape for services, requests)
  ---- */
  const PLACEHOLDER_LISTING = {
    id:           'p1',
    type:         'product',
    title:        'Honda Generator — 2.5KVA for Rent',
    description:  "Reliable Honda generator available for nightly or weekly rental. Perfect for hostel use during NEPA outages.\n\nThe generator is well-maintained, regularly serviced, and starts on the first pull. Fuel is not included but nearby fuel stations are accessible.\n\nRental comes with the generator, fuel cap key, and an extension cord. Minimum rental period is one night.\n\nPickup and return at Block C, Student Hostel. WhatsApp to confirm availability before arranging.",
    category:     'Power & Generator',
    price:        2500,
    priceLabel:   '₦2,500',
    priceSuffix:  'per night',
    priceType:    'fixed',
    status:       'available',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618047-f4e2c54a7c8d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&h=600&fit=crop',
    ],
    tags:         ['generator', 'power', 'electricity', 'hostel', 'rental'],
    location:     'Block C, Student Hostel, Redeemer\'s University',
    distance:     '0.3 km from you',
    view_count:   89,
    created_at:   '2025-06-28T10:00:00Z',
    // Features / condition chips
    features: [
      { icon: 'fa-solid fa-star', label: 'Well Maintained' },
      { icon: 'fa-solid fa-bolt',  label: '2.5 KVA' },
      { icon: 'fa-solid fa-droplet', label: 'Fuel Not Included' },
      { icon: 'fa-solid fa-plug',  label: 'Extension Cord Included' },
    ],
  };

  /* ---- SELLER ----
     FUTURE: Joined from the listing query above via owner_id / provider_id
  ---- */
  const PLACEHOLDER_SELLER = {
    id:                'emeka-001',
    jara_id:           'JARA-00018',
    full_name:         'Emeka Johnson',
    business_name:     'Emeka Power Rentals',
    avatar_url:        null,
    account_type:      'seller',
    is_verified:       true,
    is_premium:        false,
    is_founding_member:true,
    whatsapp_number:   '2348073436050',
    phone_number:      '08073436050',
    average_rating:    4.8,
    total_ratings:     34,
  };

  /* ---- SIMILAR LISTINGS ----
     FUTURE: SELECT id, title, images, price, price_type, category_id
             FROM products p
             JOIN categories c ON c.id = p.category_id
             WHERE p.category_id = :current_category_id
             AND p.id != :current_listing_id
             AND p.status = 'active'
             ORDER BY p.created_at DESC LIMIT 8
             UNION ALL (services with same logic)
  ---- */
  const PLACEHOLDER_SIMILAR = [
    {
      id:       'p7',
      type:     'product',
      title:    'Thermocool Generator — 1.8KVA',
      emoji:    '⚡',
      image:    null,
      category: 'Power',
      price:    '₦1,800/night',
      link:     '../listing/index.html?id=p7',
    },
    {
      id:       'p8',
      type:     'service',
      title:    'Generator Repair & Servicing',
      emoji:    '🔧',
      image:    null,
      category: 'Tech & Repairs',
      price:    'From ₦3,000',
      link:     '../listing/index.html?id=p8',
    },
    {
      id:       'p9',
      type:     'product',
      title:    'Extension Board — 4 Gang, 10 metres',
      emoji:    '🔌',
      image:    null,
      category: 'Power',
      price:    '₦800/day',
      link:     '../listing/index.html?id=p9',
    },
    {
      id:       'p10',
      type:     'product',
      title:    'Solar Lantern — For Study Nights',
      emoji:    '💡',
      image:    null,
      category: 'Power',
      price:    '₦500/day',
      link:     '../listing/index.html?id=p10',
    },
  ];


  /* ==========================================================
     3. DOM REFERENCES
  ========================================================== */
  const galleryTrack      = document.getElementById('galleryTrack');
  const galleryDots       = document.getElementById('galleryDots');
  const galleryTypeBadge  = document.getElementById('galleryTypeBadge');
  const gallerySkeleton   = document.getElementById('gallerySkeleton');
  const galSaveBtn        = document.getElementById('galSaveBtn');
  const galSaveIcon       = document.getElementById('galSaveIcon');
  const galShareBtn       = document.getElementById('galShareBtn');

  const listingCategory   = document.getElementById('listingCategory');
  const listingDate       = document.getElementById('listingDate');
  const listingViews      = document.getElementById('listingViews');
  const titleSkeleton     = document.getElementById('titleSkeleton');
  const listingTitle      = document.getElementById('listingTitle');
  const listingPrice      = document.getElementById('listingPrice');
  const listingPriceLabel = document.getElementById('listingPriceLabel');
  const listingStatus     = document.getElementById('listingStatus');
  const listingTags       = document.getElementById('listingTags');

  const listingDescription = document.getElementById('listingDescription');
  const detailFeatures    = document.getElementById('detailFeatures');
  const readMoreBtn       = document.getElementById('readMoreBtn');

  const sellerAvatarSkeleton = document.getElementById('sellerAvatarSkeleton');
  const sellerAvatarEl    = document.getElementById('sellerAvatarEl');
  const sellerSkeleton1   = document.getElementById('sellerSkeleton1');
  const sellerSkeleton2   = document.getElementById('sellerSkeleton2');
  const sellerName        = document.getElementById('sellerName');
  const sellerVerified    = document.getElementById('sellerVerified');
  const sellerSub         = document.getElementById('sellerSub');
  const sellerBadges      = document.getElementById('sellerBadges');
  const sellerRating      = document.getElementById('sellerRating');
  const sellerStars       = document.getElementById('sellerStars');
  const sellerRatingCount = document.getElementById('sellerRatingCount');
  const viewStoreBtn      = document.getElementById('viewStoreBtn');
  const contactSellerBtn  = document.getElementById('contactSellerBtn');

  const waBtn             = document.getElementById('waBtn');
  const callBtn           = document.getElementById('callBtn');
  const copyPhoneBtn      = document.getElementById('copyPhoneBtn');
  const copyLinkBtn       = document.getElementById('copyLinkBtn');

  const locationAddress   = document.getElementById('locationAddress');
  const locationDistance  = document.getElementById('locationDistance');

  const similarStrip      = document.getElementById('similarStrip');

  const stickyPrice       = document.getElementById('stickyPrice');
  const stickyContactBtn  = document.getElementById('stickyContactBtn');

  const saveBtn           = document.getElementById('saveBtn');
  const saveIcon          = document.getElementById('saveIcon');
  const shareTopBtn       = document.getElementById('shareTopBtn');
  const moreBtn           = document.getElementById('moreBtn');
  const backBtn           = document.getElementById('backBtn');
  const reportBtn         = document.getElementById('reportBtn');

  const moreSheet         = document.getElementById('moreSheet');
  const moreSheetBackdrop = document.getElementById('moreSheetBackdrop');
  const sheetClose        = document.getElementById('sheetClose');
  const sheetShare        = document.getElementById('sheetShare');
  const sheetSave         = document.getElementById('sheetSave');
  const sheetSaveIcon     = document.getElementById('sheetSaveIcon');
  const sheetSaveLabel    = document.getElementById('sheetSaveLabel');
  const sheetCopyLink     = document.getElementById('sheetCopyLink');
  const sheetViewStore    = document.getElementById('sheetViewStore');
  const sheetReport       = document.getElementById('sheetReport');

  const listingTopbar     = document.getElementById('listingTopbar');
  const pullIndicator     = document.getElementById('pullIndicator');
  const pullIcon          = document.getElementById('pullIcon');
  const pullLabel         = document.getElementById('pullLabel');


  /* ==========================================================
     4. URL PARAMETER HANDLING
     ?id=p1&type=product
  ========================================================== */

  function getURLParams() {
    const p = new URLSearchParams(window.location.search);
    return {
      id:   p.get('id')   || null,
      type: p.get('type') || 'product',
    };
  }


  /* ==========================================================
     5. GALLERY — SWIPE, DOTS, KEYBOARD
  ========================================================== */

  function buildGallery(images, emoji) {
    galleryTrack.innerHTML = '';
    galleryDots.innerHTML  = '';

    const slides = images && images.length > 0 ? images : [];

    if (slides.length === 0) {
      // No images — show emoji placeholder
      const slide = document.createElement('div');
      slide.className = 'gallery-slide gallery-slide--placeholder';
      slide.setAttribute('role', 'listitem');
      slide.textContent = emoji || '📦';
      galleryTrack.appendChild(slide);
      state.totalSlides = 1;
      gallerySkeleton.classList.add('is-hidden');
      return;
    }

    slides.forEach((src, i) => {
      const slide = document.createElement('div');
      slide.className = 'gallery-slide';
      slide.setAttribute('role', 'listitem');
      slide.setAttribute('aria-label', `Photo ${i + 1} of ${slides.length}`);

      const img = document.createElement('img');
      img.alt    = `Listing photo ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';

      img.addEventListener('load', () => {
        img.classList.add('is-loaded');
        if (i === 0) gallerySkeleton.classList.add('is-hidden');
      });

      img.src = src;
      slide.appendChild(img);
      galleryTrack.appendChild(slide);
    });

    state.totalSlides = slides.length;

    // Build dots
    if (slides.length > 1) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = `gallery-dot${i === 0 ? ' is-active' : ''}`;
        dot.type      = 'button';
        dot.setAttribute('aria-label', `Go to photo ${i + 1}`);
        dot.addEventListener('click', () => goToSlide(i));
        galleryDots.appendChild(dot);
      });
      galleryDots.removeAttribute('hidden');
    }

    initGallerySwipe();
  }

  function goToSlide(index) {
    const total = state.totalSlides;
    state.currentSlide = Math.max(0, Math.min(index, total - 1));
    galleryTrack.style.transform = `translateX(-${state.currentSlide * 100}%)`;

    // Update dots
    document.querySelectorAll('.gallery-dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === state.currentSlide);
    });
  }

  function initGallerySwipe() {
    const gallery    = document.getElementById('gallery');
    let touchStartX  = 0;
    let touchStartY  = 0;
    let isDragging   = false;

    gallery.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isDragging  = false;
    }, { passive: true });

    gallery.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      // Only intercept horizontal swipes
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
        isDragging = true;
      }
    }, { passive: true });

    gallery.addEventListener('touchend', e => {
      if (!isDragging) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -50) goToSlide(state.currentSlide + 1);
      if (dx > 50)  goToSlide(state.currentSlide - 1);
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') goToSlide(state.currentSlide + 1);
      if (e.key === 'ArrowLeft')  goToSlide(state.currentSlide - 1);
    });
  }


  /* ==========================================================
     6. LISTING HEADER RENDER
  ========================================================== */

  function renderListingHeader(listing) {
    state.listing = listing;

    // Type badge on gallery
    const typeLabels = { product: 'Product', service: 'Service', request: 'Request', business: 'Business' };
    const typeCls    = { product: 'product', service: 'service', request: 'request', business: 'business' };
    galleryTypeBadge.innerHTML = `
      <span class="type-badge type-badge--${typeCls[listing.type] || 'product'}">
        ${typeLabels[listing.type] || 'Listing'}
      </span>
    `;

    // Category + date + views
    listingCategory.textContent = listing.category || 'Listing';
    listingCategory.classList.remove('skeleton-pulse');
    listingDate.textContent     = formatDate(listing.created_at);
    listingViews.textContent    = listing.view_count || 0;

    // Title
    titleSkeleton.style.display = 'none';
    listingTitle.classList.remove('listing-title--hidden');
    listingTitle.textContent = listing.title;
    document.title = `${listing.title} — JARA ∆`;

    // Price
    listingPrice.classList.remove('skeleton-pulse');
    if (listing.priceType === 'fixed' && listing.price) {
      listingPrice.textContent    = `₦${Number(listing.price).toLocaleString('en-NG')}`;
      listingPriceLabel.textContent = listing.priceSuffix || '';
    } else {
      const priceLabelMap = {
        negotiable: 'Negotiable',
        free:       'Free',
        contact:    'Contact for Price',
        quote:      'Request a Quote',
      };
      listingPrice.textContent    = priceLabelMap[listing.priceType] || '—';
      listingPriceLabel.textContent = '';
    }

    // Status
    const statusMap = {
      available: { cls: 'listing-status--available', label: 'Available' },
      busy:      { cls: 'listing-status--busy',      label: 'Busy' },
      sold:      { cls: 'listing-status--sold',      label: 'Sold' },
      coming_soon:{ cls: 'listing-status--soon',     label: 'Coming Soon' },
    };
    const s = statusMap[listing.status];
    if (s) {
      listingStatus.className  = `listing-status ${s.cls}`;
      listingStatus.textContent = s.label;
      listingStatus.removeAttribute('hidden');
    }

    // Tags
    if (listing.tags && listing.tags.length > 0) {
      listingTags.innerHTML = listing.tags.map(t =>
        `<span class="listing-tag">#${escapeHTML(t)}</span>`
      ).join('');
      listingTags.removeAttribute('hidden');
    }

    // Sticky CTA price
    stickyPrice.textContent = listingPrice.textContent;
  }


  /* ==========================================================
     7. DESCRIPTION RENDER + READ-MORE TOGGLE
  ========================================================== */

  function renderDescription(listing) {
    if (!listing.description) return;

    listingDescription.textContent = listing.description;

    // Clamp long descriptions
    const lineCount = listing.description.split('\n').length;
    if (listing.description.length > 300 || lineCount > 4) {
      listingDescription.classList.add('is-clamped');
      readMoreBtn.removeAttribute('hidden');

      let isExpanded = false;

      readMoreBtn.addEventListener('click', () => {
        isExpanded = !isExpanded;
        listingDescription.classList.toggle('is-clamped', !isExpanded);
        readMoreBtn.innerHTML = isExpanded
          ? `Show less <i class="fa-solid fa-chevron-up" aria-hidden="true"></i>`
          : `Read more <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
        readMoreBtn.classList.toggle('is-expanded', isExpanded);
      });
    }

    // Feature chips
    if (listing.features && listing.features.length > 0) {
      detailFeatures.innerHTML = listing.features.map(f =>
        `<span class="feature-chip">
           <i class="${f.icon}" aria-hidden="true"></i>
           ${escapeHTML(f.label)}
         </span>`
      ).join('');
      detailFeatures.removeAttribute('hidden');
    }
  }


  /* ==========================================================
     8. SELLER CARD RENDER
  ========================================================== */

  function renderSeller(seller) {
    // Clear skeletons
    sellerAvatarSkeleton.style.display = 'none';
    sellerAvatarEl.classList.remove('seller-avatar--hidden');
    sellerSkeleton1.style.display = 'none';
    sellerSkeleton2.style.display = 'none';

    // Avatar
    if (seller.avatar_url) {
      const img = document.createElement('img');
      img.src = seller.avatar_url;
      img.alt = seller.full_name;
      sellerAvatarEl.appendChild(img);
    } else {
      const name     = seller.business_name || seller.full_name || 'J';
      const words    = name.trim().split(' ');
      const initials = words.length >= 2
        ? words[0][0] + words[words.length - 1][0]
        : words[0].slice(0, 2);
      sellerAvatarEl.textContent = initials.toUpperCase();
    }

    if (seller.is_verified) sellerVerified.removeAttribute('hidden');

    // Name + sub
    sellerName.classList.remove('seller-name--hidden');
    sellerName.textContent = seller.business_name || seller.full_name || 'Seller';
    sellerSub.classList.remove('seller-sub--hidden');
    sellerSub.textContent = seller.jara_id || '';

    // Badges
    const badges = [];
    if (seller.is_founding_member) badges.push({ cls: 'seller-badge--founding', icon: 'fa-solid fa-medal',       label: 'Founding Member' });
    if (seller.is_premium)         badges.push({ cls: 'seller-badge--pro',      icon: 'fa-solid fa-crown',       label: 'JARA PRO' });
    if (seller.is_verified)        badges.push({ cls: 'seller-badge--verified', icon: 'fa-solid fa-circle-check',label: 'Verified' });

    if (badges.length > 0) {
      sellerBadges.innerHTML = badges.map(b =>
        `<span class="seller-badge ${b.cls}">
           <i class="${b.icon}" aria-hidden="true"></i> ${escapeHTML(b.label)}
         </span>`
      ).join('');
      sellerBadges.removeAttribute('hidden');
    }

    // Rating
    if (seller.average_rating) {
    sellerStars.innerHTML = buildStars(seller.average_rating);
      sellerRatingCount.textContent = `${seller.average_rating} (${seller.total_ratings} reviews)`;
      sellerRating.removeAttribute('hidden');
    }

    // Buttons
    const storeUrl = `../store/index.html?store=${seller.jara_id || seller.id}`;
    viewStoreBtn.href    = storeUrl;
    sheetViewStore.href  = storeUrl;
  }


  /* ==========================================================
     9. CONTACT OPTIONS RENDER
  ========================================================== */

  function renderContact(seller, listing) {
    const num     = seller.whatsapp_number?.replace(/\D/,'') || '';
    const phone   = seller.phone_number || '';
    const title   = listing.title || 'your listing';
    const msg     = encodeURIComponent(`Hi, I saw your listing "${title}" on JARA ∆ and I'm interested. Is it still available?`);

    // WhatsApp
    if (num) {
      const waHref = `https://wa.me/${num}?text=${msg}`;
      waBtn.href            = waHref;
      contactSellerBtn.href = waHref;
      stickyContactBtn.href = waHref;
    }

    // Call
    if (phone) {
      callBtn.href = `tel:${phone}`;
    }

    // Copy phone
    copyPhoneBtn.addEventListener('click', () => {
      if (phone) {
        navigator.clipboard.writeText(phone).then(() => showToast('Phone number copied!'));
      } else {
        showToast('No phone number available.');
      }
    });
  }


  /* ==========================================================
     10. LOCATION RENDER
  ========================================================== */

  function renderLocation(listing) {
    locationAddress.textContent = listing.location || 'Location not specified';
    const distSpan = locationDistance.querySelector('span');
    if (distSpan) distSpan.textContent = listing.distance || 'Distance unavailable';
  }


  /* ==========================================================
     11. SIMILAR LISTINGS RENDER
  ========================================================== */

  function renderSimilar(items) {
    similarStrip.innerHTML = '';

    if (!items || items.length === 0) {
      similarStrip.style.padding = 'var(--space-5)';
      const empty = document.createElement('p');
      empty.style.cssText = 'font-size:.875rem;color:var(--color-text-tertiary);';
      empty.textContent   = 'No similar listings right now.';
      similarStrip.appendChild(empty);
      return;
    }

    items.forEach((item, i) => {
      const card = document.createElement('a');
      card.className = 'similar-card';
      card.href      = item.link || '#';
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', item.title);
      card.style.animationDelay = `${i * 55}ms`;
      card.style.animation      = 'fade-up 260ms ease both';

      card.innerHTML = `
        <div class="similar-card__image">
          ${item.image
            ? `<img src="${escapeHTML(item.image)}" alt="${escapeHTML(item.title)}" loading="lazy" />`
            : `<span aria-hidden="true">${item.emoji || '📦'}</span>`
          }
        </div>
        <div class="similar-card__body">
          <p class="similar-card__category">${escapeHTML(item.category || '')}</p>
          <p class="similar-card__title">${escapeHTML(item.title)}</p>
          <p class="similar-card__price">${escapeHTML(item.price || '—')}</p>
        </div>
      `;

      similarStrip.appendChild(card);
    });
  }


  /* ==========================================================
     12. SAVE / FAVOURITE TOGGLE
     FUTURE: INSERT INTO favorites (user_id, product_id / service_id)
             or DELETE on unsave.
  ========================================================== */

  function toggleSave() {
    state.isSaved = !state.isSaved;

    const isSolid = state.isSaved ? 'fa-solid' : 'fa-regular';

    // Update all save buttons
    [galSaveIcon, saveIcon, sheetSaveIcon].forEach(icon => {
      icon.className = `${isSolid} fa-bookmark`;
    });

    [galSaveBtn, saveBtn].forEach(btn => {
      btn.classList.toggle('is-saved', state.isSaved);
      btn.setAttribute('aria-pressed', state.isSaved ? 'true' : 'false');
    });

    if (sheetSaveLabel) {
      sheetSaveLabel.textContent = state.isSaved ? 'Saved' : 'Save Listing';
    }

    showToast(state.isSaved ? 'Saved to your favourites!' : 'Removed from favourites');

    // FUTURE: await window._supabase.from('favorites').upsert / delete
  }

  galSaveBtn.addEventListener('click', toggleSave);
  saveBtn.addEventListener('click', toggleSave);
  sheetSave.addEventListener('click', () => { closeMoreSheet(); toggleSave(); });


  /* ==========================================================
     13. SHARE LISTING
  ========================================================== */

  function handleShare() {
    const listing = state.listing;
    const title   = listing?.title || 'Check this out on JARA ∆';
    const url     = window.location.href;
    const text    = `Found this on JARA ∆ — "${title}"`;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => showToast('Link copied!'));
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => showToast('Link copied!'));
  }

  galShareBtn.addEventListener('click', handleShare);
  shareTopBtn.addEventListener('click', handleShare);
  copyLinkBtn.addEventListener('click', handleCopyLink);
  sheetShare.addEventListener('click', () => { closeMoreSheet(); handleShare(); });
  sheetCopyLink.addEventListener('click', () => { closeMoreSheet(); handleCopyLink(); });


  /* ==========================================================
     14. MORE OPTIONS BOTTOM SHEET
  ========================================================== */

  function openMoreSheet() {
    moreSheet.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMoreSheet() {
    moreSheet.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  moreBtn.addEventListener('click', openMoreSheet);
  moreSheetBackdrop.addEventListener('click', closeMoreSheet);
  sheetClose.addEventListener('click', closeMoreSheet);


  /* ==========================================================
     15. REPORT LISTING
     FUTURE: INSERT INTO reports (reporter_id, target_type, target_product_id, reason)
  ========================================================== */

  function handleReport() {
    closeMoreSheet();
    // Simple native confirm for now — future: a proper report modal
    const reason = prompt('Why are you reporting this listing?\n\n(e.g. Spam, Fake listing, Offensive content, Wrong category)');
    if (reason && reason.trim()) {
      showToast('Report submitted. Thank you for keeping JARA safe.');
      // FUTURE: await window._supabase.from('reports').insert({ reporter_id, target_type: 'product', target_product_id, reason })
    }
  }

  reportBtn.addEventListener('click', handleReport);
  sheetReport.addEventListener('click', handleReport);


  /* ==========================================================
     16. TOPBAR SCROLL EFFECT
  ========================================================== */

  function initTopbarScroll() {
    window.addEventListener('scroll', () => {
      const galleryHeight = document.getElementById('gallery')?.offsetHeight || 300;
      listingTopbar.classList.toggle('is-scrolled', window.scrollY > galleryHeight - 60);
    }, { passive: true });
  }


  /* ==========================================================
     17. PULL-TO-REFRESH
  ========================================================== */

  let touchStartY  = 0;
  let pullDistance = 0;
  const PULL_THRESHOLD = 80;

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (window.scrollY > 0 || state.isRefreshing) return;
    pullDistance = e.touches[0].clientY - touchStartY;
    if (pullDistance > 20) {
      pullIndicator.classList.add('is-pulling');
      pullLabel.textContent    = pullDistance > PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh';
      pullIcon.style.transform = `rotate(${(pullDistance / PULL_THRESHOLD) * 180}deg)`;
    }
  }, { passive: true });

  document.addEventListener('touchend', async () => {
    if (pullDistance > PULL_THRESHOLD && !state.isRefreshing) {
      await triggerRefresh();
    } else {
      pullIndicator.classList.remove('is-pulling');
      pullIcon.style.transform = '';
    }
    pullDistance = 0;
    touchStartY  = 0;
  });

  async function triggerRefresh() {
    state.isRefreshing    = true;
    pullLabel.textContent = 'Refreshing…';
    pullIcon.classList.add('is-spinning');
    pullIcon.style.transform = '';

    // FUTURE: Re-fetch listing from Supabase here
    await new Promise(r => setTimeout(r, 1200));

    renderAll(PLACEHOLDER_LISTING, PLACEHOLDER_SELLER, PLACEHOLDER_SIMILAR);

    pullIcon.classList.remove('is-spinning');
    pullLabel.textContent = 'Up to date ✓';
    pullIcon.style.color  = 'var(--color-success)';

    setTimeout(() => {
      pullIndicator.classList.remove('is-pulling');
      pullIcon.style.color  = '';
      pullLabel.textContent = 'Pull to refresh';
      state.isRefreshing    = false;
    }, 900);
  }


  /* ==========================================================
     18. UTILITY HELPERS
  ========================================================== */

  function escapeHTML(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffDays = Math.floor((now - d) / 86400000);
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7)  return `${diffDays} days ago`;
      return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return 'Recently'; }
  }

  function buildStars(score) {
    const full  = Math.floor(score);
    const half  = score % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return [
      ...Array(full).fill('<i class="fa-solid fa-star"></i>'),
      ...Array(half).fill('<i class="fa-solid fa-star-half-stroke"></i>'),
      ...Array(empty).fill('<i class="fa-regular fa-star"></i>'),
    ].join('');
  }

  function showToast(message) {
    const existing = document.getElementById('jaraToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'jaraToast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', bottom: 'calc(76px + 16px)', left: '50%',
      transform: 'translateX(-50%) translateY(8px)',
      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
      borderRadius: '9999px', padding: '10px 20px',
      fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: '600',
      color: 'var(--color-text-primary)', zIndex: '200',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', transition: 'opacity 300ms ease, transform 300ms ease',
      opacity: '0', whiteSpace: 'nowrap',
    });
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity   = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity   = '0';
      toast.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(() => toast.remove(), 320);
    }, 2400);
  }

  backBtn.addEventListener('click', () => {
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = '../explore/index.html';
    }
  });


  /* ==========================================================
     19. RENDER ALL + INIT
  ========================================================== */

  function renderAll(listing, seller, similar) {
    buildGallery(listing.images, listing.emoji);
    renderListingHeader(listing);
    renderDescription(listing);
    renderSeller(seller);
    renderContact(seller, listing);
    renderLocation(listing);
    renderSimilar(similar);
  }

  async function init() {
    const { id, type } = getURLParams();
    state.listingId = id;

    /*
     FUTURE: If id is set, fetch the real listing:
       const { data: listing } = await window._supabase
         .from(type === 'service' ? 'services' : type === 'request' ? 'requests' : 'products')
         .select(`
           *, categories(name),
           profiles!owner_id(
             id, jara_id, full_name, business_name, avatar_url,
             is_verified, is_premium, whatsapp_number, phone_number, jara_points
           )
         `)
         .eq('id', id)
         .single();

       Then also increment the view_count:
         await window._supabase.rpc('increment_view_count', { listing_id: id, listing_type: type });

       FUTURE: Increment view count function in SQL:
         CREATE OR REPLACE FUNCTION increment_view_count(listing_id UUID, listing_type TEXT)
         RETURNS VOID AS $$
         BEGIN
           IF listing_type = 'product' THEN
             UPDATE products SET view_count = view_count + 1 WHERE id = listing_id;
           ELSIF listing_type = 'service' THEN
             UPDATE services SET view_count = view_count + 1 WHERE id = listing_id;
           END IF;
         END;
         $$ LANGUAGE plpgsql;
    */

    renderAll(PLACEHOLDER_LISTING, PLACEHOLDER_SELLER, PLACEHOLDER_SIMILAR);
    initTopbarScroll();
  }

  init();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
}); 

/* ============================================================
   JARA ∆ — Listing Detail Page  (listings-integrated)
   js/listing.js

   Depends on:
     - window._supabase    (supabase-client.js — loaded in <head>)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)
     - HTML IDs in listing/index.html

   All getElementById calls verified against listing/index.html.

   URL params:
     ?id=LISTING_ID  (required)
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     DOM REFS — every ID verified against listing/index.html
  ========================================================== */

  // Topbar
  const backBtn          = document.getElementById('backBtn');
  const saveBtn          = document.getElementById('saveBtn');
  const saveIcon         = document.getElementById('saveIcon');
  const shareTopBtn      = document.getElementById('shareTopBtn');
  const moreBtn          = document.getElementById('moreBtn');

  // Gallery
  const galleryTrack     = document.getElementById('galleryTrack');
  const galleryDots      = document.getElementById('galleryDots');
  const galleryTypeBadge = document.getElementById('galleryTypeBadge');
  const galSaveBtn       = document.getElementById('galSaveBtn');
  const galSaveIcon      = document.getElementById('galSaveIcon');
  const galShareBtn      = document.getElementById('galShareBtn');
  const gallerySkeleton  = document.getElementById('gallerySkeleton');

  // Listing info
  const listingCategory  = document.getElementById('listingCategory');
  const listingDate      = document.getElementById('listingDate');
  const listingViews     = document.getElementById('listingViews');
  const titleSkeleton    = document.getElementById('titleSkeleton');
  const listingTitle     = document.getElementById('listingTitle');
  const listingPrice     = document.getElementById('listingPrice');
  const listingPriceLabel= document.getElementById('listingPriceLabel');
  const listingStatus    = document.getElementById('listingStatus');
  const listingTags      = document.getElementById('listingTags');

  // Description
  const listingDescription = document.getElementById('listingDescription');
  const detailFeatures     = document.getElementById('detailFeatures');
  const readMoreBtn        = document.getElementById('readMoreBtn');

  // Seller card
  const sellerAvatarSkeleton = document.getElementById('sellerAvatarSkeleton');
  const sellerAvatarEl       = document.getElementById('sellerAvatarEl');
  const sellerSkeleton1      = document.getElementById('sellerSkeleton1');
  const sellerSkeleton2      = document.getElementById('sellerSkeleton2');
  const sellerName           = document.getElementById('sellerName');
  const sellerVerified       = document.getElementById('sellerVerified');
  const sellerSub            = document.getElementById('sellerSub');
  const sellerBadges         = document.getElementById('sellerBadges');
  const viewStoreBtn         = document.getElementById('viewStoreBtn');
  const contactSellerBtn     = document.getElementById('contactSellerBtn');

  // Contact options
  const waBtn          = document.getElementById('waBtn');
  const callBtn        = document.getElementById('callBtn');
  const copyPhoneBtn   = document.getElementById('copyPhoneBtn');
  const copyLinkBtn    = document.getElementById('copyLinkBtn');

  // Location
  const locationAddress  = document.getElementById('locationAddress');
  const locationDistance = document.getElementById('locationDistance');

  // Similar
  const similarStrip   = document.getElementById('similarStrip');

  // Sticky CTA
  const stickyPrice      = document.getElementById('stickyPrice');
  const stickyContactBtn = document.getElementById('stickyContactBtn');

  // More sheet
  const moreSheet         = document.getElementById('moreSheet');
  const moreSheetBackdrop = document.getElementById('moreSheetBackdrop');
  const sheetShare        = document.getElementById('sheetShare');
  const sheetSave         = document.getElementById('sheetSave');
  const sheetSaveLabel    = document.getElementById('sheetSaveLabel');
  const sheetCopyLink     = document.getElementById('sheetCopyLink');
  const sheetViewStore    = document.getElementById('sheetViewStore');
  const sheetReport       = document.getElementById('sheetReport');
  const sheetClose        = document.getElementById('sheetClose');

  // Report button
  const reportBtn      = document.getElementById('reportBtn');

  // URL param
  const params     = new URLSearchParams(window.location.search);
  const listingId  = params.get('id');

  // Track current listing
  let currentListing = null;
  let isSaved        = false;


  /* ==========================================================
     SKELETON HELPERS
  ========================================================== */

  function hideSkeletons() {
    if (gallerySkeleton)  gallerySkeleton.style.display  = 'none';
    if (titleSkeleton)    titleSkeleton.style.display    = 'none';
    if (sellerAvatarSkeleton) sellerAvatarSkeleton.style.display = 'none';
    if (sellerSkeleton1)  sellerSkeleton1.style.display  = 'none';
    if (sellerSkeleton2)  sellerSkeleton2.style.display  = 'none';

    listingTitle?.classList.remove('listing-title--hidden');
    listingPrice?.classList.remove('skeleton-pulse');
    listingCategory?.classList.remove('skeleton-pulse');
    sellerAvatarEl?.classList.remove('seller-avatar--hidden');
    sellerName?.classList.remove('seller-name--hidden');
    sellerSub?.classList.remove('seller-sub--hidden');
  }


  /* ==========================================================
     RENDER LISTING
  ========================================================== */

  function renderListing(listing) {
    currentListing = listing;

    const price = JARAListings.formatPrice(listing);
    const ago   = JARAListings.timeAgo(listing.created_at);
    const type  = listing.listing_type || '';

    document.title = `${listing.title} — JARA ∆`;

    /* ---- Meta row ---- */
    if (listingCategory) listingCategory.textContent = listing.category || '';
    if (listingDate)     listingDate.textContent     = ago;
    if (listingViews)    listingViews.textContent    = listing.view_count || 0;

    /* ---- Title ---- */
    if (listingTitle) listingTitle.textContent = listing.title || '';

    /* ---- Price ---- */
    if (listingPrice) {
      listingPrice.textContent = price;
      listingPrice.classList.remove('skeleton-pulse');
    }
    if (listingPriceLabel && listing.negotiable) {
      listingPriceLabel.textContent = 'Negotiable';
    }

    /* ---- Type badge in gallery ---- */
    if (galleryTypeBadge) {
      galleryTypeBadge.textContent =
        type.charAt(0).toUpperCase() + type.slice(1);
      galleryTypeBadge.className =
        `gallery__type-badge gallery__type-badge--${type}`;
    }

    /* ---- Tags (condition + type) ---- */
    if (listingTags) {
      const tags = [];
      if (listing.condition) {
        tags.push(`<span class="listing-tag listing-tag--${listing.condition}">
          ${listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
        </span>`);
      }
      if (type) {
        tags.push(`<span class="listing-tag listing-tag--type">${type}</span>`);
      }
      if (tags.length > 0) {
        listingTags.innerHTML = tags.join('');
        listingTags.removeAttribute('hidden');
      }
    }

    /* ---- Description ---- */
    if (listingDescription) {
      const desc = listing.description || 'No description provided.';
      listingDescription.textContent = desc;

      // Show read more if text is long
      if (desc.length > 200 && readMoreBtn) {
        listingDescription.style.webkitLineClamp = '4';
        listingDescription.style.overflow        = 'hidden';
        listingDescription.style.display         = '-webkit-box';
        listingDescription.style.webkitBoxOrient = 'vertical';
        readMoreBtn.removeAttribute('hidden');

        readMoreBtn.addEventListener('click', () => {
          listingDescription.style.webkitLineClamp = '';
          listingDescription.style.overflow        = '';
          listingDescription.style.display         = '';
          readMoreBtn.setAttribute('hidden', '');
        });
      }
    }

    /* ---- Detail features ---- */
    if (detailFeatures) {
      const features = [];
      if (listing.condition) {
        features.push(`<span class="detail-chip">
          <i class="fa-solid fa-tag" aria-hidden="true"></i>
          ${listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
        </span>`);
      }
      if (listing.location) {
        features.push(`<span class="detail-chip">
          <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
          ${esc(listing.location)}
        </span>`);
      }
      if (features.length > 0) {
        detailFeatures.innerHTML = features.join('');
        detailFeatures.removeAttribute('hidden');
      }
    }

    /* ---- Location ---- */
    if (locationAddress) {
      locationAddress.textContent =
        listing.location || 'Redeemer\'s University, Ede';
    }

    /* ---- Sticky CTA price ---- */
    if (stickyPrice) stickyPrice.textContent = price;
  }


  /* ==========================================================
     IMAGE GALLERY
     Uses galleryTrack for swipeable images and galleryDots
     for dot indicators.
  ========================================================== */

  function renderGallery(images) {
    if (!galleryTrack) return;

    galleryTrack.innerHTML = '';

    // Hide dots by default
    if (galleryDots) galleryDots.innerHTML = '';

    if (!images || images.length === 0) {
      const slide = document.createElement('div');
      slide.className = 'gallery-slide gallery-slide--placeholder';
      slide.setAttribute('role', 'listitem');
      slide.innerHTML = `<i class="fa-solid fa-image" aria-hidden="true"></i>`;
      galleryTrack.appendChild(slide);
      return;
    }

    // Build one slide per image
    images.forEach((url, i) => {
      const slide = document.createElement('div');
      slide.className = 'gallery-slide';
      slide.setAttribute('role', 'listitem');

      const img = document.createElement('img');
      img.src     = url;
      img.alt     = `Listing image ${i + 1}`;
      img.loading = i === 0 ? 'eager' : 'lazy';

      // Fade in when loaded
      img.addEventListener('load', () => img.classList.add('is-loaded'));
      if (img.complete) img.classList.add('is-loaded');

      slide.appendChild(img);
      galleryTrack.appendChild(slide);
    });

    // Build dot indicators
    if (galleryDots && images.length > 1) {
      galleryDots.innerHTML = '';
      galleryDots.removeAttribute('hidden');

      images.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = `gallery-dot${i === 0 ? ' is-active' : ''}`;
        dot.setAttribute('aria-label', `Image ${i + 1}`);
        galleryDots.appendChild(dot);
      });
    }

    // Wire up swipe
    initGallerySwipe(images.length);
  }

  /* ---- Gallery swipe controller ---- */
  function initGallerySwipe(total) {
    if (!galleryTrack || total <= 1) return;

    let current   = 0;
    let startX    = 0;
    let isDragging = false;

    function goToSlide(index) {
      current = Math.max(0, Math.min(index, total - 1));
      galleryTrack.style.transform = `translateX(-${current * 100}%)`;

      // Update dots
      galleryDots?.querySelectorAll('.gallery-dot').forEach((dot, i) => {
        dot.classList.toggle('is-active', i === current);
      });
    }

    // Touch events
    galleryTrack.addEventListener('touchstart', e => {
      startX     = e.touches[0].clientX;
      isDragging = true;
    }, { passive: true });

    galleryTrack.addEventListener('touchend', e => {
      if (!isDragging) return;
      isDragging = false;
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        goToSlide(diff > 0 ? current + 1 : current - 1);
      }
    }, { passive: true });

    // Mouse events (desktop)
    galleryTrack.addEventListener('mousedown', e => {
      startX     = e.clientX;
      isDragging = true;
    });

    galleryTrack.addEventListener('mouseup', e => {
      if (!isDragging) return;
      isDragging = false;
      const diff = startX - e.clientX;
      if (Math.abs(diff) > 50) {
        goToSlide(diff > 0 ? current + 1 : current - 1);
      }
    });

    galleryTrack.addEventListener('mouseleave', () => {
      isDragging = false;
    });
                                  }


  /* ==========================================================
     SELLER SECTION
  ========================================================== */

  function renderSeller(listing) {
    const seller    = listing.profiles || {};
    const name      = JARAListings.getSellerName(listing);
    const avatarUrl = seller.avatar_url || null;

    /* ---- Avatar ---- */
    if (sellerAvatarEl) {
      if (avatarUrl) {
        sellerAvatarEl.innerHTML = `
          <img
            src="${esc(avatarUrl)}"
            alt="${esc(name)}"
            style="width:100%;height:100%;object-fit:cover;border-radius:50%"
          />`;
      } else {
        sellerAvatarEl.textContent = getInitials(name);
      }
    }

    /* ---- Name ---- */
    if (sellerName) sellerName.textContent = name;

    /* ---- Verified ---- */
    if (sellerVerified) sellerVerified.hidden = !seller.is_verified;

    /* ---- Sub (school / account type) ---- */
    if (sellerSub) {
      const parts = [];
      if (seller.school)       parts.push(seller.school);
      if (seller.account_type) parts.push(
        seller.account_type.charAt(0).toUpperCase() + seller.account_type.slice(1)
      );
      sellerSub.textContent = parts.join(' · ');
    }

    /* ---- Badges ---- */
    if (sellerBadges) {
      const badges = [];
      if (JARAProfile.isFounder(seller)) {
        badges.push(`<span class="seller-badge seller-badge--founding">🏆 Founding</span>`);
      }
      if (JARAProfile.isPro(seller)) {
        badges.push(`<span class="seller-badge seller-badge--pro">
          <i class="fa-solid fa-crown" aria-hidden="true"></i> PRO
        </span>`);
      }
      if (badges.length > 0) {
        sellerBadges.innerHTML = badges.join('');
        sellerBadges.removeAttribute('hidden');
      }
    }

    /* ---- View store button ---- */
    if (viewStoreBtn && seller.id) {
      viewStoreBtn.href = `../store/index.html?id=${seller.id}`;
    }
    if (sheetViewStore && seller.id) {
      sheetViewStore.href = `../store/index.html?id=${seller.id}`;
    }

    /* ---- Contact buttons ---- */
    const wa    = seller.whatsapp || seller.phone || null;
    const phone = seller.phone    || null;
    const msg   = encodeURIComponent(
      `Hi, I saw your listing on JARA ∆: ${listing.title || ''}`
    );

    if (waBtn) {
      if (wa) {
        const num = wa.replace(/\D/g, '');
        waBtn.href = `https://wa.me/${num}?text=${msg}`;
      } else {
        waBtn.style.display = 'none';
      }
    }

    if (callBtn) {
      if (phone) {
        callBtn.href = `tel:${phone}`;
      } else {
        callBtn.style.display = 'none';
      }
    }

    if (contactSellerBtn) {
      if (wa) {
        const num = wa.replace(/\D/g, '');
        contactSellerBtn.href = `https://wa.me/${num}?text=${msg}`;
      } else {
        contactSellerBtn.style.display = 'none';
      }
    }

    if (stickyContactBtn) {
      if (wa) {
        const num = wa.replace(/\D/g, '');
        stickyContactBtn.href = `https://wa.me/${num}?text=${msg}`;
      } else {
        stickyContactBtn.textContent = 'No contact info';
        stickyContactBtn.style.pointerEvents = 'none';
        stickyContactBtn.style.opacity = '0.5';
      }
    }

    /* ---- Copy phone ---- */
    if (copyPhoneBtn) {
      if (phone) {
        copyPhoneBtn.addEventListener('click', () => {
          navigator.clipboard?.writeText(phone).then(() => {
            window.jaraToast?.('Phone number copied!');
          });
        });
      } else {
        copyPhoneBtn.style.display = 'none';
      }
    }
  }


  /* ==========================================================
     COPY LINK
  ========================================================== */

  function handleCopyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      window.jaraToast?.('Listing link copied!');
    });
  }

  copyLinkBtn?.addEventListener('click', handleCopyLink);
  sheetCopyLink?.addEventListener('click', handleCopyLink);


  /* ==========================================================
     SHARE
  ========================================================== */

  function handleShare() {
    const title = currentListing?.title || 'JARA Listing';
    if (navigator.share) {
      navigator.share({
        title: title + ' — JARA ∆',
        text:  'Check out this listing on JARA — the campus marketplace.',
        url:   window.location.href,
      }).catch(() => {});
    } else {
      handleCopyLink();
    }
  }

  shareTopBtn?.addEventListener('click', handleShare);
  galShareBtn?.addEventListener('click', handleShare);
  sheetShare?.addEventListener('click',  handleShare);


  /* ==========================================================
     SAVE / BOOKMARK
  ========================================================== */

  function toggleSave() {
    isSaved = !isSaved;

    const iconClass = isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark';
    if (saveIcon)    saveIcon.className    = iconClass + ' ' + saveIcon.className.split(' ').slice(1).join(' ');
    if (galSaveIcon) galSaveIcon.className = iconClass + ' ' + galSaveIcon.className.split(' ').slice(1).join(' ');
    if (sheetSaveLabel) sheetSaveLabel.textContent = isSaved ? 'Saved' : 'Save Listing';

    saveBtn?.setAttribute('aria-pressed', String(isSaved));
    galSaveBtn?.setAttribute('aria-pressed', String(isSaved));

    window.jaraToast?.(isSaved ? 'Listing saved!' : 'Listing removed from saved.');

    /*
     FUTURE: INSERT INTO favorites (user_id, listing_id)
             VALUES (auth.uid(), listingId)
             ON CONFLICT DO NOTHING
             -- or DELETE if unsaving
    */
  }

  saveBtn?.addEventListener('click',    toggleSave);
  galSaveBtn?.addEventListener('click', toggleSave);
  sheetSave?.addEventListener('click',  toggleSave);


  /* ==========================================================
     MORE OPTIONS SHEET
  ========================================================== */

  function openMoreSheet() {
    moreSheet?.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeMoreSheet() {
    moreSheet?.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  moreBtn?.addEventListener('click', openMoreSheet);
  moreSheetBackdrop?.addEventListener('click', closeMoreSheet);
  sheetClose?.addEventListener('click', closeMoreSheet);


  /* ==========================================================
     REPORT
  ========================================================== */

  function handleReport() {
    closeMoreSheet();
    window.jaraToast?.('Report submitted. Thank you for keeping JARA safe.');
    /*
     FUTURE: INSERT INTO reports (reporter_id, listing_id, reason)
             VALUES (auth.uid(), listingId, 'user_report')
    */
  }

  reportBtn?.addEventListener('click', handleReport);
  sheetReport?.addEventListener('click', handleReport);


  /* ==========================================================
     BACK BUTTON
  ========================================================== */

  backBtn?.addEventListener('click', () => {
    if (history.length > 1) history.back();
    else window.location.replace('../explore/index.html');
  });


  /* ==========================================================
     SIMILAR LISTINGS
  ========================================================== */

  async function loadSimilarListings(listing) {
    if (!similarStrip) return;

    try {
      const { data, error } = await JARAListings.fetch({
        category:  listing.category,
        type:      listing.listing_type,
        limit:     6,
        offset:    0,
        status:    'active',
      });

      if (error || !data) {
        similarStrip.closest('section')?.setAttribute('hidden', '');
        return;
      }

      const filtered = data.filter(l => l.id !== listing.id).slice(0, 4);

      if (filtered.length === 0) {
        similarStrip.closest('section')?.setAttribute('hidden', '');
        return;
      }

      similarStrip.innerHTML = '';

      filtered.forEach(l => {
        const cover = JARAListings.getCoverImage(l);
        const price = JARAListings.formatPrice(l);
        const card  = document.createElement('a');
        card.className = 'similar-card j-card';
        card.href      = `../listing/index.html?id=${esc(l.id)}`;
        card.setAttribute('role', 'listitem');
        card.innerHTML = `
          <div class="similar-card__img-wrap">
   ${cover
              ? `<img
                   class="similar-card__img"
                   src="${esc(cover)}"
                   alt="${esc(l.title)}"
                   loading="lazy"
                 />`
              : `<div class="similar-card__img similar-card__img--placeholder" aria-hidden="true">
                   <i class="fa-solid fa-image"></i>
                 </div>`
            }
          </div>
          <p class="similar-card__title">${esc(l.title)}</p>
          <p class="similar-card__price">${esc(price)}</p>
        `;
        similarStrip.appendChild(card);
      });

    } catch (err) {
      console.error('Similar listings error:', err.message);
      similarStrip.closest('section')?.setAttribute('hidden', '');
    }
  }


  /* ==========================================================
     ERROR STATE
  ========================================================== */

  function showError(msg) {
    hideSkeletons();
    const main = document.getElementById('listingPage');
    if (window.jaraError && main) {
      window.jaraError(main, {
        title:   msg || "Couldn't load this listing",
        body:    'Please check your connection or go back and try again.',
        onRetry: () => window.location.reload(),
      });
    }
  }


  /* ==========================================================
     UTILITIES
  ========================================================== */

  function esc(str) {
    if (!str && str !== 0) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    if (!listingId) {
      showError('No listing ID in URL.');
      return;
    }

    // Reveal page (public page — guests can view)
    document.body.style.visibility = '';
    document.body.style.opacity    = '';

    try {
      const { data: listing, error } = await JARAListings.fetchOne(listingId);

      if (error || !listing) {
        hideSkeletons();
        showError();
        return;
      }

      hideSkeletons();
      renderListing(listing);
      renderGallery(listing.images || []);
      renderSeller(listing);
      await loadSimilarListings(listing);

      /*
       FUTURE: Check if this listing is saved by the current user:
         const { data } = await window._supabase
           .from('favorites')
           .select('id')
           .eq('user_id', auth.uid())
           .eq('listing_id', listingId)
           .single();
         if (data) toggleSave();
      */

    } catch (err) {
      console.error('Listing page init error:', err.message);
      hideSkeletons();
      showError();
    }
  }

  init();

});

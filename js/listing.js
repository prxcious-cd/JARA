/* ============================================================
   JARA ∆ — Listing Detail Page  (listings-integrated)
   js/listing.js

   Loads a single listing from Supabase by ID.
   Public page — guests can view, auth users can save/contact.

   Depends on:
     - window._supabase    (supabase-client.js)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)

   URL params:
     ?id=LISTING_ID  (required)

   TABLE OF CONTENTS
   1.  DOM refs
   2.  Render listing
   3.  Image gallery
   4.  Seller section
   5.  Owner actions (edit / delete)
   6.  Similar listings
   7.  Error state
   8.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     1. DOM REFS
  ========================================================== */

  const listingTitle    = document.getElementById('listingTitle');
  const listingPrice    = document.getElementById('listingPrice');
  const listingNeg      = document.getElementById('listingNegotiable');
  const listingDesc     = document.getElementById('listingDesc');
  const listingCategory = document.getElementById('listingCategory');
  const listingType     = document.getElementById('listingType');
  const listingCondition= document.getElementById('listingCondition');
  const listingLocation = document.getElementById('listingLocation');
  const listingTime     = document.getElementById('listingTime');
  const imageGallery    = document.getElementById('listingImageGallery');
  const mainImage       = document.getElementById('listingMainImage');
  const mainImageWrap   = document.getElementById('listingMainImageWrap');
  const thumbsRow       = document.getElementById('listingThumbs');

  const sellerName      = document.getElementById('listingSellerName');
  const sellerAvatar    = document.getElementById('listingSellerAvatar');
  const sellerInitials  = document.getElementById('listingSellerInitials');
  const sellerSchool    = document.getElementById('listingSellerSchool');
  const sellerVerified  = document.getElementById('listingSellerVerified');
  const sellerPro       = document.getElementById('listingSellerPro');
  const sellerFounding  = document.getElementById('listingSellerFounding');
  const sellerStoreLink = document.getElementById('listingSellerStoreLink');
  const whatsappBtn     = document.getElementById('listingWhatsappBtn');
  const phoneBtn        = document.getElementById('listingPhoneBtn');

  const editBtn         = document.getElementById('listingEditBtn');
  const deleteBtn       = document.getElementById('listingDeleteBtn');
  const similarGrid     = document.getElementById('similarListingsGrid');
  const errorWrap       = document.getElementById('listingError');

  const params      = new URLSearchParams(window.location.search);
  const listingId   = params.get('id');


  /* ==========================================================
     2. RENDER LISTING
  ========================================================== */

  function renderListing(listing) {
    const price = JARAListings.formatPrice(listing);
    const ago   = JARAListings.timeAgo(listing.created_at);

    document.title = `${listing.title} — JARA ∆`;

    if (listingTitle)     listingTitle.textContent    = listing.title        || '';
    if (listingPrice)     listingPrice.textContent    = price;
    if (listingNeg)       listingNeg.hidden            = !listing.negotiable;
    if (listingDesc)      listingDesc.textContent      = listing.description  || '';
    if (listingCategory)  listingCategory.textContent  = listing.category     || '';
    if (listingCondition) listingCondition.textContent = listing.condition    || '';
    if (listingLocation)  listingLocation.textContent  = listing.location     || '';
    if (listingTime)      listingTime.textContent      = ago;

    if (listingType) {
      const t = listing.listing_type || '';
      listingType.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    }
  }


  /* ==========================================================
     3. IMAGE GALLERY
  ========================================================== */

  function renderGallery(images) {
    if (!images || images.length === 0) {
      if (mainImageWrap) {
        mainImageWrap.innerHTML = `
          <div class="listing-img-placeholder" aria-hidden="true">
            <i class="fa-solid fa-image"></i>
          </div>`;
      }
      return;
    }

    // Main image
    if (mainImage) {
      mainImage.src = images[0];
      mainImage.alt = 'Listing image';
      mainImage.removeAttribute('hidden');
    }

    // Thumbnails
    if (thumbsRow && images.length > 1) {
      thumbsRow.innerHTML = '';
      images.forEach((url, i) => {
        const thumb = document.createElement('button');
        thumb.type      = 'button';
        thumb.className = `listing-thumb${i === 0 ? ' listing-thumb--active' : ''}`;
        thumb.innerHTML = `<img src="${esc(url)}" alt="Image ${i + 1}" loading="lazy" />`;
        thumb.addEventListener('click', () => {
          if (mainImage) mainImage.src = url;
          thumbsRow.querySelectorAll('.listing-thumb').forEach(t => t.classList.remove('listing-thumb--active'));
          thumb.classList.add('listing-thumb--active');
        });
        thumbsRow.appendChild(thumb);
      });
      thumbsRow.removeAttribute('hidden');
    }
  }


  /* ==========================================================
     4. SELLER SECTION
  ========================================================== */

  function renderSeller(listing) {
    const seller     = listing.profiles || {};
    const name       = JARAListings.getSellerName(listing);
    const avatarUrl  = seller.avatar_url || null;

    if (sellerName) sellerName.textContent = name;

    if (avatarUrl && sellerAvatar) {
      sellerAvatar.src = avatarUrl;
      sellerAvatar.alt = name;
      sellerAvatar.removeAttribute('hidden');
      if (sellerInitials) sellerInitials.setAttribute('hidden', '');
    } else if (sellerInitials) {
      sellerInitials.textContent = getInitials(name);
      sellerInitials.removeAttribute('hidden');
      if (sellerAvatar) sellerAvatar.setAttribute('hidden', '');
    }

    if (sellerSchool)   { sellerSchool.textContent = seller.school || ''; sellerSchool.hidden = !seller.school; }
    if (sellerVerified)   sellerVerified.hidden = !seller.is_verified;
    if (sellerPro)        sellerPro.hidden       = !JARAProfile.isPro(seller);
    if (sellerFounding)   sellerFounding.hidden  = !JARAProfile.isFounder(seller);

    if (sellerStoreLink) {
      sellerStoreLink.href = `../store/index.html?id=${seller.id}`;
    }

    // WhatsApp contact
    if (whatsappBtn) {
      if (seller.whatsapp) {
        const num = seller.whatsapp.replace(/\D/g, '');
        whatsappBtn.href = `https://wa.me/${num}?text=${encodeURIComponent('Hi, I saw your listing on JARA: ' + (listing.title || ''))}`;
        whatsappBtn.removeAttribute('hidden');
      } else {
        whatsappBtn.setAttribute('hidden', '');
      }
    }

    // Phone contact
    if (phoneBtn) {
      if (seller.phone) {
        phoneBtn.href = `tel:${seller.phone}`;
        phoneBtn.removeAttribute('hidden');
      } else {
        phoneBtn.setAttribute('hidden', '');
      }
    }
  }


  /* ==========================================================
     5. OWNER ACTIONS
  ========================================================== */

  async function applyOwnerActions(listing) {
    const owned = await JARAListings.isOwner(listing);
    if (!owned) return;

    if (editBtn) {
      editBtn.href = `../sell/index.html?edit=${listing.id}`;
      editBtn.removeAttribute('hidden');
    }

    if (deleteBtn) {
      deleteBtn.removeAttribute('hidden');
      deleteBtn.addEventListener('click', async () => {
        const confirmed = window.confirm('Delete this listing? This cannot be undone.');
        if (!confirmed) return;
        deleteBtn.disabled    = true;
        deleteBtn.textContent = 'Deleting…';
        const { error } = await JARAListings.remove(listing.id);
        if (error) {
          deleteBtn.disabled    = false;
          deleteBtn.textContent = 'Delete';
          window.jaraToast?.('Delete failed. Please try again.');
          return;
        }
        window.location.replace('../store/index.html');
      });
    }
  }


  /* ==========================================================
     6. SIMILAR LISTINGS
  ========================================================== */

  async function loadSimilarListings(listing) {
    if (!similarGrid) return;

    const { data, error } = await JARAListings.fetch({
      category:  listing.category,
      type:      listing.listing_type,
      limit:     4,
      offset:    0,
      status:    'active',
    });

    if (error || !data) return;

    // Exclude the current listing
    const filtered = data.filter(l => l.id !== listing.id).slice(0, 3);
    if (filtered.length === 0) {
      similarGrid.closest('section')?.setAttribute('hidden', '');
      return;
    }

    similarGrid.innerHTML = '';
    filtered.forEach(l => {
      const cover = JARAListings.getCoverImage(l);
      const price = JARAListings.formatPrice(l);
      const card  = document.createElement('a');
      card.className = 'similar-card j-card';
      card.href      = `../listing/index.html?id=${l.id}`;
      card.innerHTML = `
        ${cover
          ? `<img class="similar-card__img" src="${esc(cover)}"
                  alt="${esc(l.title)}" loading="lazy" />`
          : `<div class="similar-card__img similar-card__img--placeholder" aria-hidden="true">
               <i class="fa-solid fa-image"></i>
             </div>`
        }
        <p class="similar-card__title">${esc(l.title)}</p>
        <p class="similar-card__price">${esc(price)}</p>
      `;
      similarGrid.appendChild(card);
    });
  }


  /* ==========================================================
     7. ERROR STATE
  ========================================================== */

  function showError(msg) {
    if (errorWrap) {
      errorWrap.removeAttribute('hidden');
      return;
    }
    if (window.jaraError) {
      window.jaraError(document.querySelector('main') || document.body, {
        title:   msg || "Couldn't load this listing",
        body:    'Please check your connection or go back and try again.',
        onRetry: () => window.location.reload(),
      });
    }
  }


  /* ==========================================================
     8. INIT
  ========================================================== */

  async function init() {
    if (!listingId) {
      showError('No listing ID provided.');
      return;
    }

    // Skeletons
    [listingTitle, listingPrice, listingDesc].forEach(el => el?.classList.add('j-skel'));

    try {
      const { data: listing, error } = await JARAListings.fetchOne(listingId);

      [listingTitle, listingPrice, listingDesc].forEach(el => el?.classList.remove('j-skel'));

      if (error || !listing) {
        showError();
        return;
      }

      renderListing(listing);
      renderGallery(listing.images || []);
      renderSeller(listing);
      await applyOwnerActions(listing);
      await loadSimilarListings(listing);

    } catch (err) {
      console.error('Listing page init error:', err.message);
      [listingTitle, listingPrice, listingDesc].forEach(el => el?.classList.remove('j-skel'));
      showError();
    }
  }

  init();

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

});

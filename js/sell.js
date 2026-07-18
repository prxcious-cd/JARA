/* ============================================================
   JARA ∆ — Create Listing Wizard  (sell-integrated)
   js/sell.js

   Drives the 3-step create listing flow in sell/index.html.

   Step 1 — Choose type (product / service / request)
   Step 2 — Fill details (title, category, description,
             photos, location, price, availability)
   Step 3 — Preview then publish to Supabase

   Depends on:
     - window._supabase    (supabase-client.js — in <head>)
     - window.JARAAuth     (auth-guard.js)
     - window.JARAProfile  (jara-profile.js)
     - window.JARAListings (jara-listings.js)
     - HTML IDs in sell/index.html

   All IDs verified against sell/index.html.
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    step:          1,
    listingType:   null,      // 'product' | 'service' | 'request'
    title:         '',
    category:      '',
    description:   '',
    tags:          [],
    photos:        [],        // File objects
    location:      '',
    priceType:     null,      // 'fixed' | 'negotiable' | 'free' | 'contact' | 'quote'
    priceAmount:   null,
    availability:  'available',
    profile:       null,
    isLoading:     false,
  };

  /* ==========================================================
     CATEGORIES — loaded from Supabase or fallback static list
  ========================================================== */

  const STATIC_CATEGORIES = [
    'Books & Stationery',
    'Food & Drinks',
    'Tech & Repairs',
    'Personal Care',
    'Creative Services',
    'Laundry & Errands',
    'Tutoring',
    'Hostel & Home',
    'Power & Generator',
    'Fashion & Clothing',
    'Health & Wellness',
    'Transport',
    'Other',
  ];

  /* ==========================================================
     DOM REFS — every ID verified against sell/index.html
  ========================================================== */

  // Topbar
  const topbarBack      = document.getElementById('topbarBack');
  const topbarTitle     = document.getElementById('topbarTitle');
  const topbarStepBadge = document.getElementById('topbarStepBadge');
  const topbarStepText  = document.getElementById('topbarStepText');

  // Progress
  const sellProgress    = document.getElementById('sellProgress');
  const progressFill    = document.getElementById('progressFill');

  // Steps
  const step1           = document.getElementById('step1');
  const step2           = document.getElementById('step2');
  const step3           = document.getElementById('step3');

  // Step 1
  const typeCards       = document.querySelectorAll('.type-card');
  const step1Next       = document.getElementById('step1Next');
  const typeError       = document.getElementById('typeError');

  // Step 2
  const step2Alert      = document.getElementById('step2Alert');
  const step2AlertText  = document.getElementById('step2AlertText');
  const postTitle       = document.getElementById('postTitle');
  const titleCharCount  = document.getElementById('titleCharCount');
  const postCategory    = document.getElementById('postCategory');
  const postDescription = document.getElementById('postDescription');
  const descCharCount   = document.getElementById('descriptionCharCount');
  const tagInput        = document.getElementById('tagInput');
  const tagsDisplay     = document.getElementById('tagsDisplay');
  const photoGrid       = document.getElementById('photoGrid');
  const locationManual  = document.getElementById('locationManual');
  const locationStatus  = document.getElementById('locationStatus');
  const useLocationBtn  = document.getElementById('useLocationBtn');
  const priceTypeGroup  = document.getElementById('priceTypeGroup');
  const priceAmountWrap = document.getElementById('priceAmountWrap');
  const priceAmount     = document.getElementById('priceAmount');
  const statusGroup     = document.getElementById('statusGroup');
  const step2Back       = document.getElementById('step2Back');
  const step2Next       = document.getElementById('step2Next');
  const step2Eyebrow    = document.getElementById('step2Eyebrow');

  // Step 3 — preview
  const previewTitle        = document.getElementById('previewTitle');
  const previewDescription  = document.getElementById('previewDescription');
  const previewPrice        = document.getElementById('previewPrice');
  const previewLocationText = document.getElementById('previewLocationText');
  const previewTypeBadge    = document.getElementById('previewTypeBadge');
  const previewStatusBadge  = document.getElementById('previewStatusBadge');
  const previewTags         = document.getElementById('previewTags');
  const previewAvatar       = document.getElementById('previewAvatar');
  const previewSellerName   = document.getElementById('previewSellerName');
  const previewSellerType   = document.getElementById('previewSellerType');
  const previewWhatsapp     = document.getElementById('previewWhatsapp');
  const previewPhotos       = document.getElementById('previewPhotos');
  const publishError        = document.getElementById('publishError');
  const publishErrorText    = document.getElementById('publishErrorText');
  const createAnotherBtn    = document.getElementById('createAnotherBtn');


  /* ==========================================================
     STEP NAVIGATION
  ========================================================== */

  const STEPS    = [step1, step2, step3];
  const TOTAL    = 3;
  const PROGRESS = [0, 33, 66, 100]; // % fill per step

  function goToStep(n) {
    S.step = n;

    // Show / hide steps
    STEPS.forEach((el, i) => {
      if (!el) return;
      if (i + 1 === n) {
        el.removeAttribute('hidden');
        el.classList.add('sell-step--active');
      } else {
        el.setAttribute('hidden', '');
        el.classList.remove('sell-step--active');
      }
    });

    // Topbar
    if (topbarBack) {
      if (n > 1) topbarBack.removeAttribute('hidden');
      else topbarBack.setAttribute('hidden', '');
    }

    const titles = ['Create', 'Details', 'Preview'];
    if (topbarTitle) topbarTitle.textContent = titles[n - 1] || 'Create';

    if (topbarStepBadge && topbarStepText) {
      if (n > 1) {
        topbarStepBadge.removeAttribute('hidden');
        topbarStepText.textContent = `Step ${n} of ${TOTAL}`;
      } else {
        topbarStepBadge.setAttribute('hidden', '');
      }
    }

    // Progress bar
    if (sellProgress && progressFill) {
      if (n > 1) {
        sellProgress.removeAttribute('hidden');
        progressFill.style.width = PROGRESS[n] + '%';
      } else {
        sellProgress.setAttribute('hidden', '');
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Topbar back button
  topbarBack?.addEventListener('click', () => {
    if (S.step > 1) goToStep(S.step - 1);
  });


  /* ==========================================================
     STEP 1 — TYPE SELECTION
  ========================================================== */

  // Type card selection
  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      // Deselect all
      typeCards.forEach(c => {
        c.classList.remove('type-card--selected');
        c.setAttribute('aria-checked', 'false');
      });

      // Select this one
      card.classList.add('type-card--selected');
      card.setAttribute('aria-checked', 'true');
      S.listingType = card.dataset.type;

      // Hide error if shown
      if (typeError) typeError.setAttribute('hidden', '');
    });
  });

  // Step 1 → Step 2
  step1Next?.addEventListener('click', () => {
    if (!S.listingType) {
      if (typeError) typeError.removeAttribute('hidden');
      return;
    }

    // Update step 2 heading based on type
    if (step2Eyebrow) {
      const labels = {
        product: 'Product details',
        service: 'Service details',
        request: 'Request details',
      };
      step2Eyebrow.textContent = labels[S.listingType] || 'Details';
    }

    goToStep(2);
  });


  /* ==========================================================
     STEP 2 — DETAILS
  ========================================================== */

  /* ---- Populate category dropdown ---- */
  async function loadCategories() {
    if (!postCategory) return;

    // Keep the placeholder option
    postCategory.innerHTML = '<option value="" disabled selected>Select a category</option>';

    let categories = STATIC_CATEGORIES;

    /*
     FUTURE: Load from Supabase categories table:
       const { data } = await window._supabase
         .from('categories')
         .select('name')
         .order('name');
       if (data && data.length > 0) {
         categories = data.map(c => c.name);
       }
    */

    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value       = cat;
      opt.textContent = cat;
      postCategory.appendChild(opt);
    });
  }

  /* ---- Character counters ---- */
  postTitle?.addEventListener('input', () => {
    const len = postTitle.value.length;
    if (titleCharCount) titleCharCount.textContent = `${len} / 120`;
    S.title = postTitle.value.trim();
    hideStep2Alert();
  });

  postDescription?.addEventListener('input', () => {
    const len = postDescription.value.length;
    if (descCharCount) descCharCount.textContent = `${len} / 2000`;
    hideStep2Alert();
  });

  /* ---- Tags ---- */
  const MAX_TAGS = 10;

  function addTag(value) {
    const tag = value.trim().replace(/,+$/, '').trim();
    if (!tag || S.tags.includes(tag) || S.tags.length >= MAX_TAGS) return;
    S.tags.push(tag);
    renderTags();
  }

  function renderTags() {
    if (!tagsDisplay) return;
    tagsDisplay.innerHTML = '';
    S.tags.forEach((tag, i) => {
      const chip = document.createElement('span');
      chip.className = 'tag-chip';
      chip.innerHTML = `
        ${esc(tag)}
        <button type="button" aria-label="Remove tag ${esc(tag)}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      chip.querySelector('button').addEventListener('click', () => {
        S.tags.splice(i, 1);
        renderTags();
      });
      tagsDisplay.appendChild(chip);
    });
  }

  tagInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.value);
      tagInput.value = '';
    }
  });

  tagInput?.addEventListener('blur', () => {
    if (tagInput.value.trim()) {
      addTag(tagInput.value);
      tagInput.value = '';
    }
  });

  /* ---- Photo grid ---- */
  const MAX_PHOTOS = 5;

  function buildPhotoGrid() {
    if (!photoGrid) return;
    photoGrid.innerHTML = '';

    // Filled slots
    S.photos.forEach((file, i) => {
      const url  = URL.createObjectURL(file);
      const slot = document.createElement('div');
      slot.className = 'photo-slot photo-slot--filled';
      slot.innerHTML = `
        <img src="${url}" alt="Photo ${i + 1}" class="photo-slot__img" />
        <button type="button" class="photo-slot__remove" aria-label="Remove photo ${i + 1}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      slot.querySelector('.photo-slot__remove').addEventListener('click', () => {
        S.photos.splice(i, 1);
        buildPhotoGrid();
      });
      photoGrid.appendChild(slot);
    });

    // Add slot (if under limit)
    if (S.photos.length < MAX_PHOTOS) {
      const addSlot = document.createElement('label');
      addSlot.className = 'photo-slot photo-slot--add';
      addSlot.setAttribute('aria-label', 'Add photo');
      addSlot.innerHTML = `
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>Add photo</span>
        <input type="file" accept="image/jpeg,image/png,image/webp"
               class="photo-slot__input" multiple aria-hidden="true" />
      `;
      addSlot.querySelector('input').addEventListener('change', e => {
        const files   = Array.from(e.target.files || []);
        const allowed = MAX_PHOTOS - S.photos.length;
        const valid   = files.slice(0, allowed).filter(f => f.size <= 10 * 1024 * 1024);
        S.photos = [...S.photos, ...valid];
        buildPhotoGrid();
        e.target.value = '';
      });
      photoGrid.appendChild(addSlot);
    }
  }

  /* ---- Location ---- */
  useLocationBtn?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      if (locationStatus) {
        locationStatus.textContent = 'Location not supported by your browser.';
        locationStatus.removeAttribute('hidden');
      }
      return;
    }

    if (locationStatus) {
      locationStatus.textContent = 'Getting your location…';
      locationStatus.removeAttribute('hidden');
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        S.location = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        if (locationManual) locationManual.value = 'Current location detected';
        if (locationStatus) {
          locationStatus.textContent = '✓ Location set';
        }
      },
      () => {
        if (locationStatus) {
          locationStatus.textContent = 'Could not detect location. Enter it manually.';
        }
      }
    );
  });

  locationManual?.addEventListener('input', () => {
    S.location = locationManual.value.trim();
  });

  /* ---- Price type chips ---- */
  const priceChips = document.querySelectorAll('.price-chip');

  priceChips.forEach(chip => {
    chip.addEventListener('click', () => {
      priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
      chip.setAttribute('aria-checked', 'true');
      S.priceType = chip.dataset.price;

      // Show amount input only for fixed price
      if (priceAmountWrap) {
        priceAmountWrap.hidden = S.priceType !== 'fixed';
      }
      hideStep2Alert();
    });
  });

  priceAmount?.addEventListener('input', () => {
    S.priceAmount = parseFloat(priceAmount.value) || null;
  });

  /* ---- Availability chips ---- */
  const statusChips = document.querySelectorAll('.status-chip');

  statusChips.forEach(chip => {
    chip.addEventListener('click', () => {
      statusChips.forEach(c => c.setAttribute('aria-checked', 'false'));
      chip.setAttribute('aria-checked', 'true');
      S.availability = chip.dataset.status;
    });
  });

  /* ---- Step 2 alert helpers ---- */
  function showStep2Alert(msg) {
    if (!step2Alert || !step2AlertText) return;
    step2AlertText.textContent = msg;
    step2Alert.removeAttribute('hidden');
    step2Alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStep2Alert() {
    step2Alert?.setAttribute('hidden', '');
  }

  /* ---- Step 2 validation ---- */
  function validateStep2() {
    const title = postTitle?.value.trim() || '';
    const cat   = postCategory?.value    || '';
    const desc  = postDescription?.value.trim() || '';

    if (!title) {
      showStep2Alert('Please add a title for your listing.');
      postTitle?.focus();
      return false;
    }
    if (title.length < 3) {
      showStep2Alert('Title must be at least 3 characters.');
      postTitle?.focus();
      return false;
    }
    if (!cat) {
      showStep2Alert('Please select a category.');
      postCategory?.focus();
      return false;
    }
    if (!desc) {
      showStep2Alert('Please add a description.');
      postDescription?.focus();
      return false;
    }
    if (!S.priceType) {
      showStep2Alert('Please select a price type.');
      priceTypeGroup?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return false;
    }
    if (S.priceType === 'fixed' && !S.priceAmount) {
      showStep2Alert('Please enter a price amount.');
      priceAmount?.focus();
      return false;
    }
    return true;
  }

  /* ---- Step 2 Back ---- */
  step2Back?.addEventListener('click', () => goToStep(1));

  /* ---- Step 2 Next → Preview ---- */
  step2Next?.addEventListener('click', () => {
    hideStep2Alert();

    // Collect current field values into state
    S.title       = postTitle?.value.trim()       || '';
    S.category    = postCategory?.value           || '';
    S.description = postDescription?.value.trim() || '';
    S.location    = locationManual?.value.trim()  || S.location;

    if (!validateStep2()) return;

    buildPreview();
    goToStep(3);
  });


  /* ==========================================================
     STEP 3 — PREVIEW + PUBLISH
  ========================================================== */

  function buildPreview() {
    /* ---- Photos ---- */
    if (previewPhotos) {
      if (S.photos.length > 0) {
        previewPhotos.innerHTML = '';
        const img = document.createElement('img');
        img.src       = URL.createObjectURL(S.photos[0]);
        img.alt       = 'Listing photo';
        img.className = 'preview-card__photo';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:16px 16px 0 0';
        previewPhotos.appendChild(img);
      } else {
        previewPhotos.innerHTML = `
          <div class="preview-card__photo-placeholder" aria-hidden="true">
            <i class="fa-solid fa-image"></i>
          </div>`;
      }
    }

    /* ---- Badges ---- */
    if (previewTypeBadge) {
      const labels = { product: 'Product', service: 'Service', request: 'Request' };
      previewTypeBadge.textContent = labels[S.listingType] || S.listingType;
    }
    if (previewStatusBadge) {
      const labels = {
        available: 'Available', busy: 'Busy',
        out_of_stock: 'Out of Stock', coming_soon: 'Coming Soon',
      };
      previewStatusBadge.textContent = labels[S.availability] || S.availability;
    }

    /* ---- Content ---- */
    if (previewTitle)       previewTitle.textContent       = S.title       || 'Your title';
    if (previewDescription) previewDescription.textContent = S.description || 'Your description';

    /* ---- Price ---- */
    if (previewPrice) {
      if (S.priceType === 'fixed' && S.priceAmount) {
        previewPrice.textContent = '₦' + Number(S.priceAmount).toLocaleString('en-NG');
      } else if (S.priceType === 'free') {
        previewPrice.textContent = 'Free';
      } else if (S.priceType === 'negotiable') {
        previewPrice.textContent = 'Negotiable';
      } else if (S.priceType === 'contact') {
        previewPrice.textContent = 'Contact for price';
      } else if (S.priceType === 'quote') {
        previewPrice.textContent = 'Request a quote';
      } else {
        previewPrice.textContent = '—';
      }
    }

    /* ---- Location ---- */
    if (previewLocationText) {
      previewLocationText.textContent = S.location || 'Location not set';
    }

    /* ---- Tags ---- */
    if (previewTags) {
      if (S.tags.length > 0) {
        previewTags.innerHTML = S.tags
          .map(t => `<span class="preview-tag">#${esc(t)}</span>`)
          .join('');
        previewTags.removeAttribute('hidden');
      } else {
        previewTags.setAttribute('hidden', '');
      }
    }

    /* ---- Seller info from profile ---- */
    if (S.profile) {
      const name = JARAProfile.getDisplayName(S.profile) || 'You';
      if (previewSellerName) previewSellerName.textContent = name;
      if (previewAvatar)     previewAvatar.textContent     = JARAProfile.getInitials(S.profile);
      if (previewSellerType) {
        previewSellerType.textContent =
          S.profile.account_type
            ? S.profile.account_type.charAt(0).toUpperCase() + S.profile.account_type.slice(1)
            : 'Member';
      }
      if (previewWhatsapp && S.profile.whatsapp) {
        const num = S.profile.whatsapp.replace(/\D/g, '');
        previewWhatsapp.href = `https://wa.me/${num}`;
      }
                   }
                     
    /* ---- Wire up publish button ---- */
    // Remove any previous listener by replacing the element
    const oldPublishBtn = document.getElementById('publishBtn');
    if (oldPublishBtn) {
      const newPublishBtn = oldPublishBtn.cloneNode(true);
      oldPublishBtn.parentNode.replaceChild(newPublishBtn, oldPublishBtn);
      newPublishBtn.addEventListener('click', handlePublish);
    } else {
      // Build a publish button if it doesn't exist yet
      const successActions = document.querySelector('.success-actions');
      if (successActions) {
        // Replace the dashboard link with a real publish button
        const publishBtn = document.createElement('button');
        publishBtn.type      = 'button';
        publishBtn.id        = 'publishBtn';
        publishBtn.className = 'btn-primary btn-primary--full';
        publishBtn.innerHTML = `
          <i class="fa-solid fa-paper-plane" aria-hidden="true"></i>
          Publish Listing
        `;
        publishBtn.addEventListener('click', handlePublish);
        successActions.insertBefore(publishBtn, successActions.firstChild);

        // Remove the broken dashboard link
        const dashLink = successActions.querySelector('a[href*="dashboard"]');
        dashLink?.remove();
      }
    }

    /* ---- Create another button ---- */
    createAnotherBtn?.addEventListener('click', () => {
      resetWizard();
      goToStep(1);
    });
  }

  /* ---- Publish to Supabase ---- */
  async function handlePublish() {
    if (S.isLoading) return;
    S.isLoading = true;

    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) {
      publishBtn.disabled    = true;
      publishBtn.textContent = 'Publishing…';
    }

    if (publishError) publishError.setAttribute('hidden', '');

    try {
      const fields = {
        title:        S.title,
        description:  S.description,
        category:     S.category,
        listing_type: S.listingType,
        price:        S.priceType === 'fixed' ? S.priceAmount : null,
        negotiable:   S.priceType === 'negotiable',
        condition:    null,
        location:     S.location,
        _existingImages: [],
      };

      const { data, error } = await JARAListings.create(fields, S.photos);

      if (error) {
        if (publishErrorText) publishErrorText.textContent = 'Failed to publish: ' + (error.message || 'Please try again.');
        if (publishError)     publishError.removeAttribute('hidden');
        if (publishBtn) {
          publishBtn.disabled    = false;
          publishBtn.innerHTML = `<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Publish Listing`;
        }
        S.isLoading = false;
        return;
      }

      // Success — go to the new listing
      const listingId = data?.id;
      if (listingId) {
        window.location.replace(`../listing/index.html?id=${listingId}`);
      } else {
        window.location.replace('../explore/index.html');
      }

    } catch (err) {
      console.error('Publish error:', err.message);
      if (publishErrorText) publishErrorText.textContent = 'An unexpected error occurred. Please try again.';
      if (publishError)     publishError.removeAttribute('hidden');
      if (publishBtn) {
        publishBtn.disabled    = false;
        publishBtn.innerHTML = `<i class="fa-solid fa-paper-plane" aria-hidden="true"></i> Publish Listing`;
      }
      S.isLoading = false;
    }
  }


  /* ==========================================================
     RESET WIZARD
  ========================================================== */

  function resetWizard() {
    S.listingType  = null;
    S.title        = '';
    S.category     = '';
    S.description  = '';
    S.tags         = [];
    S.photos       = [];
    S.location     = '';
    S.priceType    = null;
    S.priceAmount  = null;
    S.availability = 'available';
    S.isLoading    = false;

    // Reset type cards
    typeCards.forEach(c => {
      c.classList.remove('type-card--selected');
      c.setAttribute('aria-checked', 'false');
    });

    // Reset form fields
    if (postTitle)       postTitle.value       = '';
    if (postCategory)    postCategory.value    = '';
    if (postDescription) postDescription.value = '';
    if (locationManual)  locationManual.value  = '';
    if (priceAmount)     priceAmount.value     = '';
    if (priceAmountWrap) priceAmountWrap.hidden = true;

    // Reset chips
    priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
    statusChips.forEach((c, i) => c.setAttribute('aria-checked', i === 0 ? 'true' : 'false'));

    // Reset tags and photos
    renderTags();
    buildPhotoGrid();

    // Hide errors
    if (typeError)   typeError.setAttribute('hidden', '');
    hideStep2Alert();
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


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    // Load profile for preview seller info
    S.profile = await JARAProfile.load();

    // Populate categories
    await loadCategories();

    // Build empty photo grid
    buildPhotoGrid();

    // Start on step 1
    goToStep(1);
  }

  init();

});

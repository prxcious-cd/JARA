/* ============================================================
   JARA ∆ — Create / Sell Page Logic
   js/sell.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in sell/index.html

   TABLE OF CONTENTS
   1.  State
   2.  Constants — category map, JARA ID
   3.  DOM helpers
   4.  Auth guard
   5.  Step navigation + progress
   6.  Step 1 — Post type selection
   7.  Step 2 — Details form
       7a. Load categories
       7b. Photo grid
       7c. Smart category suggestions
       7d. Tags input
       7e. Location
       7f. Price type
       7g. Status
       7h. Char counters
       7i. Validation
   8.  Step 3 — Preview
   9.  Step 4 — Publish + save to Supabase
       9a. Upload images
       9b. Build listing object
       9c. Save to DB
       9d. Generate JARA ID
  10.  Share buttons
  11.  Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. STATE
  ========================================================== */
  const state = {
    step:         1,
    postType:     null,       // 'product' | 'service' | 'request'
    title:        '',
    description:  '',
    categoryId:   null,
    categoryName: '',
    tags:         [],
    photoFiles:   [],         // Array of File objects (max 5)
    photoUrls:    [],         // After Supabase Storage upload
    location:     '',
    locationCoords: null,     // { lat, lng } if GPS used
    priceType:    null,       // 'fixed' | 'negotiable' | 'free' | 'contact' | 'quote'
    priceAmount:  null,
    status:       'available',
    userId:       null,
    userProfile:  null,
    jaraId:       null,       // Generated after publish
    listingId:    null,       // UUID from Supabase after save
  };


  /* ==========================================================
     2. CONSTANTS
  ========================================================== */

  // Smart category suggestions keyed by keyword → { categorySlug, tags }
  // Add more keywords here to improve smart suggestions over time.
  const SMART_MAP = {
    generator:   { slug: 'power-generator',   tags: ['generator', 'electricity', 'power', 'hostel', 'backup'] },
    gen:         { slug: 'power-generator',   tags: ['generator', 'electricity', 'power'] },
    laptop:      { slug: 'tech-repairs',      tags: ['laptop', 'computer', 'tech', 'electronics'] },
    phone:       { slug: 'tech-repairs',      tags: ['phone', 'mobile', 'smartphone', 'accessories'] },
    book:        { slug: 'books-stationery',  tags: ['books', 'textbook', 'notes', 'study'] },
    textbook:    { slug: 'books-stationery',  tags: ['textbook', 'books', 'study', 'academics'] },
    food:        { slug: 'food-drinks',       tags: ['food', 'meal', 'eat', 'campus'] },
    cake:        { slug: 'food-drinks',       tags: ['cake', 'pastry', 'birthday', 'food'] },
    rice:        { slug: 'food-drinks',       tags: ['rice', 'food', 'meal', 'jollof'] },
    haircut:     { slug: 'personal-care',     tags: ['haircut', 'barber', 'grooming', 'hair'] },
    hair:        { slug: 'personal-care',     tags: ['hair', 'styling', 'grooming', 'beauty'] },
    laundry:     { slug: 'laundry-errands',   tags: ['laundry', 'washing', 'clothes', 'errand'] },
    design:      { slug: 'creative-services', tags: ['design', 'graphic', 'logo', 'flyer'] },
    photo:       { slug: 'photography',       tags: ['photo', 'photography', 'portrait', 'event'] },
    tutor:       { slug: 'tutoring',          tags: ['tutor', 'lesson', 'academics', 'study'] },
    print:       { slug: 'printing-typing',   tags: ['printing', 'print', 'assignment', 'typing'] },
    typing:      { slug: 'printing-typing',   tags: ['typing', 'assignment', 'printing', 'document'] },
    shoes:       { slug: 'fashion-clothing',  tags: ['shoes', 'footwear', 'fashion'] },
    cloth:       { slug: 'fashion-clothing',  tags: ['clothing', 'fashion', 'wear', 'outfit'] },
    transport:   { slug: 'logistics-delivery',tags: ['transport', 'delivery', 'ride', 'logistics'] },
    delivery:    { slug: 'logistics-delivery',tags: ['delivery', 'errand', 'logistics'] },
    furniture:   { slug: 'hostel-home',       tags: ['furniture', 'hostel', 'home', 'room'] },
    repair:      { slug: 'tech-repairs',      tags: ['repair', 'fix', 'maintenance', 'tech'] },
  };

  /** Generate a JARA listing ID: JR-000001 format */
  function generateListingJaraId(count) {
    return 'JR-' + String(count).padStart(6, '0');
  }

  const STEP_COUNT = 4;


  /* ==========================================================
     3. DOM HELPERS
  ========================================================== */

  const topbarBack      = document.getElementById('topbarBack');
  const topbarTitle     = document.getElementById('topbarTitle');
  const topbarStepBadge = document.getElementById('topbarStepBadge');
  const topbarStepText  = document.getElementById('topbarStepText');
  const sellProgress    = document.getElementById('sellProgress');
  const progressFill    = document.getElementById('progressFill');

  function showStep(stepNum, direction = 'forward') {
    // Hide all steps
    document.querySelectorAll('.sell-step').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('sell-step--active', 'sell-step--entering', 'sell-step--entering-back');
    });

    const target = document.getElementById(`step${stepNum}`);
    if (!target) return;

    target.style.display = 'block';
    target.classList.add('sell-step--active');
    target.classList.add(
      direction === 'back' ? 'sell-step--entering-back' : 'sell-step--entering'
    );

    target.addEventListener('animationend', () => {
      target.classList.remove('sell-step--entering', 'sell-step--entering-back');
    }, { once: true });

    state.step = stepNum;
    updateTopBar(stepNum);
    updateProgress(stepNum);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateTopBar(stepNum) {
    if (stepNum === 1) {
      topbarBack.setAttribute('hidden', '');
      topbarTitle.textContent = 'Create';
      topbarStepBadge.setAttribute('hidden', '');
      sellProgress.setAttribute('hidden', '');
    } else {
      topbarBack.removeAttribute('hidden');
      sellProgress.removeAttribute('hidden');
      topbarStepBadge.removeAttribute('hidden');

      const titles = { 2: 'Details', 3: 'Preview', 4: '' };
      topbarTitle.textContent   = titles[stepNum] || 'Create';
      topbarStepText.textContent = stepNum <= 3
        ? `Step ${stepNum - 1} of ${STEP_COUNT - 1}`
        : '';
    }
  }

  function updateProgress(stepNum) {
    if (stepNum < 2) { progressFill.style.width = '0%'; return; }
    const pct = ((stepNum - 1) / (STEP_COUNT - 1)) * 100;
    progressFill.style.width = `${Math.min(pct, 100)}%`;
  }

  // Topbar back button
  topbarBack.addEventListener('click', () => {
    if (state.step > 1) showStep(state.step - 1, 'back');
  });

  // Field error helpers
  function setFieldError(inputId, errorId, message) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(errorId);
    if (!input || !err) return;
    input.classList.add('is-error');
    err.querySelector('span').textContent = message;
    err.removeAttribute('hidden');
  }

  function clearFieldError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(errorId);
    if (input) input.classList.remove('is-error');
    if (err)   err.setAttribute('hidden', '');
  }

  function showStepAlert(alertId, textId, message) {
    const el = document.getElementById(alertId);
    const tx = document.getElementById(textId);
    if (!el || !tx) return;
    tx.textContent = message;
    el.removeAttribute('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStepAlert(alertId) {
    const el = document.getElementById(alertId);
    if (el) el.setAttribute('hidden', '');
  }


  /* ==========================================================
     4. AUTH GUARD
  ========================================================== */

  async function authGuard() {
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
      window.location.href = '../auth/login.html';
      return false;
    }
    state.userId = session.user.id;

    // Load user profile for preview
    const { data: profile } = await window._supabase
      .from('profiles')
      .select('full_name, business_name, avatar_url, whatsapp_number, account_type')
      .eq('id', state.userId)
      .single();

    state.userProfile = profile || {};
    return true;
  }


  /* ==========================================================
     5. STEP NAVIGATION
  ========================================================== */

  document.getElementById('step1Next').addEventListener('click', () => {
    if (!state.postType) {
      document.getElementById('typeError').removeAttribute('hidden');
      return;
    }
    configureStep2();
    showStep(2);
  });

  document.getElementById('step2Back').addEventListener('click', () => showStep(1, 'back'));
  document.getElementById('step2Next').addEventListener('click', () => {
    hideStepAlert('step2Alert');
    if (!validateStep2()) return;
    buildPreview();
    showStep(3);
  });

  document.getElementById('step3Back').addEventListener('click', () => showStep(2, 'back'));
  document.getElementById('step3Next').addEventListener('click', () => {
    showStep(4);
    publishListing();
  });

  document.getElementById('createAnotherBtn').addEventListener('click', () => {
    // Reset state and go back to step 1
    resetState();
    showStep(1);
  });


  /* ==========================================================
     6. STEP 1 — POST TYPE SELECTION
  ========================================================== */

  document.querySelectorAll('.type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.type-card').forEach(c =>
        c.setAttribute('aria-checked', 'false')
      );
      card.setAttribute('aria-checked', 'true');
      state.postType = card.dataset.type;
      document.getElementById('typeError').setAttribute('hidden', '');
    });
  });


  /* ==========================================================
     7. STEP 2 — DETAILS FORM
  ========================================================== */

  function configureStep2() {
    const eyebrow = document.getElementById('step2Eyebrow');
    const title   = document.getElementById('step2Title');
    if (state.postType === 'product') {
      eyebrow.textContent = 'Product details';
      title.textContent   = 'Tell us about your product';
    } else if (state.postType === 'service') {
      eyebrow.textContent = 'Service details';
      title.textContent   = 'Tell us about your service';
    } else {
      eyebrow.textContent = 'Request details';
      title.textContent   = 'What do you need?';
    }
  }

  /* ---- 7a. Load categories ---- */

  async function loadCategories() {
    const { data: categories } = await window._supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order');

    const select = document.getElementById('postCategory');
    if (!categories || !select) return;

    // Store for smart mapping
    state._categories = categories;

    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value       = c.id;
      opt.dataset.slug = c.slug;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  }

  /* ---- 7b. Photo grid ---- */

  function buildPhotoGrid() {
    const grid = document.getElementById('photoGrid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let i = 0; i < 5; i++) {
      const slot = document.createElement('div');
      slot.className  = 'photo-slot';
      slot.dataset.index = i;
      slot.setAttribute('aria-label', `Photo slot ${i + 1}`);

      slot.innerHTML = `
        <i class="fa-solid fa-plus photo-slot__icon" aria-hidden="true"></i>
        <span class="photo-slot__label">${i === 0 ? 'Cover' : `Photo ${i + 1}`}</span>
        <input
          type="file"
          class="photo-slot__file-input"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Upload photo ${i + 1}"
        />
      `;

      const fileInput = slot.querySelector('.photo-slot__file-input');
      fileInput.addEventListener('change', () => handlePhotoSelect(fileInput, slot, i));
      grid.appendChild(slot);
    }
  }

  function handlePhotoSelect(input, slot, index) {
    const file = input.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10 MB.');
      input.value = '';
      return;
    }

    state.photoFiles[index] = file;

    // Preview
    const url = URL.createObjectURL(file);
    slot.innerHTML = `
      <img class="photo-slot__img" src="${url}" alt="Photo ${index + 1}" />
      <button type="button" class="photo-slot__remove" aria-label="Remove photo ${index + 1}">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    `;
    slot.classList.add('photo-slot--has-image');

    slot.querySelector('.photo-slot__remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.photoFiles[index] = null;
      rebuildSlot(slot, index);
    });
  }

  function rebuildSlot(slot, index) {
    slot.className = 'photo-slot';
    slot.innerHTML = `
      <i class="fa-solid fa-plus photo-slot__icon" aria-hidden="true"></i>
      <span class="photo-slot__label">${index === 0 ? 'Cover' : `Photo ${index + 1}`}</span>
      <input
        type="file"
        class="photo-slot__file-input"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Upload photo ${index + 1}"
      />
    `;
    const fi = slot.querySelector('.photo-slot__file-input');
    fi.addEventListener('change', () => handlePhotoSelect(fi, slot, index));
  }

  /* ---- 7c. Smart category suggestions ---- */

  const titleInput = document.getElementById('postTitle');

  titleInput.addEventListener('input', () => {
    const val   = titleInput.value.trim();
    const count = document.getElementById('titleCharCount');
    if (count) count.textContent = `${val.length} / 120`;

    clearFieldError('postTitle', 'titleError');

    if (val.length < 3) {
      document.getElementById('smartCategory').setAttribute('hidden', '');
      return;
    }

    suggestCategory(val.toLowerCase());
  });

  function suggestCategory(query) {
    const smartSection = document.getElementById('smartCategory');
    const pillsEl      = document.getElementById('smartPills');

    // Find matching keyword
    let match = null;
    for (const keyword of Object.keys(SMART_MAP)) {
      if (query.includes(keyword)) {
        match = SMART_MAP[keyword];
        break;
      }
    }

    if (!match) {
      smartSection.setAttribute('hidden', '');
      return;
    }

    // Find the category option matching the slug
    const select   = document.getElementById('postCategory');
    const catOption = Array.from(select.options).find(
      o => o.dataset.slug === match.slug
    );

    if (!catOption) {
      smartSection.setAttribute('hidden', '');
      return;
    }

    // Build pills
    pillsEl.innerHTML = '';

    // Category pill
    const catPill = document.createElement('button');
    catPill.type      = 'button';
    catPill.className = 'smart-pill';
    catPill.innerHTML = `<i class="fa-solid fa-tag" aria-hidden="true"></i> ${catOption.text}`;
    catPill.setAttribute('aria-label', `Apply category: ${catOption.text}`);
    catPill.addEventListener('click', () => {
      select.value = catOption.value;
      state.categoryId   = catOption.value;
      state.categoryName = catOption.text;
      catPill.classList.add('smart-pill--applied');
      clearFieldError('postCategory', 'categoryError');
    });
    pillsEl.appendChild(catPill);

    // Tag pills
    match.tags.slice(0, 4).forEach(tag => {
      const tagPill = document.createElement('button');
      tagPill.type      = 'button';
      tagPill.className = 'smart-pill';
      tagPill.innerHTML = `# ${tag}`;
      tagPill.setAttribute('aria-label', `Add tag: ${tag}`);
      tagPill.addEventListener('click', () => {
        if (!state.tags.includes(tag) && state.tags.length < 10) {
          state.tags.push(tag);
          renderTags();
          tagPill.classList.add('smart-pill--applied');
        }
      });
      pillsEl.appendChild(tagPill);
    });

    smartSection.removeAttribute('hidden');
  }

  /* ---- 7d. Tags input ---- */

  const tagInput    = document.getElementById('tagInput');
  const tagsDisplay = document.getElementById('tagsDisplay');

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.value.trim().replace(/,/g, ''));
      tagInput.value = '';
    }
  });

  tagInput.addEventListener('blur', () => {
    if (tagInput.value.trim()) {
      addTag(tagInput.value.trim());
      tagInput.value = '';
    }
  });

  function addTag(raw) {
    const tag = raw.toLowerCase().replace(/[^a-z0-9\-_]/g, '').slice(0, 30);
    if (!tag || state.tags.includes(tag) || state.tags.length >= 10) return;
    state.tags.push(tag);
    renderTags();
  }

  function removeTag(tag) {
    state.tags = state.tags.filter(t => t !== tag);
    renderTags();
  }

  function renderTags() {
    tagsDisplay.innerHTML = '';
    state.tags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.innerHTML = `
        # ${tag}
        <button type="button" class="tag-pill__remove" aria-label="Remove tag ${tag}">
          <i class="fa-solid fa-xmark" aria-hidden="true"></i>
        </button>
      `;
      pill.querySelector('.tag-pill__remove').addEventListener('click', () => removeTag(tag));
      tagsDisplay.appendChild(pill);
    });
  }

  /* ---- 7e. Location ---- */

  const useLocationBtn = document.getElementById('useLocationBtn');
  const locationStatus = document.getElementById('locationStatus');
  const locationManual = document.getElementById('locationManual');

  useLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      locationStatus.textContent = 'Location not supported on this device.';
      locationStatus.removeAttribute('hidden');
      return;
    }

    useLocationBtn.textContent = 'Getting location…';
    useLocationBtn.disabled    = true;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        state.locationCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        state.location       = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`;
        useLocationBtn.innerHTML = '<i class="fa-solid fa-location-arrow"></i> <span>Location set ✓</span>';
        useLocationBtn.classList.add('location-btn--active');
        useLocationBtn.disabled  = false;
        locationStatus.textContent = `GPS location captured.`;
        locationStatus.removeAttribute('hidden');
      },
      () => {
        useLocationBtn.innerHTML = '<i class="fa-solid fa-location-arrow"></i> <span>Use current location</span>';
        useLocationBtn.disabled  = false;
        locationStatus.textContent = 'Could not get location. Please enter it manually.';
        locationStatus.removeAttribute('hidden');
      }
    );
  });

  locationManual.addEventListener('input', () => {
    state.location       = locationManual.value.trim();
    state.locationCoords = null;
  });

  /* ---- 7f. Price type ---- */

  const priceChips       = document.querySelectorAll('.price-chip');
  const priceAmountWrap  = document.getElementById('priceAmountWrap');

  priceChips.forEach(chip => {
    chip.addEventListener('click', () => {
      priceChips.forEach(c => c.setAttribute('aria-checked', 'false'));
      chip.setAttribute('aria-checked', 'true');
      state.priceType = chip.dataset.price;
      clearFieldError(null, 'priceError');
      document.getElementById('priceError').setAttribute('hidden', '');

      if (state.priceType === 'fixed') {
        priceAmountWrap.removeAttribute('hidden');
      } else {
        priceAmountWrap.setAttribute('hidden', '');
        state.priceAmount = null;
      }
    });
  });

  document.getElementById('priceAmount').addEventListener('input', (e) => {
    state.priceAmount = parseFloat(e.target.value) || null;
  });

  /* ---- 7g. Status ---- */

  const statusChips = document.querySelectorAll('.status-chip');
  statusChips.forEach(chip => {
    chip.addEventListener('click', () => {
      statusChips.forEach(c => c.setAttribute('aria-checked', 'false'));
      chip.setAttribute('aria-checked', 'true');
      state.status = chip.dataset.status;
    });
  });

  /* ---- 7h. Char counters ---- */

  document.getElementById('postDescription').addEventListener('input', (e) => {
    document.getElementById('descriptionCharCount').textContent =
      `${e.target.value.length} / 2000`;
    clearFieldError('postDescription', 'descriptionError');
  });

  document.getElementById('postCategory').addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    state.categoryId   = opt?.value   || null;
    state.categoryName = opt?.text    || '';
    clearFieldError('postCategory', 'categoryError');
  });

  /* ---- 7i. Form validation ---- */

  function validateStep2() {
    let ok = true;

    clearFieldError('postTitle',       'titleError');
    clearFieldError('postCategory',    'categoryError');
    clearFieldError('postDescription', 'descriptionError');

    const title = document.getElementById('postTitle').value.trim();
    if (!title || title.length < 3) {
      setFieldError('postTitle', 'titleError',
        'Please enter a title (at least 3 characters).');
      ok = false;
    }

    if (!document.getElementById('postCategory').value) {
      setFieldError('postCategory', 'categoryError',
        'Please select a category.');
      ok = false;
    }

    const desc = document.getElementById('postDescription').value.trim();
    if (!desc || desc.length < 10) {
      setFieldError('postDescription', 'descriptionError',
        'Please add a description (at least 10 characters).');
      ok = false;
    }

    if (!state.priceType) {
      const priceErr = document.getElementById('priceError');
      priceErr.querySelector('span').textContent = 'Please choose a price option.';
      priceErr.removeAttribute('hidden');
      ok = false;
    }

    if (state.priceType === 'fixed' && !state.priceAmount) {
      const priceErr = document.getElementById('priceError');
      priceErr.querySelector('span').textContent = 'Please enter the price amount.';
      priceErr.removeAttribute('hidden');
      ok = false;
    }

    if (!ok) {
      const firstErr = document.querySelector('.field__input.is-error, .field__error:not([hidden])');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Save values to state
    state.title       = document.getElementById('postTitle').value.trim();
    state.description = document.getElementById('postDescription').value.trim();
    state.location    = state.location ||
      document.getElementById('locationManual').value.trim();

    return ok;
  }


  /* ==========================================================
     8. STEP 3 — BUILD PREVIEW
  ========================================================== */

  function buildPreview() {
    // Photos
    const photoArea = document.getElementById('previewPhotos');
    const files = state.photoFiles.filter(Boolean);

    if (files.length > 0) {
      const url = URL.createObjectURL(files[0]);
      photoArea.innerHTML = `<img src="${url}" alt="Cover photo" style="width:100%;height:100%;object-fit:cover;" />`;
    } else {
      photoArea.innerHTML = `<div class="preview-card__photo-placeholder" aria-hidden="true">
        <i class="fa-solid fa-image"></i></div>`;
    }

    // Type badge
    const typeBadge = document.getElementById('previewTypeBadge');
    const typeLabels = { product: 'Product', service: 'Service', request: 'Request' };
    const typeClasses = { product: '', service: 'preview-badge--type-service', request: 'preview-badge--type-request' };
    typeBadge.textContent = typeLabels[state.postType] || 'Listing';
    typeBadge.className   = `preview-badge preview-badge--type ${typeClasses[state.postType] || ''}`;

    // Status badge
    const statusBadge = document.getElementById('previewStatusBadge');
    const statusLabels  = { available: 'Available', busy: 'Busy', out_of_stock: 'Out of Stock', coming_soon: 'Coming Soon' };
    const statusClasses = { available: '', busy: 'preview-badge--status-busy', out_of_stock: 'preview-badge--status-out', coming_soon: 'preview-badge--status-soon' };
    statusBadge.textContent = statusLabels[state.status] || 'Available';
    statusBadge.className   = `preview-badge preview-badge--status ${statusClasses[state.status] || ''}`;

    // Title and description
    document.getElementById('previewTitle').textContent = state.title || 'Your title';
    document.getElementById('previewDescription').textContent = state.description || '';

    // Price
    const priceEl = document.getElementById('previewPrice');
    if (state.priceType === 'fixed' && state.priceAmount) {
      priceEl.textContent = `₦${Number(state.priceAmount).toLocaleString('en-NG')}`;
    } else {
      const priceLabels = {
        negotiable: 'Negotiable',
        free:       'Free',
        contact:    'Contact for price',
        quote:      'Request a quote',
      };
      priceEl.textContent = priceLabels[state.priceType] || '—';
    }

    // Location
    const locText = document.getElementById('previewLocationText');
    locText.textContent = state.location || 'Location not set';

    // Tags
    const tagsEl = document.getElementById('previewTags');
    if (state.tags.length > 0) {
      tagsEl.innerHTML = state.tags.map(t =>
        `<span class="preview-tag">#${t}</span>`
      ).join('');
      tagsEl.removeAttribute('hidden');
    } else {
      tagsEl.setAttribute('hidden', '');
    }

    // Seller info
    const profile = state.userProfile || {};
    const name    = profile.business_name || profile.full_name || 'You';
    const initial = (name[0] || 'J').toUpperCase();

    document.getElementById('previewSellerName').textContent = name;
    document.getElementById('previewSellerType').textContent =
      profile.account_type ? profile.account_type.replace('_', ' ') : 'Member';

    const avatarEl = document.getElementById('previewAvatar');
    if (profile.avatar_url) {
      avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="${name}" />`;
    } else {
      avatarEl.textContent = initial;
    }

    // WhatsApp link
    const waBtn = document.getElementById('previewWhatsapp');
    if (profile.whatsapp_number) {
      const num = profile.whatsapp_number.replace(/\D/g, '');
      const intl = num.startsWith('0') ? `234${num.slice(1)}` : num;
      waBtn.href = `https://wa.me/${intl}?text=Hi, I saw your listing "${state.title}" on JARA`;
    } else {
      waBtn.removeAttribute('href');
    }
  }


  /* ==========================================================
     9. STEP 4 — PUBLISH + SAVE
  ========================================================== */

  async function publishListing() {
    const publishingEl = document.getElementById('publishingState');
    const successEl    = document.getElementById('successState');
    const publishErr   = document.getElementById('publishError');
    const errText      = document.getElementById('publishErrorText');

    publishingEl.removeAttribute('hidden');
    successEl.setAttribute('hidden', '');
    publishErr.setAttribute('hidden', '');

    try {
      /* ---- 9a. Upload images ---- */
      const uploadedUrls = [];
      const files = state.photoFiles.filter(Boolean);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext  = file.name.split('.').pop();
        const bucket = state.postType === 'service' ? 'service-images' : 'product-images';
        const path   = `${state.userId}/${Date.now()}_${i}.${ext}`;

        const { error } = await window._supabase.storage
          .from(bucket)
          .upload(path, file, { upsert: true, contentType: file.type });

        if (!error) {
          const { data } = window._supabase.storage.from(bucket).getPublicUrl(path);
          uploadedUrls.push(data.publicUrl);
        }
      }

      state.photoUrls = uploadedUrls;

      /* ---- 9b. Build the listing object ---- */
      const table = state.postType === 'product' ? 'products'
                  : state.postType === 'service' ? 'services'
                  : 'requests';

      // Shared fields
      const listingData = {
        title:        state.title,
        description:  state.description,
        category_id:  state.categoryId  || null,
        images:       state.photoUrls,
        location:     state.location    || null,
        location_lat: state.locationCoords?.lat || null,
        location_lng: state.locationCoords?.lng || null,
        price_type:   state.priceType,
        price:        state.priceType === 'fixed' ? state.priceAmount : null,
        status:       state.status,
        tags:         state.tags,
        post_type:    state.postType,

        // Who posted it
        [state.postType === 'service' ? 'provider_id' : 'owner_id']: state.userId,

        // Future-ready fields (set to defaults now)
        is_featured:         false,
        is_sponsored:        false,
        is_verified_by_jara: false,
        jara_pro_boost:      false,
        view_count:          0,
      };

      /* ---- 9c. Save to Supabase ---- */
      let saveTable = 'products';
      if (state.postType === 'service')  saveTable = 'services';
      if (state.postType === 'request')  saveTable = 'requests';

      const { data: savedRow, error: saveError } = await window._supabase
        .from(saveTable)
        .insert(listingData)
        .select('id')
        .single();

      if (saveError) throw new Error(saveError.message);

      state.listingId = savedRow.id;

      /* ---- 9d. Generate JARA listing ID ---- */
      // Count existing listings across both tables for a global ID
      const { count } = await window._supabase
        .from(saveTable)
        .select('id', { count: 'exact', head: true });

      state.jaraId = generateListingJaraId(count || 1);

      // Save the JARA ID back to the row
      await window._supabase
        .from(saveTable)
        .update({ jara_listing_id: state.jaraId })
        .eq('id', state.listingId);

      /* ---- Show success screen ---- */
      publishingEl.setAttribute('hidden', '');
      successEl.removeAttribute('hidden');
      document.getElementById('jaraIdDisplay').textContent = state.jaraId;

      // Init share buttons with the real listing URL
      setupShareButtons(
        `https://jara.app/listing/${state.jaraId}`,
        state.title
      );

    } catch (err) {
      console.error('JARA publish error:', err);
      publishingEl.setAttribute('hidden', '');
      successEl.removeAttribute('hidden');
      errText.textContent =
        'Something went wrong saving your listing. Please check your connection and try again.';
      publishErr.removeAttribute('hidden');
    }
  }

  // Copy JARA ID button
  document.getElementById('copyJaraId').addEventListener('click', () => {
    if (!state.jaraId) return;
    navigator.clipboard.writeText(state.jaraId).then(() => {
      const btn = document.getElementById('copyJaraId');
      btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
      setTimeout(() => {
        btn.innerHTML = '<i class="fa-regular fa-copy" aria-hidden="true"></i>';
      }, 2000);
    });
  });


  /* ==========================================================
     10. SHARE BUTTONS
  ========================================================== */

  function setupShareButtons(url, title) {
    document.querySelectorAll('.share-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const platform = btn.dataset.platform;
        handleShare(platform, url, title);
      });
    });
  }

  function handleShare(platform, url, title) {
    const encodedUrl   = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const shareUrls = {
      whatsapp:  `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      facebook:  `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      instagram: null, // Instagram has no direct web share URL — copy link fallback
    };

    if (platform === 'copy' || platform === 'instagram') {
      navigator.clipboard.writeText(url).then(() => {
        alert(platform === 'instagram'
          ? 'Link copied! Open Instagram and paste it in your bio or story.'
          : 'Link copied to clipboard!');
      });
      return;
    }

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'noopener,noreferrer');
    }
  }

  // Set up preview card share buttons with placeholder URL
  // (will be overwritten with real URL after publish)
  setupShareButtons(
    `https://jara.app/listing/preview`,
    'Check this out on JARA ∆'
  );


  /* ==========================================================
     RESET STATE
  ========================================================== */

  function resetState() {
    state.step          = 1;
    state.postType      = null;
    state.title         = '';
    state.description   = '';
    state.categoryId    = null;
    state.categoryName  = '';
    state.tags          = [];
    state.photoFiles    = [];
    state.photoUrls     = [];
    state.location      = '';
    state.locationCoords= null;
    state.priceType     = null;
    state.priceAmount   = null;
    state.status        = 'available';
    state.jaraId        = null;
    state.listingId     = null;

    // Reset UI
    document.querySelectorAll('.type-card').forEach(c =>
      c.setAttribute('aria-checked', 'false')
    );
    document.getElementById('typeError').setAttribute('hidden', '');
    document.getElementById('detailsForm').reset();
    buildPhotoGrid();
    state.tags = [];
    renderTags();
    document.getElementById('smartCategory').setAttribute('hidden', '');
    document.getElementById('tagsDisplay').innerHTML = '';
    document.querySelectorAll('.price-chip').forEach(c =>
      c.setAttribute('aria-checked', 'false')
    );
    document.getElementById('priceAmountWrap').setAttribute('hidden', '');
    document.querySelectorAll('.status-chip').forEach((c, i) =>
      c.setAttribute('aria-checked', i === 0 ? 'true' : 'false')
    );
  }


  /* ==========================================================
     11. INIT
  ========================================================== */

  async function init() {
    const authed = await authGuard();
    if (!authed) return;

    buildPhotoGrid();
    await loadCategories();
    showStep(1);
  }

  init();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});

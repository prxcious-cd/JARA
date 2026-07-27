/* ============================================================
   JARA ∆ — Onboarding Wizard  (Buyer / Seller flow v2)
   js/onboarding.js

   Step 0 — Welcome
   Step 1 — Buyer or Seller
   Step 2 — Profile details (Buyer = simple / Seller = business)
   Step 3 — Interests
   Step 4 — Saving + redirect (no user action needed)

   All IDs verified against onboarding/index.html.
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    step:        0,
    role:        null,   // 'buyer' | 'seller'
    avatarFile:  null,
    interests:   [],
    profile:     null,
    userId:      null,
  };

  const TOTAL_STEPS = 3;

  /* ==========================================================
     NIGERIAN UNIVERSITIES — searchable list (50+ institutions)
  ========================================================== */

  const NIGERIAN_SCHOOLS = [
    'Abia State University',
    'Achievers University',
    'Adamawa State University',
    'Adekunle Ajasin University',
    'Ahmadu Bello University',
    'Akwa Ibom State University',
    'Alex Ekwueme Federal University',
    'American University of Nigeria',
    'Anchor University',
    'Babcock University',
    'Bayero University Kano',
    'Bells University of Technology',
    'Benson Idahosa University',
    'Bingham University',
    'Bowen University',
    'Caleb University',
    'Chukwuemeka Odumegwu Ojukwu University',
    'Clifford University',
    'Coal City University',
    'Covenant University',
    'Crawford University',
    'Cross River University of Technology',
    'Crown Hill University',
    'Delta State University',
    'Edo State University',
    'Elizade University',
    'Enugu State University of Science and Technology',
    'Federal Polytechnic Ede',
    'Federal Polytechnic Ilaro',
    'Federal Polytechnic Nekede',
    'Federal University of Agriculture Abeokuta',
    'Federal University of Agriculture Makurdi',
    'Federal University of Petroleum Resources',
    'Federal University of Technology Akure',
    'Federal University of Technology Minna',
    'Federal University of Technology Owerri',
    'Federal University Otuoke',
    'Fountain University',
    'Godfrey Okoye University',
    'Gregory University',
    'Hallmark University',
    'Igbinedion University',
    'Joseph Ayo Babalola University',
    'Kings University',
    'Kogi State University',
    'Kwara State University',
    'Ladoke Akintola University of Technology',
    'Lagos State University',
    'Landmark University',
    'Lead City University',
    'Madonna University',
    'McPherson University',
    'Moshood Abiola Polytechnic',
    'Mountain Top University',
    'Nile University of Nigeria',
    'Nnamdi Azikiwe University',
    'Novena University',
    'Obafemi Awolowo University',
    'Oduduwa University',
    'Olabisi Onabanjo University',
    'Pan-Atlantic University',
    'Paul University',
    'Plateau State University',
    'Redeemer\'s University, Ede',
    'Renaissance University',
    'Rhema University',
    'Rivers State University',
    'Salem University',
    'Samuel Adegboyega University',
    'Sokoto State University',
    'Southwestern University',
    'Summit University',
    'Tansian University',
    'Usmanu Danfodiyo University',
    'University of Abuja',
    'University of Agriculture Umudike',
    'University of Benin',
    'University of Calabar',
    'University of Ibadan',
    'University of Ilorin',
    'University of Jos',
    'University of Lagos',
    'University of Maiduguri',
    'University of Nigeria, Nsukka',
    'University of Uyo',
    'Veritas University',
    'Wesley University',
    'Western Delta University',
    'Yaba College of Technology',
  ].sort();

  /* ==========================================================
     INTERESTS
  ========================================================== */

  const INTERESTS = [
    '📦 Products',    '🛠️ Services',    '📢 Requests',
    '🍔 Food & Drinks','📚 Books',       '👗 Fashion',
    '💻 Tech',         '✂️ Beauty',      '🧺 Laundry',
    '🎓 Tutoring',     '🖨️ Printing',    '⚡ Generator',
    '🏠 Hostel',       '🚗 Transport',   '💪 Health',
    '🎨 Creative',     '📱 Phone Repair','💰 Finance',
  ];

  /* ==========================================================
     BUSINESS CATEGORIES
  ========================================================== */

  const BIZ_CATEGORIES = [
    'Food & Drinks', 'Fashion & Clothing', 'Tech & Repairs',
    'Beauty & Personal Care', 'Printing & Stationery',
    'Laundry & Errands', 'Tutoring & Education',
    'Power & Generator', 'Transport', 'Creative Services',
    'Health & Wellness', 'Hostel & Home', 'Other',
  ];

  /* ==========================================================
     DOM REFS — verified against onboarding/index.html
  ========================================================== */

  const obNav         = document.getElementById('obNav');
  const progressFill  = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');

  const step0 = document.getElementById('step0');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');

  const welcomeBtn = document.getElementById('welcomeBtn');

  const typeCards = document.querySelectorAll('.type-card');
  const typeError = document.getElementById('typeError');
  const step1Next = document.getElementById('step1Next');

  const step2AlertEl   = document.getElementById('step2Alert');
  const step2AlertText = document.getElementById('step2AlertText');
  const step2Title     = document.getElementById('step2Title');
  const step2Subtitle  = document.getElementById('step2Subtitle');
  const step2Back      = document.getElementById('step2Back');
  const step2Next      = document.getElementById('step2Next');

  // Buyer form (formStudent IDs)
  const formStudent          = document.getElementById('formStudent');
  const avatarTriggerStudent = document.getElementById('avatarTriggerStudent');
  const avatarPreviewStudent = document.getElementById('avatarPreviewStudent');
  const avatarFileStudent    = document.getElementById('avatarFileStudent');
  const studentFullName      = document.getElementById('studentFullName');
  const studentFullNameError = document.getElementById('studentFullNameError');
  const studentSchool        = document.getElementById('studentSchool');
  const studentSchoolError   = document.getElementById('studentSchoolError');
  const studentFaculty       = document.getElementById('studentFaculty');
  const studentDepartment    = document.getElementById('studentDepartment');
  const studentLevel         = document.getElementById('studentLevel');
  const studentPhone         = document.getElementById('studentPhone');
  const studentPhoneError    = document.getElementById('studentPhoneError');
  const studentWhatsapp      = document.getElementById('studentWhatsapp');
  const studentBio           = document.getElementById('studentBio');
  const studentBioCount      = document.getElementById('studentBioCount');

  // Seller form (formBusiness IDs)
  const formBusiness          = document.getElementById('formBusiness');
  const avatarTriggerBusiness = document.getElementById('avatarTriggerBusiness');
  const avatarPreviewBusiness = document.getElementById('avatarPreviewBusiness');
  const avatarFileBusiness    = document.getElementById('avatarFileBusiness');
  const businessName          = document.getElementById('businessName');
  const businessNameError     = document.getElementById('businessNameError');
  const businessOwnerName     = document.getElementById('businessOwnerName');
  const businessOwnerNameError= document.getElementById('businessOwnerNameError');
  const businessCategory      = document.getElementById('businessCategory');
  const businessCategoryError = document.getElementById('businessCategoryError');
  const studentSchool2        = document.getElementById('studentSchool2');
  const businessSchoolError   = document.getElementById('businessSchoolError');
  const businessAddress       = document.getElementById('businessAddress');
  const businessPhone         = document.getElementById('businessPhone');
  const businessPhoneError    = document.getElementById('businessPhoneError');
  const businessWhatsapp      = document.getElementById('businessWhatsapp');
  const businessBio           = document.getElementById('businessBio');
  const businessBioCount      = document.getElementById('businessBioCount');

  // Step 3
  const interestsGrid  = document.getElementById('interestsGrid');
  const interestsError = document.getElementById('interestsError');
  const step3Back      = document.getElementById('step3Back');
  const step3Next      = document.getElementById('step3Next');

  // Step 4
  const finishSubtitle  = document.getElementById('finishSubtitle');
  const finishBtn       = document.getElementById('finishBtn');
  const finishError     = document.getElementById('finishError');
  const finishErrorText = document.getElementById('finishErrorText');


  /* ==========================================================
     STEP NAVIGATION
  ========================================================== */

  const ALL_STEPS = [step0, step1, step2, step3, step4];

  function goToStep(n) {
    S.step = n;

    ALL_STEPS.forEach((el, i) => {
      if (!el) return;
      el.hidden = i !== n;
      el.classList.toggle('ob-step--active', i === n);
    });

    if (obNav) obNav.hidden = (n === 0 || n === 4);

    if (progressFill && progressLabel && n >= 1 && n <= TOTAL_STEPS) {
      const pct = Math.round(((n - 1) / TOTAL_STEPS) * 100);
      progressFill.style.width = pct + '%';
      progressFill.closest('[role="progressbar"]')
        ?.setAttribute('aria-valuenow', n);
      progressLabel.textContent = `Step ${n} of ${TOTAL_STEPS}`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  /* ==========================================================
     STEP 0 — WELCOME
  ========================================================== */

  welcomeBtn?.addEventListener('click', () => goToStep(1));


  /* ==========================================================
     STEP 1 — BUYER OR SELLER
  ========================================================== */

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => {
        c.classList.remove('type-card--selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('type-card--selected');
      card.setAttribute('aria-checked', 'true');
      S.role = card.dataset.type;
      if (typeError) typeError.hidden = true;
    });
  });

  step1Next?.addEventListener('click', () => {
    if (!S.role) {
      if (typeError) typeError.hidden = false;
      return;
    }
    prepareStep2();
    goToStep(2);
  });

  function prepareStep2() {
    // Completely hide both forms from layout
    if (formStudent) {
      formStudent.hidden = true;
      formStudent.style.display = 'none';
    }
    if (formBusiness) {
      formBusiness.hidden = true;
      formBusiness.style.display = 'none';
    }

    if (S.role === 'buyer') {
      if (formStudent) {
        formStudent.hidden = false;
        formStudent.style.display = '';
      }
      if (step2Title)    step2Title.textContent    = 'Your profile';
      if (step2Subtitle) step2Subtitle.textContent = 'This is what people will see on your profile.';

      const authName = S.profile?.full_name ||
        window.__JARA_USER?.user_metadata?.full_name || '';
      if (authName && studentFullName && !studentFullName.value) {
        studentFullName.value = authName;
      }

      buildSearchableSchoolDropdown(studentSchool);

    } else {
      if (formBusiness) {
        formBusiness.hidden = false;
        formBusiness.style.display = '';
      }
      if (step2Title)    step2Title.textContent    = 'Your seller profile';
      if (step2Subtitle) step2Subtitle.textContent = 'This is what customers will see on your store.';

      const authName = S.profile?.full_name ||
        window.__JARA_USER?.user_metadata?.full_name || '';
      if (authName && businessOwnerName && !businessOwnerName.value) {
        businessOwnerName.value = authName;
      }

      buildSearchableSchoolDropdown(studentSchool2);
      buildBusinessCategories();
    }
                          }

  /* ==========================================================
     SEARCHABLE SCHOOL DROPDOWN
     Renders a datalist-backed input so users can search
     OR type a school not in the list.
  ========================================================== */

  function buildSearchableSchoolDropdown(selectEl) {
    if (!selectEl) return;

    // Replace <select> with <input> + <datalist> for searchability
    const parent  = selectEl.parentElement;
    const existingInput = parent.querySelector('input.school-search-input');
    if (existingInput) return; // already built

    // Hide the original select
    selectEl.style.display = 'none';

    // Create datalist
    const listId  = 'schoolDatalist_' + Math.random().toString(36).slice(2, 7);
    const datalist = document.createElement('datalist');
    datalist.id   = listId;

    NIGERIAN_SCHOOLS.forEach(school => {
      const opt = document.createElement('option');
      opt.value = school;
      datalist.appendChild(opt);
    });

    // Create input
    const input = document.createElement('input');
    input.type        = 'text';
    input.className   = 'field__input school-search-input';
    input.placeholder = 'Search or type your school…';
    input.setAttribute('list', listId);
    input.setAttribute('autocomplete', 'off');

    // Pre-fill if already selected
    if (selectEl.value) input.value = selectEl.value;

    // Sync input value back to hidden select (for form collection)
    input.addEventListener('input', () => {
      selectEl.value = input.value;
    });

    parent.appendChild(datalist);
    parent.appendChild(input);
  }

  function buildBusinessCategories() {
    if (!businessCategory) return;
    if (businessCategory.options.length > 1) return; // already populated
    businessCategory.innerHTML = '<option value="" disabled selected>Select a category</option>';
    BIZ_CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      businessCategory.appendChild(opt);
    });
  }


  /* ==========================================================
     AVATAR UPLOAD
  ========================================================== */

  avatarTriggerStudent?.addEventListener('click', () => avatarFileStudent?.click());

  avatarFileStudent?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStep2Alert('Photo is too large. Max 5 MB.');
      return;
    }
    S.avatarFile = file;
    previewAvatar(file, avatarPreviewStudent);
  });

  avatarTriggerBusiness?.addEventListener('click', () => avatarFileBusiness?.click());

  avatarFileBusiness?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStep2Alert('Logo is too large. Max 5 MB.');
      return;
    }
    S.avatarFile = file;
    previewAvatar(file, avatarPreviewBusiness);
  });

  function previewAvatar(file, previewEl) {
    if (!previewEl) return;
    const reader = new FileReader();
    reader.onload = ev => {
      previewEl.style.backgroundImage    = `url(${ev.target.result})`;
      previewEl.style.backgroundSize     = 'cover';
      previewEl.style.backgroundPosition = 'center';
      previewEl.innerHTML = '';
    };
    reader.readAsDataURL(file);
  }


  /* ==========================================================
     BIO CHAR COUNTERS
  ========================================================== */

  studentBio?.addEventListener('input', () => {
    if (studentBioCount) studentBioCount.textContent = studentBio.value.length;
  });

  businessBio?.addEventListener('input', () => {
    if (businessBioCount) businessBioCount.textContent = businessBio.value.length;
  });


  /* ==========================================================
     STEP 2 ALERTS + VALIDATION
  ========================================================== */

  function showStep2Alert(msg) {
    if (!step2AlertEl || !step2AlertText) return;
    step2AlertText.textContent = msg;
    step2AlertEl.hidden = false;
    step2AlertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStep2Alert() {
    if (step2AlertEl) step2AlertEl.hidden = true;
  }

  function getSchoolValue(selectEl) {
    // Check for searchable input first
    const parent = selectEl?.parentElement;
    const searchInput = parent?.querySelector('.school-search-input');
    return searchInput ? searchInput.value.trim() : (selectEl?.value || '');
  }

  function validateStep2() {
    hideStep2Alert();

    if (S.role === 'buyer') {
      const name   = studentFullName?.value.trim() || '';
      const school = getSchoolValue(studentSchool);
      const phone  = studentPhone?.value.trim()    || '';

      if (!name) {
        if (studentFullNameError) studentFullNameError.hidden = false;
        studentFullName?.focus();
        return false;
      }
      if (!school) {
        if (studentSchoolError) studentSchoolError.hidden = false;
        return false;
      }
      if (!phone) {
        if (studentPhoneError) studentPhoneError.hidden = false;
        studentPhone?.focus();
        return false;
      }
      return true;
    }

    if (S.role === 'seller') {
      const bName  = businessName?.value.trim()      || '';
      const oName  = businessOwnerName?.value.trim() || '';
      const cat    = businessCategory?.value         || '';
      const campus = getSchoolValue(studentSchool2);
      const phone  = businessPhone?.value.trim()     || '';

      if (!bName) {
        if (businessNameError) businessNameError.hidden = false;
        businessName?.focus();
        return false;
      }
      if (!oName) {
        if (businessOwnerNameError) businessOwnerNameError.hidden = false;
        businessOwnerName?.focus();
        return false;
      }
      if (!cat) {
        if (businessCategoryError) businessCategoryError.hidden = false;
        businessCategory?.focus();
        return false;
      }
      if (!campus) {
        if (businessSchoolError) businessSchoolError.hidden = false;
        return false;
      }
      if (!phone) {
        if (businessPhoneError) businessPhoneError.hidden = false;
        businessPhone?.focus();
        return false;
      }
      return true;
    }

    return true;
  }

  step2Back?.addEventListener('click', () => goToStep(1));

  step2Next?.addEventListener('click', () => {
    if (!validateStep2()) return;
    goToStep(3);
  });


  /* ==========================================================
     STEP 3 — INTERESTS
  ========================================================== */

  function buildInterests() {
    if (!interestsGrid) return;
    interestsGrid.innerHTML = '';

    INTERESTS.forEach(interest => {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'interest-chip';
      btn.setAttribute('aria-pressed', 'false');
      btn.textContent = interest;

      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('aria-pressed') === 'true';
        if (selected) {
          btn.setAttribute('aria-pressed', 'false');
          btn.classList.remove('interest-chip--selected');
          S.interests = S.interests.filter(i => i !== interest);
        } else {
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('interest-chip--selected');
          S.interests.push(interest);
        }
        if (interestsError) interestsError.hidden = true;
      });

      interestsGrid.appendChild(btn);
    });
  }

  step3Back?.addEventListener('click', () => goToStep(2));

  step3Next?.addEventListener('click', () => {
    if (S.interests.length === 0) {
      if (interestsError) interestsError.hidden = false;
      return;
    }
    // Go to step 4 and immediately trigger save
    goToStep(4);
    saveAndRedirect();
  });


  /* ==========================================================
     STEP 4 — SAVE + REDIRECT
     No user action needed on this step.
     The save is triggered automatically when step 3 is completed.
     finishBtn is still wired as a manual fallback.
  ========================================================== */

  finishBtn?.addEventListener('click', saveAndRedirect);

  async function saveAndRedirect() {
    setFinishLoading(true);
    if (finishError) finishError.hidden = true;

    try {
      /* ---- Upload avatar ---- */
      let avatarUrl = null;
      if (S.avatarFile) {
        const { url, error: avatarError } = await JARAProfile.uploadAvatar(S.avatarFile);
        if (!avatarError && url) avatarUrl = url;
      }

      /* ---- Build payload ---- */
      const payload = {
        account_type:        S.role === 'seller' ? 'business' : 'buyer',
        onboarding_complete: true,
        metadata:            { interests: S.interests, role: S.role },
      };

      if (avatarUrl) payload.avatar_url = avatarUrl;

      if (S.role === 'buyer') {
        const school = getSchoolValue(studentSchool);
        payload.full_name  = studentFullName?.value.trim()  || '';
        payload.school     = school                         || null;
        payload.faculty    = studentFaculty?.value.trim()   || null;
        payload.department = studentDepartment?.value.trim()|| null;
        payload.phone      = studentPhone?.value.trim()     || null;
        payload.whatsapp   = studentWhatsapp?.value.trim()  || null;
        payload.bio        = studentBio?.value.trim()       || null;
      }

      if (S.role === 'seller') {
        const campus = getSchoolValue(studentSchool2);
        payload.full_name            = businessOwnerName?.value.trim()  || '';
        payload.business_name        = businessName?.value.trim()       || null;
        payload.business_category    = businessCategory?.value          || null;
        payload.business_description = businessBio?.value.trim()        || null;
        payload.school               = campus                           || null;
        payload.location             = buildLocation();
        payload.phone                = businessPhone?.value.trim()      || null;
        payload.whatsapp             = businessWhatsapp?.value.trim()   || null;
      }

      /* ---- Save to Supabase ---- */
      const { error: saveError } = await JARAProfile.update(payload);

      if (saveError) {
        console.error('Onboarding save error:', saveError.message);
        setFinishLoading(false);
        if (finishErrorText) finishErrorText.textContent =
          'Could not save your profile. Please try again.';
        if (finishError) finishError.hidden = false;
        return;
      }

      /* ---- Stop spinner + redirect ---- */
      setFinishLoading(false);
      window.location.replace(JARAAuth.ROUTES.explore);

    } catch (err) {
      console.error('Onboarding unexpected error:', err.message);
      setFinishLoading(false);
      if (finishErrorText) finishErrorText.textContent =
        'An unexpected error occurred. Please try again.';
      if (finishError) finishError.hidden = false;
    }
  }

  function buildLocation() {
    const parts = [
      businessAddress?.value.trim(),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  function setFinishLoading(on) {
    if (!finishBtn) return;
    finishBtn.disabled = on;
    finishBtn.setAttribute('aria-busy', String(on));
    finishBtn.classList.toggle('is-loading', on);
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    try {
      const result = await JARAAuth.getCurrentUser();
      if (result) {
        S.userId  = result.user.id;
        S.profile = result.profile;
      }
    } catch (err) {
      console.error('Onboarding init error:', err.message);
    }

    buildInterests();
    goToStep(0);
  }

  init();

});

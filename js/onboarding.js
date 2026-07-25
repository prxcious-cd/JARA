/* ============================================================
   JARA ∆ — Onboarding Wizard
   js/onboarding.js

   4-step onboarding flow matched to onboarding/index.html.

   Step 0 — Welcome screen
   Step 1 — Account type selection (student / business / professional)
   Step 2 — Profile details (different form per account type)
   Step 3 — Interests selection
   Step 4 — Finish + save to Supabase

   All IDs verified against onboarding/index.html.

   Depends on:
     - window._supabase   (supabase-client.js)
     - window.JARAAuth    (auth-guard.js)
     - window.JARAProfile (jara-profile.js)
============================================================ */

document.addEventListener('DOMContentLoaded', async () => {

  /* ==========================================================
     STATE
  ========================================================== */

  const S = {
    step:          0,
    accountType:   null,    // 'student' | 'business' | 'professional'
    avatarFile:    null,
    interests:     [],
    profile:       null,
    userId:        null,
  };

  const TOTAL_STEPS = 4;

  /* ==========================================================
     INTERESTS LIST
  ========================================================== */

  const INTERESTS = [
    '📦 Products', '🛠️ Services', '📢 Requests',
    '🍔 Food & Drinks', '📚 Books', '👗 Fashion',
    '💻 Tech', '✂️ Beauty', '🧺 Laundry',
    '🎓 Tutoring', '🖨️ Printing', '⚡ Generator',
    '🏠 Hostel', '🚗 Transport', '💪 Health',
    '🎨 Creative', '📱 Phone Repair', '💰 Finance',
  ];

  /* ==========================================================
     DOM REFS — every ID verified against onboarding/index.html
  ========================================================== */

  // Nav / progress
  const obNav        = document.getElementById('obNav');
  const progressFill = document.getElementById('progressFill');
  const progressLabel= document.getElementById('progressLabel');

  // Steps
  const step0 = document.getElementById('step0');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');

  // Step 0
  const welcomeBtn = document.getElementById('welcomeBtn');

  // Step 1 — account type
  const typeCards      = document.querySelectorAll('.type-card');
  const typeError      = document.getElementById('typeError');
  const step1Next      = document.getElementById('step1Next');

  // Step 2 — shared alert
  const step2AlertEl   = document.querySelector('#step2 .ob-alert');
  const step2AlertText = document.getElementById('step2AlertText');
  const step2Subtitle  = document.getElementById('step2Subtitle');
  const step2Back      = document.getElementById('step2Back');
  const step2Next      = document.getElementById('step2Next');

  // Step 2 — Student form
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
  const studentWhatsappError = document.getElementById('studentWhatsappError');
  const studentBio           = document.getElementById('studentBio');
  const studentBioCount      = document.getElementById('studentBioCount');

  // Step 2 — Business form
  const formBusiness            = document.getElementById('formBusiness');
  const avatarTriggerBusiness   = document.getElementById('avatarTriggerBusiness');
  const avatarPreviewBusiness   = document.getElementById('avatarPreviewBusiness');
  const avatarFileBusiness      = document.getElementById('avatarFileBusiness');
  const businessName            = document.getElementById('businessName');
  const businessNameError       = document.getElementById('businessNameError');
  const businessOwnerName       = document.getElementById('businessOwnerName');
  const businessOwnerNameError  = document.getElementById('businessOwnerNameError');
  const businessCategory        = document.getElementById('businessCategory');
  const businessCategoryError   = document.getElementById('businessCategoryError');
  const businessAddress         = document.getElementById('businessAddress');
  const businessCity            = document.getElementById('businessCity');
  const businessCityError       = document.getElementById('businessCityError');
  const businessState           = document.getElementById('businessState');
  const businessStateError      = document.getElementById('businessStateError');
  const businessPhone           = document.getElementById('businessPhone');
  const businessPhoneError      = document.getElementById('businessPhoneError');
  const businessWhatsapp        = document.getElementById('businessWhatsapp');
  const businessWhatsappError   = document.getElementById('businessWhatsappError');
  const businessBio             = document.getElementById('businessBio');
  const businessBioCount        = document.getElementById('businessBioCount');

  // Step 3 — Interests
  const interestsGrid  = document.getElementById('interestsGrid');
  const interestsError = document.getElementById('interestsError');
  const step3Back      = document.getElementById('step3Back');
  const step3Next      = document.getElementById('step3Next');

  // Step 4 — Finish
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

    // Show nav bar from step 1 onwards
    if (obNav) obNav.hidden = n === 0;

    // Update progress bar
    if (progressFill) {
      const pct = n === 0 ? 0 : Math.round((n / TOTAL_STEPS) * 100);
      progressFill.style.width = pct + '%';
      progressFill.closest('[role="progressbar"]')
        ?.setAttribute('aria-valuenow', n);
    }

    if (progressLabel) {
      progressLabel.textContent = n === 0
        ? 'Step 1 of 4'
        : `Step ${n} of ${TOTAL_STEPS}`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  /* ==========================================================
     STEP 0 — WELCOME
  ========================================================== */

  welcomeBtn?.addEventListener('click', () => goToStep(1));


  /* ==========================================================
     STEP 1 — ACCOUNT TYPE
  ========================================================== */

  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => {
        c.classList.remove('type-card--selected');
        c.setAttribute('aria-checked', 'false');
      });
      card.classList.add('type-card--selected');
      card.setAttribute('aria-checked', 'true');
      S.accountType = card.dataset.type;
      if (typeError) typeError.hidden = true;
    });
  });

  step1Next?.addEventListener('click', () => {
    if (!S.accountType) {
      if (typeError) typeError.hidden = false;
      return;
    }
    showCorrectForm();
    goToStep(2);
  });

  function showCorrectForm() {
    // Hide all forms first
    if (formStudent)  formStudent.hidden  = true;
    if (formBusiness) formBusiness.hidden = true;

    // Show the correct form
    if (S.accountType === 'student' || S.accountType === 'professional') {
      if (formStudent) formStudent.hidden = false;
      if (step2Subtitle) {
        step2Subtitle.textContent = S.accountType === 'student'
          ? 'This is what people will see on your profile.'
          : 'Tell us about yourself and your services.';
      }
    } else if (S.accountType === 'business') {
      if (formBusiness) formBusiness.hidden = false;
      if (step2Subtitle) {
        step2Subtitle.textContent = 'This is what customers will see on your store.';
      }
    }

    // Load schools into dropdown
    loadSchools();

    // Load business categories
    loadBusinessCategories();
  }


  /* ==========================================================
     STEP 2 — PROFILE DETAILS
  ========================================================== */

  /* ---- Avatar upload — Student ---- */
  avatarTriggerStudent?.addEventListener('click', () => avatarFileStudent?.click());

  avatarFileStudent?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStep2Alert('Photo is too large. Maximum size is 5 MB.');
      return;
    }
    S.avatarFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      if (avatarPreviewStudent) {
        avatarPreviewStudent.style.backgroundImage = `url(${ev.target.result})`;
        avatarPreviewStudent.style.backgroundSize  = 'cover';
        avatarPreviewStudent.style.backgroundPosition = 'center';
      }
    };
    reader.readAsDataURL(file);
  });

  /* ---- Avatar upload — Business ---- */
  avatarTriggerBusiness?.addEventListener('click', () => avatarFileBusiness?.click());

  avatarFileBusiness?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStep2Alert('Logo is too large. Maximum size is 5 MB.');
      return;
    }
    S.avatarFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      if (avatarPreviewBusiness) {
        avatarPreviewBusiness.style.backgroundImage = `url(${ev.target.result})`;
        avatarPreviewBusiness.style.backgroundSize  = 'cover';
        avatarPreviewBusiness.style.backgroundPosition = 'center';
      }
    };
    reader.readAsDataURL(file);
  });

  /* ---- Bio character counters ---- */
  studentBio?.addEventListener('input', () => {
    if (studentBioCount) studentBioCount.textContent = studentBio.value.length;
  });

  businessBio?.addEventListener('input', () => {
    if (businessBioCount) businessBioCount.textContent = businessBio.value.length;
  });

  /* ---- Load schools from Supabase ---- */
  async function loadSchools() {
    if (!studentSchool) return;
    studentSchool.innerHTML = '<option value="" disabled selected>Select your school</option>';

    /*
     FUTURE: SELECT id, name FROM schools ORDER BY name
    */
    const fallback = ['Redeemer\'s University, Ede'];
    fallback.forEach(s => {
      const opt   = document.createElement('option');
      opt.value   = s;
      opt.textContent = s;
      studentSchool.appendChild(opt);
    });
  }

  /* ---- Load business categories ---- */
  async function loadBusinessCategories() {
    if (!businessCategory) return;
    businessCategory.innerHTML = '<option value="" disabled selected>Select a category</option>';

    const cats = [
      'Food & Drinks', 'Fashion & Clothing', 'Tech & Repairs',
      'Beauty & Personal Care', 'Printing & Stationery',
      'Laundry & Errands', 'Tutoring & Education',
      'Power & Generator', 'Transport', 'Creative Services',
      'Health & Wellness', 'Hostel & Home', 'Other',
    ];

    cats.forEach(c => {
      const opt   = document.createElement('option');
      opt.value   = c;
      opt.textContent = c;
      businessCategory.appendChild(opt);
    });
  }

  /* ---- Step 2 alert ---- */
  function showStep2Alert(msg) {
    if (!step2AlertEl || !step2AlertText) return;
    step2AlertText.textContent = msg;
    step2AlertEl.hidden = false;
    step2AlertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideStep2Alert() {
    if (step2AlertEl) step2AlertEl.hidden = true;
  }

  /* ---- Validation ---- */
  function validateStep2() {
    hideStep2Alert();

    if (S.accountType === 'student' || S.accountType === 'professional') {
      const name   = studentFullName?.value.trim() || '';
      const school = studentSchool?.value          || '';
      const phone  = studentPhone?.value.trim()    || '';

      if (!name) {
        if (studentFullNameError) studentFullNameError.hidden = false;
        studentFullName?.focus();
        return false;
      }
      if (!school) {
        if (studentSchoolError) studentSchoolError.hidden = false;
        studentSchool?.focus();
        return false;
      }
      if (!phone) {
        if (studentPhoneError) studentPhoneError.hidden = false;
        studentPhone?.focus();
        return false;
      }
      return true;
    }

    if (S.accountType === 'business') {
      const bName  = businessName?.value.trim()      || '';
      const oName  = businessOwnerName?.value.trim() || '';
      const cat    = businessCategory?.value         || '';
      const city   = businessCity?.value.trim()      || '';
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
      if (!city) {
        if (businessCityError) businessCityError.hidden = false;
        businessCity?.focus();
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

  /* ---- Step 2 navigation ---- */
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
        const isSelected = btn.getAttribute('aria-pressed') === 'true';

        if (isSelected) {
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
    goToStep(4);
  });


  /* ==========================================================
     STEP 4 — FINISH + SAVE TO SUPABASE
  ========================================================== */

  finishBtn?.addEventListener('click', async () => {
    setFinishLoading(true);
    if (finishError) finishError.hidden = true;

    try {
      /* ---- Upload avatar if provided ---- */
      let avatarUrl = null;
      if (S.avatarFile) {
        const { url, error: avatarError } = await JARAProfile.uploadAvatar(S.avatarFile);
        if (!avatarError) avatarUrl = url;
      }

      /* ---- Build profile payload ---- */
      let payload = {
        account_type:       S.accountType === 'professional' ? 'business' : S.accountType,
        onboarding_complete: true,
      };

      if (avatarUrl) payload.avatar_url = avatarUrl;

      // Map interests array
      /*
       FUTURE: Store interests in a separate user_interests table
       or as a JSONB column on profiles.
       For now we store as metadata.
      */
      payload.metadata = { interests: S.interests };

      if (S.accountType === 'student' || S.accountType === 'professional') {
        payload.full_name   = studentFullName?.value.trim()  || '';
        payload.school      = studentSchool?.value           || '';
        payload.faculty     = studentFaculty?.value.trim()   || null;
        payload.department  = studentDepartment?.value.trim()|| null;
        payload.phone       = studentPhone?.value.trim()     || null;
        payload.whatsapp    = studentWhatsapp?.value.trim()  || null;
        payload.bio         = studentBio?.value.trim()       || null;
      }

      if (S.accountType === 'business') {
        payload.full_name             = businessOwnerName?.value.trim()  || '';
        payload.business_name         = businessName?.value.trim()        || null;
        payload.business_category     = businessCategory?.value           || null;
        payload.business_description  = businessBio?.value.trim()         || null;
        payload.location              = [
          businessAddress?.value.trim(),
          businessCity?.value.trim(),
          businessState?.value,
        ].filter(Boolean).join(', ') || null;
        payload.phone                 = businessPhone?.value.trim()       || null;
        payload.whatsapp              = businessWhatsapp?.value.trim()    || null;
      }

      /* ---- Save to Supabase ---- */
      const { error: saveError } = await JARAProfile.update(payload);

      if (saveError) {
        console.error('Onboarding save error:', saveError.message);
        if (finishErrorText) finishErrorText.textContent =
          'Failed to save your profile. Please try again.';
        if (finishError) finishError.hidden = false;
        setFinishLoading(false);
        return;
      }

      /* ---- Redirect to explore ---- */
      window.location.replace(JARAAuth.ROUTES.explore);

    } catch (err) {
      console.error('Onboarding unexpected error:', err.message);
      if (finishErrorText) finishErrorText.textContent =
        'An unexpected error occurred. Please try again.';
      if (finishError) finishError.hidden = false;
      setFinishLoading(false);
    }
  });

  function setFinishLoading(on) {
    if (!finishBtn) return;
    finishBtn.disabled = on;
    finishBtn.setAttribute('aria-busy', String(on));
    if (on) finishBtn.classList.add('is-loading');
    else    finishBtn.classList.remove('is-loading');
  }


  /* ==========================================================
     INIT
  ========================================================== */

  async function init() {
    try {
      const result = await JARAAuth.getCurrentUser();
      if (!result) return;
      S.userId  = result.user.id;
      S.profile = result.profile;

      /*
       If onboarding is already complete send to explore.
       FUTURE: Uncomment once confirmed working end-to-end:

         if (S.profile?.onboarding_complete) {
           window.location.replace(JARAAuth.ROUTES.explore);
           return;
         }
      */

      // Pre-fill name from auth metadata
      const authName = result.user.user_metadata?.full_name || '';
      if (authName && studentFullName && !studentFullName.value) {
        studentFullName.value = authName;
      }

    } catch (err) {
      console.error('Onboarding init error:', err.message);
    }

    buildInterests();
    goToStep(0);
  }

  init();

});

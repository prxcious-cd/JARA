/* ============================================================
   JARA ∆ — Onboarding Wizard  (Buyer / Seller flow)
   js/onboarding.js

   Step 0 — Welcome
   Step 1 — Buyer or Seller
   Step 2 — Profile details (Buyer = simple / Seller = full)
   Step 3 — Interests
   Step 4 — Finish + save to Supabase

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

  const TOTAL_STEPS = 3;   // Steps 1-3 (step 0 = welcome, step 4 = finish)

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
     NIGERIAN STATES
  ========================================================== */

  const NG_STATES = [
    'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa',
    'Benue','Borno','Cross River','Delta','Ebonyi','Edo',
    'Ekiti','Enugu','FCT - Abuja','Gombe','Imo','Jigawa',
    'Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara',
    'Lagos','Nasarawa','Niger','Ogun','Ondo','Osun',
    'Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara',
  ];

  /* ==========================================================
     DOM REFS — verified against onboarding/index.html
  ========================================================== */

  const obNav        = document.getElementById('obNav');
  const progressFill = document.getElementById('progressFill');
  const progressLabel= document.getElementById('progressLabel');

  const step0 = document.getElementById('step0');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  const step4 = document.getElementById('step4');

  // Step 0
  const welcomeBtn = document.getElementById('welcomeBtn');

  // Step 1
  const typeCards  = document.querySelectorAll('.type-card');
  const typeError  = document.getElementById('typeError');
  const step1Next  = document.getElementById('step1Next');

  // Step 2 — shared
  const step2AlertEl   = document.getElementById('step2Alert');
  const step2AlertText = document.getElementById('step2AlertText');
  const step2Title     = document.getElementById('step2Title');
  const step2Subtitle  = document.getElementById('step2Subtitle');
  const step2Back      = document.getElementById('step2Back');
  const step2Next      = document.getElementById('step2Next');

  // Step 2 — Buyer (reuses formStudent IDs)
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

  // Step 2 — Seller (reuses formBusiness IDs)
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

    // Hide nav on welcome (0) and finish (4)
    if (obNav) obNav.hidden = (n === 0 || n === 4);

    // Progress bar — steps 1-3
    if (progressFill && progressLabel) {
      const activeStep = Math.min(Math.max(n, 1), TOTAL_STEPS);
      const pct = Math.round(((activeStep - 1) / TOTAL_STEPS) * 100);
      progressFill.style.width = pct + '%';
      progressFill.closest('[role="progressbar"]')
        ?.setAttribute('aria-valuenow', activeStep);
      progressLabel.textContent = `Step ${activeStep} of ${TOTAL_STEPS}`;
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
    showCorrectForm();
    goToStep(2);
  });

  function showCorrectForm() {
    if (formStudent)  formStudent.hidden  = true;
    if (formBusiness) formBusiness.hidden = true;

    if (S.role === 'buyer') {
      if (formStudent)  formStudent.hidden  = false;
      if (step2Title)   step2Title.textContent   = 'Tell us about yourself';
      if (step2Subtitle) step2Subtitle.textContent = 'This is what people will see on your profile.';
    } else {
      if (formBusiness) formBusiness.hidden = false;
      if (step2Title)   step2Title.textContent   = 'Set up your seller profile';
      if (step2Subtitle) step2Subtitle.textContent = 'This is what customers will see on your store.';
    }

    loadSchools();
    loadBusinessCategories();
  }


  /* ==========================================================
     STEP 2 — PROFILE DETAILS
  ========================================================== */

  /* ---- Avatar — Buyer ---- */
  avatarTriggerStudent?.addEventListener('click', () => avatarFileStudent?.click());

  avatarFileStudent?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStep2Alert('Photo is too large. Maximum 5 MB.');
      return;
    }
    S.avatarFile = file;
    previewAvatar(file, avatarPreviewStudent);
  });

  /* ---- Avatar — Seller ---- */
  avatarTriggerBusiness?.addEventListener('click', () => avatarFileBusiness?.click());

  avatarFileBusiness?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showStep2Alert('Logo is too large. Maximum 5 MB.');
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

  /* ---- Bio char counters ---- */
  studentBio?.addEventListener('input', () => {
    if (studentBioCount) studentBioCount.textContent = studentBio.value.length;
  });

  businessBio?.addEventListener('input', () => {
    if (businessBioCount) businessBioCount.textContent = businessBio.value.length;
  });

  /* ---- Load schools ---- */
  async function loadSchools() {
    const targets = [studentSchool, studentSchool2].filter(Boolean);
    targets.forEach(sel => {
      sel.innerHTML = '<option value="" disabled selected>Select your school</option>';
    });

    /*
     FUTURE: SELECT id, name FROM schools ORDER BY name
    */
    const schools = ['Redeemer\'s University, Ede'];

    schools.forEach(s => {
      targets.forEach(sel => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        sel.appendChild(opt);
      });
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
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      businessCategory.appendChild(opt);
    });
  }

  /* ---- Alert helpers ---- */
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

    if (S.role === 'buyer') {
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

    if (S.role === 'seller') {
      const bName  = businessName?.value.trim()      || '';
      const oName  = businessOwnerName?.value.trim() || '';
      const cat    = businessCategory?.value         || '';
      const campus = studentSchool2?.value           || '';
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
        studentSchool2?.focus();
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
    goToStep(4);
  });


  /* ==========================================================
     STEP 4 — FINISH + SAVE
  ========================================================== */

  finishBtn?.addEventListener('click', async () => {
    setFinishLoading(true);
    if (finishError) finishError.hidden = true;

    try {
      /* ---- Upload avatar ---- */
      let avatarUrl = null;
      if (S.avatarFile) {
        const { url, error: avatarError } = await JARAProfile.uploadAvatar(S.avatarFile);
        if (!avatarError) avatarUrl = url;
      }

      /* ---- Build payload ---- */
      let payload = {
        account_type:        S.role === 'seller' ? 'business' : 'buyer',
        onboarding_complete: true,
        metadata:            { interests: S.interests, role: S.role },
      };

      if (avatarUrl) payload.avatar_url = avatarUrl;

      if (S.role === 'buyer') {
        payload.full_name  = studentFullName?.value.trim()  || '';
        payload.school     = studentSchool?.value           || '';
        payload.faculty    = studentFaculty?.value.trim()   || null;
        payload.department = studentDepartment?.value.trim()|| null;
        payload.phone      = studentPhone?.value.trim()     || null;
        payload.whatsapp   = studentWhatsapp?.value.trim()  || null;
        payload.bio        = studentBio?.value.trim()       || null;
      }

      if (S.role === 'seller') {
        payload.full_name            = businessOwnerName?.value.trim()  || '';
        payload.business_name        = businessName?.value.trim()       || null;
        payload.business_category    = businessCategory?.value          || null;
        payload.business_description = businessBio?.value.trim()        || null;
        payload.school               = studentSchool2?.value            || null;
        payload.location             = [
          businessAddress?.value.trim(),
          'Redeemer\'s University, Ede',
        ].filter(Boolean).join(', ') || null;
        payload.phone                = businessPhone?.value.trim()      || null;
        payload.whatsapp             = businessWhatsapp?.value.trim()   || null;
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
      console.error('Onboarding error:', err.message);
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

        // Pre-fill name from auth metadata
        const authName = result.user.user_metadata?.full_name || '';
        if (authName && studentFullName && !studentFullName.value) {
          studentFullName.value = authName;
        }
        if (authName && businessOwnerName && !businessOwnerName.value) {
          businessOwnerName.value = authName;
        }
      }
    } catch (err) {
      console.error('Onboarding init error:', err.message);
    }

    buildInterests();
    goToStep(0);
  }

  init();

});

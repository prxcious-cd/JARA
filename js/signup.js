/* ============================================================
   JARA ∆ — Signup Page Logic  (auth-integrated)
   js/signup.js

   Depends on:
     - window._supabase  → set by js/supabase-client.js
     - window.JARAAuth   → set by js/auth-guard.js
     - HTML IDs in auth/signup.html
============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     DOM REFS — all IDs match auth/signup.html exactly
  ========================================================== */
  const form             = document.getElementById('signupForm');
  const fullNameInput    = document.getElementById('fullName');
  const emailInput       = document.getElementById('email');
  const passwordInput    = document.getElementById('password');           // was 'newPassword' ❌
  const confirmInput     = document.getElementById('confirmPassword');
  const termsCheckbox    = document.getElementById('terms');
  const submitBtn        = document.getElementById('submitBtn');
  const authAlert        = document.getElementById('authAlert');
  const alertMessage     = document.getElementById('alertMessage');
  const alertIcon        = document.getElementById('alertIcon');
  const signupCard       = document.getElementById('signupCard');
  const successCard      = document.getElementById('successCard');
  const successEmail     = document.getElementById('successEmail');
  const resendBtn        = document.getElementById('resendBtn');

  // Password toggle
  const togglePassBtn    = document.getElementById('togglePassword');
  const togglePassIcon   = document.getElementById('togglePasswordIcon');

  // Confirm password toggle
  const toggleConfirmBtn  = document.getElementById('toggleConfirmPassword'); // was missing ❌
  const toggleConfirmIcon = document.getElementById('toggleConfirmIcon');     // was missing ❌

  // Strength meter
  const strengthMeter    = document.getElementById('strengthMeter');
  const strengthLabel    = document.getElementById('passwordStrengthLabel');

  // Field error elements — matched to HTML exactly
  const fullNameError      = document.getElementById('fullNameError');       // was 'nameError' ❌
  const fullNameErrorText  = document.getElementById('fullNameErrorText');   // was 'nameErrorText' ❌
  const emailError         = document.getElementById('emailError');
  const emailErrorText     = document.getElementById('emailErrorText');
  const passwordError      = document.getElementById('passwordError');
  const passwordErrorText  = document.getElementById('passwordErrorText');
  const confirmError       = document.getElementById('confirmPasswordError');     // was 'confirmError' ❌
  const confirmErrorText   = document.getElementById('confirmPasswordErrorText'); // was 'confirmErrorText' ❌
  const termsError         = document.getElementById('termsError');          // was missing ❌
  const termsErrorText     = document.getElementById('termsErrorText');      // was missing ❌

  let lastEmail = '';


  /* ==========================================================
     HELPERS
  ========================================================== */

  function showAlert(type, msg) {
    if (!authAlert || !alertMessage) return;
    authAlert.className = `auth-alert${type === 'success' ? ' auth-alert--success' : ''}`;
    if (alertIcon) {
      alertIcon.className = type === 'success'
        ? 'auth-alert__icon fa-solid fa-circle-check'
        : 'auth-alert__icon fa-solid fa-circle-exclamation';
    }
    alertMessage.textContent = msg;
    authAlert.removeAttribute('hidden');
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    authAlert?.setAttribute('hidden', '');
  }

  function setLoading(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    submitBtn.classList.toggle('is-loading', on);
  }

  function showFieldError(errorEl, textEl, inputEl, msg) {
    if (!errorEl || !textEl || !inputEl) return;
    textEl.textContent = msg;
    errorEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(errorEl, inputEl) {
    if (!errorEl || !inputEl) return;
    errorEl.setAttribute('hidden', '');
    inputEl.classList.remove('is-error');
    inputEl.removeAttribute('aria-invalid');
  }

  function clearAllFieldErrors() {
    clearFieldError(fullNameError,  fullNameInput);
    clearFieldError(emailError,     emailInput);
    clearFieldError(passwordError,  passwordInput);
    clearFieldError(confirmError,   confirmInput);
    if (termsError) termsError.setAttribute('hidden', '');
  }


  /* ==========================================================
     PASSWORD STRENGTH
  ========================================================== */

  const STRENGTH_LABELS = { 1: 'Weak', 2: 'Fair', 3: 'Good', 4: 'Strong' };

  function scorePassword(pw) {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8)                         s++;
    if (/\d/.test(pw))                          s++;
    if (/[^a-zA-Z0-9]/.test(pw))               s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw))  s++;
    return Math.max(s, 1);
  }

  passwordInput?.addEventListener('input', () => {
    hideAlert();
    clearFieldError(passwordError, passwordInput);
    const val = passwordInput.value;
    if (!val) { strengthMeter?.setAttribute('hidden', ''); return; }
    const score = scorePassword(val);
    if (strengthMeter) {
      strengthMeter.removeAttribute('hidden');
      strengthMeter.setAttribute('data-strength', score);
    }
    if (strengthLabel) strengthLabel.textContent = STRENGTH_LABELS[score] || '';
  });


  /* ==========================================================
     PASSWORD TOGGLES
  ========================================================== */

  togglePassBtn?.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    if (togglePassIcon) {
      togglePassIcon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
    togglePassBtn.setAttribute('aria-label',   isHidden ? 'Hide password' : 'Show password');
    togglePassBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
  });

  toggleConfirmBtn?.addEventListener('click', () => {
    const isHidden = confirmInput.type === 'password';
    confirmInput.type = isHidden ? 'text' : 'password';
    if (toggleConfirmIcon) {
      toggleConfirmIcon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
    }
    toggleConfirmBtn.setAttribute('aria-label',   isHidden ? 'Hide password' : 'Show password');
    toggleConfirmBtn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
  });


  /* ==========================================================
     CLEAR ERRORS ON INPUT
  ========================================================== */

  fullNameInput?.addEventListener('input', () => { clearFieldError(fullNameError, fullNameInput); hideAlert(); });
  emailInput?.addEventListener('input',    () => { clearFieldError(emailError, emailInput);       hideAlert(); });
  confirmInput?.addEventListener('input',  () => { clearFieldError(confirmError, confirmInput);   hideAlert(); });


  /* ==========================================================
     VALIDATION
  ========================================================== */

  function validate() {
    clearAllFieldErrors();
    hideAlert();
    let valid = true;

    /* ---- Full name ---- */
    const name = fullNameInput?.value.trim() || '';
    if (!name) {
      showFieldError(fullNameError, fullNameErrorText, fullNameInput,
        'Please enter your full name.');
      valid = false;
    }

    /* ---- Email ---- */
    const email = emailInput?.value.trim() || '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError(emailError, emailErrorText, emailInput,
        'Please enter a valid email address.');
      valid = false;
    }

    /* ---- Password ---- */
    const pw = passwordInput?.value || '';
    if (!pw || pw.length < 8) {
      showFieldError(passwordError, passwordErrorText, passwordInput,
        'Password must be at least 8 characters.');
      valid = false;
    } else if (scorePassword(pw) < 2) {
      showFieldError(passwordError, passwordErrorText, passwordInput,
        'Password is too weak. Add numbers or symbols.');
      valid = false;
    }

    /* ---- Confirm password ---- */
    const confirm = confirmInput?.value || '';
    if (!confirm || confirm !== pw) {
      showFieldError(confirmError, confirmErrorText, confirmInput,
        'Passwords do not match.');
      valid = false;
    }

    /* ---- Terms checkbox ---- */
    if (!termsCheckbox?.checked) {
      if (termsError && termsErrorText) {
        termsErrorText.textContent = 'Please accept the Terms of Service to continue.';
        termsError.removeAttribute('hidden');
      } else {
        showAlert('error', 'Please accept the Terms of Service to continue.');
      }
      valid = false;
    }

    return valid;
  }


  /* ==========================================================
     FORM SUBMIT
  ========================================================== */

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    const email    = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = fullNameInput.value.trim();
    lastEmail      = email;
    
     try {
      const { data, error } = await window._supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          /*
           FUTURE: Set emailRedirectTo to your live GitHub Pages URL:
             emailRedirectTo: 'https://yourname.github.io/jara/auth/login.html'
          */
        },
      });

      if (error) {
        let msg = 'Something went wrong. Please try again.';
        const m = error.message.toLowerCase();
        if (m.includes('already registered') || m.includes('already exists')) {
          msg = 'An account with this email already exists. Try logging in instead.';
        } else if (m.includes('password')) {
          msg = 'Your password does not meet the minimum requirements.';
        } else if (m.includes('rate limit')) {
          msg = 'Too many sign-up attempts. Please wait a moment and try again.';
        }
        showAlert('error', msg);
        setLoading(false);
        return;
      }

      // Success — show verification screen
      if (successEmail) successEmail.textContent = email;
      if (signupCard)   signupCard.setAttribute('hidden', '');
      if (successCard)  successCard.removeAttribute('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      console.error('JARA signup error:', err);
      showAlert('error', 'A network error occurred. Please check your connection.');
      setLoading(false);
    }
  });


  /* ==========================================================
     RESEND VERIFICATION EMAIL
  ========================================================== */

  resendBtn?.addEventListener('click', async () => {
    if (!lastEmail) return;
    resendBtn.disabled    = true;
    resendBtn.textContent = 'Sending…';

    try {
      const { error } = await window._supabase.auth.resend({
        type:  'signup',
        email: lastEmail,
      });

      if (error) {
        resendBtn.disabled    = false;
        resendBtn.textContent = 'Resend failed. Tap to try again.';
        return;
      }

      resendBtn.textContent = 'Email sent! Check your inbox.';

      let countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        resendBtn.textContent = `Resend again in ${countdown}s`;
        if (countdown <= 0) {
          clearInterval(timer);
          resendBtn.disabled    = false;
          resendBtn.textContent = "Didn't receive it? Resend email";
        }
      }, 1000);

    } catch (err) {
      resendBtn.disabled    = false;
      resendBtn.textContent = 'Resend failed. Tap to try again.';
    }
  });

});

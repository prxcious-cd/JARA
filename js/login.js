/* ============================================================
   JARA ∆ — Login Page Logic  (auth-integrated)
   js/login.js

   Depends on:
     - window._supabase  → set by js/supabase-client.js
     - window.JARAAuth   → set by js/auth-guard.js
     - HTML IDs in auth/login.html

   TABLE OF CONTENTS
   1.  DOM references
   2.  Utility — show / hide alert banner
   3.  Utility — show / hide field errors
   4.  Utility — set button loading state
   5.  Utility — validate form inputs
   6.  Password visibility toggle
   7.  Clear errors on input
   8.  Form submit — Supabase sign-in flow
============================================================ */


document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. DOM REFERENCES
  ========================================================== */
  const loginForm          = document.getElementById('loginForm');
  const emailInput         = document.getElementById('email');
  const passwordInput      = document.getElementById('password');
  const submitBtn          = document.getElementById('submitBtn');
  const authAlert          = document.getElementById('authAlert');
  const alertIcon          = document.getElementById('alertIcon');
  const alertMessage       = document.getElementById('alertMessage');
  const togglePasswordBtn  = document.getElementById('togglePassword');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const emailError         = document.getElementById('emailError');
  const emailErrorText     = document.getElementById('emailErrorText');
  const passwordError      = document.getElementById('passwordError');
  const passwordErrorText  = document.getElementById('passwordErrorText');


  /* ==========================================================
     2. UTILITY — SHOW / HIDE ALERT BANNER
  ========================================================== */

  function showAlert(type, message) {
    authAlert.classList.remove('auth-alert--success');

    if (type === 'success') {
      authAlert.classList.add('auth-alert--success');
      alertIcon.className = 'auth-alert__icon fa-solid fa-circle-check';
    } else {
      alertIcon.className = 'auth-alert__icon fa-solid fa-circle-exclamation';
    }

    alertMessage.textContent = message;
    authAlert.removeAttribute('hidden');
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    authAlert.setAttribute('hidden', '');
    authAlert.classList.remove('auth-alert--success');
  }


  /* ==========================================================
     3. UTILITY — SHOW / HIDE FIELD ERRORS
  ========================================================== */

  function showFieldError(errorEl, textEl, inputEl, message) {
    textEl.textContent = message;
    errorEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(errorEl, inputEl) {
    errorEl.setAttribute('hidden', '');
    inputEl.classList.remove('is-error');
    inputEl.removeAttribute('aria-invalid');
  }


  /* ==========================================================
     4. UTILITY — BUTTON LOADING STATE
  ========================================================== */

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    submitBtn.classList.toggle('is-loading', isLoading);
  }


  /* ==========================================================
     5. UTILITY — VALIDATE FORM INPUTS
  ========================================================== */

  function validateForm() {
    let isValid = true;

    clearFieldError(emailError, emailInput);
    clearFieldError(passwordError, passwordInput);

    /* ---- Email ---- */
    const emailValue   = emailInput.value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue) {
      showFieldError(emailError, emailErrorText, emailInput,
        'Please enter your email address.');
      isValid = false;
    } else if (!emailPattern.test(emailValue)) {
      showFieldError(emailError, emailErrorText, emailInput,
        'That doesn\'t look like a valid email address.');
      isValid = false;
    }

    /* ---- Password ---- */
    const passwordValue = passwordInput.value;

    if (!passwordValue) {
      showFieldError(passwordError, passwordErrorText, passwordInput,
        'Please enter your password.');
      isValid = false;
    } else if (passwordValue.length < 6) {
      showFieldError(passwordError, passwordErrorText, passwordInput,
        'Password must be at least 6 characters.');
      isValid = false;
    }

    return isValid;
  }


  /* ==========================================================
     6. PASSWORD VISIBILITY TOGGLE
  ========================================================== */

  togglePasswordBtn.addEventListener('click', () => {
    const isCurrentlyHidden = passwordInput.type === 'password';

    if (isCurrentlyHidden) {
      passwordInput.type = 'text';
      togglePasswordIcon.className = 'fa-solid fa-eye-slash';
      togglePasswordBtn.setAttribute('aria-label',   'Hide password');
      togglePasswordBtn.setAttribute('aria-pressed', 'true');
    } else {
      passwordInput.type = 'password';
      togglePasswordIcon.className = 'fa-solid fa-eye';
      togglePasswordBtn.setAttribute('aria-label',   'Show password');
      togglePasswordBtn.setAttribute('aria-pressed', 'false');
    }
  });


  /* ==========================================================
     7. CLEAR ERRORS ON INPUT
  ========================================================== */

  emailInput.addEventListener('input', () => {
    clearFieldError(emailError, emailInput);
    hideAlert();
  });

  passwordInput.addEventListener('input', () => {
    clearFieldError(passwordError, passwordInput);
    hideAlert();
  });


  /* ==========================================================
     8. FORM SUBMIT — SUPABASE SIGN-IN FLOW
  ========================================================== */

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();

    // Step 1: validate inputs
    if (!validateForm()) {
      const firstError = loginForm.querySelector('.field__input.is-error');
      if (firstError) firstError.focus();
      return;
    }

    // Step 2: loading state on
    setLoading(true);

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      /* --------------------------------------------------------
         SUPABASE AUTH — signInWithPassword
      -------------------------------------------------------- */
      const { data, error } = await window._supabase.auth.signInWithPassword({
        email,
        password,
      });

      /* --------------------------------------------------------
         HANDLE AUTH ERRORS
      -------------------------------------------------------- */
      if (error) {
        let friendlyMessage;

        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')
        ) {
          friendlyMessage = 'Incorrect email or password. Please check and try again.';

        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage =
            'Your email address hasn\'t been verified yet. ' +
            'Please check your inbox and click the verification link we sent you.';

        } else if (
          error.message.includes('Too many requests') ||
          error.message.includes('rate limit')
        ) {
          friendlyMessage =
            'Too many login attempts. Please wait a few minutes before trying again.';

        } else if (error.message.includes('User not found')) {
          friendlyMessage =
            'No account found with that email address. Would you like to create one?';

        } else {
          friendlyMessage = 'Something went wrong. Please try again in a moment.';
          console.error('JARA login error:', error.message);
        }

        showAlert('error', friendlyMessage);
        setLoading(false);
        return;
      }

      /* --------------------------------------------------------
         LOGIN SUCCESSFUL
         Use JARAAuth to decide where to send the user.
         - If profile.onboarding_complete is false → onboarding
         - Otherwise → explore
      -------------------------------------------------------- */
      showAlert('success', 'Login successful! Redirecting you now…');

      /*
       FUTURE: Fetch profile to check onboarding_complete and
       route accordingly:

         const profile = await JARAAuth.getProfile(data.user.id);
         if (!profile?.onboarding_complete) {
           window.location.replace(JARAAuth.ROUTES.onboarding);
           return;
         }
      */

      // Default: send to explore
      window.location.replace(JARAAuth.ROUTES.explore);

      // Note: setLoading(false) is intentionally NOT called here.
      // The page is navigating away — keeping the button in loading
      // state prevents a double-submit during the redirect.

    } catch (unexpectedError) {
      /* --------------------------------------------------------
         NETWORK / JAVASCRIPT ERROR
      -------------------------------------------------------- */
      showAlert(
        'error',
        'A network error occurred. Please check your connection and try again.'
      );
      console.error('JARA unexpected login error:', unexpectedError);
      setLoading(false);
    }
  });


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});

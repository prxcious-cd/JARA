/* ============================================================
   JARA ∆ — Login Page Logic
   js/login.js

   Depends on:
     - window._supabase  → set by js/supabase-client.js
     - HTML IDs in auth/login.html

   TABLE OF CONTENTS
   1.  DOM references
   2.  Utility — show / hide alert banner
   3.  Utility — show / hide field errors
   4.  Utility — set button loading state
   5.  Utility — validate form inputs
   6.  Session check — redirect if already logged in
   7.  Password visibility toggle
   8.  Clear errors on input
   9.  Form submit — Supabase sign-in flow
============================================================ */


/* ============================================================
   Wait for the DOM to be fully loaded before doing anything.
   This ensures all HTML elements exist before we query them.
============================================================ */
document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. DOM REFERENCES
     Grab every element we need once, at the top.
     Querying the DOM repeatedly inside loops is slow.
  ========================================================== */
  const loginForm         = document.getElementById('loginForm');
  const emailInput        = document.getElementById('email');
  const passwordInput     = document.getElementById('password');
  const submitBtn         = document.getElementById('submitBtn');
  const authAlert         = document.getElementById('authAlert');
  const alertIcon         = document.getElementById('alertIcon');
  const alertMessage      = document.getElementById('alertMessage');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const togglePasswordIcon= document.getElementById('togglePasswordIcon');
  const emailError        = document.getElementById('emailError');
  const emailErrorText    = document.getElementById('emailErrorText');
  const passwordError     = document.getElementById('passwordError');
  const passwordErrorText = document.getElementById('passwordErrorText');


  /* ==========================================================
     2. UTILITY — SHOW / HIDE ALERT BANNER
  ========================================================== */

  /**
   * Shows the global alert banner at the top of the form.
   * @param {'error'|'success'} type  - Visual style to apply
   * @param {string}            message - Text to display
   */
  function showAlert(type, message) {
    // Remove previous type class
    authAlert.classList.remove('auth-alert--success');

    if (type === 'success') {
      authAlert.classList.add('auth-alert--success');
      alertIcon.className = 'auth-alert__icon fa-solid fa-circle-check';
    } else {
      // Default styling is already error — just reset the icon
      alertIcon.className = 'auth-alert__icon fa-solid fa-circle-exclamation';
    }

    alertMessage.textContent = message;

    // `hidden` is a boolean HTML attribute — remove it to show the element
    authAlert.removeAttribute('hidden');

    // Scroll the alert into view on small screens
    authAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /** Hides the global alert banner. */
  function hideAlert() {
    authAlert.setAttribute('hidden', '');
    authAlert.classList.remove('auth-alert--success');
  }


  /* ==========================================================
     3. UTILITY — SHOW / HIDE FIELD ERRORS
  ========================================================== */

  /**
   * Shows an inline validation error below a field.
   * @param {HTMLElement} errorEl   - The <p class="field__error"> element
   * @param {HTMLElement} textEl    - The <span> inside it that holds the text
   * @param {HTMLInputElement} inputEl - The <input> to mark as invalid
   * @param {string}      message   - Error text to display
   */
  function showFieldError(errorEl, textEl, inputEl, message) {
    textEl.textContent = message;
    errorEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  /**
   * Clears an inline validation error.
   * @param {HTMLElement} errorEl   - The <p class="field__error"> element
   * @param {HTMLInputElement} inputEl - The <input> to unmark
   */
  function clearFieldError(errorEl, inputEl) {
    errorEl.setAttribute('hidden', '');
    inputEl.classList.remove('is-error');
    inputEl.removeAttribute('aria-invalid');
  }


  /* ==========================================================
     4. UTILITY — BUTTON LOADING STATE
  ========================================================== */

  /**
   * Enables or disables the loading state on the submit button.
   * @param {boolean} isLoading
   */
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');

    if (isLoading) {
      submitBtn.classList.add('is-loading');
    } else {
      submitBtn.classList.remove('is-loading');
    }
  }


  /* ==========================================================
     5. UTILITY — VALIDATE FORM INPUTS
     Checks all fields and shows errors.
     Returns true if everything is valid, false if not.
  ========================================================== */

  function validateForm() {
    // Assume valid; flip to false on any failure
    let isValid = true;

    // Clear any previous errors before re-validating
    clearFieldError(emailError, emailInput);
    clearFieldError(passwordError, passwordInput);

    /* ---- Email validation ---- */
    const emailValue = emailInput.value.trim();
    // Simple regex that catches most invalid emails
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue) {
      showFieldError(emailError, emailErrorText, emailInput, 'Please enter your email address.');
      isValid = false;
    } else if (!emailPattern.test(emailValue)) {
      showFieldError(emailError, emailErrorText, emailInput, 'That doesn\'t look like a valid email address.');
      isValid = false;
    }

    /* ---- Password validation ---- */
    const passwordValue = passwordInput.value;

    if (!passwordValue) {
      showFieldError(passwordError, passwordErrorText, passwordInput, 'Please enter your password.');
      isValid = false;
    } else if (passwordValue.length < 6) {
      // Supabase minimum is 6 characters
      showFieldError(passwordError, passwordErrorText, passwordInput, 'Password must be at least 6 characters.');
      isValid = false;
    }

    return isValid;
  }


  /* ==========================================================
     6. SESSION CHECK
     If the user is already logged in, redirect them immediately.
     No need to show the login form to someone with a session.
  ========================================================== */

  (async () => {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();

      if (session) {
        // User is already logged in — figure out where to send them
        await redirectAfterLogin(session.user.id);
      }
    } catch (err) {
      // If the session check fails, stay on the login page — do nothing
      console.warn('JARA: Session check failed.', err.message);
    }
  })();


  /* ==========================================================
     HELPER — REDIRECT AFTER SUCCESSFUL LOGIN
     Checks whether the user has completed onboarding.
       • Incomplete → onboarding.html
       • Complete   → dashboard
  ========================================================== */

  /**
   * Reads the user's profile and redirects to the correct page.
   * @param {string} userId - Supabase Auth user UUID
   */
  async function redirectAfterLogin(userId) {
    try {
      const { data: profile, error } = await window._supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', userId)
        .single();

      if (error || !profile) {
        // Profile row not found — send to onboarding to create it
        window.location.href = 'onboarding.html';
        return;
      }

      if (profile.onboarding_complete) {
        // Fully set up — send to dashboard
        window.location.href = '../dashboard/index.html';
      } else {
        // Profile exists but onboarding not done
        window.location.href = 'onboarding.html';
      }

    } catch (err) {
      // Unexpected error — send to onboarding as a safe fallback
      console.error('JARA: Redirect check failed.', err.message);
      window.location.href = 'onboarding.html';
    }
  }


  /* ==========================================================
     7. PASSWORD VISIBILITY TOGGLE
     Switches the password input between type="password"
     and type="text" so the user can see what they typed.
  ========================================================== */

  togglePasswordBtn.addEventListener('click', () => {
    const isCurrentlyHidden = passwordInput.type === 'password';

    if (isCurrentlyHidden) {
      // Show password
      passwordInput.type = 'text';
      togglePasswordIcon.className = 'fa-solid fa-eye-slash';
      togglePasswordBtn.setAttribute('aria-label', 'Hide password');
      togglePasswordBtn.setAttribute('aria-pressed', 'true');
    } else {
      // Hide password
      passwordInput.type = 'password';
      togglePasswordIcon.className = 'fa-solid fa-eye';
      togglePasswordBtn.setAttribute('aria-label', 'Show password');
      togglePasswordBtn.setAttribute('aria-pressed', 'false');
    }
  });


  /* ==========================================================
     8. CLEAR ERRORS ON INPUT
     As soon as the user starts correcting a field,
     remove the error state so it doesn't feel punishing.
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
     9. FORM SUBMIT — SUPABASE SIGN-IN FLOW
  ========================================================== */

  loginForm.addEventListener('submit', async (event) => {
    // Prevent the default browser form submission (page reload)
    event.preventDefault();

    // Always hide any previous alert before a new attempt
    hideAlert();

    // Step 1: validate all inputs first — stop here if invalid
    if (!validateForm()) {
      // Focus the first field that has an error
      const firstError = loginForm.querySelector('.field__input.is-error');
      if (firstError) firstError.focus();
      return;
    }

    // Step 2: show loading state — disable button, show spinner
    setLoading(true);

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      /* ----------------------------------------------------------
         SUPABASE AUTH — signInWithPassword
         Sends the email and password to Supabase.
         Returns { data, error }.
         data.user  → the authenticated user object
         data.session → the active session
      ---------------------------------------------------------- */
      const { data, error } = await window._supabase.auth.signInWithPassword({
        email,
        password,
      });

      /* ----------------------------------------------------------
         HANDLE AUTH ERRORS
         Supabase returns specific error messages.
         We translate them into friendly language for the user.
      ---------------------------------------------------------- */
      if (error) {
        let friendlyMessage;

        // Map known Supabase error messages to friendly versions
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')
        ) {
          friendlyMessage = 'Incorrect email or password. Please check and try again.';

        } else if (error.message.includes('Email not confirmed')) {
          friendlyMessage =
            'Your email address hasn\'t been verified yet. Please check your inbox and click the verification link we sent you.';

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
          // Fallback for any error we didn't anticipate
          friendlyMessage = 'Something went wrong. Please try again in a moment.';
          console.error('JARA login error:', error.message);
        }

        showAlert('error', friendlyMessage);
        setLoading(false);
        return;
      }

      /* ----------------------------------------------------------
         LOGIN SUCCESSFUL
         data.user.id is the UUID we use to query the profile.
      ---------------------------------------------------------- */
      showAlert('success', 'Login successful! Redirecting you now…');

      // Redirect to onboarding or dashboard based on profile state
      await redirectAfterLogin(data.user.id);

      // Note: setLoading(false) is intentionally NOT called here.
      // The page will redirect, so keeping the button in loading
      // state prevents the user from clicking again mid-redirect.

    } catch (unexpectedError) {
      /* ----------------------------------------------------------
         NETWORK OR JAVASCRIPT ERROR
         This catches things like no internet connection.
      ---------------------------------------------------------- */
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

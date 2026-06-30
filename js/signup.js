/* ============================================================
   JARA ∆ — Signup Page Logic
   js/signup.js

   Depends on:
     - window._supabase  → set by js/supabase-client.js
     - HTML IDs in auth/signup.html

   TABLE OF CONTENTS
   1.  DOM references
   2.  Utility — alert banner
   3.  Utility — field errors
   4.  Utility — loading state
   5.  Session check
   6.  Password visibility toggles
   7.  Password strength meter
   8.  Real-time confirm password match
   9.  Form validation
   10. Form submit — Supabase signup flow
   11. Show success screen
   12. Resend verification email
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. DOM REFERENCES
  ========================================================== */
  const signupForm            = document.getElementById('signupForm');
  const signupCard            = document.getElementById('signupCard');
  const successCard           = document.getElementById('successCard');
  const submitBtn             = document.getElementById('submitBtn');

  // Alert banner
  const authAlert             = document.getElementById('authAlert');
  const alertIcon             = document.getElementById('alertIcon');
  const alertMessage          = document.getElementById('alertMessage');

  // Inputs
  const fullNameInput         = document.getElementById('fullName');
  const emailInput            = document.getElementById('email');
  const passwordInput         = document.getElementById('password');
  const confirmPasswordInput  = document.getElementById('confirmPassword');
  const acceptTermsInput      = document.getElementById('acceptTerms');

  // Password toggles
  const togglePasswordBtn     = document.getElementById('togglePassword');
  const togglePasswordIcon    = document.getElementById('togglePasswordIcon');
  const toggleConfirmBtn      = document.getElementById('toggleConfirmPassword');
  const toggleConfirmIcon     = document.getElementById('toggleConfirmIcon');

  // Strength meter
  const strengthMeter         = document.getElementById('strengthMeter');
  const strengthLabel         = document.getElementById('passwordStrengthLabel');

  // Field error elements
  const fullNameError         = document.getElementById('fullNameError');
  const fullNameErrorText     = document.getElementById('fullNameErrorText');
  const emailError            = document.getElementById('emailError');
  const emailErrorText        = document.getElementById('emailErrorText');
  const passwordError         = document.getElementById('passwordError');
  const passwordErrorText     = document.getElementById('passwordErrorText');
  const confirmPasswordError  = document.getElementById('confirmPasswordError');
  const confirmPasswordErrorText = document.getElementById('confirmPasswordErrorText');
  const termsError            = document.getElementById('termsError');
  const termsErrorText        = document.getElementById('termsErrorText');

  // Success screen elements
  const successEmail          = document.getElementById('successEmail');
  const resendBtn             = document.getElementById('resendBtn');

  // Track the email used so we can resend to it
  let lastSignupEmail = '';


  /* ==========================================================
     2. UTILITY — ALERT BANNER
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
     3. UTILITY — FIELD ERRORS
  ========================================================== */

  function showFieldError(errorEl, textEl, inputEl, message) {
    textEl.textContent = message;
    errorEl.removeAttribute('hidden');
    inputEl.classList.add('is-error');
    inputEl.classList.remove('is-valid');
    inputEl.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError(errorEl, inputEl) {
    errorEl.setAttribute('hidden', '');
    inputEl.classList.remove('is-error');
    inputEl.removeAttribute('aria-invalid');
  }

  function markFieldValid(inputEl) {
    inputEl.classList.remove('is-error');
    inputEl.classList.add('is-valid');
    inputEl.removeAttribute('aria-invalid');
  }


  /* ==========================================================
     4. UTILITY — LOADING STATE
  ========================================================== */

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    submitBtn.classList.toggle('is-loading', isLoading);
  }


  /* ==========================================================
     5. SESSION CHECK
     Redirect away if the user is already logged in.
  ========================================================== */

  (async () => {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      if (session) {
        // Already logged in — check onboarding status
        const { data: profile } = await window._supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .single();

        if (profile && profile.onboarding_complete) {
          window.location.href = '../dashboard/index.html';
        } else {
          window.location.href = 'onboarding.html';
        }
      }
    } catch (err) {
      // Session check failed — stay on page, do nothing
      console.warn('JARA: Session check failed.', err.message);
    }
  })();


  /* ==========================================================
     6. PASSWORD VISIBILITY TOGGLES
  ========================================================== */

  function setupToggle(btn, icon, input) {
    btn.addEventListener('click', () => {
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      icon.className = isHidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      btn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
    });
  }

  setupToggle(togglePasswordBtn, togglePasswordIcon, passwordInput);
  setupToggle(toggleConfirmBtn, toggleConfirmIcon, confirmPasswordInput);


  /* ==========================================================
     7. PASSWORD STRENGTH METER
     Runs on every keystroke in the password field.

     Scoring rules (each = 1 point, max 4):
       1. At least 8 characters
       2. Contains a number
       3. Contains a special character
       4. Contains both uppercase and lowercase letters

     Score → Strength level:
       0–1 → Weak   (red,    1 bar)
       2   → Fair   (orange, 2 bars)
       3   → Good   (blue,   3 bars)
       4   → Strong (green,  4 bars)
  ========================================================== */

  const strengthLevels = {
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
  };

  function getPasswordStrength(password) {
    if (!password) return 0;

    let score = 0;

    // Rule 1: length
    if (password.length >= 8) score++;

    // Rule 2: contains a digit
    if (/\d/.test(password)) score++;

    // Rule 3: contains a special character
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Rule 4: contains mixed case
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;

    // Minimum score of 1 if there's any input at all
    return Math.max(score, 1);
  }

  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;

    // Hide the meter if the field is empty
    if (!value) {
      strengthMeter.setAttribute('hidden', '');
      strengthMeter.removeAttribute('data-strength');
      strengthLabel.textContent = '';
      return;
    }

    // Show the meter
    strengthMeter.removeAttribute('hidden');

    const score = getPasswordStrength(value);
    strengthMeter.setAttribute('data-strength', score);
    strengthLabel.textContent = strengthLevels[score] || '';

    // Clear any password error as the user types
    clearFieldError(passwordError, passwordInput);
    hideAlert();
  });


  /* ==========================================================
     8. REAL-TIME CONFIRM PASSWORD MATCH
     After the user has typed in confirm password,
     check on every keystroke whether it matches.
  ========================================================== */

  confirmPasswordInput.addEventListener('input', () => {
    const matches = confirmPasswordInput.value === passwordInput.value;

    if (confirmPasswordInput.value && !matches) {
      showFieldError(
        confirmPasswordError,
        confirmPasswordErrorText,
        confirmPasswordInput,
        'Passwords do not match.'
      );
    } else {
      clearFieldError(confirmPasswordError, confirmPasswordInput);
      if (matches && confirmPasswordInput.value) {
        markFieldValid(confirmPasswordInput);
      }
    }

    hideAlert();
  });


  /* ==========================================================
     Clear errors when user edits fields
  ========================================================== */

  fullNameInput.addEventListener('input', () => {
    clearFieldError(fullNameError, fullNameInput);
    hideAlert();
  });

  emailInput.addEventListener('input', () => {
    clearFieldError(emailError, emailInput);
    hideAlert();
  });

  acceptTermsInput.addEventListener('change', () => {
    clearFieldError(termsError, acceptTermsInput);
    hideAlert();
  });


  /* ==========================================================
     9. FORM VALIDATION
     Called before submitting. Returns true if all valid.
  ========================================================== */

  function validateForm() {
    let isValid = true;

    // Clear all errors first
    clearFieldError(fullNameError, fullNameInput);
    clearFieldError(emailError, emailInput);
    clearFieldError(passwordError, passwordInput);
    clearFieldError(confirmPasswordError, confirmPasswordInput);
    clearFieldError(termsError, acceptTermsInput);

    /* ---- Full name ---- */
    const nameValue = fullNameInput.value.trim();
    if (!nameValue) {
      showFieldError(fullNameError, fullNameErrorText, fullNameInput,
        'Please enter your full name.');
      isValid = false;
    } else if (nameValue.length < 2) {
      showFieldError(fullNameError, fullNameErrorText, fullNameInput,
        'Name must be at least 2 characters.');
      isValid = false;
    } else if (nameValue.length > 100) {
      showFieldError(fullNameError, fullNameErrorText, fullNameInput,
        'Name must be under 100 characters.');
      isValid = false;
    }

    /* ---- Email ---- */
    const emailValue = emailInput.value.trim();
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
        'Please create a password.');
      isValid = false;
    } else if (passwordValue.length < 8) {
      showFieldError(passwordError, passwordErrorText, passwordInput,
        'Password must be at least 8 characters.');
      isValid = false;
    } else if (getPasswordStrength(passwordValue) < 2) {
      showFieldError(passwordError, passwordErrorText, passwordInput,
        'Password is too weak. Add numbers or special characters.');
      isValid = false;
    }

    /* ---- Confirm password ---- */
    const confirmValue = confirmPasswordInput.value;
    if (!confirmValue) {
      showFieldError(confirmPasswordError, confirmPasswordErrorText, confirmPasswordInput,
        'Please confirm your password.');
      isValid = false;
    } else if (confirmValue !== passwordValue) {
      showFieldError(confirmPasswordError, confirmPasswordErrorText, confirmPasswordInput,
        'Passwords do not match.');
      isValid = false;
    }

    /* ---- Terms ---- */
    if (!acceptTermsInput.checked) {
      showFieldError(termsError, termsErrorText, acceptTermsInput,
        'You must accept the Terms of Service to continue.');
      isValid = false;
    }

    return isValid;
  }


  /* ==========================================================
     10. FORM SUBMIT — SUPABASE SIGNUP FLOW
  ========================================================== */

  signupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();

    // Step 1: validate all fields
    if (!validateForm()) {
      // Focus the first errored field
      const firstError = signupForm.querySelector('.field__input.is-error');
      if (firstError) firstError.focus();
      return;
    }

    // Step 2: show loading state
    setLoading(true);

    const fullName = fullNameInput.value.trim();
    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    try {
      /* --------------------------------------------------------
         SUPABASE AUTH — signUp
         Creates the user in auth.users.
         Our database trigger (handle_new_user) automatically
         creates the matching profiles row.

         data.user  → the created user object (or null on error)
         data.session → null until email is verified (by design)
      -------------------------------------------------------- */
      const { data, error } = await window._supabase.auth.signUp({
        email,
        password,
        options: {
          // Pass full_name so it's available in auth metadata.
          // Our profiles table will be populated fully during onboarding.
          data: {
            full_name: fullName,
          },
          // After clicking the email link, Supabase redirects here.
          // Replace this with your real GitHub Pages URL.
          /* ==========================
             CHANGE THIS
             Replace with your actual GitHub Pages URL.
             Example: https://yourname.github.io/jara/auth/login.html
          ========================== */
          emailRedirectTo: 'https://prxcious-cd.github.io/jara/auth/login.html',
        },
      });

      /* --------------------------------------------------------
         HANDLE SUPABASE ERRORS
      -------------------------------------------------------- */
      if (error) {
        let friendlyMessage;

        if (error.message.includes('already registered') ||
            error.message.includes('User already registered')) {
          friendlyMessage =
            'An account with this email already exists. Would you like to log in instead?';

        } else if (error.message.includes('Password should be')) {
          friendlyMessage =
            'Your password doesn\'t meet the requirements. Please choose a stronger password.';

        } else if (error.message.includes('invalid email') ||
                   error.message.includes('Invalid email')) {
          friendlyMessage = 'Please enter a valid email address.';

        } else if (error.message.includes('rate limit') ||
                   error.message.includes('Too many requests')) {
          friendlyMessage =
            'Too many attempts. Please wait a few minutes and try again.';

        } else {
          friendlyMessage = 'Something went wrong. Please try again in a moment.';
          console.error('JARA signup error:', error.message);
        }

        showAlert('error', friendlyMessage);
        setLoading(false);
        return;
      }

      /* --------------------------------------------------------
         SIGNUP SUCCESSFUL
         Supabase has sent a verification email.
         We do NOT log the user in yet — they must verify first.

         data.user will exist even before verification.
         data.session will be null (email not yet confirmed).
      -------------------------------------------------------- */

      // Store the email for the resend button
      lastSignupEmail = email;

      // Show the success screen
      showSuccessScreen(email);

    } catch (unexpectedError) {
      showAlert('error',
        'A network error occurred. Please check your connection and try again.');
      console.error('JARA unexpected signup error:', unexpectedError);
      setLoading(false);
    }
  });


  /* ==========================================================
     11. SHOW SUCCESS SCREEN
     Hides the form card and reveals the verification screen.
  ========================================================== */

  function showSuccessScreen(email) {
    // Put the user's email into the success message
    successEmail.textContent = email;

    // Hide the signup form
    signupCard.setAttribute('hidden', '');

    // Show the success card with a smooth reveal
    successCard.removeAttribute('hidden');
    successCard.style.animation = 'card-appear 400ms ease forwards';

    // Scroll to top in case the user was scrolled down
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Add the card-appear animation to the stylesheet at runtime
  // (avoids adding it to the CSS file where it would always load)
  const style = document.createElement('style');
  style.textContent = `
    @keyframes card-appear {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);


  /* ==========================================================
     12. RESEND VERIFICATION EMAIL
     Calls Supabase resend() if the user didn't get the email.
     Disables the button for 60 seconds to prevent spam.
  ========================================================== */

  resendBtn.addEventListener('click', async () => {
    if (!lastSignupEmail) return;

    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';

    try {
      const { error } = await window._supabase.auth.resend({
        type:  'signup',
        email: lastSignupEmail,
        options: {
          /* ==========================
             CHANGE THIS
             Same redirect URL as above.
          ========================== */
          emailRedirectTo: 'https://prxcious-cd.github.io/jara/auth/login.html',
        },
      });

      if (error) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend failed. Tap to try again.';
        return;
      }

      // Success — show confirmation and start cooldown
      resendBtn.textContent = 'Email sent! Check your inbox.';

      // Re-enable after 60 seconds
      let countdown = 60;
      const timer = setInterval(() => {
        countdown--;
        resendBtn.textContent = `Resend again in ${countdown}s`;
        if (countdown <= 0) {
          clearInterval(timer);
          resendBtn.disabled = false;
          resendBtn.textContent = 'Didn\'t receive it? Resend email';
        }
      }, 1000);

    } catch (err) {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend failed. Tap to try again.';
      console.error('JARA resend error:', err);
 }
  });


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});

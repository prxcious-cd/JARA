/* ============================================================
   JARA ∆ — Forgot Password Page Logic
   js/forgot-password.js

   Depends on:
     - window._supabase  (js/supabase-client.js)
     - DOM in auth/forgot-password.html

   FLOW:
   1. User enters their email address.
   2. We call supabase.auth.resetPasswordForEmail().
   3. Supabase sends a magic link to the email.
   4. The link opens auth/reset-password.html with a session token.
   5. We show the success screen with the email address.

   TABLE OF CONTENTS
   1.  DOM references
   2.  Alert banner helpers
   3.  Field error helpers
   4.  Loading state helper
   5.  Form validation
   6.  Show success screen
   7.  Resend email + cooldown
   8.  Form submit — Supabase resetPasswordForEmail
   9.  Session check (skip page if already logged in)
   10. Init
============================================================ */

document.addEventListener('DOMContentLoaded', () => {


  /* ==========================================================
     1. DOM REFERENCES
  ========================================================== */
  const forgotForm     = document.getElementById('forgotForm');
  const emailCard      = document.getElementById('emailCard');
  const successCard    = document.getElementById('successCard');
  const emailInput     = document.getElementById('email');
  const submitBtn      = document.getElementById('submitBtn');
  const authAlert      = document.getElementById('authAlert');
  const alertIcon      = document.getElementById('alertIcon');
  const alertMessage   = document.getElementById('alertMessage');
  const emailError     = document.getElementById('emailError');
  const emailErrorText = document.getElementById('emailErrorText');
  const successEmail   = document.getElementById('successEmail');
  const resendBtn      = document.getElementById('resendBtn');

  // The email that was submitted — used for resend
  let lastEmail = '';


  /* ==========================================================
     2. ALERT BANNER HELPERS
  ========================================================== */

  function showAlert(type, message) {
    authAlert.className = `auth-alert${type === 'success' ? ' auth-alert--success' : ''}`;
    alertIcon.className = type === 'success'
      ? 'auth-alert__icon fa-solid fa-circle-check'
      : 'auth-alert__icon fa-solid fa-circle-exclamation';
    alertMessage.textContent = message;
    authAlert.removeAttribute('hidden');
  }

  function hideAlert() {
    authAlert.setAttribute('hidden', '');
  }


  /* ==========================================================
     3. FIELD ERROR HELPERS
  ========================================================== */

  function showFieldError(message) {
    emailErrorText.textContent = message;
    emailError.removeAttribute('hidden');
    emailInput.classList.add('is-error');
    emailInput.setAttribute('aria-invalid', 'true');
  }

  function clearFieldError() {
    emailError.setAttribute('hidden', '');
    emailInput.classList.remove('is-error');
    emailInput.removeAttribute('aria-invalid');
  }


  /* ==========================================================
     4. LOADING STATE HELPER
  ========================================================== */

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', isLoading ? 'true' : 'false');
    submitBtn.classList.toggle('is-loading', isLoading);
  }


  /* ==========================================================
     5. FORM VALIDATION
  ========================================================== */

  function validate() {
    clearFieldError();
    hideAlert();

    const value   = emailInput.value.trim();
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!value) {
      showFieldError('Please enter your email address.');
      return false;
    }

    if (!pattern.test(value)) {
      showFieldError('Please enter a valid email address.');
      return false;
    }

    return true;
  }


  /* ==========================================================
     6. SHOW SUCCESS SCREEN
  ========================================================== */

  function showSuccess(email) {
    successEmail.textContent = email;
    emailCard.setAttribute('hidden', '');
    successCard.removeAttribute('hidden');
    successCard.style.animation = 'card-appear 350ms cubic-bezier(0.2,0,0,1) both';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  /* ==========================================================
     7. RESEND EMAIL + COOLDOWN TIMER
  ========================================================== */

  async function sendResetEmail(email) {
    /*
     Supabase resetPasswordForEmail sends a magic link.
     The emailRedirectTo URL is where Supabase redirects
     after the user clicks the link. It must be on the
     same domain as your site URL in Supabase settings.

     ==========================
     CHANGE THIS
     Replace with your real GitHub Pages URL.
     Example: https://yourname.github.io/jara/auth/reset-password.html
     ==========================
    */
    const { error } = await window._supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://yourname.github.io/jara/auth/reset-password.html',
    });

    return error;
  }

  resendBtn.addEventListener('click', async () => {
    if (!lastEmail) return;

    resendBtn.disabled    = true;
    resendBtn.textContent = 'Sending…';

    const error = await sendResetEmail(lastEmail);

    if (error) {
      resendBtn.disabled    = false;
      resendBtn.textContent = 'Resend failed. Tap to try again.';
      return;
    }

    resendBtn.textContent = 'Email sent! Check your inbox.';

    // 60-second cooldown before allowing another resend
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
  });


  /* ==========================================================
     8. FORM SUBMIT — SUPABASE resetPasswordForEmail
  ========================================================== */

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    const email = emailInput.value.trim();
    lastEmail   = email;

    try {
      const error = await sendResetEmail(email);

      if (error) {
        /*
         Supabase intentionally returns a success-like response
         for non-existent emails to prevent user enumeration.
         If we still get an error it's likely rate limiting
         or a server issue.
        */
        let friendly = 'Something went wrong. Please try again.';

        if (
          error.message.includes('rate limit') ||
          error.message.includes('Too many requests')
        ) {
          friendly = 'Too many requests. Please wait a few minutes and try again.';
        }

        showAlert('error', friendly);
        setLoading(false);
        return;
      }

      // Always show success — even if the email doesn't exist,
      // we show the same screen to prevent user enumeration.
      showSuccess(email);

    } catch (err) {
      showAlert('error', 'A network error occurred. Please check your connection and try again.');
      console.error('JARA forgot-password error:', err);
      setLoading(false);
    }
  });


  /* ==========================================================
     9. CLEAR FIELD ERROR ON INPUT
  ========================================================== */

  emailInput.addEventListener('input', () => {
    clearFieldError();
    hideAlert();
  });


  /* ==========================================================
     10. INIT — Skip page if already logged in
  ========================================================== */

  (async () => {
    try {
      const { data: { session } } = await window._supabase.auth.getSession();
      if (session) {
        // Already logged in — no need to reset
        window.location.href = '../explore/index.html';
      }
    } catch (err) {
      // Session check failed — stay on page
    }
  })();


/* ============================================================
   End of DOMContentLoaded
============================================================ */
});

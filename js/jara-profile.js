/* ============================================================
   JARA ∆ — Profile Service  (v1)
   js/jara-profile.js

   Central profile data layer.
   Every page that needs profile data imports this module.

   EXPORTS (on window.JARAProfile):
     load()              — fetch + cache profile for current user
     get()               — return cached profile (sync)
     refresh()           — force re-fetch from Supabase
     update(fields)      — update profile fields in Supabase
     uploadAvatar(file)  — upload photo, update avatar_url
     clear()             — clear cache (on sign-out)

   USAGE:
     Any page script:
       const profile = await JARAProfile.load();
       if (!profile) { /* handle missing profile *\/ }

   TABLE OF CONTENTS
   1.  Constants
   2.  In-memory cache
   3.  load()
   4.  get()
   5.  refresh()
   6.  update()
   7.  uploadAvatar()
   8.  clear()
   9.  Helpers
   10. Export
============================================================ */

(function () {
  'use strict';

  /* ==========================================================
     1. CONSTANTS
  ========================================================== */

  const STORAGE_BUCKET   = 'avatars';
  const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB

  /*
   Columns we select on every profile fetch.
   Add new columns here as the schema grows.
  */
  const PROFILE_SELECT = `
    id,
    jara_id,
    full_name,
    username,
    avatar_url,
    account_type,
    bio,
    school,
    faculty,
    department,
    business_name,
    business_category,
    business_description,
    location,
    phone,
    whatsapp,
    website,
    is_verified,
    is_founding_member,
    is_premium,
    pro_status,
    onboarding_complete,
    created_at
  `.trim();


  /* ==========================================================
     2. IN-MEMORY CACHE
     Stores the profile for the duration of the page session.
     Avoids repeated Supabase round-trips.
  ========================================================== */

  let _cache   = null;   // profile object or null
  let _loading = null;   // Promise while a fetch is in flight


  /* ==========================================================
     3. load()
     ──────────────────────────────────────────────────────────
     Fetch the current user's profile from Supabase.
     Returns the profile object, or null if not found.

     If a fetch is already in flight, the same Promise is
     returned so concurrent callers don't cause duplicate requests.

     If the cache is already populated, resolves immediately.
  ========================================================== */

  async function load() {
    // Return cached profile immediately
    if (_cache) return _cache;

    // If a fetch is already in flight, wait for it
    if (_loading) return _loading;

    _loading = _doLoad();
    const result = await _loading;
    _loading = null;
    return result;
  }

  async function _doLoad() {
    const sb = _client();
    if (!sb) return null;

    try {
      /* ---- Get current user from Supabase Auth ---- */
      const { data: { session }, error: sessionError } =
        await sb.auth.getSession();

      if (sessionError || !session) {
        console.warn('JARAProfile.load: no active session.');
        return null;
      }

      const userId = session.user.id;

      /* ---- Fetch profile row ---- */
      /*
       FUTURE: Expand PROFILE_SELECT as more columns are added.
       FUTURE: Join with schools table for school display name.
      */
      const { data: profile, error: profileError } = await sb
        .from('profiles')
        .select(PROFILE_SELECT)
        .eq('id', userId)
        .single();

      if (profileError) {
        // PGRST116 = no row found — new user, not an error condition
        if (profileError.code === 'PGRST116') {
          console.warn('JARAProfile.load: profile row not found for', userId);
          return null;
        }
        console.error('JARAProfile.load: fetch error:', profileError.message);
        return null;
      }

      // Store in cache
      _cache = profile;
      return profile;

    } catch (err) {
      console.error('JARAProfile.load: unexpected error:', err.message);
      return null;
    }
  }


  /* ==========================================================
     4. get()
     ──────────────────────────────────────────────────────────
     Synchronous accessor. Returns cached profile or null.
     Only use after load() has resolved.
  ========================================================== */

  function get() {
    return _cache;
  }


  /* ==========================================================
     5. refresh()
     ──────────────────────────────────────────────────────────
     Clears the cache and re-fetches from Supabase.
     Use after an update to keep cache in sync.
  ========================================================== */

  async function refresh() {
    _cache   = null;
    _loading = null;
    return load();
  }


  /* ==========================================================
     6. update(fields)
     ──────────────────────────────────────────────────────────
     Update one or more profile fields in Supabase.
     Also updates the in-memory cache immediately.

     @param  {object}  fields  — key/value pairs to update
     @returns {object}          — { data, error }

     Example:
       await JARAProfile.update({ bio: 'New bio', location: 'Ede' });
  ========================================================== */

  async function update(fields) {
    const sb = _client();
    if (!sb) return { data: null, error: new Error('Supabase not ready') };

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return { data: null, error: new Error('Not authenticated') };

      const userId = session.user.id;

      /*
       Always stamp updated_at so we can track changes.
       FUTURE: Add updated_at column to profiles table if not present.
      */
      const payload = {
        ...fields,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await sb
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select(PROFILE_SELECT)
        .single();

      if (error) {
        console.error('JARAProfile.update: error:', error.message);
        return { data: null, error };
      }

      // Update cache with fresh data from Supabase
      _cache = data;

      return { data, error: null };

    } catch (err) {
      console.error('JARAProfile.update: unexpected error:', err.message);
      return { data: null, error: err };
    }
  }


  /* ==========================================================
     7. uploadAvatar(file)
     ──────────────────────────────────────────────────────────
     Uploads a new profile photo to Supabase Storage,
     updates avatar_url in the profiles table,
     and refreshes the cache.

     @param  {File}    file  — image file from <input type="file">
     @returns {object}        — { url, error }
  ========================================================== */

  async function uploadAvatar(file) {
    const sb = _client();
    if (!sb) return { url: null, error: new Error('Supabase not ready') };

    /* ---- Validate file ---- */
    if (!file) {
      return { url: null, error: new Error('No file provided') };
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return {
        url:   null,
        error: new Error('Image is too large. Maximum size is 5 MB.'),
      };
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return {
        url:   null,
        error: new Error('Please upload a JPG, PNG, WebP or GIF image.'),
      };
    }

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return { url: null, error: new Error('Not authenticated') };

      const userId = session.user.id;

      /* ---- Build storage path ---- */
      const ext      = file.name.split('.').pop().toLowerCase();
      const filePath = `${userId}/avatar.${ext}`;

      /* ---- Upload to Supabase Storage ---- */
      /*
       upsert: true replaces an existing file at the same path,
       so old avatars are automatically overwritten.
      */
      const { error: uploadError } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          upsert:      true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error('JARAProfile.uploadAvatar: upload error:', uploadError.message);
        return { url: null, error: uploadError };
      }

      /* ---- Get public URL ---- */
      const { data: { publicUrl } } = sb.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      /*
       Append a cache-busting timestamp so browsers don't
       serve the old avatar from cache after an update.
      */
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      /* ---- Save URL to profile ---- */
      const { error: updateError } = await update({ avatar_url: avatarUrl });

      if (updateError) {
        return { url: null, error: updateError };
      }

      return { url: avatarUrl, error: null };

    } catch (err) {
      console.error('JARAProfile.uploadAvatar: unexpected error:', err.message);
      return { url: null, error: err };
    }
  }


  /* ==========================================================
     8. clear()
     ──────────────────────────────────────────────────────────
     Clears the in-memory cache.
     Call on sign-out so stale data is not shown to the
     next user on a shared device.
  ========================================================== */

  function clear() {
    _cache   = null;
    _loading = null;
  }


  /* ==========================================================
     9. HELPERS
  ========================================================== */

  function _client() {
    if (!window._supabase) {
      console.error('JARAProfile: window._supabase is not defined.');
      return null;
    }
    return window._supabase;
  }

  /**
   * Returns a display-safe first name from a full_name string.
   * Falls back to "there" if name is empty.
   */
  function getFirstName(profile) {
    if (!profile?.full_name) return 'there';
    return profile.full_name.trim().split(' ')[0];
  }

  /**
   * Returns the display name for a profile.
   * Business accounts use business_name, others use full_name.
   */
  function getDisplayName(profile) {
    if (!profile) return '';
    if (profile.account_type === 'business' && profile.business_name) {
      return profile.business_name;
    }
    return profile.full_name || '';
  }

  /**
   * Returns the correct avatar src.
   * Falls back to a generated initial-based placeholder.
   */
  function getAvatarUrl(profile) {
    if (profile?.avatar_url) return profile.avatar_url;
    return null; // callers render initials fallback
  }

  /**
   * Returns initials (up to 2 chars) from a display name.
   */
  function getInitials(profile) {
    const name = getDisplayName(profile) || profile?.full_name || '?';
    const words = name.trim().split(' ').filter(Boolean);
    if (words.length === 0) return '?';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }

  /**
   * True if the profile has active PRO status.
   */
  function isPro(profile) {
    return profile?.pro_status === 'active' || profile?.is_premium === true;
  }

  /**
   * True if the profile is a Founding Member.
   */
  function isFounder(profile) {
    return profile?.is_founding_member === true;
  }


  /* ==========================================================
     10. EXPORT
  ========================================================== */

  window.JARAProfile = {
    load,
    get,
    refresh,
    update,
    uploadAvatar,
    clear,

    // Helpers
    getFirstName,
    getDisplayName,
    getAvatarUrl,
    getInitials,
    isPro,
    isFounder,
  };

  /*
   Clear profile cache on sign-out so a new user
   on the same device doesn't see stale data.
  */
  if (window._supabase) {
    window._supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clear();
      }
    });
  }

})();

/* ============================================================
   JARA ∆ — Listings Service  (v1)
   js/jara-listings.js

   Central listings data layer.
   Every page that needs listing data uses this module.

   EXPORTS (on window.JARAListings):
     fetch(options)          — query listings from Supabase
     fetchOne(id)            — fetch a single listing by ID
     fetchByOwner(ownerId)   — fetch all listings for a seller
     create(fields, images)  — create a new listing + upload images
     update(id, fields, images) — update listing + manage images
     remove(id)              — delete listing + all storage images
     getCategories()         — return all distinct categories

   TABLE OF CONTENTS
   1.  Constants
   2.  Image helpers
   3.  fetch()
   4.  fetchOne()
   5.  fetchByOwner()
   6.  create()
   7.  update()
   8.  remove()
   9.  getCategories()
   10. Utility helpers
   11. Export
============================================================ */

(function () {
  'use strict';

  /* ==========================================================
     1. CONSTANTS
  ========================================================== */

  const STORAGE_BUCKET   = 'product-images';
  const MAX_IMAGE_BYTES  = 5 * 1024 * 1024;   // 5 MB per image
  const MAX_IMAGES       = 8;
  const DEFAULT_LIMIT    = 20;

  /*
   Columns selected on every listing fetch.
   Joined with owner profile for display.
  */
const LISTING_SELECT = `
    id,
    owner_id,
    title,
    description,
    category,
    listing_type,
    price,
    negotiable,
    condition,
    location,
    status,
    images,
    view_count,
    created_at,
    updated_at,
    profiles (
      id,
      full_name,
      username,
      business_name,
      avatar_url,
      account_type,
      school,
      phone,
      whatsapp,
      is_verified,
      is_founding_member,
      is_premium,
      pro_status
    )
  `.trim();


  /* ==========================================================
     2. IMAGE HELPERS
  ========================================================== */

  /**
   * Upload an array of File objects to Supabase Storage.
   * Returns an array of public URLs.
   * Skips files that are already URLs (existing images).
   */
  async function uploadImages(listingId, files) {
    const sb  = _client();
    const urls = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Already a URL string — keep it as-is
      if (typeof file === 'string') {
        urls.push(file);
        continue;
      }

      if (!(file instanceof File)) continue;

      if (file.size > MAX_IMAGE_BYTES) {
        console.warn(`JARAListings: image ${i} exceeds 5MB, skipping.`);
        continue;
      }

      const ext      = file.name.split('.').pop().toLowerCase();
      const path     = `${listingId}/${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          upsert:      false,
          contentType: file.type,
        });

      if (uploadError) {
        console.error(`JARAListings: image upload error (${i}):`, uploadError.message);
        continue;
      }

      const { data: { publicUrl } } = sb.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(path);

      urls.push(publicUrl);
    }

    return urls;
  }

  /**
   * Delete images from Supabase Storage by their public URLs.
   */
  async function deleteImages(imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return;

    const sb    = _client();
    const paths = imageUrls
      .map(url => {
        try {
          // Extract the storage path from the full public URL
          const match = url.match(/listing-images\/(.+?)(\?|$)/);
          return match ? match[1] : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (paths.length === 0) return;

    const { error } = await sb.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (error) {
      console.error('JARAListings: deleteImages error:', error.message);
    }
  }


  /* ==========================================================
     3. fetch(options)
     ──────────────────────────────────────────────────────────
     Query listings from Supabase with filtering + pagination.

     options = {
       type:      'product' | 'service' | 'request' | null,
       category:  string | null,
       ownerId:   string | null,
       limit:     number,
       offset:    number,
       orderBy:   'created_at' | 'price' | 'view_count',
       ascending: boolean,
       status:    'active' | 'sold' | 'hidden' | null,
     }

     Returns { data: listing[], count, error }
  ========================================================== */

  async function fetch(options = {}) {
    const sb = _client();
    if (!sb) return { data: [], count: 0, error: new Error('Supabase not ready') };

    try {
      const {
        type      = null,
        category  = null,
        ownerId   = null,
        limit     = DEFAULT_LIMIT,
        offset    = 0,
        orderBy   = 'created_at',
        ascending = false,
        status    = 'active',
      } = options;

      let query = sb
        .from('listings')
        .select(LISTING_SELECT, { count: 'exact' });

      // ── Filters ───────────────────────────────────────────
      if (status)   query = query.eq('status', status);
      if (type)     query = query.eq('listing_type', type);
      if (category) query = query.eq('category', category);
      if (ownerId)  query = query.eq('owner_id', ownerId);

      /*
       FUTURE (Search Integration — Phase 4):
         if (options.search) {
           query = query.textSearch('search_vector', options.search);
         }
      */

      // ── Order + Pagination ────────────────────────────────
      query = query
        .order(orderBy, { ascending })
        .range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        console.error('JARAListings.fetch error:', error.message);
        return { data: [], count: 0, error };
      }

      return { data: data || [], count: count || 0, error: null };

    } catch (err) {
      console.error('JARAListings.fetch unexpected error:', err.message);
      return { data: [], count: 0, error: err };
    }
  }


  /* ==========================================================
     4. fetchOne(id)
     ──────────────────────────────────────────────────────────
     Fetch a single listing by its ID.
     Also increments view_count.
     Returns { data: listing, error }
  ========================================================== */

  async function fetchOne(id) {
    const sb = _client();
    if (!sb) return { data: null, error: new Error('Supabase not ready') };

    try {
      const { data, error } = await sb
        .from('listings')
        .select(LISTING_SELECT)
        .eq('id', id)
        .single();

      if (error) {
        console.error('JARAListings.fetchOne error:', error.message);
        return { data: null, error };
      }

      /*
       FUTURE: Increment view_count via an RPC function:
         await sb.rpc('increment_listing_views', { listing_id: id });
      */

      return { data, error: null };

    } catch (err) {
      console.error('JARAListings.fetchOne unexpected error:', err.message);
      return { data: null, error: err };
    }
  }


  /* ==========================================================
     5. fetchByOwner(ownerId)
     ──────────────────────────────────────────────────────────
     Fetch all listings for a given seller profile.
     Used by store pages and seller profile pages.
     Returns { data: listing[], error }
  ========================================================== */

  async function fetchByOwner(ownerId, options = {}) {
    return fetch({
      ownerId,
      status:    options.status    || null,   // null = all statuses
      type:      options.type      || null,
      limit:     options.limit     || 50,
      offset:    options.offset    || 0,
      orderBy:   options.orderBy   || 'created_at',
      ascending: options.ascending || false,
    });
  }


  /* ==========================================================
     6. create(fields, imageFiles)
     ──────────────────────────────────────────────────────────
     Create a new listing in Supabase.
     Uploads images first, then inserts the listing row.

     fields = {
       title, description, category, listing_type,
       price, negotiable, condition, location
     }
     imageFiles = File[] (from file input)

     Returns { data: listing, error }
  ========================================================== */

  async function create(fields, imageFiles = []) {
    const sb = _client();
    if (!sb) return { data: null, error: new Error('Supabase not ready') };

    try {
      // ── Auth check ────────────────────────────────────────
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return { data: null, error: new Error('Not authenticated') };

      const ownerId = session.user.id;

      // ── Generate a temp ID for storage path ───────────────
      const tempId = crypto.randomUUID
        ? crypto.randomUUID()
        : `${ownerId}_${Date.now()}`;

      // ── Upload images ─────────────────────────────────────
      const imageUrls = await uploadImages(tempId, imageFiles.slice(0, MAX_IMAGES));

      // ── Build payload ─────────────────────────────────────
      const payload = {
        owner_id:     ownerId,
        title:        (fields.title        || '').trim(),
        description:  (fields.description  || '').trim() || null,
        category:     fields.category      || null,
        listing_type: fields.listing_type  || 'product',
        price:        fields.price         ? Number(fields.price) : null,
        negotiable:   fields.negotiable    === true || fields.negotiable === 'true',
        condition:    fields.condition     || null,
        location:     (fields.location     || '').trim() || null,
        images:       imageUrls,
        status:       'active',
        created_at:   new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      };

      // ── Insert ────────────────────────────────────────────
      const { data, error } = await sb
        .from('listings')
        .insert(payload)
        .select(LISTING_SELECT)
        .single();

      if (error) {
        console.error('JARAListings.create error:', error.message);
        // Clean up uploaded images if insert failed
        if (imageUrls.length > 0) await deleteImages(imageUrls);
        return { data: null, error };
      }

      return { data, error: null };

    } catch (err) {
      console.error('JARAListings.create unexpected error:', err.message);
      return { data: null, error: err };
    }
  }


  /* ==========================================================
     7. update(id, fields, newImageFiles, removedImageUrls)
     ──────────────────────────────────────────────────────────
     Update an existing listing.
     Only the listing owner can update (enforced by RLS).

     id               — listing UUID
     fields           — fields to change
     newImageFiles    — new File[] to add
     removedImageUrls — existing URLs to delete

     Returns { data: listing, error }
  ========================================================== */

  async function update(id, fields, newImageFiles = [], removedImageUrls = []) {
    const sb = _client();
    if (!sb) return { data: null, error: new Error('Supabase not ready') };

    try {
      // ── Delete removed images from storage ────────────────
      if (removedImageUrls.length > 0) {
        await deleteImages(removedImageUrls);
      }

      // ── Upload new images ─────────────────────────────────
      const newUrls = await uploadImages(id, newImageFiles.slice(0, MAX_IMAGES));

      // ── Merge image arrays ────────────────────────────────
      // Start from existing, remove deleted, add new
      let existingImages = fields._existingImages || [];
      existingImages = existingImages.filter(url => !removedImageUrls.includes(url));
      const finalImages = [...existingImages, ...newUrls].slice(0, MAX_IMAGES);

      // ── Build payload (exclude internal key) ──────────────
      const { _existingImages, ...cleanFields } = fields;

      const payload = {
        ...cleanFields,
        images:     finalImages,
        updated_at: new Date().toISOString(),
      };

      // Sanitise numeric fields
      if (payload.price !== undefined) payload.price = payload.price ? Number(payload.price) : null;

      // ── Update ────────────────────────────────────────────
      /*
       RLS policy on listings table ensures only the owner
       can update. Non-owners get a 0-row response.
      */
      const { data, error } = await sb
        .from('listings')
        .update(payload)
        .eq('id', id)
        .select(LISTING_SELECT)
        .single();

      if (error) {
        console.error('JARAListings.update error:', error.message);
        return { data: null, error };
      }

      return { data, error: null };

    } catch (err) {
      console.error('JARAListings.update unexpected error:', err.message);
      return { data: null, error: err };
    }
  }


  /* ==========================================================
     8. remove(id)
     ──────────────────────────────────────────────────────────
     Delete a listing and all its storage images.
     Only the listing owner can delete (enforced by RLS).

     Returns { error }
  ========================================================== */

  async function remove(id) {
    const sb = _client();
    if (!sb) return { error: new Error('Supabase not ready') };

    try {
      // ── Fetch listing first to get image URLs ─────────────
      const { data: listing } = await sb
        .from('listings')
        .select('id, images, owner_id')
        .eq('id', id)
        .single();

      // ── Delete images from storage ────────────────────────
      if (listing?.images?.length > 0) {
        await deleteImages(listing.images);
      }

      // ── Delete the database row ───────────────────────────
      const { error } = await sb
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('JARAListings.remove error:', error.message);
        return { error };
      }

      return { error: null };

    } catch (err) {
      console.error('JARAListings.remove unexpected error:', err.message);
      return { error: err };
    }
  }


  /* ==========================================================
     9. getCategories()
     ──────────────────────────────────────────────────────────
     Returns an array of distinct category strings from
     the listings table.

     FUTURE: Replace with a dedicated categories table
     so admins can manage them from the dashboard.
  ========================================================== */

  async function getCategories() {
    const sb = _client();
    if (!sb) return [];

    try {
      /*
       FUTURE: SELECT DISTINCT category FROM listings
               WHERE status = 'active' ORDER BY category ASC
      */
      const { data, error } = await sb
        .from('listings')
        .select('category')
        .eq('status', 'active')
        .not('category', 'is', null);

      if (error) {
        console.error('JARAListings.getCategories error:', error.message);
        return [];
      }

      const unique = [...new Set((data || []).map(r => r.category).filter(Boolean))].sort();
      return unique;

    } catch (err) {
      console.error('JARAListings.getCategories unexpected error:', err.message);
      return [];
    }
  }


  /* ==========================================================
     10. UTILITY HELPERS
  ========================================================== */

  function _client() {
    if (!window._supabase) {
      console.error('JARAListings: window._supabase is not defined.');
      return null;
    }
    return window._supabase;
  }

  /** Returns the cover image URL or null */
  function getCoverImage(listing) {
    if (listing?.images?.length > 0) return listing.images[0];
    return null;
  }

  /** Returns the seller's display name from the joined profile */
  function getSellerName(listing) {
    const p = listing?.profiles;
    if (!p) return 'JARA Seller';
    if (p.account_type === 'business' && p.business_name) return p.business_name;
    return p.full_name || 'JARA Seller';
  }

  /** Returns formatted price string */
  function formatPrice(listing) {
    if (!listing?.price && listing?.price !== 0) return 'Free';
    return '₦' + Number(listing.price).toLocaleString('en-NG');
  }

  /** Returns how long ago a listing was posted */
  function timeAgo(isoString) {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(mins / 60);
      const days  = Math.floor(hours / 24);
      if (mins  < 1)   return 'just now';
      if (mins  < 60)  return `${mins}m ago`;
      if (hours < 24)  return `${hours}h ago`;
      if (days  < 7)   return `${days}d ago`;
      return new Date(isoString).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  }

  /** True if the current user owns this listing */
  async function isOwner(listing) {
    const sb = _client();
    if (!sb) return false;
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return false;
    return listing?.owner_id === session.user.id;
  }


  /* ==========================================================
     11. EXPORT
  ========================================================== */

  window.JARAListings = {
    fetch,
    fetchOne,
    fetchByOwner,
    create,
    update,
    remove,
    getCategories,

    // Helpers
    getCoverImage,
    getSellerName,
    formatPrice,
    timeAgo,
    isOwner,
  };

})();

/**
 * Cache-Control written on every file we upload to Firebase Storage.
 *
 * Storage defaults to `private, max-age=0`, so a browser re-downloads the
 * whole asset on every visit — a hero video is fetched again from scratch
 * each time someone opens the site. Uploaded files are immutable (the name
 * carries an upload timestamp, and replacing one writes a new object), so
 * they can safely be cached for a long time.
 */
export const STORAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

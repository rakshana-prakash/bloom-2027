import { supabase } from './supabase';

async function resize(file, max = 1600) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
}

// Shrinks the photo, uploads it to the user's private folder, returns { path } or { error }.
export async function uploadPhoto(userId, file) {
  try {
    const blob = await resize(file);
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
    const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
    return error ? { error: error.message } : { path };
  } catch {
    return { error: 'That image could not be read. Try a JPG or PNG photo.' };
  }
}

export async function signedUrls(paths) {
  const list = [...new Set(paths.filter(Boolean))];
  if (!list.length) return {};
  const { data } = await supabase.storage.from('photos').createSignedUrls(list, 3600);
  const m = {};
  (data || []).forEach((d) => { if (d.signedUrl) m[d.path] = d.signedUrl; });
  return m;
}

export const removePhotos = (paths) => paths.length ? supabase.storage.from('photos').remove(paths) : null;

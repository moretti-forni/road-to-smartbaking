'use client';
import { useId, useState, type ChangeEvent } from 'react';
import type { StaffApi } from '../../services/studio';
import { apiError } from '../../services/studio';
export function ImageUpload({
  api,
  onUploaded,
}: {
  api: StaffApi;
  onUploaded: (image: { url: string; width: number; height: number }) => void;
}) {
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file || busy) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage('Choose an image up to 10 MB.');
      input.value = '';
      return;
    }
    setBusy(true);
    setMessage('Uploading and optimizing image…');
    try {
      const signed = await api.write<{ url: string; fields: Record<string, string>; key: string }>(
        'post',
        'media/uploads',
        { size: file.size, contentType: file.type },
      );
      const data = new FormData();
      Object.entries(signed.fields).forEach(([name, value]) => data.append(name, value));
      data.append('file', file);
      const response = await fetch(signed.url, { method: 'POST', body: data, credentials: 'omit' });
      if (!response.ok) throw new Error('The image could not be uploaded. Please try again.');
      const image = await api.write<{ url: string; width: number; height: number }>(
        'post',
        'media/complete',
        { key: signed.key },
      );
      onUploaded(image);
      setMessage('Image uploaded. Add alt text, then save your draft to keep it.');
    } catch (error) {
      setMessage(apiError(error));
    } finally {
      setBusy(false);
      input.value = '';
    }
  }
  return (
    <div className="studio-image-upload">
      <label htmlFor={id}>Upload image</label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={busy}
        onChange={upload}
      />
      <small>JPEG, PNG, WebP or AVIF · up to 10 MB</small>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

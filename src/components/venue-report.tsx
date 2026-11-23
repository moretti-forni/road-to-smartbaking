'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import { Flag, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { publicHttp, usesPublicApi } from '../services/http';
export function VenueReport({ id, name }: { id: string; name: string }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useTranslation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (!usesPublicApi) {
      setError(true);
      return;
    }
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setError(false);
    try {
      await publicHttp.post('/reports', { shop: id, ...fields });
      setSent(true);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <button
        className="venue-report-button"
        type="button"
        onClick={() => {
          setSent(false);
          setError(false);
          dialog.current?.showModal();
        }}
      >
        <Flag size={15} aria-hidden="true" />
        {t('reportVenue')}
      </button>
      <dialog
        className="listing-modal report-dialog"
        aria-labelledby={titleId}
        ref={dialog}
        onCancel={(event) => {
          if (sending) event.preventDefault();
        }}
      >
        <button
          className="listing-modal-close"
          type="button"
          aria-label={t('close')}
          disabled={sending}
          onClick={() => dialog.current?.close()}
        >
          <X size={20} />
        </button>
        <h2 id={titleId}>{t('reportVenue')}</h2>
        <p>{name}</p>
        {sent ? (
          <p role="status">{t('reportThanks')}</p>
        ) : (
          <form className="listing-form" onSubmit={submit}>
            <label>
              <span>{t('reportReason')}</span>
              <select name="reason" required defaultValue="incorrect">
                {['incorrect', 'closed', 'inappropriate', 'other'].map((reason) => (
                  <option key={reason} value={reason}>
                    {t(`report_${reason}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('reportDetails')}</span>
              <textarea name="details" required minLength={1} maxLength={2000} rows={4} />
            </label>
            <p className="small-note">{t('reportPrivacy')}</p>
            {error && (
              <p role="alert">{t(usesPublicApi ? 'listingSendError' : 'reportUnavailable')}</p>
            )}
            <button className="button primary" disabled={sending}>
              {t(sending ? 'loadingContent' : 'listingSubmit')}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}

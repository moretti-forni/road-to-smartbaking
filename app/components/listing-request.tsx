import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Plus, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ListingRequestButtonProps = {
  variant?: 'nav' | 'footer';
};

export function ListingRequestButton({ variant = 'nav' }: ListingRequestButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    setSubmitted(false);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSubmitted(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <button
        type="button"
        className={variant === 'footer' ? 'listing-request-footer' : 'listing-request-nav'}
        onClick={() => setOpen(true)}
      >
        <Plus size={variant === 'footer' ? 17 : 14} aria-hidden="true" />
        {t('listingRequestCta')}
      </button>

      {open && (
        <div
          className="listing-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            className="listing-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="listing-request-title"
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="listing-modal-close"
              aria-label={t('close')}
              onClick={close}
            >
              <X size={20} />
            </button>

            {submitted ? (
              <div className="listing-success" role="status">
                <span className="listing-success-icon">
                  <Check size={24} aria-hidden="true" />
                </span>
                <span className="eyebrow brand-tag">#RoadToSmartBaking</span>
                <h2>{t('listingRequestThanksTitle')}</h2>
                <p>{t('listingRequestThanksBody')}</p>
                <button type="button" className="button primary" onClick={close}>
                  {t('close')}
                </button>
              </div>
            ) : (
              <>
                <div className="listing-modal-intro">
                  <span className="eyebrow brand-tag">#RoadToSmartBaking</span>
                  <h2 id="listing-request-title">{t('listingRequestTitle')}</h2>
                  <p>{t('listingRequestIntro')}</p>
                </div>

                <form className="listing-form" onSubmit={submit}>
                  <div className="listing-form-grid">
                    <label>
                      <span>{t('listingBusinessName')}</span>
                      <input name="businessName" autoComplete="organization" required />
                    </label>
                    <label>
                      <span>{t('listingCategory')}</span>
                      <select name="category" defaultValue="" required>
                        <option value="" disabled>
                          {t('listingChoose')}
                        </option>
                        <option value="pizza">{t('pizza')}</option>
                        <option value="bakery">{t('bakery')}</option>
                        <option value="hotel">{t('hotel')}</option>
                        <option value="other">{t('listingOther')}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t('listingCity')}</span>
                      <input name="city" autoComplete="address-level2" required />
                    </label>
                    <label>
                      <span>{t('listingCountry')}</span>
                      <input name="country" autoComplete="country-name" required />
                    </label>
                  </div>

                  <label>
                    <span>{t('listingAddress')}</span>
                    <input name="address" autoComplete="street-address" required />
                  </label>

                  <div className="listing-form-grid">
                    <label>
                      <span>{t('listingOven')}</span>
                      <select name="oven" defaultValue="" required>
                        <option value="" disabled>
                          {t('listingChoose')}
                        </option>
                        <option value="neapolis">Neapolis</option>
                        <option value="serieS">serieS</option>
                        <option value="serieP">serieP</option>
                        <option value="serieT">serieT</option>
                        <option value="serieX">serieX</option>
                        <option value="ideck">iDeck</option>
                        <option value="link">Link</option>
                        <option value="other">{t('listingOther')}</option>
                        <option value="unknown">{t('listingUnknown')}</option>
                      </select>
                    </label>
                    <label>
                      <span>{t('listingWebsite')}</span>
                      <input name="website" type="url" inputMode="url" placeholder="https://" />
                    </label>
                    <label>
                      <span>{t('listingContactName')}</span>
                      <input name="contactName" autoComplete="name" required />
                    </label>
                    <label>
                      <span>{t('listingContactEmail')}</span>
                      <input name="email" type="email" autoComplete="email" required />
                    </label>
                  </div>

                  <label>
                    <span>{t('listingNotes')}</span>
                    <textarea name="notes" rows={3} />
                  </label>

                  <div className="listing-form-footer">
                    <p>{t('listingPreviewNote')}</p>
                    <button type="submit" className="button primary">
                      <Send size={16} aria-hidden="true" />
                      {t('listingSubmit')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}

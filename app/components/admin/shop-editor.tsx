import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { StudioPin } from './studio-map';
import {
  draftPath,
  type Draft,
  type Shop,
  type StaffApi,
  type Save,
  type ListingRequest,
} from '../../services/studio';
import { SavedPreview } from './saved-preview';
import styles from '../../routes/admin.module.css';
import {
  CategoryField,
  Field,
  Preview,
  LanguageToggle,
  languages,
  languageNames,
  Visibility,
  slugify,
  values,
} from './fields';

const StudioMap = lazy(() => import('./studio-map'));

export type Review = {
  status: Exclude<ListingRequest['status'], 'approved'>;
  note?: string;
  details: Pick<
    ListingRequest,
    'businessName' | 'category' | 'address' | 'city' | 'country' | 'oven' | 'contactName' | 'email'
  > & { website?: string; notes?: string };
};

export function ShopEditor({
  shop,
  request,
  api,
  save,
  busy,
  onSaved,
  onBack,
}: {
  shop?: Shop;
  request?: { id: string; review: Review };
  api: StaffApi;
  save: Save;
  busy: boolean;
  onSaved: (shop: Shop) => void;
  onBack?: () => void;
}) {
  const [revision, setRevision] = useState(shop?.draftRevision ?? null);
  const [preview, setPreview] = useState<Draft<Shop>>();
  const path = shop ? draftPath('shop', shop.slug, 'shared') : undefined;
  const [published, setPublished] = useState(shop?.visible ?? false);

  const defaults = shop ?? request?.review.details;
  const [name, setName] = useState(shop?.name ?? request?.review.details.businessName ?? '');
  const [image, setImage] = useState(shop?.imageUrl ?? '');
  const [language, setLanguage] = useState<'it' | 'en'>('it');
  const [localized, setLocalized] = useState({
    it: { description: shop?.descriptionIt ?? '', alt: shop?.imageAltIt ?? '' },
    en: { description: shop?.descriptionEn ?? '', alt: shop?.imageAltEn ?? '' },
  });

  const [latitude, setLatitude] = useState(shop ? String(shop.latitude) : '');
  const [longitude, setLongitude] = useState(shop ? String(shop.longitude) : '');
  const pins = useMemo((): StudioPin[] => {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (
      !latitude.trim() ||
      !longitude.trim() ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      return [];
    return [
      {
        id: 'preview',
        name: 'Shop pin',
        location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        position: [lat, lng],
        visible: true,
      },
    ];
  }, [latitude, longitude]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { text, optional } = values(event.currentTarget);
    const payload = {
      slug: shop?.slug ?? (text('slug') || slugify(name)),
      name,
      category: text('category'),
      address: text('address'),
      city: text('city'),
      country: text('country'),
      latitude: Number(text('latitude')),
      longitude: Number(text('longitude')),
      descriptionIt: localized.it.description.trim() || undefined,
      descriptionEn: localized.en.description.trim() || undefined,
      oven: optional('oven'),
      website: optional('website'),
      imageUrl: optional('imageUrl'),
      imageAltIt: localized.it.alt.trim() || undefined,
      imageAltEn: localized.en.alt.trim() || undefined,
    };
    void save(
      async () => {
        if (request) {
          const saved = await api.write<Shop>('post', `requests/${request.id}/approve`, {
            ...payload,
            visible: false,
            request: request.review,
          });
          onSaved(saved);
          return;
        }
        const draft = await api.write<Draft<Shop>>(
          'put',
          draftPath('shop', payload.slug, 'shared'),
          {
            payload,
            revision,
            newRecord: !shop,
          },
        );
        setRevision(draft.revision);
        if (!shop)
          onSaved({
            ...draft.payload,
            id: draft.slug,
            visible: false,
            draftRevision: draft.revision,
          });
      },
      request
        ? 'Request approved. Open the hidden shop to save and publish it.'
        : 'Shop draft saved.',
    );
  }

  return (
    <>
      {preview && (
        <SavedPreview
          snapshot={{ kind: 'shop', draft: preview }}
          onClose={() => setPreview(undefined)}
        />
      )}
      <section className={styles.panel}>
        <div className={styles.heading}>
          <h2>{request ? 'Create shop from request' : shop ? 'Edit shop' : 'New shop'}</h2>
          {shop && <Visibility visible={published} />}
          {revision && (
            <span className={styles.badge}>
              {published ? 'Unpublished changes' : 'Saved draft'}
            </span>
          )}
        </div>
        {request && (
          <p>
            Confirm the public details and map coordinates. Contact information stays in the
            request.
          </p>
        )}
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <div className={styles.fields}>
              <Field name="name" label="Shop name">
                <input
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>
              {shop ? (
                <label>
                  Slug
                  <input value={shop.slug} readOnly />
                </label>
              ) : (
                <label>
                  Slug
                  <input name="slug" placeholder={slugify(name)} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                </label>
              )}
              <CategoryField value={defaults?.category} />
              <Field name="oven" label="Moretti oven" value={defaults?.oven} />
              <Field name="address" label="Street address" value={defaults?.address} required />
              <Field name="city" label="City" value={defaults?.city} required />
              <Field name="country" label="Country" value={defaults?.country} required />
              <Field name="website" label="Website" type="url" value={defaults?.website} />
              <Field name="latitude" label="Latitude">
                <input
                  name="latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  required
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                />
              </Field>
              <Field name="longitude" label="Longitude">
                <input
                  name="longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  required
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                />
              </Field>
            </div>
            <Field name="imageUrl" label="Image URL or bundled path">
              <input
                name="imageUrl"
                value={image}
                onChange={(event) => setImage(event.target.value)}
              />
            </Field>
            <h3>Localized content</h3>
            <LanguageToggle language={language} onChange={setLanguage} />
            {languages.map((locale) => (
              <div key={locale} hidden={locale !== language} lang={locale}>
                <Field
                  name={`description-${locale}`}
                  label={`${languageNames[locale]} description`}
                >
                  <textarea
                    value={localized[locale].description}
                    onChange={(event) =>
                      setLocalized({
                        ...localized,
                        [locale]: { ...localized[locale], description: event.target.value },
                      })
                    }
                  />
                </Field>
                <Field name={`alt-${locale}`} label={`${languageNames[locale]} image alt text`}>
                  <input
                    value={localized[locale].alt}
                    onChange={(event) =>
                      setLocalized({
                        ...localized,
                        [locale]: { ...localized[locale], alt: event.target.value },
                      })
                    }
                  />
                </Field>
              </div>
            ))}

            <div className={styles.actions}>
              {onBack && (
                <button type="button" onClick={onBack}>
                  Back to request
                </button>
              )}
              <button className={styles.primary} type="submit">
                {request ? 'Approve and create shop' : 'Save draft'}
              </button>
              {path && revision && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      void save(async () => {
                        const draft = await api.draft<Shop>(path);
                        if (draft.revision !== revision)
                          throw new Error('The draft changed. Reopen the shop to preview it.');
                        setPreview(draft);
                      }, 'Saved preview loaded.')
                    }
                  >
                    Preview saved
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void save(async () => {
                        await api.write<Shop>('post', path, { revision });
                        setRevision(null);
                        setPublished(true);
                      }, 'Shop published.')
                    }
                  >
                    Publish saved draft
                  </button>
                </>
              )}
              {shop && published && (
                <button
                  type="button"
                  onClick={() =>
                    void save(async () => {
                      await api.write<Shop>(
                        'post',
                        `shops/${encodeURIComponent(shop.slug)}/suspend`,
                        undefined,
                      );
                      setPublished(false);
                    }, 'Shop unpublished.')
                  }
                >
                  Unpublish
                </button>
              )}
            </div>
          </fieldset>
        </form>
      </section>
      <div className={styles.previewStack}>
        <section className={styles.panel}>
          <div className={styles.heading}>
            <h2>
              <MapPin size={17} /> Location preview
            </h2>
          </div>
          <p className={styles.secondary}>Check the pin before saving the shop.</p>
          {pins.length ? (
            <>
              <Suspense
                fallback={<div className={styles.mapPlaceholder}>Loading location map…</div>}
              >
                <StudioMap pins={pins} detail />
              </Suspense>
              <div className={styles.pinDetails}>
                <span>{pins[0].location}</span>
                <a
                  className={styles.textButton}
                  href={`https://www.google.com/maps/search/?api=1&query=${pins[0].position.join(',')}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Maps <ArrowUpRight size={14} />
                </a>
              </div>
            </>
          ) : (
            <div className={styles.mapPlaceholder}>
              <MapPin size={22} />
              Enter a valid latitude and longitude to preview the pin.
            </div>
          )}
        </section>
        <Preview image={image} alt={localized[language].alt} title={name || 'Shop name'}>
          <p lang={language}>{localized[language].description}</p>
        </Preview>
      </div>
    </>
  );
}

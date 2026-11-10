import { imageUrl } from '../../data/story-index';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { Block, Draft, Language, Shop, Story } from '../../services/studio';
import type { StudioPin } from './studio-map';
import { LanguageToggle } from './fields';
import styles from '../../routes/admin.module.css';

const StudioMap = lazy(() => import('./studio-map'));
type Snapshot =
  | { kind: 'shop'; draft: Draft<Shop> }
  | {
      kind: 'story';
      draft: Draft<Story & { blocks: Block[] }>;
      language: Language;
    };

export function SavedPreview({ snapshot, onClose }: { snapshot: Snapshot; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [language, setLanguage] = useState<Language>('it');
  const [shopPins] = useState<StudioPin[]>(() => {
    if (snapshot.kind !== 'shop') return [];
    const shop = snapshot.draft.payload;
    return [
      {
        id: snapshot.draft.slug,
        name: shop.name,
        location: shop.address,
        position: [shop.latitude, shop.longitude],
        visible: true,
      },
    ];
  });
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const shop = snapshot.kind === 'shop' ? snapshot.draft.payload : undefined;
  const story = snapshot.kind === 'story' ? snapshot.draft.payload : undefined;
  const image = shop?.imageUrl ?? story?.coverImageUrl;
  const alt = shop ? (language === 'it' ? shop.imageAltIt : shop.imageAltEn) : story?.coverImageAlt;
  const description =
    shop && (language === 'it' ? shop.descriptionIt : shop.descriptionEn || shop.descriptionIt);
  return (
    <dialog
      className={styles.savedPreview}
      ref={dialog}
      onClose={onClose}
      aria-labelledby="saved-preview-title"
    >
      <header className={styles.heading}>
        <h2 id="saved-preview-title">Saved draft preview</h2>
        <form method="dialog">
          <button type="submit">Close preview</button>
        </form>
      </header>
      <p className={styles.secondary}>
        Private · Saved {new Date(snapshot.draft.savedAt).toLocaleString()}
      </p>
      {shop && <LanguageToggle language={language} onChange={setLanguage} />}
      <article lang={snapshot.kind === 'shop' ? language : snapshot.language}>
        <h3>{shop?.name ?? story?.title}</h3>
        {image && <img src={imageUrl(image)} alt={alt ?? ''} />}
        {shop && (
          <>
            <p>
              {shop.address} · {shop.city} · {shop.country}
            </p>
            <p>{description}</p>
            {shop.oven && <p>{shop.oven}</p>}
            {shop.website && (
              <p>
                <a href={shop.website} target="_blank" rel="noreferrer">
                  Website ↗
                </a>
              </p>
            )}
            <Suspense fallback={<p>Loading shop pin…</p>}>
              <StudioMap pins={shopPins} detail />
            </Suspense>
          </>
        )}
        {story && (
          <>
            <p>{story.summary}</p>
            {story.blocks.map((block, index) =>
              block.type === 'image' ? (
                <figure key={index}>
                  <img src={imageUrl(block.image)} alt={block.alt} />
                  <figcaption>{block.alt}</figcaption>
                </figure>
              ) : block.type === 'heading' ? (
                <h4 key={index}>{block.text}</h4>
              ) : (
                <p key={index}>{block.text}</p>
              ),
            )}
            {story.sourceUrl && (
              <a href={story.sourceUrl} target="_blank" rel="noreferrer">
                Original article ↗
              </a>
            )}
          </>
        )}
      </article>
    </dialog>
  );
}

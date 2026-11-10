import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import {
  apiError,
  draftPath,
  type Draft,
  type StoryDraft,
  type Block,
  type Language,
  type Save,
  type StaffApi,
  type Story,
} from '../../services/studio';
import { SavedPreview } from './saved-preview';
import styles from '../../routes/admin.module.css';
import {
  Field,
  LanguageToggle,
  Preview,
  Visibility,
  languages,
  languageNames,
  slugify,
} from './fields';

export type StoryGroup = { slug: string; versions: Story[] };
type StoryDetail = Story & { blocks: Block[] };

type EditorProps = {
  api: StaffApi;
  save: Save;
  busy: boolean;
  onSaved: (story: StoryGroup) => void;
};

export function LoadStoryEditor({ group, ...props }: EditorProps & { group: StoryGroup }) {
  const result = useQuery({
    queryKey: ['studio', 'story', group.slug],
    queryFn: ({ signal }) => props.api.storyEditor(group.slug, signal),
    retry: false,
  });
  if (result.isError && !result.data)
    return (
      <p role="alert" className={styles.panel}>
        {apiError(result.error)} <button onClick={() => result.refetch()}>Retry</button>
      </p>
    );
  if (!result.data)
    return (
      <p role="status" className={styles.panel}>
        Loading story…
      </p>
    );
  return <StoryEditor {...props} slug={group.slug} versions={result.data.versions} />;
}

export function StoryEditor({
  slug,
  versions = [],
  api,
  save,
  busy,
  onSaved,
}: EditorProps & {
  slug?: string;
  versions?: StoryDetail[];
}) {
  const [language, setLanguage] = useState<Language>(
    versions.some((story) => story.language === 'it') ? 'it' : (versions[0]?.language ?? 'it'),
  );
  const [enabled, setEnabled] = useState({
    it: !slug || versions.some((story) => story.language === 'it'),
    en: versions.some((story) => story.language === 'en'),
  });

  const [revisions, setRevisions] = useState(
    () =>
      Object.fromEntries(
        versions.map((version) => [version.language, version.draftRevision]),
      ) as Partial<Record<Language, string>>,
  );
  const [visibility, setVisibility] = useState(
    () =>
      Object.fromEntries(versions.map((version) => [version.language, version.visible])) as Partial<
        Record<Language, boolean>
      >,
  );
  const [preview, setPreview] = useState<{ draft: Draft<StoryDetail>; language: Language }>();
  const path = slug ? draftPath('story', slug, language) : undefined;
  const revision = revisions[language];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const translations = Object.fromEntries(
      languages
        .filter((locale) => enabled[locale])
        .map((locale) => {
          const field = (name: string) => text(`${locale}.${name}`);
          return [
            locale,
            {
              revision: revisions[locale] ?? null,
              payload: {
                title: field('title'),
                summary: field('summary'),
                category: field('category'),
                coverImageUrl: field('coverImageUrl') || undefined,
                coverImageAlt: field('coverImageAlt') || undefined,
                sourceUrl: field('sourceUrl') || undefined,
                blocks: JSON.parse(field('blocks')),
              },
            },
          ];
        }),
    );
    const key = slug ?? (text('slug') || slugify(text('it.title') || text('en.title')));
    void save(async () => {
      const saved = await api.write<StoryDraft[]>(
        'put',
        `story-drafts/${encodeURIComponent(key)}`,
        {
          ...translations,
          newRecord: !slug,
        },
      );
      setRevisions(Object.fromEntries(saved.map((draft) => [draft.language, draft.revision])));
      if (!slug)
        onSaved({
          slug: key,
          versions: saved.map((draft) => ({
            ...draft.payload,
            slug: key,
            language: draft.language,
            visible: false,
          })),
        });
    }, 'Story draft saved.');
  }

  return (
    <section className={styles.panel}>
      {preview && (
        <SavedPreview
          snapshot={{ kind: 'story', ...preview }}
          onClose={() => setPreview(undefined)}
        />
      )}
      <div className={styles.heading}>
        <h2>{slug ? 'Edit story' : 'New story'}</h2>
        {slug && <Visibility visible={Boolean(visibility[language])} />}
        {revision && (
          <span className={styles.badge}>
            {visibility[language] ? 'Unpublished changes' : 'Saved draft'}
          </span>
        )}
      </div>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={busy}>
          <label>
            Shared slug
            <input
              name="slug"
              defaultValue={slug}
              readOnly={Boolean(slug)}
              placeholder="Generated from the title if left blank"
            />
          </label>
          <LanguageToggle language={language} onChange={setLanguage} />
          {languages.map((locale) => {
            const story = versions.find((version) => version.language === locale);
            return (
              <div key={locale} hidden={locale !== language} lang={locale}>
                {enabled[locale] ? (
                  <>
                    <StoryVersionEditor language={locale} story={story} />
                    {!story && (
                      <button
                        type="button"
                        className={styles.back}
                        onClick={() => setEnabled({ ...enabled, [locale]: false })}
                      >
                        Discard unsaved {languageNames[locale]} version
                      </button>
                    )}
                  </>
                ) : (
                  <div className={styles.notice}>
                    <p>No {languageNames[locale]} version yet.</p>
                    <button
                      className={styles.primary}
                      type="button"
                      onClick={() => setEnabled({ ...enabled, [locale]: true })}
                    >
                      Add {languageNames[locale]} version
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          <div className={styles.actions}>
            <button className={styles.primary} type="submit">
              Save draft
            </button>
            {path && revision && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void save(async () => {
                      const draft = await api.draft<StoryDetail>(path);
                      if (draft.revision !== revision)
                        throw new Error('The draft changed. Reopen the story to preview it.');
                      setPreview({ draft, language });
                    }, 'Saved preview loaded.')
                  }
                >
                  Preview saved · {language.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void save(async () => {
                      await api.write('post', path, { revision });
                      setRevisions((current) => ({ ...current, [language]: undefined }));
                      setVisibility((current) => ({ ...current, [language]: true }));
                    }, 'Story version published.')
                  }
                >
                  Publish saved draft · {language.toUpperCase()}
                </button>
              </>
            )}
            {slug && visibility[language] && (
              <button
                type="button"
                onClick={() =>
                  void save(async () => {
                    await api.write(
                      'post',
                      `stories/${language}/${encodeURIComponent(slug)}/withdraw`,
                      undefined,
                    );
                    setVisibility((current) => ({ ...current, [language]: false }));
                  }, 'Story version unpublished.')
                }
              >
                Unpublish · {language.toUpperCase()}
              </button>
            )}
          </div>
        </fieldset>
      </form>
    </section>
  );
}

function emptyBlock(type: Block['type']): Block {
  return type === 'image' ? { type, image: '', alt: '', aspectRatio: 1.8 } : { type, text: '' };
}

function StoryVersionEditor({ story, language }: { story?: StoryDetail; language: Language }) {
  const field = (name: string) => `${language}.${name}`;
  const category = story?.category ?? '#RoadToSmartBaking';
  const storyCategories = ['pizza', 'bakery', 'people'];
  const [title, setTitle] = useState(story?.title ?? '');
  const [summary, setSummary] = useState(story?.summary ?? '');
  const [cover, setCover] = useState(story?.coverImageUrl ?? '');
  const [blocks, setBlocks] = useState(() =>
    (story?.blocks ?? [emptyBlock('paragraph')]).map((block, key) => ({ key, block })),
  );
  const [nextKey, setNextKey] = useState(blocks.length);

  function updateBlock(key: number, block: Block) {
    setBlocks((items) => items.map((item) => (item.key === key ? { key, block } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    setBlocks((items) => {
      const ordered = [...items];
      [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
      return ordered;
    });
  }

  return (
    <>
      <div className={styles.heading}>
        <h3>{languageNames[language]} content</h3>
      </div>
      <Field name={field('title')} label="Title">
        <input
          name={field('title')}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </Field>
      <Field name={field('category')} label="Category">
        <select name={field('category')} defaultValue={category}>
          {!storyCategories.includes(category) && (
            <option value={category}>Automatic ({category})</option>
          )}
          <option value="pizza">Pizza</option>
          <option value="bakery">Bakery</option>
          <option value="people">People</option>
        </select>
      </Field>
      <Field name={field('summary')} label="Summary">
        <textarea
          name={field('summary')}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          required
        />
      </Field>
      <Field name={field('coverImageUrl')} label="Cover image URL or bundled path">
        <input
          name={field('coverImageUrl')}
          value={cover}
          onChange={(event) => setCover(event.target.value)}
        />
      </Field>
      <Field
        name={field('coverImageAlt')}
        label="Cover image alt text"
        value={story?.coverImageAlt}
      />
      <Field
        name={field('sourceUrl')}
        label="Original article link"
        type="url"
        value={story?.sourceUrl}
      />
      <h3>Article body</h3>
      {blocks.map(({ key, block }, index) => (
        <div className={styles.block} key={key}>
          <div className={styles.heading}>
            <strong>
              {index + 1}. {block.type}
            </strong>
            <div className={styles.actions}>
              <button
                type="button"
                aria-label={`Move block ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                <ArrowUp size={15} />
              </button>
              <button
                type="button"
                aria-label={`Move block ${index + 1} down`}
                disabled={index === blocks.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDown size={15} />
              </button>
              <button
                type="button"
                aria-label={`Remove block ${index + 1}`}
                disabled={blocks.length === 1}
                onClick={() => setBlocks((items) => items.filter((item) => item.key !== key))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          {block.type === 'image' ? (
            <>
              <label>
                Image URL or bundled path
                <input
                  value={block.image}
                  onChange={(event) => updateBlock(key, { ...block, image: event.target.value })}
                  required
                />
              </label>
              <label>
                Image alt text
                <input
                  value={block.alt}
                  onChange={(event) => updateBlock(key, { ...block, alt: event.target.value })}
                />
              </label>
              <label>
                Image source URL
                <input
                  type="url"
                  value={block.sourceUrl ?? ''}
                  onChange={(event) =>
                    updateBlock(key, { ...block, sourceUrl: event.target.value || undefined })
                  }
                />
              </label>
            </>
          ) : (
            <label>
              {block.type === 'heading' ? 'Heading text' : 'Paragraph text'}
              <textarea
                value={block.text}
                onChange={(event) => updateBlock(key, { ...block, text: event.target.value })}
                required
              />
            </label>
          )}
        </div>
      ))}
      <div className={styles.actions}>
        {(['paragraph', 'heading', 'image'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              setBlocks((items) => [...items, { key: nextKey, block: emptyBlock(type) }]);
              setNextKey(nextKey + 1);
            }}
          >
            <Plus size={14} /> {type}
          </button>
        ))}
      </div>
      <input
        type="hidden"
        name={field('blocks')}
        value={JSON.stringify(blocks.map(({ block }) => block))}
      />

      <Preview image={cover} alt={story?.coverImageAlt} title={title || 'Story title'}>
        <p>{summary}</p>
      </Preview>
    </>
  );
}

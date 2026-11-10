import { imageUrl } from '../data/story-index';
import { publicPath } from '../utils/public-path';
import { useEffect, useState, type FormEvent } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQueries,
  useQueryClient,
} from '@tanstack/react-query';
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  Inbox,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Store,
} from 'lucide-react';
import { Link } from 'react-router';
import { usesPublicApi } from '../services/http';
import {
  apiError,
  staffApi,
  type ListingRequest,
  type Save,
  type Shop,
  type Story,
  type StaffApi,
  type ShopDraft,
  type StoryDraft,
} from '../services/studio';
import { statuses, Visibility } from '../components/admin/fields';
import { ShopEditor } from '../components/admin/shop-editor';
import { LoadStoryEditor, StoryEditor, type StoryGroup } from '../components/admin/story-editor';
import { Dashboard } from '../components/admin/dashboard';
import { RequestEditor } from '../components/admin/request-editor';
import styles from './admin.module.css';

const sections = [
  { key: 'shops', label: 'Shops', icon: Store },
  { key: 'stories', label: 'Stories', icon: BookOpen },
  { key: 'requests', label: 'Listing requests', icon: Inbox },
] as const;
type Library = (typeof sections)[number]['key'];
type Section = 'overview' | Library;
const navigation = [
  { key: 'overview', label: 'Dashboard', icon: LayoutDashboard } as const,
  ...sections,
];
const descriptions = {
  overview: 'Manage the shops and stories that bring the Moretti network to life.',
  shops: 'Manage listings, location pins and the content customers see.',
  stories: 'Edit and publish the Italian and English versions of each story.',
  requests: 'Review incoming listing requests and prepare approved shops.',
};
type Record =
  | { kind: 'shops'; data: Shop }
  | { kind: 'stories'; data: StoryGroup }
  | { kind: 'requests'; data: ListingRequest };

function describe(record: Record) {
  switch (record.kind) {
    case 'shops':
      return {
        key: record.data.slug,
        title: record.data.name,
        detail: `${record.data.city} · ${record.data.country}`,
        image: record.data.imageUrl,
        visible: record.data.visible,
        draft: Boolean(record.data.draftRevision),
      };
    case 'stories':
      return {
        key: record.data.slug,
        title: record.data.versions[0].title,
        image: record.data.versions.find((version) => version.coverImageUrl)?.coverImageUrl,
        detail: record.data.versions
          .map(
            (version) =>
              `${version.language.toUpperCase()} · ${version.visible ? 'Visible' : 'Hidden'}`,
          )
          .join(' / '),
        visible: record.data.versions.some((version) => version.visible),
        draft: record.data.versions.some((version) => version.draftRevision),
      };
    case 'requests':
      return {
        key: record.data.id,
        title: record.data.businessName,
        detail: record.data.city,
        status: statuses[record.data.status],
      };
  }
}

async function loadLibrary(
  api: StaffApi,
  section: Library,
  signal: AbortSignal,
): Promise<Record[]> {
  switch (section) {
    case 'shops': {
      const [live, drafts] = await Promise.all([
        api.list<Shop>('shops', signal),
        api.list<ShopDraft | StoryDraft>('drafts', signal),
      ]);
      const records = new Map(live.map((shop) => [shop.slug, shop]));
      for (const draft of drafts) {
        if (draft.kind !== 'shop') continue;
        const shop = records.get(draft.slug);
        records.set(draft.slug, {
          ...draft.payload,
          slug: draft.slug,
          id: shop?.id ?? draft.slug,
          visible: shop?.visible ?? false,
          draftRevision: draft.revision,
          liveShop: shop,
        });
      }
      return [...records.values()].map((data) => ({ kind: 'shops', data }));
    }
    case 'requests':
      return (await api.list<ListingRequest>('requests', signal)).map((data) => ({
        kind: 'requests',
        data,
      }));
    case 'stories': {
      const groups = new Map<string, StoryGroup>();
      const [italian, english, drafts] = await Promise.all([
        api.list<Story>('stories', signal, 'it'),
        api.list<Story>('stories', signal, 'en'),
        api.list<ShopDraft | StoryDraft>('drafts', signal),
      ]);
      for (const story of [...italian, ...english]) {
        const group = groups.get(story.slug) ?? { slug: story.slug, versions: [] };
        group.versions.push(story);
        groups.set(story.slug, group);
      }
      for (const draft of drafts) {
        if (draft.kind !== 'story') continue;
        const group = groups.get(draft.slug) ?? { slug: draft.slug, versions: [] };
        const live = group.versions.find((version) => version.language === draft.language);
        group.versions = group.versions.filter((version) => version.language !== draft.language);
        group.versions.push({
          ...draft.payload,
          slug: draft.slug,
          language: draft.language,
          visible: live?.visible ?? false,
          draftRevision: draft.revision,
        });
        groups.set(draft.slug, group);
      }
      return [...groups.values()].map((data) => ({ kind: 'stories', data }));
    }
  }
}

export function meta() {
  return [{ title: 'Marketing Studio | RoadToSmartBaking' }];
}

export default function Admin() {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  const [token, setToken] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get('token') ?? '').trim();
    if (!password || signingIn) return;
    setSigningIn(true);
    setError('');
    try {
      await staffApi(password).list<Shop>('shops');
      setToken(password);
    } catch (error) {
      setError(apiError(error));
    } finally {
      setSigningIn(false);
    }
  }

  if (token)
    return (
      <QueryClientProvider client={client}>
        <Studio
          token={token}
          onSignOut={() => {
            client.clear();
            setToken('');
          }}
        />
      </QueryClientProvider>
    );

  return (
    <main className={styles.signIn}>
      <section className={styles.panel}>
        <span className={styles.kicker}>MORETTI FORNI / STAFF ACCESS</span>
        <h1>Marketing Studio</h1>
        {usesPublicApi ? (
          <form onSubmit={signIn}>
            <p>Enter the local staff token from the backend configuration to open the Studio.</p>
            <label>
              Staff token
              <input name="token" type="password" required autoComplete="off" />
            </label>
            <button className={styles.primary} disabled={signingIn}>
              {signingIn ? 'Connecting…' : 'Sign in'}
            </button>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </form>
        ) : (
          <p>This build uses the demo catalog. Configure the API URL to connect the Studio.</p>
        )}
        <Link to="/en" className={styles.back}>
          Consumer website <ArrowUpRight size={15} />
        </Link>
      </section>
    </main>
  );
}

function Studio({ token, onSignOut }: { token: string; onSignOut: () => void }) {
  const api = staffApi(token);
  const client = useQueryClient();
  const [section, setSection] = useState<Section>('overview');
  const [selection, setSelection] = useState('');
  const [editorVersion, setEditorVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; text: string }>();
  const [shops, stories, requests] = useQueries({
    queries: sections.map(({ key }) => ({
      queryKey: ['studio', key],
      queryFn: ({ signal }: { signal: AbortSignal }) => loadLibrary(api, key, signal),
      enabled: section === 'overview' || section === key,
    })),
  });
  const list = section === 'stories' ? stories : section === 'requests' ? requests : shops;
  const dashboardQueries = [shops, stories, requests];
  const dashboardError = dashboardQueries.find((query) => query.isError);

  const save: Save = async (operation, message) => {
    if (busy) return;
    setBusy(true);
    setFeedback(undefined);
    try {
      await operation();
      setFeedback({ error: false, text: message });
      await client.invalidateQueries({ queryKey: ['studio'] });
    } catch (error) {
      setFeedback({ error: true, text: apiError(error) });
    } finally {
      setBusy(false);
    }
  };

  function choose(next: string) {
    setEditorVersion((version) => version + 1);
    setSelection(next);
    setFeedback(undefined);
  }

  function navigate(next: Section, key = '', status = 'all') {
    setSection(next);
    setSearch('');
    setFilter(status);
    choose(key);
  }

  const records = list.data ?? [];
  const rows = records.filter((record) => {
    const item = describe(record);
    const state =
      record.kind === 'requests' ? record.data.status : item.visible ? 'visible' : 'hidden';
    return (
      (filter === 'all' ||
        filter === state ||
        (filter === 'open' && ['submitted', 'in_review', 'needs_info'].includes(state))) &&
      `${item.title} ${item.detail} ${item.key} ${record.kind === 'stories' ? record.data.versions.map((version) => version.title).join(' ') : ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
    );
  });
  const firstKey =
    (section === 'shops' || section === 'stories') && rows[0] ? describe(rows[0]).key : '';
  const activeKey = selection || firstKey;
  useEffect(() => {
    if (!selection && firstKey) setSelection(firstKey);
  }, [selection, firstKey]);
  const selected = records.find((record) => describe(record).key === activeKey);
  const creating = selection === '+new';
  const savedShop = (shop: Shop) => {
    setSection('shops');
    setSelection(shop.slug);
    setSearch('');
    setFilter('all');
  };
  const savedStory = (story: StoryGroup) => {
    setSelection(story.slug);
    setSearch('');
    setFilter('all');
  };

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <div className={styles.brand}>
          <img src={publicPath('/moretti-symbol.svg')} alt="" width="34" height="34" />
          <div>
            RoadToSmartBaking<small>Marketing Studio</small>
          </div>
        </div>
        <nav aria-label="Studio sections">
          {navigation.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              aria-current={section === key ? 'page' : undefined}
              disabled={busy}
              onClick={() => navigate(key)}
            >
              <Icon /> {label}
            </button>
          ))}
        </nav>
        <div className={styles.railAccent}>
          <span>Moretti Forni</span>
          <small>Road to Smart Baking</small>
        </div>
        <div className={styles.railFooter}>
          <Link to="/en">
            Consumer website <ArrowUpRight size={15} />
          </Link>
          <button onClick={onSignOut} disabled={busy}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <span className={styles.kicker}>MORETTI FORNI / CONTENT OPERATIONS</span>
            <h1>{navigation.find(({ key }) => key === section)?.label}</h1>
            <p>{descriptions[section]}</p>
          </div>
          {(section === 'shops' || section === 'stories') && (
            <button className={styles.primary} disabled={busy} onClick={() => choose('+new')}>
              <Plus size={17} /> New {section === 'shops' ? 'shop' : 'story'}
            </button>
          )}
        </header>
        {feedback && (
          <p
            className={feedback.error ? styles.error : styles.success}
            role={feedback.error ? 'alert' : 'status'}
          >
            {feedback.text}
          </p>
        )}
        {section === 'overview' ? (
          dashboardError ? (
            <div className={styles.panel} role="alert">
              <p>{apiError(dashboardError.error)}</p>
              <button
                type="button"
                onClick={() => dashboardQueries.forEach((query) => void query.refetch())}
              >
                Retry dashboard
              </button>
            </div>
          ) : dashboardQueries.every((query) => query.isSuccess) ? (
            <Dashboard
              shops={
                shops.data?.flatMap((record) =>
                  record.kind === 'shops' ? [record.data.liveShop ?? record.data] : [],
                ) ?? []
              }
              stories={
                stories.data?.flatMap((record) =>
                  record.kind === 'stories' ? [record.data] : [],
                ) ?? []
              }
              requests={
                requests.data?.flatMap((record) =>
                  record.kind === 'requests' ? [record.data] : [],
                ) ?? []
              }
              onOpen={navigate}
            />
          ) : (
            <p className={styles.panel} role="status">
              Loading dashboard…
            </p>
          )
        ) : (
          <div className={styles.workspace} data-section={section}>
            <section className={styles.panel}>
              <div className={styles.heading}>
                <h2>{sections.find(({ key }) => key === section)?.label}</h2>
                {list.isSuccess && (
                  <span className={styles.badge}>
                    {rows.length} / {records.length}
                  </span>
                )}
              </div>
              <div className={styles.filters}>
                <div className={styles.searchBox}>
                  <Search size={16} aria-hidden="true" />
                  <input
                    aria-label="Search records"
                    placeholder="Search records"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <select
                  aria-label="Filter records"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">All statuses</option>
                  {section === 'requests' ? (
                    <>
                      <option value="open">Open requests</option>
                      {Object.entries(statuses).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </>
                  ) : (
                    <>
                      <option value="visible">Visible · 1</option>
                      <option value="hidden">Hidden · 0</option>
                    </>
                  )}
                </select>
              </div>
              {list.isPending ? (
                <p role="status">Loading records…</p>
              ) : list.isError ? (
                <div role="alert">
                  <p>{apiError(list.error)}</p>
                  <button onClick={() => list.refetch()}>Retry</button>
                </div>
              ) : rows.length ? (
                <ul className={styles.list}>
                  {rows.map((record) => {
                    const { key, title, detail, visible, status, image, draft } = describe(record);
                    return (
                      <li key={key}>
                        <button
                          disabled={busy}
                          aria-pressed={activeKey === key}
                          onClick={() => choose(key)}
                        >
                          {image ? (
                            <img
                              className={styles.thumbnail}
                              src={imageUrl(image)}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className={styles.recordIcon}>
                              {record.kind === 'requests' ? (
                                <Inbox size={17} />
                              ) : record.kind === 'stories' ? (
                                <BookOpen size={17} />
                              ) : (
                                <Store size={17} />
                              )}
                            </span>
                          )}
                          <span className={styles.recordCopy}>
                            <strong>{title}</strong>
                            <span>{detail}</span>
                            {status ? (
                              <small>{status}</small>
                            ) : (
                              <Visibility visible={Boolean(visible)} />
                            )}
                            {draft && (
                              <small>{visible ? 'Unpublished changes' : 'Saved draft'}</small>
                            )}
                          </span>
                          <ChevronRight
                            className={styles.recordArrow}
                            size={15}
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>{records.length ? 'No matching records.' : 'No records yet.'}</p>
              )}
            </section>
            {selected?.kind === 'shops' && (
              <ShopEditor
                key={`${activeKey}/${editorVersion}`}
                shop={selected.data}
                api={api}
                save={save}
                busy={busy}
                onSaved={savedShop}
              />
            )}
            {selected?.kind === 'stories' && (
              <LoadStoryEditor
                key={`${activeKey}/${editorVersion}`}
                group={selected.data}
                api={api}
                save={save}
                busy={busy}
                onSaved={savedStory}
              />
            )}
            {selected?.kind === 'requests' && (
              <RequestEditor
                key={`${activeKey}/${editorVersion}`}
                request={selected.data}
                api={api}
                save={save}
                busy={busy}
                onMoved={savedShop}
              />
            )}
            {creating && section === 'shops' && (
              <ShopEditor api={api} save={save} busy={busy} onSaved={savedShop} />
            )}
            {creating && section === 'stories' && (
              <StoryEditor api={api} save={save} busy={busy} onSaved={savedStory} />
            )}
            {!selected && !creating && (
              <section className={styles.panel}>
                <h2>{section === 'requests' ? 'Request review' : 'Record editor'}</h2>
                <p>
                  {section === 'requests'
                    ? 'Choose a request to review its details and create a shop.'
                    : 'Choose a record to edit or create a new one.'}
                </p>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

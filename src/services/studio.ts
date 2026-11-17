import { isAxiosError } from 'axios';
import { publicHttp } from './http';

export type Language = 'it' | 'en';
export type Category = 'pizza' | 'restaurant' | 'qsr' | 'bakery' | 'hotel' | 'other';
export type Shop = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  descriptionIt: string | null;
  descriptionEn: string | null;
  oven: string | null;
  website: string | null;
  imageUrl: string | null;
  imageAltIt: string | null;
  imageAltEn: string | null;
  visible: boolean;
  draftRevision?: string;
  liveShop?: Shop;
};
export type Block =
  | { type: 'heading' | 'paragraph'; text: string }
  | { type: 'image'; image: string; sourceUrl?: string; alt: string; aspectRatio: number };
export type Story = {
  slug: string;
  language: Language;
  title: string;
  category: string;
  summary: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  sourceUrl: string | null;
  sourcePublishedAt: string | null;
  visible: boolean;
  draftRevision?: string;
};
export type Draft<T> = {
  slug: string;
  revision: string;
  savedAt: string;
  payload: T;
};
export type ShopDraft = Draft<Shop> & { kind: 'shop'; language: '' };
export type StoryDraft = Draft<Story & { blocks: Block[] }> & { kind: 'story'; language: Language };

export function draftPath(kind: 'shop' | 'story', slug: string, language: Language | 'shared') {
  return `drafts/${kind}/${encodeURIComponent(slug)}/${language}`;
}

export type RequestStatus = 'submitted' | 'in_review' | 'needs_info' | 'declined' | 'approved';
export type ListingRequest = {
  id: string;
  businessName: string;
  category: Category;
  address: string;
  city: string;
  country: string;
  oven: string;
  website: string | null;
  contactName: string;
  email: string;
  notes: string | null;
  reviewNote: string | null;
  status: RequestStatus;
  shopId: string | null;
  createdAt: string;
};

export function staffApi(identity: string) {
  if (!identity) throw new Error('Sign in required');
  const headers = {};
  return {
    async list<T>(path: string, signal?: AbortSignal, language?: Language) {
      const records: T[] = [];
      const limit = 100;
      while (true) {
        const { data } = await publicHttp.get<{ items: T[] }>(`/admin/${path}`, {
          headers,
          params: { limit, offset: records.length, language },
          signal,
        });
        records.push(...data.items);
        if (data.items.length < limit) return records;
      }
    },
    async draft<T>(path: string) {
      return (await publicHttp.get<Draft<T>>(`/admin/${path}`, { headers })).data;
    },
    async storyEditor(slug: string, signal: AbortSignal) {
      const { data } = await publicHttp.get<{ versions: (Story & { blocks: Block[] })[] }>(
        `/admin/story-drafts/${encodeURIComponent(slug)}`,
        { headers, signal },
      );
      return data;
    },
    async write<T>(method: 'post' | 'put' | 'patch', path: string, data: unknown) {
      return (await publicHttp.request<T>({ method, url: `/admin/${path}`, data, headers })).data;
    },
  };
}

export type StaffApi = ReturnType<typeof staffApi>;
export type Save = (operation: () => Promise<void>, message: string) => Promise<void>;

export function apiError(error: unknown) {
  if (
    isAxiosError<{ error?: string; issues?: { path: (number | string)[]; message: string }[] }>(
      error,
    )
  ) {
    const details = error.response?.data;
    if (error.response?.status === 401)
      return error.config?.url?.includes('/auth/verify-code')
        ? details?.error || 'Invalid or expired code.'
        : 'Your session has expired. Sign in again with your Moretti Forni email.';
    if (details?.issues?.length) {
      return details.issues
        .map(({ path, message }) => `${path.join('.')} — ${message}`)
        .join(' · ');
    }
    if (details?.error) return details.error;
  }
  if (error instanceof Error && !isAxiosError(error)) return error.message;
  return 'Could not reach the staff API. Check that the application and database are running.';
}

import { imageUrl } from '../../data/story-index';
import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';
import styles from '../../routes/admin.module.css';

export const categories = ['pizza', 'bakery', 'hotel', 'other'] as const;
export const statuses = {
  submitted: 'New',
  in_review: 'In review',
  needs_info: 'Needs information',
  declined: 'Declined',
  approved: 'Moved to shops',
} as const;

export function Field({
  name,
  label,
  value,
  required,
  type = 'text',
  children,
}: {
  name: string;
  label: string;
  value?: string | number | null;
  required?: boolean;
  type?: 'text' | 'url' | 'email' | 'number' | 'textarea';
  children?: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  const props = { id, name, required, defaultValue: value ?? '' };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      {children ? (
        cloneElement(children, { id })
      ) : type === 'textarea' ? (
        <textarea {...props} />
      ) : (
        <input {...props} type={type} step={type === 'number' ? 'any' : undefined} />
      )}
    </div>
  );
}

export function CategoryField({ value }: { value?: string }) {
  return (
    <Field name="category" label="Category">
      <select name="category" defaultValue={value ?? 'pizza'}>
        {categories.map((category) => (
          <option key={category}>{category}</option>
        ))}
      </select>
    </Field>
  );
}

export const languages = ['it', 'en'] as const;
export const languageNames = { it: 'Italian', en: 'English' };

export function LanguageToggle({
  language,
  onChange,
  disabled,
}: {
  language: 'it' | 'en';
  onChange: (language: 'it' | 'en') => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.languageToggle} role="group" aria-label="Content language">
      {languages.map((value) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          aria-pressed={value === language}
          onClick={() => onChange(value)}
        >
          {languageNames[value]}
        </button>
      ))}
    </div>
  );
}

export function Visibility({ visible }: { visible: boolean }) {
  return (
    <span className={visible ? styles.visible : styles.badge}>
      {visible ? 'Visible · 1' : 'Hidden · 0'}
    </span>
  );
}

export function values(form: HTMLFormElement) {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? '').trim();
  return {
    text,
    optional: (name: string) => text(name) || undefined,
    visible: data.has('visible'),
  };
}

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
    .replace(/-$/, '');
}

export function Preview({
  image,
  alt,
  title,
  children,
}: {
  image?: string | null;
  alt?: string | null;
  title: string;
  children?: ReactNode;
}) {
  const safeImage = image && (/^https?:\/\//i.test(image) || /^\/(?:shops|media)\//.test(image));
  return (
    <aside className={styles.panel}>
      <h2>Content preview</h2>
      <div className={styles.phone}>
        {safeImage && <img src={imageUrl(image)} alt={alt ?? ''} />}
        <div>
          <span className={styles.kicker}>ROAD TO SMART BAKING</span>
          <h3>{title}</h3>
          {children}
        </div>
      </div>
    </aside>
  );
}

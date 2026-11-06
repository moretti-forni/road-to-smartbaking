import { useTranslation } from 'react-i18next';
import { useSaved } from '../components/providers';
export function meta() {
  return [{ title: 'Privacy · RoadToSmartBaking' }];
}
export default function Privacy() {
  const { t } = useTranslation();
  const { clear } = useSaved();
  return (
    <main id="main" className="container legal-page">
      <span className="eyebrow brand-tag">#RoadToSmartBaking</span>
      <h1>{t('privacyTitle')}</h1>
      <p>{t('privacyBody')}</p>
      <button className="button outlined" onClick={clear}>
        {t('clearSaved')}
      </button>
    </main>
  );
}

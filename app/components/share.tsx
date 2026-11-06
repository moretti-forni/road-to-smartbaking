import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
export function ShareButton({ title }: { title: string }) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title, url: location.href });
      else {
        await navigator.clipboard.writeText(location.href);
        setMessage(t('copied'));
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setMessage(t('shareFailed'));
    }
  }
  return (
    <span className="share-control">
      <button className="button subtle" onClick={share}>
        <Share2 size={15} />
        {t('share')}
      </button>
      <span className="share-status" role="status">
        {message}
      </span>
    </span>
  );
}

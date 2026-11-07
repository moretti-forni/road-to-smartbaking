import { useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router';
import { ArrowUpRight, Heart, MapPinned, Menu, Newspaper, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSaved } from './providers';
import { ListingRequestButton } from './listing-request';
import { publicPath } from '../utils/public-path';

export function Brand({ footer = false }: { footer?: boolean }) {
  return (
    <span className={`brand ${footer ? 'brand-footer' : ''}`}>
      <img src={publicPath('/moretti-symbol.svg')} alt="" width="34" height="34" />
      <span className="brand-name">
        <strong>#RoadToSmartBaking</strong>
      </span>
    </span>
  );
}
export function Header() {
  const { t } = useTranslation();
  const { locale = 'it' } = useParams();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { ids } = useSaved();
  const otherLocale = locale === 'it' ? 'en' : 'it';
  const alternatePath = location.pathname.replace(/^\/(it|en)(?=\/|$)/, `/${otherLocale}`);
  return (
    <>
      <a className="skip-link" href="#main">
        {t('skip')}
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link to={`/${locale}`} aria-label="#RoadToSmartBaking" onClick={() => setOpen(false)}>
            <Brand />
          </Link>
          <nav className={`main-nav ${open ? 'nav-open' : ''}`} aria-label={t('menu')}>
            <NavLink end to={`/${locale}`} onClick={() => setOpen(false)}>
              {t('explore')}
            </NavLink>
            <NavLink to={`/${locale}/stories`} onClick={() => setOpen(false)}>
              {t('stories')}
            </NavLink>
            <NavLink to={`/${locale}/saved`} onClick={() => setOpen(false)}>
              <Heart size={16} />
              {t('saved')}
              {ids.length > 0 && <span className="saved-count">{ids.length}</span>}
            </NavLink>
            <ListingRequestButton />
          </nav>
          <div className="header-tools">
            <span className="powered">
              by <strong>MORETTI FORNI</strong>
            </span>
            <Link
              className="language"
              to={alternatePath + location.search}
              aria-label={otherLocale === 'en' ? 'Switch to English' : 'Passa a italiano'}
            >
              {otherLocale.toUpperCase()}
              <ArrowUpRight size={12} />
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-expanded={open}
              aria-label={open ? t('close') : t('menu')}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
export function Footer() {
  const { t } = useTranslation();
  const { locale } = useParams();
  return (
    <footer className="site-footer">
      <div className="container footer-main">
        <div>
          <Brand footer />
          <p>{t('footerSmall')}</p>
        </div>
        <p className="footer-message">{t('footer')}</p>
        <div className="footer-actions">
          <ListingRequestButton variant="footer" />
          <a href="https://morettiforni.com" target="_blank" rel="noreferrer">
            Moretti Forni <ArrowUpRight size={17} />
          </a>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} Moretti Forni · {t('credits')}
        </span>
        <Link to={`/${locale}/privacy`}>{t('privacy')}</Link>
      </div>
    </footer>
  );
}

export function MobileTabBar() {
  const { t } = useTranslation();
  const { locale = 'it' } = useParams();
  const location = useLocation();
  const { ids } = useSaved();
  const isExplore =
    location.pathname === `/${locale}` || location.pathname.includes(`/${locale}/restaurants/`);

  return (
    <nav className="mobile-tab-bar" aria-label={t('menu')}>
      <Link
        className={`mobile-tab-link ${isExplore ? 'active' : ''}`}
        to={`/${locale}`}
        aria-current={isExplore ? 'page' : undefined}
      >
        <MapPinned size={22} />
        <span>{t('explore')}</span>
      </Link>
      <NavLink className="mobile-tab-link" to={`/${locale}/stories`}>
        <Newspaper size={22} />
        <span>{t('stories')}</span>
      </NavLink>
      <NavLink className="mobile-tab-link" to={`/${locale}/saved`}>
        <span className="mobile-tab-icon">
          <Heart size={22} />
          {ids.length > 0 && <span className="mobile-tab-count">{ids.length}</span>}
        </span>
        <span>{t('saved')}</span>
      </NavLink>
    </nav>
  );
}

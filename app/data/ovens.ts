import iDeckDetail from '../../assets/references/ovens/iDeck_dettaglio.png';
import linkDetail from '../../assets/references/ovens/link_dettaglio.png';
import neapolisDetail from '../../assets/references/ovens/neapolis_dettaglio.svg';
import seriePDetail from '../../assets/references/ovens/serieP_dettaglio.svg';
import serieSDetail from '../../assets/references/ovens/serieS_dettaglio.svg';
import serieXDetail from '../../assets/references/ovens/serieX_dettaglio.svg';
import iDeckLogo from '../../assets/references/ovens/logo_iDeck.svg';
import linkLogo from '../../assets/references/ovens/logo_link.svg';
import neapolisLogo from '../../assets/references/ovens/logo_neapolis.svg';
import seriePLogo from '../../assets/references/ovens/logo_serieP.svg';
import serieSLogo from '../../assets/references/ovens/logo_serieS.svg';
import serieTLogo from '../../assets/references/ovens/logo_serieT.svg';
import serieXLogo from '../../assets/references/ovens/logo_serieX.svg';

export type OvenModel = {
  name: string;
  image?: string;
  logo?: string;
  productUrl?: string;
};

const ovenImages: Record<string, string> = {
  ideck: iDeckDetail,
  link: linkDetail,
  neapolis: neapolisDetail,
  seriep: seriePDetail,
  series: serieSDetail,
  seriex: serieXDetail,
};

const ovenLogos: Record<string, string> = {
  ideck: iDeckLogo,
  link: linkLogo,
  neapolis: neapolisLogo,
  seriep: seriePLogo,
  series: serieSLogo,
  seriet: serieTLogo,
  seriex: serieXLogo,
};

const ovenProductUrls: Record<string, string> = {
  ideck: 'https://morettiforni.com/ideck',
  link: 'https://morettiforni.com/link',
  neapolis: 'https://morettiforni.com/neapolis',
  seriep: 'https://morettiforni.com/serie-p',
  series: 'https://morettiforni.com/serie-s',
  seriet: 'https://morettiforni.com/serie-t',
  seriex: 'https://morettiforni.com/serie-x',
};

export function resolveOvens(value: string): OvenModel[] {
  const uniqueModels = Array.from(
    new Map(
      value
        .split(' · ')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [name.toLocaleLowerCase(), name]),
    ).values(),
  ).slice(0, 2);

  return uniqueModels.map((name) => ({
    name,
    image: ovenImages[name.toLocaleLowerCase()],
    logo: ovenLogos[name.toLocaleLowerCase()],
    productUrl: ovenProductUrls[name.toLocaleLowerCase()],
  }));
}

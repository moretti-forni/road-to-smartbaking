const iDeckDetail = '/ovens/iDeck_dettaglio.png';
const linkDetail = '/ovens/link_dettaglio.png';
const neapolisDetail = '/ovens/neapolis_dettaglio.svg';
const seriePDetail = '/ovens/serieP_dettaglio.svg';
const serieSDetail = '/ovens/serieS_dettaglio.svg';
const serieXDetail = '/ovens/serieX_dettaglio.svg';
const iDeckLogo = '/ovens/logo_iDeck.svg';
const linkLogo = '/ovens/logo_link.svg';
const neapolisLogo = '/ovens/logo_neapolis.svg';
const seriePLogo = '/ovens/logo_serieP.svg';
const serieSLogo = '/ovens/logo_serieS.svg';
const serieTLogo = '/ovens/logo_serieT.svg';
const serieXLogo = '/ovens/logo_serieX.svg';

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

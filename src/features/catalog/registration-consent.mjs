import { privacyNoticeUrl } from './legal-documents.mjs';
export const registrationConsentVersion = '2026-11-23';
export const registrationConsent = {
  it: {
    listingPrivacyDocument: 'Leggi l’informativa (PDF)',
    listingPrivacyAcknowledgement:
      "Con l'invio della richiesta dichiaro di aver preso visione dell'informativa sul trattamento dei dati personali RoadToSmartBaking",
    listingServiceConsentTitle: 'Adesione al servizio',
    listingServiceConsentBody:
      'Richiedo l’adesione del locale a RoadToSmartBaking e accetto le condizioni di adesione. Dichiaro di essere il titolare dell’attività, il legale rappresentante o un soggetto autorizzato e confermo la correttezza delle informazioni fornite.',
    listingPublicationConsentTitle: 'Autorizzazione alla pubblicazione dei contenuti',
    listingPublicationConsentBody:
      'Autorizzo Moretti Forni S.p.A. a pubblicare le informazioni e i materiali confermati nell’anteprima della scheda, comprese le fotografie, nell’ambito di RoadToSmartBaking, secondo le condizioni di adesione. Dichiaro di disporre dei diritti e delle autorizzazioni necessari sui materiali forniti.',
  },
  en: {
    listingPrivacyDocument: 'Read the privacy notice (PDF)',
    listingPrivacyAcknowledgement:
      'By submitting this request, I declare that I have read the RoadToSmartBaking privacy notice on the processing of personal data.',
    listingServiceConsentTitle: 'Service membership',
    listingServiceConsentBody:
      'I request that the venue join RoadToSmartBaking and accept the membership conditions. I declare that I am the business owner, legal representative or an authorised person, and confirm that the information provided is accurate.',
    listingPublicationConsentTitle: 'Permission to publish content',
    listingPublicationConsentBody:
      'I authorise Moretti Forni S.p.A. to publish the information and materials confirmed in the listing preview, including photographs, as part of RoadToSmartBaking, under the membership conditions. I declare that I hold the necessary rights and permissions for the materials provided.',
  },
};
export function consentRecord(language, acceptedAt) {
  const copy = registrationConsent[language];
  return `\n\n[RoadToSmartBaking · ${registrationConsentVersion} · ${language} · ${acceptedAt}]\n${copy.listingPrivacyAcknowledgement}\n${privacyNoticeUrl(language)}\n✓ ${copy.listingServiceConsentTitle}: ${copy.listingServiceConsentBody}\n✓ ${copy.listingPublicationConsentTitle}: ${copy.listingPublicationConsentBody}`;
}

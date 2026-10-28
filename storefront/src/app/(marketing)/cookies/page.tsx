import { LegalPage, legalPageMetadata } from '@/components/sections/LegalPage';

export function generateMetadata() {
  return legalPageMetadata(
    'cookies',
    (siteName) => `Which cookies the ${siteName} website uses and why.`,
  );
}

export default function CookiesPage() {
  return <LegalPage slug="cookies" />;
}

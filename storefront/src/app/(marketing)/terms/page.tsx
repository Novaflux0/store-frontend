import { LegalPage, legalPageMetadata } from '@/components/sections/LegalPage';

export function generateMetadata() {
  return legalPageMetadata(
    'terms',
    (siteName) => `The terms that apply when you use the ${siteName} website.`,
  );
}

export default function TermsPage() {
  return <LegalPage slug="terms" />;
}

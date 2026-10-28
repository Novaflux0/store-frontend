import { LegalPage, legalPageMetadata } from '@/components/sections/LegalPage';

export function generateMetadata() {
  return legalPageMetadata(
    'privacy',
    (siteName) => `How ${siteName} collects, uses and protects your personal data.`,
  );
}

export default function PrivacyPage() {
  return <LegalPage slug="privacy" />;
}

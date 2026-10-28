import { describe, expect, it } from 'vitest';

import { BUDGET_OPTIONS, SERVICE_OPTIONS, TIMELINE_OPTIONS } from '@agency/validation';

import { classifyDevice, isSoftwareRenderer } from '@/components/three/device-tier';
import { BUDGET_CHOICES, SERVICE_CHOICES, TIMELINE_CHOICES } from '@/content/services';

import { flagForPath, isAreaClosed } from './protected-areas';
import { breadcrumbJsonLd, organizationJsonLd, serializeJsonLd } from './seo/json-ld';
import { pageMetadata } from './seo/metadata';

const SETTINGS = { site: { name: 'Agency' }, seo: { titleTemplate: '%s | Agency' } };

describe('protected areas (proxy.ts)', () => {
  it('maps portal paths to their flag', () => {
    expect(flagForPath('/portal')).toBe('clientPortal');
    expect(flagForPath('/portal/projects/1')).toBe('clientPortal');
    expect(flagForPath('/portals')).toBeNull();
    // The admin dashboard lives in the separate admin/ app (ADR 0014).
    expect(flagForPath('/admin')).toBeNull();
    expect(flagForPath('/')).toBeNull();
  });

  it('denies by default and opens only when the flag is on', () => {
    expect(isAreaClosed('/portal', {})).toBe(true);
    expect(isAreaClosed('/portal', { FEATURE_CLIENT_PORTAL: 'true' })).toBe(false);
    expect(isAreaClosed('/portal/projects', { FEATURE_CLIENT_PORTAL: '1' })).toBe(false);
    expect(isAreaClosed('/services', {})).toBe(false);
  });
});

describe('classifyDevice', () => {
  const desktop = { hardwareConcurrency: 12, deviceMemory: 16, coarsePointer: false, webgl: true };

  it('picks the tier from device signals', () => {
    expect(classifyDevice(desktop)).toBe('high');
    expect(classifyDevice({ ...desktop, deviceMemory: undefined })).toBe('high');
    expect(classifyDevice({ ...desktop, coarsePointer: true })).toBe('low');
    expect(classifyDevice({ ...desktop, hardwareConcurrency: 4 })).toBe('low');
    expect(classifyDevice({ ...desktop, deviceMemory: 4 })).toBe('low');
    expect(classifyDevice({ ...desktop, webgl: false })).toBe('off');
    expect(classifyDevice({ ...desktop, saveData: true })).toBe('off');
  });

  it('shows the static fallback when WebGL only runs in software', () => {
    expect(classifyDevice({ ...desktop, softwareWebgl: true })).toBe('off');
    expect(classifyDevice({ ...desktop, softwareWebgl: false })).toBe('high');
  });

  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 17.0.6, 256 bits)',
    'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
  ])('recognises the software renderer %j', (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(true);
  });

  it.each([
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Apple M2',
    'Mali-G78',
    'Adreno (TM) 740',
  ])('keeps the GPU renderer %j', (renderer) => {
    expect(isSoftwareRenderer(renderer)).toBe(false);
  });
});

describe('form choices', () => {
  it('cover every shared enum value in the contract', () => {
    expect(SERVICE_CHOICES.map((c) => c.value)).toEqual([...SERVICE_OPTIONS]);
    expect(BUDGET_CHOICES.map((c) => c.value)).toEqual([...BUDGET_OPTIONS]);
    expect(TIMELINE_CHOICES.map((c) => c.value)).toEqual([...TIMELINE_OPTIONS]);
  });
});

describe('JSON-LD', () => {
  it('escapes characters that could close the script tag', () => {
    const json = serializeJsonLd({ '@context': 'https://schema.org', name: '</script><b>&' });
    expect(json).not.toContain('<');
    expect(json).not.toContain('>');
    expect(json).not.toContain('&');
    expect(JSON.parse(json)).toEqual({ '@context': 'https://schema.org', name: '</script><b>&' });
  });

  it('builds Organization and BreadcrumbList documents with absolute URLs', () => {
    expect(
      organizationJsonLd({
        name: 'Agency',
        legalName: 'Agency Ltd.',
        email: 'hello@agency.com',
        description: 'D',
        phone: '+49 30 1234567',
        address: { street: 'Main St 1', city: 'Berlin', postalCode: '10115', country: 'DE' },
        social: [{ platform: 'github', url: 'https://github.com/agency' }],
      }),
    ).toMatchObject({
      '@type': 'Organization',
      url: 'http://localhost:3000/',
      telephone: '+49 30 1234567',
      address: { '@type': 'PostalAddress', addressLocality: 'Berlin', postalCode: '10115' },
      sameAs: ['https://github.com/agency'],
    });
    expect(
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/services' },
      ]),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'http://localhost:3000/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Services',
          item: 'http://localhost:3000/services',
        },
      ],
    });
  });
});

describe('pageMetadata', () => {
  it('sets canonical URL and Open Graph', () => {
    const metadata = pageMetadata(
      { title: 'Services', description: 'D', path: '/services' },
      SETTINGS,
    );
    expect(metadata.alternates?.canonical).toBe('/services');
    expect(metadata.openGraph).toMatchObject({ url: '/services', title: 'Services | Agency' });
    expect(metadata.robots).toBeUndefined();
    expect(
      pageMetadata({ title: 'X', description: 'D', path: '/terms', noIndex: true }, SETTINGS)
        .robots,
    ).toEqual({ index: false, follow: true });
  });
});

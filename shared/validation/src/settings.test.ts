import { describe, expect, it } from 'vitest';

import { PUBLIC_SETTINGS_KEYS, SETTINGS_KEYS } from './admin-options.js';
import {
  SETTINGS_SCHEMAS,
  featureSettingsSchema,
  navigationSettingsSchema,
  notificationSettingsSchema,
  securitySettingsSchema,
  seoSettingsSchema,
  siteSettingsSchema,
  updateSettingsSchema,
} from './settings.js';

describe('settings schemas', () => {
  it('has one schema per key and keeps security and notifications private', () => {
    expect(Object.keys(SETTINGS_SCHEMAS).sort()).toEqual([...SETTINGS_KEYS].sort());
    expect(PUBLIC_SETTINGS_KEYS).not.toContain('security');
    expect(PUBLIC_SETTINGS_KEYS).not.toContain('notifications');
  });

  it('validates the site identity', () => {
    const site = {
      name: 'Agency',
      legalName: 'Agency Ltd',
      tagline: 'Websites',
      description: 'We build websites.',
      email: 'Hello@Agency.com',
      social: [{ platform: 'github', url: 'https://github.com/agency' }],
    };
    expect(siteSettingsSchema.parse(site).email).toBe('hello@agency.com');
    expect(siteSettingsSchema.safeParse({ ...site, name: 'Line\nbreak' }).success).toBe(false);
    expect(
      siteSettingsSchema.safeParse({
        ...site,
        social: [{ platform: 'myspace', url: 'https://x.com' }],
      }).success,
    ).toBe(false);
  });

  it('requires at least one primary link and safe hrefs', () => {
    const cta = { label: 'Talk', href: '/contact' };
    expect(navigationSettingsSchema.safeParse({ start: [], cta }).success).toBe(false);
    expect(
      navigationSettingsSchema.safeParse({
        start: [{ label: 'X', href: 'javascript:alert(1)' }],
        cta,
      }).success,
    ).toBe(false);
    expect(navigationSettingsSchema.parse({ start: [cta], cta }).more).toEqual([]);
  });

  it('defaults the hero top bar links to none, so stored settings stay valid', () => {
    const cta = { label: 'Talk', href: '/contact' };
    expect(navigationSettingsSchema.parse({ start: [cta], cta }).header).toEqual([]);
    expect(
      navigationSettingsSchema.safeParse({
        header: Array.from({ length: 7 }, () => cta),
        start: [cta],
        cta,
      }).success,
    ).toBe(false);
  });

  it('needs %s in the title template', () => {
    const seo = { titleTemplate: '%s | Agency', defaultTitle: 'Agency', defaultDescription: 'D' };
    expect(seoSettingsSchema.safeParse(seo).success).toBe(true);
    expect(seoSettingsSchema.safeParse({ ...seo, titleTemplate: 'Agency' }).success).toBe(false);
  });

  it('defaults every feature to on and the announcement to off', () => {
    expect(featureSettingsSchema.parse({})).toEqual({
      contactForm: true,
      inquiryForm: true,
      newsletter: true,
      careersApplications: true,
      announcement: { enabled: false, message: '' },
    });
    expect(
      featureSettingsSchema.safeParse({ announcement: { enabled: true, message: '' } }).success,
    ).toBe(false);
  });

  it('needs one to five recipients per notification', () => {
    expect(
      notificationSettingsSchema.safeParse({
        leads: [],
        applications: ['a@b.co'],
        security: ['a@b.co'],
      }).success,
    ).toBe(false);
  });

  it('bounds the security policy so it cannot be weakened past the floor', () => {
    expect(securitySettingsSchema.parse({})).toEqual({
      sessionDays: 7,
      stepUpMinutes: 10,
      lockoutThreshold: 5,
      lockoutMinutes: 15,
      newLoginAlerts: true,
    });
    expect(securitySettingsSchema.safeParse({ sessionDays: 365 }).success).toBe(false);
    expect(securitySettingsSchema.safeParse({ lockoutThreshold: 100 }).success).toBe(false);
    expect(securitySettingsSchema.safeParse({ mfaRequired: false }).success).toBe(false);
  });

  it('sends the whole value with its version', () => {
    expect(updateSettingsSchema.safeParse({ version: 0, value: {} }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ value: {} }).success).toBe(false);
  });
});

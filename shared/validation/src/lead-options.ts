// Zod-free on purpose: re-exported by `@agency/validation/constants` for browser
// code (select options, labels) that must not pull Zod into the first JS bundle.

export const LEAD_KINDS = ['contact', 'inquiry'] as const;
export type LeadKind = (typeof LEAD_KINDS)[number];

export const SERVICE_OPTIONS = [
  'web-design',
  'web-development',
  '3d-experiences',
  'branding',
  'seo',
  'other',
] as const;
export type ServiceOption = (typeof SERVICE_OPTIONS)[number];

export const BUDGET_OPTIONS = ['under-5k', '5k-15k', '15k-50k', '50k-plus', 'not-sure'] as const;
export type BudgetOption = (typeof BUDGET_OPTIONS)[number];

export const TIMELINE_OPTIONS = [
  'asap',
  '1-3-months',
  '3-6-months',
  '6-plus-months',
  'flexible',
] as const;
export type TimelineOption = (typeof TIMELINE_OPTIONS)[number];

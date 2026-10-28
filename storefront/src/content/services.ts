import {
  BUDGET_OPTIONS,
  SERVICE_OPTIONS,
  TIMELINE_OPTIONS,
  type BudgetOption,
  type ServiceOption,
  type TimelineOption,
} from '@agency/validation/constants';

/** Human labels for the shared enum values in `@agency/validation`. */
export const SERVICE_LABELS = {
  'web-design': 'Web design',
  'web-development': 'Web development',
  '3d-experiences': '3D web experiences',
  branding: 'Branding',
  seo: 'SEO and performance',
  other: 'Something else',
} as const satisfies Record<ServiceOption, string>;

export const BUDGET_LABELS = {
  'under-5k': 'Under $5k',
  '5k-15k': '$5k to $15k',
  '15k-50k': '$15k to $50k',
  '50k-plus': '$50k or more',
  'not-sure': 'Not sure yet',
} as const satisfies Record<BudgetOption, string>;

export const TIMELINE_LABELS = {
  asap: 'As soon as possible',
  '1-3-months': '1 to 3 months',
  '3-6-months': '3 to 6 months',
  '6-plus-months': '6 months or more',
  flexible: 'Flexible',
} as const satisfies Record<TimelineOption, string>;

/** A service with its own illustration in the home page section (`ServiceArt`). */
export type ServiceKey = Exclude<ServiceOption, 'other'>;

export interface Choice<T extends string> {
  readonly value: T;
  readonly label: string;
}

/** Option list in the contract's order (Zod-free constants subpath, plan I2-11). */
function choices<T extends string>(
  options: readonly T[],
  labels: Readonly<Record<T, string>>,
): readonly Choice<T>[] {
  return options.map((value) => ({ value, label: labels[value] }));
}

export const SERVICE_CHOICES = choices(SERVICE_OPTIONS, SERVICE_LABELS);
export const BUDGET_CHOICES = choices(BUDGET_OPTIONS, BUDGET_LABELS);
export const TIMELINE_CHOICES = choices(TIMELINE_OPTIONS, TIMELINE_LABELS);

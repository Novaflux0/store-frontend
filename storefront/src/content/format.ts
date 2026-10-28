import type { JobData, PricingPlanData } from '@agency/validation';
import type { EmploymentType } from '@agency/validation/constants';

/** Labels for the content pages; Zod-free, so they are safe in any component. */

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

/** `2026-10-14` -> `October 14, 2026` (UTC, so the build machine's zone never shifts it). */
export function formatDate(isoDate: string): string {
  return DATE_FORMAT.format(new Date(`${isoDate}T00:00:00Z`));
}

export const EMPLOYMENT_TYPE_LABELS: Readonly<Record<EmploymentType, string>> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACTOR: 'Contract',
  TEMPORARY: 'Temporary',
  INTERN: 'Internship',
  VOLUNTEER: 'Volunteer',
  PER_DIEM: 'Per diem',
  OTHER: 'Other',
};

const REGION_NAMES = new Intl.DisplayNames(['en'], { type: 'region' });

function countryName(code: string): string {
  return REGION_NAMES.of(code) ?? code;
}

/** `Berlin, Germany (hybrid)` or `Remote (Germany)`. */
export function formatJobLocation(location: JobData['location']): string {
  const country = countryName(location.country);
  if (location.type === 'remote') return `Remote (${country})`;
  const place = [location.city, location.region, country].filter(Boolean).join(', ');
  return location.type === 'hybrid' ? `${place} (hybrid)` : place;
}

const SALARY_UNIT_LABELS: Readonly<Record<NonNullable<JobData['salary']>['unit'], string>> = {
  HOUR: 'per hour',
  DAY: 'per day',
  WEEK: 'per week',
  MONTH: 'per month',
  YEAR: 'per year',
};

/** `€70,000 to €90,000 per year`. */
export function formatSalary(salary: NonNullable<JobData['salary']>): string {
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: salary.currency,
    maximumFractionDigits: 0,
  });
  const amount =
    salary.max === undefined
      ? money.format(salary.min)
      : `${money.format(salary.min)} to ${money.format(salary.max)}`;
  return `${amount} ${SALARY_UNIT_LABELS[salary.unit]}`;
}

/** `Alex Morgan` -> `AM`: the avatar placeholder until team photos exist. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
  return letters.map((part) => (part ?? '').charAt(0).toUpperCase()).join('');
}

const PRICE_PERIOD_LABELS: Readonly<
  Record<NonNullable<PricingPlanData['price']>['period'], string>
> = {
  'one-time': '',
  month: 'per month',
  year: 'per year',
  hour: 'per hour',
};

/** `From $4,900` / `$1,200 per month`; the plan's note (e.g. "Let's talk") when unpriced. */
export function formatPrice(plan: Pick<PricingPlanData, 'price' | 'priceNote'>): string {
  if (!plan.price) return plan.priceNote ?? 'Custom quote';
  const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: plan.price.currency,
    maximumFractionDigits: 0,
  }).format(plan.price.amount);
  const period = PRICE_PERIOD_LABELS[plan.price.period];
  return [plan.price.from ? `From ${money}` : money, period].filter(Boolean).join(' ');
}

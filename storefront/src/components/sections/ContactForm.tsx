'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { Button, CheckboxField, Field, Input, Select, Textarea, fieldErrorId } from '@agency/ui';
import type { CreateLeadInput } from '@agency/validation';
import { FIELD_LIMITS, type LeadKind } from '@agency/validation/constants';

import type { SubmitLeadResult } from '@/app/(marketing)/contact/lead-result';
import { BUDGET_CHOICES, SERVICE_CHOICES, TIMELINE_CHOICES } from '@/content/services';

import { leadResolver, loadLeadResolver, type LeadFormValues } from './lead-resolver';
import { focusFirstInvalid } from '@/lib/forms/focus-first-invalid';
import { toast } from '@/lib/toast';
import { HoneypotField } from './HoneypotField';
import { Turnstile, type TurnstileHandle } from './Turnstile';

export type { LeadFormValues } from './lead-resolver';

export type SubmitLeadAction = (
  input: unknown,
  idempotencyKey: string,
) => Promise<SubmitLeadResult>;

const FORM_FIELDS = new Set<string>([
  'kind',
  'name',
  'email',
  'company',
  'message',
  'service',
  'budget',
  'timeline',
  'consent',
  'turnstileToken',
] satisfies (keyof LeadFormValues)[]);

function isFormField(field: string): field is keyof LeadFormValues {
  return FORM_FIELDS.has(field);
}

const DEFAULT_VALUES: LeadFormValues = {
  kind: 'contact',
  name: '',
  email: '',
  company: '',
  message: '',
  service: '',
  budget: '',
  timeline: '',
  consent: false,
  turnstileToken: '',
  extraNote: '',
};

const KIND_OPTIONS: readonly { value: LeadKind; label: string; hint: string }[] = [
  { value: 'contact', label: 'General question', hint: 'Ask us anything.' },
  { value: 'inquiry', label: 'New project', hint: 'Share scope, budget and timing.' },
];

type Status =
  | { readonly type: 'idle' }
  | { readonly type: 'success' }
  | { readonly type: 'error'; readonly message: string };

function newIdempotencyKey(): string {
  // randomUUID needs a secure context; the Server Action generates one otherwise.
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '';
}

export interface ContactFormProps {
  readonly action: SubmitLeadAction;
  readonly turnstileSiteKey: string;
  /**
   * The request kinds that are switched on in the feature settings, in display order.
   * With one kind the choice is hidden; the API refuses a disabled kind anyway.
   */
  readonly kinds?: readonly LeadFormValues['kind'][];
}

const ALL_KINDS: readonly LeadFormValues['kind'][] = ['contact', 'inquiry'];

export function ContactForm({ action, turnstileSiteKey, kinds = ALL_KINDS }: ContactFormProps) {
  const options = KIND_OPTIONS.filter((option) => kinds.includes(option.value));
  const defaultValues: LeadFormValues = { ...DEFAULT_VALUES, kind: options[0]?.value ?? 'contact' };
  const [status, setStatus] = useState<Status>({ type: 'idle' });
  const turnstileRef = useRef<TurnstileHandle>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Reused while the same payload is retried, so the API can de-duplicate it.
  const idempotencyRef = useRef<{ key: string; fingerprint: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<LeadFormValues, unknown, CreateLeadInput>({
    resolver: leadResolver,
    defaultValues,
    shouldUnregister: true,
    // RHF focuses by registration order, which React 19 ref callbacks reshuffle;
    // focusFirstInvalid() focuses in DOM (reading) order instead.
    shouldFocusError: false,
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const kind = useWatch({ control, name: 'kind' });

  // Fetch the schema chunk in the background so the first submit is instant.
  useEffect(() => {
    void loadLeadResolver();
  }, []);

  const onToken = useCallback(
    (token: string) => {
      setValue('turnstileToken', token, { shouldValidate: isSubmitted });
    },
    [setValue, isSubmitted],
  );
  const onTurnstileReset = useCallback(() => {
    setValue('turnstileToken', '');
  }, [setValue]);

  /** Moves focus to the first invalid control in reading order, after errors render. */
  const focusInvalid = () => {
    focusFirstInvalid(formRef.current);
  };

  const onSubmit = async (data: CreateLeadInput) => {
    setStatus({ type: 'idle' });
    const fingerprint = JSON.stringify({ ...data, turnstileToken: null });
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = { key: newIdempotencyKey(), fingerprint };
    }

    let result: SubmitLeadResult;
    try {
      result = await action(data, idempotencyRef.current.key);
    } catch {
      result = {
        ok: false,
        message: 'We could not reach the server. Check your connection and try again.',
      };
    }

    // Turnstile tokens are single-use.
    turnstileRef.current?.reset();
    setValue('turnstileToken', '');

    if (result.ok) {
      idempotencyRef.current = null;
      reset(defaultValues);
      setStatus({ type: 'success' });
      requestAnimationFrame(() => successRef.current?.focus());
      // Visual only: the success panel already announces it (role="status").
      toast({ title: 'Message sent', tone: 'success', announce: false });
      return;
    }

    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if (isFormField(field)) setError(field, { type: 'server', message });
    }
    focusInvalid();
    setStatus({ type: 'error', message: result.message });
    toast({
      title: 'Message not sent',
      description: result.message,
      tone: 'error',
      announce: false,
    });
  };

  if (status.type === 'success') {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border border-success/40 bg-surface p-8"
      >
        <h2 className="text-2xl font-semibold text-fg">Thanks, your message is on its way.</h2>
        <p className="mt-3 text-muted">We reply within one business day.</p>
        <Button
          variant="ghost"
          className="mt-6"
          onClick={() => {
            setStatus({ type: 'idle' });
          }}
        >
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form
      noValidate
      aria-label="Contact form"
      className="flex flex-col gap-6"
      ref={formRef}
      onSubmit={(event) => void handleSubmit(onSubmit, focusInvalid)(event)}
    >
      {options.length > 1 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-medium text-fg">What can we help with?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 has-checked:border-neon-cyan has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-neon-cyan"
              >
                <input
                  type="radio"
                  value={option.value}
                  className="mt-1 size-4 accent-neon-cyan focus-visible:outline-none"
                  {...register('kind')}
                />
                <span>
                  <span className="block font-medium text-fg">{option.label}</span>
                  <span className="block text-sm text-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" {...register('kind')} />
      )}
      <HoneypotField {...register('extraNote')} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="lead-name" label="Name" error={errors.name?.message} required>
          {(controlProps) => (
            <Input
              {...controlProps}
              autoComplete="name"
              maxLength={FIELD_LIMITS.nameMax}
              {...register('name')}
            />
          )}
        </Field>
        <Field id="lead-email" label="Email" error={errors.email?.message} required>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="email"
              autoComplete="email"
              inputMode="email"
              maxLength={FIELD_LIMITS.emailMax}
              {...register('email')}
            />
          )}
        </Field>
      </div>

      <Field id="lead-company" label="Company (optional)" error={errors.company?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            autoComplete="organization"
            maxLength={FIELD_LIMITS.companyMax}
            {...register('company')}
          />
        )}
      </Field>

      {kind === 'inquiry' ? (
        <div className="grid gap-6 sm:grid-cols-3">
          <Field id="lead-service" label="Service" error={errors.service?.message} required>
            {(controlProps) => (
              <Select {...controlProps} {...register('service')}>
                <option value="">Choose…</option>
                {SERVICE_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="lead-budget" label="Budget" error={errors.budget?.message} required>
            {(controlProps) => (
              <Select {...controlProps} {...register('budget')}>
                <option value="">Choose…</option>
                {BUDGET_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field id="lead-timeline" label="Timeline" error={errors.timeline?.message} required>
            {(controlProps) => (
              <Select {...controlProps} {...register('timeline')}>
                <option value="">Choose…</option>
                {TIMELINE_CHOICES.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      ) : null}

      <Field
        id="lead-message"
        label={kind === 'inquiry' ? 'About the project' : 'Message'}
        hint={`At least ${FIELD_LIMITS.messageMin.toString()} characters.`}
        error={errors.message?.message}
        required
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            rows={6}
            maxLength={FIELD_LIMITS.messageMax}
            {...register('message')}
          />
        )}
      </Field>

      <CheckboxField
        id="lead-consent"
        label="I agree that my details are used to answer this request, as described in the privacy policy."
        error={errors.consent?.message}
        {...register('consent')}
      />

      <div className="flex flex-col gap-2">
        <input type="hidden" {...register('turnstileToken')} />
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          action="contact"
          onToken={onToken}
          onReset={onTurnstileReset}
          className="min-h-[65px]"
        />
        {errors.turnstileToken?.message ? (
          <p id={fieldErrorId('lead-turnstile')} role="alert" className="text-sm text-danger">
            {errors.turnstileToken.message}
          </p>
        ) : null}
      </div>

      <div role="status" aria-live="polite" className="empty:hidden">
        {status.type === 'error' ? (
          <p className="rounded-lg border border-danger/50 bg-surface p-4 text-danger">
            {status.message}
          </p>
        ) : null}
      </div>

      <div>
        <Button type="submit" size="lg" disabled={isSubmitting} aria-disabled={isSubmitting}>
          {isSubmitting ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}

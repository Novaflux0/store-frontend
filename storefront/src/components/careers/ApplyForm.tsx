'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Button, CheckboxField, Field, Input, Textarea, fieldErrorId } from '@agency/ui';
import { FIELD_LIMITS } from '@agency/validation/constants';

import {
  APPLICATION_MESSAGES,
  type RequestCvUploadResult,
  type SubmitApplicationResult,
} from '@/app/(marketing)/careers/application-result';
import { HoneypotField } from '@/components/sections/HoneypotField';
import { Turnstile, type TurnstileHandle } from '@/components/sections/Turnstile';
import { ACTION_MESSAGES, type ActionFailure } from '@/lib/forms/action-result';
import { focusFirstInvalid } from '@/lib/forms/focus-first-invalid';
import { toast } from '@/lib/toast';

import {
  applicationResolver,
  loadApplicationResolver,
  type ApplicationFields,
  type ApplicationFormValues,
} from './application-resolver';
import { CV_ACCEPT, CV_MAX_MEBIBYTES, cvMimeType } from './cv-file';
import { UploadError, uploadFile } from './upload-file';

export type RequestCvUploadAction = (input: {
  purpose: 'cv';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  turnstileToken: string;
  extraNote?: string | undefined;
}) => Promise<RequestCvUploadResult>;

export type SubmitApplicationAction = (
  input: Record<string, unknown>,
  idempotencyKey: string,
) => Promise<SubmitApplicationResult>;

export interface ApplyFormProps {
  readonly jobSlug: string;
  readonly jobTitle: string;
  readonly turnstileSiteKey: string;
  readonly requestUpload: RequestCvUploadAction;
  readonly submitApplication: SubmitApplicationAction;
}

const DEFAULT_VALUES: ApplicationFormValues = {
  name: '',
  email: '',
  phone: '',
  portfolioUrl: '',
  coverLetter: '',
  consent: false,
  turnstileToken: '',
  extraNote: '',
  cv: null,
};

const FORM_FIELDS = new Set<string>(Object.keys(DEFAULT_VALUES));

function isFormField(field: string): field is keyof ApplicationFormValues {
  return FORM_FIELDS.has(field);
}

type Phase =
  | { readonly type: 'idle' }
  | { readonly type: 'requesting' }
  | { readonly type: 'uploading'; readonly percent: number }
  | { readonly type: 'verifying' }
  | { readonly type: 'submitting' }
  | { readonly type: 'success' };

const BUSY_LABELS: Readonly<Record<Exclude<Phase['type'], 'idle' | 'success'>, string>> = {
  requesting: 'Preparing the upload of your CV…',
  uploading: 'Uploading your CV…',
  verifying: 'CV uploaded. Complete the security check again to send your application.',
  submitting: 'Sending your application…',
};

const UPLOAD_MESSAGES = {
  cancelled: 'Upload cancelled. Your details are still here; send again when you are ready.',
  failed: 'The upload of your CV failed. Check your connection and try again.',
} as const;

function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : '';
}

/** Rejects with `UploadError('aborted')` when the signal aborts first. */
function untilAborted<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(new UploadError('aborted'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener('abort', onAbort);
    });
  });
}

/**
 * Careers application (plan I2-1, I2-3):
 * 1. validate in the browser (shared schema, lazily loaded; CV type and size);
 * 2. `requestUpload` Server Action -> presigned PUT URL (first Turnstile token);
 * 3. PUT the file straight to storage, with progress and cancel;
 * 4. reset Turnstile and wait for a fresh token;
 * 5. `submitApplication` Server Action with `cvFileId` (second token).
 * A 422/409 from step 5 means the upload is gone or used: the CV must be attached again.
 */
export function ApplyForm({
  jobSlug,
  jobTitle,
  turnstileSiteKey,
  requestUpload,
  submitApplication,
}: ApplyFormProps) {
  const [phase, setPhase] = useState<Phase>({ type: 'idle' });
  const [formError, setFormError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tokenWaiterRef = useRef<((token: string) => void) | null>(null);
  // The CV already in storage for this form, reused if only the submit step failed.
  const uploadedRef = useRef<{ file: File; fileId: string } | null>(null);
  const idempotencyRef = useRef<{ key: string; fingerprint: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitted },
  } = useForm<ApplicationFormValues, unknown, ApplicationFields>({
    resolver: applicationResolver,
    defaultValues: DEFAULT_VALUES,
    shouldFocusError: false,
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  useEffect(() => {
    void loadApplicationResolver();
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const onToken = useCallback(
    (token: string) => {
      setValue('turnstileToken', token, { shouldValidate: isSubmitted });
      tokenWaiterRef.current?.(token);
      tokenWaiterRef.current = null;
    },
    [setValue, isSubmitted],
  );
  const onTurnstileReset = useCallback(() => {
    setValue('turnstileToken', '');
  }, [setValue]);

  /** Tokens are single-use: reset the widget; the promise resolves with the next token. */
  const resetTurnstile = useCallback((): Promise<string> => {
    setValue('turnstileToken', '');
    const next = new Promise<string>((resolve) => {
      tokenWaiterRef.current = resolve;
    });
    turnstileRef.current?.reset();
    return next;
  }, [setValue]);

  const clearCv = () => {
    uploadedRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = '';
    setValue('cv', null);
  };

  const focusInvalid = () => {
    focusFirstInvalid(formRef.current);
  };

  /** Form-level error, inline (announced) and as a visual-only toast. */
  const showFormError = (message: string) => {
    setFormError(message);
    toast({ title: 'Application not sent', description: message, tone: 'error', announce: false });
  };

  const showFailure = (failure: ActionFailure) => {
    for (const [field, message] of Object.entries(failure.fieldErrors ?? {})) {
      if (isFormField(field)) setError(field, { type: 'server', message });
    }
    showFormError(failure.message);
    setPhase({ type: 'idle' });
    focusInvalid();
  };

  const onSubmit = async (data: ApplicationFields) => {
    setFormError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    // Whether the widget has been reset since the token in the form was spent.
    let turnstileReset = false;
    try {
      let fileId: string;
      let submitToken: string;
      const uploaded = uploadedRef.current;
      if (uploaded?.file === data.cv) {
        // Only the submit step failed last time: the CV is already in storage.
        fileId = uploaded.fileId;
        submitToken = data.turnstileToken;
      } else {
        uploadedRef.current = null;
        setPhase({ type: 'requesting' });
        const target = await untilAborted(
          requestUpload({
            purpose: 'cv',
            fileName: data.cv.name,
            mimeType: cvMimeType(data.cv),
            sizeBytes: data.cv.size,
            turnstileToken: data.turnstileToken,
            extraNote: data.extraNote,
          }),
          signal,
        );
        // The first token is spent either way; the second one is for the submit.
        const nextToken = resetTurnstile();
        turnstileReset = true;
        if (!target.ok) {
          showFailure(target);
          return;
        }

        setPhase({ type: 'uploading', percent: 0 });
        await uploadFile(target.upload, data.cv, {
          signal,
          onProgress: (fraction) => {
            setPhase({ type: 'uploading', percent: Math.round(fraction * 100) });
          },
        });
        uploadedRef.current = { file: data.cv, fileId: target.upload.fileId };
        fileId = target.upload.fileId;

        setPhase({ type: 'verifying' });
        submitToken = await untilAborted(nextToken, signal);
      }

      setPhase({ type: 'submitting' });
      const payload = {
        jobSlug,
        name: data.name,
        email: data.email,
        phone: data.phone,
        portfolioUrl: data.portfolioUrl,
        coverLetter: data.coverLetter,
        consent: data.consent,
        cvFileId: fileId,
        turnstileToken: submitToken,
        extraNote: data.extraNote,
      };
      const fingerprint = JSON.stringify({ ...payload, turnstileToken: null });
      if (idempotencyRef.current?.fingerprint !== fingerprint) {
        idempotencyRef.current = { key: newIdempotencyKey(), fingerprint };
      }
      let result: SubmitApplicationResult;
      try {
        result = await submitApplication(payload, idempotencyRef.current.key);
      } catch {
        result = { ok: false, message: ACTION_MESSAGES.network };
      }
      void resetTurnstile();

      if (result.ok) {
        idempotencyRef.current = null;
        uploadedRef.current = null;
        reset(DEFAULT_VALUES);
        setPhase({ type: 'success' });
        requestAnimationFrame(() => successRef.current?.focus());
        // Visual only: the success panel already announces it (role="status").
        toast({ title: 'Application sent', tone: 'success', announce: false });
        return;
      }
      if (result.reason === 'reattach-cv') {
        idempotencyRef.current = null;
        clearCv();
      }
      showFailure(result);
    } catch (error) {
      // An unused fresh token stays valid for the retry; only a spent one needs a reset.
      if (!turnstileReset) void resetTurnstile();
      setPhase({ type: 'idle' });
      if (error instanceof UploadError) {
        showFormError(
          error.kind === 'aborted' ? UPLOAD_MESSAGES.cancelled : UPLOAD_MESSAGES.failed,
        );
      } else {
        showFormError(ACTION_MESSAGES.network);
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  if (phase.type === 'success') {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border border-success/40 bg-surface p-8 outline-none"
      >
        <h3 className="text-2xl font-semibold text-fg">Thank you for applying</h3>
        <p className="mt-3 text-muted">
          We received your application for {jobTitle}. We&apos;ll be in touch after reviewing your
          CV.
        </p>
      </div>
    );
  }

  const busy = phase.type !== 'idle';
  const canCancel =
    phase.type === 'requesting' || phase.type === 'uploading' || phase.type === 'verifying';
  const { ref: registerCvRef, ...cvField } = register('cv');

  return (
    <form
      noValidate
      aria-label={`Apply for ${jobTitle}`}
      className="flex flex-col gap-6"
      ref={formRef}
      onSubmit={(event) => void handleSubmit(onSubmit, focusInvalid)(event)}
    >
      <fieldset disabled={busy} className="flex flex-col gap-6">
        <legend className="sr-only">Your details</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="apply-name" label="Name" error={errors.name?.message} required>
            {(controlProps) => (
              <Input
                {...controlProps}
                autoComplete="name"
                maxLength={FIELD_LIMITS.nameMax}
                {...register('name')}
              />
            )}
          </Field>
          <Field id="apply-email" label="Email" error={errors.email?.message} required>
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
          <Field id="apply-phone" label="Phone (optional)" error={errors.phone?.message}>
            {(controlProps) => (
              <Input
                {...controlProps}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                maxLength={FIELD_LIMITS.phoneMax}
                {...register('phone')}
              />
            )}
          </Field>
          <Field
            id="apply-portfolio"
            label="Portfolio or LinkedIn URL (optional)"
            hint="A full https:// link."
            error={errors.portfolioUrl?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="url"
                autoComplete="url"
                inputMode="url"
                maxLength={FIELD_LIMITS.urlMax}
                {...register('portfolioUrl')}
              />
            )}
          </Field>
        </div>

        <Field
          id="apply-cv"
          label="CV"
          hint={`PDF or Word (.docx), up to ${CV_MAX_MEBIBYTES.toString()} MB.`}
          error={errors.cv?.message}
          required
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="file"
              accept={CV_ACCEPT}
              className="file:mr-4 file:rounded-full file:border-0 file:bg-surface-raised file:px-4 file:py-2 file:text-sm file:text-fg"
              {...cvField}
              ref={(element) => {
                fileInputRef.current = element;
                registerCvRef(element);
              }}
            />
          )}
        </Field>

        <Field
          id="apply-cover-letter"
          label="Cover letter (optional)"
          error={errors.coverLetter?.message}
        >
          {(controlProps) => (
            <Textarea
              {...controlProps}
              rows={6}
              maxLength={FIELD_LIMITS.coverLetterMax}
              {...register('coverLetter')}
            />
          )}
        </Field>

        <CheckboxField
          id="apply-consent"
          label="I agree that my details and CV are used to assess my application, as described in the privacy policy."
          error={errors.consent?.message}
          {...register('consent')}
        />
      </fieldset>

      <div className="flex flex-col gap-2">
        <input type="hidden" {...register('turnstileToken')} />
        <HoneypotField {...register('extraNote')} />
        <Turnstile
          ref={turnstileRef}
          siteKey={turnstileSiteKey}
          action="careers"
          onToken={onToken}
          onReset={onTurnstileReset}
          className="min-h-[65px]"
        />
        {errors.turnstileToken?.message ? (
          <p id={fieldErrorId('apply-turnstile')} role="alert" className="text-sm text-danger">
            {errors.turnstileToken.message}
          </p>
        ) : null}
      </div>

      {phase.type === 'uploading' ? (
        <div className="flex flex-col gap-2">
          <p id="apply-progress-label" className="text-sm text-fg">
            Uploading your CV
          </p>
          <div
            role="progressbar"
            aria-labelledby="apply-progress-label"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={phase.percent}
            aria-valuetext={`${phase.percent.toString()}% uploaded`}
            className="h-2 overflow-hidden rounded-full bg-surface-raised"
          >
            <div
              className="h-full origin-left bg-neon-cyan transition-transform duration-200"
              style={{ transform: `scaleX(${(phase.percent / 100).toString()})` }}
            />
          </div>
        </div>
      ) : null}

      <div role="status" aria-live="polite" className="text-sm text-muted empty:hidden">
        {busy ? <p>{BUSY_LABELS[phase.type]}</p> : null}
      </div>
      <div role="alert" className="empty:hidden">
        {formError ? (
          <p className="rounded-lg border border-danger/50 bg-surface p-4 text-danger">
            {formError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4">
        <Button type="submit" size="lg" disabled={busy} aria-disabled={busy}>
          {busy ? 'Sending…' : 'Send application'}
        </Button>
        {canCancel ? (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              abortRef.current?.abort();
            }}
          >
            Cancel
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted">
        Fields marked with an asterisk (*) are required. {APPLICATION_MESSAGES.privacyNote}
      </p>
    </form>
  );
}

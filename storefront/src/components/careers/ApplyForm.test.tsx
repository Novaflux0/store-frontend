import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MIME_TYPES } from '@agency/validation/constants';

import { ApplyForm, type RequestCvUploadAction, type SubmitApplicationAction } from './ApplyForm';
import type * as UploadModule from './upload-file';
import type { UploadOptions, UploadTarget } from './upload-file';

// Turnstile double: a click issues the first token; reset() issues a fresh one, like
// the managed widget re-solving after a reset.
const turnstile = vi.hoisted(() => ({
  onToken: undefined as ((token: string) => void) | undefined,
  resets: 0,
}));
vi.mock('@/components/sections/Turnstile', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    Turnstile: ({
      onToken,
      ref,
    }: {
      onToken: (token: string) => void;
      ref?: React.Ref<{ reset(): void }>;
    }) => {
      turnstile.onToken = onToken;
      useImperativeHandle(
        ref,
        () => ({
          reset() {
            turnstile.resets += 1;
            const token = `fresh-token-${turnstile.resets.toString()}`;
            setTimeout(() => turnstile.onToken?.(token), 0);
          },
        }),
        [],
      );
      return (
        <button
          type="button"
          onClick={() => {
            onToken('first-token');
          }}
        >
          Verify you are human
        </button>
      );
    },
  };
});

type UploadFn = (target: UploadTarget, file: Blob, options?: UploadOptions) => Promise<void>;
const uploadFile = vi.hoisted(() => vi.fn<UploadFn>());
vi.mock('./upload-file', async (importOriginal) => ({
  ...(await importOriginal<typeof UploadModule>()),
  uploadFile,
}));

const FILE_ID = '01890a5d-ac96-774b-bcce-b302099a8057';
const TARGET = {
  fileId: FILE_ID,
  uploadUrl: 'http://localhost:9000/quarantine/key?sig=1',
  headers: { 'Content-Type': MIME_TYPES.pdf },
  expiresAt: '2026-10-21T12:05:00.000Z',
};

function pdf(name = 'ada-cv.pdf', size = 2048): File {
  const file = new File(['%PDF-1.7'], name, { type: MIME_TYPES.pdf });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function setup({
  requestUpload = vi.fn<RequestCvUploadAction>().mockResolvedValue({ ok: true, upload: TARGET }),
  submitApplication = vi.fn<SubmitApplicationAction>().mockResolvedValue({ ok: true }),
  applyAccept = true,
}: {
  requestUpload?: ReturnType<typeof vi.fn<RequestCvUploadAction>>;
  submitApplication?: ReturnType<typeof vi.fn<SubmitApplicationAction>>;
  applyAccept?: boolean;
} = {}) {
  const user = userEvent.setup({ applyAccept });
  render(
    <ApplyForm
      jobSlug="senior-frontend-engineer"
      jobTitle="Senior Frontend Engineer"
      turnstileSiteKey="1x00000000000000000000AA"
      requestUpload={requestUpload}
      submitApplication={submitApplication}
    />,
  );
  return { user, requestUpload, submitApplication };
}

async function fill(user: ReturnType<typeof userEvent.setup>, file: File = pdf()) {
  await user.type(screen.getByLabelText(/^Name/), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/^Email/), 'ada@example.com');
  await user.type(screen.getByLabelText(/^Portfolio/), 'https://ada.dev');
  await user.upload(screen.getByLabelText(/^CV/), file);
  await user.click(screen.getByRole('checkbox', { name: /I agree/ }));
  await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
}

beforeEach(() => {
  turnstile.resets = 0;
  turnstile.onToken = undefined;
  uploadFile.mockReset();
  uploadFile.mockResolvedValue(undefined);
});

describe('ApplyForm', () => {
  it('validates in the browser and calls nothing on errors', async () => {
    const { user, requestUpload } = setup();
    await user.click(screen.getByRole('button', { name: 'Send application' }));

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Attach your CV.')).toBeInTheDocument();
    expect(screen.getByText('You must agree before submitting.')).toBeInTheDocument();
    expect(screen.getByText('Complete the security check.')).toHaveAttribute('role', 'alert');
    const cv = screen.getByLabelText(/^CV/);
    expect(cv).toHaveAttribute('aria-invalid', 'true');
    expect(cv).toHaveAccessibleDescription(
      /PDF or Word \(\.docx\), up to 10 MB\. Attach your CV\./,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toHaveFocus();
    });
    expect(requestUpload).not.toHaveBeenCalled();
  });

  it('rejects a CV with the wrong type or size before requesting an upload', async () => {
    const { user, requestUpload } = setup({ applyAccept: false });
    await fill(user, new File(['hello'], 'cv.txt', { type: 'text/plain' }));
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    expect(await screen.findByText(/Attach your CV as a PDF or Word/)).toBeInTheDocument();

    await user.upload(screen.getByLabelText(/^CV/), pdf('big.pdf', 11 * 1024 * 1024));
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    expect(await screen.findByText(/This file is too large/)).toBeInTheDocument();
    expect(requestUpload).not.toHaveBeenCalled();
  });

  it('requests an upload URL, PUTs the file with progress, re-verifies, then submits', async () => {
    let finishUpload: () => void = () => undefined;
    let reportProgress: (fraction: number) => void = () => undefined;
    uploadFile.mockImplementation(
      (_target, _file, options) =>
        new Promise<void>((resolve) => {
          reportProgress = options?.onProgress ?? reportProgress;
          finishUpload = resolve;
        }),
    );
    const { user, requestUpload, submitApplication } = setup();
    const cv = pdf();
    await fill(user, cv);
    await user.click(screen.getByRole('button', { name: 'Send application' }));

    // Step 2: upload URL with the first token.
    await waitFor(() => {
      expect(requestUpload).toHaveBeenCalledExactlyOnceWith({
        purpose: 'cv',
        fileName: 'ada-cv.pdf',
        mimeType: MIME_TYPES.pdf,
        sizeBytes: 2048,
        turnstileToken: 'first-token',
        extraNote: '',
      });
    });

    // Step 3: PUT with progress, announced through an accessible progressbar.
    await waitFor(() => {
      expect(uploadFile).toHaveBeenCalledTimes(1);
    });
    expect(uploadFile.mock.calls[0]?.[0]).toEqual(TARGET);
    expect(uploadFile.mock.calls[0]?.[1]).toBe(cv);
    reportProgress(0.42);
    const progress = await screen.findByRole('progressbar', { name: 'Uploading your CV' });
    await waitFor(() => {
      expect(progress).toHaveAttribute('aria-valuenow', '42');
    });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuetext', '42% uploaded');
    expect(screen.getByRole('status')).toHaveTextContent('Uploading your CV…');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    finishUpload();

    // Steps 4–5: the widget was reset and the fresh token is used for the submit.
    await waitFor(() => {
      expect(submitApplication).toHaveBeenCalledTimes(1);
    });
    const [payload, key] = submitApplication.mock.calls[0]!;
    expect(payload).toEqual({
      jobSlug: 'senior-frontend-engineer',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '',
      portfolioUrl: 'https://ada.dev',
      coverLetter: '',
      consent: true,
      cvFileId: FILE_ID,
      turnstileToken: 'fresh-token-1',
      extraNote: '',
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);

    // Step 6.
    const success = await screen.findByRole('heading', { name: 'Thank you for applying' });
    expect(success.parentElement).toHaveTextContent("We'll be in touch after reviewing your CV.");
  });

  it('asks for the CV again on 422/409 and uploads anew next time', async () => {
    const submitApplication = vi
      .fn<SubmitApplicationAction>()
      .mockResolvedValueOnce({
        ok: false,
        reason: 'reattach-cv',
        message: 'Please attach your CV again. Your upload expired or could not be found.',
        fieldErrors: {
          cv: 'Please attach your CV again. Your upload expired or could not be found.',
        },
      })
      .mockResolvedValueOnce({ ok: true });
    const { user, requestUpload } = setup({ submitApplication });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send application' }));

    const alert = await screen.findByRole('alert');
    await waitFor(() => {
      expect(alert).toHaveTextContent('Please attach your CV again.');
    });
    const cvInput = screen.getByLabelText<HTMLInputElement>(/^CV/);
    expect(cvInput).toHaveAttribute('aria-invalid', 'true');
    expect(cvInput.value).toBe('');
    await waitFor(() => {
      expect(cvInput).toHaveFocus();
    });

    await user.upload(cvInput, pdf('new-cv.pdf'));
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    expect(
      await screen.findByRole('heading', { name: 'Thank you for applying' }),
    ).toBeInTheDocument();
    expect(requestUpload).toHaveBeenCalledTimes(2);
    expect(uploadFile).toHaveBeenCalledTimes(2);
    expect(requestUpload.mock.calls[1]?.[0].fileName).toBe('new-cv.pdf');
  });

  it('reuses the stored CV when only the submit failed, with the same idempotency key', async () => {
    const submitApplication = vi
      .fn<SubmitApplicationAction>()
      .mockResolvedValueOnce({ ok: false, message: 'This service is temporarily unavailable.' })
      .mockResolvedValueOnce({ ok: true });
    const { user, requestUpload } = setup({ submitApplication });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    expect(await screen.findByText('This service is temporarily unavailable.')).toBeInTheDocument();

    // The widget re-issued a token after the failed submit.
    await waitFor(() => {
      expect(turnstile.resets).toBe(2);
    });
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    expect(
      await screen.findByRole('heading', { name: 'Thank you for applying' }),
    ).toBeInTheDocument();
    expect(requestUpload).toHaveBeenCalledTimes(1);
    expect(uploadFile).toHaveBeenCalledTimes(1);
    const [first, second] = submitApplication.mock.calls;
    expect(second?.[1]).toBe(first?.[1]);
    expect(second?.[0]).toMatchObject({ cvFileId: FILE_ID, turnstileToken: 'fresh-token-2' });
  });

  it('maps upload-url errors to the CV and security-check fields', async () => {
    const requestUpload = vi.fn<RequestCvUploadAction>().mockResolvedValue({
      ok: false,
      message: 'Please check the highlighted fields and try again.',
      fieldErrors: { cv: 'File is too large (maximum 10 MB).' },
    });
    const { user, submitApplication } = setup({ requestUpload });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send application' }));

    expect(await screen.findByText('File is too large (maximum 10 MB).')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Please check the highlighted fields');
    expect(uploadFile).not.toHaveBeenCalled();
    expect(submitApplication).not.toHaveBeenCalled();
    expect(turnstile.resets).toBe(1);
  });

  it('reports a failed upload and lets the visitor cancel one', async () => {
    const { UploadError } = await import('./upload-file');
    uploadFile.mockRejectedValueOnce(new UploadError('network'));
    uploadFile.mockImplementationOnce(
      (_target, _file, options) =>
        new Promise<void>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new UploadError('aborted'));
          });
        }),
    );
    const { user, submitApplication } = setup();
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    expect(await screen.findByText(/The upload of your CV failed/)).toBeInTheDocument();

    await waitFor(() => {
      expect(turnstile.resets).toBe(1);
    });
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText(/Upload cancelled/)).toBeInTheDocument();
    expect(submitApplication).not.toHaveBeenCalled();
    // The form is usable again.
    expect(screen.getByLabelText(/^Name/)).toBeEnabled();
  });

  it('shows a network message when a Server Action cannot be reached', async () => {
    const submitApplication = vi
      .fn<SubmitApplicationAction>()
      .mockRejectedValue(new Error('fetch failed'));
    const requestUpload = vi
      .fn<RequestCvUploadAction>()
      .mockResolvedValueOnce({ ok: true, upload: TARGET })
      .mockRejectedValueOnce(new Error('fetch failed'));
    const { user } = setup({ submitApplication, requestUpload });
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    const form = screen.getByRole('form', { name: 'Apply for Senior Frontend Engineer' });
    expect(await within(form).findByText(/could not reach the server/)).toBeInTheDocument();

    await user.upload(screen.getByLabelText(/^CV/), pdf('other.pdf'));
    await user.click(screen.getByRole('button', { name: 'Send application' }));
    await waitFor(() => {
      expect(requestUpload).toHaveBeenCalledTimes(2);
    });
    expect(await within(form).findByText(/could not reach the server/)).toBeInTheDocument();
  });
});

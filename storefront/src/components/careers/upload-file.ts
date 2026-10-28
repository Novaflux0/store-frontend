/**
 * Uploads a file straight to object storage with a presigned PUT URL (plan I2-3).
 * XMLHttpRequest instead of fetch because only XHR reports upload progress.
 */

export type UploadErrorKind = 'aborted' | 'network' | 'http' | 'timeout';

export class UploadError extends Error {
  override readonly name = 'UploadError';

  constructor(
    readonly kind: UploadErrorKind,
    readonly status = 0,
  ) {
    super(`Upload failed: ${kind}${status ? ` ${status.toString()}` : ''}`);
  }
}

export interface UploadTarget {
  readonly uploadUrl: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface UploadOptions {
  /** Called with the fraction uploaded, 0 to 1. */
  readonly onProgress?: (fraction: number) => void;
  /** Aborting rejects with `UploadError('aborted')`. */
  readonly signal?: AbortSignal;
  /** Gives up on a stalled upload; the presigned URL lives 5 minutes anyway. */
  readonly timeoutMs?: number;
}

/**
 * Headers the browser computes itself and refuses to set from script, e.g.
 * `Content-Length` (signed by the API, sent by the browser from the body size).
 */
const BROWSER_CONTROLLED = new Set([
  'accept-charset',
  'accept-encoding',
  'connection',
  'content-length',
  'cookie',
  'date',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

export function uploadFile(
  target: UploadTarget,
  file: Blob,
  { onProgress, signal, timeoutMs = DEFAULT_TIMEOUT_MS }: UploadOptions = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new UploadError('aborted'));
      return;
    }
    const xhr = new XMLHttpRequest();
    const onAbortSignal = () => {
      xhr.abort();
    };
    const settle = (callback: () => void) => {
      signal?.removeEventListener('abort', onAbortSignal);
      callback();
    };

    xhr.open('PUT', target.uploadUrl);
    xhr.timeout = timeoutMs;
    for (const [name, value] of Object.entries(target.headers)) {
      if (!BROWSER_CONTROLLED.has(name.toLowerCase())) xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      settle(() => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(1);
          resolve();
        } else {
          reject(new UploadError('http', xhr.status));
        }
      });
    };
    xhr.onerror = () => {
      settle(() => {
        reject(new UploadError('network'));
      });
    };
    xhr.ontimeout = () => {
      settle(() => {
        reject(new UploadError('timeout'));
      });
    };
    xhr.onabort = () => {
      settle(() => {
        reject(new UploadError('aborted'));
      });
    };
    signal?.addEventListener('abort', onAbortSignal, { once: true });
    xhr.send(file);
  });
}

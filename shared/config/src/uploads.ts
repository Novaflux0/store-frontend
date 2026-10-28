const BYTES_PER_MEBIBYTE = 1024 * 1024;

/** Why a file is uploaded; each purpose has its own size and type policy. */
export const UPLOAD_PURPOSES = ['cv', 'project', 'media'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/**
 * Maximum upload size per purpose (plan finding A20). The presigned R2 URL is
 * signed with this content-length cap, and the API re-checks the stored object.
 * Allowed MIME types live next to the schemas in @agency/validation.
 */
export const UPLOAD_LIMITS = {
  /** Careers CVs from anonymous visitors: kept small to limit abuse. */
  cv: { maxBytes: 10 * BYTES_PER_MEBIBYTE },
  /** Client project files in the portal. */
  project: { maxBytes: 100 * BYTES_PER_MEBIBYTE },
  /** Images for the CMS media library, uploaded by staff (ADR 0017). */
  media: { maxBytes: 15 * BYTES_PER_MEBIBYTE },
} as const satisfies Record<UploadPurpose, { readonly maxBytes: number }>;

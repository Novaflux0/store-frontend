const MAX_FRAMES = 10;

/**
 * Moves focus to the first invalid control (`aria-invalid="true"`) inside `container`,
 * in reading order. Errors render asynchronously after validation, so it retries for a
 * few animation frames until one exists instead of relying on render timing.
 */
export function focusFirstInvalid(container: HTMLElement | null): void {
  let frames = 0;
  const attempt = () => {
    const invalid = container?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (invalid) invalid.focus();
    else if (++frames < MAX_FRAMES) requestAnimationFrame(attempt);
  };
  requestAnimationFrame(attempt);
}

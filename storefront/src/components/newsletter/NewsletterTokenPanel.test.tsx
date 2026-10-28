import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  NewsletterTokenPanel,
  readTokenFromHash,
  type NewsletterTokenAction,
  type NewsletterTokenMode,
} from './NewsletterTokenPanel';

const TOKEN = 'abcDEF123_-'.padEnd(43, 'x');

function setup(mode: NewsletterTokenMode, hash: string, action = vi.fn<NewsletterTokenAction>()) {
  window.history.replaceState(null, '', `/newsletter/${mode}${hash}`);
  const replaceState = vi.spyOn(window.history, 'replaceState');
  const user = userEvent.setup();
  render(<NewsletterTokenPanel mode={mode} action={action} contactEmail="hello@agency.com" />);
  return { user, action, replaceState };
}

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('readTokenFromHash', () => {
  it('accepts a 43-character base64url token', () => {
    expect(readTokenFromHash(`#token=${TOKEN}`)).toBe(TOKEN);
    expect(readTokenFromHash(`token=${TOKEN}`)).toBe(TOKEN);
    expect(readTokenFromHash(`#utm=x&token=${TOKEN}`)).toBe(TOKEN);
  });

  it.each([
    ['empty', ''],
    ['no token', '#foo=bar'],
    ['too short', `#token=${TOKEN.slice(1)}`],
    ['too long', `#token=${TOKEN}x`],
    ['not base64url', `#token=${TOKEN.slice(1)}+`],
  ])('rejects %s', (_label, hash) => {
    expect(readTokenFromHash(hash)).toBeNull();
  });
});

describe('NewsletterTokenPanel', () => {
  it('reads the token, clears the fragment and posts only on click', async () => {
    const action = vi.fn<NewsletterTokenAction>().mockResolvedValue({ ok: true });
    const { user, replaceState } = setup('confirm', `#token=${TOKEN}`, action);

    const button = await screen.findByRole('button', { name: 'Confirm subscription' });
    expect(replaceState).toHaveBeenCalledWith(null, '', '/newsletter/confirm');
    expect(window.location.hash).toBe('');
    expect(action).not.toHaveBeenCalled();

    await user.click(button);
    expect(action).toHaveBeenCalledExactlyOnceWith(TOKEN);
    expect(
      await screen.findByRole('heading', { name: 'You are subscribed. Thanks for confirming!' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm subscription' })).not.toBeInTheDocument();
  });

  it('unsubscribes on click', async () => {
    const action = vi.fn<NewsletterTokenAction>().mockResolvedValue({ ok: true });
    const { user } = setup('unsubscribe', `#token=${TOKEN}`, action);
    await user.click(await screen.findByRole('button', { name: 'Unsubscribe' }));
    expect(
      await screen.findByRole('heading', { name: 'You have been unsubscribed.' }),
    ).toBeInTheDocument();
  });

  it('shows the invalid message for a missing or malformed token, without a button', async () => {
    const action = vi.fn<NewsletterTokenAction>();
    const { replaceState } = setup('confirm', '#token=short', action);
    expect(
      await screen.findByRole('heading', { name: 'This link is invalid or has expired' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(replaceState).toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it('shows the invalid message when the API rejects the token', async () => {
    const action = vi.fn<NewsletterTokenAction>().mockResolvedValue({
      ok: false,
      reason: 'invalid',
      message: 'This link is invalid or has expired.',
    });
    const { user } = setup('unsubscribe', `#token=${TOKEN}`, action);
    await user.click(await screen.findByRole('button', { name: 'Unsubscribe' }));
    expect(
      await screen.findByRole('heading', { name: 'This link is invalid or has expired' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'hello@agency.com' })).toHaveAttribute(
      'href',
      'mailto:hello@agency.com',
    );
  });

  it('keeps the button for a retry after a temporary failure', async () => {
    const action = vi
      .fn<NewsletterTokenAction>()
      .mockResolvedValueOnce({ ok: false, reason: 'retry', message: 'Too many requests.' })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true });
    const { user } = setup('confirm', `#token=${TOKEN}`, action);

    await user.click(await screen.findByRole('button', { name: 'Confirm subscription' }));
    expect(await screen.findByText('Too many requests.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm subscription' }));
    expect(await screen.findByText(/could not reach the server/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm subscription' }));
    expect(await screen.findByRole('heading', { name: /You are subscribed/ })).toBeInTheDocument();
    expect(action).toHaveBeenCalledTimes(3);
  });
});

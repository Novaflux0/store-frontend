import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NewsletterForm, type SubscribeNewsletterAction } from './NewsletterForm';

const turnstile = vi.hoisted(() => ({ rendered: 0, reset: vi.fn() }));
vi.mock('@/components/sections/Turnstile', async () => {
  const { useEffect, useImperativeHandle } = await import('react');
  return {
    Turnstile: ({
      onToken,
      ref,
    }: {
      onToken: (token: string) => void;
      ref?: React.Ref<{ reset(): void }>;
    }) => {
      useImperativeHandle(ref, () => ({ reset: turnstile.reset }), []);
      useEffect(() => {
        turnstile.rendered += 1;
      }, []);
      return (
        <button
          type="button"
          onClick={() => {
            onToken('turnstile-token');
          }}
        >
          Verify you are human
        </button>
      );
    },
  };
});

function setup(action = vi.fn<SubscribeNewsletterAction>()) {
  const user = userEvent.setup();
  render(<NewsletterForm action={action} turnstileSiteKey="1x00000000000000000000AA" />);
  return { user, action };
}

beforeEach(() => {
  turnstile.rendered = 0;
  turnstile.reset.mockReset();
});

describe('NewsletterForm', () => {
  it('does not load Turnstile until the visitor interacts with the form', async () => {
    const { user } = setup();
    expect(screen.queryByRole('button', { name: 'Verify you are human' })).not.toBeInTheDocument();
    expect(turnstile.rendered).toBe(0);

    await user.click(screen.getByLabelText('Email'));
    expect(screen.getByRole('button', { name: 'Verify you are human' })).toBeInTheDocument();
    expect(turnstile.rendered).toBe(1);
  });

  it('also arms Turnstile on keyboard focus', async () => {
    const { user } = setup();
    await user.tab();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Verify you are human' })).toBeInTheDocument();
  });

  it('validates the email and the security check before calling the action', async () => {
    const { user, action } = setup();
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription(/Enter a valid email address\./);
    expect(email).toHaveFocus();
    expect(screen.getByRole('alert')).toHaveTextContent('Complete the security check.');
    expect(action).not.toHaveBeenCalled();
  });

  it('subscribes and shows the same confirmation copy for every address', async () => {
    const action = vi.fn<SubscribeNewsletterAction>().mockResolvedValue({ ok: true });
    const { user } = setup(action);
    await user.type(screen.getByLabelText('Email'), ' ada@example.com ');
    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Check your inbox to confirm your subscription.',
    );
    expect(screen.queryByText(/already subscribed/i)).not.toBeInTheDocument();
    const [input, key] = action.mock.calls[0]!;
    expect(input).toEqual({
      email: 'ada@example.com',
      turnstileToken: 'turnstile-token',
      extraNote: '',
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(turnstile.reset).toHaveBeenCalledTimes(1);
  });

  it('reuses the idempotency key when the same address is retried', async () => {
    const action = vi
      .fn<SubscribeNewsletterAction>()
      .mockResolvedValueOnce({ ok: false, message: 'Too many requests, try again later.' })
      .mockResolvedValueOnce({ ok: true });
    const { user } = setup(action);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(await screen.findByText('Too many requests, try again later.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(2);
    });
    expect(action.mock.calls[1]![1]).toBe(action.mock.calls[0]![1]);
  });

  it('shows server field errors and a network failure', async () => {
    const action = vi
      .fn<SubscribeNewsletterAction>()
      .mockResolvedValueOnce({
        ok: false,
        message: 'Please check the highlighted fields and try again.',
        fieldErrors: { email: 'Enter a valid email address.' },
      })
      .mockRejectedValueOnce(new Error('offline'));
    const { user } = setup(action);
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await act(async () => {
      await user.click(screen.getByRole('button', { name: 'Subscribe' }));
    });
    expect(await screen.findByText(/could not reach the server/)).toBeInTheDocument();
  });
});

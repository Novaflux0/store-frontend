import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactForm, type SubmitLeadAction } from './ContactForm';

// The real widget loads a Cloudflare script; the mock hands out a token on click.
const turnstileReset = vi.hoisted(() => vi.fn());
vi.mock('./Turnstile', async () => {
  const { useImperativeHandle } = await import('react');
  return {
    Turnstile: ({
      onToken,
      ref,
    }: {
      onToken: (token: string) => void;
      ref?: React.Ref<{ reset(): void }>;
    }) => {
      useImperativeHandle(ref, () => ({ reset: turnstileReset }), []);
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

function setup(action: SubmitLeadAction = vi.fn<SubmitLeadAction>()) {
  const user = userEvent.setup();
  render(<ContactForm action={action} turnstileSiteKey="1x00000000000000000000AA" />);
  return { user, action };
}

async function fillContact(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Name/), 'Ada Lovelace');
  await user.type(screen.getByLabelText(/^Email/), 'ada@example.com');
  await user.type(screen.getByLabelText(/^Message/), 'I would like to build a 3D site.');
  await user.click(screen.getByRole('checkbox', { name: /I agree/ }));
  await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
}

beforeEach(() => {
  turnstileReset.mockReset();
});

describe('ContactForm', () => {
  it('shows the shared schema messages and marks fields invalid', async () => {
    const { user, action } = setup();

    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText(/Tell us a bit more/)).toBeInTheDocument();
    expect(screen.getByText('You must agree before submitting.')).toBeInTheDocument();
    expect(screen.getByText('Complete the security check.')).toBeInTheDocument();

    const name = screen.getByLabelText(/^Name/);
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Enter your name.');
    // Focus moves to the first invalid field in reading order.
    await waitFor(() => {
      expect(name).toHaveFocus();
    });
    expect(action).not.toHaveBeenCalled();
  });

  it('shows service, budget and timeline only for project inquiries', async () => {
    const { user } = setup();
    expect(screen.queryByLabelText(/^Service/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /New project/ }));
    expect(screen.getByRole('combobox', { name: /Service/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Budget/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /Timeline/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '3D web experiences' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Choose a service.')).toBeInTheDocument();
    expect(screen.getByText('Choose a budget range.')).toBeInTheDocument();
    expect(screen.getByText('Choose a timeline.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /General question/ }));
    expect(screen.queryByLabelText(/^Service/)).not.toBeInTheDocument();
  });

  it('submits a valid contact lead with an idempotency key and shows success', async () => {
    const action = vi.fn<SubmitLeadAction>().mockResolvedValue({ ok: true });
    const { user } = setup(action);

    await fillContact(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    const [payload, key] = action.mock.calls[0]!;
    expect(payload).toEqual({
      kind: 'contact',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      company: '',
      message: 'I would like to build a 3D site.',
      consent: true,
      turnstileToken: 'turnstile-token',
      // The honeypot travels along empty; a filled one gets the sender banned.
      extraNote: '',
    });
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(await screen.findByRole('status')).toHaveTextContent('your message is on its way');
    expect(turnstileReset).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Send another message' }));
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
  });

  it('submits an inquiry with the selected options', async () => {
    const action = vi.fn<SubmitLeadAction>().mockResolvedValue({ ok: true });
    const { user } = setup(action);

    await user.click(screen.getByRole('radio', { name: /New project/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: /Service/ }), '3d-experiences');
    await user.selectOptions(screen.getByRole('combobox', { name: /Budget/ }), '15k-50k');
    await user.selectOptions(screen.getByRole('combobox', { name: /Timeline/ }), 'flexible');
    await user.type(screen.getByLabelText(/^Name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/^Email/), 'ada@example.com');
    await user.type(screen.getByLabelText(/^About the project/), 'A configurator for our launch.');
    await user.click(screen.getByRole('checkbox', { name: /I agree/ }));
    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    expect(action.mock.calls[0]![0]).toMatchObject({
      kind: 'inquiry',
      service: '3d-experiences',
      budget: '15k-50k',
      timeline: 'flexible',
    });
  });

  it('shows server field errors and the status message, reusing the key on retry', async () => {
    const action = vi
      .fn<SubmitLeadAction>()
      .mockResolvedValueOnce({
        ok: false,
        message: 'Please check the highlighted fields and try again.',
        fieldErrors: { email: 'This address cannot receive mail.', unknownField: 'ignored' },
      })
      .mockResolvedValueOnce({ ok: false, message: 'Too many requests, try again later.' });
    const { user } = setup(action);

    await fillContact(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('This address cannot receive mail.')).toBeInTheDocument();
    expect(
      screen.getByText('Please check the highlighted fields and try again.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Verify you are human' }));
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Too many requests, try again later.')).toBeInTheDocument();
    expect(action.mock.calls[1]![1]).toBe(action.mock.calls[0]![1]);
  });

  it('handles a failed Server Action call', async () => {
    const action = vi.fn<SubmitLeadAction>().mockRejectedValue(new Error('network'));
    const { user } = setup(action);
    await fillContact(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText(/could not reach the server/)).toBeInTheDocument();
  });
});

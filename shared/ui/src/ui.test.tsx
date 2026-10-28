import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Button,
  ButtonLink,
  CheckboxField,
  Container,
  Field,
  Input,
  Select,
  Textarea,
  VisuallyHidden,
  buttonClassName,
  cx,
} from './index.js';

describe('cx', () => {
  it('joins truthy class names only', () => {
    expect(cx('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('Button', () => {
  it('defaults to type="button" and the primary variant', () => {
    render(<Button>Send</Button>);
    const button = screen.getByRole('button', { name: 'Send' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button.className).toContain('bg-neon-cyan');
  });

  it('accepts submit type, ghost variant and large size', () => {
    render(
      <Button type="submit" variant="ghost" size="lg" className="extra">
        Go
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toHaveAttribute('type', 'submit');
    expect(button.className).toContain('border-border');
    expect(button.className).toContain('min-h-12');
    expect(button.className).toContain('extra');
  });

  it('exposes the class builder for framework links', () => {
    expect(buttonClassName()).toContain('bg-neon-cyan');
    expect(buttonClassName({ variant: 'ghost' })).toContain('border');
  });

  it('renders a button-styled anchor', () => {
    render(
      <ButtonLink href="/contact" variant="ghost">
        Contact
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Contact' });
    expect(link).toHaveAttribute('href', '/contact');
    expect(link.className).toContain('rounded-full');
  });
});

describe('Container', () => {
  it('renders a div by default and the requested element otherwise', () => {
    const { container, rerender } = render(<Container>x</Container>);
    expect(container.firstElementChild?.tagName).toBe('DIV');
    rerender(
      <Container as="section" aria-label="Intro">
        x
      </Container>,
    );
    expect(screen.getByRole('region', { name: 'Intro' })).toBeInTheDocument();
  });
});

describe('VisuallyHidden', () => {
  it('keeps text in the accessibility tree', () => {
    render(
      <button type="button">
        <VisuallyHidden>Close menu</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
  });
});

describe('Field', () => {
  it('links label, hint and error to the control', () => {
    render(
      <Field
        id="email"
        label="Email"
        hint="We reply within a day."
        error="Enter an email."
        required
      >
        {(control) => <Input type="email" {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint email-error');
    expect(input).toHaveAccessibleDescription('We reply within a day. Enter an email.');
  });

  it('omits ARIA error wiring when valid', () => {
    render(
      <Field id="message" label="Message">
        {(control) => <Textarea {...control} />}
      </Field>,
    );
    const textarea = screen.getByRole('textbox', { name: 'Message' });
    expect(textarea).not.toHaveAttribute('aria-invalid');
    expect(textarea).not.toHaveAttribute('aria-describedby');
  });

  it('works with a select', () => {
    render(
      <Field id="budget" label="Budget">
        {(control) => (
          <Select {...control}>
            <option value="a">A</option>
          </Select>
        )}
      </Field>,
    );
    expect(screen.getByRole('combobox', { name: 'Budget' })).toBeInTheDocument();
  });
});

describe('CheckboxField', () => {
  it('labels the checkbox and announces the error', () => {
    render(<CheckboxField id="consent" label="I agree" error="Required." />);
    const checkbox = screen.getByRole('checkbox', { name: 'I agree' });
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(checkbox).toHaveAccessibleDescription('Required.');
  });

  it('has no error wiring when valid', () => {
    render(<CheckboxField id="consent" label="I agree" />);
    expect(screen.getByRole('checkbox', { name: 'I agree' })).not.toHaveAttribute(
      'aria-describedby',
    );
  });
});

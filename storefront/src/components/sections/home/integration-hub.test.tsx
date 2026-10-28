import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IntegrationHub, spokes } from './IntegrationHub';

const tool = (name: string) => ({
  name,
  logo: { src: `/images/integrations/${name.toLowerCase()}.svg`, alt: name, width: 48, height: 48 },
});

describe('spokes', () => {
  it('spaces the logos evenly round the circle, starting at the top', () => {
    const positions = spokes(4).map(({ left, top }) => [left, top]);
    const expected = [
      [50, 7],
      [93, 50],
      [50, 93],
      [7, 50],
    ];
    positions.forEach(([left, top], index) => {
      expect(left).toBeCloseTo(expected[index]?.[0] ?? Number.NaN, 5);
      expect(top).toBeCloseTo(expected[index]?.[1] ?? Number.NaN, 5);
    });
  });

  it('starts every line at the hub and ends it on its logo', () => {
    for (const spoke of spokes(7)) {
      expect(spoke.path).toMatch(/^M[\d.]+ [\d.]+C/);
      expect(spoke.path.endsWith(`${String(spoke.end.x)} ${String(spoke.end.y)}`)).toBe(true);
    }
  });
});

describe('IntegrationHub', () => {
  it('lists every tool by its logo, with the brand initial as decoration', () => {
    render(<IntegrationHub integrations={[tool('Figma'), tool('Slack')]} siteName="Aurora" />);
    const list = screen.getByRole('list', { name: 'Tools we work with' });
    expect(list.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Figma' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Slack' })).toBeInTheDocument();
  });
});

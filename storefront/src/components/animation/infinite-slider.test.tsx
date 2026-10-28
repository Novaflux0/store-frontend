import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InfiniteSlider } from './InfiniteSlider';

describe('InfiniteSlider', () => {
  it('renders the items twice, with only the first copy exposed to assistive technology', () => {
    const { container } = render(
      <InfiniteSlider label="Client logos" gap={42}>
        <li>Northwind</li>
        <li>Orbitra</li>
      </InfiniteSlider>,
    );
    const list = screen.getByRole('list', { name: 'Client logos' });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(list.textContent).toBe('NorthwindOrbitra');

    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(2);
    expect(lists[1]).toHaveAttribute('aria-hidden', 'true');
    expect(lists[1]?.textContent).toBe('NorthwindOrbitra');
  });
});

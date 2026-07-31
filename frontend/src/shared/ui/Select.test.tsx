import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Select } from './Select';

describe('Select', () => {
  it('provides a 44px target and disables transitions for reduced motion', () => {
    render(<Select label="Role" options={[{ label: 'Owner', value: 'owner' }]} />);

    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveClass(
      'min-h-10',
      'rounded-ui-control',
      'border-input',
      'bg-card',
      'shadow-none',
      'motion-reduce:transition-none',
    );
  });

  it('associates select hint and error text with the control', () => {
    render(
      <Select
        error="Choose a role"
        hint="Owners can manage billing"
        label="Role"
        options={[{ label: 'Owner', value: 'owner' }]}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveAccessibleDescription(
      'Owners can manage billing Choose a role',
    );
  });
});

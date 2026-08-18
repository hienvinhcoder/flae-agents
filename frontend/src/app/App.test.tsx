import { render, screen } from '@testing-library/react';
import { createMemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('exposes the FLAE application landmark', () => {
    const router = createMemoryRouter([{ path: '/', element: <main aria-label="FLAE application" /> }]);
    render(<App router={router} />);

    expect(screen.getByRole('main', { name: /flae application/i })).toBeInTheDocument();
  });
});

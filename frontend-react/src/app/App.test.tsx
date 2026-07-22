import { render, screen } from '@testing-library/react';

import { App } from './App';

describe('App', () => {
  test('exposes the FLAE application landmark', () => {
    render(<App />);

    expect(screen.getByRole('main', { name: /flae application/i })).toBeInTheDocument();
  });
});

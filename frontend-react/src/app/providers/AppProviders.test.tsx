import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';

import { AppError } from '../../core/api/errors';
import { AppProviders } from './AppProviders';

function QueryClientConsumer({ onClient }: { onClient: (client: ReturnType<typeof useQueryClient>) => void }) {
  const client = useQueryClient();

  useEffect(() => {
    onClient(client);
  }, [client, onClient]);

  return <span>Provider child</span>;
}

describe('AppProviders', () => {
  it('provides one stable QueryClient when rerendered', () => {
    const clients: ReturnType<typeof useQueryClient>[] = [];
    const onClient = (client: ReturnType<typeof useQueryClient>) => clients.push(client);
    const { rerender } = render(
      <AppProviders>
        <QueryClientConsumer onClient={onClient} />
      </AppProviders>,
    );

    expect(screen.getByText('Provider child')).toBeInTheDocument();
    rerender(
      <AppProviders>
        <QueryClientConsumer onClient={onClient} />
      </AppProviders>,
    );

    expect(clients).toHaveLength(1);
    expect(clients[0]).toBeDefined();
  });

  it('retries only retryable network and server query errors with a bound', () => {
    let client: ReturnType<typeof useQueryClient> | undefined;
    render(
      <AppProviders>
        <QueryClientConsumer onClient={(value) => (client = value)} />
      </AppProviders>,
    );

    const retry = client?.getDefaultOptions().queries?.retry;
    expect(typeof retry).toBe('function');
    if (typeof retry !== 'function') {
      throw new Error('Expected query retry function');
    }

    expect(retry(0, new AppError({ kind: 'network', message: 'Offline', retryable: true }))).toBe(true);
    expect(retry(1, new AppError({ kind: 'server', message: 'Server error', retryable: true }))).toBe(true);
    expect(retry(2, new AppError({ kind: 'server', message: 'Server error', retryable: true }))).toBe(false);
    expect(retry(0, new AppError({ kind: 'auth', message: 'Sign in', retryable: false }))).toBe(false);
    expect(client?.getDefaultOptions().mutations?.retry).toBe(false);
  });
});

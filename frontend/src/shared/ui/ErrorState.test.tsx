import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders caller-provided title and retry copy without owning localization', () => {
    render(<ErrorState message="Không thể tải." onRetry={vi.fn()} retryLabel="Thử lại" title="Đã xảy ra lỗi" />);

    expect(screen.getByRole('heading', { name: 'Đã xảy ra lỗi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});

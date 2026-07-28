import type { TFunction } from 'i18next';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { createDashboardFixture } from '../dashboard-fixture';
import { DashboardHero } from './DashboardHero';
import { KnowledgeGraphPreview } from './KnowledgeGraphPreview';

const translateKeys = ((key: string) =>
  key === 'DASHBOARD_HOME.KNOWLEDGE_GRAPH_DESCRIPTION'
    ? 'Live relationships across company memory'
    : key) as unknown as TFunction;
const fixture = createDashboardFixture(translateKeys);

describe('dashboard primary panels', () => {
  it('renders an inert welcome hero and accessible graph preview', () => {
    render(
      <MemoryRouter>
        <DashboardHero demoLabel="Preview only" hero={fixture.hero} metrics={fixture.metrics} />
        <KnowledgeGraphPreview exploreLabel="Explore" graph={fixture.graph} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'DASHBOARD_HOME.WELCOME' }),
    ).toBeInTheDocument();
    expect(screen.getByText('12.4k')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByRole('img', { name: /live relationships/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explore' })).toHaveAttribute(
      'href',
      '/dashboard/knowledge/graph',
    );
  });
});

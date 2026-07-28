import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';

import { createDashboardFixture } from './dashboard-fixture';

const t = ((key: string) => key) as unknown as TFunction;

describe('dashboard fixture', () => {
  it('provides stable identifiers and every approved section', () => {
    const fixture = createDashboardFixture(t);

    expect(fixture.metrics.map((item) => item.id)).toEqual([
      'documents',
      'repositories',
      'people',
      'memory-nodes',
    ]);
    expect(fixture.graph.nodes.some((node) => node.kind === 'memory')).toBe(true);
    expect(fixture.recentMemory).toHaveLength(3);
    expect(fixture.agents.map((agent) => agent.status)).toEqual(['active', 'idle', 'active']);
    expect(fixture.risks.map((risk) => risk.severity)).toEqual([
      'warning',
      'neutral',
      'neutral',
    ]);
    expect(fixture.sources).toHaveLength(8);
    expect(new Set(fixture.sources.map((source) => source.id)).size).toBe(8);
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import stylesheet from '../../../styles.css?raw';
import { KnowledgeMemoryPanel } from './KnowledgeMemoryPanel';

describe('KnowledgeMemoryPanel', () => {
  it('renders the approved company-memory story as non-interactive decorative content', () => {
    render(<KnowledgeMemoryPanel />);

    const panel = screen.getByTestId('knowledge-memory-panel');
    const labels = [
      'Company Memory',
      'Documents',
      'Code',
      'Decisions',
      'People',
      'Agents',
      'Knowledge sync',
      'Active',
      'Connected sources',
      '12 live',
      'Living knowledge graph',
    ];

    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(
      panel.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
    ).toHaveLength(0);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('aligns the Agents node with its SVG connection endpoint', () => {
    render(<KnowledgeMemoryPanel />);

    expect(screen.getByText('Agents').parentElement).toHaveClass(
      'left-1/2',
      'top-[83%]',
      '-translate-x-1/2',
      '-translate-y-1/2',
    );
  });

  it('keeps connection-line weight stable when the SVG scales', () => {
    expect(stylesheet).toMatch(
      /\.memory-flow\s*\{[^}]*vector-effect:\s*non-scaling-stroke;/s,
    );
  });
});

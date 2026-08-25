import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import stylesheet from '../../../styles.css?raw';
import { KnowledgeMemoryPanel } from './KnowledgeMemoryPanel';

describe('KnowledgeMemoryPanel', () => {
  it('renders the approved company-memory story as non-interactive decorative content', () => {
    render(<KnowledgeMemoryPanel />);

    const panel = screen.getByTestId('knowledge-memory-panel');
    const labels = [
      'Knowledge synthesis',
      'Sources',
      'AI agents',
      'Notion',
      'Google Drive',
      'Google Meet',
      'Company docs',
      'Slack',
      'Cursor',
      'Claude',
      'Codex',
      'Any MCP agent',
      'FLAE',
      'Company memory',
      'Knowledge sync',
      'Active',
      'Agents connected',
      '4 live',
    ];

    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(
      panel.querySelectorAll('a, button, input, select, textarea, [tabindex]'),
    ).toHaveLength(0);
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('keeps connection-line weight stable when the SVG scales', () => {
    expect(stylesheet).toMatch(
      /\.memory-flow\s*\{[^}]*vector-effect:\s*non-scaling-stroke;/s,
    );
  });
});

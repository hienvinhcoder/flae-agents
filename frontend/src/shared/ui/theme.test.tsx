import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import mainEntry from '../../app/main.tsx?raw';
import '../../styles.css';
import stylesheet from '../../styles.css?raw';

const typescriptSources = import.meta.glob<string>('../../**/*.{ts,tsx}', {
  eager: true,
  import: 'default',
  query: '?raw',
});

const referenceTokens = [
  ['--color-primary', 'oklch(70.5% 0.187 45)'],
  ['--color-primary-hover', 'oklch(66.5% 0.187 45)'],
  ['--color-primary-active', 'oklch(62.5% 0.187 45)'],
  ['--color-primary-soft', 'oklch(93% 0.06 60)'],
  ['--color-canvas', 'oklch(98.5% 0.006 85)'],
  ['--color-surface', 'oklch(100% 0 0)'],
  ['--color-surface-raised', 'oklch(100% 0 0)'],
  ['--color-surface-interactive', 'oklch(94% 0.012 85)'],
  ['--color-divider', 'oklch(90% 0.015 80)'],
  ['--color-border', 'oklch(90% 0.015 80)'],
  ['--color-border-control', '#776f64'],
  ['--color-border-strong', '#4b443b'],
  ['--color-text', 'oklch(18% 0.02 60)'],
  ['--color-text-secondary', 'oklch(25% 0.02 60)'],
  ['--color-text-muted', 'oklch(48% 0.02 60)'],
  ['--color-text-disabled', '#7a746b'],
  ['--color-on-primary', '#2a241c'],
  ['--color-link', '#9a3412'],
  ['--color-focus', '#9a3412'],
  ['--color-ai', '#9a3412'],
  ['--color-ai-soft', 'oklch(93% 0.06 60)'],
  ['--sidebar', 'oklch(22% 0.02 60)'],
  ['--sidebar-foreground', 'oklch(94% 0.012 85)'],
  ['--sidebar-accent', 'oklch(28% 0.02 60)'],
  ['--sidebar-border', 'oklch(30% 0.02 60)'],
  ['--radius-control', '0.5rem'],
  ['--radius-card', '0.625rem'],
  ['--radius-dialog', '0.875rem'],
  ['--radius-pill', '9999px'],
  ['--shadow-panel', '0 1px 2px oklch(20% 0.03 60 / 0.04)'],
  ['--shadow-overlay', '0 18px 48px -16px oklch(20% 0.03 60 / 0.28)'],
  ['--focus-ring', '0 0 0 4px rgba(154, 52, 18, 0.18)'],
] as const;

function expectToken(token: string, value: string): void {
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  expect(stylesheet).toMatch(new RegExp(`${token}:\\s*${escapedValue};`));
}

function collectProcessedCssRules(rules: CSSRuleList): string[] {
  return Array.from(rules).flatMap((rule) => {
    const nestedRules = 'cssRules' in rule ? (rule as CSSGroupingRule).cssRules : undefined;

    return nestedRules
      ? [rule.cssText, ...collectProcessedCssRules(nestedRules)]
      : [rule.cssText];
  });
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => {
    const value = channel / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const luminances = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (first, second) => second - first,
  );
  const [lighter = 0, darker = 0] = luminances;

  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme contract', () => {
  it('defines the approved dashboard reference tokens', () => {
    expect(stylesheet, 'src/styles.css must define the global theme').not.toBe('');

    for (const [token, value] of referenceTokens) {
      expectToken(token, value);
    }
  });

  it('loads the primary-button theme through the main entry and Vite CSS pipeline', () => {
    render(
      <button className="button-primary" type="button">
        Execute action
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Execute action' })).toHaveClass('button-primary');
    expect(mainEntry, 'main.tsx must import the global theme').toMatch(
      /import\s+['"]\.\.\/styles\.css['"];?/,
    );

    const processedStylesheet = Array.from(document.styleSheets)
      .flatMap((sheet) => collectProcessedCssRules(sheet.cssRules))
      .join('\n');

    expect(processedStylesheet, 'Vite must load the global stylesheet into CSSOM').not.toBe('');
    expect(processedStylesheet, 'Vite-processed CSS must contain the primary-button rule').toMatch(
      /\.button-primary\s*\{[^}]*background(?:-color)?:\s*var\(--color-primary\);/s,
    );
  });

  it('keeps primary-button state changes free of layout movement', () => {
    const buttonRule = stylesheet.match(/\.button-primary\s*\{(?<declarations>[^}]*)\}/s)?.groups
      ?.declarations ?? '';
    const activeRule = stylesheet.match(
      /\.button-primary:active:not\(:disabled\)\s*\{(?<declarations>[^}]*)\}/s,
    )?.groups?.declarations ?? '';

    expect(buttonRule).not.toMatch(/\btransform\b/);
    expect(activeRule).not.toMatch(/\btransform\s*:/);
  });

  it('uses a border-first raised surface without a panel shadow', () => {
    const panelRule = stylesheet.match(/\.surface-panel\s*\{(?<declarations>[^}]*)\}/s)?.groups
      ?.declarations ?? '';

    expect(panelRule).toMatch(/border:\s*1px solid var\(--color-border\);/);
    expect(panelRule).toMatch(/border-radius:\s*var\(--radius-card\);/);
    expect(panelRule).toMatch(/background:\s*var\(--color-surface-raised\);/);
    expect(panelRule).not.toMatch(/box-shadow\s*:/);
  });

  it('meets contrast requirements for documented text and control pairings', () => {
    const pairings = [
      ['small primary button label', '#2a241c', '#f97316', 4.5],
      ['primary text on canvas', '#1f1b15', '#faf8f3', 4.5],
      ['muted text on surface', '#6e6558', '#ffffff', 4.5],
      ['link text on canvas', '#9a3412', '#faf8f3', 4.5],
      ['sidebar text on sidebar', '#eae6db', '#2a241c', 4.5],
    ] as const;

    for (const [name, foreground, background, minimumRatio] of pairings) {
      const ratio = contrastRatio(foreground, background);

      expect(ratio, `${name} must meet ${minimumRatio}:1 contrast`).toBeGreaterThanOrEqual(
        minimumRatio,
      );
    }
  });

  it('maps every component contract token into the Tailwind theme', () => {
    const themeBlock = stylesheet.match(/@theme inline\s*\{(?<tokens>[^}]*)\}/s)?.groups?.tokens ?? '';
    const mappings = [
      ['--color-brand', '--color-primary'],
      ['--color-brand-hover', '--color-primary-hover'],
      ['--color-brand-active', '--color-primary-active'],
      ['--color-brand-soft', '--color-primary-soft'],
      ['--color-brand-foreground', '--color-on-primary'],
      ['--color-ui-canvas', '--color-canvas'],
      ['--color-ui-panel', '--color-surface'],
      ['--color-ui-raised', '--color-surface-raised'],
      ['--color-ui-interactive', '--color-surface-interactive'],
      ['--color-ui-divider', '--color-divider'],
      ['--color-ui-line', '--color-border'],
      ['--color-ui-line-strong', '--color-border-strong'],
      ['--color-ui-ink', '--color-text'],
      ['--color-ui-ink-secondary', '--color-text-secondary'],
      ['--color-ui-ink-muted', '--color-text-muted'],
      ['--color-ui-ink-disabled', '--color-text-disabled'],
      ['--color-accent-ai', '--color-ai'],
      ['--color-accent-ai-soft', '--color-ai-soft'],
      ['--color-state-success', '--color-success'],
      ['--color-state-success-soft', '--color-success-soft'],
      ['--color-state-warning', '--color-warning'],
      ['--color-state-warning-soft', '--color-warning-soft'],
      ['--color-state-danger', '--color-danger'],
      ['--color-state-danger-soft', '--color-danger-soft'],
      ['--color-state-info', '--color-info'],
      ['--color-state-info-soft', '--color-info-soft'],
      ['--color-sidebar', '--sidebar'],
      ['--color-sidebar-foreground', '--sidebar-foreground'],
      ['--color-sidebar-accent', '--sidebar-accent'],
      ['--color-sidebar-border', '--sidebar-border'],
      ['--font-ui', '--font-sans'],
      ['--font-code', '--font-mono'],
      ['--radius-ui-control', '--radius-control'],
      ['--radius-ui-panel', '--radius-card'],
      ['--radius-ui-dialog', '--radius-dialog'],
      ['--radius-ui-status', '--radius-pill'],
      ['--shadow-ui-panel', '--shadow-panel'],
      ['--shadow-ui-overlay', '--shadow-overlay'],
      ['--shadow-ui-focus', '--focus-ring'],
    ] as const;

    expect(themeBlock, '@theme inline must expose component tokens').not.toBe('');

    for (const [themeToken, sourceToken] of mappings) {
      expect(themeBlock).toMatch(
        new RegExp(`${themeToken}:\\s*var\\(${sourceToken}\\);`),
      );
    }
  });

  it('keeps brand color literals out of TypeScript source', () => {
    const referenceHexColors = [
      ['f9', '73', '16'].join(''),
      ['9a', '34', '12'].join(''),
      ['2a', '24', '1c'].join(''),
    ];
    const brandLiteral = new RegExp(
      `#(?:${referenceHexColors.join('|')})`,
      'i',
    );
    const violations = Object.entries(typescriptSources)
      .filter(([, source]) => brandLiteral.test(source))
      .map(([path]) => path);

    expect(violations).toEqual([]);
  });
});

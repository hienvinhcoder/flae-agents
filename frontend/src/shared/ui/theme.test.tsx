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
  ['--background', '#141009'],
  ['--foreground', '#f5f0e8'],
  ['--card', 'var(--glass-surface-strong)'],
  ['--card-foreground', 'var(--foreground)'],
  ['--popover', 'var(--glass-surface-strong)'],
  ['--popover-foreground', 'var(--foreground)'],
  ['--primary', 'oklch(70.487% 0.1867 47.604)'],
  ['--primary-foreground', 'oklch(98.951% 0.009 78.283)'],
  ['--primary-soft', 'rgb(249 115 22 / 0.16)'],
  ['--primary-control', 'var(--primary)'],
  ['--primary-control-hover', 'color-mix(in oklch, var(--primary), var(--foreground) 10%)'],
  ['--primary-control-active', 'color-mix(in oklch, var(--primary), var(--foreground) 18%)'],
  ['--primary-control-foreground', 'var(--primary-foreground)'],
  ['--secondary', 'var(--glass-surface)'],
  ['--secondary-foreground', 'var(--foreground)'],
  ['--muted', 'rgb(255 251 245 / 0.08)'],
  ['--muted-foreground', '#b7ab9a'],
  ['--accent', 'var(--secondary)'],
  ['--accent-foreground', 'var(--foreground)'],
  ['--destructive', 'oklch(0.62 0.21 27)'],
  ['--destructive-foreground', 'var(--primary-foreground)'],
  ['--border', 'rgb(255 251 245 / 0.12)'],
  ['--input', 'var(--border)'],
  ['--ring', 'var(--primary)'],
  ['--sidebar', 'rgb(20 16 9 / 0.55)'],
  ['--sidebar-foreground', '#eae3d6'],
  ['--sidebar-primary', 'var(--primary-soft)'],
  ['--sidebar-primary-foreground', 'var(--orb-primary)'],
  ['--sidebar-accent', 'color-mix(in oklch, var(--sidebar), var(--sidebar-foreground) 8%)'],
  ['--sidebar-border', 'color-mix(in oklch, var(--sidebar), var(--sidebar-foreground) 12%)'],
  ['--radius-control', '0.5rem'],
  ['--radius-card', '0.75rem'],
  ['--radius-dialog', '1rem'],
  ['--radius-pill', '9999px'],
  ['--shadow-panel', 'var(--shadow-glass)'],
  ['--shadow-overlay', 'var(--shadow-glass-pop)'],
  ['--focus-ring', '0 0 0 4px color-mix(in oklch, var(--ring) 22%, transparent)'],
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
      <button className="flae-button-primary" type="button">
        Execute action
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Execute action' })).toHaveClass('flae-button-primary');
    expect(mainEntry, 'main.tsx must import the global theme').toMatch(
      /import\s+['"]\.\.\/styles\.css['"];?/,
    );

    const processedStylesheet = Array.from(document.styleSheets)
      .flatMap((sheet) => collectProcessedCssRules(sheet.cssRules))
      .join('\n');

    expect(processedStylesheet, 'Vite must load the global stylesheet into CSSOM').not.toBe('');
    expect(processedStylesheet, 'Vite-processed CSS must contain the primary-button rule').toMatch(
      /\.flae-button-primary\s*\{[^}]*background(?:-color)?:\s*var\(--primary-control\);/s,
    );
  });

  it('keeps primary-button state changes free of layout movement', () => {
    const buttonRule = stylesheet.match(/\.flae-button-primary\s*\{(?<declarations>[^}]*)\}/s)?.groups
      ?.declarations ?? '';
    const activeRule = stylesheet.match(
      /\.flae-button-primary:active:not\(:disabled\)\s*\{(?<declarations>[^}]*)\}/s,
    )?.groups?.declarations ?? '';

    expect(buttonRule).not.toMatch(/\btransform\b/);
    expect(activeRule).not.toMatch(/\btransform\s*:/);
  });

  it('keeps the disabled header CTA solid and readable', () => {
    const headerCtaRule = stylesheet.match(
      /\.header-add-source\.flae-button-primary:disabled\s*\{(?<declarations>[^}]*)\}/s,
    )?.groups?.declarations ?? '';

    expect(headerCtaRule).toMatch(/background:\s*var\(--primary-control\)\s*!important;/);
    expect(headerCtaRule).toMatch(
      /color:\s*var\(--primary-control-foreground\)\s*!important;/,
    );
    expect(headerCtaRule).toMatch(/opacity:\s*1\s*!important;/);

    render(
      <button className="flae-button-primary header-add-source" disabled type="button">
        Add source
      </button>,
    );

    expect(getComputedStyle(screen.getByRole('button', { name: 'Add source' })).opacity).toBe('1');
  });

  it('uses a border-first raised surface without a panel shadow', () => {
    const panelRule = stylesheet.match(/\.surface-panel\s*\{(?<declarations>[^}]*)\}/s)?.groups
      ?.declarations ?? '';

    expect(panelRule).toMatch(/border:\s*1px solid var\(--border\);/);
    expect(panelRule).toMatch(/border-radius:\s*var\(--radius-card\);/);
    expect(panelRule).toMatch(/background:\s*var\(--card\);/);
    expect(panelRule).not.toMatch(/box-shadow\s*:/);
  });

  it('meets contrast requirements for documented text pairings', () => {
    const pairings = [
      ['primary text on canvas', '#f5f0e8', '#141009', 4.5],
      ['muted text on surface', '#b7ab9a', '#221e17', 4.5],
      ['link text on canvas', '#fb923c', '#141009', 4.5],
      ['sidebar text on sidebar', '#eae3d6', '#141009', 4.5],
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
      ['--color-background', '--background'],
      ['--color-foreground', '--foreground'],
      ['--color-card', '--card'],
      ['--color-card-foreground', '--card-foreground'],
      ['--color-popover', '--popover'],
      ['--color-popover-foreground', '--popover-foreground'],
      ['--color-primary', '--primary'],
      ['--color-primary-foreground', '--primary-foreground'],
      ['--color-primary-soft', '--primary-soft'],
      ['--color-primary-control', '--primary-control'],
      ['--color-primary-control-hover', '--primary-control-hover'],
      ['--color-primary-control-active', '--primary-control-active'],
      ['--color-primary-control-foreground', '--primary-control-foreground'],
      ['--color-secondary', '--secondary'],
      ['--color-secondary-foreground', '--secondary-foreground'],
      ['--color-muted', '--muted'],
      ['--color-muted-foreground', '--muted-foreground'],
      ['--color-accent', '--accent'],
      ['--color-accent-foreground', '--accent-foreground'],
      ['--color-border', '--border'],
      ['--color-input', '--input'],
      ['--color-ring', '--ring'],
      ['--color-brand', '--primary-control'],
      ['--color-brand-vivid', '--primary'],
      ['--color-brand-hover', '--primary-control-hover'],
      ['--color-brand-active', '--primary-control-active'],
      ['--color-brand-soft', '--primary-soft'],
      ['--color-brand-foreground', '--primary-control-foreground'],
      ['--color-brand-cta', '--color-primary-cta'],
      ['--color-brand-cta-hover', '--color-primary-cta-hover'],
      ['--color-brand-cta-active', '--color-primary-cta-active'],
      ['--color-brand-cta-foreground', '--color-primary-cta-foreground'],
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
      ['--color-sidebar-primary', '--sidebar-primary'],
      ['--color-sidebar-primary-foreground', '--sidebar-primary-foreground'],
      ['--color-sidebar-accent', '--sidebar-accent'],
      ['--color-sidebar-accent-foreground', '--sidebar-accent-foreground'],
      ['--color-sidebar-border', '--sidebar-border'],
      ['--color-sidebar-ring', '--sidebar-ring'],
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
      ['c2', '41', '0c'].join(''),
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

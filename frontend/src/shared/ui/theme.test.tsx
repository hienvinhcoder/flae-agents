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
const primarySoftValue = ['rgba(', ['242', '140', '69', '0.1'].join(', '), ')'].join('');

const immutableBrandTokens = [
  ['--color-primary', `#${['f2', '8c', '45'].join('')}`],
  ['--color-primary-hover', `#${['e7', '7e', '37'].join('')}`],
  ['--color-primary-active', `#${['d9', '6f', '26'].join('')}`],
  ['--color-primary-soft', primarySoftValue],
] as const;

function collectProcessedCssRules(rules: CSSRuleList): string[] {
  return Array.from(rules).flatMap((rule) => {
    const nestedRules = 'cssRules' in rule ? (rule as CSSGroupingRule).cssRules : undefined;

    return nestedRules
      ? [rule.cssText, ...collectProcessedCssRules(nestedRules)]
      : [rule.cssText];
  });
}

function readHexToken(token: string): string {
  const match = stylesheet.match(new RegExp(`${token}:\\s*(#[\\da-f]{6});`, 'i'));

  expect(match, `${token} must be a six-digit hex color`).not.toBeNull();

  return match?.[1] ?? '#000000';
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
  it('defines the immutable primary palette as design tokens', () => {
    expect(stylesheet, 'src/styles.css must define the global theme').not.toBe('');

    for (const [token, value] of immutableBrandTokens) {
      expect(stylesheet).toMatch(new RegExp(`${token}:\\s*${value.replace(/[().]/g, '\\$&')};`));
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

  it('meets contrast requirements for documented text and control pairings', () => {
    const pairings = [
      ['default control boundary', '--color-border', '--color-surface-interactive', 3],
      ['panel boundary', '--color-border', '--color-surface', 3],
      ['strong raised boundary', '--color-border-strong', '--color-surface-raised', 3],
      ['primary button label', '--color-on-primary', '--color-primary', 4.5],
      ['muted panel text', '--color-text-muted', '--color-surface', 4.5],
      ['AI panel text', '--color-ai', '--color-surface', 4.5],
      ['success panel text', '--color-success', '--color-surface', 4.5],
      ['warning panel text', '--color-warning', '--color-surface', 4.5],
      ['danger panel text', '--color-danger', '--color-surface', 4.5],
      ['info panel text', '--color-info', '--color-surface', 4.5],
      ['focus indicator', '--color-primary', '--color-canvas', 3],
    ] as const;

    for (const [name, foregroundToken, backgroundToken, minimumRatio] of pairings) {
      const ratio = contrastRatio(readHexToken(foregroundToken), readHexToken(backgroundToken));

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
      ['--font-ui', '--font-sans'],
      ['--font-code', '--font-mono'],
      ['--radius-ui-control', '--radius-md'],
      ['--radius-ui-panel', '--radius-lg'],
      ['--radius-ui-dialog', '--radius-xl'],
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
    const primarySoftPattern = [
      'rgba\\(',
      ['242', '140', '69', '0\\.1'].join(',\\s*'),
      '\\)',
    ].join('');
    const brandLiteral = new RegExp(
      [`#(?:${['f28c45', 'e77e37', 'd96f26'].join('|')})`, primarySoftPattern].join('|'),
      'i',
    );
    const violations = Object.entries(typescriptSources)
      .filter(([, source]) => brandLiteral.test(source))
      .map(([path]) => path);

    expect(violations).toEqual([]);
  });
});

/// <reference types="node" />

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { cwd } from 'node:process';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

const sourceDirectory = join(cwd(), 'src');
const stylesheetPath = join(sourceDirectory, 'styles.css');
const stylesheet = existsSync(stylesheetPath) ? readFileSync(stylesheetPath, 'utf8') : '';
const primarySoftValue = ['rgba(', ['242', '140', '69', '0.1'].join(', '), ')'].join('');

const immutableBrandTokens = [
  ['--color-primary', `#${['f2', '8c', '45'].join('')}`],
  ['--color-primary-hover', `#${['e7', '7e', '37'].join('')}`],
  ['--color-primary-active', `#${['d9', '6f', '26'].join('')}`],
  ['--color-primary-soft', primarySoftValue],
] as const;

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectTypeScriptFiles(path);
    }

    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

describe('theme contract', () => {
  it('defines the immutable primary palette as design tokens', () => {
    expect(stylesheet, 'src/styles.css must define the global theme').not.toBe('');

    for (const [token, value] of immutableBrandTokens) {
      expect(stylesheet).toMatch(new RegExp(`${token}:\\s*${value.replace(/[().]/g, '\\$&')};`));
    }
  });

  it('provides an accessible primary-button fixture backed by the primary token', () => {
    render(
      <button className="button-primary" type="button">
        Execute action
      </button>,
    );

    expect(screen.getByRole('button', { name: 'Execute action' })).toHaveClass('button-primary');
    expect(stylesheet).toMatch(
      /\.button-primary\s*\{[^}]*background(?:-color)?:\s*var\(--color-primary\);/s,
    );
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
    const violations = collectTypeScriptFiles(sourceDirectory).filter((path) =>
      brandLiteral.test(readFileSync(path, 'utf8')),
    );

    expect(violations).toEqual([]);
  });
});

import { createElement, lazy, Suspense, type ComponentType } from 'react';

import { RouteLoadingFallback } from './RouteLoadingFallback';

export function createLazyElement(loader: () => Promise<{ default: ComponentType }>) {
  const Page = lazy(loader);
  return createElement(
    Suspense,
    { fallback: createElement(RouteLoadingFallback) },
    createElement(Page),
  );
}

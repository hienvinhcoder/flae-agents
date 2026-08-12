import { Suspense } from 'react';
import { RouterProvider, type RouterProviderProps } from 'react-router-dom';

import { AppLoadingFallback } from './AppLoadingFallback';

export interface AppProps {
  router: RouterProviderProps['router'];
}

export function App({ router }: AppProps) {
  return <Suspense fallback={<AppLoadingFallback />}><RouterProvider router={router} /></Suspense>;
}

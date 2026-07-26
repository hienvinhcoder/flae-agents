import { Suspense } from 'react';
import { RouterProvider, type RouterProviderProps } from 'react-router-dom';

import { AppLoadingFallback } from './AppLoadingFallback';
import { createAppRouter } from './router/router';

const appRouter = createAppRouter();

export interface AppProps {
  router?: RouterProviderProps['router'];
}

export function App({ router = appRouter }: AppProps) {
  return <Suspense fallback={<AppLoadingFallback />}><RouterProvider router={router} /></Suspense>;
}

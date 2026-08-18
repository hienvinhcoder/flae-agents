import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ConfigEnv, type Plugin } from 'vite';

import { parseEnv } from './src/core/config/env-schema';

export function validateBuildEnvironment({ command, mode }: ConfigEnv, rootDirectory: string) {
  if (command === 'build') {
    parseEnv(loadEnv(mode, rootDirectory, 'VITE_'));
  }
}

function environmentValidationPlugin(): Plugin {
  return {
    name: 'validate-build-environment',
    config: (_config, configEnvironment) => {
      validateBuildEnvironment(configEnvironment, process.cwd());
    },
  };
}

export default defineConfig({
  plugins: [environmentValidationPlugin(), react(), tailwindcss()],
  server: {
    port: 4200,
    strictPort: true,
  },
  preview: {
    port: 4200,
  },
});

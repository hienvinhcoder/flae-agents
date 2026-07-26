import { parseEnv, type Environment } from './env-schema';

export { parseEnv, type Environment } from './env-schema';

export const env: Environment = parseEnv(import.meta.env);

import { AppError } from '../api/errors';

interface RegistrationMetadata {
  fullName: string;
}

type RegistrationResult =
  | { status: 'complete'; metadata: RegistrationMetadata }
  | { status: 'failed' };

interface RegistrationEntry {
  promise: Promise<RegistrationResult>;
  resolve: (result: RegistrationResult) => void;
  settled: boolean;
}

const registrations = new Map<string, RegistrationEntry>();

function keyFor(email: string) {
  return email.trim().toLowerCase();
}

function failEntry(entry: RegistrationEntry) {
  if (entry.settled) return;
  entry.settled = true;
  entry.resolve({ status: 'failed' });
}

export function beginRegistrationMetadata(email: string, fullName: string) {
  const key = keyFor(email);
  const previousEntry = registrations.get(key);
  if (previousEntry) failEntry(previousEntry);

  let resolve!: (result: RegistrationResult) => void;
  const entry: RegistrationEntry = {
    promise: new Promise<RegistrationResult>((promiseResolve) => {
      resolve = promiseResolve;
    }),
    resolve: (result) => resolve(result),
    settled: false,
  };
  registrations.set(key, entry);

  const settle = (result: RegistrationResult) => {
    if (entry.settled) return;
    entry.settled = true;
    entry.resolve(result);
  };

  return {
    complete: () => settle({ status: 'complete', metadata: { fullName } }),
    fail: () => settle({ status: 'failed' }),
    abort: () => {
      settle({ status: 'failed' });
      if (registrations.get(key) === entry) registrations.delete(key);
    },
  };
}

export async function consumeRegistrationMetadata(
  email: string | null,
): Promise<RegistrationMetadata | null> {
  if (!email) return null;
  const key = keyFor(email);
  const entry = registrations.get(key);
  if (!entry) return null;

  const result = await entry.promise;
  if (registrations.get(key) === entry) registrations.delete(key);

  if (result.status === 'failed') {
    throw new AppError({
      kind: 'auth',
      message: 'Unable to finish creating your account. Please try again.',
      retryable: false,
    });
  }

  return result.metadata;
}

export function clearRegistrationMetadata(email: string) {
  const key = keyFor(email);
  const entry = registrations.get(key);
  if (!entry) return;
  failEntry(entry);
  registrations.delete(key);
}

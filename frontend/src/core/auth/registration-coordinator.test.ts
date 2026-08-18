import { describe, expect, it } from 'vitest';

import {
  beginRegistrationMetadata,
  consumeRegistrationMetadata,
} from './registration-coordinator';

describe('registration metadata coordinator', () => {
  it('keeps an auth-state consumer pending until profile metadata is committed', async () => {
    const registration = beginRegistrationMetadata('Member@Example.com', 'Member One');
    let settled = false;
    const metadata = consumeRegistrationMetadata('member@example.com').finally(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    registration.complete();

    await expect(metadata).resolves.toEqual({ fullName: 'Member One' });
  });

  it('releases a waiting consumer with a safe error when profile setup fails', async () => {
    const registration = beginRegistrationMetadata('member@example.com', 'Member One');
    const metadata = consumeRegistrationMetadata('member@example.com');

    registration.fail();

    await expect(metadata).rejects.toMatchObject({
      kind: 'auth',
      message: 'Unable to finish creating your account. Please try again.',
      retryable: false,
    });
  });
});

import { connectAuthEmulator, type Auth } from 'firebase/auth';
import { connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

interface EmulatorRegistry {
  auth: WeakSet<Auth>;
  storage: WeakSet<FirebaseStorage>;
}

interface EmulatorGlobal {
  __flaeFirebaseEmulatorRegistry__?: EmulatorRegistry;
}

function emulatorRegistry() {
  const scope = globalThis as typeof globalThis & EmulatorGlobal;
  scope.__flaeFirebaseEmulatorRegistry__ ??= {
    auth: new WeakSet<Auth>(),
    storage: new WeakSet<FirebaseStorage>(),
  };
  return scope.__flaeFirebaseEmulatorRegistry__;
}

export function configureFirebaseEmulators({
  enabled,
  auth,
  storage,
}: {
  enabled: boolean;
  auth: Auth;
  storage: FirebaseStorage;
}) {
  if (!enabled) return;

  const connected = emulatorRegistry();
  if (!connected.auth.has(auth)) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    connected.auth.add(auth);
  }
  if (!connected.storage.has(storage)) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connected.storage.add(storage);
  }
}

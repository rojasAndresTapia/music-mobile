/**
 * Android only: start/stop a foreground service with MEDIA_PLAYBACK type so the OS
 * does not kill the app when the screen is off and the device is not charging (Doze mode).
 *
 * IMPORTANT — dev vs production:
 * The npm package `expo-foreground-service` exports a high-level `startService(config, callback)`
 * that only resolves after `callback()` finishes. Our previous code passed an infinite loop as the
 * callback so playback would NEVER continue after `await startService(...)` in production builds
 * where the native module exists. In Expo Go / many dev setups the native module is missing, so
 * `startService` threw or no-op’d and music still started — masking the bug.
 *
 * We call the **native** `ExpoForegroundService.startService(config)` only (no callback). That
 * resolves immediately after starting the service, matching the Kotlin implementation.
 *
 * @see https://developer.android.com/develop/background-work/services/fg-service-types#media-playback
 */

import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

type NativeForegroundModule = {
  startService: (config: Record<string, unknown>) => Promise<void>;
  stopService: () => Promise<void>;
};

let nativeForeground: NativeForegroundModule | null = null;

try {
  if (Platform.OS === 'android') {
    nativeForeground = requireNativeModule<NativeForegroundModule>('ExpoForegroundService');
  }
} catch {
  // Module not in binary (e.g. Expo Go) or not linked
}

const isAndroid = Platform.OS === 'android';

export async function startMediaForegroundService(trackTitle: string): Promise<void> {
  if (!isAndroid || !nativeForeground) return;
  try {
    await nativeForeground.startService({
      notification: {
        title: 'Now playing',
        description: trackTitle || 'Music',
        ongoing: true,
        chronometer: false,
        serviceType: 'MEDIA_PLAYBACK',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[foreground-service] start failed:', msg);
  }
}

export async function stopMediaForegroundService(): Promise<void> {
  if (!isAndroid || !nativeForeground) return;
  try {
    await nativeForeground.stopService();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[foreground-service] stop failed:', msg);
  }
}

export function isForegroundServiceAvailable(): boolean {
  return isAndroid && nativeForeground != null;
}

/**
 * Android only: start/stop a foreground service with MEDIA_PLAYBACK type so the OS
 * does not kill the app when the screen is off and the device is not charging (Doze mode).
 *
 * When the device is unplugged, Android aggressively suspends background apps to save battery.
 * expo-av does not run as a foreground service, so playback (and JS) can be stopped.
 * Starting a media foreground service with a "Now playing" notification keeps the process
 * alive so the next track can start and logs continue.
 *
 * @see https://developer.android.com/develop/background-work/services/fg-service-types#media-playback
 * @see https://developer.android.com/about/versions/14/changes/fgs-types-required
 */

import { Platform } from 'react-native';

let ExpoForegroundService: {
  startService: (config: unknown, task: () => Promise<void>) => Promise<void>;
  stopService: () => Promise<void>;
  ServiceType: { MEDIA_PLAYBACK: string };
} | null = null;

try {
  if (Platform.OS === 'android') {
    const mod = require('expo-foreground-service');
    ExpoForegroundService = mod.default ?? mod;
  }
} catch {
  // Package not installed or not available
}

const isAndroid = Platform.OS === 'android';

export async function startMediaForegroundService(trackTitle: string): Promise<void> {
  if (!isAndroid || !ExpoForegroundService) return;
  try {
    const serviceType = ExpoForegroundService.ServiceType?.MEDIA_PLAYBACK ?? 'MEDIA_PLAYBACK';
    await ExpoForegroundService.startService(
      {
        notification: {
          title: 'Now playing',
          description: trackTitle || 'Music',
          ongoing: true,
          chronometer: false,
          serviceType,
        },
      },
      async () => {
        // Task must run until stopService() is called. Sleep in a loop so the service stays alive.
        while (true) {
          await new Promise((r) => setTimeout(r, 60000));
        }
      }
    );
  } catch (e: any) {
    console.warn('[foreground-service] start failed:', e?.message ?? e);
  }
}

export async function stopMediaForegroundService(): Promise<void> {
  if (!isAndroid || !ExpoForegroundService) return;
  try {
    await ExpoForegroundService.stopService();
  } catch (e: any) {
    console.warn('[foreground-service] stop failed:', e?.message ?? e);
  }
}

export function isForegroundServiceAvailable(): boolean {
  return isAndroid && ExpoForegroundService != null;
}

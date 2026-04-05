# Music Mobile App 🎵

A modern, cross-platform mobile music player built with React Native and Expo. Stream your music library from anywhere with a beautiful, intuitive interface.

## Features

- 🎨 **Beautiful UI** - Modern, clean interface with smooth navigation
- 🎵 **Audio Playback** - High-quality audio streaming with background playback support
- 📱 **Cross-Platform** - Works on iOS, Android, and Web
- 🔍 **Smart Search** - Quickly find albums, artists, and tracks
- 🎤 **Artist View** - Browse albums by artist with aggregated statistics
- 📀 **Album Details** - View track listings and album artwork
- ⏯️ **Playback Controls** - Play, pause, skip tracks with a persistent player bar
- 🔄 **Auto-Play** - Automatically plays next track when current track finishes
- 🌐 **Cloud Backend** - Connects to a remote backend API (Railway) for music library access

## Tech Stack

- **Framework**: React Native with Expo (~54.0.25)
- **Language**: TypeScript
- **Navigation**: React Navigation (Stack Navigator)
- **Audio**: Expo AV for audio playback
- **State Management**: React Context API
- **Backend**: RESTful API integration

## Project Structure

```
music-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AlbumGrid.tsx
│   │   ├── AlbumHeader.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── AudioPlayerBar.tsx
│   │   ├── SearchBar.tsx
│   │   └── TrackList.tsx
│   ├── context/             # React Context providers
│   │   └── AudioContext.tsx  # Global audio state management
│   ├── hooks/               # Custom React hooks
│   │   └── useMusicData.ts  # Music data fetching hook
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx # Stack navigator setup
│   ├── screens/             # Screen components
│   │   ├── HomeScreen.tsx
│   │   ├── AlbumDetailScreen.tsx
│   │   └── ArtistAlbumsScreen.tsx
│   ├── services/            # API and service integrations
│   │   ├── api.ts           # Backend API client
│   │   ├── audioService.ts
│   │   ├── expoAudioService.ts
│   │   └── trackPlayerService.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── Album.ts
│   │   ├── Artist.ts
│   │   └── Track.ts
│   └── utils/               # Utility functions
│       └── dataTransformers.ts
├── assets/                  # Images and icons
├── App.tsx                  # Root component
├── app.json                 # Expo configuration
└── package.json            # Dependencies

```

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (optional, but recommended)
- Expo Go app (for development on physical devices)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Music-app/music-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the backend URL** (if needed)
   
   The app is configured to use a Railway-hosted backend by default. To change the backend URL, edit `src/services/api.ts`:
   ```typescript
   const API_BASE_URL = 'https://your-backend-url.com';
   ```

## Running the App

### Development Mode

Start the Expo development server:
```bash
npm start
```

This will:
- Start the Metro bundler
- Display a QR code for Expo Go
- Open the Expo DevTools in your browser

### Platform-Specific Commands

- **iOS Simulator**: `npm run ios`
- **Android Emulator**: `npm run android`
- **Web Browser**: `npm run web`

### Using Expo Go (Recommended for Development)

1. Install **Expo Go** on your iOS or Android device
2. Scan the QR code displayed in the terminal or browser
3. The app will load on your device
4. Changes will hot-reload automatically

> 💡 **Tip**: See `EXPO_GO_GUIDE.md` for more details on using Expo Go for faster development.

## Building for Production

**Current app version:** `1.0.11` (Android `versionCode` 12). Set in `app.json`.

### Android (APK)

```bash
npm run build:android
```

Or for a preview/internal APK:

```bash
npm run build:android:preview
```

### iOS

```bash
npm run build:ios
```

Or run EAS directly:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

> **Note:** You need [EAS CLI](https://docs.expo.dev/build/setup/) and an Expo account. Log in with `eas login`. See the [Expo Build docs](https://docs.expo.dev/build/introduction/).

## Configuration

### App Configuration

Edit `app.json` to customize:
- App name and version
- Icons and splash screens
- Platform-specific settings
- Permissions

### Backend Configuration

The app connects to a backend API for music library data. The default backend URL is configured in `src/services/api.ts`.

**API Endpoints Used:**
- `GET /test` - Connection test
- `GET /albums` - Fetch all albums
- `GET /audio-proxy?key=<track-key>` - Stream audio files
- `GET /image-proxy?key=<image-key>` - Fetch album/artist images

## Features in Detail

### Audio Playback

- **Background Playback**: Audio continues playing when the app is in the background (requires production build)
- **Auto-Play Next**: Automatically plays the next track when the current one finishes
- **Playback Controls**: Play, pause, skip to next/previous track
- **Persistent Player**: Audio player bar stays visible at the bottom while music is playing

### Navigation

- **Home Screen**: Displays a mixed list of albums and artists
- **Album Detail Screen**: Shows track listing for a selected album
- **Artist Albums Screen**: Displays all albums by a specific artist

### Search

- Search across albums, artists, and tracks
- Real-time filtering as you type

## Expo Go vs production (why music stops / app “restarts” in dev)

**In Expo Go or dev builds:**

1. **Music stops after a track (e.g. after song 02)**  
   When the app is in the background or the screen is off, the OS can **throttle or suspend JavaScript**. So “track finished” callbacks and the 15s force-next logic may not run. When you return, the next track might only start from the foreground check, or you may need to tap play again.

2. **App “restarts” when you return**  
   With the app in the background, the OS can **kill the process** to free memory (especially on Android). When you bring the app back, the system (or Expo Go) **restarts the app** and reloads the bundle, so it looks like a fresh launch. You’ll see `🚀 [INIT] App cold start / restart - initializing audio service...` in the terminal when that happens.

**In a production build (EAS Build or dev client .apk/.aab):**

- Your app runs in its own process with proper **background audio** and (on Android) **foreground service** usage.
- The system is less likely to kill the app while audio is playing or right after.
- Track-to-track transitions and “return to app” behavior are usually more reliable.

**Recommendation:** To verify behavior that depends on background (e.g. music not stopping, app not restarting when returning), test with a **production or development build** (e.g. `eas build` or a custom dev client), not only in Expo Go.

## Music stops when the phone is not charging (Android)

**What you see:** Playback works fine while the device is **charging** (screen off, next song starts). When you **unplug** the charger, after one or two more songs the music stops and the next track does not start (no logs, nothing until you return to the app).

**Why this happens:** On Android, when the screen is off and the device is **not charging**, the system can enter **Doze mode** (and App Standby) to save battery. In Doze mode the system:

- Restricts background CPU and network
- Defers or suspends JavaScript and timers
- Can kill or suspend your app’s process so “track finished” and other callbacks never run

When the device is **charging**, Android does **not** enter Doze (or exits it), so your app keeps running and playback continues. That’s why you see correct behavior while plugged in and stops after unplugging.

**What we do in the app:** When playback starts we run an Android **foreground service** with type `MEDIA_PLAYBACK` and a “Now playing” notification (`expo-foreground-service`). That tells the OS the app is doing user-visible media playback, so it does not kill or suspend the process when the screen is off and the device is unplugged. The service is stopped when you pause or when the album ends. If `expo-foreground-service` is not installed, the app still runs but may stop after a few tracks when unplugged (same as before).

**Install the foreground service package (required for the fix):**

The package is not on npm; install from GitHub:

```bash
cd music-mobile
npm install github:HashimTheArab/expo-foreground-service
```

Then rebuild the native app so the plugin is applied (Expo Go won’t include the native module):

```bash
npx expo run:android
```

Or create a new build with EAS Build. The plugin in `app.json` uses `MEDIA_PLAYBACK`; the package provides the native foreground service. On Android 13+, the app requests notification permission so the “Now playing” notification can be shown.

**Why playback could work in Expo Go / dev but hang forever in a release build:** The library’s JavaScript `startService(config, callback)` only finishes after `callback()` completes. We must **not** use that API with an infinite “keep alive” callback — it would block `playTrack` after the native service starts. The app uses the **native** `startService(config)` only (via `requireNativeModule('ExpoForegroundService')`), which resolves immediately. Expo Go often doesn’t include this native module, so the old bug looked like “dev works, production doesn’t.”

**If you still see music stop when unplugged:**

1. **Disable battery optimization for this app**  
   - **Settings → Apps → [Music app name] → Battery** → **Unrestricted** (or “Don’t optimize” / “Allow background activity”).

2. **On some brands (Samsung, Huawei, etc.):**  
   **Settings → Battery → Background usage limits** — ensure the app is **not** in “Sleeping” or “Restricted”.

## Viewing logs on an installed (production) build

When the app is installed from a build (not running with `expo start`), you don’t have the Metro terminal. You can still see logs:

### Android

1. **Enable Developer options** on the phone: **Settings → About phone** → tap **Build number** 7 times.
2. **Enable USB debugging**: **Settings → Developer options** → **USB debugging**.
3. Connect the phone to your computer with a USB cable.
4. **Install `adb` (Android Debug Bridge)** if you see `command not found: adb`:
   - **Option A (recommended):** Install [Android Studio](https://developer.android.com/studio). Then `adb` is at `~/Library/Android/sdk/platform-tools/adb`. Add it to your PATH, e.g. in `~/.zshrc`:  
     `export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"`  
     Then run `source ~/.zshrc` or open a new terminal.
   - **Option B:** Install only [Android Platform Tools](https://developer.android.com/studio/releases/platform-tools) and add the folder that contains `adb` to your PATH.
5. In a terminal, run (use **quotes** so zsh doesn’t treat `*` as a glob):

   ```bash
   adb logcat '*:S' 'ReactNative:V' 'ReactNativeJS:V'
   ```

   Or filter by your app’s package name:

   ```bash
   adb logcat --pid=$(adb shell pidof -s com.rojastapiaandres.musicmobile)
   ```

   Then reproduce the issue (e.g. tap a song). You’ll see `console.log` / `console.error` output. Look for lines with `[PLAY]`, `[AUDIO`, `Error`, or your backend URL.

### iOS

Connect the device, open **Xcode → Window → Devices and Simulators**, select the device, then click **Open Console** to stream the device log. Filter by your app name to see logs.

### In-app playback error

When play fails, the app shows a short message in the player bar: **“Play failed: …”** with the error text (e.g. “Network error”, “Could not connect to music server”). So on an installed build you can see why playback failed without using a computer. The message clears when you tap another track or when play succeeds.

## Debugging when a song never starts (without adb)

If you don’t have Android Studio or `adb`, you can still narrow down the problem:

### 1. On the phone – in-app error

Use a build that includes the **“Play failed: …”** message (see **In-app playback error** above). When you tap a song:

- If a **red banner** appears in the player bar with text like “Play failed: …”, read that message. It usually says whether it’s a network error, missing URL, or something else.
- If **nothing** happens (no sound, no error banner), the app may be failing before it can show the error (e.g. crash or hang when loading the stream).

### 2. Railway – backend logs

Your app streams audio from the backend. When you **tap a song**, the app should send a request to your Railway backend for that track.

1. Open **[Railway](https://railway.app)** → your project → **Deployments** (or **Logs** / **Metrics**).
2. On your phone, open the app and **tap a song**.
3. In Railway, check whether a **new request** appears when you tap (e.g. to `/audio-proxy?key=...` or similar).

- **If you see a request** when you tap: the app is reaching the backend. The problem may be the response (e.g. wrong format, 4xx/5xx) or playback on the device (e.g. codec, Expo AV).
- **If you see no request** when you tap: the app is likely not calling the backend (e.g. wrong API URL in the app, no internet on the phone, or the app failing before the request).

That helps you tell “backend not hit” from “backend hit but playback fails”.

### 3. (Optional) Install only `adb`, without Android Studio

To use `adb logcat` later without installing Android Studio:

1. Download **Command line tools only** (platform-tools) from:  
   [https://developer.android.com/studio/releases/platform-tools](https://developer.android.com/studio/releases/platform-tools)
2. Unzip and add the folder that contains `adb` to your `PATH` (e.g. in `~/.zshrc`:  
   `export PATH="/path/to/platform-tools:$PATH"`).

Then you can use the `adb logcat` commands from the **Viewing logs** section above.

## Troubleshooting

### Audio Not Playing

- Ensure the backend is running and accessible
- Check network connectivity (phone and backend must reach each other; production backend URL in `api.ts` must be correct)
- Verify track URLs are valid
- Use **Viewing logs on an installed (production) build** above to see the exact error in logcat (Android) or Xcode console (iOS)
- In Expo Go, background audio may be limited - use a production build for full functionality

### Backend Connection Issues

- Verify the backend URL in `src/services/api.ts`
- Check that the backend server is running
- Ensure CORS is properly configured on the backend
- Check network connectivity

### Build Issues

- Clear cache: `expo start -c`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Expo SDK version compatibility

## Development Notes

- The app uses React Navigation for screen navigation
- Audio state is managed globally via React Context
- The app supports both Expo Go (development) and standalone builds (production)
- Background audio playback works best in production builds

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Version

Current version: **1.0.4**

---

Built with ❤️ using React Native and Expo


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

**If you still see music stop when unplugged:**

1. **Disable battery optimization for this app**  
   - **Settings → Apps → [Music app name] → Battery** → **Unrestricted** (or “Don’t optimize” / “Allow background activity”).

2. **On some brands (Samsung, Huawei, etc.):**  
   **Settings → Battery → Background usage limits** — ensure the app is **not** in “Sleeping” or “Restricted”.

## Troubleshooting

### Audio Not Playing

- Ensure the backend is running and accessible
- Check network connectivity
- Verify track URLs are valid
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


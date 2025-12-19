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

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

> Note: You'll need to configure EAS (Expo Application Services) first. See the [Expo documentation](https://docs.expo.dev/build/introduction/) for details.

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


import TrackPlayer, { 
  Track as RNTrack, 
  State, 
  Event,
  AppKilledPlaybackBehavior,
  Capability
} from 'react-native-track-player';

export class AudioService {
  private static instance: AudioService;
  private isInitialized = false;

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      await TrackPlayer.setupPlayer({});
      
      // Configure capabilities (what controls are available)
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
      });

      this.isInitialized = true;
      console.log('🎵 AudioService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing AudioService:', error);
      throw error;
    }
  }

  async play() {
    await TrackPlayer.play();
  }

  async pause() {
    await TrackPlayer.pause();
  }

  async skipToNext() {
    await TrackPlayer.skipToNext();
  }

  async skipToPrevious() {
    await TrackPlayer.skipToPrevious();
  }

  async seekTo(position: number) {
    await TrackPlayer.seekTo(position);
  }

  async addTrack(track: RNTrack) {
    await TrackPlayer.add(track);
  }

  async setQueue(tracks: RNTrack[]) {
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
  }

  async getCurrentTrack() {
    return await TrackPlayer.getActiveTrack();
  }

  async getPosition() {
    return await TrackPlayer.getPosition();
  }

  async getDuration() {
    return await TrackPlayer.getDuration();
  }

  async getState() {
    return await TrackPlayer.getPlaybackState();
  }

  // Convert our Track interface to React Native Track Player format
  convertTrackToRNTrack(track: any, streamingUrl: string): RNTrack {
    return {
      id: `${track.artist}-${track.album}-${track.title}`,
      url: streamingUrl,
      title: track.title,
      artist: track.artist,
      album: track.album,
      artwork: track.thumbnail || undefined,
    };
  }
}

// Export singleton instance
export const audioService = AudioService.getInstance();

import { Audio } from 'expo-av';
import { Track } from '../types/Track';

export class ExpoAudioService {
  private static instance: ExpoAudioService;
  private sound: Audio.Sound | null = null;
  private currentTrack: Track | null = null;
  private isInitialized = false;

  static getInstance(): ExpoAudioService {
    if (!ExpoAudioService.instance) {
      ExpoAudioService.instance = new ExpoAudioService();
    }
    return ExpoAudioService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      this.isInitialized = true;
      console.log('🎵 ExpoAudioService initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing ExpoAudioService:', error);
      throw error;
    }
  }

  async playTrack(track: Track, streamingUrl: string) {
    try {
      console.log('🎵 Playing track:', track.title);
      
      // Stop and unload previous sound
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }

      // Create and load new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamingUrl },
        { shouldPlay: true, isLooping: false }
      );

      this.sound = sound;
      this.currentTrack = track;

      console.log('✅ Track loaded and playing:', track.title);
    } catch (error) {
      console.error('❌ Error playing track:', error);
      throw error;
    }
  }

  async pause() {
    if (this.sound) {
      await this.sound.pauseAsync();
      console.log('⏸️ Track paused');
    }
  }

  async resume() {
    if (this.sound) {
      await this.sound.playAsync();
      console.log('▶️ Track resumed');
    }
  }

  async stop() {
    if (this.sound) {
      await this.sound.stopAsync();
      console.log('⏹️ Track stopped');
    }
  }

  async getStatus() {
    if (this.sound) {
      return await this.sound.getStatusAsync();
    }
    return null;
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  async setPosition(positionMillis: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMillis);
    }
  }

  async cleanup() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
      this.currentTrack = null;
    }
  }
}

// Export singleton instance
export const expoAudioService = ExpoAudioService.getInstance();

import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { Track } from '../types/Track';

export class ExpoAudioService {
  private static instance: ExpoAudioService;
  private sound: Audio.Sound | null = null;
  private currentTrack: Track | null = null;
  private isInitialized = false;
  private onPlaybackStatusUpdateCallback: ((status: AVPlaybackStatus) => void) | null = null;
  /** Preloaded next track (loaded while current is playing to avoid background load failure) */
  private preloadedSound: Audio.Sound | null = null;
  private preloadedUrl: string | null = null;

  static getInstance(): ExpoAudioService {
    if (!ExpoAudioService.instance) {
      ExpoAudioService.instance = new ExpoAudioService();
    }
    return ExpoAudioService.instance;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log(`🔧 Initializing audio service on ${Platform.OS}...`);
      
      // Configure audio mode for playback. Set all params so Android respects background playback
      // (some devices ignore background audio if only staysActiveInBackground is set).
      const audioModeConfig: any = {
        staysActiveInBackground: true,
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      };

      if (Platform.OS === 'ios') {
        if ((Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX !== undefined) {
          audioModeConfig.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX;
        }
        console.log('📱 Configured iOS audio properties');
      } else if (Platform.OS === 'android') {
        audioModeConfig.shouldDuckAndroid = true;
        audioModeConfig.playThroughEarpieceAndroid = false; // Use speaker, not earpiece
        if ((Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== undefined) {
          audioModeConfig.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
        }
        console.log('🤖 Configured Android audio properties (full mode for background)');
      }

      console.log('🔧 Audio config:', JSON.stringify(audioModeConfig, null, 2));
      await Audio.setAudioModeAsync(audioModeConfig);

      this.isInitialized = true;
      console.log(`✅ ExpoAudioService initialized successfully on ${Platform.OS}`);
    } catch (error: any) {
      console.error('❌ Error initializing ExpoAudioService:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        platform: Platform.OS
      });
      
      // Don't throw - try to continue with minimal config
      console.warn('⚠️ Attempting minimal audio configuration...');
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
        });
        this.isInitialized = true;
        console.log('✅ Minimal audio configuration successful');
      } catch (minimalError) {
        console.error('❌ Minimal audio configuration also failed:', minimalError);
        throw error; // Throw original error if minimal also fails
      }
    }
  }

  setOnPlaybackStatusUpdate(callback: (status: AVPlaybackStatus) => void) {
    this.onPlaybackStatusUpdateCallback = callback;
    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate(callback);
    }
  }

  /** Preload the next track while current is playing so we don't need to load in background */
  async preloadNextTrack(streamingUrl: string): Promise<void> {
    if (!streamingUrl?.trim()) return;
    if (this.preloadedUrl === streamingUrl) return;
    try {
      this.clearPreloaded();
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamingUrl },
        { shouldPlay: false, isLooping: false }
      );
      this.preloadedSound = sound;
      this.preloadedUrl = streamingUrl;
      console.log('✅ [PRELOAD] Next track preloaded');
    } catch (e: any) {
      console.warn('⚠️ [PRELOAD] Failed to preload next track:', e?.message);
      this.clearPreloaded();
    }
  }

  clearPreloaded(): void {
    if (this.preloadedSound) {
      this.preloadedSound.unloadAsync().catch(() => {});
      this.preloadedSound = null;
    }
    this.preloadedUrl = null;
  }

  async playTrack(track: Track, streamingUrl: string) {
    try {
      console.log('🎵 Playing track:', track.title);
      console.log('🔗 Streaming URL:', streamingUrl.substring(0, 100) + '...');

      if (!streamingUrl || streamingUrl.trim() === '') {
        throw new Error('Invalid streaming URL: URL is empty');
      }

      // Use preloaded sound if we have it for this URL (avoids loading in background)
      if (this.preloadedUrl === streamingUrl && this.preloadedSound) {
        console.log('✅ [PLAY] Using preloaded sound for next track');
        if (this.sound) {
          try {
            await this.sound.unloadAsync();
          } catch {
            // ignore
          }
          this.sound = null;
        }
        this.sound = this.preloadedSound;
        this.preloadedSound = null;
        this.preloadedUrl = null;
        this.currentTrack = track;
        if (this.onPlaybackStatusUpdateCallback) {
          this.sound.setOnPlaybackStatusUpdate(this.onPlaybackStatusUpdateCallback);
        }
        await this.sound.playAsync();
        console.log('✅ Track loaded and playing (from preload):', track.title);
        const initialStatus = await this.sound.getStatusAsync();
        if (initialStatus.isLoaded) {
          console.log('🎵 Initial playback status:', {
            isPlaying: initialStatus.isPlaying,
            position: initialStatus.positionMillis,
            duration: initialStatus.durationMillis,
          });
        }
        return;
      }
      this.clearPreloaded();

      // Ensure audio mode is set for background playback (same full config as initialize)
      try {
        const audioModeConfig: any = {
          staysActiveInBackground: true,
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        };
        if (Platform.OS === 'ios') {
          if ((Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX !== undefined) {
            audioModeConfig.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX;
          }
        } else if (Platform.OS === 'android') {
          audioModeConfig.shouldDuckAndroid = true;
          audioModeConfig.playThroughEarpieceAndroid = false;
          if ((Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== undefined) {
            audioModeConfig.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
          }
        }
        await Audio.setAudioModeAsync(audioModeConfig);
        console.log(`✅ Audio mode configured for ${Platform.OS}`);
      } catch (audioModeError: any) {
        console.warn('⚠️ Error setting audio mode (continuing anyway):', audioModeError?.message);
        // Try minimal config
        try {
          await Audio.setAudioModeAsync({ staysActiveInBackground: true });
          console.log('✅ Fallback: Set minimal audio mode');
        } catch (e) {
          console.warn('⚠️ Even minimal audio mode failed, but continuing...');
        }
      }
      
      // Stop and unload previous sound
      if (this.sound) {
        try {
          await this.sound.unloadAsync();
          this.sound = null;
          console.log('✅ Previous sound unloaded');
        } catch (unloadError: any) {
          console.warn('⚠️ Error unloading previous sound (continuing anyway):', unloadError?.message);
          this.sound = null;
        }
      }

      console.log('📥 Creating audio sound object...');
      // Create and load new sound with background playback enabled
      // Configure for high-quality audio playback
      // Use shorter update interval for better background detection
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamingUrl },
        { 
          shouldPlay: true, 
          isLooping: false,
          progressUpdateIntervalMillis: 500, // Check every 500ms for better background detection
          volume: 1.0, // Full volume (0.0 to 1.0)
          rate: 1.0, // Normal playback speed (0.5 to 2.0)
          shouldCorrectPitch: true, // Maintain pitch when changing rate
          // Additional quality settings
          isMuted: false,
        }
      );

      this.sound = sound;
      this.currentTrack = track;

      // Set up playback status update listener
      if (this.onPlaybackStatusUpdateCallback) {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            const position = status.positionMillis || 0;
            const duration = status.durationMillis || 0;
            const isPlaying = status.isPlaying || false;
            const didJustFinish = status.didJustFinish || false;

            // Log when track finishes (critical for debugging)
            if (didJustFinish) {
              console.log('🎵 [AUDIO SERVICE] Track finished', {
                timestamp: new Date().toISOString(),
                track: track.title,
                position: `${Math.floor(position / 1000)}s`,
                duration: `${Math.floor(duration / 1000)}s`
              });
            }

            // Log if audio stopped unexpectedly (for debugging)
            if (!isPlaying && !didJustFinish && position > 0 && duration > 0) {
              const remaining = duration - position;
              if (remaining < 5000) { // Only log if close to end
                console.warn('⚠️ [AUDIO SERVICE] Audio stopped near end', {
                  timestamp: new Date().toISOString(),
                  track: track.title,
                  remaining: `${Math.floor(remaining / 1000)}s`,
                  error: (status as any).error
                });
              }
            }
          }

          // Call the original callback
          this.onPlaybackStatusUpdateCallback!(status);
        });
      }

      console.log('✅ Track loaded and playing:', track.title);
      
      // Verify it's actually playing and log comprehensive status
      const initialStatus = await sound.getStatusAsync();
      if (initialStatus.isLoaded) {
        console.log('🎵 Initial playback status:', {
          isPlaying: initialStatus.isPlaying,
          position: initialStatus.positionMillis,
          duration: initialStatus.durationMillis,
          shouldPlay: initialStatus.shouldPlay,
          isBuffering: initialStatus.isBuffering,
          rate: initialStatus.rate,
          volume: initialStatus.volume
        });
        
        if (!initialStatus.isPlaying) {
          console.warn('⚠️ Sound created but not playing! Attempting to start...');
          try {
            await sound.playAsync();
            const retryStatus = await sound.getStatusAsync();
            if (retryStatus.isLoaded && retryStatus.isPlaying) {
              console.log('✅ Successfully started playback after retry');
            }
          } catch (playError) {
            console.error('❌ Failed to start playback:', playError);
          }
        }
      } else {
        console.error('❌ Sound status not loaded:', initialStatus);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error loading audio';
      const errorCode = error?.code || error?.status || 'N/A';
      const errorName = error?.name || 'Unknown';
      
      // Treat Android background load failures (IOException, java.net) as network errors so they can be retried
      const isNetworkOrIoError =
        /network|fetch|econnrefused|ioexception|java\.net|executionexception|connection|timeout/i.test(errorMessage);

      // Use warn for network/IO errors so Expo Go doesn't show red overlay on transient failures (caller will retry)
      const logFn = isNetworkOrIoError ? console.warn : console.error;
      logFn(isNetworkOrIoError ? '⚠️ [AUDIO SERVICE] Network/IO error (retryable):' : '❌ [AUDIO SERVICE] Error playing track:', {
        track: track.title,
        artist: track.artist,
        album: track.album,
        url: streamingUrl?.substring(0, 150),
        error: errorMessage,
        errorCode,
        errorName,
        isNetworkOrIoError,
      });

      if (isNetworkOrIoError) {
        throw new Error(`Network error: Could not load audio (${errorMessage.slice(0, 80)}...)`);
      }
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        throw new Error(`Audio file not found on server. Track: "${track.title}"`);
      }
      if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        throw new Error(`Access denied to audio file. Track: "${track.title}"`);
      }
      if (errorMessage.includes('format') || errorMessage.includes('codec') || errorMessage.includes('unsupported')) {
        throw new Error('Audio format not supported');
      }
      if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        throw new Error('Request timeout: Server took too long to respond');
      }
      throw new Error(`Failed to load audio: ${errorMessage}`);
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
      try {
        console.log(`🎵 [AUDIO SERVICE] Setting position to ${positionMillis}ms`);
        await this.sound.setPositionAsync(positionMillis);
        
        // Verify the position was set
        const status = await this.sound.getStatusAsync();
        if (status && status.isLoaded) {
          const actualPosition = status.positionMillis || 0;
          console.log(`✅ [AUDIO SERVICE] Position set. Actual: ${actualPosition}ms, Expected: ${positionMillis}ms`);
          
          // If there's a significant difference, try again
          if (Math.abs(actualPosition - positionMillis) > 500) {
            console.warn(`⚠️ [AUDIO SERVICE] Position mismatch, retrying...`);
            await this.sound.setPositionAsync(positionMillis);
          }
        }
      } catch (error: any) {
        console.error('❌ [AUDIO SERVICE] Error setting position:', error?.message || error);
        throw error;
      }
    } else {
      console.warn('⚠️ [AUDIO SERVICE] Cannot set position - no sound loaded');
    }
  }

  async cleanup() {
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
      this.currentTrack = null;
    }
  }

  /**
   * Stop and unload current playback and clear preloaded track.
   * Call this before starting a new track so only one song ever plays (e.g. when user taps a song in the list).
   */
  async stopAndUnloadCurrent(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
      } catch {
        // ignore
      }
      try {
        await this.sound.unloadAsync();
      } catch {
        // ignore
      }
      this.sound = null;
      this.currentTrack = null;
    }
    this.clearPreloaded();
  }
}

// Export singleton instance
export const expoAudioService = ExpoAudioService.getInstance();

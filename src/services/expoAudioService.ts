import { Audio, AVPlaybackStatus } from 'expo-av';
import { Platform } from 'react-native';
import { Track } from '../types/Track';

export class ExpoAudioService {
  private static instance: ExpoAudioService;
  private sound: Audio.Sound | null = null;
  private currentTrack: Track | null = null;
  private isInitialized = false;
  private onPlaybackStatusUpdateCallback: ((status: AVPlaybackStatus) => void) | null = null;

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
      
      // Configure audio mode for playback - platform-specific and defensive
      const audioModeConfig: any = {
        staysActiveInBackground: true,
      };

      // Set platform-specific properties
      if (Platform.OS === 'ios') {
        audioModeConfig.allowsRecordingIOS = false;
        audioModeConfig.playsInSilentModeIOS = true;
        // Set interruption mode if available
        if ((Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX !== undefined) {
          audioModeConfig.interruptionModeIOS = (Audio as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX;
        }
        console.log('📱 Configured iOS audio properties');
      } else if (Platform.OS === 'android') {
        audioModeConfig.shouldDuckAndroid = true;
        audioModeConfig.playThroughEarpieceAndroid = false;
        // Set interruption mode if available
        if ((Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX !== undefined) {
          audioModeConfig.interruptionModeAndroid = (Audio as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX;
        }
        console.log('🤖 Configured Android audio properties');
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
    // If there's already a sound loaded, set the callback on it
    if (this.sound) {
      this.sound.setOnPlaybackStatusUpdate(callback);
    }
  }

  async playTrack(track: Track, streamingUrl: string) {
    try {
      console.log('🎵 Playing track:', track.title);
      console.log('🔗 Streaming URL:', streamingUrl.substring(0, 100) + '...');
      
      // Validate URL
      if (!streamingUrl || streamingUrl.trim() === '') {
        throw new Error('Invalid streaming URL: URL is empty');
      }
      
      // Ensure audio mode is set for background playback (re-initialize if needed)
      try {
        const audioModeConfig: any = {
          staysActiveInBackground: true,
        };

        // Set platform-specific properties
        if (Platform.OS === 'ios') {
          audioModeConfig.allowsRecordingIOS = false;
          audioModeConfig.playsInSilentModeIOS = true;
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
      
      console.error('❌ [AUDIO SERVICE] Error playing track:', {
        track: track.title,
        artist: track.artist,
        album: track.album,
        url: streamingUrl?.substring(0, 150),
        error: errorMessage,
        errorCode,
        errorName,
        errorType: typeof error,
        fullError: error,
        stack: error?.stack
      });
      
      // Provide more specific error messages
      if (errorMessage.includes('Network') || errorMessage.includes('fetch') || errorMessage.includes('ECONNREFUSED')) {
        throw new Error('Network error: Could not connect to audio server. Check your internet connection.');
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        throw new Error(`Audio file not found on server. Track: "${track.title}"`);
      } else if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
        throw new Error(`Access denied to audio file. Track: "${track.title}"`);
      } else if (errorMessage.includes('format') || errorMessage.includes('codec') || errorMessage.includes('unsupported')) {
        throw new Error('Audio format not supported');
      } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        throw new Error('Request timeout: Server took too long to respond');
      } else {
        throw new Error(`Failed to load audio: ${errorMessage}`);
      }
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
}

// Export singleton instance
export const expoAudioService = ExpoAudioService.getInstance();

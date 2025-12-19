import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Track } from '../types/Track';
import { AlbumListProps } from '../types/Album';
import { expoAudioService } from '../services/expoAudioService';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface AudioContextType {
  currentTrack: Track | null;
  currentAlbum: AlbumListProps | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  playTrack: (track: Track, album?: AlbumListProps, trackIndex?: number) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export const AudioProvider: React.FC<Props> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentAlbum, setCurrentAlbum] = useState<AlbumListProps | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Use refs to access latest values in callbacks
  const currentAlbumRef = useRef<AlbumListProps | null>(null);
  const currentTrackIndexRef = useRef(-1);
  const playTrackRef = useRef<((track: Track, album?: AlbumListProps, trackIndex?: number) => Promise<void>) | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    currentAlbumRef.current = currentAlbum;
  }, [currentAlbum]);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  // Handle track finished - play next track if available
  // This function uses refs to access latest values, so it can be called from callbacks
  const handleTrackFinished = useCallback(async () => {
    const album = currentAlbumRef.current;
    const trackIndex = currentTrackIndexRef.current;
    const playTrackFn = playTrackRef.current;

    if (album && trackIndex >= 0 && playTrackFn) {
      const nextIndex = trackIndex + 1;
      if (nextIndex < album.tracks.length) {
        console.log(`🎵 Auto-playing next track: ${nextIndex + 1}/${album.tracks.length}`);
        try {
          await playTrackFn(album.tracks[nextIndex], album, nextIndex);
        } catch (error) {
          console.error('❌ Error auto-playing next track:', error);
        }
      } else {
        console.log('🎵 Reached end of album');
        setIsPlaying(false);
      }
    }
  }, []);

  // Initialize audio service and set up playback status listener
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('🚀 Starting audio service initialization...');
        await expoAudioService.initialize();
        console.log('✅ Expo audio service initialized in context');

        // Set up playback status update listener to detect when track finishes
        expoAudioService.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            const wasPlaying = isPlaying;
            const nowPlaying = status.isPlaying || false;
            setIsPlaying(nowPlaying);

            // Log state changes
            if (wasPlaying !== nowPlaying) {
              console.log(`🔄 Playback state changed: ${wasPlaying} → ${nowPlaying}`);
            }

            // Check if track just finished
            if (status.didJustFinish && !status.isLooping) {
              console.log('🎵 Track finished, playing next...');
              // Automatically play next track using refs to get latest values
              handleTrackFinished();
            }
          } else if ((status as any).error) {
            console.error('❌ Playback error in status update:', (status as any).error);
          }
        });
        console.log('✅ Playback status listener configured');
      } catch (error: any) {
        console.error('❌ Error initializing expo audio service:', error);
        console.error('❌ Error details:', {
          message: error?.message,
          code: error?.code,
          stack: error?.stack
        });
      }
    };

    initAudio();
  }, [handleTrackFinished, isPlaying]);

  // Monitor app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`📱 App state changed: ${nextAppState}`);
      
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App went to background/inactive');
        // Just log the status - don't try to manipulate audio
        // Let expo-av handle background playback naturally
        try {
          const status = await expoAudioService.getStatus();
          if (status && status.isLoaded) {
            console.log('🎵 Audio status when going to background:', {
              isPlaying: status.isPlaying,
              positionMillis: status.positionMillis,
              durationMillis: status.durationMillis
            });
          }
        } catch (error) {
          console.error('❌ Error checking audio status on background:', error);
        }
      } else if (nextAppState === 'active') {
        console.log('📱 App came to foreground');
        // Check audio status when coming to foreground
        try {
          const status = await expoAudioService.getStatus();
          if (status && status.isLoaded) {
            console.log('🎵 Audio status when coming to foreground:', {
              isPlaying: status.isPlaying,
              positionMillis: status.positionMillis,
              durationMillis: status.durationMillis,
              shouldPlay: status.shouldPlay,
              rate: status.rate
            });
            
            const wasPlaying = isPlaying;
            const nowPlaying = status.isPlaying || false;
            
            // Update playing state
            setIsPlaying(nowPlaying);
            
            if (nowPlaying && !wasPlaying) {
              console.log('✅ Audio resumed automatically when returning to app');
            } else if (!nowPlaying && wasPlaying) {
              console.warn('⚠️ Audio was paused when returning to app');
              console.warn('⚠️ This is expected in Expo Go - background audio is limited');
            } else if (nowPlaying && wasPlaying) {
              console.log('✅ Audio continued playing through background');
            }
          } else {
            console.warn('⚠️ No audio loaded when returning to foreground');
          }
        } catch (error) {
          console.error('❌ Error checking audio status on foreground:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Also check initial state
    console.log(`📱 Initial app state: ${AppState.currentState}`);
    
    return () => {
      subscription.remove();
    };
  }, [currentTrack, isPlaying]);

  // Monitor audio status (fallback, but playback status update is primary)
  useEffect(() => {
    const checkAudioStatus = async () => {
      try {
        const status = await expoAudioService.getStatus();
        if (status && status.isLoaded) {
          const wasPlaying = isPlaying;
          const nowPlaying = status.isPlaying || false;
          setIsPlaying(nowPlaying);
          
          // Log if playback state changed unexpectedly
          if (wasPlaying !== nowPlaying && currentTrack) {
            console.log(`🔄 Audio playback state changed: ${wasPlaying} → ${nowPlaying}`, {
              track: currentTrack.title,
              position: status.positionMillis,
              duration: status.durationMillis
            });
          }
        }
      } catch (error) {
        // Ignore errors when no audio is loaded
      }
    };

    const interval = setInterval(checkAudioStatus, 2000); // Less frequent since we have status updates
    return () => clearInterval(interval);
  }, [currentTrack, isPlaying]);

  const playTrack = useCallback(async (track: Track, album?: AlbumListProps, trackIndex?: number) => {
    try {
      setIsLoading(true);
      setCurrentTrack(track);
      
      // Store album and track index for auto-play next functionality
      if (album !== undefined) {
        setCurrentAlbum(album);
        currentAlbumRef.current = album;
      }
      if (trackIndex !== undefined) {
        setCurrentTrackIndex(trackIndex);
        currentTrackIndexRef.current = trackIndex;
      }
      
      // Get streaming URL
      let streamingUrl = track.src;
      if (!streamingUrl) {
        if (!track.key) {
          const errorMsg = `Track "${track.title}" does not have a valid key for streaming`;
          console.error('❌', errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log(`🔗 Getting streaming URL for track: ${track.title}, key: ${track.key}`);
        try {
          const { getTrackStreamingUrl } = await import('../utils/dataTransformers');
          streamingUrl = await getTrackStreamingUrl(track);
          console.log(`✅ Got streaming URL: ${streamingUrl.substring(0, 100)}...`);
          track.src = streamingUrl; // Cache it
        } catch (urlError: any) {
          const errorMsg = `Failed to get streaming URL: ${urlError?.message || 'Unknown error'}`;
          console.error('❌', errorMsg, urlError);
          throw new Error(errorMsg);
        }
      }
      
      if (!streamingUrl || streamingUrl.trim() === '') {
        const errorMsg = `Invalid streaming URL for track "${track.title}"`;
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log(`🎵 Attempting to play track: ${track.title}`);
      await expoAudioService.playTrack(track, streamingUrl);
      setIsPlaying(true);
      console.log(`✅ Successfully started playing: ${track.title}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      console.error('❌ Error playing track from context:', {
        track: track.title,
        artist: track.artist,
        album: track.album,
        error: errorMessage,
        fullError: error
      });
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Store playTrack in ref so it can be accessed in callbacks
  useEffect(() => {
    playTrackRef.current = playTrack;
  }, [playTrack]);

  const pauseTrack = async () => {
    try {
      await expoAudioService.pause();
      setIsPlaying(false);
    } catch (error) {
      console.error('❌ Error pausing track:', error);
    }
  };

  const resumeTrack = async () => {
    try {
      await expoAudioService.resume();
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ Error resuming track:', error);
    }
  };

  const skipToNext = async () => {
    if (currentAlbum && currentTrackIndex >= 0) {
      const nextIndex = currentTrackIndex + 1;
      if (nextIndex < currentAlbum.tracks.length) {
        await playTrack(currentAlbum.tracks[nextIndex], currentAlbum, nextIndex);
      }
    }
  };

  const skipToPrevious = async () => {
    if (currentAlbum && currentTrackIndex > 0) {
      const prevIndex = currentTrackIndex - 1;
      await playTrack(currentAlbum.tracks[prevIndex], currentAlbum, prevIndex);
    }
  };

  const value: AudioContextType = {
    currentTrack,
    currentAlbum,
    currentTrackIndex,
    isPlaying,
    isLoading,
    playTrack,
    pauseTrack,
    resumeTrack,
    skipToNext,
    skipToPrevious,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

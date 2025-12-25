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
    const currentTrackTitle = currentTrack?.title || 'Unknown';

    console.log('🎵 [TRACK FINISHED HANDLER] Called', {
      hasAlbum: !!album,
      trackIndex,
      albumTracksCount: album?.tracks.length || 0,
      currentTrack: currentTrackTitle,
      appState: AppState.currentState
    });

    if (album && trackIndex >= 0 && playTrackFn) {
      const nextIndex = trackIndex + 1;
      if (nextIndex < album.tracks.length) {
        const nextTrack = album.tracks[nextIndex];
        console.log(`🎵 [AUTO-PLAY] Starting next track: ${nextIndex + 1}/${album.tracks.length}`, {
          nextTrackTitle: nextTrack.title,
          nextTrackArtist: nextTrack.artist,
          appState: AppState.currentState
        });
        try {
          await playTrackFn(nextTrack, album, nextIndex);
          console.log(`✅ [AUTO-PLAY] Successfully started next track: ${nextTrack.title}`);
        } catch (error: any) {
          console.error('❌ [AUTO-PLAY] Error auto-playing next track:', {
            error: error?.message,
            nextTrack: nextTrack.title,
            fullError: error
          });
        }
      } else {
        console.log('🎵 [END OF ALBUM] Reached end of album - stopping playback', {
          totalTracks: album.tracks.length,
          lastTrackIndex: trackIndex
        });
        setIsPlaying(false);
      }
    } else {
      console.warn('⚠️ [TRACK FINISHED] Cannot auto-play next track:', {
        hasAlbum: !!album,
        trackIndex,
        hasPlayTrackFn: !!playTrackFn
      });
    }
  }, [currentTrack]);

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
            const positionMillis = status.positionMillis || 0;
            const durationMillis = status.durationMillis || 0;
            const didJustFinish = status.didJustFinish || false;
            const appState = AppState.currentState;

            setIsPlaying(nowPlaying);

            // Log state changes
            if (wasPlaying !== nowPlaying) {
              console.log(`🔄 [STATUS UPDATE] Playback state changed: ${wasPlaying} → ${nowPlaying}`, {
                appState,
                position: `${Math.floor(positionMillis / 1000)}s`,
                duration: `${Math.floor(durationMillis / 1000)}s`
              });
            }

            // Check if track just finished (primary method)
            if (didJustFinish && !status.isLooping) {
              console.log('🎵 [STATUS UPDATE] Track finished (didJustFinish=true), playing next...', {
                appState,
                currentTrack: currentTrack?.title,
                position: positionMillis,
                duration: durationMillis
              });
              // Automatically play next track using refs to get latest values
              handleTrackFinished();
            }
            // Fallback: Check if position reached duration (for background scenarios)
            else if (durationMillis > 0 && positionMillis >= durationMillis - 100 && wasPlaying && !nowPlaying) {
              // Allow 100ms tolerance for timing issues
              console.log('🎵 [STATUS UPDATE] Track finished (position reached duration), playing next...', {
                appState,
                currentTrack: currentTrack?.title,
                position: positionMillis,
                duration: durationMillis,
                difference: durationMillis - positionMillis
              });
              // Small delay to ensure didJustFinish wasn't just about to fire
              setTimeout(() => {
                expoAudioService.getStatus().then((latestStatus) => {
                  if (latestStatus && latestStatus.isLoaded && !latestStatus.isPlaying && !latestStatus.didJustFinish) {
                    console.log('🎵 [FALLBACK] Confirmed track finished, triggering next track');
                    handleTrackFinished();
                  }
                });
              }, 200);
            }
          } else if ((status as any).error) {
            console.error('❌ [STATUS UPDATE] Playback error:', {
              error: (status as any).error,
              appState: AppState.currentState
            });
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

  // Monitor audio status (fallback for background scenarios)
  useEffect(() => {
    const checkAudioStatus = async () => {
      try {
        const status = await expoAudioService.getStatus();
        if (status && status.isLoaded) {
          const wasPlaying = isPlaying;
          const nowPlaying = status.isPlaying || false;
          const positionMillis = status.positionMillis || 0;
          const durationMillis = status.durationMillis || 0;
          const appState = AppState.currentState;
          
          setIsPlaying(nowPlaying);
          
          // Check if track finished in background (position reached duration)
          if (wasPlaying && !nowPlaying && durationMillis > 0 && positionMillis >= durationMillis - 500) {
            // Allow 500ms tolerance for background timing
            console.log('🎵 [BACKGROUND CHECK] Track appears to have finished', {
              appState,
              currentTrack: currentTrack?.title,
              position: `${Math.floor(positionMillis / 1000)}s`,
              duration: `${Math.floor(durationMillis / 1000)}s`,
              difference: `${Math.floor((durationMillis - positionMillis) / 1000)}s`
            });
            
            // Double-check with a small delay
            setTimeout(async () => {
              const latestStatus = await expoAudioService.getStatus();
              if (latestStatus && latestStatus.isLoaded && !latestStatus.isPlaying && !latestStatus.didJustFinish) {
                console.log('🎵 [BACKGROUND CHECK] Confirmed - triggering next track');
                handleTrackFinished();
              }
            }, 300);
          }
          
          // Log if playback state changed unexpectedly
          if (wasPlaying !== nowPlaying && currentTrack) {
            console.log(`🔄 [STATUS CHECK] Audio playback state changed: ${wasPlaying} → ${nowPlaying}`, {
              track: currentTrack.title,
              appState,
              position: `${Math.floor(positionMillis / 1000)}s`,
              duration: `${Math.floor(durationMillis / 1000)}s`
            });
          }
        }
      } catch (error) {
        // Ignore errors when no audio is loaded
      }
    };

    // Check more frequently when app is in background to catch track finishes
    const interval = setInterval(checkAudioStatus, 1500);
    return () => clearInterval(interval);
  }, [currentTrack, isPlaying, handleTrackFinished]);

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

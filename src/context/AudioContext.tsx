import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Track } from '../types/Track';
import { AlbumListProps } from '../types/Album';
import { expoAudioService } from '../services/expoAudioService';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { createShuffledPlaylist } from '../utils/trackUtils';

interface AudioContextType {
  currentTrack: Track | null;
  currentAlbum: AlbumListProps | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isShuffled: boolean;
  playTrack: (track: Track, album?: AlbumListProps, trackIndex?: number) => Promise<void>;
  playShuffled: (album: AlbumListProps) => Promise<void>;
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
  const [isShuffled, setIsShuffled] = useState(false);

  // Use refs to access latest values in callbacks (critical for background execution)
  const currentAlbumRef = useRef<AlbumListProps | null>(null);
  const currentTrackIndexRef = useRef(-1);
  const playTrackRef = useRef<((track: Track, album?: AlbumListProps, trackIndex?: number, retryCount?: number, isFromShuffle?: boolean) => Promise<void>) | null>(null);
  const trackFinishedTriggeredRef = useRef<string | null>(null);
  const lastKnownPositionRef = useRef<number>(0);
  const lastKnownDurationRef = useRef<number>(0);
  const shuffledIndexMapRef = useRef<Map<number, number>>(new Map()); // Maps shuffled index to original index
  const isShuffledRef = useRef<boolean>(false); // Ref to track shuffle state for immediate access

  // Keep refs in sync with state
  useEffect(() => {
    currentAlbumRef.current = currentAlbum;
  }, [currentAlbum]);

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex;
  }, [currentTrackIndex]);

  useEffect(() => {
    isShuffledRef.current = isShuffled;
    console.log('🔀 [STATE] isShuffled state updated:', isShuffled);
  }, [isShuffled]);

  // Handle track finished - play next track if available
  const handleTrackFinished = useCallback(async () => {
    const album = currentAlbumRef.current;
    const trackIndex = currentTrackIndexRef.current;
    const playTrackFn = playTrackRef.current;
    const appState = AppState.currentState;
    const isBackground = appState === 'background' || appState === 'inactive';

    console.log('🎵 [TRACK FINISHED] Handler called', {
      timestamp: new Date().toISOString(),
      hasAlbum: !!album,
      trackIndex,
      albumTracksCount: album?.tracks.length || 0,
      currentTrack: currentTrack?.title,
      appState,
      isBackground
    });

    if (!album || trackIndex < 0 || !playTrackFn) {
      console.warn('⚠️ [TRACK FINISHED] Cannot auto-play - missing data', {
        hasAlbum: !!album,
        trackIndex,
        hasPlayTrackFn: !!playTrackFn
      });
      return;
    }

    const nextIndex = trackIndex + 1;
    if (nextIndex >= album.tracks.length) {
      console.log('🎵 [TRACK FINISHED] End of album reached');
      setIsPlaying(false);
      return;
    }

    const nextTrack = album.tracks[nextIndex];
    const currentlyShuffled = isShuffledRef.current;
    
    console.log('🎵 [AUTO-PLAY] Starting next track', {
      nextTrack: nextTrack.title,
      index: `${nextIndex + 1}/${album.tracks.length}`,
      appState,
      isShuffled: currentlyShuffled
    });

    try {
      // In background, play immediately without delays to avoid JS execution being paused
      if (isBackground) {
        console.log('⚡ [AUTO-PLAY] Background mode - playing immediately');
      } else {
        // In foreground, pre-cache URL if not already cached
        if (!nextTrack.src && nextTrack.key) {
          try {
            const { getTrackStreamingUrl } = await import('../utils/dataTransformers');
            nextTrack.src = await getTrackStreamingUrl(nextTrack);
            console.log('✅ [AUTO-PLAY] URL pre-cached');
          } catch (error: any) {
            console.warn('⚠️ [AUTO-PLAY] Could not pre-cache URL:', error?.message);
          }
        }
      }

      // If shuffle is active, pass isFromShuffle flag to maintain shuffle state
      if (currentlyShuffled) {
        console.log('🔀 [AUTO-PLAY] Shuffle active - maintaining shuffle state for next track');
        // Call playTrack with isFromShuffle flag to preserve shuffle state
        await playTrackFn(nextTrack, album, nextIndex, 0, true);
      } else {
        await playTrackFn(nextTrack, album, nextIndex);
      }
      
      console.log('✅ [AUTO-PLAY] Next track started successfully', {
        track: nextTrack.title,
        timestamp: new Date().toISOString(),
        shuffleMaintained: currentlyShuffled
      });
      trackFinishedTriggeredRef.current = null;
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      const isNetworkError = errorMsg.includes('Network') || 
                            errorMsg.includes('UnknownHostException') || 
                            errorMsg.includes('Unable to resolve') ||
                            errorMsg.includes('E_LOAD_ERROR');

      console.error('❌ [AUTO-PLAY] Error starting next track', {
        error: errorMsg,
        nextTrack: nextTrack.title,
        isNetworkError,
        appState
      });

      // For network errors in background, set up retry when app becomes active
      if (isNetworkError && isBackground) {
        console.log('🔄 [AUTO-PLAY] Will retry when app becomes active');
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            subscription.remove();
                  setTimeout(async () => {
                    try {
                      // Maintain shuffle state on retry if shuffle was active
                      const wasShuffled = isShuffledRef.current;
                      if (wasShuffled) {
                        await playTrack(nextTrack, album, nextIndex, 0, true);
                      } else {
                        await playTrackFn(nextTrack, album, nextIndex);
                      }
                    } catch (retryError) {
                      console.error('❌ [AUTO-PLAY] Retry failed:', retryError);
                      setIsPlaying(false);
                    }
                  }, 500);
          }
        });
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentTrack]);

  // Initialize audio service and set up playback status listener
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('🚀 [INIT] Initializing audio service...');
        await expoAudioService.initialize();
        console.log('✅ [INIT] Audio service initialized');

        // Set up playback status update listener
        expoAudioService.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            if ((status as any).error) {
              console.error('❌ [STATUS] Playback error:', (status as any).error);
            }
            return;
          }

          const positionMillis = status.positionMillis || 0;
          const durationMillis = status.durationMillis || 0;
          const didJustFinish = status.didJustFinish || false;
          const nowPlaying = status.isPlaying || false;
          const appState = AppState.currentState;
          const isBackground = appState === 'background' || appState === 'inactive';

          // Update state
          setIsPlaying(nowPlaying);
          lastKnownPositionRef.current = positionMillis;
          lastKnownDurationRef.current = durationMillis;

          // Primary detection: didJustFinish flag (most reliable)
          if (didJustFinish && !status.isLooping) {
            const currentTrackKey = currentTrack ? `${currentTrack.title}-${currentTrack.artist}` : null;
            if (currentTrackKey && trackFinishedTriggeredRef.current !== currentTrackKey) {
              console.log('🎵 [STATUS] Track finished (didJustFinish)', {
                timestamp: new Date().toISOString(),
                track: currentTrack?.title,
                appState,
                isBackground,
                position: `${Math.floor(positionMillis / 1000)}s`,
                duration: `${Math.floor(durationMillis / 1000)}s`
              });
              
              trackFinishedTriggeredRef.current = currentTrackKey;
              // Execute immediately - don't await to avoid blocking
              handleTrackFinished().catch((error) => {
                console.error('❌ [STATUS] Error in handleTrackFinished:', error);
              });
            }
          }
        });

        console.log('✅ [INIT] Playback status listener configured');
      } catch (error: any) {
        console.error('❌ [INIT] Error initializing audio service:', error);
      }
    };

    initAudio();
  }, [handleTrackFinished]);

  // Monitor app state changes - critical for detecting missed track finishes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`📱 [APP STATE] Changed to: ${nextAppState}`);

      if (nextAppState === 'active') {
        // When app becomes active, check if track finished while in background
        try {
          const status = await expoAudioService.getStatus();
          if (status && status.isLoaded && currentTrack) {
            const positionMillis = status.positionMillis || 0;
            const durationMillis = status.durationMillis || 0;
            const didJustFinish = status.didJustFinish || false;
            const nowPlaying = status.isPlaying || false;
            const remaining = durationMillis > 0 ? durationMillis - positionMillis : 0;
            const currentTrackKey = `${currentTrack.title}-${currentTrack.artist}`;

            console.log('🔍 [FOREGROUND CHECK] Checking audio status', {
              isPlaying: nowPlaying,
              position: `${Math.floor(positionMillis / 1000)}s`,
              duration: `${Math.floor(durationMillis / 1000)}s`,
              remaining: `${Math.floor(remaining / 1000)}s`,
              didJustFinish,
              currentTrack: currentTrack.title
            });

            // Check if track finished while app was in background
            // This handles cases where JS execution was paused and callbacks didn't fire
            const trackFinished = didJustFinish || 
                                 (durationMillis > 0 && remaining <= 1000 && remaining >= -2000 && !nowPlaying);

            if (trackFinished && trackFinishedTriggeredRef.current !== currentTrackKey) {
              console.log('🔍 [FOREGROUND CHECK] Track finished while in background - playing next', {
                didJustFinish,
                remaining: `${Math.floor(remaining / 1000)}s`,
                nowPlaying
              });
              
              trackFinishedTriggeredRef.current = currentTrackKey;
              handleTrackFinished().catch((error) => {
                console.error('❌ [FOREGROUND CHECK] Error in handleTrackFinished:', error);
              });
            } else {
              setIsPlaying(nowPlaying);
            }
          }
        } catch (error) {
          console.error('❌ [FOREGROUND CHECK] Error checking status:', error);
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Log when going to background for debugging
        try {
          const status = await expoAudioService.getStatus();
          if (status && status.isLoaded) {
            console.log('📱 [APP STATE] Going to background', {
              isPlaying: status.isPlaying,
              position: `${Math.floor((status.positionMillis || 0) / 1000)}s`,
              duration: `${Math.floor((status.durationMillis || 0) / 1000)}s`
            });
          }
        } catch (error) {
          // Ignore errors
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    console.log(`📱 [APP STATE] Initial state: ${AppState.currentState}`);

    return () => {
      subscription.remove();
    };
  }, [currentTrack, handleTrackFinished]);

  // Periodic background check (fallback for extended background periods)
  useEffect(() => {
    if (!currentTrack) return;

    // Reset trigger when track changes
    trackFinishedTriggeredRef.current = null;

    const checkStatus = async () => {
      try {
        const status = await expoAudioService.getStatus();
        if (!status || !status.isLoaded) return;

        const positionMillis = status.positionMillis || 0;
        const durationMillis = status.durationMillis || 0;
        const didJustFinish = status.didJustFinish || false;
        const nowPlaying = status.isPlaying || false;
        const appState = AppState.currentState;
        const isBackground = appState === 'background' || appState === 'inactive';
        const currentTrackKey = `${currentTrack.title}-${currentTrack.artist}`;

        // Only check in background to avoid duplicate triggers
        if (isBackground && durationMillis > 0 && positionMillis > 0) {
          const remaining = durationMillis - positionMillis;
          
          // Check if track finished (position at or past end)
          if (!nowPlaying && remaining <= 2000 && remaining >= -2000 && 
              trackFinishedTriggeredRef.current !== currentTrackKey) {
            console.log('🔍 [PERIODIC CHECK] Track appears finished', {
              timestamp: new Date().toISOString(),
              track: currentTrack.title,
              remaining: `${Math.floor(remaining / 1000)}s`,
              didJustFinish
            });

            // Double-check after a short delay
            setTimeout(async () => {
              const latestStatus = await expoAudioService.getStatus();
              if (latestStatus && latestStatus.isLoaded) {
                const latestRemaining = (latestStatus.durationMillis || 0) - (latestStatus.positionMillis || 0);
                if (!latestStatus.isPlaying && latestRemaining <= 2000 && latestRemaining >= -2000 &&
                    trackFinishedTriggeredRef.current !== currentTrackKey) {
                  console.log('🔍 [PERIODIC CHECK] Confirmed - triggering next track');
                  trackFinishedTriggeredRef.current = currentTrackKey;
                  handleTrackFinished().catch((error) => {
                    console.error('❌ [PERIODIC CHECK] Error:', error);
                  });
                }
              }
            }, 500);
          }
        }

        setIsPlaying(nowPlaying);
      } catch (error) {
        // Ignore errors
      }
    };

    // Check every 2 seconds in background, 5 seconds in foreground
    const appState = AppState.currentState;
    const isBackground = appState === 'background' || appState === 'inactive';
    const interval = setInterval(checkStatus, isBackground ? 2000 : 5000);

    return () => clearInterval(interval);
  }, [currentTrack, handleTrackFinished]);

  const playTrack = useCallback(async (track: Track, album?: AlbumListProps, trackIndex?: number, retryCount: number = 0, isFromShuffle: boolean = false) => {
    const maxRetries = 3;
    const retryDelay = 1000 * (retryCount + 1);

    try {
      setIsLoading(true);
      setCurrentTrack(track);
      trackFinishedTriggeredRef.current = null; // Reset trigger for new track

      if (album !== undefined) {
        // Check if this is a different album (not just a different track in the same album)
        const isNewAlbum = currentAlbum?.album !== album.album || currentAlbum?.author !== album.author;
        
        // Use ref to get current shuffle state (avoids race condition with async state updates)
        const currentlyShuffled = isShuffledRef.current;
        
        // If this call is from playShuffled, don't reset shuffle state
        if (isFromShuffle) {
          console.log('🔀 [PLAY] Called from shuffle - maintaining shuffle state');
          setCurrentAlbum(album);
          currentAlbumRef.current = album;
        } else {
          // If we're in shuffle mode, check if user is manually selecting from original album
          let isExitingShuffle = false;
          if (currentlyShuffled && !isNewAlbum && currentAlbum && album.tracks.length === currentAlbum.tracks.length) {
            // Check if tracks match in order - if they match, it's the same shuffled album (continue shuffle)
            // If they don't match, user likely selected from original album (exit shuffle)
            const tracksMatch = album.tracks.every((track, index) => 
              currentAlbum.tracks[index]?.title === track.title &&
              currentAlbum.tracks[index]?.artist === track.artist
            );
            
            // If tracks don't match AND we have a shuffle map, user likely selected from original album
            if (!tracksMatch && shuffledIndexMapRef.current.size > 0) {
              isExitingShuffle = true;
              console.log('🔀 [PLAY] Detected exit from shuffle mode - tracks don\'t match');
            } else if (tracksMatch) {
              console.log('🔀 [PLAY] Same shuffled album - maintaining shuffle mode');
            }
          }
          
          setCurrentAlbum(album);
          currentAlbumRef.current = album;
          
          // Reset shuffle state if it's a new album or user is exiting shuffle mode
          if (isNewAlbum || isExitingShuffle) {
            console.log('🔀 [PLAY] Resetting shuffle state', { isNewAlbum, isExitingShuffle, currentlyShuffled });
            shuffledIndexMapRef.current.clear();
            setIsShuffled(false);
            isShuffledRef.current = false;
          } else if (currentlyShuffled) {
            console.log('🔀 [PLAY] Shuffle mode maintained - isShuffled:', currentlyShuffled);
          }
        }
      }
      if (trackIndex !== undefined) {
        setCurrentTrackIndex(trackIndex);
        currentTrackIndexRef.current = trackIndex;
      }

      // Get streaming URL
      let streamingUrl = track.src;
      if (!streamingUrl) {
        if (!track.key) {
          console.error('❌ [PLAY] Track missing key:', {
            track: track.title,
            artist: track.artist,
            album: track.album
          });
          throw new Error(`Track "${track.title}" does not have a valid key for streaming`);
        }

        try {
          console.log('🔗 [PLAY] Getting streaming URL for track:', {
            track: track.title,
            artist: track.artist,
            album: track.album,
            key: track.key
          });
          const { getTrackStreamingUrl } = await import('../utils/dataTransformers');
          streamingUrl = await getTrackStreamingUrl(track);
          console.log('✅ [PLAY] Got streaming URL:', streamingUrl.substring(0, 150));
          track.src = streamingUrl; // Cache it
        } catch (urlError: any) {
          const errorMsg = urlError?.message || 'Unknown error';
          const isNetworkError = errorMsg.includes('UnknownHostException') || 
                                errorMsg.includes('Unable to resolve host') ||
                                errorMsg.includes('Network') ||
                                errorMsg.includes('fetch');

          console.error('❌ [PLAY] Error getting streaming URL:', {
            track: track.title,
            artist: track.artist,
            album: track.album,
            key: track.key,
            error: errorMsg,
            fullError: urlError,
            isNetworkError
          });

          if (isNetworkError && retryCount < maxRetries) {
            console.warn(`⚠️ [PLAY] Network error getting URL (retry ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return playTrack(track, album, trackIndex, retryCount + 1, isFromShuffle);
          }

          throw new Error(`Network error: Could not connect to music server.`);
        }
      }

      if (!streamingUrl || streamingUrl.trim() === '') {
        throw new Error(`Invalid streaming URL for track "${track.title}"`);
      }

      await expoAudioService.playTrack(track, streamingUrl);
      setIsPlaying(true);
      console.log(`✅ [PLAY] Track started: ${track.title}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      const isNetworkError = errorMessage.includes('UnknownHostException') || 
                            errorMessage.includes('Unable to resolve host') ||
                            errorMessage.includes('Network') ||
                            errorMessage.includes('fetch') ||
                            errorMessage.includes('E_LOAD_ERROR');

      console.error('❌ [PLAY] Error playing track', {
        track: track.title,
        error: errorMessage,
        isNetworkError,
        retryCount
      });

      if (isNetworkError && retryCount < maxRetries) {
        console.warn(`⚠️ [PLAY] Network error (retry ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return playTrack(track, album, trackIndex, retryCount + 1, isFromShuffle);
      }

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const playShuffled = useCallback(async (album: AlbumListProps) => {
    if (album.tracks.length === 0) {
      console.warn('⚠️ [SHUFFLE] Album has no tracks');
      return;
    }

    try {
      console.log('🔀 [SHUFFLE] Creating shuffled playlist for album:', album.album);
      const { shuffledTracks, originalIndexMap } = createShuffledPlaylist(album.tracks);
      
      // Create a new album object with shuffled tracks
      const shuffledAlbum: AlbumListProps = {
        ...album,
        tracks: shuffledTracks,
      };

      // Store the index mapping for navigation
      shuffledIndexMapRef.current = originalIndexMap;
      
      // Set shuffle state using both state and ref (ref for immediate access, state for UI)
      isShuffledRef.current = true;
      setIsShuffled(true);
      console.log('🔀 [SHUFFLE] Shuffle state set to TRUE (both ref and state)');

      // Play the first track from the shuffled playlist
      // Pass isFromShuffle=true to prevent playTrack from resetting shuffle state
      await playTrack(shuffledTracks[0], shuffledAlbum, 0, 0, true);
      
      // Verify shuffle state is still true after playTrack
      console.log('✅ [SHUFFLE] Started shuffled playback, isShuffled:', isShuffledRef.current);
    } catch (error: any) {
      console.error('❌ [SHUFFLE] Error starting shuffled playback:', error);
      setIsShuffled(false);
      throw error;
    }
  }, [playTrack]);

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
    isShuffled,
    playTrack,
    playShuffled,
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

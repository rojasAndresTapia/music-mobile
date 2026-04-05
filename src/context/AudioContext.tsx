import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Track } from '../types/Track';
import { AlbumListProps } from '../types/Album';
import { expoAudioService } from '../services/expoAudioService';
import { apiService } from '../services/api';
import { startMediaForegroundService, stopMediaForegroundService } from '../services/foregroundServiceHelper';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { createShuffledPlaylist } from '../utils/trackUtils';
import { startTrackTransition, logTrackTransitionDuration } from '../utils/transitionTimer';

// Background timer keeps firing when app is in background (setInterval is throttled by OS).
// Fallback to setInterval if the package isn't installed yet.
let bgSetIntervalFn: (cb: () => void, ms: number) => number = (cb, ms) => setInterval(cb, ms) as unknown as number;
let bgClearIntervalFn: (id: number) => void = (id) => clearInterval(id as unknown as ReturnType<typeof setInterval>);
try {
  const bgTimer = require('expo-background-timer');
  if (bgTimer.bgSetInterval) bgSetIntervalFn = bgTimer.bgSetInterval;
  if (bgTimer.bgClearInterval) bgClearIntervalFn = bgTimer.bgClearInterval;
} catch {
  console.warn('🔧 [FORCE NEXT] expo-background-timer not installed - run npm install expo-background-timer. Using setInterval (may not run in background).');
}

const PRELOAD_REMAINING_MS = 90000; // Start preloading next track when this many ms left (90s)
const KEEP_ALIVE_INTERVAL_MS = 45000; // Ping backend while playing in background to reduce DNS drops

interface AudioContextType {
  currentTrack: Track | null;
  currentAlbum: AlbumListProps | null;
  currentTrackIndex: number;
  isPlaying: boolean;
  isLoading: boolean;
  isShuffled: boolean;
  /** Last playback error message, e.g. "Network error" – useful when debugging on an installed build without Metro. */
  lastPlayError: string | null;
  /** Shown when loading has taken longer than expected (e.g. 15s) – helps when the request never fails but never completes. */
  loadingSlowMessage: string | null;
  playTrack: (track: Track, album?: AlbumListProps, trackIndex?: number) => Promise<void>;
  playShuffled: (album: AlbumListProps) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

/** Detect network/IO errors (including Android background failures: IOException, java.net, etc.) */
function isNetworkOrLoadError(message: string): boolean {
  if (!message) return false;
  const s = message.toLowerCase();
  return (
    s.includes('network') ||
    s.includes('unknownhostexception') ||
    s.includes('unable to resolve') ||
    s.includes('fetch') ||
    s.includes('e_load_error') ||
    s.includes('ioexception') ||
    s.includes('java.net') ||
    s.includes('executionexception') ||
    s.includes('connection') ||
    s.includes('econnrefused') ||
    s.includes('timeout')
  );
}

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
  const [lastPlayError, setLastPlayError] = useState<string | null>(null);
  const [loadingSlowMessage, setLoadingSlowMessage] = useState<string | null>(null);
  const loadingSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Seconds of loading before we show "taking too long" message */
  const LOADING_SLOW_SECONDS = 15;

  // Use refs to access latest values in callbacks (critical for background execution)
  const currentAlbumRef = useRef<AlbumListProps | null>(null);
  const currentTrackIndexRef = useRef(-1);
  const playTrackRef = useRef<((track: Track, album?: AlbumListProps, trackIndex?: number, retryCount?: number, isFromShuffle?: boolean) => Promise<void>) | null>(null);
  const trackFinishedTriggeredRef = useRef<string | null>(null);
  const lastKnownPositionRef = useRef<number>(0);
  const lastKnownDurationRef = useRef<number>(0);
  const shuffledIndexMapRef = useRef<Map<number, number>>(new Map());
  const isShuffledRef = useRef<boolean>(false);
  const preloadTriggeredForRef = useRef<string | null>(null);
  const lastKeepAliveRef = useRef<number>(0);
  /** Avoid running "no status" foreground fallback more than once per track */
  const foregroundFallbackTriggeredRef = useRef<string | null>(null);
  /** Cancel "retry when app becomes active" when user explicitly plays a track so we never have two songs at once */
  const pendingResumeSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const pendingResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** When set: we started transitioning to next track but next hasn't started yet. Used for 15s force-next when screen is off. */
  const transitionStartTimeRef = useRef<number | null>(null);
  /** Incremented on each playTrack() call; in-flight playTrack checks this and aborts if it changed (so user's new play wins). */
  const playRequestIdRef = useRef(0);

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
      transitionStartTimeRef.current = null; // No next track - clear so 15s force-next never fires
      setIsPlaying(false);
      stopMediaForegroundService(); // Release Android foreground service so OS can optimize battery again
      return;
    }

    const nextTrack = album.tracks[nextIndex];
    const currentlyShuffled = isShuffledRef.current;
    const transitionStart = startTrackTransition(currentTrack?.title ?? 'unknown');
    transitionStartTimeRef.current = transitionStart;

    console.log('🎵 [AUTO-PLAY] Starting next track', {
      fromTrack: currentTrack?.title,
      nextTrack: nextTrack.title,
      index: `${nextIndex + 1}/${album.tracks.length}`,
      appState,
      isShuffled: currentlyShuffled,
      isBackground,
    });

    try {
      // In background, play immediately without delays to avoid JS execution being paused
      if (isBackground) {
        console.log('⚡ [AUTO-PLAY] Background mode - playing immediately (no pre-cache)');
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

      logTrackTransitionDuration(transitionStart, nextTrack.title, { appState, source: 'auto' });
      console.log('✅ [AUTO-PLAY] Next track started successfully', {
        track: nextTrack.title,
        timestamp: new Date().toISOString(),
        shuffleMaintained: currentlyShuffled
      });
      trackFinishedTriggeredRef.current = null;
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error';
      const isNetworkError = isNetworkOrLoadError(errorMsg);

      console.error('❌ [AUTO-PLAY] Error starting next track', {
        error: errorMsg,
        nextTrack: nextTrack.title,
        isNetworkError,
        appState,
        isBackground,
      });

      if (isNetworkError && isBackground) {
        const maxAutoRetries = 3;
        const retryDelaysMs = [5000, 10000, 15000];
        let attempted = 0;
        console.log('🔄 [AUTO-PLAY] Network error in background; will retry in background then on resume', {
          nextTrack: nextTrack.title,
          retries: maxAutoRetries,
          delaysSec: retryDelaysMs.map((d) => d / 1000),
        });
        const tryPlay = async (): Promise<boolean> => {
          try {
            if (currentlyShuffled) {
              await playTrack(nextTrack, album, nextIndex, 0, true);
            } else {
              await playTrackFn(nextTrack, album, nextIndex);
            }
            return true;
          } catch (e: any) {
            console.warn('🔄 [AUTO-PLAY] Retry attempt failed:', nextTrack.title, e?.message?.slice(0, 60));
            return false;
          }
        };
        while (attempted < maxAutoRetries) {
          attempted++;
          console.log(`🔄 [AUTO-PLAY] Background retry ${attempted}/${maxAutoRetries} in ${retryDelaysMs[attempted - 1] / 1000}s for "${nextTrack.title}"`);
          await new Promise((r) => setTimeout(r, retryDelaysMs[attempted - 1]));
          if (await tryPlay()) {
            logTrackTransitionDuration(transitionStart, nextTrack.title, { appState: 'background', source: 'retry' });
            console.log('✅ [AUTO-PLAY] Next track started after background retry:', nextTrack.title);
            trackFinishedTriggeredRef.current = null;
            return;
          }
        }
        console.log('🔄 [AUTO-PLAY] Background retries exhausted; scheduled retry when app becomes active:', nextTrack.title);
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            subscription.remove();
            pendingResumeSubscriptionRef.current = null;
            console.log('🎵 [RESUME] App active - playing next track (was failed in background):', nextTrack.title);
            const timeoutId = setTimeout(async () => {
              pendingResumeTimeoutRef.current = null;
              try {
                const wasShuffled = isShuffledRef.current;
                if (wasShuffled) {
                  await playTrack(nextTrack, album, nextIndex, 0, true);
                } else {
                  await playTrackFn(nextTrack, album, nextIndex);
                }
                logTrackTransitionDuration(transitionStart, nextTrack.title, { appState: 'active', source: 'onResume' });
                console.log('✅ [AUTO-PLAY] Next track started after app became active:', nextTrack.title);
              } catch (retryError: any) {
                console.error('❌ [AUTO-PLAY] Retry when active failed:', nextTrack.title, retryError?.message);
                setIsPlaying(false);
              }
            }, 500);
            pendingResumeTimeoutRef.current = timeoutId;
          }
        });
        pendingResumeSubscriptionRef.current = subscription;
      } else {
        setIsPlaying(false);
      }
    }
  }, [currentTrack]);

  // Initialize audio service and set up playback status listener
  useEffect(() => {
    const initAudio = async () => {
      try {
        console.log('🚀 [INIT] App cold start / restart - initializing audio service...');
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

          setIsPlaying(nowPlaying);
          lastKnownPositionRef.current = positionMillis;
          lastKnownDurationRef.current = durationMillis;

          const remaining = durationMillis > 0 ? durationMillis - positionMillis : 0;
          const album = currentAlbumRef.current;
          const trackIndex = currentTrackIndexRef.current;
          const currentTrackKey = currentTrack ? `${currentTrack.title}-${currentTrack.artist}` : null;

          // Keep-alive: ping backend periodically while playing in background to reduce DNS/connection drops
          if (isBackground && nowPlaying && remaining > 0) {
            const now = Date.now();
            if (now - lastKeepAliveRef.current >= KEEP_ALIVE_INTERVAL_MS) {
              lastKeepAliveRef.current = now;
              apiService.keepAlive().then(() => {
                console.log('📡 [KEEP-ALIVE] Backend ping OK (background playback)');
              });
            }
          }

          // Preload next track when we're in the last 90s so it loads while playback is active
          if (
            currentTrackKey &&
            album &&
            trackIndex >= 0 &&
            remaining > 0 &&
            remaining <= PRELOAD_REMAINING_MS &&
            preloadTriggeredForRef.current !== currentTrackKey
          ) {
            const nextIndex = trackIndex + 1;
            if (nextIndex < album.tracks.length) {
              preloadTriggeredForRef.current = currentTrackKey;
              const nextTrack = album.tracks[nextIndex];
              console.log('📥 [PRELOAD] Starting preload', {
                currentTrack: currentTrack?.title,
                nextTrack: nextTrack.title,
                remainingSec: Math.floor(remaining / 1000),
              });
              (async () => {
                try {
                  if (!nextTrack.src && nextTrack.key) {
                    const { getTrackStreamingUrl } = await import('../utils/dataTransformers');
                    const url = await getTrackStreamingUrl(nextTrack);
                    nextTrack.src = url;
                    await expoAudioService.preloadNextTrack(url);
                    console.log('✅ [PRELOAD] Success:', nextTrack.title);
                  } else if (nextTrack.src) {
                    await expoAudioService.preloadNextTrack(nextTrack.src);
                    console.log('✅ [PRELOAD] Success:', nextTrack.title);
                  }
                } catch (e: any) {
                  console.warn('⚠️ [PRELOAD] Failed:', nextTrack.title, e?.message || e);
                  preloadTriggeredForRef.current = null;
                }
              })();
            }
          }

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
              if (isBackground) {
                console.log('>>> [BACKGROUND] Track ended while in background. If the next track does NOT start, it is because JS is suspended and this callback may not run again until you return to the app.');
              }
              
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
      // Log synchronously first (no await) so it has a chance to show before Metro might disconnect
      console.log(`>>> [APP STATE] Changed to: ${nextAppState}`);

      if (nextAppState === 'active') {
        // Delayed log: Metro/Expo often reconnects to the app after ~500ms when returning from background.
        // Logs that run immediately on resume can be dropped. This one runs after reconnect so you see it.
        const returnTimeoutId = setTimeout(() => {
          console.log('>>> [RETURN] App is back in foreground. (If you missed logs above: JS was suspended in background, so no logs while away. When you returned, the first logs may have been sent before Metro reconnected and were dropped.)');
        }, 1200);

        // When app becomes active, check if track finished while in background
        try {
          const status = await expoAudioService.getStatus();
          const currentTrackKey = currentTrack ? `${currentTrack.title}-${currentTrack.artist}` : null;

          if (status && status.isLoaded && currentTrack) {
            const positionMillis = status.positionMillis || 0;
            const durationMillis = status.durationMillis || 0;
            const didJustFinish = status.didJustFinish || false;
            const nowPlaying = status.isPlaying || false;
            const remaining = durationMillis > 0 ? durationMillis - positionMillis : 0;

            console.log('>>> [FOREGROUND] Audio status:', {
              isPlaying: nowPlaying,
              position: `${Math.floor(positionMillis / 1000)}s`,
              duration: `${Math.floor(durationMillis / 1000)}s`,
              remaining: `${Math.floor(remaining / 1000)}s`,
              didJustFinish,
              track: currentTrack.title
            });

            // Check if track finished while app was in background
            // This handles cases where JS execution was paused and callbacks didn't fire
            const trackFinished = didJustFinish || 
                                 (durationMillis > 0 && remaining <= 1000 && remaining >= -2000 && !nowPlaying);

            if (trackFinished && trackFinishedTriggeredRef.current !== currentTrackKey) {
              console.log('>>> [FOREGROUND] REASON NEXT STARTED: Track finished while app was in background (we did not get "track finished" callback in background because JS was suspended). Playing next now.');
              trackFinishedTriggeredRef.current = currentTrackKey;
              handleTrackFinished().catch((error) => {
                console.error('❌ [FOREGROUND] Error in handleTrackFinished:', error);
              });
            } else {
              setIsPlaying(nowPlaying);
            }
            foregroundFallbackTriggeredRef.current = null;
          } else if (currentTrack && currentTrackKey && foregroundFallbackTriggeredRef.current !== currentTrackKey) {
            // No status or not loaded (e.g. audio session was released in background) - assume track ended and advance
            console.log('>>> [FOREGROUND] REASON NEXT STARTED: No audio status when returning (session was released in background). Music had stopped because JS was suspended. Advancing to next track now.', {
              lastTrack: currentTrack.title,
              hadStatus: !!status,
              wasLoaded: status?.isLoaded ?? false,
            });
            foregroundFallbackTriggeredRef.current = currentTrackKey;
            trackFinishedTriggeredRef.current = currentTrackKey;
            handleTrackFinished().catch((error) => {
              console.error('❌ [FOREGROUND] Error advancing to next track:', error);
            });
          }

          clearTimeout(returnTimeoutId);
        } catch (error) {
          console.error('❌ [FOREGROUND] Error checking status:', error);
          clearTimeout(returnTimeoutId);
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

    // Reset triggers when track changes so foreground fallback can run again for next track
    trackFinishedTriggeredRef.current = null;
    foregroundFallbackTriggeredRef.current = null;

    const checkStatus = async () => {
      try {
        const appState = AppState.currentState;
        const isBackground = appState === 'background' || appState === 'inactive';

        // Run force-next check FIRST (before requiring status). When track ends and next fails to load,
        // audio is often unloaded - we were returning early and never reaching this block.
        const stuckStart = transitionStartTimeRef.current;
        if (isBackground && stuckStart !== null) {
          const stuckMs = Date.now() - stuckStart;
          const stuckSec = stuckMs / 1000;
          const album = currentAlbumRef.current;
          const trackIndex = currentTrackIndexRef.current;
          const notLastTrack = album && trackIndex >= 0 && trackIndex + 1 < album.tracks.length;
          // Diagnostic: log countdown so we know the periodic check is running and we're in this path
          if (stuckSec >= 5 && stuckSec < 7) {
            console.log('🔧 [FORCE NEXT] Stuck between songs: ~5s (will force at 15s if next does not start)', { currentTrack: currentTrack?.title });
          } else if (stuckSec >= 10 && stuckSec < 12) {
            console.log('🔧 [FORCE NEXT] Stuck between songs: ~10s (will force at 15s if next does not start)', { currentTrack: currentTrack?.title });
          }
          if (stuckMs >= 15000 && notLastTrack) {
            console.log('🔧 [FORCE NEXT] We are here: 15s+ stuck between songs with screen off - forcing next track', {
              stuckSeconds: (stuckMs / 1000).toFixed(1),
              currentTrack: currentTrack?.title,
              nextTrack: album?.tracks[trackIndex + 1]?.title,
              isBackground: true,
            });
            transitionStartTimeRef.current = null;
            handleTrackFinished().catch((error) => {
              console.error('❌ [FORCE NEXT] Error in handleTrackFinished:', error);
            });
            return;
          }
        }

        const status = await expoAudioService.getStatus();
        if (!status || !status.isLoaded) {
          // When audio is unloaded in background we might be stuck between songs (handleTrackFinished never ran or next failed).
          // Start the "stuck" timer using last known position so 15s force-next can fire.
          if (isBackground && stuckStart === null) {
            const lastPos = lastKnownPositionRef.current;
            const lastDur = lastKnownDurationRef.current;
            const album = currentAlbumRef.current;
            const trackIndex = currentTrackIndexRef.current;
            const notLastTrack = album && trackIndex >= 0 && trackIndex + 1 < album.tracks.length;
            const likelyAtEnd = lastDur > 0 && lastPos >= lastDur - 3000;
            if (likelyAtEnd && notLastTrack) {
              transitionStartTimeRef.current = Date.now();
              console.log('🔧 [FORCE NEXT] Status not loaded in background; likely at end of track - started 15s stuck timer', {
                currentTrack: currentTrack?.title,
                lastPositionSec: (lastPos / 1000).toFixed(0),
                lastDurationSec: (lastDur / 1000).toFixed(0),
              });
            }
          }
          return;
        }

        const positionMillis = status.positionMillis || 0;
        const durationMillis = status.durationMillis || 0;
        const didJustFinish = status.didJustFinish || false;
        const nowPlaying = status.isPlaying || false;
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

    // Use background timer so the check keeps running when app is in background (setInterval is throttled by OS).
    const CHECK_INTERVAL_MS = 2000;
    const intervalId = bgSetIntervalFn(checkStatus, CHECK_INTERVAL_MS);

    return () => bgClearIntervalFn(intervalId);
  }, [currentTrack, handleTrackFinished]);

  const playTrack = useCallback(async (track: Track, album?: AlbumListProps, trackIndex?: number, retryCount: number = 0, isFromShuffle: boolean = false) => {
    const maxRetries = 3;
    const isBackground = AppState.currentState === 'background' || AppState.currentState === 'inactive';
    // Use longer retry delays when in background (Android throttles network/timers)
    const retryDelay = isBackground ? 3000 * (retryCount + 1) : 1000 * (retryCount + 1);

    // Claim this play request so any in-flight playTrack (e.g. from handleTrackFinished) will abort when we overwrite this.
    playRequestIdRef.current += 1;
    const myRequestId = playRequestIdRef.current;
    setLastPlayError(null);

    try {
      // Ensure only one song ever plays: cancel pending "retry when active" and stop any current playback
      if (pendingResumeTimeoutRef.current) {
        clearTimeout(pendingResumeTimeoutRef.current);
        pendingResumeTimeoutRef.current = null;
      }
      if (pendingResumeSubscriptionRef.current) {
        pendingResumeSubscriptionRef.current.remove();
        pendingResumeSubscriptionRef.current = null;
      }
      await expoAudioService.stopAndUnloadCurrent();
      if (playRequestIdRef.current !== myRequestId) {
        console.log('🔇 [PLAY] Aborted: another play started');
        return;
      }

      // Clear any previous "loading slow" timer and message before starting a new load
      if (loadingSlowTimerRef.current) {
        clearTimeout(loadingSlowTimerRef.current);
        loadingSlowTimerRef.current = null;
      }
      setLoadingSlowMessage(null);
      setIsLoading(true);
      loadingSlowTimerRef.current = setTimeout(() => {
        setLoadingSlowMessage('Taking longer than usual – check your connection?');
      }, LOADING_SLOW_SECONDS * 1000);
      setCurrentTrack(track);
      trackFinishedTriggeredRef.current = null;
      preloadTriggeredForRef.current = null; // Allow preload for this track when near end

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
          if (playRequestIdRef.current !== myRequestId) {
            console.log('🔇 [PLAY] Aborted after getting URL: another play started');
            if (loadingSlowTimerRef.current) {
              clearTimeout(loadingSlowTimerRef.current);
              loadingSlowTimerRef.current = null;
            }
            setLoadingSlowMessage(null);
            setIsLoading(false);
            return;
          }
          console.log('✅ [PLAY] Got streaming URL:', streamingUrl.substring(0, 150));
          track.src = streamingUrl; // Cache it
        } catch (urlError: any) {
          const errorMsg = urlError?.message || 'Unknown error';
          const isNetworkError = isNetworkOrLoadError(errorMsg);

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

      if (playRequestIdRef.current !== myRequestId) {
        console.log('🔇 [PLAY] Aborted before starting audio: another play started');
        if (loadingSlowTimerRef.current) {
          clearTimeout(loadingSlowTimerRef.current);
          loadingSlowTimerRef.current = null;
        }
        setLoadingSlowMessage(null);
        setIsLoading(false);
        return;
      }
      // Start Android foreground service (media playback) so the app is not killed when screen is off and not charging (Doze).
      await startMediaForegroundService(track.title);
      await expoAudioService.playTrack(track, streamingUrl);
      if (playRequestIdRef.current !== myRequestId) {
        console.log('🔇 [PLAY] Aborted after starting audio: another play started (ignoring this one)');
        if (loadingSlowTimerRef.current) {
          clearTimeout(loadingSlowTimerRef.current);
          loadingSlowTimerRef.current = null;
        }
        setLoadingSlowMessage(null);
        setIsLoading(false);
        return;
      }
      setIsPlaying(true);
      setLastPlayError(null);
      transitionStartTimeRef.current = null; // Transition completed - next track is playing
      console.log(`✅ [PLAY] Track started: ${track.title}`);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';
      setLastPlayError(errorMessage);
      const isNetworkError = isNetworkOrLoadError(errorMessage);
      const willRetry = isNetworkError && retryCount < maxRetries;

      // Use warn for retryable errors so Expo Go doesn't show the red overlay on first failure
      if (willRetry) {
        console.warn('⚠️ [PLAY] Network error (will retry)', {
          track: track.title,
          retry: `${retryCount + 1}/${maxRetries}`,
          inMs: retryDelay,
        });
      } else {
        console.error('❌ [PLAY] Error playing track', {
          track: track.title,
          error: errorMessage,
          isNetworkError,
          retryCount,
          maxRetries,
        });
      }

      if (willRetry) {
        console.warn(`⚠️ [PLAY] Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return playTrack(track, album, trackIndex, retryCount + 1, isFromShuffle);
      }

      throw new Error(errorMessage);
    } finally {
      if (loadingSlowTimerRef.current) {
        clearTimeout(loadingSlowTimerRef.current);
        loadingSlowTimerRef.current = null;
      }
      setLoadingSlowMessage(null);
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
      stopMediaForegroundService(); // Release Android foreground service when paused
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
    lastPlayError,
    loadingSlowMessage,
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

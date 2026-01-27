import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../context/AudioContext';
import { expoAudioService } from '../services/expoAudioService';

interface Props {
  visible: boolean;
}

export const AudioPlayerBar: React.FC<Props> = ({ visible }) => {
  const insets = useSafeAreaInsets();
  const { 
    currentTrack, 
    isPlaying, 
    isShuffled,
    pauseTrack, 
    resumeTrack,
    skipToNext,
    skipToPrevious
  } = useAudio();
  
  const [position, setPosition] = useState(0); // Current position in seconds
  const [duration, setDuration] = useState(0); // Total duration in seconds
  const [isSeeking, setIsSeeking] = useState(false);
  const [progressBarWidth, setProgressBarWidth] = useState(0);
  const progressBarRef = useRef<View>(null);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseTrack();
      } else {
        await resumeTrack();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const handleNext = async () => {
    try {
      await skipToNext();
    } catch (error) {
      console.error('Error skipping to next track:', error);
    }
  };

  const handlePrevious = async () => {
    try {
      await skipToPrevious();
    } catch (error) {
      console.error('Error skipping to previous track:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Track when we last seeked to prevent immediate override
  const lastSeekTime = useRef(0);

  // Update position and duration from audio service
  useEffect(() => {
    if (!visible || !currentTrack) return;

    const updateStatus = async () => {
      try {
        const status = await expoAudioService.getStatus();
        if (status && status.isLoaded) {
          // Don't update position if we just seeked (within 1 second)
          const timeSinceSeek = Date.now() - lastSeekTime.current;
          if (!isSeeking && timeSinceSeek > 1000) {
            const posSeconds = Math.floor((status.positionMillis || 0) / 1000);
            setPosition(posSeconds);
          }
          const durSeconds = Math.floor((status.durationMillis || 0) / 1000);
          if (durSeconds > 0) {
            setDuration(durSeconds);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    };

    // Update immediately
    updateStatus();

    // Update every second, but only if not seeking
    const interval = setInterval(() => {
      const timeSinceSeek = Date.now() - lastSeekTime.current;
      if (!isSeeking && timeSinceSeek > 1000) {
        updateStatus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [visible, currentTrack, isSeeking]);

  // Handle seeking
  const handleSeek = async (seekPosition: number) => {
    const currentDuration = durationRef.current;
    if (currentDuration === 0) {
      console.warn('🎵 [SEEK] Cannot seek - duration is 0');
      setIsSeeking(false);
      return;
    }
    
    const clampedPosition = Math.max(0, Math.min(seekPosition, currentDuration));
    const positionMillis = clampedPosition * 1000;
    console.log(`🎵 [SEEK] Seeking to ${formatTime(clampedPosition)} (${clampedPosition}s / ${currentDuration}s = ${positionMillis}ms)`);
    
    // Mark that we're seeking to prevent position updates from overriding
    lastSeekTime.current = Date.now();
    
    try {
      // Set position first
      console.log(`🎵 [SEEK] Calling setPosition with ${positionMillis}ms`);
      await expoAudioService.setPosition(positionMillis);
      
      // Update local state immediately
      setPosition(clampedPosition);
      
      // Verify the position was set after a short delay
      setTimeout(async () => {
        try {
          const status = await expoAudioService.getStatus();
          if (status && status.isLoaded) {
            const actualPosition = Math.floor((status.positionMillis || 0) / 1000);
            const actualMillis = status.positionMillis || 0;
            console.log(`✅ [SEEK] Verification - Actual: ${formatTime(actualPosition)} (${actualMillis}ms), Expected: ${formatTime(clampedPosition)} (${positionMillis}ms)`);
            
            // If there's a significant difference (more than 2 seconds), try again
            if (Math.abs(actualPosition - clampedPosition) > 2) {
              console.warn(`⚠️ [SEEK] Position mismatch! Retrying seek...`);
              await expoAudioService.setPosition(positionMillis);
              
              // Verify again
              setTimeout(async () => {
                const retryStatus = await expoAudioService.getStatus();
                if (retryStatus && retryStatus.isLoaded) {
                  const retryPosition = Math.floor((retryStatus.positionMillis || 0) / 1000);
                  console.log(`✅ [SEEK] After retry - Position: ${formatTime(retryPosition)}`);
                }
              }, 200);
            }
          }
        } catch (verifyError) {
          console.error('❌ [SEEK] Error verifying position:', verifyError);
        }
      }, 200);
      
      console.log(`✅ [SEEK] Successfully seeked to ${formatTime(clampedPosition)}`);
    } catch (error: any) {
      console.error('❌ [SEEK] Error seeking:', error?.message || error, error);
      // Still update the position state even if seek failed
      setPosition(clampedPosition);
    } finally {
      // Delay before allowing updates again to prevent immediate override
      setTimeout(() => {
        console.log('🎵 [SEEK] Re-enabling position updates');
        setIsSeeking(false);
      }, 500);
    }
  };


  // Track initial touch position for drag calculations
  const initialTouchX = useRef(0);
  const durationRef = useRef(0);
  const progressBarWidthRef = useRef(0);

  // Keep refs in sync
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    progressBarWidthRef.current = progressBarWidth;
  }, [progressBarWidth]);

  // Pan responder for dragging the progress bar (handles both tap and drag)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('🎵 [PROGRESS BAR] Touch started');
        return true;
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const width = progressBarWidthRef.current;
        const dur = durationRef.current;
        console.log('🎵 [PROGRESS BAR] Grant - locationX:', evt.nativeEvent.locationX, 'width:', width, 'duration:', dur);
        setIsSeeking(true);
        initialTouchX.current = evt.nativeEvent.locationX;
        if (dur > 0 && width > 0) {
          const progress = Math.max(0, Math.min(1, initialTouchX.current / width));
          const seekPosition = progress * dur;
          setPosition(seekPosition);
          console.log('🎵 [PROGRESS BAR] Initial seek position:', seekPosition, 'seconds');
        } else {
          console.warn('🎵 [PROGRESS BAR] Grant - missing data:', { duration: dur, width });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const width = progressBarWidthRef.current;
        const dur = durationRef.current;
        if (dur > 0 && width > 0) {
          const touchX = initialTouchX.current + gestureState.dx;
          const progress = Math.max(0, Math.min(1, touchX / width));
          const seekPosition = progress * dur;
          console.log('🎵 [PROGRESS BAR] Move - touchX:', touchX.toFixed(1), 'progress:', progress.toFixed(3), 'seekPosition:', seekPosition.toFixed(1), 's');
          setPosition(seekPosition);
        } else {
          console.warn('🎵 [PROGRESS BAR] Move - missing data:', { duration: dur, width });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const width = progressBarWidthRef.current;
        const dur = durationRef.current;
        console.log('🎵 [PROGRESS BAR] Release - dx:', gestureState.dx.toFixed(1));
        if (dur > 0 && width > 0) {
          const touchX = initialTouchX.current + gestureState.dx;
          const progress = Math.max(0, Math.min(1, touchX / width));
          const seekPosition = progress * dur;
          console.log('🎵 [PROGRESS BAR] Final seek position:', seekPosition.toFixed(1), 'seconds');
          handleSeek(seekPosition);
        } else {
          console.warn('🎵 [PROGRESS BAR] Release - missing data:', { duration: dur, width });
        }
      },
      onPanResponderTerminate: () => {
        console.log('🎵 [PROGRESS BAR] Terminated');
        setIsSeeking(false);
      },
    })
  ).current;

  if (!visible || !currentTrack) {
    return null;
  }

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Interactive Progress Bar */}
      <View style={styles.progressContainer}>
        <View 
          ref={progressBarRef}
          style={styles.progressBar}
          onLayout={(evt) => {
            const { width } = evt.nativeEvent.layout;
            console.log('🎵 [PROGRESS BAR] Layout width:', width, 'duration:', duration);
            if (width > 0) {
              setProgressBarWidth(width);
            }
          }}
          {...panResponder.panHandlers}
        >
          <View style={styles.progressBarBackground} pointerEvents="none" />
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progressPercentage}%` }
            ]} 
            pointerEvents="none"
          />
          <View 
            style={[
              styles.progressBarHandle,
              { left: `${progressPercentage}%` }
            ]} 
            pointerEvents="none"
          />
        </View>
        {/* Current Time */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {formatTime(position)}
          </Text>
        </View>
      </View>

      {/* Player Content */}
      <View style={styles.playerContent}>
        {/* Track Info - Above Controls */}
        <View style={styles.trackInfo}>
          <View style={styles.trackTitleRow}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title || 'Unknown Track'}
            </Text>
            {isShuffled && (
              <Text style={styles.shuffleIndicator}>🔀</Text>
            )}
          </View>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {currentTrack.artist || 'Unknown Artist'}
          </Text>
        </View>

        {/* Controls - Centered */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePrevious} style={styles.controlButton}>
            <Text style={styles.controlIcon}>⏮️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton}>
            <Text style={styles.playIcon}>
              {isPlaying ? '⏸️' : '▶️'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleNext} style={styles.controlButton}>
            <Text style={styles.controlIcon}>⏭️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    // Minimum padding will be added via inline style using safe area insets
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  progressBar: {
    height: 30, // Make it taller for easier touch
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#e0e0e0',
    borderRadius: 1,
    top: 14, // Center vertically in the 30px container
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: '#007AFF',
    borderRadius: 1,
    top: 14, // Center vertically in the 30px container
  },
  progressBarHandle: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007AFF',
    marginLeft: -9, // Center the handle on the progress line
    top: 6, // Center vertically in the 30px container (30/2 - 18/2 = 6)
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10, // Ensure handle is on top
  },
  timeContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  playerContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  trackInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  trackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    textAlign: 'center',
    flexShrink: 1,
  },
  shuffleIndicator: {
    fontSize: 14,
    marginLeft: 6,
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    padding: 8,
  },
  controlIcon: {
    fontSize: 20,
  },
  playButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  playIcon: {
    fontSize: 18,
    color: 'white',
  },
});

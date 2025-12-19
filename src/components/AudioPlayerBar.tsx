import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudio } from '../context/AudioContext';

interface Props {
  visible: boolean;
}

export const AudioPlayerBar: React.FC<Props> = ({ visible }) => {
  const insets = useSafeAreaInsets();
  const { 
    currentTrack, 
    isPlaying, 
    pauseTrack, 
    resumeTrack,
    skipToNext,
    skipToPrevious
  } = useAudio();

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

  if (!visible || !currentTrack) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Progress Bar - Simplified */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: isPlaying ? '50%' : '0%' }
            ]} 
          />
        </View>
      </View>

      {/* Player Content */}
      <View style={styles.playerContent}>
        {/* Track Info - Above Controls */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {currentTrack.title || 'Unknown Track'}
          </Text>
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
    height: 3,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
  },
  progressFill: {
    height: 3,
    backgroundColor: '#007AFF',
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
  trackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    textAlign: 'center',
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

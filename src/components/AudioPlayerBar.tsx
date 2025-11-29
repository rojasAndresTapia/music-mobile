import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useAudio } from '../context/AudioContext';

interface Props {
  visible: boolean;
}

export const AudioPlayerBar: React.FC<Props> = ({ visible }) => {
  const { 
    currentTrack, 
    isPlaying, 
    pauseTrack, 
    resumeTrack 
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

  // Simplified - no skip functionality for now
  const handleNext = () => {
    console.log('Skip next - not implemented in simplified version');
  };

  const handlePrevious = () => {
    console.log('Skip previous - not implemented in simplified version');
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
    <View style={styles.container}>
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
        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Image
            source={{ 
              uri: 'https://via.placeholder.com/50x50/333/fff?text=♪' 
            }}
            style={styles.albumArt}
            defaultSource={{ uri: 'https://via.placeholder.com/50x50/333/fff?text=♪' }}
          />
          
          <View style={styles.trackDetails}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title || 'Unknown Track'}
            </Text>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {currentTrack.artist || 'Unknown Artist'}
            </Text>
          </View>
        </View>

        {/* Controls */}
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

        {/* Time - Simplified */}
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>
            {isPlaying ? 'Playing' : 'Paused'}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  trackDetails: {
    flex: 1,
    marginLeft: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
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
  timeContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
});

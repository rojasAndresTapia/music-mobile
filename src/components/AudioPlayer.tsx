import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';

interface AudioPlayerProps {
  currentTrack: any;
  currentAlbum: any;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onTrackInfoPress: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentTrack,
  currentAlbum,
  isPlaying,
  isLoading,
  position,
  duration,
  onPlayPause,
  onSkipNext,
  onSkipPrevious,
  onTrackInfoPress
}) => {
  if (!currentTrack) return null;

  return (
    <View style={styles.enhancedPlayer}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }
            ]} 
          />
        </View>
      </View>
      
      {/* Player Content - Reorganized with info on top */}
      <View style={styles.playerContentColumn}>
        {/* Album Art & Track Info - Now on top */}
        <TouchableOpacity 
          style={styles.playerTrackInfoRow}
          onPress={onTrackInfoPress}
        >
          <Image
            source={{ 
              uri: currentAlbum?.image || 'https://via.placeholder.com/60x60/333/fff?text=♪'
            }}
            style={styles.playerAlbumArt}
            defaultSource={{ uri: 'https://via.placeholder.com/60x60/333/fff?text=♪' }}
          />
          
          <View style={styles.playerTextInfo}>
            <Text style={styles.playerTrackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.playerArtist} numberOfLines={1}>
              {currentTrack.artist}
            </Text>
          </View>

          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>
              {Math.floor(position / 1000 / 60)}:{Math.floor((position / 1000) % 60).toString().padStart(2, '0')}
            </Text>
            <Text style={styles.timeText}>
              {Math.floor(duration / 1000 / 60)}:{Math.floor((duration / 1000) % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Controls - Now below */}
        <View style={styles.playerControls}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={onSkipPrevious}
            disabled={isLoading}
          >
            <Text style={styles.controlIcon}>⏮️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.mainPlayButton}
            onPress={onPlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.mainPlayIcon}>
                {isPlaying ? '⏸️' : '▶️'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={onSkipNext}
            disabled={isLoading}
          >
            <Text style={styles.controlIcon}>⏭️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  enhancedPlayer: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#007AFF',
  },
  playerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  playerTrackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerAlbumArt: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  playerTextInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerTrackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  playerArtist: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  controlButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  controlIcon: {
    fontSize: 24,
    color: '#007AFF',
  },
  mainPlayButton: {
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mainPlayIcon: {
    fontSize: 24,
    color: 'white',
  },
  timeDisplay: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  playerContentColumn: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  playerTrackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
});

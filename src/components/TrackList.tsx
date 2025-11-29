import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

interface TrackListProps {
  tracks: string[];
  currentTrack: any;
  isLoading: boolean;
  isPlaying: boolean;
  onTrackPress: (track: string, index: number) => void;
}

export const TrackList: React.FC<TrackListProps> = ({
  tracks,
  currentTrack,
  isLoading,
  isPlaying,
  onTrackPress
}) => {
  return (
    <View style={styles.container}>
      {tracks.map((track, index) => {
        const trackTitle = track.replace(/^\d+\s*-\s*/, '').replace(/\.[^/.]+$/, '');
        const isCurrentTrack = currentTrack?.fileName === track;
        
        return (
          <TouchableOpacity 
            key={index}
            style={[styles.trackItem, isCurrentTrack && styles.currentTrackItem]}
            onPress={() => onTrackPress(track, index)}
            disabled={isLoading}
          >
            <View style={styles.trackNumber}>
              <Text style={[styles.trackNumberText, isCurrentTrack && styles.currentTrackText]}>
                {(index + 1).toString().padStart(2, '0')}
              </Text>
            </View>
            
            <View style={styles.trackInfo}>
              <Text style={[styles.trackTitle, isCurrentTrack && styles.currentTrackText]} numberOfLines={1}>
                {trackTitle}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack?.artist || 'Unknown Artist'}
              </Text>
            </View>
            
            <View style={styles.trackActions}>
              {isCurrentTrack && isLoading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={styles.playIcon}>
                  {isCurrentTrack && isPlaying ? '⏸️' : '▶️'}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 2,
    borderRadius: 8,
  },
  currentTrackItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  trackNumber: {
    width: 32,
    alignItems: 'center',
  },
  trackNumberText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  currentTrackText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  trackInfo: {
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
  trackActions: {
    width: 32,
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
});

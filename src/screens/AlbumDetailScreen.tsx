import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Track } from '../types/Track';
import { useAudio } from '../context/AudioContext';

type AlbumDetailScreenRouteProp = RouteProp<RootStackParamList, 'AlbumDetail'>;
type AlbumDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AlbumDetail'>;

interface Props {
  route: AlbumDetailScreenRouteProp;
  navigation: AlbumDetailScreenNavigationProp;
}

export const AlbumDetailScreen: React.FC<Props> = ({ route }) => {
  const insets = useSafeAreaInsets();
  const { album } = route.params;
  const { playTrack, currentTrack, isLoading, isPlaying } = useAudio();
  
  // Calculate bottom padding: player bar height (~90px with new layout) + safe area bottom + extra spacing
  const playerBarHeight = 90;
  const extraSpacing = 16; // Extra space for better UX
  const bottomPadding = (currentTrack ? playerBarHeight + extraSpacing : 0) + insets.bottom;

  const handleTrackPress = async (track: Track, index: number) => {
    console.log('🎵 Playing track:', track.title);
    
    try {
      await playTrack(track, album, index);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to play track';
      console.error('❌ Error playing track:', {
        track: track.title,
        error: errorMessage,
        fullError: error
      });
      
      // Show more detailed error message
      Alert.alert(
        'Error', 
        errorMessage,
        [{ text: 'OK' }]
      );
    }
  };

  const handlePlayAll = async () => {
    if (album.tracks.length > 0) {
      try {
        await playTrack(album.tracks[0], album, 0);
      } catch (error) {
        console.error('❌ Error playing album:', error);
        Alert.alert('Error', 'Failed to play album');
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderTrack = (track: Track, index: number) => {
    const isCurrentTrack = currentTrack?.title === track.title;
    
    return (
      <TouchableOpacity
        key={index}
        style={[styles.trackItem, isCurrentTrack && styles.currentTrack]}
        onPress={() => handleTrackPress(track, index)}
        disabled={isLoading}
      >
        <View style={styles.trackNumber}>
          <Text style={[styles.trackNumberText, isCurrentTrack && styles.currentTrackText]}>
            {(index + 1).toString().padStart(2, '0')}
          </Text>
        </View>
        
        <View style={styles.trackInfo}>
          <Text 
            style={[styles.trackTitle, isCurrentTrack && styles.currentTrackText]}
            numberOfLines={1}
          >
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {track.artist}
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
  };

  return (
    <View style={styles.container}>
      {/* Album Header */}
      <View style={styles.albumHeader}>
        <Image
          source={{ 
            uri: album.thumbnail || 'https://via.placeholder.com/200x200/333/fff?text=No+Image' 
          }}
          style={styles.albumArt}
          defaultSource={{ uri: 'https://via.placeholder.com/200x200/333/fff?text=Loading' }}
        />
        
        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle}>{album.album}</Text>
          <Text style={styles.albumArtist}>{album.author}</Text>
          <Text style={styles.albumStats}>
            {album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
      </View>

      {/* Play All Button */}
      <TouchableOpacity
        style={styles.playAllButton}
        onPress={handlePlayAll}
        disabled={isLoading}
      >
        <Text style={styles.playAllIcon}>▶️</Text>
        <Text style={styles.playAllText}>Play All</Text>
      </TouchableOpacity>

      {/* Track List */}
      <ScrollView 
        style={styles.trackList} 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.trackListHeader}>
          <Text style={styles.trackListTitle}>Tracks</Text>
        </View>
        
        {album.tracks.map((track, index) => renderTrack(track, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  albumHeader: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  albumArt: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  albumInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  albumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  albumArtist: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  albumStats: {
    fontSize: 14,
    color: '#999',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playAllIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  playAllText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackList: {
    flex: 1,
  },
  trackListHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  trackListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
  },
  currentTrack: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  trackNumber: {
    width: 40,
    alignItems: 'center',
  },
  trackNumberText: {
    fontSize: 16,
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
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
  },
  trackActions: {
    width: 40,
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
});

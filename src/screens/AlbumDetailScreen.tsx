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
import { PlayButtons } from '../components/PlayButtons';

type AlbumDetailScreenRouteProp = RouteProp<RootStackParamList, 'AlbumDetail'>;
type AlbumDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AlbumDetail'>;

interface Props {
  route: AlbumDetailScreenRouteProp;
  navigation: AlbumDetailScreenNavigationProp;
}

export const AlbumDetailScreen: React.FC<Props> = ({ route }) => {
  const insets = useSafeAreaInsets();
  const { album } = route.params;
  const { playTrack, playShuffled, currentTrack, currentAlbum, isLoading, isPlaying, isShuffled } = useAudio();
  const [trackDurations, setTrackDurations] = useState<Map<number, number>>(new Map());
  
  // Check if shuffle is active for this specific album
  // We check if the current album matches this album (by name and author)
  // and if shuffle mode is active
  const isShuffleActive = React.useMemo(() => {
    // If shuffle is not active, definitely not active
    if (!isShuffled) {
      console.log('🔀 [AlbumDetailScreen] Shuffle not active - isShuffled is false');
      return false;
    }
    
    // If there's no current track or album, can't determine
    if (!currentTrack || !currentAlbum) {
      console.log('🔀 [AlbumDetailScreen] No current track/album to compare');
      return false;
    }
    
    // Check if current track belongs to the album we're viewing
    // This works even if the album is shuffled because we check by track properties
    const trackBelongsToAlbum = album.tracks.some(
      track => track.title === currentTrack.title && track.artist === currentTrack.artist
    );
    
    // Also check if album name and author match (additional verification)
    const albumMatches = currentAlbum.album === album.album && 
                        currentAlbum.author === album.author;
    
    const result = trackBelongsToAlbum && albumMatches;
    
    console.log('🔀 [AlbumDetailScreen] Shuffle state check:', {
      isShuffled,
      trackBelongsToAlbum,
      albumMatches,
      currentTrack: currentTrack.title,
      currentAlbum: currentAlbum.album,
      viewingAlbum: album.album,
      currentAuthor: currentAlbum.author,
      viewingAuthor: album.author,
      result,
    });
    
    return result;
  }, [isShuffled, currentTrack, currentAlbum, album]);
  
  // Calculate bottom padding: player bar height (~90px with new layout) + safe area bottom + extra spacing
  const playerBarHeight = 90;
  const extraSpacing = 16; // Extra space for better UX
  const bottomPadding = (currentTrack ? playerBarHeight + extraSpacing : 0) + insets.bottom;
  
  // Load duration for the currently playing track
  useEffect(() => {
    const loadTrackDuration = async () => {
      if (currentTrack && currentTrack.src) {
        try {
          const { expoAudioService } = await import('../services/expoAudioService');
          const status = await expoAudioService.getStatus();
          if (status && status.isLoaded && status.durationMillis) {
            const durationSeconds = Math.floor(status.durationMillis / 1000);
            // Find the track index and store duration
            const trackIndex = album.tracks.findIndex(t => t.title === currentTrack.title);
            if (trackIndex >= 0) {
              setTrackDurations(prev => new Map(prev).set(trackIndex, durationSeconds));
            }
          }
        } catch (error) {
          console.error('Error loading track duration:', error);
        }
      }
    };
    
    // Load duration after a short delay to ensure audio is loaded
    const timer = setTimeout(loadTrackDuration, 500);
    return () => clearTimeout(timer);
  }, [currentTrack, album.tracks]);

  // Preload durations for all tracks when album loads
  useEffect(() => {
    const preloadDurations = async () => {
      const { Audio } = await import('expo-av');
      const durations = new Map<number, number>();
      
      // Load durations for tracks (limit concurrent requests)
      const loadPromises = album.tracks.slice(0, 10).map(async (track, index) => {
        if (track.src || track.key) {
          try {
            const { apiService } = await import('../services/api');
            const url = track.src || await apiService.getSongUrl(track.key!);
            
            // Create a sound object to get metadata without playing
            const { sound } = await Audio.Sound.createAsync(
              { uri: url },
              { shouldPlay: false }
            );
            
            const status = await sound.getStatusAsync();
            if (status.isLoaded && status.durationMillis) {
              const durationSeconds = Math.floor(status.durationMillis / 1000);
              durations.set(index, durationSeconds);
            }
            
            // Unload immediately to free resources
            await sound.unloadAsync();
          } catch (error) {
            // Silently fail for individual tracks
            console.debug(`Could not load duration for track ${index}:`, error);
          }
        }
      });
      
      // Wait for all to complete (or timeout)
      await Promise.allSettled(loadPromises);
      
      // Update state with all loaded durations
      if (durations.size > 0) {
        setTrackDurations(prev => {
          const updated = new Map(prev);
          durations.forEach((duration, index) => {
            updated.set(index, duration);
          });
          return updated;
        });
      }
    };
    
    // Only preload if we don't have durations yet
    if (trackDurations.size === 0 && album.tracks.length > 0) {
      preloadDurations();
    }
  }, [album.tracks]);

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

  const handleShuffle = async () => {
    if (album.tracks.length > 0) {
      try {
        await playShuffled(album);
      } catch (error) {
        console.error('❌ Error shuffling album:', error);
        Alert.alert('Error', 'Failed to shuffle album');
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
    const duration = trackDurations.get(index) || track.duration;
    const durationText = duration ? formatDuration(duration) : null;
    
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
          <View style={styles.trackMeta}>
            <Text style={styles.trackArtist} numberOfLines={1}>
              {track.artist}
            </Text>
            {durationText && (
              <Text style={[styles.trackDuration, isCurrentTrack && styles.currentTrackDuration]}>
                {durationText}
              </Text>
            )}
          </View>
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

      {/* Play All and Shuffle Buttons */}
      <PlayButtons
        onPlayAll={handlePlayAll}
        onShuffle={handleShuffle}
        isLoading={isLoading}
        isShuffled={isShuffleActive}
      />

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
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  trackDuration: {
    fontSize: 13,
    color: '#999',
  },
  currentTrackDuration: {
    color: '#007AFF',
  },
  trackActions: {
    width: 40,
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
});

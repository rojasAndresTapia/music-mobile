import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useMusicData } from '../hooks/useMusicData';
import { useAudio } from '../context/AudioContext';
import { createSmartMixedList, MixedListItem } from '../utils/dataTransformers';
import { SearchBar } from '../components/SearchBar';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { albums, loading, error } = useMusicData();
  const { currentTrack } = useAudio();
  const [mixedList, setMixedList] = useState<MixedListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Calculate bottom padding: player bar height (~90px with new layout) + safe area bottom + extra spacing
  const playerBarHeight = 90;
  const extraSpacing = 16; // Extra space for better UX
  const bottomPadding = (currentTrack ? playerBarHeight + extraSpacing : 0) + insets.bottom;

  useEffect(() => {
    if (albums.length > 0) {
      const mixed = createSmartMixedList(albums);
      setMixedList(mixed);
      console.log('📱 Created mixed list with', mixed.length, 'items');
    }
  }, [albums]);

  // Filter mixed list based on search term
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) {
      return mixedList;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return mixedList.filter(item => {
      if (item.type === 'artist' && item.artist) {
        // Search in artist name
        const artistName = item.artist.name.toLowerCase();
        if (artistName.includes(searchLower)) return true;
        
        // Search in album names
        return item.artist.albums.some(album => 
          album.album.toLowerCase().includes(searchLower) ||
          album.author.toLowerCase().includes(searchLower)
        );
      } else if (item.type === 'album' && item.album) {
        // Search in album name, artist name, or track titles
        const albumName = item.album.album.toLowerCase();
        const artistName = item.album.author.toLowerCase();
        if (albumName.includes(searchLower) || artistName.includes(searchLower)) {
          return true;
        }
        
        // Search in track titles
        return item.album.tracks.some(track => 
          track.title.toLowerCase().includes(searchLower)
        );
      }
      return false;
    });
  }, [mixedList, searchTerm]);

  const handleItemPress = async (item: MixedListItem) => {
    if (item.type === 'album' && item.album) {
      // Navigate to album detail screen
      navigation.navigate('AlbumDetail', { album: item.album });
    } else if (item.type === 'artist' && item.artist) {
      // Navigate to artist albums screen
      navigation.navigate('ArtistAlbums', { artist: item.artist });
    }
  };

  const renderItem = (item: MixedListItem, index: number) => {
    const isArtist = item.type === 'artist';
    // For single albums: show artist (bold) above album (regular)
    // For artists: show artist name (bold) above stats (regular)
    const title = isArtist ? item.artist?.name : item.album?.author;
    const subtitle = isArtist 
      ? `${item.artist?.albums.length} albums • ${item.artist?.totalTracks} tracks`
      : item.album?.album;
    const thumbnail = isArtist ? item.artist?.thumbnail : item.album?.thumbnail;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.itemCard, isArtist && styles.artistCard]}
        onPress={() => handleItemPress(item)}
        disabled={false}
      >
        <Image
          source={{ 
            uri: thumbnail || 'https://via.placeholder.com/150x150/333/fff?text=No+Image' 
          }}
          style={styles.thumbnail}
          defaultSource={{ uri: 'https://via.placeholder.com/150x150/333/fff?text=Loading' }}
        />
        
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.itemSubtitle} numberOfLines={1}>{subtitle}</Text>
          {isArtist && (
            <View style={styles.artistBadge}>
              <Text style={styles.artistBadgeText}>ARTIST</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your music library...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ Error: {error}</Text>
        <Text style={styles.errorHint}>
          Make sure your backend is running on localhost:4000
        </Text>
      </View>
    );
  }

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = Constants.expoConfig?.ios?.buildNumber || Constants.expoConfig?.android?.versionCode || 'N/A';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎵 Music Library</Text>
      <Text style={styles.subheader}>
        {albums.length} albums • {searchTerm ? `${filteredList.length} of ${mixedList.length}` : mixedList.length} items
      </Text>
      <Text style={styles.versionText}>
        v{appVersion} (Build: {buildNumber})
      </Text>
      
      {/* Search Bar */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Search artists, albums, or songs..."
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grid}>
          {filteredList.map((item, index) => renderItem(item, index))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50, // Account for status bar
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subheader: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#ff3333',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: '#e3f2fd',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
  },
  loadingTrackText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    padding: 16,
  },
  itemCard: {
    width: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  artistCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  thumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  artistBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  artistBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

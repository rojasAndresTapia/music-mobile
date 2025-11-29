import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AlbumListProps } from '../types/Album';

type ArtistAlbumsScreenRouteProp = RouteProp<RootStackParamList, 'ArtistAlbums'>;
type ArtistAlbumsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ArtistAlbums'>;

interface Props {
  route: ArtistAlbumsScreenRouteProp;
  navigation: ArtistAlbumsScreenNavigationProp;
}

export const ArtistAlbumsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { artist } = route.params;

  const handleAlbumPress = (album: AlbumListProps) => {
    navigation.navigate('AlbumDetail', { album });
  };

  const renderAlbum = (album: AlbumListProps, index: number) => {
    return (
      <TouchableOpacity
        key={index}
        style={styles.albumCard}
        onPress={() => handleAlbumPress(album)}
      >
        <Image
          source={{ 
            uri: album.thumbnail || 'https://via.placeholder.com/150x150/333/fff?text=No+Image' 
          }}
          style={styles.albumArt}
          defaultSource={{ uri: 'https://via.placeholder.com/150x150/333/fff?text=Loading' }}
        />
        
        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={2}>
            {album.album}
          </Text>
          <Text style={styles.albumStats} numberOfLines={1}>
            {album.tracks.length} {album.tracks.length === 1 ? 'track' : 'tracks'}
          </Text>
        </View>
        
        <View style={styles.albumOverlay}>
          <Text style={styles.playIcon}>▶️</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Artist Header */}
      <View style={styles.artistHeader}>
        <Image
          source={{ 
            uri: artist.thumbnail || 'https://via.placeholder.com/120x120/333/fff?text=Artist' 
          }}
          style={styles.artistImage}
          defaultSource={{ uri: 'https://via.placeholder.com/120x120/333/fff?text=Loading' }}
        />
        
        <View style={styles.artistInfo}>
          <Text style={styles.artistName}>{artist.name}</Text>
          <Text style={styles.artistStats}>
            {artist.albums.length} {artist.albums.length === 1 ? 'album' : 'albums'} • {artist.totalTracks} tracks
          </Text>
        </View>
      </View>

      {/* Albums Grid */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.albumsHeader}>
          <Text style={styles.albumsTitle}>Albums</Text>
        </View>
        
        <View style={styles.albumsGrid}>
          {artist.albums.map((album, index) => renderAlbum(album, index))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  artistHeader: {
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
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  artistInfo: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  artistName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  artistStats: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  albumsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  albumsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  albumCard: {
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
    position: 'relative',
  },
  albumArt: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  albumStats: {
    fontSize: 14,
    color: '#666',
  },
  albumOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  playIcon: {
    fontSize: 16,
    color: 'white',
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface AlbumGridProps {
  mixedList: any[];
  onArtistSelect: (artist: any) => void;
  onAlbumSelect: (album: any) => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({
  mixedList,
  onArtistSelect,
  onAlbumSelect
}) => {
  return (
    <View style={styles.albumGrid}>
      {mixedList.map((item, index) => {
        if (item.type === 'artist') {
          // Artist card with multiple album images
          const artist = item.artist;
          const albumImages = artist.albums.slice(0, 4).map(album => 
            album.images && album.images.length > 0 
              ? `http://192.168.1.159:4000/image-proxy?key=${encodeURIComponent(`${album.artist}/${album.name}/${album.images[0]}`)}`
              : null
          ).filter(Boolean);
          
          return (
            <TouchableOpacity 
              key={`artist-${index}`}
              style={[styles.albumCard, styles.artistCard]}
              onPress={() => onArtistSelect(artist)}
            >
              {/* Multi-album artwork grid */}
              <View style={styles.artistArtworkContainer}>
                {albumImages.length > 0 ? (
                  <View style={[styles.artistArtworkGrid, 
                    albumImages.length === 2 ? styles.artistGrid2 :
                    albumImages.length === 3 ? styles.artistGrid3 :
                    styles.artistGrid4
                  ]}>
                    {albumImages.slice(0, 4).map((imageUrl, imgIndex) => {
                      const imageStyle = [
                        styles.artistArtworkImage,
                        albumImages.length === 2 ? { width: '50%', height: '100%' } :
                        albumImages.length === 3 ? { width: imgIndex === 0 ? '100%' : '50%', height: imgIndex === 0 ? '50%' : '50%' } :
                        { width: '50%', height: '50%' }
                      ];
                      
                      return (
                        <Image
                          key={imgIndex}
                          source={{ uri: imageUrl }}
                          style={imageStyle}
                          defaultSource={{ uri: 'https://via.placeholder.com/70x70/333/fff?text=♪' }}
                        />
                      );
                    })}
                    {artist.albums.length > 4 && (
                      <View style={styles.moreAlbumsIndicator}>
                        <Text style={styles.moreAlbumsText}>+{artist.albums.length - 4}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.artistArtworkFallback}>
                    <Text style={styles.artistArtworkFallbackText}>🎤</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={2}>
                  {artist.name}
                </Text>
                <Text style={styles.albumArtist} numberOfLines={1}>
                  {artist.albums.length} albums • {artist.totalTracks} tracks
                </Text>
              </View>
              
              <View style={styles.artistBadge}>
                <Text style={styles.artistBadgeText}>ARTIST</Text>
              </View>
            </TouchableOpacity>
          );
        } else {
          // Individual album card
          const album = item.album;
          const imageUrl = album.images && album.images.length > 0 
            ? `http://192.168.1.159:4000/image-proxy?key=${encodeURIComponent(`${album.artist}/${album.name}/${album.images[0]}`)}`
            : null;
          
          return (
            <TouchableOpacity 
              key={`album-${index}`}
              style={styles.albumCard}
              onPress={() => onAlbumSelect(album)}
            >
              <Image
                source={{ 
                  uri: imageUrl || 'https://via.placeholder.com/150x150/333/fff?text=♪'
                }}
                style={styles.albumArtwork}
                defaultSource={{ uri: 'https://via.placeholder.com/150x150/333/fff?text=Loading' }}
              />
              
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {album.artist}
                </Text>
                <Text style={styles.albumArtist} numberOfLines={2}>
                  {album.name}
                </Text>
                <Text style={styles.albumTrackCount}>
                  {album.tracks.length} tracks
                </Text>
              </View>
              
              <View style={styles.albumOverlay}>
                <Text style={styles.albumPlayIcon}>▶️</Text>
              </View>
            </TouchableOpacity>
          );
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 4,
  },
  albumCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
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
  artistCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  albumArtwork: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  artistArtworkContainer: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  artistArtworkGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  artistGrid2: {
    flexDirection: 'row',
  },
  artistGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  artistGrid4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  artistArtworkImage: {
    backgroundColor: '#f0f0f0',
  },
  artistArtworkFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  artistArtworkFallbackText: {
    fontSize: 40,
    color: 'white',
  },
  moreAlbumsIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  moreAlbumsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  artistBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  artistBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  albumInfo: {
    padding: 12,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  albumTrackCount: {
    fontSize: 12,
    color: '#999',
  },
  albumOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumPlayIcon: {
    fontSize: 16,
    color: 'white',
  },
});

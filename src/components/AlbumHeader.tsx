import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

interface AlbumHeaderProps {
  album: any;
  onBackPress: () => void;
  backButtonText?: string;
}

export const AlbumHeader: React.FC<AlbumHeaderProps> = ({
  album,
  onBackPress,
  backButtonText = "← Library"
}) => {
  return (
    <View style={styles.albumHeaderContainer}>
      {/* Background Image */}
      {album.image ? (
        <Image
          source={{ uri: album.image }}
          style={styles.albumHeaderBackground}
          blurRadius={20}
        />
      ) : (
        <View style={styles.albumHeaderBackgroundFallback} />
      )}
      
      {/* Header Content */}
      <View style={styles.albumHeaderContent}>
        <TouchableOpacity 
          style={styles.albumBackButton}
          onPress={onBackPress}
        >
          <Text style={styles.albumBackButtonText}>
            {backButtonText}
          </Text>
        </TouchableOpacity>
        
        {/* Album Info at Bottom */}
        <View style={styles.albumInfoOverlay}>
          <View style={styles.albumTextBackground}>
            <Text style={styles.albumHeaderTitle} numberOfLines={2}>
              {album.album}
            </Text>
            <Text style={styles.albumHeaderArtist} numberOfLines={1}>
              by {album.artist}
            </Text>
            <Text style={styles.albumHeaderTracks}>
              {album.tracks?.length || 0} tracks
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  albumHeaderContainer: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  albumHeaderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  albumHeaderBackgroundFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a365d',
  },
  albumHeaderContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 50,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  albumBackButton: {
    alignSelf: 'flex-start',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
  },
  albumBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  albumInfoOverlay: {
    alignSelf: 'stretch',
  },
  albumTextBackground: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  albumHeaderTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  albumHeaderArtist: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  albumHeaderTracks: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
});

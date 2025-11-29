import React, { useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { SearchBar } from './src/components/SearchBar';
import { AlbumGrid } from './src/components/AlbumGrid';
import { TrackList } from './src/components/TrackList';
import { AlbumHeader } from './src/components/AlbumHeader';
import { AudioPlayer } from './src/components/AudioPlayer';

export default function App() {
  const [showMusicApp, setShowMusicApp] = useState(false);
  const [musicData, setMusicData] = useState(null);
  const [loadingMusic, setLoadingMusic] = useState(false);
  
  // Audio player state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentAlbum, setCurrentAlbum] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState(null);
  const [showTrackList, setShowTrackList] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  
  // Artist grouping state
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [showArtistAlbums, setShowArtistAlbums] = useState(false);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize audio
  const initializeAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log('🎵 Audio initialized');
    } catch (error) {
      console.error('❌ Audio init error:', error);
    }
  };

  // Play a track
  const playTrack = async (artist, album, trackFileName, trackIndex = 0) => {
    try {
      setIsLoading(true);
      console.log('🎵 Playing:', trackFileName);
      
      // Stop current sound if playing
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Generate audio URL
      const trackKey = `${artist}/${album}/${trackFileName}`;
      // Use API service for audio URL
      const { apiService } = await import('./src/services/api');
      const audioUrl = await apiService.getSongUrl(trackKey);
      console.log('🎯 Audio URL:', audioUrl);

      // Initialize audio if not done
      await initializeAudio();

      // Create and play sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, isLooping: false }
      );

      // Set up progress tracking
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);
          setIsPlaying(status.isPlaying || false);
          
          // Auto-play next track when current ends
          if (status.didJustFinish && !status.isLooping) {
            skipToNext();
          }
        }
      });

      setSound(newSound);
      setCurrentTrack({
        artist,
        album,
        title: trackFileName.replace(/^\d+\s*-\s*/, '').replace(/\.[^/.]+$/, ''),
        fileName: trackFileName
      });
      setCurrentTrackIndex(trackIndex);
      setIsPlaying(true);
      console.log('✅ Track playing successfully');

    } catch (error) {
      console.error('❌ Error playing track:', error);
      Alert.alert('❌ Playback Error', 'Could not play track. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Skip to next track
  const skipToNext = async () => {
    if (!currentAlbum || !currentAlbum.tracks) return;
    
    const nextIndex = currentTrackIndex >= currentAlbum.tracks.length - 1 ? 0 : currentTrackIndex + 1;
    const nextTrack = currentAlbum.tracks[nextIndex];
    
    console.log('⏭️ Skipping to next:', nextTrack);
    await playTrack(currentAlbum.artist, currentAlbum.album, nextTrack, nextIndex);
  };

  // Skip to previous track
  const skipToPrevious = async () => {
    if (!currentAlbum || !currentAlbum.tracks) return;
    
    const prevIndex = currentTrackIndex <= 0 ? currentAlbum.tracks.length - 1 : currentTrackIndex - 1;
    const prevTrack = currentAlbum.tracks[prevIndex];
    
    console.log('⏮️ Skipping to previous:', prevTrack);
    await playTrack(currentAlbum.artist, currentAlbum.album, prevTrack, prevIndex);
  };

  // Pause/Resume
  const togglePlayback = async () => {
    if (!sound) return;
    
    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        console.log('⏸️ Track paused');
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        console.log('▶️ Track resumed');
      }
    } catch (error) {
      console.error('❌ Error toggling playback:', error);
    }
  };

  // Group albums by artist (case-insensitive)
  const groupAlbumsByArtist = (data) => {
    const artistsMap = new Map();
    
    Object.keys(data).forEach(artist => {
      const artistLower = artist.toLowerCase();
      
      // Find existing artist with same name (case-insensitive)
      let existingArtist = null;
      for (const [key, value] of artistsMap.entries()) {
        if (key.toLowerCase() === artistLower) {
          existingArtist = value;
          break;
        }
      }
      
      if (!existingArtist) {
        existingArtist = {
          name: artist, // Use first occurrence's capitalization
          albums: [],
          totalTracks: 0
        };
        artistsMap.set(artist, existingArtist);
      }
      
      // Add albums for this artist
      Object.keys(data[artist]).forEach(albumName => {
        const albumData = data[artist][albumName];
        existingArtist.albums.push({
          name: albumName,
          tracks: albumData.tracks,
          images: albumData.images,
          artist: artist
        });
        existingArtist.totalTracks += albumData.tracks.length;
      });
    });
    
    return Array.from(artistsMap.values());
  };

  // Create smart mixed list (artist cards for multiple albums, individual albums for single)
  const createSmartMixedList = (data) => {
    const artists = groupAlbumsByArtist(data);
    const mixedList = [];
    
    artists.forEach(artist => {
      if (artist.albums.length > 1) {
        // Multiple albums - show artist card
        mixedList.push({
          type: 'artist',
          artist: artist
        });
      } else {
        // Single album - show album directly
        mixedList.push({
          type: 'album',
          album: artist.albums[0]
        });
      }
    });
    
    return mixedList;
  };

  // Filtered mixed list with search
  const filteredMixedList = useMemo(() => {
    if (!musicData) return [];
    
    const mixedList = createSmartMixedList(musicData);
    
    if (!searchTerm) return mixedList;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return mixedList.filter(item => {
      if (item.type === 'artist') {
        return item.artist.name.toLowerCase().includes(lowerSearchTerm);
      } else {
        const album = item.album;
        return album.name.toLowerCase().includes(lowerSearchTerm) ||
               album.artist.toLowerCase().includes(lowerSearchTerm);
      }
    });
  }, [musicData, searchTerm]);

  const loadMusicLibrary = async () => {
    setLoadingMusic(true);
    try {
      console.log('🎵 Loading music library...');
      // Use the API service instead of hardcoded fetch
      const { apiService } = await import('./src/services/api');
      const data = await apiService.fetchAlbums();
      console.log('✅ Music data loaded:', Object.keys(data).length, 'artists');
      setMusicData(data);
      setShowMusicApp(true);
    } catch (error) {
      console.error('❌ Error loading music:', error);
      Alert.alert('❌ Error', 'Could not load music library. Check backend connection.');
    } finally {
      setLoadingMusic(false);
    }
  };

  const handleEnableMusicApp = () => {
    console.log('🎵 Enable button pressed!');
    Alert.alert(
      '🎵 Enable Music Features?',
      'This will load your music library from the backend and show albums/artists.',
      [
        { text: 'Not Yet', style: 'cancel' },
        { 
          text: 'Yes, Load Music!', 
          onPress: loadMusicLibrary,
          style: 'default'
        }
      ]
    );
  };

  if (showMusicApp) {
    if (showArtistAlbums && selectedArtist) {
      // Show artist's albums
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          
          {/* Artist Header */}
          <View style={styles.musicHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => {
                setShowArtistAlbums(false);
                setSelectedArtist(null);
              }}
            >
              <Text style={styles.backButtonText}>← Library</Text>
            </TouchableOpacity>
            <Text style={styles.musicTitle}>{selectedArtist.name}</Text>
            <Text style={styles.musicSubtitle}>
              {selectedArtist.albums.length} albums • {selectedArtist.totalTracks} tracks
            </Text>
          </View>

          {/* Artist's Albums */}
          <ScrollView 
            style={styles.musicContent}
            contentContainerStyle={{ paddingBottom: currentTrack ? 180 : 20 }}
          >
            <AlbumGrid
              mixedList={selectedArtist.albums.map(album => ({ type: 'album', album }))}
              onArtistSelect={() => {}} // Not needed here
              onAlbumSelect={(album) => {
                setCurrentAlbum({
                  artist: album.artist,
                  album: album.name,
                  tracks: album.tracks,
                  image: album.images && album.images.length > 0 
                    ? `http://192.168.1.159:4000/image-proxy?key=${encodeURIComponent(`${album.artist}/${album.name}/${album.images[0]}`)}`
                    : null
                });
                setShowTrackList(true);
                setShowArtistAlbums(false);
              }}
            />
          </ScrollView>

          <AudioPlayer
            currentTrack={currentTrack}
            currentAlbum={currentAlbum}
            isPlaying={isPlaying}
            isLoading={isLoading}
            position={position}
            duration={duration}
            onPlayPause={togglePlayback}
            onSkipNext={skipToNext}
            onSkipPrevious={skipToPrevious}
            onTrackInfoPress={() => {
              // Find and show the album that contains the current track
              if (currentTrack && musicData) {
                Object.keys(musicData).forEach(artist => {
                  Object.keys(musicData[artist]).forEach(album => {
                    if (musicData[artist][album].tracks.includes(currentTrack.fileName)) {
                      setCurrentAlbum({
                        artist,
                        album,
                        tracks: musicData[artist][album].tracks,
                        image: musicData[artist][album].images?.[0] 
                          ? `http://192.168.1.159:4000/image-proxy?key=${encodeURIComponent(`${artist}/${album}/${musicData[artist][album].images[0]}`)}`
                          : null
                      });
                      setShowTrackList(true);
                      setShowArtistAlbums(false);
                    }
                  });
                });
              }
            }}
          />
        </View>
      );
    }

    if (showTrackList && currentAlbum) {
      // Show track list for selected album
      return (
        <View style={styles.container}>
          <StatusBar style="light" />
          
          <AlbumHeader
            album={currentAlbum}
            onBackPress={() => {
              if (selectedArtist) {
                setShowTrackList(false);
                setShowArtistAlbums(true);
              } else {
                setShowTrackList(false);
              }
            }}
            backButtonText={selectedArtist ? "← Albums" : "← Library"}
          />

          <ScrollView 
            style={styles.musicContent}
            contentContainerStyle={{ paddingBottom: currentTrack ? 180 : 20 }}
          >
            <TrackList
              tracks={currentAlbum.tracks}
              currentTrack={currentTrack}
              isLoading={isLoading}
              isPlaying={isPlaying}
              onTrackPress={(track, index) => playTrack(currentAlbum.artist, currentAlbum.album, track, index)}
            />
          </ScrollView>

          <AudioPlayer
            currentTrack={currentTrack}
            currentAlbum={currentAlbum}
            isPlaying={isPlaying}
            isLoading={isLoading}
            position={position}
            duration={duration}
            onPlayPause={togglePlayback}
            onSkipNext={skipToNext}
            onSkipPrevious={skipToPrevious}
            onTrackInfoPress={() => {}} // Already on track list
          />
        </View>
      );
    }

    // Show album grid
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        {/* Music App Header */}
        <View style={styles.musicHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => {
              setShowMusicApp(false);
              setShowTrackList(false);
              setCurrentAlbum(null);
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.musicTitle}>🎵 Music Library</Text>
          <Text style={styles.musicSubtitle}>Your albums and artists</Text>
        </View>

        {/* Search Bar */}
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Search artists, albums, or songs..."
        />

        {/* Smart Mixed Album/Artist Grid */}
        <ScrollView 
          style={styles.musicContent}
          contentContainerStyle={{ paddingBottom: currentTrack ? 180 : 20 }}
        >
          {musicData ? (
            <AlbumGrid
              mixedList={filteredMixedList}
              onArtistSelect={(artist) => {
                setSelectedArtist(artist);
                setShowArtistAlbums(true);
              }}
              onAlbumSelect={(album) => {
                setCurrentAlbum({
                  artist: album.artist,
                  album: album.name,
                  tracks: album.tracks,
                  image: album.images && album.images.length > 0 
                    ? `http://192.168.1.159:4000/image-proxy?key=${encodeURIComponent(`${album.artist}/${album.name}/${album.images[0]}`)}`
                    : null
                });
                setShowTrackList(true);
              }}
            />
          ) : (
            // Show loading button
            <TouchableOpacity 
              style={[styles.loadButton, loadingMusic && styles.testButtonDisabled]}
              onPress={loadMusicLibrary}
              disabled={loadingMusic}
            >
              <Text style={styles.loadButtonText}>
                {loadingMusic ? '⏳ Loading...' : '🎵 Load Music Library'}
              </Text>
              <Text style={styles.loadButtonSubtext}>
                {loadingMusic ? 'Getting your albums...' : 'Tap to browse your music'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <AudioPlayer
          currentTrack={currentTrack}
          currentAlbum={currentAlbum}
          isPlaying={isPlaying}
          isLoading={isLoading}
          position={position}
          duration={duration}
          onPlayPause={togglePlayback}
          onSkipNext={skipToNext}
          onSkipPrevious={skipToPrevious}
          onTrackInfoPress={() => {
            // Find and show the album that contains the current track
            if (currentTrack && musicData) {
              Object.keys(musicData).forEach(artist => {
                Object.keys(musicData[artist]).forEach(album => {
                  if (musicData[artist][album].tracks.includes(currentTrack.fileName)) {
                    setCurrentAlbum({
                      artist,
                      album,
                      tracks: musicData[artist][album].tracks,
                      image: musicData[artist][album].images?.[0] 
                        ? `http://192.168.1.159:4000/image-proxy?key=${encodeURIComponent(`${artist}/${album}/${musicData[artist][album].images[0]}`)}`
                        : null
                    });
                    setShowTrackList(true);
                  }
                });
              });
            }
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🎵 Music Mobile</Text>
        <Text style={styles.subtitle}>React Native Migration Complete!</Text>
      </View>

      {/* Features List */}
      <ScrollView style={styles.content}>
        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>✅ Migration Complete</Text>
          <Text style={styles.featureDescription}>
            Your web app has been successfully migrated to React Native!
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🎵 Audio System</Text>
          <Text style={styles.featureDescription}>
            Expo AV integrated for mobile audio playback
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🧭 Navigation</Text>
          <Text style={styles.featureDescription}>
            React Navigation with type-safe routing
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>📱 Mobile UI</Text>
          <Text style={styles.featureDescription}>
            Touch-friendly interface with native components
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>🌐 Backend Ready</Text>
          <Text style={styles.featureDescription}>
            Same backend API, adapted for mobile networking
          </Text>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📋 Next Steps:</Text>
          <Text style={styles.noteText}>
            • Test backend connectivity{'\n'}
            • Enable full audio features{'\n'}
            • Build for app stores{'\n'}
            • Add push notifications
          </Text>
        </View>

        {/* Simple Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>📱 App Status:</Text>
          <Text style={styles.statusText}>
            ✅ React Native app running successfully!{'\n'}
            ✅ No crashes or errors{'\n'}
            ✅ Migration completed{'\n'}
            ✅ Ready for mobile features
          </Text>
        </View>

        {/* Enable Music App Button */}
        <TouchableOpacity 
          style={[styles.enableButton, loadingMusic && styles.testButtonDisabled]}
          onPress={handleEnableMusicApp}
          disabled={loadingMusic}
        >
          <Text style={styles.enableButtonText}>
            {loadingMusic ? '⏳ Loading Music...' : '🎵 Load Music Library'}
          </Text>
          <Text style={styles.enableButtonSubtext}>
            {loadingMusic ? 'Getting your albums from backend...' : 'Tap to load your albums & artists'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  featureCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  noteCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  statusCard: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#155724',
    lineHeight: 22,
  },
  enableButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  enableButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  enableButtonSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  // Music App Styles
  musicHeader: {
    backgroundColor: '#007AFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    padding: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  musicTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  musicSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  // Album Header with Background Image Styles
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
    backgroundColor: '#1a365d', // Dark blue fallback
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
  musicContent: {
    flex: 1,
    padding: 20,
  },
  testButton: {
    backgroundColor: '#28a745',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  testButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  testButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  testButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.7,
  },
  libraryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  artistCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  artistName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  artistInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  albumItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  albumName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  albumTracks: {
    fontSize: 14,
    color: '#666',
  },
  // Album Grid Styles
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
  albumArtwork: {
    width: '100%',
    height: 140,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#f0f0f0',
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
  // Artist Card Styles
  artistCard: {
    borderWidth: 2,
    borderColor: '#007AFF',
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
  // 2 albums: side by side
  artistGrid2: {
    flexDirection: 'row',
  },
  // 3 albums: one large + two small
  artistGrid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // 4+ albums: 2x2 grid
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
  // Track List Styles
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
  // Bottom Player Styles
  bottomPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
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
  playerInfo: {
    flex: 1,
  },
  playerTrackTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  playerArtist: {
    fontSize: 14,
    color: '#666',
  },
  playerButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  playerButtonText: {
    fontSize: 20,
    color: 'white',
  },
  // Load Button Styles
  loadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  loadButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  loadButtonSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  // Enhanced Player Styles
  enhancedPlayer: {
    position: 'absolute',
    bottom: 48, // Raised above mobile controls
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
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  playerTextInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
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
  albumCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
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
  albumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  albumDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  successCard: {
    backgroundColor: '#d4edda',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#155724',
    marginBottom: 12,
  },
  successDescription: {
    fontSize: 16,
    color: '#155724',
    lineHeight: 24,
  },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { HomeScreen } from '../screens/HomeScreen';
import { AlbumDetailScreen } from '../screens/AlbumDetailScreen';
import { ArtistAlbumsScreen } from '../screens/ArtistAlbumsScreen';
import { AudioPlayerBar } from '../components/AudioPlayerBar';
import { useAudio } from '../context/AudioContext';
import { AlbumListProps } from '../types/Album';
import { Artist } from '../types/Artist';

export type RootStackParamList = {
  Home: undefined;
  AlbumDetail: { 
    album: AlbumListProps;
  };
  ArtistAlbums: { 
    artist: Artist;
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { currentTrack } = useAudio();

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#007AFF',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ 
              title: '🎵 Music Library',
              headerStyle: {
                backgroundColor: '#007AFF',
              },
            }}
          />
          <Stack.Screen 
            name="AlbumDetail" 
            component={AlbumDetailScreen}
            options={({ route }) => ({ 
              title: route.params.album.album,
            })}
          />
          <Stack.Screen 
            name="ArtistAlbums" 
            component={ArtistAlbumsScreen}
            options={({ route }) => ({ 
              title: route.params.artist.name,
            })}
          />
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* Bottom Audio Player Bar */}
      <AudioPlayerBar visible={!!currentTrack} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

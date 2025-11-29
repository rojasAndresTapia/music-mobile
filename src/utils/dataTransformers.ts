import { AlbumListProps } from '../types/Album';
import { Track } from '../types/Track';
import { Artist } from '../types/Artist';
import { BackendAlbum, apiService } from '../services/api';

// Transform backend album structure to frontend structure
export const transformBackendAlbums = async (backendData: BackendAlbum): Promise<AlbumListProps[]> => {
  const albums: AlbumListProps[] = [];

  for (const artist in backendData) {
    for (const albumName in backendData[artist]) {
      const albumData = backendData[artist][albumName];
      
      // Transform tracks
      const tracks: Track[] = albumData.tracks.map((songFileName: string) => {
        // Extract song title from filename (remove extension and track number)
        const title = songFileName
          .replace(/^\d+\s*-\s*/, '') // Remove track number prefix
          .replace(/\.[^/.]+$/, '') // Remove file extension
          .replace(new RegExp(`^${artist}\\s*-\\s*`, 'i'), '') // Remove artist prefix if present
          .trim();

        return {
          album: albumName,
          title,
          artist,
          src: '', // Will be populated when track is played
          key: `${artist}/${albumName}/${songFileName}` // S3 key without albums/ prefix (backend will add it)
        };
      });

      // Get album artwork URL if available
      let thumbnailUrl = '';
      if (albumData.images && albumData.images.length > 0) {
        // Use the first image as the thumbnail
        const imageKey = `${artist}/${albumName}/${albumData.images[0]}`;
        try {
          thumbnailUrl = await apiService.getImageUrl(imageKey);
        } catch (error) {
          console.error('Error getting album artwork:', error);
          // Keep empty string as fallback
        }
      }

      albums.push({
        author: artist,
        album: albumName,
        thumbnail: thumbnailUrl,
        tracks
      });
    }
  }

  return albums;
};

// Get streaming URL for a track
export const getTrackStreamingUrl = async (track: Track): Promise<string> => {
  if (!track.key) {
    throw new Error('Track does not have a valid key for streaming');
  }
  
  return await apiService.getSongUrl(track.key);
};

// Clean up filename to get a proper song title
export const cleanSongTitle = (filename: string, artist?: string): string => {
  let title = filename;
  
  // Remove file extension
  title = title.replace(/\.[^/.]+$/, '');
  
  // Remove track number prefix (e.g., "01 - ", "1. ", etc.)
  title = title.replace(/^\d+\s*[-.\s]+\s*/, '');
  
  // Remove artist name if it appears at the beginning
  if (artist) {
    const artistRegex = new RegExp(`^${artist}\\s*[-\\s]+`, 'i');
    title = title.replace(artistRegex, '');
  }
  
  return title.trim();
};

// Group albums by artist for artist view (case-insensitive)
export const groupAlbumsByArtist = (albums: AlbumListProps[]): Artist[] => {
  const artistsMap = new Map<string, Artist>();

  albums.forEach(album => {
    const artistName = album.author;
    const artistNameLower = artistName.toLowerCase();
    
    // Find existing artist with same name (case-insensitive)
    let existingArtist: Artist | undefined;
    artistsMap.forEach((artist, key) => {
      if (key.toLowerCase() === artistNameLower && !existingArtist) {
        existingArtist = artist;
      }
    });
    
    if (!existingArtist) {
      // Create new artist entry
      const newArtist: Artist = {
        name: artistName, // Use the first occurrence's capitalization
        albums: [],
        thumbnail: '', // Will be set to first album's thumbnail
        totalTracks: 0
      };
      artistsMap.set(artistName, newArtist);
      existingArtist = newArtist;
    }

    existingArtist.albums.push(album);
    existingArtist.totalTracks += album.tracks.length;
    
    // Use the first album's thumbnail as artist thumbnail
    if (!existingArtist.thumbnail && album.thumbnail) {
      existingArtist.thumbnail = album.thumbnail;
    }
  });

  // Sort artists alphabetically
  return Array.from(artistsMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
};

// Create smart mixed list: artist cards (if multiple albums) + individual albums (if single album)
export interface MixedListItem {
  type: 'artist' | 'album';
  artist?: Artist;
  album?: AlbumListProps;
}

export const createSmartMixedList = (albums: AlbumListProps[]): MixedListItem[] => {
  const artists = groupAlbumsByArtist(albums);
  const mixedList: MixedListItem[] = [];

  artists.forEach(artist => {
    if (artist.albums.length > 1) {
      // Artist has multiple albums - show artist card
      mixedList.push({
        type: 'artist',
        artist: artist
      });
    } else {
      // Artist has single album - show album directly
      mixedList.push({
        type: 'album',
        album: artist.albums[0]
      });
    }
  });

  return mixedList;
};

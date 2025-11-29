import { AlbumListProps } from './Album';

export interface Artist {
  name: string;
  albums: AlbumListProps[];
  thumbnail?: string; // URL string for React Native
  totalTracks: number;
}

export interface ArtistViewProps {
  artists: Artist[];
  onArtistSelect: (artist: Artist) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
}

export interface ArtistAlbumsProps {
  artist: Artist;
  onAlbumSelect: (album: AlbumListProps) => void;
  onBackToList: () => void;
  onTrackSelect?: (track: any, trackIndex: number) => void;
}

export interface NavigationState {
  view: 'mixed' | 'artist-albums';
  selectedArtist?: Artist;
}

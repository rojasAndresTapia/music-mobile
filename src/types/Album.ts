import { Track } from './Track';

export interface AlbumListProps {
  author: string;
  album: string;
  thumbnail?: string; // URL string for React Native Image component
  tracks: Track[];
}

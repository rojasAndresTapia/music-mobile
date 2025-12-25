import { AlbumListProps } from './Album';

export interface Track {
  album: string;
  title: string;
  src: string; // URL from backend for streaming
  artist: string;
  key?: string; // S3 key for backend tracks
  duration?: number; // Duration in seconds (optional, loaded when track is played)
}

export interface DisplayTrackProps {
  currentTrack: Track;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  handleNext?: () => void;
  currentAlbum?: AlbumListProps | null;
  onTrackSelect?: (track: Track, trackIndex: number, source?: string) => void;
  playTrack?: (track: Track) => Promise<void>;
  isLoadingTrack?: boolean;
  isPlaying?: boolean;
  setIsPlaying?: React.Dispatch<React.SetStateAction<boolean>>;
}

// Note: Removed audioRef and progressBarRef as React Native uses different audio libraries

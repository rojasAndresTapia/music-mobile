import { useState, useEffect } from 'react';
import { AlbumListProps } from '../types/Album';
import { Track } from '../types/Track';
import { apiService } from '../services/api';
import { transformBackendAlbums, getTrackStreamingUrl } from '../utils/dataTransformers';
import { audioService } from '../services/audioService';

interface UseMusicDataReturn {
  albums: AlbumListProps[];
  loading: boolean;
  error: string | null;
  playTrack: (track: Track, onPlayStart?: () => void) => Promise<void>;
  refreshAlbums: () => Promise<void>;
  isLoadingTrack: boolean;
}

export const useMusicData = (): UseMusicDataReturn => {
  const [albums, setAlbums] = useState<AlbumListProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState<boolean>(false);
  const [currentlyLoadingTrack, setCurrentlyLoadingTrack] = useState<string>('');

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const backendData = await apiService.fetchAlbums();
      const transformedAlbums = await transformBackendAlbums(backendData);
      
      setAlbums(transformedAlbums);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch albums');
      console.error('Error fetching albums:', err);
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: Track, onPlayStart?: () => void) => {
    const trackId = `${track.artist}|${track.album}|${track.title}`;
    
    console.log('🎯 useMusicData.playTrack called for:', track.title);
    console.log('Current loading state:', { isLoadingTrack, currentlyLoadingTrack });
    
    // Allow loading if it's a different track, only prevent if loading the same track
    if (isLoadingTrack && currentlyLoadingTrack === trackId) {
      console.log('Already loading this exact track, ignoring request for:', track.title);
      return;
    }

    try {
      // Initialize audio service if not already done
      await audioService.initialize();
      
      setIsLoadingTrack(true);
      setCurrentlyLoadingTrack(trackId);
      setError(null);

      // Always use the full reload approach for consistency
      console.log('🎯 Using full reload approach for all tracks to ensure consistency');
      
      // If track already has a src URL (cached), use it
      if (track.src && track.src.startsWith('http')) {
        console.log('📦 Using cached URL for track:', track.title);
        
        // Convert to React Native Track Player format
        const rnTrack = audioService.convertTrackToRNTrack(track, track.src);
        
        // Set the track and play
        await audioService.setQueue([rnTrack]);
        await audioService.play();
        
        console.log('Audio play() called successfully');
        
        // Manually trigger play callback since audio events might not fire
        if (onPlayStart) {
          console.log('🔄 Triggering play callback to update UI state');
          onPlayStart();
        }
        return;
      }

      // If it's a backend track, get streaming URL
      if (track.key) {
        const streamingUrl = await getTrackStreamingUrl(track);
        track.src = streamingUrl; // Cache the URL
        
        // Convert to React Native Track Player format
        const rnTrack = audioService.convertTrackToRNTrack(track, streamingUrl);
        
        // Set the track and play
        await audioService.setQueue([rnTrack]);
        await audioService.play();
        
        console.log('Audio play() called successfully');
        
        // Manually trigger play callback since audio events might not fire
        if (onPlayStart) {
          console.log('🔄 Triggering play callback to update UI state');
          onPlayStart();
        }
      } else {
        throw new Error('Track has no key for streaming');
      }
    } catch (err) {
      // Ignore AbortError as it's expected when switching tracks quickly
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Track loading was aborted (likely due to track change)');
        return;
      }
      console.error('Error playing track:', err);
      setError(err instanceof Error ? err.message : 'Failed to play track');
    } finally {
      setIsLoadingTrack(false);
      setCurrentlyLoadingTrack('');
    }
  };

  const refreshAlbums = async () => {
    await fetchAlbums();
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  return {
    albums,
    loading,
    error,
    playTrack,
    refreshAlbums,
    isLoadingTrack
  };
};

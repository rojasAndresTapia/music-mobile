import { useState, useEffect } from 'react';
import { AlbumListProps } from '../types/Album';
import { apiService } from '../services/api';
import { transformBackendAlbums } from '../utils/dataTransformers';

interface UseMusicDataReturn {
  albums: AlbumListProps[];
  loading: boolean;
  error: string | null;
  refreshAlbums: () => Promise<void>;
}

export const useMusicData = (): UseMusicDataReturn => {
  const [albums, setAlbums] = useState<AlbumListProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    refreshAlbums
  };
};

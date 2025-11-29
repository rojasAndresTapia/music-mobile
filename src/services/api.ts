// API service for connecting with the music backend
// Using Railway deployed backend - accessible from anywhere!
// No more network restrictions or Falcon blocking
const API_BASE_URL = 'https://music-player-backend-production-f724.up.railway.app'; // Railway production backend

export interface BackendAlbum {
  [artist: string]: {
    [album: string]: {
      tracks: string[];
      images: string[];
    };
  };
}

export interface SongUrlResponse {
  url: string;
}

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testing connection to: ${this.baseUrl}/test`);
      const response = await fetch(`${this.baseUrl}/test`);
      if (!response.ok) {
        console.error(`❌ Test connection failed with status: ${response.status}`);
        return false;
      }
      const data = await response.json();
      console.log('✅ Test connection successful:', data);
      return true;
    } catch (error) {
      console.error('❌ Test connection error:', error);
      return false;
    }
  }

  async fetchAlbums(): Promise<BackendAlbum> {
    try {
      console.log(`🔍 Fetching albums from: ${this.baseUrl}/albums`);
      
      // Test connection first
      const connectionOk = await this.testConnection();
      if (!connectionOk) {
        throw new Error('Backend connection test failed');
      }
      
      const response = await fetch(`${this.baseUrl}/albums`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Albums fetched successfully');
      return data;
    } catch (error) {
      console.error('❌ Error fetching albums:', error);
      throw error;
    }
  }

  async getSongUrl(key: string): Promise<string> {
    // Use the audio proxy endpoint directly instead of signed URLs
    return `${this.baseUrl}/audio-proxy?key=${encodeURIComponent(key)}`;
  }

  async getImageUrl(key: string): Promise<string> {
    // Use the image proxy endpoint directly instead of signed URLs
    return `${this.baseUrl}/image-proxy?key=${encodeURIComponent(key)}`;
  }
}

export const apiService = new ApiService();

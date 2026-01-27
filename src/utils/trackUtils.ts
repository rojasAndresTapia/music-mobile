import { Track } from '../types/Track';

/**
 * Shuffles an array of tracks using Fisher-Yates algorithm
 * @param tracks - Array of tracks to shuffle
 * @returns A new array with tracks in random order
 */
export const shuffleTracks = (tracks: Track[]): Track[] => {
  if (tracks.length <= 1) {
    return [...tracks];
  }

  // Create a copy to avoid mutating the original array
  const shuffled = [...tracks];

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
};

/**
 * Creates a shuffled version of tracks while maintaining a mapping
 * to the original indices for proper track navigation
 * @param tracks - Original array of tracks
 * @returns Object containing shuffled tracks and index mapping
 */
export const createShuffledPlaylist = (tracks: Track[]): {
  shuffledTracks: Track[];
  originalIndexMap: Map<number, number>; // Maps shuffled index to original index
} => {
  const shuffledTracks = shuffleTracks(tracks);
  const originalIndexMap = new Map<number, number>();

  // Create mapping from shuffled index to original index
  shuffledTracks.forEach((shuffledTrack, shuffledIndex) => {
    const originalIndex = tracks.findIndex(
      (track) => track.title === shuffledTrack.title && track.artist === shuffledTrack.artist
    );
    if (originalIndex >= 0) {
      originalIndexMap.set(shuffledIndex, originalIndex);
    }
  });

  return {
    shuffledTracks,
    originalIndexMap,
  };
};

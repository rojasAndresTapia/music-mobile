import TrackPlayer, { Event } from 'react-native-track-player';

// This service handles background playback events
const PlaybackService = async () => {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('🎵 Remote play event');
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('⏸️ Remote pause event');
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('⏭️ Remote next event');
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('⏮️ Remote previous event');
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('⏹️ Remote stop event');
    TrackPlayer.destroy();
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
    console.error('❌ Playback error:', error);
  });

  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, (event) => {
    console.log('🔄 Track changed:', event);
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    console.log('📊 Playback state:', event.state);
  });
};

export default PlaybackService;

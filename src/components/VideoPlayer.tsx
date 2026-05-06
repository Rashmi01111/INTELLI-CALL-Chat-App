import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  playsInline?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onClick?: () => void;
}

/**
 * Production-ready Video Player Component
 * Features:
 * - Lazy loading with intersection observer
 * - Custom controls with fullscreen support
 * - Error handling with retry
 * - Loading states
 * - Tap to play/pause
 * - Volume control
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  className = '',
  autoPlay = false,
  muted = true,
  loop = true,
  controls = true,
  playsInline = true,
  onPlay,
  onPause,
  onEnded,
  onError,
  onTimeUpdate,
  onLoadedMetadata,
  onClick
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isInViewport, setIsInViewport] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
        
        // Auto-play when in viewport (for reels)
        if (entry.isIntersecting && autoPlay && videoRef.current && !isPlaying) {
          videoRef.current.play().catch(() => {
            // Auto-play might be blocked, that's okay
          });
        }
        
        // Pause when out of viewport
        if (!entry.isIntersecting && videoRef.current && isPlaying) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [autoPlay, isPlaying]);

  // Load video when in viewport
  useEffect(() => {
    if (isInViewport && videoRef.current && !hasLoaded) {
      videoRef.current.load();
      setHasLoaded(true);
    }
  }, [isInViewport, hasLoaded, src]);

  // Handle play/pause
  const togglePlay = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(err => {
        console.error('Play error:', err);
        setError('Failed to play video');
        onError?.(err);
      });
    }
  }, [isPlaying, onError]);

  // Handle mute toggle
  const toggleMute = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!videoRef.current) return;
    
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Handle fullscreen
  const toggleFullscreen = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    const current = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    
    if (dur > 0) {
      setProgress((current / dur) * 100);
      onTimeUpdate?.(current, dur);
    }
  }, [onTimeUpdate]);

  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    const dur = videoRef.current.duration;
    setDuration(dur);
    setIsLoading(false);
    onLoadedMetadata?.(dur);
  }, [onLoadedMetadata]);

  const handleCanPlay = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const handleWaiting = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    if (!video?.error) return;

    let errorMessage = 'Failed to load video';
    
    switch (video.error.code) {
      case 1:
        errorMessage = 'Video loading aborted';
        break;
      case 2:
        errorMessage = 'Network error - check your connection';
        break;
      case 3:
        errorMessage = 'Video decoding error - format not supported';
        break;
      case 4:
        errorMessage = 'Video format not supported';
        break;
      default:
        errorMessage = 'Unknown video error';
    }

    setError(errorMessage);
    setIsLoading(false);
    onError?.(new Error(errorMessage));
  }, [onError]);

  // Retry loading
  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryCount(prev => prev + 1);
    
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, []);

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-black ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={(e) => {
        togglePlay(e);
        onClick?.();
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={hasLoaded ? src : undefined}
        poster={poster}
        muted={isMuted}
        loop={loop}
        playsInline={playsInline}
        preload={isInViewport ? 'auto' : 'none'}
        className="w-full h-full object-cover"
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onError={handleError}
        key={`${src}-${retryCount}`} // Force re-render on retry
      />

      {/* Loading State */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white p-4">
          <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
          <p className="text-sm text-center mb-3">{error}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRetry();
            }}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tap to Play Overlay (when paused and not loading) */}
      {!isPlaying && !isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
      )}

      {/* Custom Controls */}
      {controls && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer group">
            <div
              className="h-full bg-white rounded-full transition-all duration-100 group-hover:bg-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Mute/Unmute */}
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>

              {/* Duration */}
              <span className="text-sm text-white/80">
                {formatDuration(videoRef.current?.currentTime || 0)} / {formatDuration(duration)}
              </span>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <Maximize className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

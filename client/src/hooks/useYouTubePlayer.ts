import type { MutableRefObject } from "react";
import type {
  YouTubePlayer,
  YouTubeProps,
} from "react-youtube";

type UseYouTubePlayerProps = {
  playerRef: MutableRefObject<
    YouTubePlayer | null
  >;

  setDuration: (
    duration: number
  ) => void;

  onReady?: () => void;

  /*
   * Fires on every native player state change,
   * including ones triggered by clicking directly
   * on the video (not just our custom buttons).
   */
  onStateChange?: (
    state: number
  ) => void;
};

export function useYouTubePlayer({
  playerRef,
  setDuration,
  onReady,
  onStateChange,
}: UseYouTubePlayerProps) {

  const handlePlayerReady: YouTubeProps["onReady"] =
    (event) => {
      playerRef.current =
        event.target;

      setDuration(
        event.target.getDuration()
      );

      onReady?.();
    };

  const handlePlayerStateChange: YouTubeProps["onStateChange"] =
    (event) => {
      onStateChange?.(
        event.data
      );
    };

  return {
    handlePlayerReady,
    handlePlayerStateChange,
  };
}
import { useEffect } from "react";

type UsePlaybackSyncProps = {
  enabled: boolean;
  onSync: () => void;
};

export function usePlaybackSync({
  enabled,
  onSync,
}: UsePlaybackSyncProps) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = setInterval(() => {
      onSync();
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [enabled, onSync]);
}
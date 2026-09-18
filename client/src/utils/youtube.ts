export function extractVideoId(
  input: string
): string | null {
  const value = input.trim();

  // Direct video ID
  if (
    /^[a-zA-Z0-9_-]{11}$/.test(value)
  ) {
    return value;
  }

  try {
    const url = new URL(value);

    // youtube.com/watch?v=VIDEO_ID
    if (
      url.hostname.includes("youtube.com")
    ) {
      const videoId =
        url.searchParams.get("v");

      if (
        videoId &&
        /^[a-zA-Z0-9_-]{11}$/.test(videoId)
      ) {
        return videoId;
      }

      // youtube.com/embed/VIDEO_ID
      if (
        url.pathname.startsWith("/embed/")
      ) {
        const videoId =
          url.pathname.split("/")[2];

        if (
          videoId &&
          /^[a-zA-Z0-9_-]{11}$/.test(
            videoId
          )
        ) {
          return videoId;
        }
      }

      // youtube.com/shorts/VIDEO_ID
      if (
        url.pathname.startsWith("/shorts/")
      ) {
        const videoId =
          url.pathname.split("/")[2];

        if (
          videoId &&
          /^[a-zA-Z0-9_-]{11}$/.test(
            videoId
          )
        ) {
          return videoId;
        }
      }
    }

    // youtu.be/VIDEO_ID
    if (
      url.hostname.includes("youtu.be")
    ) {
      const videoId =
        url.pathname.substring(1);

      if (
        /^[a-zA-Z0-9_-]{11}$/.test(
          videoId
        )
      ) {
        return videoId;
      }
    }
  } catch {
    return null;
  }

  return null;
}
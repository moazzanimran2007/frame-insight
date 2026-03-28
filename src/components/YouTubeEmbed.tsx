interface YouTubeEmbedProps {
  videoUrl: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const YouTubeEmbed = ({ videoUrl }: YouTubeEmbedProps) => {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) return null;

  return (
    <div className="max-w-[960px] mx-auto px-7 pt-8">
      <h2 className="font-serif text-[22px] font-normal text-foreground mb-4">
        Watch & Listen
      </h2>
      <div className="relative w-full rounded-xl overflow-hidden border border-border bg-card" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}?rel=0`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
};

export default YouTubeEmbed;

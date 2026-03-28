import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentMode } from "./ContentModeSelector";

interface Segment {
  start: string;
  end: string;
  text: string;
  startSec: number;
  endSec: number;
}

interface LiveCommentaryProps {
  videoUrl: string;
  descriptions: string[];
  contentMode: ContentMode;
  captions: string | null;
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

function parseTimestamp(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

const MODE_CONFIG: Record<ContentMode, { narrationMode: string; label: string; icon: string }> = {
  entertainment: { narrationMode: "entertainment", label: "🎧 Entertainment", icon: "🎧" },
  explain: { narrationMode: "explain", label: "🎓 Explain", icon: "🎓" },
  summary: { narrationMode: "summary", label: "⚡ Summary", icon: "⚡" },
};

const LiveCommentary = ({ videoUrl, descriptions, contentMode, captions }: LiveCommentaryProps) => {
  const videoId = extractYouTubeId(videoUrl);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [generated, setGenerated] = useState(false);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<number | null>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;
    if ((window as any).YT?.Player) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, [videoId]);

  // Initialize player once API is ready
  useEffect(() => {
    if (!videoId) return;

    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new (window as any).YT.Player(`yt-live-player`, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onStateChange: (e: any) => {
            const playing = e.data === 1;
            setIsPlaying(playing);
            if (playing) {
              intervalRef.current = window.setInterval(() => {
                if (playerRef.current?.getCurrentTime) {
                  setCurrentTime(playerRef.current.getCurrentTime());
                }
              }, 200);
            } else if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && containerRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentTime]);

  const generateCommentary = useCallback(async () => {
    setIsGenerating(true);
    try {
      const config = MODE_CONFIG[contentMode];
      const { data, error } = await supabase.functions.invoke("narrate-video", {
        body: { descriptions, mode: config.narrationMode, captions, timed: true },
      });

      if (error) throw new Error(error.message || "Narration failed");
      if (data?.error) throw new Error(data.error);

      if (data?.segments && Array.isArray(data.segments)) {
        const parsed: Segment[] = data.segments.map((s: any) => ({
          start: s.start,
          end: s.end,
          text: s.text,
          startSec: parseTimestamp(s.start),
          endSec: parseTimestamp(s.end),
        }));
        setSegments(parsed);
        setGenerated(true);
        toast.success("Live commentary ready — press play!");
      } else if (data?.text) {
        // Fallback: split text into equal segments based on frame count
        const sentences = data.text.match(/[^.!?]+[.!?]+/g) || [data.text];
        const interval = 3;
        const fallback: Segment[] = sentences.map((s: string, i: number) => ({
          start: `${Math.floor((i * interval) / 60)}:${String((i * interval) % 60).padStart(2, "0")}`,
          end: `${Math.floor(((i + 1) * interval) / 60)}:${String(((i + 1) * interval) % 60).padStart(2, "0")}`,
          text: s.trim(),
          startSec: i * interval,
          endSec: (i + 1) * interval,
        }));
        setSegments(fallback);
        setGenerated(true);
        toast.success("Commentary ready — press play!");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate commentary");
    } finally {
      setIsGenerating(false);
    }
  }, [descriptions, contentMode, captions]);

  // Seek to segment on click
  const seekTo = useCallback((sec: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(sec, true);
      setCurrentTime(sec);
    }
  }, []);

  const activeIndex = segments.findIndex(
    (s) => currentTime >= s.startSec && currentTime < s.endSec
  );

  if (!videoId) return null;

  const config = MODE_CONFIG[contentMode];

  return (
    <div className="max-w-[1200px] mx-auto px-7 pt-8 pb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-[22px] font-normal text-foreground flex items-center gap-2">
          <span className="text-lg">🎙</span> Live Commentary
        </h2>
        {!generated && (
          <button
            onClick={generateCommentary}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 text-[13px] font-medium font-mono bg-foreground text-background px-4 py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Generating commentary…
              </>
            ) : (
              <>
                {config.icon} Generate {config.label.replace(/^[^\s]+\s/, "")} Commentary
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* Video Player - Left */}
        <div className="relative w-full rounded-xl overflow-hidden border border-border bg-card" style={{ paddingBottom: "56.25%" }}>
          <div id="yt-live-player" className="absolute inset-0 w-full h-full" />
        </div>

        {/* Commentary Panel - Right */}
        <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            {isPlaying && (
              <span className="w-2 h-2 bg-accent-foreground rounded-full animate-pulse" />
            )}
            <span className="text-[12px] font-mono font-medium text-foreground">
              {generated ? (isPlaying ? "LIVE" : "PAUSED") : "AI Commentary"}
            </span>
            {generated && (
              <span className="text-[11px] font-mono text-muted-foreground ml-auto">
                {segments.length} segments
              </span>
            )}
          </div>

          {/* Segments */}
          <div ref={containerRef} className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-[calc(56.25vw*0.56)] min-h-[300px]">
            {!generated ? (
              <div className="flex items-center justify-center h-full p-6 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Click "Generate Commentary" to begin</p>
                  <p className="text-xs text-muted-foreground/60">AI will create timed narration synced to the video</p>
                </div>
              </div>
            ) : (
              <div className="p-2">
                {segments.map((seg, i) => {
                  const isActive = i === activeIndex;
                  const isPast = activeIndex > -1 && i < activeIndex;

                  return (
                    <motion.div
                      key={i}
                      ref={isActive ? activeSegmentRef : undefined}
                      onClick={() => seekTo(seg.startSec)}
                      className={`relative cursor-pointer rounded-lg px-3.5 py-3 mb-1 transition-all duration-300 ${
                        isActive
                          ? "bg-accent/20 border border-accent/40"
                          : isPast
                          ? "opacity-40"
                          : "hover:bg-secondary/50"
                      }`}
                      animate={isActive ? { scale: 1.01 } : { scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <motion.div
                          layoutId="active-bar"
                          className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent-foreground rounded-full"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}

                      <div className="flex items-start gap-2.5">
                        <span
                          className={`text-[10px] font-mono font-medium rounded-full px-2 py-0.5 mt-0.5 shrink-0 ${
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {seg.start}
                        </span>
                        <p
                          className={`text-[13px] leading-relaxed transition-colors duration-300 ${
                            isActive
                              ? "text-foreground font-medium"
                              : isPast
                              ? "text-muted-foreground"
                              : "text-secondary-foreground"
                          }`}
                        >
                          {seg.text}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer with playback indicator */}
          {generated && (
            <div className="px-4 py-2.5 border-t border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <div className={`flex gap-[3px] ${isPlaying ? "" : "opacity-30"}`}>
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-[3px] bg-accent-foreground rounded-full"
                      animate={isPlaying ? {
                        height: [6, 14, 8, 12, 6],
                      } : { height: 6 }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {activeIndex > -1 ? `${activeIndex + 1}/${segments.length}` : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCommentary;

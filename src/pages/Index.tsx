import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import AnalyzerInput from "@/components/AnalyzerInput";
import ProgressBar from "@/components/ProgressBar";
import FrameCard from "@/components/FrameCard";
import StatsStrip from "@/components/StatsStrip";
import NarrationPlayer from "@/components/NarrationPlayer";
import AccessibilitySelector, { type AccessibilityMode } from "@/components/AccessibilitySelector";
import ContentModeSelector, { type ContentMode } from "@/components/ContentModeSelector";
import SubtitlePanel from "@/components/SubtitlePanel";
import YouTubeEmbed from "@/components/YouTubeEmbed";
import LiveCommentary from "@/components/LiveCommentary";
import ChatAssistant from "@/components/ChatAssistant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FrameResult {
  timestamp: string;
  imageBase64: string;
  description: string;
}

const STATUS_MSGS = [
  "Fetching video stream…",
  "Extracting frames…",
  "Running vision AI…",
  "Generating descriptions…",
  "Almost done…",
];

const Index = () => {
  const [accessMode, setAccessMode] = useState<AccessibilityMode | null>(null);
  const [contentMode, setContentMode] = useState<ContentMode | null>(null);
  const [frames, setFrames] = useState<FrameResult[]>([]);
  const [captions, setCaptions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [totalFrames, setTotalFrames] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");

  const handleAnalyze = useCallback(async (url: string) => {
    setIsLoading(true);
    setFrames([]);
    setCaptions(null);
    setError("");
    setCurrentVideoUrl(url);
    setStatusMsg(STATUS_MSGS[0]);
    setProgress({ processed: 0, total: 1 });

    try {
      setStatusMsg("Sending to AI for analysis…");

      const { data, error: fnError } = await supabase.functions.invoke(
        "analyze-video",
        { body: { url } }
      );

      if (fnError) throw new Error(fnError.message || "Edge function call failed");

      if (data?.error && (!data?.frames || data.frames.length === 0)) {
        throw new Error(data.error);
      }

      const resultFrames: FrameResult[] = data?.frames || [];
      setFrames(resultFrames);
      setCaptions(data?.captions || null);
      setProgress({ processed: resultFrames.length, total: resultFrames.length });

      if (data?.error) {
        toast.warning(data.error);
      }

      if (resultFrames.length > 0) {
        setTotalFrames((prev) => prev + resultFrames.length);
        setTotalVideos((prev) => prev + 1);
        const captionNote = data?.captions ? " (with transcript)" : "";
        toast.success(`Done — ${resultFrames.length} frames analyzed${captionNote}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Determine if URL input should be visible
  const showInput = accessMode === "hearing" || (accessMode && contentMode);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-7 py-4 border-b border-border bg-background/90 backdrop-blur-[10px] sticky top-0 z-10">
        <a href="#" className="flex items-baseline gap-[5px] no-underline text-foreground">
          <span className="font-serif text-xl italic text-foreground">FrameAI</span>
          <span className="text-[11px] font-medium font-mono text-accent-foreground bg-accent rounded-full px-[7px] py-[2px] tracking-[0.04em]">
            beta
          </span>
        </a>
        <ul className="flex gap-1.5 list-none">
          <li>
            <a href="#" className="text-[13px] font-medium text-foreground bg-surface-2 no-underline py-[7px] px-3 rounded-md transition-colors">
              Analyze
            </a>
          </li>
          <li>
            <a href="#" className="text-[13px] font-medium text-ink2 no-underline py-[7px] px-3 rounded-md transition-colors hover:bg-surface hover:text-foreground">
              History
            </a>
          </li>
          <li>
            <a href="#" className="text-[13px] font-medium text-ink2 no-underline py-[7px] px-3 rounded-md transition-colors hover:bg-surface hover:text-foreground">
              Docs
            </a>
          </li>
        </ul>
      </nav>

      {/* Hero */}
      <section className="py-[72px] px-7 max-w-[760px] mx-auto text-center" aria-labelledby="hero-heading">
        <div className="inline-flex items-center gap-[7px] text-xs font-medium font-mono text-accent-foreground bg-accent rounded-full px-3.5 py-[5px] mb-7 tracking-[0.05em]">
          <span className="w-1.5 h-1.5 bg-accent-foreground rounded-full animate-[pulse-dot_2s_infinite]" />
          AI vision · frame by frame
        </div>
        <h1 id="hero-heading" className="font-serif font-normal text-[clamp(36px,5.5vw,60px)] leading-[1.08] tracking-[-0.02em] text-foreground mb-[18px]">
          See what's<br />happening <em className="italic text-ink3">inside</em><br />any video
        </h1>
        <p className="text-[17px] text-ink2 max-w-[460px] mx-auto mb-11 leading-[1.65] font-light">
          Paste a YouTube URL. We extract frames and describe each moment with AI vision in plain language.
        </p>

        {/* Step 1: Accessibility mode */}
        <AccessibilitySelector onSelect={(m) => { setAccessMode(m); setContentMode(null); }} selected={accessMode} />

        {/* Step 2: Content mode (only for visual/full) */}
        {(accessMode === "visual" || accessMode === "full") && (
          <ContentModeSelector onSelect={setContentMode} selected={contentMode} />
        )}

        {/* URL input — shown after full selection */}
        {showInput && <AnalyzerInput onAnalyze={handleAnalyze} isLoading={isLoading} />}
      </section>

      <div className="h-px bg-border max-w-[960px] mx-auto" role="separator" />

      {/* Stats */}
      <StatsStrip totalFrames={totalFrames} totalVideos={totalVideos} />

      {/* Progress */}
      <AnimatePresence>
        {isLoading && (
          <ProgressBar processed={progress.processed} total={progress.total} statusMessage={statusMsg} />
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="max-w-[960px] mx-auto px-7 pb-6">
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 font-mono">
            {error}
          </div>
        </div>
      )}

      {/* Live Commentary — replaces separate embed + narration for visual/full */}
      {frames.length > 0 && currentVideoUrl && accessMode !== "hearing" && (
        <LiveCommentary
          videoUrl={currentVideoUrl}
          descriptions={frames.map((f) => `[${f.timestamp}] ${f.description}`)}
          contentMode={contentMode || "explain"}
          captions={captions}
        />
      )}

      {/* Fallback embed for hearing mode */}
      {frames.length > 0 && currentVideoUrl && accessMode === "hearing" && (
        <YouTubeEmbed videoUrl={currentVideoUrl} />
      )}

      {/* Subtitles — for hearing mode */}
      {frames.length > 0 && accessMode === "hearing" && (
        <SubtitlePanel descriptions={frames.map((f) => `[${f.timestamp}] ${f.description}`)} />
      )}

      <section className="max-w-[960px] mx-auto px-7 pt-8 pb-16" aria-labelledby="results-heading">
        {frames.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-serif text-[22px] font-normal text-foreground" id="results-heading">
                Frame timeline
              </h2>
              <div className="text-xs font-mono text-ink3 flex items-center gap-3">
                <span className="bg-surface border border-border rounded-full px-2.5 py-[3px]">
                  {frames.length} frames
                </span>
                {captions && (
                  <span className="bg-accent/10 border border-accent/20 text-accent-foreground rounded-full px-2.5 py-[3px]">
                    transcript found
                  </span>
                )}
                <span className="bg-surface border border-border rounded-full px-2.5 py-[3px]">
                  AI vision
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(272px,1fr))] gap-3.5" role="list" aria-label="Video frames with AI descriptions">
              {frames.map((frame, i) => (
                <FrameCard key={i} index={i} sceneNumber={i + 1} {...frame} />
              ))}
            </div>
          </>
        ) : !isLoading && !error ? (
          <div className="text-center py-20">
            <div className="w-[72px] h-[72px] bg-surface border border-border rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="2" y="4" width="24" height="17" rx="3" className="stroke-ink3" strokeWidth="1.5" />
                <path d="M11 10l8 3.5-8 3.5V10z" className="stroke-ink3" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 24h10" className="stroke-ink3" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 21v3" className="stroke-ink3" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="font-serif text-xl text-ink2 mb-1.5" id="results-heading">
              No video yet
            </h2>
            <p className="text-sm text-ink3">
              {accessMode ? "Enter a YouTube URL above and hit Analyze to get started." : "Select how you'd like to experience the video above."}
            </p>
          </div>
        ) : null}
      </section>

      <ChatAssistant />
    </div>
  );
};

export default Index;

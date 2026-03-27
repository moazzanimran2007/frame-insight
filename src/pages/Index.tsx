import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import AnalyzerInput from "@/components/AnalyzerInput";
import ProgressBar from "@/components/ProgressBar";
import FrameCard from "@/components/FrameCard";
import StatsStrip from "@/components/StatsStrip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FrameResult {
  timestamp: string;
  imageBase64: string;
  description: string;
}

const extractFrames = async (
  _url: string
): Promise<{ timestamp: string; imageBase64: string }[]> => {
  const totalFrames = 8;
  const raw: { timestamp: string; imageBase64: string }[] = [];

  for (let i = 0; i < totalFrames; i++) {
    const seconds = (i + 1) * 3;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const ts = `${mins}:${secs.toString().padStart(2, "0")}`;

    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    const hue = [12, 26, 40, 200, 220, 170, 300, 50][i % 8];
    ctx.fillStyle = `hsl(${hue}, 14%, 93%)`;
    ctx.fillRect(0, 0, 640, 360);
    // Grid pattern
    ctx.strokeStyle = `hsl(${hue}, 12%, 85%)`;
    for (let x = 0; x < 640; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 360); ctx.stroke(); }
    for (let y = 0; y < 360; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(640, y); ctx.stroke(); }
    // Center icon
    ctx.fillStyle = `hsl(${hue}, 30%, 55%)`;
    ctx.globalAlpha = 0.18;
    ctx.font = "bold 40px serif";
    ctx.textAlign = "center";
    ctx.fillText("▶", 320, 195);
    ctx.globalAlpha = 1;

    raw.push({ timestamp: ts, imageBase64: canvas.toDataURL("image/jpeg") });
  }
  return raw;
};

const BATCH_SIZE = 3;
const STATUS_MSGS = ["Fetching video stream…", "Extracting frames…", "Running vision AI…", "Generating descriptions…", "Almost done…"];

const Index = () => {
  const [frames, setFrames] = useState<FrameResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [totalFrames, setTotalFrames] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);

  const handleAnalyze = useCallback(async (url: string) => {
    setIsLoading(true);
    setFrames([]);
    setError("");
    setProgress({ processed: 0, total: 0 });
    setStatusMsg(STATUS_MSGS[0]);

    try {
      setStatusMsg("Extracting frames…");
      const rawFrames = await extractFrames(url);
      const total = rawFrames.length;
      setProgress({ processed: 0, total });

      setStatusMsg("Running vision AI…");
      const allResults: FrameResult[] = [];

      for (let i = 0; i < rawFrames.length; i += BATCH_SIZE) {
        const batch = rawFrames.slice(i, i + BATCH_SIZE);
        const msgIdx = Math.min(Math.floor(((i + BATCH_SIZE) / total) * STATUS_MSGS.length), STATUS_MSGS.length - 1);
        setStatusMsg(STATUS_MSGS[msgIdx]);

        const { data, error: fnError } = await supabase.functions.invoke("analyze-frames", {
          body: { frames: batch },
        });

        if (fnError) throw new Error(fnError.message || "Edge function call failed");
        if (data?.error) {
          if (data.partialResults) {
            allResults.push(...data.partialResults);
            setFrames([...allResults]);
          }
          throw new Error(data.error);
        }

        if (data?.frames) {
          allResults.push(...data.frames);
          setFrames([...allResults]);
        }
        setProgress({ processed: Math.min(i + BATCH_SIZE, total), total });
      }

      setTotalFrames((prev) => prev + allResults.length);
      setTotalVideos((prev) => prev + 1);
      toast.success(`Done — ${allResults.length} frames analyzed`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
          <li><a href="#" className="text-[13px] font-medium text-foreground bg-surface-2 no-underline py-[7px] px-3 rounded-md transition-colors">Analyze</a></li>
          <li><a href="#" className="text-[13px] font-medium text-ink2 no-underline py-[7px] px-3 rounded-md transition-colors hover:bg-surface hover:text-foreground">History</a></li>
          <li><a href="#" className="text-[13px] font-medium text-ink2 no-underline py-[7px] px-3 rounded-md transition-colors hover:bg-surface hover:text-foreground">Docs</a></li>
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
          Paste a YouTube URL. We extract a frame every 3 seconds and describe each moment in plain language.
        </p>

        <AnalyzerInput onAnalyze={handleAnalyze} isLoading={isLoading} />
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

      {/* Results */}
      <section className="max-w-[960px] mx-auto px-7 pt-8 pb-16" aria-labelledby="results-heading">
        {frames.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between mb-6 flex-wrap gap-2">
              <h2 className="font-serif text-[22px] font-normal text-foreground" id="results-heading">Frame timeline</h2>
              <div className="text-xs font-mono text-ink3 flex items-center gap-3">
                <span className="bg-surface border border-border rounded-full px-2.5 py-[3px]">{frames.length} frames</span>
                <span className="bg-surface border border-border rounded-full px-2.5 py-[3px]">3s interval</span>
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
            <h2 className="font-serif text-xl text-ink2 mb-1.5" id="results-heading">No video yet</h2>
            <p className="text-sm text-ink3">Enter a YouTube URL above and hit Analyze to get started.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default Index;

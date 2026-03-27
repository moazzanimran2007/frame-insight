import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Film, AlertCircle } from "lucide-react";
import AnalyzerInput from "@/components/AnalyzerInput";
import ProgressBar from "@/components/ProgressBar";
import FrameCard from "@/components/FrameCard";
import { toast } from "sonner";

interface FrameResult {
  timestamp: string;
  imageBase64: string;
  description: string;
}

// Demo data generator — simulates what a real backend would return
const generateDemoFrames = async (
  url: string,
  onProgress: (processed: number, total: number) => void
): Promise<FrameResult[]> => {
  const totalFrames = 8;
  const frames: FrameResult[] = [];

  const descriptions = [
    "Opening shot — a wide establishing view of a brightly lit room with a presenter standing at center frame. Text overlay reads the video title.",
    "Close-up of the speaker gesturing with both hands while explaining a concept. Background shows a blurred whiteboard with diagrams.",
    "Screen recording showing a code editor with syntax-highlighted Python code. The cursor is actively typing a function definition.",
    "Split-screen view — the speaker on the left reacting to a live demo running on the right side of the frame.",
    "Animated diagram illustrating data flow between components. Arrows pulse in sequence showing the request lifecycle.",
    "The speaker pauses and looks directly at the camera, emphasizing a key point. Lower third shows a caption summarizing the takeaway.",
    "Terminal output scrolling rapidly as a build process completes successfully. Green checkmarks appear next to each step.",
    "Closing frame with social media handles, a subscribe button overlay, and the channel logo centered on a dark background.",
  ];

  for (let i = 0; i < totalFrames; i++) {
    await new Promise((r) => setTimeout(r, 600));
    const seconds = (i + 1) * 3;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    // Generate a simple colored placeholder as base64
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d")!;
    // Dark cinematic gradient
    const grad = ctx.createLinearGradient(0, 0, 640, 360);
    grad.addColorStop(0, `hsl(${200 + i * 15}, 30%, ${8 + i * 2}%)`);
    grad.addColorStop(1, `hsl(${220 + i * 10}, 20%, ${5 + i}%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 360);
    // Timestamp text
    ctx.fillStyle = "#f5a623";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, 320, 190);
    ctx.fillStyle = "#666";
    ctx.font = "14px sans-serif";
    ctx.fillText("Demo Frame — connect backend for real frames", 320, 220);

    frames.push({
      timestamp: `${mins}:${secs.toString().padStart(2, "0")}`,
      imageBase64: canvas.toDataURL("image/jpeg"),
      description: descriptions[i] || "Scene continues with additional content.",
    });

    onProgress(i + 1, totalFrames);
  }

  return frames;
};

const Index = () => {
  const [frames, setFrames] = useState<FrameResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const [error, setError] = useState("");

  const handleAnalyze = useCallback(async (url: string) => {
    setIsLoading(true);
    setFrames([]);
    setError("");
    setProgress({ processed: 0, total: 0 });

    try {
      const results = await generateDemoFrames(url, (processed, total) => {
        setProgress({ processed, total });
      });
      setFrames(results);
      toast.success(`Analysis complete — ${results.length} frames processed`);
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
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Film className="w-4 h-4 text-gold" />
          </div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Frame<span className="text-gold">Lens</span>
          </h1>
          <span className="text-xs text-muted-foreground ml-1 border border-border px-2 py-0.5 rounded-full">
            AI Video Analyzer
          </span>
        </div>
      </header>

      {/* Hero / Input */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Analyze any YouTube video,{" "}
            <span className="text-gold">frame by frame</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            Paste a link below. We'll extract frames at 3-second intervals and use
            vision AI to describe what's happening in each moment.
          </p>
        </motion.div>

        <AnalyzerInput onAnalyze={handleAnalyze} isLoading={isLoading} />
      </section>

      {/* Progress */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-6 pb-8"
          >
            <ProgressBar processed={progress.processed} total={progress.total} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Results */}
      {frames.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-mono text-gold uppercase tracking-widest">
              Timeline
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {frames.map((frame, i) => (
              <FrameCard key={i} index={i} {...frame} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {!isLoading && frames.length === 0 && !error && (
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Film className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            Your analysis results will appear here
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;

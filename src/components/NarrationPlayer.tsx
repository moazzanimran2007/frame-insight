import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NarrationPlayerProps {
  descriptions: string[];
}

type NarrationMode = "describe" | "story";

const NarrationPlayer = ({ descriptions }: NarrationPlayerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [narrationText, setNarrationText] = useState("");
  const [activeMode, setActiveMode] = useState<NarrationMode | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleNarrate = useCallback(async (mode: NarrationMode) => {
    // Stop any current speech
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);

    setIsGenerating(true);
    setActiveMode(mode);
    setNarrationText("");

    try {
      const { data, error } = await supabase.functions.invoke("narrate-video", {
        body: { descriptions, mode },
      });

      if (error) throw new Error(error.message || "Narration failed");
      if (data?.error) throw new Error(data.error);

      const text = data?.text || "";
      setNarrationText(text);

      // Use browser SpeechSynthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Try to pick a good voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes("Google") && v.lang.startsWith("en")
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      toast.success(mode === "describe" ? "Playing audio description" : "Playing story narration");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Narration failed";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [descriptions]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isPaused]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  }, []);

  return (
    <div className="max-w-[960px] mx-auto px-7 pb-6">
      {/* Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => handleNarrate("describe")}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 text-[13px] font-medium font-mono bg-foreground text-background px-4 py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating && activeMode === "describe" ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Audio Description
            </>
          )}
        </button>

        <button
          onClick={() => handleNarrate("story")}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 text-[13px] font-medium font-mono border border-border-strong text-foreground px-4 py-2.5 rounded-lg transition-all hover:bg-surface disabled:opacity-50"
        >
          {isGenerating && activeMode === "story" ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Listen as Story
            </>
          )}
        </button>

        {/* Playback controls */}
        {isSpeaking && (
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={togglePause}
              className="text-[12px] font-mono text-ink2 border border-border rounded-md px-2.5 py-1.5 hover:bg-surface transition-colors"
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              onClick={stopSpeaking}
              className="text-[12px] font-mono text-destructive border border-destructive/20 rounded-md px-2.5 py-1.5 hover:bg-destructive/10 transition-colors"
            >
              ■ Stop
            </button>
          </div>
        )}
      </div>

      {/* Narration text */}
      <AnimatePresence>
        {narrationText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <div className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-mono font-medium text-accent-foreground bg-accent rounded-full px-2.5 py-[3px] tracking-wide">
                  {activeMode === "describe" ? "🔊 Audio Description" : "📖 Story"}
                </span>
                {isSpeaking && (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-ink3">
                    <span className="w-1.5 h-1.5 bg-accent-foreground rounded-full animate-[pulse-dot_1s_infinite]" />
                    {isPaused ? "Paused" : "Speaking…"}
                  </span>
                )}
              </div>
              <p className="text-sm text-ink2 leading-relaxed whitespace-pre-wrap">
                {narrationText}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NarrationPlayer;

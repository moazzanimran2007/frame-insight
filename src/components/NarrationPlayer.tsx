import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContentMode } from "./ContentModeSelector";

interface NarrationPlayerProps {
  descriptions: string[];
  contentMode: ContentMode;
  captions: string | null;
}

const MODE_CONFIG: Record<ContentMode, { narrationMode: string; label: string; icon: string }> = {
  entertainment: { narrationMode: "entertainment", label: "🎧 Entertainment", icon: "🎧" },
  explain: { narrationMode: "explain", label: "🎓 Explanation", icon: "🎓" },
  summary: { narrationMode: "summary", label: "⚡ Summary", icon: "⚡" },
};

const NarrationPlayer = ({ descriptions, contentMode, captions }: NarrationPlayerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [narrationText, setNarrationText] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
        // Default to a good English voice
        const preferred = available.find(
          (v) => v.name.includes("Google") && v.lang.startsWith("en")
        ) || available.find((v) => v.lang.startsWith("en"));
        if (preferred && !selectedVoiceURI) {
          setSelectedVoiceURI(preferred.voiceURI);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const handleNarrate = useCallback(async (mode: string, label: string) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    setIsGenerating(true);
    setActiveLabel(label);
    setNarrationText("");

    try {
      const { data, error } = await supabase.functions.invoke("narrate-video", {
        body: { descriptions, mode, captions },
      });

      if (error) throw new Error(error.message || "Narration failed");
      if (data?.error) throw new Error(data.error);

      const text = data?.text || "";
      setNarrationText(text);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes("Google") && v.lang.startsWith("en")
      ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => { setIsSpeaking(false); setIsPaused(false); };
      utterance.onerror = () => { setIsSpeaking(false); setIsPaused(false); };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      toast.success(`Playing ${label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Narration failed");
    } finally {
      setIsGenerating(false);
    }
  }, [descriptions, captions]);

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

  const config = MODE_CONFIG[contentMode];

  // For "explain" mode, also show story as a secondary option
  const showStoryButton = contentMode === "explain";

  return (
    <div className="max-w-[960px] mx-auto px-7 pb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => handleNarrate(config.narrationMode, config.label)}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 text-[13px] font-medium font-mono bg-foreground text-background px-4 py-2.5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating && activeLabel === config.label ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <span>{config.icon}</span>
              {config.label.replace(/^[^\s]+\s/, "")}
            </>
          )}
        </button>

        {showStoryButton && (
          <button
            onClick={() => handleNarrate("story", "📖 Story")}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 text-[13px] font-medium font-mono border border-border-strong text-foreground px-4 py-2.5 rounded-lg transition-all hover:bg-surface disabled:opacity-50"
          >
            {isGenerating && activeLabel === "📖 Story" ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>📖 Listen as Story</>
            )}
          </button>
        )}

        {isSpeaking && (
          <div className="flex items-center gap-2 ml-2">
            <button onClick={togglePause} className="text-[12px] font-mono text-ink2 border border-border rounded-md px-2.5 py-1.5 hover:bg-surface transition-colors">
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button onClick={stopSpeaking} className="text-[12px] font-mono text-destructive border border-destructive/20 rounded-md px-2.5 py-1.5 hover:bg-destructive/10 transition-colors">
              ■ Stop
            </button>
          </div>
        )}
      </div>

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
                  {activeLabel}
                </span>
                {captions && (
                  <span className="text-[11px] font-mono text-ink3 bg-surface-2 rounded-full px-2.5 py-[3px]">
                    + transcript
                  </span>
                )}
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

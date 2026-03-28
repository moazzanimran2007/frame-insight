import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SubtitlePanelProps {
  descriptions: string[];
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "pt", label: "Portuguese" },
];

const SubtitlePanel = ({ descriptions }: SubtitlePanelProps) => {
  const [language, setLanguage] = useState("en");
  const [isGenerating, setIsGenerating] = useState(false);
  const [srtContent, setSrtContent] = useState("");

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setSrtContent("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-subtitles", {
        body: { descriptions, language },
      });
      if (error) throw new Error(error.message || "Subtitle generation failed");
      if (data?.error) throw new Error(data.error);
      setSrtContent(data?.srt || "");
      toast.success("Subtitles generated!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate subtitles");
    } finally {
      setIsGenerating(false);
    }
  }, [descriptions, language]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([srtContent], { type: "text/srt;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label || language;
    a.download = `subtitles_${langLabel.toLowerCase()}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [srtContent, language]);

  return (
    <div className="max-w-[960px] mx-auto px-7 pb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[180px] h-9 text-[13px] font-mono bg-surface border-border">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code} className="text-[13px] font-mono">
                {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 text-[13px] font-medium font-mono bg-foreground text-background px-4 py-2 rounded-lg transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
                <path d="M7 9h4" />
                <path d="M7 12h6" />
              </svg>
              Generate Subtitles
            </>
          )}
        </button>

        {srtContent && (
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 text-[13px] font-medium font-mono border border-border-strong text-foreground px-4 py-2 rounded-lg transition-all hover:bg-surface"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download .srt
          </button>
        )}
      </div>

      <AnimatePresence>
        {srtContent && (
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
                  📝 Subtitles Preview
                </span>
              </div>
              <pre className="text-xs text-ink2 leading-relaxed whitespace-pre-wrap font-mono max-h-[300px] overflow-y-auto">
                {srtContent}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubtitlePanel;

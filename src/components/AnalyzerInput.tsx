import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Loader2 } from "lucide-react";

interface AnalyzerInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]{11}/;

const AnalyzerInput = ({ onAnalyze, isLoading }: AnalyzerInputProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!YOUTUBE_REGEX.test(url.trim())) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    setError("");
    onAnalyze(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-5 py-3 focus-within:border-gold/50 focus-within:glow-gold-sm transition-all duration-300">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="Paste a YouTube URL to analyze..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            disabled={isLoading || !url.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="shrink-0 px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed glow-gold transition-all duration-200"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Analyze"
            )}
          </motion.button>
        </div>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-destructive text-xs mt-2 ml-1"
        >
          {error}
        </motion.p>
      )}
    </form>
  );
};

export default AnalyzerInput;

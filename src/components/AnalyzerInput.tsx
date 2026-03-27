import { useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";

interface AnalyzerInputProps {
  onAnalyze: (url: string) => void;
  isLoading: boolean;
}

const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[\w-]{11}/;

const EXAMPLES = [
  { label: "Try an example", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
  { label: "K-pop clip", url: "https://www.youtube.com/watch?v=9bZkp7q19f0" },
  { label: "Nature doc", url: "https://www.youtube.com/watch?v=ScMzIvxBSi4" },
  { label: "Concert", url: "https://www.youtube.com/watch?v=JGwWNGJdvx8" },
];

const AnalyzerInput = ({ onAnalyze, isLoading }: AnalyzerInputProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!YOUTUBE_REGEX.test(url.trim())) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    setError("");
    onAnalyze(url.trim());
  };

  const fillUrl = (exampleUrl: string) => {
    setUrl(exampleUrl);
    setError("");
  };

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <form onSubmit={handleSubmit} role="search" aria-label="Video analysis">
        <label htmlFor="urlInput" className="block text-[13px] font-medium font-mono text-ink2 text-left mb-2">
          YouTube URL
        </label>
        <div className="flex border-[1.5px] border-border-strong rounded-lg overflow-hidden bg-card transition-all duration-150 focus-within:border-foreground focus-within:shadow-[0_0_0_3px_rgba(12,12,11,0.07)]">
          <input
            id="urlInput"
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(""); }}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 border-none bg-transparent px-[18px] py-[15px] text-sm font-mono text-foreground placeholder:text-ink3 outline-none min-w-0"
            disabled={isLoading}
            autoComplete="off"
            spellCheck="false"
            aria-describedby="url-hint"
            aria-invalid={error ? "true" : undefined}
          />
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="bg-primary text-primary-foreground border-none px-[22px] py-[15px] text-sm font-semibold font-sans cursor-pointer tracking-[0.01em] transition-all duration-150 whitespace-nowrap flex items-center gap-2 rounded-none rounded-r-[calc(var(--radius-lg)-2px)] hover:bg-foreground/90 active:scale-[0.98] disabled:bg-surface-2 disabled:text-ink3 disabled:cursor-not-allowed"
            aria-live="polite"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing…
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                Analyze
              </>
            )}
          </button>
        </div>
        <p className="text-xs font-mono text-ink3 text-left mt-2.5" id="url-hint">
          Supports public YouTube videos · 3-second frame interval · AI vision
        </p>
        {error && (
          <p className="text-xs font-mono text-destructive text-left mt-1.5" role="alert">
            {error}
          </p>
        )}
      </form>

      {/* Example chips */}
      <div className="flex gap-2 flex-wrap justify-center mt-6">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.url}
            onClick={() => fillUrl(ex.url)}
            className="text-xs font-medium font-mono text-ink2 bg-card border border-border-strong rounded-full px-3.5 py-1.5 cursor-pointer transition-all duration-150 hover:bg-accent hover:border-lime-dark hover:text-accent-foreground"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AnalyzerInput;

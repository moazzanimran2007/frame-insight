import { motion } from "framer-motion";

export type ContentMode = "entertainment" | "explain" | "summary";

interface ContentModeSelectorProps {
  onSelect: (mode: ContentMode) => void;
  selected: ContentMode | null;
}

const OPTIONS = [
  {
    mode: "entertainment" as const,
    icon: "🎧",
    title: "Entertainment",
    desc: "Feel the vibes — mood, music, energy, and emotion",
  },
  {
    mode: "explain" as const,
    icon: "🎓",
    title: "Explain Video",
    desc: "Detailed walkthrough of everything that happens",
  },
  {
    mode: "summary" as const,
    icon: "⚡",
    title: "Quick Summary",
    desc: "15-second TLDR — what happened in this video?",
  },
];

const ContentModeSelector = ({ onSelect, selected }: ContentModeSelectorProps) => {
  return (
    <div className="max-w-[680px] mx-auto mb-6">
      <p className="text-center text-sm font-medium text-ink2 mb-4 tracking-wide font-mono">
        What kind of experience do you want?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {OPTIONS.map((opt) => (
          <motion.button
            key={opt.mode}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(opt.mode)}
            className={`flex flex-col items-center text-center gap-2 p-5 rounded-xl border transition-all cursor-pointer ${
              selected === opt.mode
                ? "border-accent bg-accent/10 ring-2 ring-accent"
                : "border-border bg-surface hover:border-border-strong"
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <span className="text-sm font-medium text-foreground">{opt.title}</span>
            <span className="text-xs text-ink3 leading-relaxed">{opt.desc}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default ContentModeSelector;

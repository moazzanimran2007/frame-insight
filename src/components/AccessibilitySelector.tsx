import { motion } from "framer-motion";

export type AccessibilityMode = "visual" | "hearing" | "full";

interface AccessibilitySelectorProps {
  onSelect: (mode: AccessibilityMode) => void;
  selected: AccessibilityMode | null;
}

const OPTIONS = [
  {
    mode: "visual" as const,
    icon: "👁",
    title: "Visually Impaired",
    desc: "AI describes what's happening in each frame, read aloud to you",
  },
  {
    mode: "hearing" as const,
    icon: "👂",
    title: "Hearing Impaired",
    desc: "Generate downloadable subtitles you can add to any video",
  },
  {
    mode: "full" as const,
    icon: "🎬",
    title: "Full Experience",
    desc: "See frame analysis with optional narration",
  },
];

const AccessibilitySelector = ({ onSelect, selected }: AccessibilitySelectorProps) => {
  return (
    <div className="max-w-[680px] mx-auto mb-10">
      <p className="text-center text-sm font-medium text-ink2 mb-4 tracking-wide font-mono">
        How would you like to experience this video?
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

export default AccessibilitySelector;

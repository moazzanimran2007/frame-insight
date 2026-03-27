import { motion } from "framer-motion";

interface FrameCardProps {
  timestamp: string;
  imageBase64?: string;
  description: string;
  index: number;
  sceneNumber: number;
}

const HUES = [12, 26, 40, 200, 220, 170, 300];

const FrameCard = ({ timestamp, imageBase64, description, index, sceneNumber }: FrameCardProps) => {
  const hue = HUES[index % HUES.length];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
      className="bg-card border border-border rounded-lg overflow-hidden transition-all duration-200 hover:border-border-strong hover:-translate-y-[3px] focus-within:border-ring focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]"
      tabIndex={0}
      aria-label={`Frame at ${timestamp}: ${description}`}
    >
      {/* Thumbnail area */}
      <div
        className="w-full aspect-video relative flex items-center justify-center overflow-hidden"
        style={{ background: `hsl(${hue}, 14%, 93%)` }}
      >
        {imageBase64 ? (
          <img
            src={imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`}
            alt={`Frame at ${timestamp}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(hsl(${hue},12%,85%) 1px,transparent 1px),linear-gradient(90deg,hsl(${hue},12%,85%) 1px,transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />
            <svg className="relative z-[1] opacity-[0.18]" width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="4" width="24" height="17" rx="3" stroke={`hsl(${hue},30%,55%)`} strokeWidth="1.5" />
              <path d="M11 10l8 3.5-8 3.5V10z" stroke={`hsl(${hue},30%,55%)`} strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-[11px] font-medium bg-accent text-accent-foreground rounded-full px-2.5 py-0.5">
            {timestamp}
          </span>
          <span className="text-[11px] font-mono text-ink3">scene {sceneNumber}</span>
        </div>
        <p className="text-[13px] text-ink2 leading-relaxed">{description}</p>
      </div>
    </motion.article>
  );
};

export default FrameCard;

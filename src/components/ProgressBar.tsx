import { motion } from "framer-motion";

interface ProgressBarProps {
  processed: number;
  total: number;
}

const ProgressBar = ({ processed, total }: ProgressBarProps) => {
  const pct = total > 0 ? (processed / total) * 100 : 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-2">
      <div className="flex justify-between text-xs font-mono text-muted-foreground">
        <span>Analyzing frames...</span>
        <span className="text-gold">
          {processed}/{total} frames
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-gold-dim to-gold rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

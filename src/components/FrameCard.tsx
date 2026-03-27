import { motion } from "framer-motion";

interface FrameCardProps {
  timestamp: string;
  imageBase64: string;
  description: string;
  index: number;
}

const FrameCard = ({ timestamp, imageBase64, description, index }: FrameCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="film-grain group rounded-lg border border-gold-dim/30 bg-card overflow-hidden hover:border-gold/50 transition-colors duration-300"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`}
          alt={`Frame at ${timestamp}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded border border-gold-dim/40">
          <span className="font-mono text-xs text-gold font-medium">{timestamp}</span>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-secondary-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default FrameCard;

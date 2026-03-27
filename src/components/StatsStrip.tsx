interface StatsStripProps {
  totalFrames: number;
  totalVideos: number;
}

const StatsStrip = ({ totalFrames, totalVideos }: StatsStripProps) => {
  return (
    <div className="flex border-t border-b border-border bg-card" role="region" aria-label="Usage statistics">
      <div className="flex-1 text-center py-5 px-3 border-r border-border">
        <span className="font-serif text-[28px] text-foreground block">{totalFrames}</span>
        <span className="text-[11px] font-mono text-ink3 uppercase tracking-[0.08em] block mt-0.5">Frames</span>
      </div>
      <div className="flex-1 text-center py-5 px-3 border-r border-border">
        <span className="font-serif text-[28px] text-foreground block">{totalVideos}</span>
        <span className="text-[11px] font-mono text-ink3 uppercase tracking-[0.08em] block mt-0.5">Videos</span>
      </div>
      <div className="flex-1 text-center py-5 px-3 border-r border-border">
        <span className="font-serif text-[28px] text-foreground block">3s</span>
        <span className="text-[11px] font-mono text-ink3 uppercase tracking-[0.08em] block mt-0.5">Interval</span>
      </div>
      <div className="flex-1 text-center py-5 px-3">
        <span className="font-serif text-[28px] text-foreground block">AI</span>
        <span className="text-[11px] font-mono text-ink3 uppercase tracking-[0.08em] block mt-0.5">Vision model</span>
      </div>
    </div>
  );
};

export default StatsStrip;

interface ProgressBarProps {
  processed: number;
  total: number;
  statusMessage?: string;
}

const ProgressBar = ({ processed, total, statusMessage = "Analyzing frames…" }: ProgressBarProps) => {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="max-w-[760px] mx-auto px-7 py-5">
      <div className="bg-card border border-border-strong rounded-lg p-[18px_20px]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[13px] font-medium font-mono text-foreground flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-surface-2 border-t-foreground rounded-full animate-spin shrink-0" />
            {statusMessage}
          </span>
          <span className="text-[13px] font-medium font-mono text-ink3">
            {pct}%
          </span>
        </div>
        <div className="h-[3px] bg-surface-2 rounded-full overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div
            className="h-full bg-foreground rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;

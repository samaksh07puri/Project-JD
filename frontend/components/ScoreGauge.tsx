import { scoreColor, scoreRing } from "@/lib/format";

interface ScoreGaugeProps {
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
}

export default function ScoreGauge({ value, label, sublabel, size = 132 }: ScoreGaugeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = scoreRing(clamped);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${scoreColor(clamped)}`}>{clamped}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{label}</p>
      {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
    </div>
  );
}

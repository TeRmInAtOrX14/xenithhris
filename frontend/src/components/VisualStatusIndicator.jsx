import React from 'react';

export default function VisualStatusIndicator({
  value = 80,
  max = 100,
  status = "green", // "green" | "amber" | "red" | "lime"
  size = "md", // "sm" | "md" | "lg"
  label = "",
  sublabel = ""
}) {
  const percent = Math.min(100, Math.max(0, (value / (max || 1)) * 100));

  const statusColors = {
    green: { stroke: "#10B981", bg: "#064E3B", text: "text-emerald-400" },
    lime: { stroke: "#D7F000", bg: "#2A3F00", text: "text-[#D7F000]" },
    amber: { stroke: "#F59E0B", bg: "#613407", text: "text-amber-400" },
    red: { stroke: "#EF4444", bg: "#7F1D1D", text: "text-red-400" }
  }[status] || { stroke: "#D7F000", bg: "#2A3F00", text: "text-[#D7F000]" };

  const dimensions = {
    sm: { radius: 18, width: 44, strokeWidth: 4, font: "text-xs" },
    md: { radius: 26, width: 64, strokeWidth: 6, font: "text-sm" },
    lg: { radius: 36, width: 88, strokeWidth: 8, font: "text-lg" }
  }[size] || { radius: 26, width: 64, strokeWidth: 6, font: "text-sm" };

  const circumference = 2 * Math.PI * dimensions.radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative inline-flex items-center justify-center shrink-0">
        <svg width={dimensions.width} height={dimensions.width} className="transform -rotate-90">
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.width / 2}
            r={dimensions.radius}
            stroke={statusColors.bg}
            strokeWidth={dimensions.strokeWidth}
            fill="transparent"
          />
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.width / 2}
            r={dimensions.radius}
            stroke={statusColors.stroke}
            strokeWidth={dimensions.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <span className={`absolute font-extrabold font-mono ${dimensions.font} ${statusColors.text}`}>
          {Math.round(percent)}%
        </span>
      </div>

      {(label || sublabel) && (
        <div className="flex flex-col text-left">
          {label && <span className="text-xs font-extrabold uppercase tracking-tight text-brand-text">{label}</span>}
          {sublabel && <span className="text-[10px] text-brand-text-mute font-mono">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

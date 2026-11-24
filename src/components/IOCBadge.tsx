import React from "react";
import {
  AlertTriangle,
  Binary,
  FileCode2,
  FolderKey,
  Globe,
  Link2,
  Mail,
  Network,
  Wallet,
} from "lucide-react";
import { ConfidenceLevel, IOCType } from "../types/ioc";
import { IOC_TYPE_META } from "../lib/iocMeta";

export const IOCTypeIcon: React.FC<{ type: IOCType; className?: string }> = ({
  type,
  className = "w-3.5 h-3.5",
}) => {
  switch (type) {
    case "ip":
      return <Network className={className} aria-hidden="true" />;
    case "domain":
      return <Globe className={className} aria-hidden="true" />;
    case "url":
      return <Link2 className={className} aria-hidden="true" />;
    case "email":
      return <Mail className={className} aria-hidden="true" />;
    case "hash":
      return <Binary className={className} aria-hidden="true" />;
    case "cve":
      return <AlertTriangle className={className} aria-hidden="true" />;
    case "filepath":
      return <FileCode2 className={className} aria-hidden="true" />;
    case "registry":
      return <FolderKey className={className} aria-hidden="true" />;
    case "wallet":
      return <Wallet className={className} aria-hidden="true" />;
  }
};

export const IOCTypeBadge: React.FC<{
  type: IOCType;
  subtype?: string;
  compact?: boolean;
}> = ({ type, subtype, compact = false }) => {
  const meta = IOC_TYPE_META[type];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 ${meta.badgeClass}`}
    >
      <IOCTypeIcon type={type} className="w-3.5 h-3.5 shrink-0" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
      {subtype && !compact && (
        <span className="opacity-75 font-mono text-[11px]">· {subtype}</span>
      )}
    </span>
  );
};

export const ConfidenceIndicator: React.FC<{ level: ConfidenceLevel; score?: number }> = ({
  level,
  score,
}) => {
  const styles: Record<ConfidenceLevel, string> = {
    High: "text-emerald-700 dark:text-emerald-400",
    Medium: "text-amber-700 dark:text-amber-400",
    Low: "text-slate-600 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium tabular-nums ${styles[level]}`}>
      <span>{level}</span>
      {typeof score === "number" && (
        <span className="text-slate-500 dark:text-slate-400 font-mono">({score}%)</span>
      )}
    </span>
  );
};

export const RiskLevelText: React.FC<{
  level: "Critical" | "High" | "Medium" | "Low" | string;
}> = ({ level }) => {
  const colorMap: Record<string, string> = {
    Critical: "text-red-600 dark:text-red-400",
    High: "text-amber-600 dark:text-amber-400",
    Medium: "text-cyan-700 dark:text-cyan-400",
    Low: "text-emerald-700 dark:text-emerald-400",
  };
  return (
    <span className={`font-semibold ${colorMap[level] ?? "text-slate-700 dark:text-slate-300"}`}>
      {level}
    </span>
  );
};

export const RiskScoreGauge: React.FC<{
  score: number;
  level: "Critical" | "High" | "Medium" | "Low";
}> = ({ score, level }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    level === "Critical"
      ? "#EF4444"
      : level === "High"
        ? "#F59E0B"
        : level === "Medium"
          ? "#22D3EE"
          : "#10B981";

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0" role="img" aria-label={`Risk score ${clamped} out of 100, ${level}`}>
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 84 84">
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeWidth="7"
          />
          <circle
            cx="42"
            cy="42"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white leading-none">
            {clamped}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">/100</span>
        </div>
      </div>
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400">Overall Risk</div>
        <div className="text-base font-semibold mt-0.5">
          <RiskLevelText level={level} />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Weighted by severity & diversity
        </div>
      </div>
    </div>
  );
};

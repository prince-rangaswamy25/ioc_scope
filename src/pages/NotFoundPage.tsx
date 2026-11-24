import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[65vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#10182E] p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-5 h-5 text-red-500" aria-hidden="true" />
        </div>
        <div className="font-mono text-3xl font-bold text-cyan-600 dark:text-cyan-400">404</div>
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white mt-2">
          Indicator Route Not Found
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          The requested workspace path does not exist or has been relocated. Return to the Analyzer or Home overview.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            to="/analyze"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Open Analyzer</span>
          </Link>
          <Link
            to="/"
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
};

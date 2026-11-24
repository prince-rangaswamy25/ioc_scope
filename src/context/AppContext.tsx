import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AIInsightsResult,
  AppSettings,
  ExtractionOptions,
  ExtractionResult,
  SavedAnalysis,
} from "../types/ioc";
import {
  DEFAULT_EXTRACTION_OPTIONS,
  extractIOCs,
  extractIOCsAsync,
  recalculateSummary,
} from "../lib/extractor";
import { SAMPLE_REPORTS } from "../data/samples";

const SETTINGS_STORAGE_KEY = "iocscope_settings_v1";
const HISTORY_STORAGE_KEY = "iocscope_history_v1";

export interface ToastMessage {
  id: string;
  type: "success" | "info" | "error";
  title: string;
  description?: string;
}

interface ActiveWorkspaceState {
  title: string;
  sourceName?: string;
  rawText: string;
  options: ExtractionOptions;
  result: ExtractionResult | null;
  aiInsights: AIInsightsResult | null;
  activeHistoryId: string | null;
}

interface AppContextValue {
  theme: "dark" | "light";
  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
  settings: AppSettings;
  updateDefaultOptions: (patch: Partial<ExtractionOptions>) => void;
  activeWorkspace: ActiveWorkspaceState;
  setWorkspaceText: (text: string, meta?: { title?: string; sourceName?: string }) => void;
  setWorkspaceTitle: (title: string) => void;
  updateWorkspaceOptions: (patch: Partial<ExtractionOptions>) => void;
  isExtracting: boolean;
  runExtraction: (textOverride?: string, optionsOverride?: ExtractionOptions) => Promise<ExtractionResult | null>;
  clearWorkspace: () => void;
  toggleFalsePositive: (iocId: string) => void;
  setWorkspaceAIInsights: (insights: AIInsightsResult | null) => void;
  history: SavedAnalysis[];
  saveCurrentToHistory: (customTitle?: string) => SavedAnalysis | null;
  loadFromHistory: (id: string) => SavedAnalysis | null;
  renameHistoryItem: (id: string, newTitle: string) => void;
  deleteHistoryItem: (id: string) => void;
  clearAllData: () => void;
  seedSampleHistory: () => void;
  toasts: ToastMessage[];
  pushToast: (toast: Omit<ToastMessage, "id">) => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  defaultOptions: DEFAULT_EXTRACTION_OPTIONS,
};

function loadInitialSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      defaultOptions: {
        ...DEFAULT_EXTRACTION_OPTIONS,
        ...(parsed.defaultOptions ?? {}),
        benignDomainsAllowlist: Array.isArray(parsed.defaultOptions?.benignDomainsAllowlist)
          ? parsed.defaultOptions.benignDomainsAllowlist
          : DEFAULT_EXTRACTION_OPTIONS.benignDomainsAllowlist,
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadInitialHistory(): SavedAnalysis[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAnalysis[]) : [];
  } catch {
    return [];
  }
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(loadInitialSettings);
  const [history, setHistory] = useState<SavedAnalysis[]>(loadInitialHistory);
  const [isExtracting, setIsExtracting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspaceState>(() => ({
    title: "Untitled Incident Triage",
    rawText: "",
    options: loadInitialSettings().defaultOptions,
    result: null,
    aiInsights: null,
    activeHistoryId: null,
  }));

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings]);

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch {
      // ignore quota errors
    }
  }, [history]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastMessage, "id">) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      setTimeout(() => {
        dismissToast(id);
      }, 3600);
    },
    [dismissToast]
  );

  const setTheme = useCallback((theme: "dark" | "light") => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const toggleTheme = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      theme: prev.theme === "dark" ? "light" : "dark",
    }));
  }, []);

  const updateDefaultOptions = useCallback((patch: Partial<ExtractionOptions>) => {
    setSettings((prev) => ({
      ...prev,
      defaultOptions: { ...prev.defaultOptions, ...patch },
    }));
  }, []);

  const setWorkspaceText = useCallback(
    (text: string, meta?: { title?: string; sourceName?: string }) => {
      setActiveWorkspace((prev) => ({
        ...prev,
        rawText: text,
        title: meta?.title ?? prev.title,
        sourceName: meta?.sourceName ?? prev.sourceName,
      }));
    },
    []
  );

  const setWorkspaceTitle = useCallback((title: string) => {
    setActiveWorkspace((prev) => ({ ...prev, title }));
  }, []);

  const updateWorkspaceOptions = useCallback((patch: Partial<ExtractionOptions>) => {
    setActiveWorkspace((prev) => ({
      ...prev,
      options: { ...prev.options, ...patch },
    }));
  }, []);

  const runExtraction = useCallback(
    async (textOverride?: string, optionsOverride?: ExtractionOptions) => {
      const targetText = textOverride ?? activeWorkspace.rawText;
      const targetOptions = optionsOverride ?? activeWorkspace.options;

      if (!targetText.trim()) {
        pushToast({
          type: "info",
          title: "No report text provided",
          description: "Paste incident text, upload a file, or load a sample first.",
        });
        return null;
      }

      setIsExtracting(true);
      try {
        // Brief minimum visual scan pass for analyst feedback without slowing large inputs
        const minScanDelay = new Promise<void>((r) => setTimeout(r, 380));
        const [result] = await Promise.all([
          extractIOCsAsync(targetText, targetOptions),
          minScanDelay,
        ]);

        setActiveWorkspace((prev) => ({
          ...prev,
          rawText: targetText,
          options: targetOptions,
          result,
          aiInsights:
            prev.rawText === targetText ? prev.aiInsights : null,
        }));

        return result;
      } finally {
        setIsExtracting(false);
      }
    },
    [activeWorkspace.options, activeWorkspace.rawText, pushToast]
  );

  const clearWorkspace = useCallback(() => {
    setActiveWorkspace({
      title: "Untitled Incident Triage",
      rawText: "",
      options: settings.defaultOptions,
      result: null,
      aiInsights: null,
      activeHistoryId: null,
    });
  }, [settings.defaultOptions]);

  const toggleFalsePositive = useCallback((iocId: string) => {
    setActiveWorkspace((prev) => {
      if (!prev.result) return prev;
      const updatedIOCs = prev.result.iocs.map((item) =>
        item.id === iocId ? { ...item, isFalsePositive: !item.isFalsePositive } : item
      );
      const recalculated = recalculateSummary({
        ...prev.result,
        iocs: updatedIOCs,
      });
      return {
        ...prev,
        result: recalculated,
      };
    });
  }, []);

  const setWorkspaceAIInsights = useCallback((insights: AIInsightsResult | null) => {
    setActiveWorkspace((prev) => {
      // Also update saved history item if currently linked
      if (prev.activeHistoryId && insights) {
        setHistory((hist) =>
          hist.map((h) =>
            h.id === prev.activeHistoryId
              ? { ...h, aiInsights: insights, updatedAt: new Date().toISOString() }
              : h
          )
        );
      }
      return { ...prev, aiInsights: insights };
    });
  }, []);

  const saveCurrentToHistory = useCallback(
    (customTitle?: string) => {
      if (!activeWorkspace.result) {
        pushToast({
          type: "error",
          title: "Nothing to save",
          description: "Run IOC extraction before saving to history.",
        });
        return null;
      }

      const now = new Date().toISOString();
      const title = (customTitle ?? activeWorkspace.title).trim() || "Untitled Incident Triage";

      if (activeWorkspace.activeHistoryId) {
        const updatedEntry: SavedAnalysis = {
          id: activeWorkspace.activeHistoryId,
          title,
          createdAt:
            history.find((h) => h.id === activeWorkspace.activeHistoryId)?.createdAt ?? now,
          updatedAt: now,
          sourceName: activeWorkspace.sourceName,
          rawText: activeWorkspace.rawText,
          options: activeWorkspace.options,
          result: activeWorkspace.result,
          aiInsights: activeWorkspace.aiInsights,
        };
        setHistory((prev) =>
          prev.map((h) => (h.id === updatedEntry.id ? updatedEntry : h))
        );
        setActiveWorkspace((prev) => ({ ...prev, title }));
        pushToast({
          type: "success",
          title: "Analysis updated in history",
          description: title,
        });
        return updatedEntry;
      }

      const newEntry: SavedAnalysis = {
        id: `case_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title,
        createdAt: now,
        updatedAt: now,
        sourceName: activeWorkspace.sourceName,
        rawText: activeWorkspace.rawText,
        options: activeWorkspace.options,
        result: activeWorkspace.result,
        aiInsights: activeWorkspace.aiInsights,
      };
      setHistory((prev) => [newEntry, ...prev]);
      setActiveWorkspace((prev) => ({
        ...prev,
        title,
        activeHistoryId: newEntry.id,
      }));
      pushToast({
        type: "success",
        title: "Saved to case history",
        description: `${newEntry.result.summary.uniqueCount} unique indicators stored locally.`,
      });
      return newEntry;
    },
    [activeWorkspace, history, pushToast]
  );

  const loadFromHistory = useCallback(
    (id: string) => {
      const found = history.find((h) => h.id === id);
      if (!found) return null;
      setActiveWorkspace({
        title: found.title,
        sourceName: found.sourceName,
        rawText: found.rawText,
        options: found.options,
        result: found.result,
        aiInsights: found.aiInsights ?? null,
        activeHistoryId: found.id,
      });
      return found;
    },
    [history]
  );

  const renameHistoryItem = useCallback((id: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    setHistory((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, title: trimmed, updatedAt: new Date().toISOString() } : h
      )
    );
    setActiveWorkspace((prev) =>
      prev.activeHistoryId === id ? { ...prev, title: trimmed } : prev
    );
  }, []);

  const deleteHistoryItem = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setActiveWorkspace((prev) =>
      prev.activeHistoryId === id ? { ...prev, activeHistoryId: null } : prev
    );
  }, []);

  const clearAllData = useCallback(() => {
    setHistory([]);
    setSettings(DEFAULT_SETTINGS);
    setActiveWorkspace({
      title: "Untitled Incident Triage",
      rawText: "",
      options: DEFAULT_EXTRACTION_OPTIONS,
      result: null,
      aiInsights: null,
      activeHistoryId: null,
    });
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    pushToast({
      type: "info",
      title: "Local workspace cleared",
      description: "Saved history and custom settings have been reset.",
    });
  }, [pushToast]);

  const seedSampleHistory = useCallback(() => {
    const seeded: SavedAnalysis[] = SAMPLE_REPORTS.map((sample, idx) => {
      const res = extractIOCs(sample.text, settings.defaultOptions);
      return {
        id: `sample_case_${sample.id}_${idx}`,
        title: sample.title,
        createdAt: sample.date,
        updatedAt: sample.date,
        sourceName: `${sample.id}.txt`,
        rawText: sample.text,
        options: settings.defaultOptions,
        result: res,
        aiInsights: null,
      };
    });
    setHistory((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const fresh = seeded.filter((s) => !existingIds.has(s.id));
      return [...fresh, ...prev];
    });
    pushToast({
      type: "success",
      title: "4 sample incident cases loaded",
      description: "Dashboard charts and case history are ready to explore.",
    });
  }, [pushToast, settings.defaultOptions]);

  return (
    <AppContext.Provider
      value={{
        theme: settings.theme,
        toggleTheme,
        setTheme,
        settings,
        updateDefaultOptions,
        activeWorkspace,
        setWorkspaceText,
        setWorkspaceTitle,
        updateWorkspaceOptions,
        isExtracting,
        runExtraction,
        clearWorkspace,
        toggleFalsePositive,
        setWorkspaceAIInsights,
        history,
        saveCurrentToHistory,
        loadFromHistory,
        renameHistoryItem,
        deleteHistoryItem,
        clearAllData,
        seedSampleHistory,
        toasts,
        pushToast,
        dismissToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return ctx;
}

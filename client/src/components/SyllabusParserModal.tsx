import { useState, useMemo, useRef } from "react";
import {
  Layers,
  Clock,
  Trash2,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  AlertCircle,
  Brain,
  Zap,
  CheckCircle2,
} from "lucide-react";
import Modal from "./Modal";
import { parseSyllabusClient, SAMPLE_SYLLABI } from "../lib/syllabus-parser";
import { extractSyllabusFromFile, type ExtractionProgress } from "../lib/file-extractor";
import type { ParsedUnitTopic } from "../types";

interface SyllabusParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName?: string;
  onImport: (
    topics: ParsedUnitTopic[],
    rawText: string,
    autoDerivePlan?: boolean
  ) => Promise<void>;
}

type TabMode = "upload" | "text";
type WizardStep = "source" | "confidence";

export default function SyllabusParserModal({
  isOpen,
  onClose,
  subjectName,
  onImport,
}: SyllabusParserModalProps) {
  const [tabMode, setTabMode] = useState<TabMode>("upload");
  const [wizardStep, setWizardStep] = useState<WizardStep>("source");
  const [rawText, setRawText] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState<Record<number, boolean>>({});
  const [customEdits, setCustomEdits] = useState<Record<number, string>>({});
  const [filterUnit, setFilterUnit] = useState<number | "all">("all");

  // Confidence scores map: topicIndex -> rating (1 to 5)
  const [confidenceScores, setConfidenceScores] = useState<Record<number, number>>({});
  const [autoDerivePlan, setAutoDerivePlan] = useState(true);

  // File Extraction State
  const [extractedFile, setExtractedFile] = useState<{
    name: string;
    type: "pdf" | "image";
    wordCount: number;
  } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [extractError, setExtractError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time parsing from raw text
  const { units, allTopics } = useMemo(() => {
    return parseSyllabusClient(rawText);
  }, [rawText]);

  // Handle toggling topics
  const isSelected = (idx: number) => selectedTopics[idx] !== false;

  const toggleTopic = (idx: number) => {
    setSelectedTopics((prev) => ({
      ...prev,
      [idx]: !isSelected(idx),
    }));
  };

  const toggleAll = (select: boolean) => {
    const updated: Record<number, boolean> = {};
    allTopics.forEach((_, idx) => {
      updated[idx] = select;
    });
    setSelectedTopics(updated);
  };

  // Get confidence score for a topic (defaults to 3)
  const getConfidence = (idx: number) => confidenceScores[idx] ?? 3;

  const setConfidence = (idx: number, score: number) => {
    setConfidenceScores((prev) => ({
      ...prev,
      [idx]: score,
    }));
  };

  const bulkSetConfidence = (score: number) => {
    const updated: Record<number, number> = {};
    allTopics.forEach((_, idx) => {
      updated[idx] = score;
    });
    setConfidenceScores(updated);
  };

  // Prepare final topics for import
  const finalTopics = useMemo(() => {
    return allTopics
      .map((t, idx) => {
        if (!isSelected(idx)) return null;
        return {
          ...t,
          title: customEdits[idx] || t.title,
          confidenceScore: getConfidence(idx),
        };
      })
      .filter(Boolean) as ParsedUnitTopic[];
  }, [allTopics, selectedTopics, customEdits, confidenceScores]);

  const totalMinutes = useMemo(() => {
    return finalTopics.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  }, [finalTopics]);

  // Confidence distribution stats
  const confidenceStats = useMemo(() => {
    const stats = { weak: 0, moderate: 0, mastered: 0 };
    finalTopics.forEach((t) => {
      if (t.confidenceScore <= 2) stats.weak++;
      else if (t.confidenceScore <= 3) stats.moderate++;
      else stats.mastered++;
    });
    return stats;
  }, [finalTopics]);

  // Handle File Upload & Extraction
  const handleProcessFile = async (file: File) => {
    setExtractError("");
    setExtracting(true);
    setExtractionProgress({ stage: "reading", progress: 5, message: `Processing ${file.name}…` });

    try {
      const result = await extractSyllabusFromFile(file, (p) => {
        setExtractionProgress(p);
      });

      if (!result.text || result.text.trim().length === 0) {
        throw new Error(
          "No readable text found in this file. If it's a scanned document, please ensure it's clear or paste the text directly."
        );
      }

      setRawText(result.text);
      setSelectedTopics({});
      setCustomEdits({});
      setConfidenceScores({});
      setExtractedFile({
        name: result.fileName,
        type: result.type,
        wordCount: result.text.split(/\s+/).length,
      });
      // Switch back to source view with parsed results visible
      setWizardStep("source");
    } catch (err: any) {
      setExtractError(err?.message || "Failed to extract text from file.");
    } finally {
      setExtracting(false);
      setExtractionProgress(null);
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleConfirmImport = async () => {
    if (finalTopics.length === 0) return;
    setImporting(true);
    try {
      await onImport(finalTopics, rawText, autoDerivePlan);
      onClose();
    } finally {
      setImporting(false);
    }
  };

  const loadSample = (key: keyof typeof SAMPLE_SYLLABI) => {
    const sample = SAMPLE_SYLLABI[key];
    if (sample) {
      setRawText(sample.text);
      setSelectedTopics({});
      setCustomEdits({});
      setConfidenceScores({});
      setExtractedFile(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        subjectName
          ? `⚡ Smart Syllabus Scanner — ${subjectName}`
          : "⚡ Smart Syllabus Scanner & Adaptive Planner"
      }
      className="max-w-4xl max-h-[90vh]"
    >
      <div className="space-y-4 text-white overflow-hidden flex flex-col">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWizardStep("source")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                wizardStep === "source"
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              <span>Extract &amp; Structure Units</span>
            </button>

            <span className="text-white/20">&rarr;</span>

            <button
              type="button"
              onClick={() => {
                if (finalTopics.length > 0) setWizardStep("confidence");
              }}
              disabled={finalTopics.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                wizardStep === "confidence"
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              <span>Knowledge Assessment &amp; Plan</span>
            </button>
          </div>

          {allTopics.length > 0 && (
            <span className="text-[11px] font-mono text-ink-60">
              {finalTopics.length} topics ready &bull; ~{(totalMinutes / 60).toFixed(1)} hrs
            </span>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STEP 1: SOURCE & EXTRACT (PDF / Image / Text)                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {wizardStep === "source" && (
          <div className="space-y-4">
            {/* Input Mode Selector */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <button
                type="button"
                onClick={() => setTabMode("upload")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  tabMode === "upload"
                    ? "bg-[#0A84FF] text-white"
                    : "bg-white/5 text-ink-60 hover:text-white"
                }`}
              >
                <UploadCloud size={14} />
                <span>Upload PDF or Image File</span>
              </button>

              <button
                type="button"
                onClick={() => setTabMode("text")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  tabMode === "text"
                    ? "bg-[#0A84FF] text-white"
                    : "bg-white/5 text-ink-60 hover:text-white"
                }`}
              >
                <FileText size={14} />
                <span>Paste Text / Quick Demos</span>
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD ZONE */}
            {tabMode === "upload" && (
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={onFileInputChange}
                  accept=".pdf,image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-[#0A84FF] bg-[#0A84FF]/10 scale-[1.01]"
                      : "border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/5 mx-auto flex items-center justify-center text-[#0A84FF] mb-3">
                    <UploadCloud size={24} />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-1">
                    Drop your syllabus PDF or photo/image here
                  </h4>
                  <p className="text-xs text-ink-60 max-w-sm mx-auto mb-3">
                    Supports university syllabus PDFs (multi-page) or photo scans (PNG, JPG, WebP) with built-in OCR.
                  </p>
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium transition-colors">
                    Browse from Computer
                  </span>
                </div>

                {/* Extraction Progress Indicator */}
                {extracting && extractionProgress && (
                  <div className="p-4 rounded-xl bg-[#141414] border border-[#0A84FF]/30 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-white font-medium">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#0A84FF] animate-ping" />
                        {extractionProgress.message}
                      </span>
                      <span className="font-mono text-[#0A84FF]">{extractionProgress.progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full bg-[#0A84FF] transition-all duration-300 rounded-full"
                        style={{ width: `${extractionProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {extractError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{extractError}</span>
                  </div>
                )}

                {/* Extracted File Badge */}
                {extractedFile && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300">
                      {extractedFile.type === "pdf" ? <FileText size={16} /> : <ImageIcon size={16} />}
                      <span className="font-medium">{extractedFile.name}</span>
                      <span className="text-emerald-400/60 font-mono text-[11px]">
                        ({extractedFile.wordCount} words extracted)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExtractedFile(null);
                        setRawText("");
                      }}
                      className="text-emerald-300/60 hover:text-emerald-300 text-[11px] underline"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PASTE TEXT & DEMOS */}
            {tabMode === "text" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-[11px] font-mono text-ink-60 uppercase tracking-wider">
                    Quick Demos:
                  </span>
                  <button
                    type="button"
                    onClick={() => loadSample("dataStructures")}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/90 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <BookOpen size={11} className="text-[#0A84FF]" />
                    <span>MCA Data Structures</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => loadSample("cloudComputing")}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/90 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Layers size={11} className="text-emerald-400" />
                    <span>Cloud Computing</span>
                  </button>
                  {rawText && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawText("");
                        setSelectedTopics({});
                        setExtractedFile(null);
                      }}
                      className="text-ink-60 hover:text-rose-400 text-[11px] ml-auto transition-colors"
                    >
                      Clear input
                    </button>
                  )}
                </div>

                <textarea
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setSelectedTopics({});
                    setCustomEdits({});
                    setConfidenceScores({});
                  }}
                  placeholder={`Paste your syllabus text here, for example:
UNIT I: Introduction to Data Structures
Abstract Data Types (ADT), Arrays, Stacks, Queues, Circular Queues

UNIT II: Trees and Binary Search Trees
Binary Tree Traversals, BST Insertion and Deletion, AVL Trees`}
                  rows={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/40 focus:outline-none focus:border-[#0A84FF]/60 font-mono resize-y"
                />
              </div>
            )}

            {/* ── Extracted Units & Topics Structure ── */}
            {allTopics.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-white/8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-white">
                      Extracted Curriculum ({finalTopics.length}/{allTopics.length} topics)
                    </span>
                    <span className="text-[11px] font-mono text-ink-60">
                      across {units.length} unit{units.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleAll(true)}
                      className="text-[#0A84FF] hover:underline text-[11px] cursor-pointer"
                    >
                      Select All
                    </button>
                    <span className="text-white/20">&bull;</span>
                    <button
                      type="button"
                      onClick={() => toggleAll(false)}
                      className="text-ink-60 hover:text-white text-[11px] cursor-pointer"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Unit Filter Tabs */}
                {units.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => setFilterUnit("all")}
                      className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors shrink-0 cursor-pointer ${
                        filterUnit === "all"
                          ? "bg-white/10 text-white font-medium"
                          : "text-ink-60 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      All ({allTopics.length})
                    </button>
                    {units.map((u) => (
                      <button
                        key={u.unitNumber}
                        type="button"
                        onClick={() => setFilterUnit(u.unitNumber)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] transition-colors shrink-0 cursor-pointer ${
                          filterUnit === u.unitNumber
                            ? "bg-[#0A84FF]/20 text-[#0A84FF] font-medium border border-[#0A84FF]/30"
                            : "text-ink-60 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        Unit {u.unitNumber} ({u.topics.length})
                      </button>
                    ))}
                  </div>
                )}

                {/* Topics List */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-white/8 rounded-xl p-2 bg-[#0F0F0F]">
                  {allTopics.map((topic, idx) => {
                    if (filterUnit !== "all" && topic.unitNumber !== filterUnit) {
                      return null;
                    }
                    const checked = isSelected(idx);
                    const currentTitle = customEdits[idx] || topic.title;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-colors ${
                          checked
                            ? "bg-white/[0.03] border-white/8 text-white"
                            : "opacity-40 border-transparent text-ink-60 hover:opacity-70"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTopic(idx)}
                          className="rounded accent-[#0A84FF] cursor-pointer"
                        />

                        <span className="text-[10px] font-mono text-[#0A84FF] px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                          U{topic.unitNumber}
                        </span>

                        <input
                          type="text"
                          value={currentTitle}
                          onChange={(e) =>
                            setCustomEdits((prev) => ({
                              ...prev,
                              [idx]: e.target.value,
                            }))
                          }
                          className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#0A84FF]/40 rounded px-1 truncate"
                        />

                        <span className="text-[10px] font-mono text-ink-60 flex items-center gap-1 shrink-0">
                          <Clock size={10} />
                          {topic.estimatedMinutes}m
                        </span>

                        <button
                          type="button"
                          onClick={() => toggleTopic(idx)}
                          className="p-1 text-ink-60 hover:text-rose-400 transition-colors"
                          title="Exclude this topic"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* STEP 2: CONFIDENCE & KNOWLEDGE ASSESSMENT (Derive Plan)            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {wizardStep === "confidence" && (
          <div className="space-y-4">
            {/* Explanatory Banner */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0A84FF]/10 to-emerald-500/10 border border-[#0A84FF]/20 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center shrink-0">
                <Brain size={18} />
              </div>
              <div className="text-xs">
                <h4 className="font-semibold text-white">Rate your current knowledge for each topic</h4>
                <p className="text-ink-60 text-[11px] mt-0.5 leading-relaxed">
                  Our algorithm prioritizes lower confidence topics (1–2) earlier in your study plan so you master weak areas first before your exam deadline.
                </p>
              </div>
            </div>

            {/* Quick Bulk Presets */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
              <span className="text-[11px] font-mono text-ink-60 uppercase">Quick Bulk Set:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => bulkSetConfidence(1)}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-medium border border-rose-500/20 transition-colors cursor-pointer"
                >
                  🔴 Set All to 1 (Fresh start)
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetConfidence(3)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/20 transition-colors cursor-pointer"
                >
                  🟡 Set All to 3 (Average)
                </button>
                <button
                  type="button"
                  onClick={() => bulkSetConfidence(4)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-500/20 transition-colors cursor-pointer"
                >
                  🟢 Set All to 4 (Quick review)
                </button>
              </div>
            </div>

            {/* Confidence Distribution Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15 text-center">
                <div className="text-base font-bold text-rose-400 font-mono">{confidenceStats.weak}</div>
                <div className="text-[10px] text-ink-60">High Priority (1–2)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-center">
                <div className="text-base font-bold text-amber-400 font-mono">{confidenceStats.moderate}</div>
                <div className="text-[10px] text-ink-60">Medium Priority (3)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                <div className="text-base font-bold text-emerald-400 font-mono">{confidenceStats.mastered}</div>
                <div className="text-[10px] text-ink-60">Mastered (4–5)</div>
              </div>
            </div>

            {/* Interactive Rating List per Topic */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 border border-white/8 rounded-xl p-2.5 bg-[#0F0F0F]">
              {finalTopics.map((topic, idx) => {
                const conf = getConfidence(idx);
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-mono text-[#0A84FF] px-1.5 py-0.2 rounded bg-white/5">
                          Unit {topic.unitNumber}
                        </span>
                        <span className="text-[10px] font-mono text-ink-60">{topic.estimatedMinutes}m</span>
                      </div>
                      <h5 className="text-xs font-medium text-white truncate">{topic.title}</h5>
                    </div>

                    {/* 1 to 5 Confidence Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const isCurrent = conf === score;
                        let activeClass = "bg-white/5 text-ink-60 hover:bg-white/10";
                        if (isCurrent) {
                          if (score <= 2) activeClass = "bg-rose-500 text-white font-bold ring-2 ring-rose-400/50";
                          else if (score === 3) activeClass = "bg-amber-500 text-white font-bold ring-2 ring-amber-400/50";
                          else activeClass = "bg-emerald-500 text-white font-bold ring-2 ring-emerald-400/50";
                        }

                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setConfidence(idx, score)}
                            className={`w-7 h-7 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center justify-center ${activeClass}`}
                            title={`Score ${score}: ${
                              score === 1
                                ? "Need to learn from scratch (Top priority)"
                                : score === 2
                                ? "Weak understanding"
                                : score === 3
                                ? "Average familiarity"
                                : score === 4
                                ? "Good grip"
                                : "Mastered / Exam Ready"
                            }`}
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Plan Adaptation Toggle */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0A84FF]/20 text-[#0A84FF] flex items-center justify-center shrink-0">
                  <Zap size={14} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Auto-Derive &amp; Adapt Study Plan
                  </p>
                  <p className="text-[11px] text-ink-60">
                    Schedules weak topics earliest in your daily plan using priority weighting.
                  </p>
                </div>
              </div>

              <input
                type="checkbox"
                checked={autoDerivePlan}
                onChange={(e) => setAutoDerivePlan(e.target.checked)}
                className="w-4 h-4 rounded accent-[#0A84FF] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* MODAL ACTIONS FOOTER                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between pt-3 border-t border-white/8">
          {wizardStep === "confidence" ? (
            <button
              type="button"
              onClick={() => setWizardStep("source")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-ink-60 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back to Structure</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 text-ink-60 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {wizardStep === "source" ? (
            <button
              type="button"
              onClick={() => setWizardStep("confidence")}
              disabled={finalTopics.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-[#0A84FF]/20"
            >
              <span>Next: Set Confidence &amp; Knowledge</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={finalTopics.length === 0 || importing}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0A84FF] to-emerald-500 text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow-lg shadow-[#0A84FF]/20"
            >
              {importing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving &amp; Adapting Plan…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>
                    {autoDerivePlan
                      ? `Save & Derive Smart Plan (${finalTopics.length} Topics)`
                      : `Save ${finalTopics.length} Topics`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

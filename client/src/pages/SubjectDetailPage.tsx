import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Youtube,
  Play,
  Folder,
  FolderPlus,
  Sparkles,
  FileText,
  Clock,
  Eye,
  Layers,
  Edit2,
  FileCode,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Check,
  Code2,
  BookOpen,
} from "lucide-react";
import api from "../lib/api";
import { parseApiError } from "../lib/error-handler";
import ConfidenceRating from "../components/ConfidenceRating";
import Modal from "../components/Modal";
import FocusPlayerModal from "../components/FocusPlayerModal";
import SyllabusParserModal from "../components/SyllabusParserModal";
import InlineDocViewerModal from "../components/InlineDocViewerModal";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { parseSyllabusClient, estimateTopicMinutes } from "../lib/syllabus-parser";
import type { Subject, ResourceType, ParsedUnitTopic, NoteCategory } from "../types";

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"curriculum" | "vault" | "notes">("curriculum");
  const [syllabusSubView, setSyllabusSubView] = useState<"checklist" | "rawDoc">("checklist");
  const [docViewMode, setDocViewMode] = useState<"formatted" | "raw">("formatted");
  const [syncingDoc, setSyncingDoc] = useState(false);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | "all">("all");

  // Parser Modal state
  const [parserOpen, setParserOpen] = useState(false);

  // Google Drive Folder Modal state
  const [driveModal, setDriveModal] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [savingDriveUrl, setSavingDriveUrl] = useState(false);

  // Inline Document Viewer Modal state
  const [viewerModal, setViewerModal] = useState<{
    open: boolean;
    title: string;
    url: string;
    type: ResourceType;
  }>({ open: false, title: "", url: "", type: "drive" });

  // New single topic state
  const [newTopic, setNewTopic] = useState({
    title: "",
    confidenceScore: 3,
    estimatedMinutes: 15,
    unitNumber: 1,
  });
  const [addingTopic, setAddingTopic] = useState(false);

  // New Resource state (Vault)
  const [resourceModal, setResourceModal] = useState(false);
  const [newResource, setNewResource] = useState<{
    title: string;
    type: ResourceType;
    url: string;
  }>({
    title: "",
    type: "drive",
    url: "",
  });
  const [addingResource, setAddingResource] = useState(false);

  // Note Modal state (Cloud Notes)
  const [noteModal, setNoteModal] = useState(false);
  const [activeNote, setActiveNote] = useState<{
    _id?: string;
    title: string;
    content: string;
    linkUrl?: string;
    category?: NoteCategory;
  } | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<NoteCategory | "all">("all");
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  const handleCopyCode = (noteId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNoteId(noteId);
    toast({ title: "Code snippet copied to clipboard!", type: "success" });
    setTimeout(() => setCopiedNoteId(null), 2000);
  };

  // Focus Player state
  const [focusModal, setFocusModal] = useState<{
    open: boolean;
    topicTitle: string;
  }>({ open: false, topicTitle: "" });

  const fetchSubject = async () => {
    if (!id) return;
    try {
      const res = await api.get(`/subjects/${id}`);
      const s: Subject = res.data.data.subject;
      setSubject(s);
      setDriveUrlInput(s.driveFolderUrl || "");
    } catch {
      toast({ title: "Failed to load course details", type: "error" });
      navigate("/subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubject();
  }, [id]);

  // Batch import topics from Syllabus Parser & auto-derive study plan
  const handleBatchImportTopics = async (
    topics: ParsedUnitTopic[],
    rawText: string,
    autoDerivePlan?: boolean
  ) => {
    if (!id) return;
    try {
      const res = await api.post(`/subjects/${id}/topics/batch`, {
        topics,
        rawSyllabusText: rawText,
        replaceExisting: true,
      });
      setSubject(res.data.data.subject);

      if (autoDerivePlan) {
        try {
          await api.post("/plan/generate");
          toast({
            title: `⚡ Imported ${topics.length} topics & derived adaptive Study Plan!`,
            type: "success",
          });
        } catch {
          toast({
            title: `⚡ Imported ${topics.length} topics into curriculum!`,
            type: "success",
          });
        }
      } else {
        toast({
          title: `⚡ Imported ${topics.length} topics into curriculum!`,
          type: "success",
        });
      }
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Save / Update Google Drive Folder URL
  const handleSaveDriveUrl = async () => {
    if (!id) return;
    setSavingDriveUrl(true);
    try {
      const res = await api.put(`/subjects/${id}`, {
        driveFolderUrl: driveUrlInput.trim(),
      });
      setSubject(res.data.data.subject);
      setDriveModal(false);
      toast({ title: "Google Drive folder connected!", type: "success" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    } finally {
      setSavingDriveUrl(false);
    }
  };

  // Add single Topic
  const handleAddTopic = async () => {
    if (!newTopic.title.trim() || !id) return;
    setAddingTopic(true);
    try {
      const res = await api.post(`/subjects/${id}/topics`, newTopic);
      setSubject(res.data.data.subject);
      setNewTopic({ title: "", confidenceScore: 3, estimatedMinutes: 15, unitNumber: 1 });
      toast({ title: "Topic added to curriculum", type: "success" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    } finally {
      setAddingTopic(false);
    }
  };

  // Toggle Topic Completion
  const handleToggleTopic = async (topicId: string, currentStatus: boolean) => {
    if (!id || !subject) return;
    try {
      const res = await api.put(`/subjects/${id}/topics/${topicId}`, {
        completed: !currentStatus,
      });
      setSubject(res.data.data.subject);
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Update Topic Confidence
  const handleConfidenceChange = async (topicId: string, score: number) => {
    if (!id) return;
    try {
      const res = await api.put(`/subjects/${id}/topics/${topicId}`, {
        confidenceScore: score,
      });
      setSubject(res.data.data.subject);
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Delete Topic
  const handleDeleteTopic = async (topicId: string, topicTitle?: string) => {
    if (!id) return;
    const confirmed = await confirm({
      title: "Remove Topic?",
      message: topicTitle
        ? `Are you sure you want to remove topic "${topicTitle}" from your curriculum?`
        : "Are you sure you want to remove this topic from your curriculum?",
      confirmText: "Remove",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/subjects/${id}/topics/${topicId}`);
      setSubject(res.data.data.subject);
      toast({ title: "Topic removed", type: "info" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Add Resource to Vault
  const handleAddResource = async () => {
    if (!newResource.title.trim() || !newResource.url.trim() || !id) return;
    setAddingResource(true);
    try {
      const res = await api.post(`/subjects/${id}/resources`, newResource);
      setSubject(res.data.data.subject);
      setNewResource({ title: "", type: "drive", url: "" });
      setResourceModal(false);
      toast({ title: "Resource added to vault", type: "success" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    } finally {
      setAddingResource(false);
    }
  };

  // Delete Resource from Vault
  const handleDeleteResource = async (resId: string, resTitle?: string) => {
    if (!id) return;
    const confirmed = await confirm({
      title: "Remove Resource?",
      message: resTitle
        ? `Are you sure you want to remove resource "${resTitle}" from the vault?`
        : "Are you sure you want to remove this resource from the vault?",
      confirmText: "Remove",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/subjects/${id}/resources/${resId}`);
      setSubject(res.data.data.subject);
      toast({ title: "Resource removed", type: "info" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Auto detect category from title and content
  const detectCategory = (title: string, content: string): NoteCategory => {
    const text = `${title} ${content}`.toLowerCase();
    if (
      /```|def |function |import |class |const |let |var |select |from |console\.log|print\(|<html|public class|#include/.test(
        text
      )
    ) {
      return "codes";
    }
    if (/syllabus|course outline|unit [1-5]|scheme|curriculum|module [1-5]/.test(text)) {
      return "syllabus";
    }
    if (/formula|cheat sheet|shortcuts|quick tips|reminder/.test(text)) {
      return "general";
    }
    return "study_notes";
  };

  // Save Note (Create or Update)
  const handleSaveNote = async () => {
    if (!activeNote || !activeNote.title.trim() || !id) return;
    setSavingNote(true);
    try {
      const payload = {
        ...activeNote,
        category: activeNote.category || detectCategory(activeNote.title, activeNote.content || ""),
      };
      let res;
      if (activeNote._id) {
        res = await api.put(`/subjects/${id}/notes/${activeNote._id}`, payload);
      } else {
        res = await api.post(`/subjects/${id}/notes`, payload);
      }
      setSubject(res.data.data.subject);
      setNoteModal(false);
      setActiveNote(null);
      toast({ title: "Note saved to cloud", type: "success" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    } finally {
      setSavingNote(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async (noteId: string, noteTitle?: string) => {
    if (!id) return;
    const confirmed = await confirm({
      title: "Delete Note?",
      message: noteTitle
        ? `Are you sure you want to delete note "${noteTitle}"?`
        : "Are you sure you want to delete this note?",
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/subjects/${id}/notes/${noteId}`);
      setSubject(res.data.data.subject);
      toast({ title: "Note deleted", type: "info" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Unique Unit numbers present in topics
  const availableUnits = useMemo(() => {
    if (!subject?.topics) return [];
    const units = Array.from(new Set(subject.topics.map((t) => t.unitNumber || 1)));
    return units.sort((a, b) => a - b);
  }, [subject?.topics]);

  // Collapsed state for each unit folder
  const [collapsedUnits, setCollapsedUnits] = useState<Record<number, boolean>>({});

  const toggleUnitCollapse = (unitNum: number) => {
    setCollapsedUnits((prev) => ({ ...prev, [unitNum]: !prev[unitNum] }));
  };

  const toggleAllUnits = (collapse: boolean) => {
    const next: Record<number, boolean> = {};
    availableUnits.forEach((u) => {
      next[u] = collapse;
    });
    setCollapsedUnits(next);
  };

  // Group topics by Unit for hierarchical folder view
  const groupedUnits = useMemo(() => {
    if (!subject?.topics) return [];
    const map = new Map<
      number,
      { unitNumber: number; unitTitle: string; topics: typeof subject.topics }
    >();

    for (const t of subject.topics) {
      const uNum = t.unitNumber || 1;
      if (!map.has(uNum)) {
        map.set(uNum, {
          unitNumber: uNum,
          unitTitle: t.unitTitle || `Unit ${uNum}`,
          topics: [],
        });
      }
      map.get(uNum)!.topics.push(t);
    }

    return Array.from(map.values()).sort((a, b) => a.unitNumber - b.unitNumber);
  }, [subject?.topics]);

  // Filtered groups based on unit tab
  const displayedGroupedUnits = useMemo(() => {
    if (selectedUnitFilter === "all") return groupedUnits;
    return groupedUnits.filter((g) => g.unitNumber === selectedUnitFilter);
  }, [groupedUnits, selectedUnitFilter]);

  // Clear all topics handler
  const handleClearAllTopics = async () => {
    if (!id) return;
    const confirmed = await confirm({
      title: "Clear All Topics?",
      message: "Are you sure you want to clear all topics? This lets you re-parse your syllabus cleanly into Units I–IV.",
      confirmText: "Clear All Topics",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      const res = await api.delete(`/subjects/${id}/topics`);
      setSubject(res.data.data.subject);
      toast({ title: "Topics cleared! Ready for fresh syllabus parse.", type: "info" });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  // Sync checklist from syllabus document
  const handleSyncChecklistFromDoc = async () => {
    if (!id || !subject?.rawSyllabusText) return;
    setSyncingDoc(true);
    try {
      const { allTopics } = parseSyllabusClient(subject.rawSyllabusText);
      if (allTopics.length === 0) {
        toast({ title: "Could not parse topics from syllabus document", type: "error" });
        return;
      }
      const res = await api.post(`/subjects/${id}/topics/batch`, {
        topics: allTopics,
        rawSyllabusText: subject.rawSyllabusText,
        replaceExisting: true,
      });
      setSubject(res.data.data.subject);
      toast({
        title: `⚡ Synced! Checklist updated with all ${allTopics.length} topics across all units!`,
        type: "success",
      });
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    } finally {
      setSyncingDoc(false);
    }
  };

  // Filtered topics based on unit tab
  const displayedTopics = useMemo(() => {
    if (!subject?.topics) return [];
    if (selectedUnitFilter === "all") return subject.topics;
    return subject.topics.filter((t) => (t.unitNumber || 1) === selectedUnitFilter);
  }, [subject?.topics, selectedUnitFilter]);

  // Filtered notes based on selected category
  const displayedNotes = useMemo(() => {
    if (!subject?.notes) return [];
    if (selectedNoteCategory === "all") return subject.notes;
    return subject.notes.filter((n) => (n.category || "study_notes") === selectedNoteCategory);
  }, [subject?.notes, selectedNoteCategory]);

  const noteCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: subject?.notes?.length || 0 };
    (subject?.notes || []).forEach((n) => {
      const cat = n.category || "study_notes";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [subject?.notes]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse space-y-6">
        <div className="h-6 bg-white/5 rounded-xl w-32" />
        <div className="h-44 bg-white/5 rounded-2xl w-full" />
        <div className="h-96 bg-white/5 rounded-2xl w-full" />
      </div>
    );
  }

  if (!subject) return null;

  const totalTopics = subject.topics.length;
  const completedCount = subject.topics.filter((t) => t.completed).length;
  const progressPct = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0;
  const totalHoursEst = (
    subject.topics.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0) / 60
  ).toFixed(1);

  return (
    <div className="p-6 md:p-10 w-full pb-24 md:pb-12 text-white max-w-7xl mx-auto">
      {/* ── Breadcrumbs & Back Navigation ──────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs text-ink-60 mb-6 flex-wrap">
        <Link
          to="/subjects"
          className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Curriculum Hub</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-white/60">
          {subject.degreeOrProgram || "MCA"}
        </span>
        <span>/</span>
        <span className="font-mono text-[#0A84FF]">
          {subject.semesterOrTrack || "Core"}
        </span>
        <span>/</span>
        <span className="text-white font-medium truncate">{subject.name}</span>
      </div>

      {/* ── Subject Hero Banner (Folder Hub Style) ─────────────────────── */}
      <div className="bg-[#141414] border border-white/[0.09] rounded-2xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span
                className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
                style={{
                  borderColor: `${subject.colorTag}40`,
                  backgroundColor: `${subject.colorTag}15`,
                  color: subject.colorTag,
                }}
              >
                {subject.semesterOrTrack || "Core Curriculum"}
              </span>

              <span className="text-xs font-mono text-ink-60">
                Target: {new Date(subject.examDate).toLocaleDateString()}
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>{subject.name}</span>
            </h1>

            <p className="text-xs text-ink-60 mt-1 max-w-xl">
              Central academic repository: structured syllabus units, lecture playlists, Drive notes, and Pomodoro focus sessions.
            </p>

            {/* Quick Action Badges: Drive Folder & Syllabus Parser */}
            <div className="flex items-center gap-2.5 mt-4 flex-wrap">
              {/* Google Drive Link Button */}
              {subject.driveFolderUrl ? (
                <div className="flex items-center gap-1">
                  <a
                    href={subject.driveFolderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 text-xs text-white transition-all group"
                    title="Open connected Google Drive folder"
                  >
                    <Folder size={13} className="text-amber-400" />
                    <span>Open Drive Folder</span>
                    <ExternalLink size={11} className="text-ink-60 group-hover:text-white" />
                  </a>
                  <button
                    onClick={() => setDriveModal(true)}
                    className="p-1.5 rounded-lg text-ink-60 hover:text-white hover:bg-white/5 transition-colors"
                    title="Edit Drive Folder Link"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDriveModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-dashed border-white/15 text-xs text-ink-60 hover:text-white transition-colors cursor-pointer"
                  title="Connect your Google Drive folder for this subject"
                >
                  <FolderPlus size={13} className="text-amber-400" />
                  <span>Connect Google Drive Folder</span>
                </button>
              )}

              {/* ⚡ Parse Syllabus Button */}
              <button
                onClick={() => setParserOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all shadow-md shadow-[#0A84FF]/20 cursor-pointer"
                title="Paste raw syllabus text to auto-generate topic checklist"
              >
                <Sparkles size={13} />
                <span>⚡ Parse Syllabus</span>
              </button>

              {/* 🗺️ Learning Road Link */}
              <Link
                to="/plan"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all cursor-pointer"
                title="Open AI Pedagogical Quest Roadmap"
              >
                <Compass size={13} className="text-[#0A84FF]" />
                <span>🗺️ Learning Road</span>
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-5 sm:gap-7 shrink-0 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
            <div>
              <p className="text-[10px] font-mono text-ink-60 uppercase">Mastery</p>
              <p className="font-mono text-2xl font-bold text-emerald-400">{progressPct}%</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] font-mono text-ink-60 uppercase">Topics</p>
              <p className="font-mono text-2xl font-bold text-white">
                {completedCount}/{totalTopics}
              </p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className="text-[10px] font-mono text-ink-60 uppercase">Est. Study</p>
              <p className="font-mono text-2xl font-bold text-amber-400">{totalHoursEst}h</p>
            </div>
          </div>
        </div>

        {/* Course Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/5">
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, backgroundColor: subject.colorTag }}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-white/10 mb-8 pb-1 overflow-x-auto">
        {[
          { key: "curriculum", label: "📋 Syllabus & Units", count: totalTopics },
          { key: "notes", label: "📝 Notes & Documents", count: subject.notes?.length || 0 },
          { key: "vault", label: "📁 Resource Vault & Playlists", count: subject.resources?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 pb-3 px-2 text-xs transition-all relative shrink-0 cursor-pointer ${
              activeTab === tab.key
                ? "text-[#0A84FF] font-bold"
                : "text-ink-60 hover:text-white"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                activeTab === tab.key
                  ? "bg-white/10 text-[#0A84FF] font-bold"
                  : "bg-white/5 text-ink-60"
              }`}
            >
              {tab.count}
            </span>

            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A84FF] rounded-full shadow-sm shadow-[#0A84FF]/50" />
            )}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Syllabus & Units ────────────────────────────────────── */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          {/* Sub-Header: Subview toggles & Unit Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSyllabusSubView("checklist")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  syllabusSubView === "checklist"
                    ? "bg-[#0A84FF] text-white"
                    : "bg-white/5 text-ink-60 hover:text-white hover:bg-white/10"
                }`}
              >
                Interactive Checklist ({displayedTopics.length})
              </button>

              <button
                onClick={() => setSyllabusSubView("rawDoc")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  syllabusSubView === "rawDoc"
                    ? "bg-[#0A84FF] text-white"
                    : "bg-white/5 text-ink-60 hover:text-white hover:bg-white/10"
                }`}
              >
                <FileCode size={13} />
                <span>Full Syllabus Document</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setParserOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition-colors cursor-pointer"
              >
                <Sparkles size={12} className="text-[#0A84FF]" />
                <span>Parse More Topics</span>
              </button>
            </div>
          </div>

          {/* Subview 1: Full Syllabus Document */}
          {syllabusSubView === "rawDoc" ? (
            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-[#141414] border border-white/[0.09] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-[#0A84FF] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-[#0A84FF]/20">
                        {subject.degreeOrProgram || "Academic Course"} &bull; {subject.semesterOrTrack || "Core"}
                      </span>
                      <span className="text-xs text-ink-60">Synced Curriculum</span>
                    </div>
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      Official Syllabus Document &mdash; {subject.name}
                    </h3>
                    <p className="text-xs text-ink-60 mt-0.5">
                      Fully synchronized with your checklist ({subject.topics.length} topics across {groupedUnits.length} units).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleSyncChecklistFromDoc}
                      disabled={syncingDoc || !subject.rawSyllabusText}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-white transition-colors cursor-pointer disabled:opacity-40"
                      title="Re-run parser to synchronize checklist topics with this document"
                    >
                      <Sparkles size={13} className="text-[#0A84FF]" />
                      <span>{syncingDoc ? "Syncing…" : "Sync Checklist"}</span>
                    </button>

                    <button
                      onClick={() => setParserOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Upload / Edit Syllabus
                    </button>
                  </div>
                </div>

                {/* View Switcher: Formatted Academic Layout vs Raw Text */}
                <div className="flex items-center gap-2 border-b border-white/5 pb-2 text-xs">
                  <button
                    onClick={() => setDocViewMode("formatted")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      docViewMode === "formatted"
                        ? "bg-[#0A84FF] text-white"
                        : "bg-white/5 text-ink-60 hover:text-white"
                    }`}
                  >
                    Structured Academic View
                  </button>
                  <button
                    onClick={() => setDocViewMode("raw")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      docViewMode === "raw"
                        ? "bg-[#0A84FF] text-white"
                        : "bg-white/5 text-ink-60 hover:text-white"
                    }`}
                  >
                    Raw Extracted Text
                  </button>
                </div>

                {/* Structured Academic View */}
                {docViewMode === "formatted" && (
                  <div className="space-y-4 pt-2">
                    {groupedUnits.length > 0 ? (
                      groupedUnits.map((u) => {
                        const unitDone = u.topics.filter((t) => t.completed).length;
                        const unitMinutes = u.topics.reduce(
                          (acc, t) => acc + (t.estimatedMinutes || 30),
                          0
                        );

                        return (
                          <div
                            key={u.unitNumber}
                            className="p-5 rounded-xl bg-[#0A0A0A] border border-white/8 space-y-3"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                                  style={{ backgroundColor: `${subject.colorTag}20` }}
                                >
                                  <Folder size={14} style={{ color: subject.colorTag }} />
                                </div>
                                <h4 className="text-sm font-semibold text-white">
                                  {u.unitTitle}
                                </h4>
                              </div>
                              <span className="text-xs font-mono text-ink-60">
                                {u.topics.length} topics &bull; ~{(unitMinutes / 60).toFixed(1)} hrs &bull; {unitDone}/{u.topics.length} done
                              </span>
                            </div>

                            {/* Topics chips / detailed list */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                              {u.topics.map((topic, i) => (
                                <div
                                  key={topic._id || i}
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-white/90"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0A84FF] shrink-0" />
                                  <span className="truncate">{topic.title}</span>
                                  <span className="text-[10px] font-mono text-ink-60 ml-auto shrink-0">
                                    {topic.estimatedMinutes}m
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-ink-60">
                        <FileText size={32} className="mx-auto mb-2 opacity-40 text-ink-60" />
                        <p>No structured units found yet. Click "Upload / Edit Syllabus" to scan your syllabus.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw Extracted Text View */}
                {docViewMode === "raw" && (
                  <div>
                    {subject.rawSyllabusText ? (
                      <pre className="p-5 rounded-xl bg-[#0A0A0A] border border-white/5 text-xs text-white/80 font-mono whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                        {subject.rawSyllabusText
                          .replace(
                            /(\b(?:unit|module|chapter)\s*[\-–—:]?\s*[0-9ivxlcdm]+\b)/gi,
                            "\n\n══════════════════════════════════════════════════════════\n$1\n══════════════════════════════════════════════════════════\n"
                          )
                          .trim()}
                      </pre>
                    ) : (
                      <div className="p-8 text-center text-xs text-ink-60">
                        <FileText size={32} className="mx-auto mb-2 opacity-40 text-ink-60" />
                        <p>No raw syllabus text saved for this subject yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Subview 2: Interactive Checklist */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Topics List (8 Cols) */}
              <div className="lg:col-span-8 space-y-4">
                {/* Unit Folder Header Controls & Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setSelectedUnitFilter("all")}
                      className={`px-3 py-1 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                        selectedUnitFilter === "all"
                          ? "bg-white/15 text-white font-medium"
                          : "bg-white/5 text-ink-60 hover:text-white"
                      }`}
                    >
                      All Units ({subject.topics.length})
                    </button>
                    {availableUnits.map((u) => {
                      const unitCount = subject.topics.filter((t) => (t.unitNumber || 1) === u).length;
                      const unitDone = subject.topics.filter(
                        (t) => (t.unitNumber || 1) === u && t.completed
                      ).length;

                      return (
                        <button
                          key={u}
                          onClick={() => setSelectedUnitFilter(u)}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            selectedUnitFilter === u
                              ? "bg-[#0A84FF]/20 text-[#0A84FF] font-medium border border-[#0A84FF]/40"
                              : "bg-white/5 text-ink-60 hover:text-white"
                          }`}
                        >
                          <span>Unit {u}</span>
                          <span className="text-[10px] opacity-70">
                            ({unitDone}/{unitCount})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => toggleAllUnits(false)}
                      className="text-[#0A84FF] hover:underline cursor-pointer"
                    >
                      Expand All
                    </button>
                    <span className="text-white/20">&bull;</span>
                    <button
                      type="button"
                      onClick={() => toggleAllUnits(true)}
                      className="text-ink-60 hover:text-white cursor-pointer"
                    >
                      Collapse All
                    </button>
                    {subject.topics.length > 0 && (
                      <>
                        <span className="text-white/20">&bull;</span>
                        <button
                          type="button"
                          onClick={handleClearAllTopics}
                          className="text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                          title="Clear all topics to re-parse cleanly"
                        >
                          Clear All
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Empty State */}
                {subject.topics.length === 0 ? (
                  <div className="p-10 rounded-2xl bg-[#141414] border border-white/8 text-center text-xs text-ink-60 space-y-3">
                    <Layers size={36} className="mx-auto text-ink-60 opacity-50" />
                    <div>
                      <p className="text-white font-medium text-sm">No curriculum topics yet</p>
                      <p className="text-ink-60 text-xs mt-1">
                        Use the Smart Syllabus Parser to upload your PDF/Image and generate all units cleanly.
                      </p>
                    </div>
                    <button
                      onClick={() => setParserOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold inline-flex items-center gap-2 hover:opacity-88"
                    >
                      <Sparkles size={14} />
                      <span>Scan Syllabus Now</span>
                    </button>
                  </div>
                ) : (
                  /* ── Hierarchical Unit Folder Structure ── */
                  <div className="space-y-4">
                    {displayedGroupedUnits.map((unitGroup) => {
                      const isCollapsed = !!collapsedUnits[unitGroup.unitNumber];
                      const unitTotal = unitGroup.topics.length;
                      const unitDone = unitGroup.topics.filter((t) => t.completed).length;
                      const unitPct = unitTotal > 0 ? Math.round((unitDone / unitTotal) * 100) : 0;
                      const unitMinutes = unitGroup.topics.reduce(
                        (acc, t) => acc + (t.estimatedMinutes || 30),
                        0
                      );

                      return (
                        <div
                          key={unitGroup.unitNumber}
                          className="rounded-2xl border border-white/8 bg-[#141414] overflow-hidden transition-all shadow-sm"
                        >
                          {/* Unit Folder Header */}
                          <div
                            onClick={() => toggleUnitCollapse(unitGroup.unitNumber)}
                            className="p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center justify-between gap-3 select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                className="p-1 rounded-md text-ink-60 hover:text-white transition-colors"
                              >
                                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                              </button>

                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                                style={{ backgroundColor: `${subject.colorTag}15` }}
                              >
                                <Folder size={16} style={{ color: subject.colorTag }} />
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-[#0A84FF] border border-[#0A84FF]/20">
                                    Unit {unitGroup.unitNumber}
                                  </span>
                                  <h3 className="text-sm font-semibold text-white truncate">
                                    {unitGroup.unitTitle || `Unit ${unitGroup.unitNumber}`}
                                  </h3>
                                </div>
                                <p className="text-[11px] text-ink-60 mt-0.5 font-mono">
                                  {unitTotal} topics &bull; ~{(unitMinutes / 60).toFixed(1)} hrs study time
                                </p>
                              </div>
                            </div>

                            {/* Unit Progress Bar & Percentage */}
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="hidden sm:block text-right">
                                <span className="text-xs font-mono text-white font-medium">
                                  {unitDone}/{unitTotal}
                                </span>
                                <span className="text-[10px] text-ink-60 ml-1">({unitPct}%)</span>
                                <div className="w-24 h-1.5 rounded-full bg-white/5 mt-1 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${unitPct}%`, backgroundColor: subject.colorTag }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Unit Topics (Collapsible Body) */}
                          {!isCollapsed && (
                            <div className="p-3 space-y-2 border-t border-white/5 bg-[#0F0F0F]">
                              {unitGroup.topics.map((topic) => {
                                const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                                  `${subject.name} ${topic.title} tutorial`
                                )}`;

                                return (
                                  <div
                                    key={topic._id}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                                      topic.completed
                                        ? "bg-emerald-500/5 border-emerald-500/20 opacity-75"
                                        : "bg-[#141414] border-white/5 hover:border-white/12"
                                    }`}
                                  >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      <button
                                        onClick={() => handleToggleTopic(topic._id, topic.completed)}
                                        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                                          topic.completed
                                            ? "bg-emerald-500 border-emerald-500 text-white"
                                            : "border-white/20 hover:border-[#0A84FF]"
                                        }`}
                                      >
                                        {topic.completed && <CheckCircle2 size={13} />}
                                      </button>

                                      <div className="min-w-0 flex-1">
                                        <h4
                                          className={`text-xs font-medium ${
                                            topic.completed ? "line-through text-ink-60" : "text-white"
                                          }`}
                                        >
                                          {topic.title}
                                        </h4>

                                        <div className="flex items-center gap-3 text-[11px] text-ink-60 mt-1 flex-wrap">
                                          <span className="flex items-center gap-1 font-mono">
                                            <Clock size={11} />
                                            {topic.estimatedMinutes}m est.
                                          </span>
                                          <span>&bull;</span>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] font-mono">Mastery:</span>
                                            <ConfidenceRating
                                              value={topic.confidenceScore}
                                              onChange={(score) =>
                                                handleConfidenceChange(topic._id, score)
                                              }
                                              size={12}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                      <button
                                        onClick={() =>
                                          setFocusModal({
                                            open: true,
                                            topicTitle: topic.title,
                                          })
                                        }
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition-colors cursor-pointer"
                                        title="Start Focus Session"
                                      >
                                        <Play size={11} fill="currentColor" />
                                        <span className="text-[11px]">Focus</span>
                                      </button>

                                      <button
                                        onClick={() =>
                                          setViewerModal({
                                            open: true,
                                            title: `${topic.title} — Video Lectures`,
                                            url: youtubeUrl,
                                            type: "youtube",
                                          })
                                        }
                                        className="p-1.5 rounded-lg text-ink-60 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                                        title="Search Video Tutorials"
                                      >
                                        <Youtube size={14} />
                                      </button>

                                      <button
                                        onClick={() => handleDeleteTopic(topic._id, topic.title)}
                                        className="p-1.5 rounded-lg text-ink-60 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                                        title="Delete topic"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Add Single Topic Sidebar (4 Cols) */}
              <div className="lg:col-span-4">
                <div className="bg-[#141414] border border-white/8 rounded-2xl p-5 space-y-4 sticky top-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                      Add Single Topic
                    </h3>
                    <span className="text-[10px] font-mono text-ink-60">Unit {newTopic.unitNumber}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1">
                      Topic Title
                    </label>
                    <input
                      value={newTopic.title}
                      onChange={(e) => {
                        const title = e.target.value;
                        const autoEst = estimateTopicMinutes(title);
                        setNewTopic((prev) => ({
                          ...prev,
                          title,
                          estimatedMinutes: title.trim().length > 2 ? autoEst : prev.estimatedMinutes,
                        }));
                      }}
                      placeholder="e.g. Primary Key, Normalization, B+ Trees"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1">
                        Unit Number
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={newTopic.unitNumber}
                        onChange={(e) =>
                          setNewTopic((prev) => ({
                            ...prev,
                            unitNumber: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-mono text-ink-60 uppercase tracking-wider">
                          Minutes
                        </label>
                        <span className="text-[10px] text-ink-60 font-mono">
                          {newTopic.estimatedMinutes}m est.
                        </span>
                      </div>
                      <input
                        type="number"
                        min={5}
                        step={5}
                        value={newTopic.estimatedMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setNewTopic((prev) => ({
                            ...prev,
                            estimatedMinutes: isNaN(val) ? 5 : Math.max(val, 5),
                          }));
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50 font-mono"
                      />
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {[5, 10, 15, 25, 30, 45].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() =>
                              setNewTopic((prev) => ({ ...prev, estimatedMinutes: m }))
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                              newTopic.estimatedMinutes === m
                                ? "bg-[#0A84FF] text-white font-semibold"
                                : "bg-white/5 text-ink-60 hover:text-white"
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1">
                      Initial Confidence
                    </label>
                    <ConfidenceRating
                      value={newTopic.confidenceScore}
                      onChange={(score) =>
                        setNewTopic((prev) => ({ ...prev, confidenceScore: score }))
                      }
                      size={16}
                    />
                  </div>

                  <button
                    onClick={handleAddTopic}
                    disabled={addingTopic || !newTopic.title.trim()}
                    className="w-full py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {addingTopic ? "Adding Topic…" : "Add to Curriculum"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: Notes & Documents ───────────────────────────────────── */}
      {activeTab === "notes" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg text-white font-semibold">Subject Notes Hub</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 font-mono">
                  {subject.notes?.length || 0}
                </span>
              </div>
              <p className="text-xs text-ink-60">
                Course summaries, lecture cheat sheets, programs, and direct links to Google Drive PDFs.
              </p>
            </div>

            <button
              onClick={() => {
                setActiveNote({ title: "", content: "", linkUrl: "", category: "study_notes" });
                setNoteModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all cursor-pointer self-start sm:self-auto shadow-sm"
            >
              <Plus size={15} />
              <span>Create Note</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          {subject.notes && subject.notes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(
                [
                  { id: "all", label: "All Notes", count: noteCategoryCounts.all, icon: Layers },
                  { id: "study_notes", label: "Study Notes", count: noteCategoryCounts.study_notes || 0, icon: FileText },
                  { id: "syllabus", label: "Syllabus", count: noteCategoryCounts.syllabus || 0, icon: BookOpen },
                  { id: "codes", label: "Code & Programs", count: noteCategoryCounts.codes || 0, icon: Code2 },
                  { id: "general", label: "General & Tips", count: noteCategoryCounts.general || 0, icon: Sparkles },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isActive = selectedNoteCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedNoteCategory(tab.id as NoteCategory | "all")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#0A84FF] border-[#0A84FF] text-white shadow-sm"
                        : "bg-[#141414] border-white/8 text-ink-60 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? "bg-white/20 text-white" : "bg-white/5 text-ink-60"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!subject.notes || subject.notes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#141414] border border-white/8 text-center text-xs text-ink-60 space-y-3">
              <FileText size={32} className="mx-auto opacity-40 text-sky-400" />
              <p>No notes written for {subject.name} yet.</p>
              <button
                onClick={() => {
                  setActiveNote({ title: "", content: "", linkUrl: "", category: "study_notes" });
                  setNoteModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold cursor-pointer"
              >
                Write First Note
              </button>
            </div>
          ) : displayedNotes.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#141414] border border-white/8 text-center text-xs text-ink-60 space-y-3">
              <p>No notes found in this category.</p>
              <button
                onClick={() => setSelectedNoteCategory("all")}
                className="px-3 py-1.5 rounded-xl border border-white/10 text-xs text-ink-60 hover:text-white"
              >
                Show All Notes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedNotes.map((n) => {
                const cat = n.category || "study_notes";
                const isCode = cat === "codes";

                const badgeConfig = {
                  study_notes: { label: "Study Notes", icon: FileText, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/25" },
                  syllabus: { label: "Syllabus", icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/25" },
                  codes: { label: "Code & Script", icon: Code2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
                  general: { label: "General", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
                }[cat] || { label: "Notes", icon: FileText, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/25" };

                const BadgeIcon = badgeConfig.icon;

                return (
                  <div
                    key={n._id}
                    className="p-5 rounded-2xl bg-[#141414] border border-white/8 hover:border-white/15 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      {/* Note Category Pill + Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${badgeConfig.bg} ${badgeConfig.color}`}>
                          <BadgeIcon size={11} />
                          <span>{badgeConfig.label}</span>
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setActiveNote({ ...n });
                              setNoteModal(true);
                            }}
                            className="p-1 text-ink-60 hover:text-white rounded"
                            title="Edit note"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(n._id, n.title)}
                            className="p-1 text-ink-60 hover:text-rose-400 rounded"
                            title="Delete note"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-sm font-semibold text-white truncate mb-2">{n.title}</h4>

                      {/* Content view: code formatted or standard note */}
                      {isCode ? (
                        <div className="relative mb-3 group/code">
                          <pre className="p-3 rounded-xl bg-black/60 border border-emerald-500/20 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40 whitespace-pre leading-relaxed scrollbar-thin">
                            {n.content || "// Empty code snippet"}
                          </pre>
                          {n.content && (
                            <button
                              onClick={() => handleCopyCode(n._id, n.content)}
                              className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-mono text-white flex items-center gap-1 backdrop-blur-sm transition-all shadow"
                              title="Copy code"
                            >
                              {copiedNoteId === n._id ? (
                                <>
                                  <Check size={11} className="text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={11} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-60 line-clamp-3 leading-relaxed mb-3 whitespace-pre-wrap">
                          {n.content || "Empty note content."}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-ink-60">
                        {n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : ""}
                      </span>

                      {n.linkUrl && (
                        <button
                          onClick={() =>
                            setViewerModal({
                              open: true,
                              title: n.title,
                              url: n.linkUrl!,
                              type: "drive",
                            })
                          }
                          className="flex items-center gap-1 text-[#0A84FF] hover:underline font-medium cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View Doc</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Resource Vault & Playlists ──────────────────────────── */}
      {activeTab === "vault" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg text-white font-semibold">Resource Vault &amp; Playlists</h2>
              <p className="text-xs text-ink-60">
                YouTube lecture series, Google Drive PDFs (e.g. "DS complete notes"), and question papers with on-site viewer.
              </p>
            </div>

            <button
              onClick={() => setResourceModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Resource</span>
            </button>
          </div>

          {!subject.resources || subject.resources.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#141414] border border-white/8 text-center text-xs text-ink-60 space-y-3">
              <Folder size={32} className="mx-auto opacity-40 text-amber-400" />
              <p>No resources or playlists in the vault yet.</p>
              <button
                onClick={() => setResourceModal(true)}
                className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold"
              >
                Add Drive PDF or YouTube Playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subject.resources.map((res) => {
                const isYoutube =
                  res.type === "youtube" ||
                  res.type === "playlist" ||
                  res.url.includes("youtube.com") ||
                  res.url.includes("youtu.be");
                const isDrive = res.type === "drive" || res.url.includes("drive.google.com");

                return (
                  <div
                    key={res._id}
                    className="p-5 rounded-2xl bg-[#141414] border border-white/8 hover:border-white/15 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                            isYoutube
                              ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : isDrive
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {res.type.toUpperCase()}
                        </span>

                        <button
                          onClick={() => handleDeleteResource(res._id, res.title)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-ink-60 hover:text-rose-400 rounded transition-opacity"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <h4 className="text-sm font-semibold text-white mb-1 line-clamp-1">{res.title}</h4>
                      <p className="font-mono text-[11px] text-ink-60 truncate">{res.url}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      {/* On-Site Viewer Button */}
                      <button
                        onClick={() =>
                          setViewerModal({
                            open: true,
                            title: res.title,
                            url: res.url,
                            type: res.type,
                          })
                        }
                        className="flex items-center gap-1.5 text-xs text-[#0A84FF] hover:underline font-medium cursor-pointer"
                      >
                        <Eye size={12} />
                        <span>View On-Site</span>
                      </button>

                      {/* Direct External Link */}
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink-60 hover:text-white p-1"
                        title="Open in new window"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Google Drive Folder Link Modal ─────────────────────────────── */}
      <Modal
        isOpen={driveModal}
        onClose={() => setDriveModal(false)}
        title="📁 Connect Google Drive Folder"
      >
        <div className="space-y-4 text-white">
          <p className="text-xs text-ink-60">
            Paste the link to your Google Drive folder for <strong>{subject.name}</strong>. You'll be able to open all your lecture slides, notes PDFs, and question papers directly from this subject header with 1 click.
          </p>

          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1">
              Google Drive Folder URL
            </label>
            <input
              type="url"
              value={driveUrlInput}
              onChange={(e) => setDriveUrlInput(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
            <button
              onClick={() => setDriveModal(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs text-ink-60 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveDriveUrl}
              disabled={savingDriveUrl}
              className="px-5 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 disabled:opacity-40"
            >
              {savingDriveUrl ? "Saving…" : "Save Drive Link"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Smart Syllabus Parser Modal ────────────────────────────────── */}
      <SyllabusParserModal
        isOpen={parserOpen}
        onClose={() => setParserOpen(false)}
        subjectName={subject.name}
        onImport={handleBatchImportTopics}
      />

      {/* ── Inline Document & Video Viewer Modal ───────────────────────── */}
      <InlineDocViewerModal
        isOpen={viewerModal.open}
        onClose={() => setViewerModal((prev) => ({ ...prev, open: false }))}
        title={viewerModal.title}
        url={viewerModal.url}
        type={viewerModal.type}
      />

      {/* ── Add Resource to Vault Modal ────────────────────────────────── */}
      <Modal
        isOpen={resourceModal}
        onClose={() => setResourceModal(false)}
        title="Add to Resource Vault"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1">Title</label>
            <input
              value={newResource.title}
              onChange={(e) => setNewResource((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Ds complete notes, DS PLAYLIST, Unit 1 Slides"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1">Type</label>
            <select
              value={newResource.type}
              onChange={(e) =>
                setNewResource((prev) => ({ ...prev, type: e.target.value as ResourceType }))
              }
              className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50"
            >
              <option value="drive">Google Drive Folder / PDF</option>
              <option value="playlist">YouTube Lecture Playlist</option>
              <option value="youtube">YouTube Video</option>
              <option value="pdf">Direct PDF Document</option>
              <option value="book">Reference Book Link</option>
              <option value="link">Web Article / Documentation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1">URL / Link</label>
            <input
              value={newResource.url}
              onChange={(e) => setNewResource((prev) => ({ ...prev, url: e.target.value }))}
              placeholder="https://drive.google.com/... or https://youtube.com/..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => setResourceModal(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs text-ink-60 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAddResource}
              disabled={addingResource || !newResource.title.trim() || !newResource.url.trim()}
              className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold disabled:opacity-50"
            >
              {addingResource ? "Adding…" : "Add Resource"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Cloud Note Edit Modal ──────────────────────────────────────── */}
      <Modal
        isOpen={noteModal}
        onClose={() => setNoteModal(false)}
        title={activeNote?._id ? "Edit Cloud Note" : "Create Cloud Note"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1">Note Title</label>
            <input
              value={activeNote?.title || ""}
              onChange={(e) =>
                setActiveNote((prev) => (prev ? { ...prev, title: e.target.value } : null))
              }
              placeholder="e.g. Unit 1 Key Formulas, Quick Cheat Sheet, Binary Search Code"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50"
            />
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1.5">Note Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: "study_notes", label: "Study Notes", icon: FileText, color: "text-sky-400" },
                  { id: "syllabus", label: "Syllabus", icon: BookOpen, color: "text-purple-400" },
                  { id: "codes", label: "Code & Script", icon: Code2, color: "text-emerald-400" },
                  { id: "general", label: "General", icon: Sparkles, color: "text-amber-400" },
                ] as const
              ).map((cat) => {
                const Icon = cat.icon;
                const isSelected = (activeNote?.category || "study_notes") === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setActiveNote((prev) => (prev ? { ...prev, category: cat.id } : null))
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                      isSelected
                        ? "bg-white/10 border-[#0A84FF] text-white shadow-sm ring-1 ring-[#0A84FF]/40"
                        : "bg-white/[0.03] border-white/8 text-ink-60 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <Icon size={13} className={cat.color} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1">
              External Document / Drive PDF Link (Optional)
            </label>
            <input
              value={activeNote?.linkUrl || ""}
              onChange={(e) =>
                setActiveNote((prev) => (prev ? { ...prev, linkUrl: e.target.value } : null))
              }
              placeholder="https://drive.google.com/file/d/..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase mb-1">
              {activeNote?.category === "codes" ? "Code / Script Snippet" : "Content / Markdown"}
            </label>
            <textarea
              value={activeNote?.content || ""}
              onChange={(e) =>
                setActiveNote((prev) => (prev ? { ...prev, content: e.target.value } : null))
              }
              placeholder={
                activeNote?.category === "codes"
                  ? "Paste code snippet, script, SQL query, or algorithm here..."
                  : "Type your notes, key takeaways, and formulas here..."
              }
              rows={8}
              className={`w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50 resize-y ${
                activeNote?.category === "codes" ? "font-mono text-emerald-300" : ""
              }`}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button
              onClick={() => setNoteModal(false)}
              className="px-4 py-2 rounded-xl border border-white/10 text-xs text-ink-60 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNote}
              disabled={savingNote || !activeNote?.title.trim()}
              className="px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold disabled:opacity-50"
            >
              {savingNote ? "Saving…" : "Save Note"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Focus Player Modal ─────────────────────────────────────────── */}
      <FocusPlayerModal
        isOpen={focusModal.open}
        onClose={() => setFocusModal({ open: false, topicTitle: "" })}
        topicTitle={focusModal.topicTitle}
        subjectName={subject.name}
      />
    </div>
  );
}

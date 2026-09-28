import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Plus,
  ExternalLink,
  Trash2,
  Edit3,
  Save,
  Search,
  Folder,
  Youtube,
  Eye,
  CheckCircle2,
  Sparkles,
  Code2,
  BookOpen,
  Copy,
  Check,
  Layers,
  FolderTree,
  Filter,
} from "lucide-react";
import api from "../lib/api";
import { parseApiError } from "../lib/error-handler";
import Modal from "../components/Modal";
import EmptyState from "../components/EmptyState";
import InlineDocViewerModal from "../components/InlineDocViewerModal";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import type { GlobalNote, Subject, ResourceType, NoteCategory } from "../types";

export const CATEGORY_CONFIG: Record<
  NoteCategory,
  { label: string; icon: typeof FileText; color: string; bg: string; border: string; desc: string }
> = {
  study_notes: {
    label: "Study Notes",
    icon: FileText,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    desc: "Lecture notes, concepts & chapter summaries",
  },
  syllabus: {
    label: "Syllabus & Units",
    icon: BookOpen,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    desc: "Course outlines, unit breakdowns & exam schemes",
  },
  codes: {
    label: "Code & Programs",
    icon: Code2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    desc: "Syntax drills, scripts, SQL queries & algorithm snippets",
  },
  general: {
    label: "General & Cheatsheet",
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    desc: "Quick formulas, tips & reference links",
  },
};

export default function NotesPage() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [notes, setNotes] = useState<GlobalNote[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [arrangementMode, setArrangementMode] = useState<"by_subject" | "by_category" | "grid">(
    "by_subject"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Note creation / editing state
  const [editNoteModal, setEditNoteModal] = useState(false);
  const [activeNote, setActiveNote] = useState<
    (Partial<GlobalNote> & { subjectId?: string; category?: NoteCategory }) | null
  >(null);
  const [saving, setSaving] = useState(false);

  // On-site Document Viewer Modal
  const [viewerModal, setViewerModal] = useState<{
    open: boolean;
    title: string;
    url: string;
    type?: ResourceType;
  }>({ open: false, title: "", url: "" });

  const fetchNotesAndSubjects = async () => {
    try {
      const [notesRes, subjectsRes] = await Promise.all([
        api.get("/subjects/notes/all"),
        api.get("/subjects"),
      ]);
      setNotes(notesRes.data.data.notes || []);
      setSubjects(subjectsRes.data.data.subjects || []);
    } catch {
      toast({ title: "Failed to load notes", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotesAndSubjects();
  }, []);

  // Filter notes by search query, category, and subject
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        n.subjectName.toLowerCase().includes(search.toLowerCase());

      const noteCat = n.category || "study_notes";
      const matchesCategory = selectedCategory === "all" || noteCat === selectedCategory;

      const matchesSubject =
        selectedSubject === "all" ||
        n.subjectId === selectedSubject ||
        n.subjectName === selectedSubject;

      return matchesSearch && matchesCategory && matchesSubject;
    });
  }, [notes, search, selectedCategory, selectedSubject]);

  // Group notes by Subject for "By Subject" arrangement
  const groupedBySubject = useMemo(() => {
    const groups: Record<
      string,
      {
        subjectId: string;
        subjectName: string;
        subjectColor: string;
        semesterOrTrack?: string;
        notes: GlobalNote[];
      }
    > = {};

    filteredNotes.forEach((note) => {
      const subKey = note.subjectId || note.subjectName || "unassigned";
      if (!groups[subKey]) {
        groups[subKey] = {
          subjectId: note.subjectId,
          subjectName: note.subjectName || "General Academic",
          subjectColor: note.subjectColor || "#0A84FF",
          semesterOrTrack: note.semesterOrTrack,
          notes: [],
        };
      }
      groups[subKey].notes.push(note);
    });

    return Object.values(groups);
  }, [filteredNotes]);

  // Group notes by Category for "By Category" arrangement
  const groupedByCategory = useMemo(() => {
    const categories: NoteCategory[] = ["study_notes", "syllabus", "codes", "general"];
    return categories.map((catKey) => {
      const catNotes = filteredNotes.filter((n) => (n.category || "study_notes") === catKey);
      return {
        key: catKey,
        config: CATEGORY_CONFIG[catKey],
        notes: catNotes,
      };
    });
  }, [filteredNotes]);

  // Smart URL parser for UI badges and on-site previewing
  const getUrlMeta = (url: string) => {
    if (!url) return null;
    const isDrive = url.includes("drive.google.com") || url.includes("docs.google.com");
    const isPdf = url.toLowerCase().endsWith(".pdf") || url.includes(".pdf?");
    const isYoutube = url.includes("youtube.com") || url.includes("youtu.be");

    let hostname = "";
    try {
      hostname = new URL(url).hostname.replace("www.", "");
    } catch {
      hostname = "Reference Link";
    }

    if (isDrive) {
      return {
        label: "Google Drive Doc",
        badgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20",
        icon: Folder,
        canPreview: true,
        type: "drive" as const,
      };
    }
    if (isPdf) {
      return {
        label: "PDF Document",
        badgeClass: "bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/20",
        icon: FileText,
        canPreview: true,
        type: "pdf" as const,
      };
    }
    if (isYoutube) {
      return {
        label: "Lecture Video",
        badgeClass: "bg-red-500/10 text-red-300 border-red-500/25 hover:bg-red-500/20",
        icon: Youtube,
        canPreview: true,
        type: "youtube" as const,
      };
    }
    return {
      label: hostname,
      badgeClass: "bg-white/5 text-[#0A84FF] border-white/10 hover:bg-white/10",
      icon: ExternalLink,
      canPreview: false,
      type: "link" as const,
    };
  };

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Code copied to clipboard!", type: "success" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveNote = async () => {
    if (!activeNote?.title || !activeNote?.subjectId) {
      toast({ title: "Note title and subject are required", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: activeNote.title,
        content: activeNote.content || "",
        linkUrl: activeNote.linkUrl || "",
        category: activeNote.category || "study_notes",
      };

      if (activeNote._id) {
        // Update existing note
        await api.put(`/subjects/${activeNote.subjectId}/notes/${activeNote._id}`, payload);
        toast({ title: "Note updated successfully", type: "success" });
      } else {
        // Create new note in Cloud Database
        await api.post(`/subjects/${activeNote.subjectId}/notes`, payload);
        toast({ title: "Note saved to Cloud", type: "success" });
      }
      setEditNoteModal(false);
      setActiveNote(null);
      await fetchNotesAndSubjects();
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (subjectId: string, noteId: string, noteTitle?: string) => {
    const confirmed = await confirm({
      title: "Delete Note?",
      message: `Are you sure you want to delete note "${noteTitle || "this note"}"?`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/subjects/${subjectId}/notes/${noteId}`);
      toast({ title: "Note deleted", type: "info" });
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
    }
  };

  const openNewNoteForSubject = (subjectId?: string, defaultCategory: NoteCategory = "study_notes") => {
    setActiveNote({
      title: "",
      content: "",
      linkUrl: "",
      category: defaultCategory,
      subjectId: subjectId || subjects[0]?._id,
    });
    setEditNoteModal(true);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Render an individual Note Card
  const renderNoteCard = (note: GlobalNote) => {
    const urlMeta = note.linkUrl ? getUrlMeta(note.linkUrl) : null;
    const cat = note.category || "study_notes";
    const catCfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.study_notes;
    const CatIcon = catCfg.icon;
    const isCode = cat === "codes";

    return (
      <motion.div
        key={note._id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#141414] border border-white/8 hover:border-white/15 rounded-2xl p-5 flex flex-col justify-between transition-all group relative shadow-lg"
      >
        <div>
          {/* Top Bar: Subject Badge & Actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: note.subjectColor }}
              />
              <span className="text-[11px] font-mono text-ink-60 uppercase truncate">
                {note.subjectName}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isCode && note.content && (
                <button
                  onClick={() => handleCopyCode(note._id, note.content)}
                  className="p-1.5 text-ink-60 hover:text-emerald-400 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  title="Copy code snippet"
                >
                  {copiedId === note._id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              )}
              <button
                onClick={() => {
                  setActiveNote({ ...note });
                  setEditNoteModal(true);
                }}
                className="p-1.5 text-ink-60 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                title="Edit note"
              >
                <Edit3 size={13} />
              </button>
              <button
                onClick={() => handleDeleteNote(note.subjectId, note._id, note.title)}
                className="p-1.5 text-ink-60 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                title="Delete note"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Category Tag & Title */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 font-semibold ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}
            >
              <CatIcon size={10} />
              <span>{catCfg.label}</span>
            </span>
          </div>

          <h3 className="text-sm font-semibold text-white mb-2 leading-snug line-clamp-2">
            {note.title}
          </h3>

          {/* Note Content (Regular text or Monospace for Code) */}
          {isCode ? (
            <div className="relative my-2 p-3 rounded-xl bg-black/40 border border-emerald-500/20 font-mono text-[11px] text-emerald-300 overflow-x-auto max-h-32">
              <pre className="whitespace-pre-wrap">{note.content || "// No code snippet provided"}</pre>
            </div>
          ) : (
            <p className="text-xs text-ink-60 line-clamp-3 leading-relaxed mb-4 whitespace-pre-wrap">
              {note.content || "Empty note content."}
            </p>
          )}
        </div>

        {/* Footer: Date & External Document Link */}
        <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] font-mono text-ink-60">
            {note.updatedAt
              ? new Date(note.updatedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              : ""}
          </span>

          {urlMeta && (
            <div className="flex items-center gap-1.5">
              {urlMeta.canPreview ? (
                <button
                  onClick={() =>
                    setViewerModal({
                      open: true,
                      title: note.title,
                      url: note.linkUrl!,
                      type: urlMeta.type,
                    })
                  }
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${urlMeta.badgeClass}`}
                  title="Preview document on-site without leaving page"
                >
                  <Eye size={12} />
                  <span>View Doc</span>
                </button>
              ) : (
                <a
                  href={note.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all ${urlMeta.badgeClass}`}
                  title="Open external reference"
                >
                  <urlMeta.icon size={12} />
                  <span className="truncate max-w-[100px]">{urlMeta.label}</span>
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="p-6 md:p-10 w-full pb-24 md:pb-12 text-white max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText size={15} className="text-[#0A84FF]" />
            <span className="text-xs font-mono text-[#0A84FF] uppercase tracking-wider">
              Central Academic Notes Hub
            </span>
          </div>
          <h1 className="text-3xl text-white font-semibold">
            Cloud Notes &amp; Documents
          </h1>
          <p className="text-xs text-ink-60 mt-0.5">
            Organized academic repository: categorized by <strong>Subject</strong>, <strong>Study Notes</strong>, <strong>Syllabus</strong>, and <strong>Code Snippets</strong> with on-site previewing.
          </p>
        </div>

        {subjects.length > 0 && (
          <button
            onClick={() => openNewNoteForSubject()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all shadow-md shadow-[#0A84FF]/20 cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>New Note</span>
          </button>
        )}
      </div>

      {/* Arrangement Mode Toggles & Category Filter Bar */}
      <div className="space-y-4 mb-6">
        {/* Row 1: Arrangement View Tabs & Search */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Arrangement Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-xl shrink-0">
            <button
              onClick={() => setArrangementMode("by_subject")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                arrangementMode === "by_subject"
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <FolderTree size={13} />
              <span>By Subject</span>
            </button>

            <button
              onClick={() => setArrangementMode("by_category")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                arrangementMode === "by_category"
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <Layers size={13} />
              <span>By Category</span>
            </button>

            <button
              onClick={() => setArrangementMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                arrangementMode === "grid"
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <Filter size={13} />
              <span>All ({filteredNotes.length})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-3 text-ink-60" />
            <input
              type="text"
              placeholder="Search notes, code snippets, syllabus, keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-ink-60 focus:outline-none focus:border-[#0A84FF]"
            />
          </div>
        </div>

        {/* Row 2: Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0 cursor-pointer ${
              selectedCategory === "all"
                ? "bg-white/15 text-white font-medium"
                : "bg-white/5 text-ink-60 hover:text-white"
            }`}
          >
            All Types ({notes.length})
          </button>

          {(["study_notes", "syllabus", "codes", "general"] as NoteCategory[]).map((cat) => {
            const cfg = CATEGORY_CONFIG[cat];
            const count = notes.filter((n) => (n.category || "study_notes") === cat).length;
            const isSelected = selectedCategory === cat;
            const Icon = cfg.icon;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#0A84FF] text-white font-semibold shadow-sm shadow-[#0A84FF]/25"
                    : "bg-white/5 text-ink-60 hover:text-white"
                }`}
              >
                <Icon size={12} />
                <span>{cfg.label}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Subject Filter Pills (if multiple subjects exist) */}
        {subjects.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-ink-60 text-[11px] font-mono shrink-0 mr-1">Subject:</span>
            <button
              onClick={() => setSelectedSubject("all")}
              className={`px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                selectedSubject === "all"
                  ? "bg-white/15 text-white font-medium"
                  : "bg-white/5 text-ink-60 hover:text-white"
              }`}
            >
              All Subjects
            </button>
            {subjects.map((s) => (
              <button
                key={s._id}
                onClick={() => setSelectedSubject(s._id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors shrink-0 cursor-pointer ${
                  selectedSubject === s._id
                    ? "bg-white/15 text-white font-medium border border-white/20"
                    : "bg-white/5 text-ink-60 hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.colorTag }} />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── NOTES CONTENT CONTAINER ────────────────────────────────────────── */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          message="No notes found"
          subMessage={
            subjects.length === 0
              ? "Add a subject first to attach curriculum notes and documents."
              : search || selectedCategory !== "all" || selectedSubject !== "all"
              ? "Try adjusting your search query, subject filter, or category."
              : "Create your first study note, upload code snippets, or attach Google Drive documents."
          }
          action={
            subjects.length > 0 ? (
              <button
                onClick={() => openNewNoteForSubject()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 cursor-pointer"
              >
                <Plus size={15} />
                <span>Create First Note</span>
              </button>
            ) : undefined
          }
        />
      ) : arrangementMode === "by_subject" ? (
        /* ── ARRANGED BY SUBJECT ─────────────────────────────────────────── */
        <div className="space-y-8">
          {groupedBySubject.map((group) => (
            <div
              key={group.subjectId || group.subjectName}
              className="bg-[#141414] border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-xl"
            >
              {/* Subject Group Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/8 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: group.subjectColor }}
                  />
                  <div>
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <span>{group.subjectName}</span>
                      {group.semesterOrTrack && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-ink-60 font-normal">
                          {group.semesterOrTrack}
                        </span>
                      )}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-ink-60">
                    {group.notes.length} note{group.notes.length === 1 ? "" : "s"}
                  </span>
                  <button
                    onClick={() => openNewNoteForSubject(group.subjectId)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white border border-white/10 transition-colors cursor-pointer"
                    title="Add note to this subject"
                  >
                    <Plus size={12} />
                    <span>Add Note</span>
                  </button>
                </div>
              </div>

              {/* Subject's Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {group.notes.map((note) => renderNoteCard(note))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      ) : arrangementMode === "by_category" ? (
        /* ── ARRANGED BY CATEGORY ────────────────────────────────────────── */
        <div className="space-y-8">
          {groupedByCategory.map(({ key, config, notes: catNotes }) => {
            if (catNotes.length === 0 && selectedCategory !== "all") return null;
            const Icon = config.icon;

            return (
              <div
                key={key}
                className="bg-[#141414] border border-white/[0.08] rounded-2xl p-5 md:p-6 shadow-xl"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/8 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.bg} ${config.color}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">{config.label}</h2>
                      <p className="text-[11px] text-ink-60">{config.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-ink-60">
                      {catNotes.length} item{catNotes.length === 1 ? "" : "s"}
                    </span>
                    <button
                      onClick={() => openNewNoteForSubject(undefined, key)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white border border-white/10 transition-colors cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {catNotes.length === 0 ? (
                  <p className="text-xs text-ink-60 py-4 text-center">
                    No notes under {config.label} yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence mode="popLayout">
                      {catNotes.map((note) => renderNoteCard(note))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* ── ALL NOTES (GRID) ────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredNotes.map((note) => renderNoteCard(note))}
          </AnimatePresence>
        </div>
      )}

      {/* ── CREATE / EDIT NOTE MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={editNoteModal}
        onClose={() => {
          setEditNoteModal(false);
          setActiveNote(null);
        }}
        title={activeNote?._id ? "Edit Note" : "Create New Cloud Note"}
        className="max-w-xl"
      >
        <div className="space-y-4">
          {/* Target Subject Selector */}
          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1.5">
              Subject / Course
            </label>
            <select
              value={activeNote?.subjectId || ""}
              onChange={(e) => setActiveNote((prev) => ({ ...prev, subjectId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
            >
              {subjects.map((s) => (
                <option key={s._id} value={s._id} className="bg-[#1C1C1E] text-white">
                  {s.name} ({s.semesterOrTrack || "Core"})
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1.5">
              Note Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["study_notes", "syllabus", "codes", "general"] as NoteCategory[]).map((catKey) => {
                const cfg = CATEGORY_CONFIG[catKey];
                const isCur = (activeNote?.category || "study_notes") === catKey;
                const Icon = cfg.icon;

                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveNote((prev) => ({ ...prev, category: catKey }))}
                    className={`p-2 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isCur
                        ? `${cfg.bg} ${cfg.border} text-white font-semibold ring-1 ring-[#0A84FF]`
                        : "bg-white/5 border-white/10 text-ink-60 hover:text-white"
                    }`}
                  >
                    <Icon size={14} className={isCur ? cfg.color : ""} />
                    <span className="text-[11px] truncate">{cfg.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs text-ink-60 mb-1.5 font-mono uppercase tracking-wider">
              Note Title
            </label>
            <input
              type="text"
              value={activeNote?.title || ""}
              onChange={(e) => {
                const title = e.target.value;
                // Auto-detect category suggestion
                let autoCat = activeNote?.category;
                if (!autoCat || autoCat === "study_notes") {
                  if (/\b(code|syntax|program|query|script|python|java|sql)\b/i.test(title)) {
                    autoCat = "codes";
                  } else if (/\b(syllabus|curriculum|module|units?)\b/i.test(title)) {
                    autoCat = "syllabus";
                  }
                }
                setActiveNote((prev) => ({ ...prev, title, category: autoCat || prev?.category }));
              }}
              placeholder="e.g. Unit 2 Normalization Proofs, SQL Joins Syntax, Python Script"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
            />
          </div>

          {/* Attached Document URL / Drive Link */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-ink-60 font-mono uppercase tracking-wider">
                Attached URL (Drive, PDF, GitHub, Notion)
              </label>
              <span className="text-[10px] font-mono text-[#0A84FF] flex items-center gap-1">
                <Sparkles size={10} />
                <span>On-Site Viewer Ready</span>
              </span>
            </div>
            <input
              type="url"
              value={activeNote?.linkUrl || ""}
              onChange={(e) => setActiveNote((prev) => ({ ...prev, linkUrl: e.target.value }))}
              placeholder="https://drive.google.com/file/d/... or https://github.com/..."
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF] font-mono"
            />
            {activeNote?.linkUrl && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <CheckCircle2 size={12} />
                <span>
                  {activeNote.linkUrl.includes("drive.google.com")
                    ? "⚡ Google Drive link detected: On-site reader active"
                    : activeNote.linkUrl.endsWith(".pdf")
                    ? "⚡ PDF document detected: Direct PDF reader active"
                    : "⚡ Web link attached"}
                </span>
              </div>
            )}
          </div>

          {/* Content Textarea */}
          <div>
            <label className="block text-xs text-ink-60 mb-1.5 font-mono uppercase tracking-wider">
              {activeNote?.category === "codes" ? "Code Snippet / Program Script" : "Note Content / Markdown"}
            </label>
            <textarea
              rows={activeNote?.category === "codes" ? 8 : 6}
              value={activeNote?.content || ""}
              onChange={(e) => setActiveNote((prev) => ({ ...prev, content: e.target.value }))}
              placeholder={
                activeNote?.category === "codes"
                  ? "// Paste your Python, C++, Java, or SQL code queries here..."
                  : "Write formulas, algorithmic complexity, key definitions, or exam reminders..."
              }
              className={`w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF] resize-y ${
                activeNote?.category === "codes" ? "font-mono text-emerald-300 bg-black/40" : ""
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setEditNoteModal(false);
                setActiveNote(null);
              }}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-ink-60 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveNote}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-[#0A84FF]/25"
            >
              <Save size={14} />
              <span>{saving ? "Saving to Cloud…" : "Save Note"}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* On-Site Document / PDF / Video Viewer Modal */}
      <InlineDocViewerModal
        isOpen={viewerModal.open}
        onClose={() => setViewerModal((prev) => ({ ...prev, open: false }))}
        title={viewerModal.title}
        url={viewerModal.url}
        type={viewerModal.type}
      />
    </div>
  );
}

import { ExternalLink, X, FileText, Youtube, Folder } from "lucide-react";
import type { ResourceType } from "../types";

interface InlineDocViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  type?: ResourceType;
}

export default function InlineDocViewerModal({
  isOpen,
  onClose,
  title,
  url,
  type = "drive",
}: InlineDocViewerModalProps) {
  if (!isOpen) return null;

  // Convert Google Drive view URLs to preview embed URLs
  const getEmbedUrl = (rawUrl: string): string => {
    if (!rawUrl) return "";

    // Google Drive file link: drive.google.com/file/d/FILE_ID/view -> .../preview
    const driveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    // Google Drive folder link: drive.google.com/drive/folders/FOLDER_ID
    const folderMatch = rawUrl.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
      return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
    }

    // YouTube watch or playlist link
    if (rawUrl.includes("youtube.com/watch?v=")) {
      const videoId = rawUrl.split("v=")[1]?.split("&")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (rawUrl.includes("youtu.be/")) {
      const videoId = rawUrl.split("youtu.be/")[1]?.split("?")[0];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (rawUrl.includes("youtube.com/playlist?list=")) {
      const listId = rawUrl.split("list=")[1]?.split("&")[0];
      if (listId) return `https://www.youtube.com/embed/videoseries?list=${listId}`;
    }

    return rawUrl;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[88vh] bg-[#141414] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-white/8 flex items-center justify-between bg-[#1C1C1E] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-3">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#0A84FF] shrink-0">
              {type === "youtube" || type === "playlist" ? (
                <Youtube size={15} />
              ) : type === "drive" ? (
                <Folder size={15} />
              ) : (
                <FileText size={15} />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
              <p className="text-[10px] text-ink-60 truncate">
                On-site document viewer &bull; {url}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Open externally button */}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-colors"
              title="Open in new window"
            >
              <ExternalLink size={12} />
              <span className="hidden sm:inline">Open in Drive/Web</span>
            </a>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Embedded Document Frame */}
        <div className="flex-1 w-full bg-[#0A0A0A] relative">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={title}
              className="w-full h-full border-none"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-ink-60">
              <FileText size={32} className="mb-2 opacity-50" />
              <p className="text-xs">Preview unavailable for this link format.</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold"
              >
                Open in new tab
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { formatDuration } from "./Photos";
import { useTheme } from "../theme/ThemeProvider";

const APP_WIDTH = 1120;
const APP_HEIGHT = 640;

// Sync hub interface — both mirrored <video> elements register here so that
// play/pause/seek/volume on one screen mirrors to the other in near real-time.
export type VideoSync = {
  register: (el: HTMLVideoElement) => void;
  unregister: (el: HTMLVideoElement) => void;
  broadcastTime: (origin: HTMLVideoElement, currentTime: number) => void;
  broadcastPlayback: (origin: HTMLVideoElement, paused: boolean) => void;
  broadcastVolume: (
    origin: HTMLVideoElement,
    volume: number,
    muted: boolean,
  ) => void;
  broadcastRate: (origin: HTMLVideoElement, playbackRate: number) => void;
};

export type MediaKind = "photo" | "video";

export type MediaFile = {
  id: string;
  kind: MediaKind;
  name: string;
  sizeBytes: number;
  createdAt: number;
  // Set only for videos.
  durationMs?: number;
};

export type FilesProps = {
  files: MediaFile[];
  openedFile?: MediaFile | null;
  hasPrev?: boolean;
  hasNext?: boolean;
  onOpen?: (file: MediaFile) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onClose?: () => void;
  videoSync?: VideoSync;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

// Demo viewer assets — every photo opens the same image, every video opens
// the same clip. Hardcoded so the viewer works without uploading real media.
const PHOTO_VIEWER_SRC = "/images/pallo-logo.png";
const VIDEO_VIEWER_SRC =
  "/videos/vlipsy-rick-astley-rick-rolled-hElgqOJl.mp4";

export function viewerSrcFor(file: MediaFile): string {
  return file.kind === "video" ? VIDEO_VIEWER_SRC : PHOTO_VIEWER_SRC;
}

export default function Files({
  files,
  openedFile = null,
  hasPrev = false,
  hasNext = false,
  onOpen,
  onPrev,
  onNext,
  onClose,
  videoSync,
}: FilesProps) {
  const {
    palette: { c },
  } = useTheme();
  // Newest first so the latest capture lands top-left where the eye looks.
  const sorted = [...files].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div
      style={{
        width: `${APP_WIDTH}px`,
        minWidth: `${APP_WIDTH}px`,
        flexShrink: 0,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        color: c("white"),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "0 6px 14px",
          fontSize: "18px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c("white", 0.78),
        }}
      >
        <span>Files</span>
        <span
          style={{
            fontSize: "14px",
            letterSpacing: "0.04em",
            color: c("white", 0.55),
            textTransform: "none",
          }}
        >
          {sorted.length} {sorted.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div
        style={{
          position: "relative",
          width: `${APP_WIDTH}px`,
          height: `${APP_HEIGHT}px`,
          borderRadius: "28px",
          overflow: "hidden",
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c("white", 0.04)}, 0 18px 48px ${c("black", 0.55)}`,
        }}
      >
        {sorted.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              height: "100%",
              overflowY: "auto",
              padding: "28px 32px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "20px",
              }}
            >
              {sorted.map((file) => (
                <FileCell key={file.id} file={file} onOpen={onOpen} />
              ))}
            </div>
          </div>
        )}

        {openedFile && (
          <Viewer
            file={openedFile}
            onClose={onClose}
            onPrev={onPrev}
            onNext={onNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            videoSync={videoSync}
          />
        )}
      </div>
    </div>
  );
}

function FileCell({
  file,
  onOpen,
}: {
  file: MediaFile;
  onOpen?: (file: MediaFile) => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  const isVideo = file.kind === "video";
  return (
    <div
      onClick={() => onOpen?.(file)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.(file);
        }
      }}
      style={{ cursor: "pointer", outline: "none" }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "130px",
          borderRadius: "14px",
          overflow: "hidden",
          background: isVideo
            ? `linear-gradient(150deg, ${c("videoStart")} 0%, ${c("videoEnd")} 100%)`
            : `linear-gradient(150deg, ${c("photoStart")} 0%, ${c("photoEnd")} 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: c("white", 0.92),
          transition: "transform 140ms ease, box-shadow 140ms ease",
        }}
      >
        {isVideo ? <VideoGlyph /> : <PhotoGlyph />}
        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            padding: "3px 8px",
            borderRadius: "999px",
            background: c("black", 0.55),
            fontSize: "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: c("white", 0.85),
          }}
        >
          {isVideo ? "MP4" : "HEIC"}
        </span>
      </div>
      <div
        style={{
          marginTop: "10px",
          fontSize: "13px",
          color: c("white"),
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
        title={file.name}
      >
        {file.name}
      </div>
      <div
        style={{
          marginTop: "2px",
          fontSize: "11px",
          color: c("white", 0.55),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {formatBytes(file.sizeBytes)}
        {isVideo && file.durationMs != null
          ? ` · ${formatDuration(file.durationMs)}`
          : ""}
      </div>
    </div>
  );
}

function Viewer({
  file,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  videoSync,
}: {
  file: MediaFile;
  onClose?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  videoSync?: VideoSync;
}) {
  const {
    palette: { c },
  } = useTheme();
  const isVideo = file.kind === "video";
  const src = viewerSrcFor(file);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Register/unregister this video with the sync hub so peers can mirror it.
  useEffect(() => {
    if (!isVideo || !videoSync) return;
    const el = videoRef.current;
    if (!el) return;
    videoSync.register(el);
    return () => videoSync.unregister(el);
  }, [isVideo, videoSync, file.id]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: c("black", 0.94),
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 22px",
          borderBottom: `1px solid ${c("white", 0.08)}`,
          color: c("white", 0.85),
          fontSize: "14px",
          letterSpacing: "0.04em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <span style={{ fontSize: "16px" }}>{file.name}</span>
          <span style={{ fontSize: "12px", color: c("white", 0.5) }}>
            {formatBytes(file.sizeBytes)}
            {isVideo && file.durationMs != null
              ? ` · ${formatDuration(file.durationMs)}`
              : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            borderRadius: "999px",
            border: `1px solid ${c("white", 0.18)}`,
            background: c("white", 0.06),
            color: c("white"),
            fontSize: "16px",
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>
      <div
        style={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
          background: c("black"),
        }}
      >
        <NavButton
          direction="prev"
          enabled={hasPrev}
          onClick={() => onPrev?.()}
        />
        <NavButton
          direction="next"
          enabled={hasNext}
          onClick={() => onNext?.()}
        />
        {isVideo ? (
          <video
            // Re-mount when the opened file changes so the new clip plays
            // from the start instead of resuming the previous one.
            key={file.id}
            ref={videoRef}
            src={src}
            controls
            autoPlay
            playsInline
            onPlay={(e) =>
              videoSync?.broadcastPlayback(e.currentTarget, false)
            }
            onPause={(e) =>
              videoSync?.broadcastPlayback(e.currentTarget, true)
            }
            onSeeked={(e) =>
              videoSync?.broadcastTime(
                e.currentTarget,
                e.currentTarget.currentTime,
              )
            }
            // timeupdate fires ~4×/s while playing — used to gently nudge
            // peers back into sync if drift exceeds the tolerance.
            onTimeUpdate={(e) =>
              videoSync?.broadcastTime(
                e.currentTarget,
                e.currentTarget.currentTime,
              )
            }
            onVolumeChange={(e) =>
              videoSync?.broadcastVolume(
                e.currentTarget,
                e.currentTarget.volume,
                e.currentTarget.muted,
              )
            }
            onRateChange={(e) =>
              videoSync?.broadcastRate(
                e.currentTarget,
                e.currentTarget.playbackRate,
              )
            }
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              borderRadius: "10px",
              background: c("black"),
            }}
          />
        ) : (
          // Plain <img> instead of next/image so we don't need to configure
          // sizes / domains for this demo asset.
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={file.id}
            src={src}
            alt={file.name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        )}
      </div>
    </div>
  );
}

function NavButton({
  direction,
  enabled,
  onClick,
}: {
  direction: "prev" | "next";
  enabled: boolean;
  onClick: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  const isPrev = direction === "prev";
  const idleBg = c("black", 0.55);
  const hoverBg = c("black", 0.75);
  return (
    <button
      type="button"
      onClick={enabled ? onClick : undefined}
      disabled={!enabled}
      aria-label={isPrev ? "Previous file" : "Next file"}
      style={{
        position: "absolute",
        top: "50%",
        [isPrev ? "left" : "right"]: "20px",
        transform: "translateY(-50%)",
        width: "56px",
        height: "56px",
        borderRadius: "999px",
        border: `1px solid ${c("white", 0.18)}`,
        background: idleBg,
        color: c("white"),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: enabled ? "pointer" : "default",
        // Soften disabled-state without hiding entirely so the user can see
        // they're at one end of the gallery.
        opacity: enabled ? 1 : 0.25,
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        transition: "opacity 140ms ease, background 140ms ease",
        zIndex: 11,
      }}
      onMouseEnter={(e) => {
        if (enabled) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = idleBg;
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d={isPrev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function EmptyState() {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
        color: c("white", 0.7),
      }}
    >
      <div style={{ fontSize: "56px", lineHeight: 1 }} aria-hidden>
        📁
      </div>
      <div style={{ fontSize: "20px", fontWeight: 600 }}>No files yet</div>
      <div style={{ fontSize: "14px", color: c("white", 0.5) }}>
        Take a photo or record a video to see it here.
      </div>
    </div>
  );
}

// Minimal SVG glyphs for the placeholder thumbnails so the look is consistent
// across operating systems instead of relying on emoji rendering.
function PhotoGlyph() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ opacity: 0.85 }}
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8.5" cy="10" r="1.4" fill="currentColor" />
      <path
        d="M21 17l-5-5-4 4-2-2-7 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function VideoGlyph() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ opacity: 0.9 }}
    >
      <rect
        x="3"
        y="6"
        width="13"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M16 10l5-3v10l-5-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.25"
      />
    </svg>
  );
}

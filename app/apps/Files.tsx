"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration } from "./Photos";
import { useTheme } from "../theme/ThemeProvider";

const APP_WIDTH = 1120;
const APP_HEIGHT = 640;

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
  durationMs?: number;
  url?: string;
  mimeType?: string;
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

type FilesApiResponse = {
  files: MediaFile[];
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  return `${(mb / 1024).toFixed(2)} GB`;
}

export function viewerSrcFor(file: MediaFile): string {
  return file.url ?? "";
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

  const [folderFiles, setFolderFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFolderFiles = async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const response = await fetch("/api/files", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load files");
      }

      const data = (await response.json()) as FilesApiResponse;
      setFolderFiles(data.files ?? []);
    } catch (error) {
      console.error(error);
      setLoadError("Could not load public/files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFolderFiles();
  }, []);

  const mergedFiles = useMemo(() => {
    const byId = new Map<string, MediaFile>();

    for (const file of folderFiles) {
      byId.set(file.id, file);
    }

    for (const file of files) {
      byId.set(file.id, file);
    }

    return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [folderFiles, files]);

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "14px",
            letterSpacing: "0.04em",
            color: c("white", 0.55),
            textTransform: "none",
          }}
        >
          <button
            type="button"
            onClick={loadFolderFiles}
            style={{
              border: `1px solid ${c("white", 0.16)}`,
              background: c("white", 0.06),
              color: c("white", 0.8),
              borderRadius: "999px",
              padding: "5px 10px",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>

          <span>
            {mergedFiles.length} {mergedFiles.length === 1 ? "item" : "items"}
          </span>
        </div>
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
          boxShadow: `inset 0 0 0 1px ${c(
            "white",
            0.04,
          )}, 0 18px 48px ${c("black", 0.55)}`,
        }}
      >
        {loading ? (
          <StatusState title="Loading files…" subtitle="Reading public/files" />
        ) : loadError ? (
          <StatusState title="Could not load files" subtitle={loadError} />
        ) : mergedFiles.length === 0 ? (
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
              {mergedFiles.map((file) => (
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
  const src = viewerSrcFor(file);

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
          background: c("white", 0.06),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: c("white", 0.92),
          transition: "transform 140ms ease, box-shadow 140ms ease",
        }}
      >
        {src ? (
          isVideo ? (
            <VideoThumbnail src={src} name={file.name} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={file.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          )
        ) : isVideo ? (
          <VideoGlyph />
        ) : (
          <PhotoGlyph />
        )}

        {isVideo && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(180deg, ${c(
                "black",
                0.08,
              )}, ${c("black", 0.38)})`,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "999px",
                background: c("black", 0.55),
                border: `1px solid ${c("white", 0.22)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: c("white", 0.9),
                fontSize: "18px",
                lineHeight: 1,
                paddingLeft: "2px",
              }}
            >
              ▶
            </div>
          </div>
        )}

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
          {extensionLabel(file)}
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

function VideoThumbnail({ src, name }: { src: string; name: string }) {
  const {
    palette: { c },
  } = useTheme();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      {!ready && !failed && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: c("white", 0.06),
            color: c("white", 0.55),
            fontSize: "12px",
            letterSpacing: "0.04em",
          }}
        >
          Loading preview…
        </div>
      )}

      {failed && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: c("white", 0.06),
            color: c("white", 0.65),
          }}
        >
          <VideoGlyph />
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        aria-label={name}
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => {
          const video = e.currentTarget;

          try {
            const targetTime = Number.isFinite(video.duration)
              ? Math.min(0.1, Math.max(video.duration - 0.01, 0))
              : 0.1;

            video.currentTime = targetTime;
          } catch {
            setReady(true);
          }
        }}
        onSeeked={() => {
          setReady(true);
          videoRef.current?.pause();
        }}
        onLoadedData={() => {
          setReady(true);
          videoRef.current?.pause();
        }}
        onCanPlay={() => {
          setReady(true);
          videoRef.current?.pause();
        }}
        onError={() => {
          setFailed(true);
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: failed ? "none" : "block",
          opacity: ready ? 1 : 0,
          background: c("black"),
        }}
      />
    </>
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
          // eslint-disable-next-line @next/next/no-img-element
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

function StatusState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
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
      <div style={{ fontSize: "20px", fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: "14px", color: c("white", 0.5) }}>
        {subtitle}
      </div>
    </div>
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
        Add photos or videos to public/files.
      </div>
    </div>
  );
}

function extensionLabel(file: MediaFile): string {
  const ext = file.name.split(".").pop();

  if (!ext) return file.kind === "video" ? "VIDEO" : "IMAGE";

  return ext.toUpperCase();
}

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
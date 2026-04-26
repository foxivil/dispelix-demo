"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import { useTheme } from "../theme/ThemeProvider";
import { formatDuration } from "./Photos";

const APP_WIDTH = 520;
const COVER_SIZE = 160;
const PLAYLIST_SRC = "/music/playlist.json";
const SEEK_STEP_S = 10;

type PlaylistTrack = {
  title: string;
  artist: string;
  album: string;
  src: string;
  cover: string;
};

type TrackChangeEventDetail = {
  index: number;
};

const MUSIC_TRACK_CHANGE_EVENT = "ar-music-track-change";
const MUSIC_STOP_EVENT = "ar-music-stop";

export type MusicSync = {
  register: (el: HTMLAudioElement) => void;
  unregister: (el: HTMLAudioElement) => void;
  broadcastTime: (origin: HTMLAudioElement, currentTime: number) => void;
  broadcastPlayback: (origin: HTMLAudioElement, paused: boolean) => void;
  broadcastVolume: (
    origin: HTMLAudioElement,
    volume: number,
    muted: boolean,
  ) => void;
};

export type MusicProps = {
  musicSync?: MusicSync;
  scrubTime?: number | null;
  onScrubTimeChange?: (next: number | null) => void;
};

const FALLBACK_TRACKS: PlaylistTrack[] = [
  {
    title: "A Cruel Angel's Thesis",
    artist: "Yoko Takahashi",
    album: "Neon Genesis Evangelion · Opening Theme",
    src: "/music/locomotion-soundtrack_cruel-angel-s-thesis-neon-genesis-evangelion-op.mp3",
    cover: "/music_image/cover.jpg",
  },
];

export default function Music({
  musicSync,
  scrubTime = null,
  onScrubTimeChange,
}: MusicProps) {
  const {
    palette: { c },
  } = useTheme();

  const audioRef = useRef<HTMLAudioElement>(null);
  const pendingAutoPlayRef = useRef(false);

  const [tracks, setTracks] = useState<PlaylistTrack[]>(FALLBACK_TRACKS);
  const [trackIndex, setTrackIndex] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const currentTrack = tracks[trackIndex] ?? tracks[0];
  const hasMultipleTracks = tracks.length > 1;

  useEffect(() => {
    let cancelled = false;

    const loadPlaylist = async () => {
      try {
        const response = await fetch(PLAYLIST_SRC, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load playlist");
        }

        const data = (await response.json()) as PlaylistTrack[];

        const validTracks = data.filter(
          (track) => track.src && track.title && track.cover,
        );

        if (!cancelled && validTracks.length > 0) {
          setTracks(validTracks);
          setTrackIndex((index) => clamp(index, 0, validTracks.length - 1));
        }
      } catch (error) {
        console.error("Could not load playlist", error);
      }
    };

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onTrackChange = (event: Event) => {
      const customEvent = event as CustomEvent<TrackChangeEventDetail>;
      const nextIndex = customEvent.detail?.index;

      if (typeof nextIndex !== "number") return;

      setTrackIndex((current) => {
        const clamped = clamp(nextIndex, 0, tracks.length - 1);
        return current === clamped ? current : clamped;
      });
    };

    window.addEventListener(MUSIC_TRACK_CHANGE_EVENT, onTrackChange);

    return () =>
      window.removeEventListener(MUSIC_TRACK_CHANGE_EVENT, onTrackChange);
  }, [tracks.length]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !musicSync) return;

    musicSync.register(el);

    return () => musicSync.unregister(el);
  }, [musicSync]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    el.volume = volume;
    el.muted = muted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const stopMusic = () => {
      const el = audioRef.current;
      if (!el) return;

      el.pause();
      el.currentTime = 0;

      pendingAutoPlayRef.current = false;

      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      onScrubTimeChange?.(null);

      musicSync?.broadcastTime(el, 0);
    };

    window.addEventListener(MUSIC_STOP_EVENT, stopMusic);

    return () => window.removeEventListener(MUSIC_STOP_EVENT, stopMusic);
  }, [musicSync, onScrubTimeChange]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    pendingAutoPlayRef.current = false;

    el.pause();
    el.currentTime = 0;
    el.load();

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onScrubTimeChange?.(null);
  }, [trackIndex, onScrubTimeChange]);

  const broadcastTrackIndex = (nextIndex: number) => {
    const clamped = wrapIndex(nextIndex, tracks.length);

    window.dispatchEvent(
      new CustomEvent<TrackChangeEventDetail>(MUSIC_TRACK_CHANGE_EVENT, {
        detail: { index: clamped },
      }),
    );
  };

  const goToTrack = (nextIndex: number) => {
    if (tracks.length === 0) return;

    const el = audioRef.current;

    if (el) {
      el.pause();
      el.currentTime = 0;
    }

    pendingAutoPlayRef.current = false;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    onScrubTimeChange?.(null);

    broadcastTrackIndex(nextIndex);
  };

  const goToPrevTrack = () => {
    goToTrack(trackIndex - 1);
  };

  const goToNextTrack = () => {
    goToTrack(trackIndex + 1);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;

    if (el.paused) {
      el.play().catch(() => {
        /* ignore autoplay restrictions; user can retry */
      });
    } else {
      el.pause();
    }
  };

  const seekBy = (deltaSeconds: number) => {
    const el = audioRef.current;
    if (!el) return;

    const next = clamp(el.currentTime + deltaSeconds, 0, el.duration || 0);
    el.currentTime = next;
    musicSync?.broadcastTime(el, next);
  };

  const seekTo = (seconds: number) => {
    const el = audioRef.current;
    if (!el) return;

    el.currentTime = seconds;
    musicSync?.broadcastTime(el, seconds);
  };

  const setVolumeAndPush = (next: number) => {
    const el = audioRef.current;

    setVolume(next);

    if (next > 0 && muted) {
      setMuted(false);
      if (el) el.muted = false;
    }

    if (el) {
      el.volume = next;
      musicSync?.broadcastVolume(el, next, el.muted);
    }
  };

  const toggleMuted = () => {
    const el = audioRef.current;
    const next = !muted;

    setMuted(next);

    if (el) {
      el.muted = next;
      musicSync?.broadcastVolume(el, el.volume, next);
    }
  };

  const displayTime = scrubTime ?? currentTime;
  const progress = duration > 0 ? displayTime / duration : 0;

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
      <audio
        ref={audioRef}
        src={currentTrack.src}
        preload="metadata"
        onPlay={() => {
          pendingAutoPlayRef.current = true;
          setIsPlaying(true);
        }}
        onPause={() => {
          pendingAutoPlayRef.current = false;
          setIsPlaying(false);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setCurrentTime(el.currentTime);
          musicSync?.broadcastTime(el, el.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration)) setDuration(el.duration);
        }}
        onDurationChange={(e) => {
          const el = e.currentTarget;
          if (Number.isFinite(el.duration)) setDuration(el.duration);
        }}
        onVolumeChange={(e) => {
          const el = e.currentTarget;
          setVolume(el.volume);
          setMuted(el.muted);
          musicSync?.broadcastVolume(el, el.volume, el.muted);
        }}
        onEnded={() => {
          const el = audioRef.current;

          if (el) {
            el.pause();
            el.currentTime = 0;
          }

          setIsPlaying(false);
          setCurrentTime(0);
          pendingAutoPlayRef.current = false;

          if (hasMultipleTracks) {
            broadcastTrackIndex(trackIndex + 1);
          }
        }}
      />

      <div
        style={{
          width: `${APP_WIDTH}px`,
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c(
            "white",
            0.04,
          )}, 0 18px 48px ${c("black", 0.55)}`,
          borderRadius: "20px",
          padding: "20px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "18px",
            alignItems: "stretch",
          }}
        >
          <Cover src={currentTrack.cover} title={currentTrack.title} />

          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "14px",
            }}
          >
            <TrackInfo
              track={currentTrack}
              index={trackIndex}
              total={tracks.length}
            />

            <TrackNav
              disabled={!hasMultipleTracks}
              onPrev={goToPrevTrack}
              onNext={goToNextTrack}
            />
          </div>
        </div>

        <Scrubber
          progress={progress}
          duration={duration}
          displayTime={displayTime}
          onScrubStart={(t) => onScrubTimeChange?.(t)}
          onScrubMove={(t) => onScrubTimeChange?.(t)}
          onScrubEnd={(t) => {
            seekTo(t);
            onScrubTimeChange?.(null);
          }}
        />

        <Controls
          isPlaying={isPlaying}
          onPlayPause={togglePlay}
          onSeekBack={() => seekBy(-SEEK_STEP_S)}
          onSeekForward={() => seekBy(SEEK_STEP_S)}
        />

        <VolumeRow
          volume={volume}
          muted={muted}
          onVolumeChange={setVolumeAndPush}
          onToggleMuted={toggleMuted}
        />
      </div>
    </div>
  );
}

function Cover({ src, title }: { src: string; title: string }) {
  const {
    palette: { c },
  } = useTheme();

  return (
    <div
      style={{
        position: "relative",
        width: `${COVER_SIZE}px`,
        height: `${COVER_SIZE}px`,
        flexShrink: 0,
        borderRadius: "14px",
        overflow: "hidden",
        background: c("panelDark"),
        boxShadow: `0 16px 36px ${c("black", 0.55)}`,
      }}
    >
      <Image
        src={src}
        alt={`${title} cover`}
        fill
        sizes={`${COVER_SIZE}px`}
        priority
        style={{ objectFit: "cover" }}
      />

      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          boxShadow: `inset 0 0 0 1px ${c("white", 0.08)}`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function TrackInfo({
  track,
  index,
  total,
}: {
  track: PlaylistTrack;
  index: number;
  total: number;
}) {
  const {
    palette: { c },
  } = useTheme();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div
        style={{
          fontSize: "20px",
          fontWeight: 600,
          letterSpacing: "0.01em",
          color: c("white"),
          lineHeight: 1.2,
        }}
      >
        {track.title}
      </div>

      <div
        style={{
          fontSize: "13px",
          color: c("white", 0.65),
          letterSpacing: "0.02em",
        }}
      >
        {track.artist}
      </div>

      <div
        style={{
          fontSize: "11px",
          color: c("white", 0.4),
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {track.album}
      </div>

      <div
        style={{
          marginTop: "4px",
          fontSize: "11px",
          color: c("white", 0.38),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {index + 1} / {total}
      </div>
    </div>
  );
}

function TrackNav({
  disabled,
  onPrev,
  onNext,
}: {
  disabled: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <SmallButton disabled={disabled} onClick={onPrev} label="Previous track">
        Previous
      </SmallButton>

      <SmallButton disabled={disabled} onClick={onNext} label="Next track">
        Next
      </SmallButton>
    </div>
  );
}

function SmallButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const {
    palette: { c },
  } = useTheme();

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1,
        height: "32px",
        borderRadius: "999px",
        border: `1px solid ${c("white", disabled ? 0.08 : 0.16)}`,
        background: c("white", disabled ? 0.025 : 0.06),
        color: c("white", disabled ? 0.28 : 0.8),
        fontFamily: "inherit",
        fontSize: "12px",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function Scrubber({
  progress,
  duration,
  displayTime,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
}: {
  progress: number;
  duration: number;
  displayTime: number;
  onScrubStart: (seconds: number) => void;
  onScrubMove: (seconds: number) => void;
  onScrubEnd: (seconds: number) => void;
}) {
  const {
    palette: { c },
  } = useTheme();

  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number } | null>(null);

  const seekFromEvent = (clientX: number): number => {
    const el = trackRef.current;
    if (!el || duration <= 0) return 0;

    const rect = el.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId };

    const t = seekFromEvent(e.clientX);
    onScrubStart(t);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    onScrubMove(seekFromEvent(e.clientX));
  };

  const finishScrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

    e.currentTarget.releasePointerCapture(e.pointerId);

    const t = seekFromEvent(e.clientX);
    dragRef.current = null;
    onScrubEnd(t);
  };

  const filledPct = `${Math.max(0, Math.min(1, progress)) * 100}%`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.floor(duration))}
        aria-valuenow={Math.floor(displayTime)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishScrub}
        onPointerCancel={finishScrub}
        style={{
          position: "relative",
          height: "18px",
          display: "flex",
          alignItems: "center",
          cursor: duration > 0 ? "pointer" : "default",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: "4px",
            borderRadius: "999px",
            background: c("white", 0.12),
          }}
        />

        <div
          style={{
            position: "absolute",
            left: 0,
            width: filledPct,
            height: "4px",
            borderRadius: "999px",
            background: c("white", 0.85),
          }}
        />

        <div
          aria-hidden
          style={{
            position: "absolute",
            left: filledPct,
            transform: "translate(-50%, 0)",
            width: "12px",
            height: "12px",
            borderRadius: "999px",
            background: c("white"),
            boxShadow: `0 0 0 4px ${c("white", 0.12)}`,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: c("white", 0.55),
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{formatDuration(displayTime * 1000)}</span>
        <span>{duration > 0 ? formatDuration(duration * 1000) : "—:—"}</span>
      </div>
    </div>
  );
}

function Controls({
  isPlaying,
  onPlayPause,
  onSeekBack,
  onSeekForward,
}: {
  isPlaying: boolean;
  onPlayPause: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
      }}
    >
      <SkipButton direction="back" onClick={onSeekBack} />

      <PlayPauseButton playing={isPlaying} onClick={onPlayPause} />

      <SkipButton direction="forward" onClick={onSeekForward} />
    </div>
  );
}

function PlayPauseButton({
  playing,
  onClick,
}: {
  playing: boolean;
  onClick: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();

  return (
    <button
      type="button"
      aria-label={playing ? "Pause" : "Play"}
      onClick={onClick}
      style={{
        width: "64px",
        height: "64px",
        borderRadius: "999px",
        border: "none",
        background: c("white"),
        color: c("black"),
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 12px 28px ${c("black", 0.45)}`,
        transition: "transform 120ms ease, background 140ms ease",
      }}
    >
      {playing ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="5" width="4" height="14" rx="1.5" />
          <rect x="14" y="5" width="4" height="14" rx="1.5" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v13.72a1 1 0 0 0 1.55.83l11-6.86a1 1 0 0 0 0-1.66l-11-6.86A1 1 0 0 0 8 5.14Z" />
        </svg>
      )}
    </button>
  );
}

function SkipButton({
  direction,
  onClick,
}: {
  direction: "back" | "forward";
  onClick: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();

  const icon =
    direction === "back" ? (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11 12 21 6.4v11.2L11 12Zm-9 0L12 6.4v11.2L2 12Z" />
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 12 3 6.4v11.2L13 12Zm9 0L12 6.4v11.2L22 12Z" />
      </svg>
    );

  const label = direction === "back" ? "Back 10 seconds" : "Forward 10 seconds";

  return (
    <button
      type="button"
      aria-label={label}
      title={`${direction === "back" ? "−" : "+"}${SEEK_STEP_S}s`}
      onClick={onClick}
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "999px",
        border: `1px solid ${c("white", 0.18)}`,
        background: c("white", 0.06),
        color: c("white"),
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 140ms ease, border-color 140ms ease",
      }}
    >
      {icon}
    </button>
  );
}

function VolumeRow({
  volume,
  muted,
  onVolumeChange,
  onToggleMuted,
}: {
  volume: number;
  muted: boolean;
  onVolumeChange: (next: number) => void;
  onToggleMuted: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();

  const effective = muted ? 0 : volume;
  const icon = muted || volume === 0 ? "🔇" : volume < 0.5 ? "🔈" : "🔊";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={onToggleMuted}
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "999px",
          border: "none",
          background: "transparent",
          color: c("white", 0.85),
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          padding: 0,
          fontFamily: "inherit",
        }}
      >
        <span aria-hidden>{icon}</span>
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
        aria-label="Volume"
        style={
          {
            flex: 1,
            accentColor: c("white"),
            cursor: "pointer",
          } satisfies CSSProperties
        }
      />

      <span
        style={{
          fontSize: "11px",
          color: c("white", 0.5),
          width: "32px",
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {Math.round(effective * 100)}
      </span>
    </div>
  );
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
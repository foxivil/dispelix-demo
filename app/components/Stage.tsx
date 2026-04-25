"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { renderApp, type AppContext, type AppId } from "../apps/registry";
import {
  type ChatMessage,
  type ChatSync,
  type MessengerProps,
} from "../apps/Messenger";
import {
  formatDuration,
  type PhotosProps,
  type PhotosToast,
} from "../apps/Photos";
import {
  type FilesProps,
  type MediaFile,
  type VideoSync,
} from "../apps/Files";
import { type MusicProps, type MusicSync } from "../apps/Music";
import { type SearchProps } from "../apps/Search";
import { HOME_CARD_COUNT, type HomeProps } from "../apps/Home";
import { generateBotReply } from "../apps/botReplies";
import Block, {
  defaultCalibrationPos,
  type BlockHandle,
  type Position,
} from "./Block";
import CalibrationMarker from "./CalibrationMarker";
import Dock from "./Dock";
import { ScreenScope, useTheme } from "../theme/ThemeProvider";

const COLUMN_WIDTH = 1280;
const COLUMN_HEIGHT = 720;
const CENTER_X = COLUMN_WIDTH / 2;
const CENTER_Y = COLUMN_HEIGHT / 2;

const DEFAULT_APP: AppId = "messages";

const PHOTOS_DBLCLICK_MS = 280;
const PHOTOS_TOAST_MS = 2000;
const PHOTO_SIZE_BYTES = 2_400_000;
const VIDEO_BYTES_PER_SECOND = 1_000_000;

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResult>;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  onstart: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

export default function Stage() {
  const {
    palette: { c },
  } = useTheme();

  const [calibrating, setCalibrating] = useState(false);
  const [dockActive, setDockActive] = useState(false);
  const [activeApp, setActiveApp] = useState<AppId>(DEFAULT_APP);

  const [screenPos, setScreenPos] = useState<Position>(() =>
    defaultCalibrationPos(COLUMN_WIDTH, COLUMN_HEIGHT),
  );

  const calibrationDiffX = screenPos.x - CENTER_X;
  const calibrationDiffY = screenPos.y - CENTER_Y;

  const leftOffsetX = calibrationDiffX / 2;
  const leftOffsetY = calibrationDiffY / 2;

  const rightOffsetX = -calibrationDiffX / 2;
  const rightOffsetY = -calibrationDiffY / 2;

  const leftDisplayPos: Position = {
    x: CENTER_X + leftOffsetX,
    y: CENTER_Y + leftOffsetY,
  };

  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  const [photosRecording, setPhotosRecording] = useState(false);
  const [photosRecordingMs, setPhotosRecordingMs] = useState(0);
  const [photosToast, setPhotosToast] = useState<PhotosToast | null>(null);
  const photosRecordingStartRef = useRef<number | null>(null);
  const photosRecordingRef = useRef(false);
  photosRecordingRef.current = photosRecording;
  const photosToastIdRef = useRef(0);
  const photosToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosLastClickAt = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [musicScrubTime, setMusicScrubTime] = useState<number | null>(null);
  const [homeCardIndex, setHomeCardIndex] = useState(0);

  const [files, setFiles] = useState<MediaFile[]>([]);
  const [openedFile, setOpenedFile] = useState<MediaFile | null>(null);
  const photoCounterRef = useRef(0);
  const videoCounterRef = useRef(0);
  const fileIdRef = useRef(0);

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => b.createdAt - a.createdAt),
    [files],
  );

  const blockRef = useRef<BlockHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const voiceCancelledRef = useRef(false);
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const messageIdRef = useRef(0);
  const botReplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newMessageId = () => `msg-${++messageIdRef.current}`;

  const chatScrollers = useRef<Set<HTMLDivElement>>(new Set());
  const chatSync = useMemo<ChatSync>(
    () => ({
      register: (el) => {
        chatScrollers.current.add(el);
      },
      unregister: (el) => {
        chatScrollers.current.delete(el);
      },
      broadcast: (origin, scrollTop) => {
        chatScrollers.current.forEach((el) => {
          if (el !== origin && el.scrollTop !== scrollTop) {
            el.scrollTop = scrollTop;
          }
        });
      },
    }),
    [],
  );

  const videoTargets = useRef<Set<HTMLVideoElement>>(new Set());
  const videoSync = useMemo<VideoSync>(
    () => ({
      register: (el) => {
        videoTargets.current.add(el);
      },
      unregister: (el) => {
        videoTargets.current.delete(el);
      },
      broadcastTime: (origin, currentTime) => {
        videoTargets.current.forEach((el) => {
          if (el === origin) return;
          if (Math.abs(el.currentTime - currentTime) > 0.3) {
            el.currentTime = currentTime;
          }
        });
      },
      broadcastPlayback: (origin, paused) => {
        videoTargets.current.forEach((el) => {
          if (el === origin) return;
          if (el.paused !== paused) {
            if (paused) {
              el.pause();
            } else {
              el.play().catch(() => {
                /* ignore */
              });
            }
          }
        });
      },
      broadcastVolume: (origin, volume, muted) => {
        videoTargets.current.forEach((el) => {
          if (el === origin) return;
          if (Math.abs(el.volume - volume) > 0.01) el.volume = volume;
          if (el.muted !== muted) el.muted = muted;
        });
      },
      broadcastRate: (origin, playbackRate) => {
        videoTargets.current.forEach((el) => {
          if (el === origin) return;
          if (el.playbackRate !== playbackRate) {
            el.playbackRate = playbackRate;
          }
        });
      },
    }),
    [],
  );

  const musicTargets = useRef<Set<HTMLAudioElement>>(new Set());
  const musicSync = useMemo<MusicSync>(
    () => ({
      register: (el) => {
        musicTargets.current.add(el);
      },
      unregister: (el) => {
        musicTargets.current.delete(el);
      },
      broadcastTime: (origin, currentTime) => {
        musicTargets.current.forEach((el) => {
          if (el === origin) return;
          if (Math.abs(el.currentTime - currentTime) > 0.3) {
            el.currentTime = currentTime;
          }
        });
      },
      broadcastPlayback: (origin, paused) => {
        musicTargets.current.forEach((el) => {
          if (el === origin) return;
          if (el.paused !== paused) {
            if (paused) {
              el.pause();
            } else {
              el.play().catch(() => {
                /* ignore */
              });
            }
          }
        });
      },
      broadcastVolume: (origin, volume, muted) => {
        musicTargets.current.forEach((el) => {
          if (el === origin) return;
          if (Math.abs(el.volume - volume) > 0.01) el.volume = volume;
          if (el.muted !== muted) el.muted = muted;
        });
      },
    }),
    [],
  );

  const voiceBaseRef = useRef("");
  const voiceTargetRef = useRef("");
  const voiceTypedRef = useRef(0);
  const typeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const TYPE_INTERVAL_MS = 28;

  const renderVoice = () => {
    const base = voiceBaseRef.current;
    const target = voiceTargetRef.current;
    const n = Math.min(voiceTypedRef.current, target.length);
    const visible = target.slice(0, n);
    const sep = visible && base && !base.endsWith(" ") ? " " : "";
    const next = base + sep + visible;

    if (next !== inputValueRef.current) {
      inputValueRef.current = next;
      setInputValue(next);
    }
  };

  const stopTyping = () => {
    if (typeTimerRef.current) {
      clearInterval(typeTimerRef.current);
      typeTimerRef.current = null;
    }
  };

  const startTyping = () => {
    if (typeTimerRef.current) return;

    typeTimerRef.current = setInterval(() => {
      if (voiceTypedRef.current < voiceTargetRef.current.length) {
        voiceTypedRef.current += 1;
        renderVoice();
      }
    }, TYPE_INTERVAL_MS);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };

    const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      if (voiceCancelledRef.current) return;

      let combined = "";
      for (let i = 0; i < e.results.length; i++) {
        combined += e.results[i][0].transcript;
      }

      voiceTargetRef.current = combined.replace(/^\s+/, "");
    };

    rec.onend = () => {
      if (voiceCancelledRef.current) {
        voiceCancelledRef.current = false;
        stopTyping();
        setIsRecording(false);
        return;
      }

      voiceTypedRef.current = voiceTargetRef.current.length;
      renderVoice();
      stopTyping();
      setIsRecording(false);
    };

    rec.onerror = () => {
      voiceCancelledRef.current = false;
      stopTyping();
      setIsRecording(false);
    };

    recognitionRef.current = rec;
    setVoiceSupported(true);

    return () => {
      stopTyping();

      try {
        rec.abort();
      } catch {
        /* ignore */
      }

      recognitionRef.current = null;
    };
  }, []);

  const startVoice = () => {
    const rec = recognitionRef.current;
    if (!rec || isRecording) return;

    voiceBaseRef.current = inputValueRef.current;
    voiceTargetRef.current = "";
    voiceTypedRef.current = 0;

    try {
      rec.start();
      setIsRecording(true);
      startTyping();
    } catch {
      /* already running or not allowed */
    }
  };

  const stopVoice = () => {
    const rec = recognitionRef.current;
    if (!rec) return;

    try {
      rec.stop();
    } catch {
      /* not running */
    }

    setIsRecording(false);
  };

  const cancelVoice = () => {
    const rec = recognitionRef.current;

    voiceCancelledRef.current = true;
    stopTyping();
    voiceBaseRef.current = "";
    voiceTargetRef.current = "";
    voiceTypedRef.current = 0;
    setIsRecording(false);

    if (!rec) {
      voiceCancelledRef.current = false;
      return;
    }

    try {
      rec.abort();
    } catch {
      /* not running */
    }
  };

  const handleSubmit = (value: string) => {
    cancelVoice();
    inputValueRef.current = "";
    setInputValue("");

    if (!value) return;

    const userMsg: ChatMessage = {
      id: newMessageId(),
      role: "user",
      text: value,
    };

    setMessages((prev) => [...prev, userMsg]);

    if (botReplyTimer.current) clearTimeout(botReplyTimer.current);

    setBotTyping(true);

    const delay = 600 + Math.random() * 900;

    botReplyTimer.current = setTimeout(() => {
      const botMsg: ChatMessage = {
        id: newMessageId(),
        role: "bot",
        text: generateBotReply(value),
      };

      setMessages((prev) => [...prev, botMsg]);
      setBotTyping(false);
      botReplyTimer.current = null;
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (botReplyTimer.current) {
        clearTimeout(botReplyTimer.current);
        botReplyTimer.current = null;
      }
    };
  }, []);

  const photosShowToast = (text: string) => {
    if (photosToastTimer.current) clearTimeout(photosToastTimer.current);

    const id = ++photosToastIdRef.current;

    setPhotosToast({ id, text });

    photosToastTimer.current = setTimeout(() => {
      setPhotosToast((prev) => (prev && prev.id === id ? null : prev));
      photosToastTimer.current = null;
    }, PHOTOS_TOAST_MS);
  };

  const photosTakePhoto = () => {
    photosShowToast("Photo taken");

    const idx = ++photoCounterRef.current;

    const file: MediaFile = {
      id: `f${++fileIdRef.current}`,
      kind: "photo",
      name: `photo_${idx}.heic`,
      sizeBytes: PHOTO_SIZE_BYTES,
      createdAt: Date.now(),
    };

    setFiles((prev) => [...prev, file]);
  };

  const photosStartRecording = () => {
    photosRecordingStartRef.current = Date.now();
    setPhotosRecordingMs(0);
    setPhotosRecording(true);
  };

  const photosStopRecording = () => {
    const start = photosRecordingStartRef.current;
    const elapsed = start != null ? Date.now() - start : 0;

    photosRecordingStartRef.current = null;
    setPhotosRecording(false);
    setPhotosRecordingMs(0);
    photosShowToast(`Video recorded · ${formatDuration(elapsed)}`);

    const idx = ++videoCounterRef.current;

    const file: MediaFile = {
      id: `f${++fileIdRef.current}`,
      kind: "video",
      name: `video_${idx}.mp4`,
      sizeBytes: Math.max(
        1,
        Math.round((elapsed / 1000) * VIDEO_BYTES_PER_SECOND),
      ),
      createdAt: Date.now(),
      durationMs: elapsed,
    };

    setFiles((prev) => [...prev, file]);
  };

  const handlePhotoClick = () => {
    const now = Date.now();
    const sincePrev = now - photosLastClickAt.current;

    photosLastClickAt.current = now;

    if (photosRecordingRef.current) {
      if (photosClickTimer.current) {
        clearTimeout(photosClickTimer.current);
        photosClickTimer.current = null;
      }

      photosStopRecording();
      photosLastClickAt.current = 0;
      return;
    }

    if (sincePrev < PHOTOS_DBLCLICK_MS) {
      if (photosClickTimer.current) {
        clearTimeout(photosClickTimer.current);
        photosClickTimer.current = null;
      }

      photosStartRecording();
      photosLastClickAt.current = 0;
      return;
    }

    if (photosClickTimer.current) clearTimeout(photosClickTimer.current);

    photosClickTimer.current = setTimeout(() => {
      photosClickTimer.current = null;
      photosTakePhoto();
    }, PHOTOS_DBLCLICK_MS);
  };

  useEffect(() => {
    if (!photosRecording) return;

    const id = setInterval(() => {
      const start = photosRecordingStartRef.current;
      if (start != null) setPhotosRecordingMs(Date.now() - start);
    }, 100);

    return () => clearInterval(id);
  }, [photosRecording]);

  useEffect(() => {
    return () => {
      if (photosClickTimer.current) clearTimeout(photosClickTimer.current);
      if (photosToastTimer.current) clearTimeout(photosToastTimer.current);
    };
  }, []);

  const handleInputFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }

    setKeyboardVisible(true);
  };

  const handleInputBlur = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);

    blurTimer.current = setTimeout(() => {
      setKeyboardVisible(false);
      blurTimer.current = null;
    }, 120);
  };

  const handleAppOpen = (id: AppId) => {
    if (id !== "messages") {
      setKeyboardVisible(false);
      stopVoice();
    }

    if (id !== "files") {
      setOpenedFile(null);
    }

    setActiveApp(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openedFile) {
          setOpenedFile(null);
          e.preventDefault();
        } else if (calibrating) {
          setCalibrating(false);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [calibrating, openedFile]);

  const openedFileIndex = openedFile
    ? sortedFiles.findIndex((f) => f.id === openedFile.id)
    : -1;

  const hasPrevFile = openedFileIndex > 0;

  const hasNextFile =
    openedFileIndex !== -1 && openedFileIndex < sortedFiles.length - 1;

  const goToPrevFile = () => {
    if (!hasPrevFile) return;
    setOpenedFile(sortedFiles[openedFileIndex - 1]);
  };

  const goToNextFile = () => {
    if (!hasNextFile) return;
    setOpenedFile(sortedFiles[openedFileIndex + 1]);
  };

  useEffect(() => {
    if (activeApp !== "home" || calibrating || openedFile) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      e.preventDefault();

      setHomeCardIndex((i) => {
        const max = HOME_CARD_COUNT - 1;
        if (e.key === "ArrowLeft") return Math.max(0, i - 1);
        return Math.min(max, i + 1);
      });
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [activeApp, calibrating, openedFile]);

  useEffect(() => {
    if (!openedFile || calibrating) return;
    if (sortedFiles.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const idx = sortedFiles.findIndex((f) => f.id === openedFile.id);
      if (idx === -1) return;

      const nextIdx =
        e.key === "ArrowLeft"
          ? Math.max(0, idx - 1)
          : Math.min(sortedFiles.length - 1, idx + 1);

      e.preventDefault();

      if (nextIdx !== idx) setOpenedFile(sortedFiles[nextIdx]);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [openedFile, calibrating, sortedFiles]);

  useEffect(() => {
    if (calibrating) blockRef.current?.focus();
  }, [calibrating]);

  useEffect(() => {
    const REVEAL_DISTANCE = 140;

    const onMove = (e: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage) return;

      const r = stage.getBoundingClientRect();
      const lx = e.clientX - r.left;
      const ly = e.clientY - r.top;

      const inStage = lx >= 0 && lx < 2 * COLUMN_WIDTH;
      const nearBottom =
        ly > COLUMN_HEIGHT - REVEAL_DISTANCE && ly < COLUMN_HEIGHT + 30;

      setDockActive(inStage && nearBottom);
    };

    window.addEventListener("mousemove", onMove);

    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const messengerProps: MessengerProps = {
    value: inputValue,
    onValueChange: setInputValue,
    onSubmit: handleSubmit,
    messages,
    botTyping,
    keyboardVisible,
    onInputFocus: handleInputFocus,
    onInputBlur: handleInputBlur,
    voiceSupported,
    isRecording,
    onVoiceStart: startVoice,
    onVoiceStop: stopVoice,
    chatSync,
  };

  const photosProps: PhotosProps = {
    recording: photosRecording,
    recordingMs: photosRecordingMs,
    toast: photosToast,
    toastDurationMs: PHOTOS_TOAST_MS,
    onClick: handlePhotoClick,
  };

  const filesProps: FilesProps = {
    files,
    openedFile,
    hasPrev: hasPrevFile,
    hasNext: hasNextFile,
    onPrev: goToPrevFile,
    onNext: goToNextFile,
    onOpen: (file) => setOpenedFile(file),
    onClose: () => setOpenedFile(null),
    videoSync,
  };

  const searchProps: SearchProps = {
    query: searchQuery,
    onQueryChange: setSearchQuery,
  };

  const musicProps: MusicProps = {
    musicSync,
    scrubTime: musicScrubTime,
    onScrubTimeChange: setMusicScrubTime,
  };

  const homeProps: HomeProps = {
    cardIndex: homeCardIndex,
    onCardIndexChange: setHomeCardIndex,
  };

  const appCtx: AppContext = {
    messenger: messengerProps,
    photos: photosProps,
    files: filesProps,
    search: searchProps,
    music: musicProps,
    home: homeProps,
  };

  const appContent = renderApp(activeApp, appCtx);

  return (
    <div
      ref={stageRef}
      style={{
        position: "relative",
        width: "2560px",
        height: "720px",
        display: "flex",
        backgroundColor: c("black"),
        overflow: "hidden",
        overscrollBehavior: "none",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      <ScreenScope screen="left">
        <Block
          ref={blockRef}
          width={COLUMN_WIDTH}
          height={COLUMN_HEIGHT}
          enabled={calibrating}
          displayPosition={calibrating ? undefined : leftDisplayPos}
          onPositionChange={setScreenPos}
        >
          {calibrating ? <CalibrationMarker /> : appContent}
        </Block>

        <CalibrationControls
          left={0}
          active={calibrating}
          onToggle={() => setCalibrating((v) => !v)}
        />

        <Dock
          active={dockActive && !calibrating}
          containerLeft={0}
          containerWidth={COLUMN_WIDTH}
          offsetX={leftOffsetX}
          offsetY={leftOffsetY}
          activeApp={activeApp}
          onOpen={handleAppOpen}
        />
      </ScreenScope>

      <ScreenScope screen="right">
        {calibrating ? (
          <div
            style={{
              width: `${COLUMN_WIDTH}px`,
              height: `${COLUMN_HEIGHT}px`,
              overflow: "hidden",
              overscrollBehavior: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
              touchAction: "none",
            }}
            onWheel={(e) => e.preventDefault()}
          >
            <CalibrationMarker />
          </div>
        ) : (
          <div
            style={{
              width: `${COLUMN_WIDTH}px`,
              height: `${COLUMN_HEIGHT}px`,
              overflow: "hidden",
              overscrollBehavior: "none",
              position: "relative",
              touchAction: "none",
              userSelect: "none",
            }}
            onWheel={(e) => e.preventDefault()}
          >
            <div
              style={{
                position: "absolute",
                left: `${CENTER_X + rightOffsetX}px`,
                top: `${CENTER_Y + rightOffsetY}px`,
                transform: "translate(-50%, -50%)",
                transition:
                  "left 180ms cubic-bezier(0.22, 1, 0.36, 1), top 180ms cubic-bezier(0.22, 1, 0.36, 1)",
                willChange: "left, top",
              }}
            >
              {appContent}
            </div>
          </div>
        )}

        <Dock
          active={dockActive && !calibrating}
          containerLeft={COLUMN_WIDTH}
          containerWidth={COLUMN_WIDTH}
          offsetX={rightOffsetX}
          offsetY={rightOffsetY}
          activeApp={activeApp}
          onOpen={handleAppOpen}
        />
      </ScreenScope>
    </div>
  );
}

function CalibrationControls({
  left,
  active,
  onToggle,
}: {
  left: number;
  active: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showButton = hovered || active;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHovered(false);
        }
      }}
      style={{
        position: "absolute",
        bottom: 0,
        left: `${left}px`,
        zIndex: 10,
        padding: "16px",
        width: "220px",
        height: "72px",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      <CalibrateButton
        visible={showButton}
        active={active}
        onToggle={onToggle}
      />
    </div>
  );
}

function CalibrateButton({
  active,
  visible,
  onToggle,
}: {
  active: boolean;
  visible: boolean;
  onToggle: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-hidden={!visible}
      tabIndex={0}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 16px",
        borderRadius: "999px",
        border: active
          ? `1px solid ${c("red", 0.6)}`
          : `1px solid ${c("white", 0.18)}`,
        background: active ? c("redDeep", 0.22) : c("white", 0.06),
        color: c("white"),
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        fontSize: "13px",
        letterSpacing: "0.02em",
        lineHeight: 1,
        cursor: "pointer",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition:
          "opacity 180ms ease, transform 180ms ease, background 160ms ease, border-color 160ms ease",
        userSelect: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "999px",
          background: active ? c("red") : c("white", 0.45),
          boxShadow: active ? `0 0 10px ${c("red", 0.8)}` : "none",
          transition: "background 160ms ease, box-shadow 160ms ease",
        }}
      />
      {active ? "Calibrating · Esc to exit" : "Calibrate"}
    </button>
  );
}
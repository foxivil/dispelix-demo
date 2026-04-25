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
import { generateBotReply } from "../apps/botReplies";
import Block, {
  defaultCalibrationPos,
  type BlockHandle,
  type Position,
} from "./Block";
import CalibrationMarker from "./CalibrationMarker";
import Dock from "./Dock";
import { useTheme } from "../theme/ThemeProvider";

const COLUMN_WIDTH = 1280;
const COLUMN_HEIGHT = 720;
const CENTER_X = COLUMN_WIDTH / 2;
const CENTER_Y = COLUMN_HEIGHT / 2;

const DEFAULT_APP: AppId = "messages";

// Click → wait this long for a possible second click; if none arrives, treat
// the gesture as a single click. Two clicks within this window count as a
// double-click. Tuned to be generous enough for unhurried double-taps while
// still feeling responsive.
const PHOTOS_DBLCLICK_MS = 280;
const PHOTOS_TOAST_MS = 2000;
// Demo "filesystem" sizing — every photo is the same on-disk size and every
// recorded second of video occupies a fixed amount of bytes (≈ 1080p, 8 Mbps).
const PHOTO_SIZE_BYTES = 2_400_000;
const VIDEO_BYTES_PER_SECOND = 1_000_000;

// Minimal local typing for the Web Speech API (not in TS lib by default)
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
  // Calibrated centre of the left block; used as an offset on the left dock
  // so the dock travels with the rest of the calibrated content. Defaults to
  // the bottom-right corner so calibration starts there.
  const [screenPos, setScreenPos] = useState<Position>(() =>
    defaultCalibrationPos(COLUMN_WIDTH, COLUMN_HEIGHT),
  );
  const offsetX = screenPos.x - CENTER_X;
  const offsetY = screenPos.y - CENTER_Y;

  // Messenger-specific shared state — kept here because both the left and
  // right column render the same messenger instance.
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [botTyping, setBotTyping] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  // Photos shared state — same idea: both columns render a controlled view
  // off these values so they always stay pixel-identical.
  const [photosRecording, setPhotosRecording] = useState(false);
  const [photosRecordingMs, setPhotosRecordingMs] = useState(0);
  const [photosFlashKey, setPhotosFlashKey] = useState(0);
  const [photosToast, setPhotosToast] = useState<PhotosToast | null>(null);
  const photosRecordingStartRef = useRef<number | null>(null);
  // Mirrors photosRecording so the click handler always sees the latest
  // value without re-binding on every render.
  const photosRecordingRef = useRef(false);
  photosRecordingRef.current = photosRecording;
  const photosToastIdRef = useRef(0);
  const photosToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photosLastClickAt = useRef(0);

  // Shared in-memory "filesystem" populated by the camera and read by the
  // Files app. Per-kind counters provide the photo_i / video_i naming.
  const [files, setFiles] = useState<MediaFile[]>([]);
  // Currently-opened file in the Files viewer (kept in Stage so both screens
  // show the same media at the same time).
  const [openedFile, setOpenedFile] = useState<MediaFile | null>(null);
  const photoCounterRef = useRef(0);
  const videoCounterRef = useRef(0);
  const fileIdRef = useRef(0);

  // Newest-first sort, identical to what Files.tsx renders, so prev/next
  // navigation in the viewer agrees with the on-screen order.
  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => b.createdAt - a.createdAt),
    [files],
  );

  const blockRef = useRef<BlockHandle>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;
  const messageIdRef = useRef(0);
  const botReplyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newMessageId = () => `msg-${++messageIdRef.current}`;

  // Shared scroll-sync hub for the two mirrored chat panels. Living in a
  // ref + useMemo so its identity is stable across renders and broadcasting
  // doesn't trigger React updates.
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
          // Skip the originator and any peer already at the target position
          // so feedback through the peers' onScroll handlers naturally stops.
          if (el !== origin && el.scrollTop !== scrollTop) {
            el.scrollTop = scrollTop;
          }
        });
      },
    }),
    [],
  );

  // Shared playback-sync hub for the two mirrored <video> elements in the
  // Files viewer. Tolerance checks on the receivers stop the inevitable
  // event-driven feedback loops (a programmatic seek/play/volume on peer B
  // re-fires the same event there, which would otherwise rebroadcast back).
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
          // 0.3s tolerance avoids constant micro-seeks while still nudging
          // peers back into sync if they drift while playing.
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
              // play() can be rejected if not in a user-gesture context;
              // swallow so the originator at least keeps playing.
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

  // Voice → typewriter state (refs so timers/handlers always see latest values)
  const voiceBaseRef = useRef(""); // input value at the moment recording started
  const voiceTargetRef = useRef(""); // latest combined transcript from the API
  const voiceTypedRef = useRef(0); // how many chars of the target are already shown
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
      // Recompute the full transcript from all results in the current session;
      // interim entries update in place so summing always yields the latest text.
      let combined = "";
      for (let i = 0; i < e.results.length; i++) {
        combined += e.results[i][0].transcript;
      }
      voiceTargetRef.current = combined.replace(/^\s+/, "");
    };
    rec.onend = () => {
      // Flush any remaining un-typed characters so the input ends up complete.
      voiceTypedRef.current = voiceTargetRef.current.length;
      renderVoice();
      stopTyping();
      setIsRecording(false);
    };
    rec.onerror = () => {
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
    // onend will finalize the remaining text and clear the timer.
    setIsRecording(false);
  };

  const handleSubmit = (value: string) => {
    stopVoice();
    // SpeechRecognition.stop() is async — its onend handler runs renderVoice()
    // later and would otherwise re-populate the input from the cached
    // transcript. Wipe the voice refs (and the synchronous inputValueRef)
    // here so that any pending onend resolves to "" and matches the freshly
    // cleared input.
    stopTyping();
    voiceBaseRef.current = "";
    voiceTargetRef.current = "";
    voiceTypedRef.current = 0;
    inputValueRef.current = "";

    const userMsg: ChatMessage = {
      id: newMessageId(),
      role: "user",
      text: value,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Cancel any in-flight reply, then schedule a fresh one with a small
    // randomised delay so the bot feels like it's "typing".
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

  // Cancel any pending bot reply on unmount so we don't setState after teardown.
  useEffect(() => {
    return () => {
      if (botReplyTimer.current) {
        clearTimeout(botReplyTimer.current);
        botReplyTimer.current = null;
      }
    };
  }, []);

  // -------------------- Photos camera logic --------------------

  const photosShowToast = (text: string) => {
    if (photosToastTimer.current) clearTimeout(photosToastTimer.current);
    const id = ++photosToastIdRef.current;
    setPhotosToast({ id, text });
    photosToastTimer.current = setTimeout(() => {
      // Only dismiss if no newer toast has replaced this one.
      setPhotosToast((prev) => (prev && prev.id === id ? null : prev));
      photosToastTimer.current = null;
    }, PHOTOS_TOAST_MS);
  };

  const photosTakePhoto = () => {
    setPhotosFlashKey((k) => k + 1);
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
      // Always bill at least 1 byte so a 0-ms recording still produces
      // something rather than an oddly empty entry.
      sizeBytes: Math.max(
        1,
        Math.round((elapsed / 1000) * VIDEO_BYTES_PER_SECOND),
      ),
      createdAt: Date.now(),
      durationMs: elapsed,
    };
    setFiles((prev) => [...prev, file]);
  };

  // Reliable click vs double-click discrimination:
  // - measure time since last click; if it's within the dblclick window we
  //   treat the gesture as a double-click and start recording immediately.
  // - otherwise schedule a single-click action after the same window so a
  //   late second click can still cancel/promote it.
  // This avoids relying on the browser's `dblclick` event, which doesn't
  // always fire (slight cursor drift, focus shifts) and races with `click`.
  const handlePhotoClick = () => {
    const now = Date.now();
    const sincePrev = now - photosLastClickAt.current;
    photosLastClickAt.current = now;

    // While recording, a single click stops the video — no debounce delay,
    // and reset the click clock so the *next* click isn't mis-read as the
    // second half of a double-click.
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

  // Drive the recording stopwatch while we're actively recording.
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
    // Defer hiding so a focus shift between the two mirrored inputs (or
    // briefly losing focus to a key tap) doesn't flicker the keyboard.
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      setKeyboardVisible(false);
      blurTimer.current = null;
    }, 120);
  };

  const handleAppOpen = (id: AppId) => {
    // Switching out of the messenger should also dismiss the keyboard / mic.
    if (id !== "messages") {
      setKeyboardVisible(false);
      stopVoice();
    }
    // Close the file viewer when leaving the Files app so coming back to it
    // shows the grid rather than a stale viewer over the wrong context.
    if (id !== "files") {
      setOpenedFile(null);
    }
    setActiveApp(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "C") {
        setCalibrating((v) => !v);
        e.preventDefault();
      } else if (e.key === "Escape") {
        // Esc closes whichever overlay is on top: viewer first, then
        // calibration mode.
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

  // Index of the currently-open file in the displayed (newest-first) order;
  // -1 when the viewer is closed or the file has just been removed.
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

  // ←/→ steps through the file list while the viewer is open. Suspended
  // during calibration so it doesn't fight Block's own arrow-key handler.
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
      // Always swallow the key so the browser doesn't also scroll the page,
      // even when we're at an edge and have nowhere to move.
      e.preventDefault();
      if (nextIdx !== idx) setOpenedFile(sortedFiles[nextIdx]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openedFile, calibrating, sortedFiles]);

  useEffect(() => {
    if (calibrating) blockRef.current?.focus();
  }, [calibrating]);

  // Shared dock visibility — when the cursor is near the bottom of either
  // column, both docks open at once.
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
    flashKey: photosFlashKey,
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

  const appCtx: AppContext = {
    messenger: messengerProps,
    photos: photosProps,
    files: filesProps,
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
      }}
    >
      <Block
        ref={blockRef}
        width={COLUMN_WIDTH}
        height={COLUMN_HEIGHT}
        enabled={calibrating}
        onPositionChange={setScreenPos}
      >
        {calibrating ? <CalibrationMarker /> : appContent}
      </Block>

      <div
        style={{
          width: `${COLUMN_WIDTH}px`,
          height: `${COLUMN_HEIGHT}px`,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {calibrating ? <CalibrationMarker /> : appContent}
      </div>

      <CalibrationControls
        left={0}
        active={calibrating}
        onToggle={() => setCalibrating((v) => !v)}
      />

      <Dock
        active={dockActive && !calibrating}
        containerLeft={0}
        containerWidth={COLUMN_WIDTH}
        offsetX={offsetX}
        offsetY={offsetY}
        activeApp={activeApp}
        onOpen={handleAppOpen}
      />
      <Dock
        active={dockActive && !calibrating}
        containerLeft={COLUMN_WIDTH}
        containerWidth={COLUMN_WIDTH}
        activeApp={activeApp}
        onOpen={handleAppOpen}
      />
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
        // Discoverable hot zone in the bottom-left corner of each block,
        // even when the calibrate button is invisible.
        width: "220px",
        height: "72px",
        boxSizing: "border-box",
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
      {active ? "Calibrating · Esc to exit" : "Calibrate (C)"}
    </button>
  );
}

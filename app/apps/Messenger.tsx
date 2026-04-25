"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTheme } from "../theme/ThemeProvider";

export type ChatRole = "user" | "bot";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

// Shared scroll-sync hook handed to every ChatHistory instance so the two
// mirrored chats stay glued at the same scroll position.
export type ChatSync = {
  register: (el: HTMLDivElement) => void;
  unregister: (el: HTMLDivElement) => void;
  broadcast: (origin: HTMLDivElement, scrollTop: number) => void;
};

export type MessengerProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  messages?: ChatMessage[];
  botTyping?: boolean;
  keyboardVisible?: boolean;
  onInputFocus?: () => void;
  onInputBlur?: () => void;
  voiceSupported?: boolean;
  isRecording?: boolean;
  onVoiceStart?: () => void;
  onVoiceStop?: () => void;
  chatSync?: ChatSync;
};

const APP_WIDTH = 520;
const CHAT_HEIGHT = 280;

export default function Messenger({
  value = "",
  onValueChange,
  onSubmit,
  messages = [],
  botTyping = false,
  keyboardVisible = false,
  onInputFocus,
  onInputBlur,
  voiceSupported = false,
  isRecording = false,
  onVoiceStart,
  onVoiceStop,
  chatSync,
}: MessengerProps) {
  const {
    palette: { c },
  } = useTheme();
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    // Submit when there's something to send OR when a voice session is still
    // active — clicking Send mid-recording should always stop the recording
    // and clear the input, even if no transcript has arrived yet.
    if (!trimmed && !isRecording) return;
    onSubmit?.(trimmed);
  };

  return (
    <div
      style={{
        position: "relative",
        width: `${APP_WIDTH}px`,
        minWidth: `${APP_WIDTH}px`,
        flexShrink: 0,
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      {/* Chat history floats above the input so the input itself stays
          anchored at the calibrated position regardless of message count. */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 12px)",
          left: 0,
          right: 0,
        }}
      >
        <ChatHistory
          messages={messages}
          botTyping={botTyping}
          chatSync={chatSync}
        />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "10px",
          width: "100%",
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
          placeholder="Type a message…"
          autoComplete="off"
          style={{
            flex: 1,
            height: "48px",
            padding: "0 16px",
            fontSize: "16px",
            border: `1px solid ${c("white", 0.25)}`,
            borderRadius: "10px",
            outline: "none",
            background: c("white", 0.06),
            color: c("white"),
          }}
        />
        {voiceSupported && (
          <VoiceToggleButton
            recording={isRecording}
            onToggle={() => {
              if (isRecording) onVoiceStop?.();
              else onVoiceStart?.();
            }}
          />
        )}
        <button
          type="submit"
          style={{
            height: "48px",
            padding: "0 22px",
            fontSize: "15px",
            fontWeight: 600,
            color: c("black"),
            background: c("white"),
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>

      {keyboardVisible && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            left: 0,
            right: 0,
          }}
        >
          <VirtualKeyboard
            value={value}
            onChange={onValueChange}
            onSubmit={onSubmit}
          />
        </div>
      )}
    </div>
  );
}

const DRAG_START_THRESHOLD_PX = 5;
const STICK_TO_BOTTOM_THRESHOLD_PX = 60;

function ChatHistory({
  messages,
  botTyping,
  chatSync,
}: {
  messages: ChatMessage[];
  botTyping: boolean;
  chatSync?: ChatSync;
}) {
  const {
    palette: { c },
  } = useTheme();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Register this scroller with the shared sync hub so its scroll position
  // can be mirrored on the other screen (and vice versa).
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !chatSync) return;
    chatSync.register(el);
    return () => chatSync.unregister(el);
  }, [chatSync]);
  // Track the live drag in a ref so handlers don't re-create on every render.
  const dragRef = useRef({
    pointerId: -1,
    startY: 0,
    startScroll: 0,
    isDrag: false,
  });
  // Whether the user was pinned near the bottom before the latest update.
  // We only auto-scroll when this is true, so scrolling up to read old
  // messages doesn't get yanked back when a new message arrives.
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, botTyping]);

  const updateStickiness = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distFromBottom < STICK_TO_BOTTOM_THRESHOLD_PX;
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    updateStickiness();
    // Broadcast the new scroll position to peers. Peers compare scrollTop
    // before assigning, so this naturally won't loop with their callbacks.
    chatSync?.broadcast(el, el.scrollTop);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startScroll: el.scrollTop,
      isDrag: false,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (state.pointerId !== e.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dy = e.clientY - state.startY;
    if (!state.isDrag) {
      // Only commit to a drag once the cursor has moved a bit, so a plain
      // click doesn't get treated as a (zero-distance) drag.
      if (Math.abs(dy) < DRAG_START_THRESHOLD_PX) return;
      state.isDrag = true;
      setDragging(true);
      el.setPointerCapture(e.pointerId);
    }
    el.scrollTop = state.startScroll - dy;
    // updateStickiness + peer broadcast happens via the native scroll event
    // that fires when scrollTop changes, but call it explicitly too in case
    // assigning the same value yields no scroll event.
    handleScroll();
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (state.pointerId !== e.pointerId) return;
    const el = scrollerRef.current;
    if (state.isDrag) {
      el?.releasePointerCapture(e.pointerId);
      setDragging(false);
    }
    dragRef.current = {
      pointerId: -1,
      startY: 0,
      startScroll: 0,
      isDrag: false,
    };
  };

  const isEmpty = messages.length === 0 && !botTyping;

  return (
    <div
      ref={scrollerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onScroll={handleScroll}
      style={{
        width: "100%",
        height: `${CHAT_HEIGHT}px`,
        boxSizing: "border-box",
        overflowY: "auto",
        // Outer scroller is a plain block — keep flex out of here so
        // overflow + scrolling behave predictably across browsers.
        background: c("panelDark", 0.55),
        border: `1px solid ${c("white", 0.1)}`,
        borderRadius: "14px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        cursor: dragging ? "grabbing" : "grab",
        // While dragging, suppress text selection so swipes don't
        // accidentally start highlighting message bubbles.
        userSelect: dragging ? "none" : "auto",
        WebkitUserSelect: dragging ? "none" : "auto",
        touchAction: "pan-y",
        // overscrollBehavior keeps page-level scroll from chaining when
        // the user reaches the top/bottom of the chat.
        overscrollBehavior: "contain",
      }}
    >
      {/* Inner anchor stretches to at least the scroller's height and uses
          flex-end so messages sit at the bottom when they don't fill it.
          Once they overflow, the outer scroller takes over normally. */}
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: "8px",
          padding: "12px",
          boxSizing: "border-box",
        }}
      >
        {isEmpty && (
          <div
            style={{
              color: c("white", 0.45),
              fontSize: "13px",
              textAlign: "center",
              padding: "24px 0",
            }}
          >
            Start the conversation below.
          </div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        {botTyping && <TypingBubble />}
      </div>
    </div>
  );
}

const BUBBLE_BASE: CSSProperties = {
  maxWidth: "80%",
  padding: "9px 13px",
  borderRadius: "14px",
  fontSize: "14px",
  lineHeight: 1.4,
  wordBreak: "break-word",
  whiteSpace: "pre-wrap",
};

function Bubble({ message }: { message: ChatMessage }) {
  const {
    palette: { c },
  } = useTheme();
  const isUser = message.role === "user";
  return (
    <div
      style={{
        ...BUBBLE_BASE,
        alignSelf: isUser ? "flex-end" : "flex-start",
        background: isUser ? c("blue") : c("white", 0.1),
        color: c("white"),
        border: `1px solid ${c("white", isUser ? 0.05 : 0.1)}`,
        borderBottomRightRadius: isUser ? "4px" : "14px",
        borderBottomLeftRadius: isUser ? "14px" : "4px",
      }}
    >
      {message.text}
    </div>
  );
}

function TypingBubble() {
  const {
    palette: { c },
  } = useTheme();
  // Inline the dot colour so each screen's typing indicator follows its own
  // R/G/B adjustment (CSS variables on :root would be shared globally).
  const dotBg = c("white", 0.75);
  return (
    <div
      style={{
        ...BUBBLE_BASE,
        alignSelf: "flex-start",
        background: c("white", 0.1),
        border: `1px solid ${c("white", 0.1)}`,
        borderBottomLeftRadius: "4px",
      }}
      aria-label="Bot is typing"
    >
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <span className="typing-dot" style={{ background: dotBg }} />
        <span className="typing-dot" style={{ background: dotBg }} />
        <span className="typing-dot" style={{ background: dotBg }} />
      </div>
    </div>
  );
}

const KEY_ROWS: ReadonlyArray<ReadonlyArray<string>> = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

// Base layout for a single key on the on-screen keyboard. Colours are
// applied per-render in <Key /> via the theme so they react to settings.
const KEY_BASE: CSSProperties = {
  height: "44px",
  minWidth: "44px",
  padding: "0 8px",
  fontSize: "15px",
  borderRadius: "8px",
  cursor: "pointer",
  fontFamily: "inherit",
  userSelect: "none",
  textTransform: "uppercase",
};

function VirtualKeyboard({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange?: (v: string) => void;
  onSubmit?: (v: string) => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  const press = (k: string) => onChange?.(value + k);
  const backspace = () => onChange?.(value.slice(0, -1));
  const space = () => onChange?.(value + " ");
  const enter = () => {
    const trimmed = value.trim();
    if (trimmed) onSubmit?.(trimmed);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "10px",
        background: c("panelDark", 0.85),
        border: `1px solid ${c("white", 0.12)}`,
        borderRadius: "12px",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {KEY_ROWS.map((row, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            gap: "6px",
            justifyContent: "center",
          }}
        >
          {row.map((k) => (
            <Key key={k} onPress={() => press(k)} label={k} />
          ))}
        </div>
      ))}
      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
        <Key onPress={backspace} label="⌫" widePx={68} />
        <Key onPress={space} label="space" flex grow />
        <Key onPress={enter} label="↵" widePx={68} />
      </div>
    </div>
  );
}

function VoiceToggleButton({
  recording,
  onToggle,
}: {
  recording: boolean;
  onToggle: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  const style: CSSProperties = {
    height: "48px",
    width: "48px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    color: c("white"),
    background: recording ? c("redDeep", 0.9) : c("white", 0.06),
    border: `1px solid ${recording ? c("red", 0.95) : c("white", 0.25)}`,
    borderRadius: "10px",
    cursor: "pointer",
    boxShadow: recording ? `0 0 0 4px ${c("redDeep", 0.22)}` : "none",
    transition:
      "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
    fontFamily: "inherit",
    flexShrink: 0,
  };

  return (
    <button
      type="button"
      title={recording ? "Stop recording" : "Start voice input"}
      aria-pressed={recording}
      aria-label={recording ? "Stop recording" : "Start voice input"}
      // preventDefault keeps the input focused so the on-screen keyboard
      // (when open) doesn't dismiss when toggling the mic
      onMouseDown={(e) => e.preventDefault()}
      onClick={onToggle}
      style={style}
    >
      {recording ? (
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "12px",
            height: "12px",
            background: c("white"),
            borderRadius: "2px",
          }}
        />
      ) : (
        "🎤"
      )}
    </button>
  );
}

function Key({
  label,
  onPress,
  widePx,
  flex,
  grow,
}: {
  label: string;
  onPress: () => void;
  widePx?: number;
  flex?: boolean;
  grow?: boolean;
}) {
  const {
    palette: { c },
  } = useTheme();
  const style: CSSProperties = {
    ...KEY_BASE,
    color: c("white"),
    background: c("white", 0.08),
    border: `1px solid ${c("white", 0.15)}`,
  };
  if (widePx) {
    style.minWidth = `${widePx}px`;
  }
  if (flex) {
    style.flex = grow ? 1 : "initial";
    style.textTransform = "none";
  }

  return (
    <button
      type="button"
      // preventDefault on mousedown keeps the input focused so the
      // keyboard doesn't dismiss itself when you tap a key
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPress}
      style={style}
    >
      {label}
    </button>
  );
}

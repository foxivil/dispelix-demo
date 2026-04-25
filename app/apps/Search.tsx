"use client";

import { useMemo } from "react";
import { useTheme } from "../theme/ThemeProvider";

const APP_WIDTH = 720;
const APP_HEIGHT = 600;

export type SearchProps = {
  query: string;
  onQueryChange: (next: string) => void;
};

type SearchResult = {
  id: string;
  title: string;
  url: string;
  snippet: string;
  // Free-form tags so a search like "music" or "linux" can match results
  // that don't literally contain the word in title/snippet.
  tags: string[];
};

// Tiny in-memory "index" so the demo search engine has something to chew on.
// Curated to feel realistic rather than be exhaustive — about ~20 entries
// across a few familiar categories.
const DOCUMENTS: ReadonlyArray<SearchResult> = [
  {
    id: "wiki",
    title: "Wikipedia — The Free Encyclopedia",
    url: "https://wikipedia.org",
    snippet:
      "Wikipedia is a multilingual online encyclopedia written and maintained by a community of volunteer contributors.",
    tags: ["reference", "knowledge", "encyclopedia"],
  },
  {
    id: "hn",
    title: "Hacker News",
    url: "https://news.ycombinator.com",
    snippet:
      "Social news website focusing on computer science and entrepreneurship, run by Y Combinator.",
    tags: ["news", "tech", "startups", "programming"],
  },
  {
    id: "github",
    title: "GitHub: Where the world builds software",
    url: "https://github.com",
    snippet:
      "GitHub is a developer platform that allows developers to create, store, manage, and share their code.",
    tags: ["code", "git", "open source", "development"],
  },
  {
    id: "stackoverflow",
    title: "Stack Overflow — Where Developers Learn, Share, & Build",
    url: "https://stackoverflow.com",
    snippet:
      "Public Q&A platform for programmers to find solutions to coding problems and share knowledge.",
    tags: ["programming", "qa", "developers"],
  },
  {
    id: "mdn",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    snippet:
      "Resources for developers, by developers. Documenting web technologies, including CSS, HTML, and JavaScript.",
    tags: ["docs", "web", "javascript", "css", "html"],
  },
  {
    id: "react",
    title: "React — The library for web and native user interfaces",
    url: "https://react.dev",
    snippet:
      "React lets you build user interfaces out of individual pieces called components written in JavaScript.",
    tags: ["javascript", "ui", "library", "frontend"],
  },
  {
    id: "nextjs",
    title: "Next.js by Vercel — The React Framework",
    url: "https://nextjs.org",
    snippet:
      "Used by some of the world's largest companies, Next.js enables you to create full-stack web applications.",
    tags: ["react", "framework", "ssr", "frontend"],
  },
  {
    id: "tailwind",
    title: "Tailwind CSS — Rapidly build modern websites",
    url: "https://tailwindcss.com",
    snippet:
      "A utility-first CSS framework for rapidly building custom designs without leaving your HTML.",
    tags: ["css", "design", "frontend"],
  },
  {
    id: "linux",
    title: "The Linux Kernel Archives",
    url: "https://kernel.org",
    snippet:
      "Primary site for the Linux kernel source. Read the latest changelogs, browse the source, and download the kernel.",
    tags: ["linux", "kernel", "operating system"],
  },
  {
    id: "wikipedia-ai",
    title: "Artificial intelligence — Wikipedia",
    url: "https://en.wikipedia.org/wiki/Artificial_intelligence",
    snippet:
      "AI is the intelligence demonstrated by machines, as opposed to the natural intelligence displayed by humans.",
    tags: ["ai", "machine learning", "reference"],
  },
  {
    id: "spotify",
    title: "Spotify — Web Player: Music for everyone",
    url: "https://open.spotify.com",
    snippet:
      "Listen to music, podcasts, and audiobooks. Stream millions of songs ad-free with Spotify Premium.",
    tags: ["music", "podcasts", "streaming"],
  },
  {
    id: "youtube",
    title: "YouTube",
    url: "https://youtube.com",
    snippet:
      "Enjoy the videos and music you love, upload original content, and share it all with friends, family, and the world.",
    tags: ["video", "music", "streaming"],
  },
  {
    id: "nasa",
    title: "NASA — National Aeronautics and Space Administration",
    url: "https://nasa.gov",
    snippet:
      "NASA leads the U.S. government's civilian space program, aeronautics and aerospace research.",
    tags: ["space", "science", "astronomy"],
  },
  {
    id: "arxiv",
    title: "arXiv.org — e-Print archive",
    url: "https://arxiv.org",
    snippet:
      "Open-access archive for scholarly articles in physics, mathematics, computer science, and more.",
    tags: ["research", "papers", "science"],
  },
  {
    id: "openstreetmap",
    title: "OpenStreetMap",
    url: "https://www.openstreetmap.org",
    snippet:
      "OpenStreetMap is a map of the world, created by people like you and free to use under an open license.",
    tags: ["maps", "geography", "open data"],
  },
  {
    id: "duckduckgo",
    title: "DuckDuckGo — Privacy, simplified",
    url: "https://duckduckgo.com",
    snippet:
      "The search engine that doesn't track you. Get private search, browser, and email — all in one place.",
    tags: ["search", "privacy"],
  },
  {
    id: "weather",
    title: "Weather Forecast — Today's Weather",
    url: "https://weather.com",
    snippet:
      "Hourly local weather forecast, including current conditions, precipitation, temperature, sky conditions, and more.",
    tags: ["weather", "forecast"],
  },
  {
    id: "bbc",
    title: "BBC — Homepage",
    url: "https://www.bbc.com",
    snippet:
      "Breaking news, sport, TV, radio and a whole lot more. The BBC informs, educates and entertains.",
    tags: ["news", "media"],
  },
  {
    id: "imdb",
    title: "IMDb — Movies, TV and Celebrities",
    url: "https://imdb.com",
    snippet:
      "Find ratings and reviews for the newest movie and TV shows. Get personalized recommendations.",
    tags: ["movies", "tv", "entertainment"],
  },
  {
    id: "khan",
    title: "Khan Academy — Free Online Courses, Lessons & Practice",
    url: "https://khanacademy.org",
    snippet:
      "Learn for free about math, art, computer programming, economics, physics, chemistry, biology and more.",
    tags: ["education", "learning", "courses"],
  },
];

// Lightweight scoring: token-based substring match across title/url/snippet/tags.
// Title hits are weighted highest; tag hits next; the rest contribute small
// amounts so partial matches still surface.
function scoreResult(query: string, doc: SearchResult): number {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const title = doc.title.toLowerCase();
  const url = doc.url.toLowerCase();
  const snippet = doc.snippet.toLowerCase();
  const tagText = doc.tags.join(" ").toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 6;
    if (tagText.includes(t)) score += 4;
    if (snippet.includes(t)) score += 2;
    if (url.includes(t)) score += 1;
  }
  return score;
}

export default function Search({ query, onQueryChange }: SearchProps) {
  const {
    palette: { c },
  } = useTheme();

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return [];
    return DOCUMENTS.map((doc) => ({ doc, score: scoreResult(trimmed, doc) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [trimmed]);

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
          width: `${APP_WIDTH}px`,
          height: `${APP_HEIGHT}px`,
          borderRadius: "24px",
          overflow: "hidden",
          background: c("black"),
          border: `1px solid ${c("white", 0.1)}`,
          boxShadow: `inset 0 0 0 1px ${c("white", 0.04)}, 0 18px 48px ${c("black", 0.55)}`,
          padding: "28px 32px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <Brand />

        <SearchField
          query={query}
          onQueryChange={onQueryChange}
          onClear={() => onQueryChange("")}
        />

        <ResultsList query={trimmed} results={results.map((r) => r.doc)} />
      </div>
    </div>
  );
}

function Brand() {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
      }}
    >
      <div
        style={{
          fontSize: "44px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          // Layered gradient evokes the "AR" branding without leaning on
          // emoji/icons. Each chunk reads from a palette token so it follows
          // the colour settings.
          background: `linear-gradient(120deg, ${c("blue")} 0%, ${c("redHot")} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        ARsearcher
      </div>
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: c("white", 0.45),
        }}
      >
        Augmented Reality Search
      </div>
    </div>
  );
}

function SearchField({
  query,
  onQueryChange,
  onClear,
}: {
  query: string;
  onQueryChange: (next: string) => void;
  onClear: () => void;
}) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
      }}
    >
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: "18px",
          color: c("white", 0.55),
          fontSize: "18px",
          pointerEvents: "none",
        }}
      >
        🔍
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search the web…"
        autoComplete="off"
        spellCheck={false}
        style={{
          flex: 1,
          height: "52px",
          padding: "0 56px 0 48px",
          fontSize: "16px",
          color: c("white"),
          background: c("white", 0.06),
          border: `1px solid ${c("white", 0.18)}`,
          borderRadius: "999px",
          outline: "none",
          fontFamily: "inherit",
          letterSpacing: "0.01em",
        }}
      />
      {query.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "12px",
            width: "28px",
            height: "28px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "999px",
            border: "none",
            background: c("white", 0.08),
            color: c("white", 0.85),
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "13px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </form>
  );
}

function ResultsList({
  query,
  results,
}: {
  query: string;
  results: ReadonlyArray<SearchResult>;
}) {
  const {
    palette: { c },
  } = useTheme();

  if (!query) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: c("white", 0.5),
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "14px" }}>
          Type to search across {DOCUMENTS.length} indexed pages.
        </div>
        <div style={{ fontSize: "12px", color: c("white", 0.35) }}>
          Try “music”, “react”, “linux”, or “space”.
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: c("white", 0.55),
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "14px" }}>
          No results for <em>“{query}”</em>.
        </div>
        <div style={{ fontSize: "12px", color: c("white", 0.4) }}>
          Try different or broader keywords.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        paddingRight: "4px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: c("white", 0.4),
        }}
      >
        About {results.length} result{results.length === 1 ? "" : "s"}
      </div>
      {results.map((r) => (
        <ResultRow key={r.id} result={r} query={query} />
      ))}
    </div>
  );
}

function ResultRow({
  result,
  query,
}: {
  result: SearchResult;
  query: string;
}) {
  const {
    palette: { c },
  } = useTheme();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "8px 12px",
        borderRadius: "10px",
        background: c("white", 0.03),
        border: `1px solid ${c("white", 0.06)}`,
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: c("white", 0.45),
          letterSpacing: "0.02em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={result.url}
      >
        {result.url}
      </div>
      <div
        style={{
          fontSize: "16px",
          color: c("blue"),
          fontWeight: 500,
          lineHeight: 1.2,
        }}
      >
        <Highlight text={result.title} query={query} />
      </div>
      <div
        style={{
          fontSize: "13px",
          color: c("white", 0.7),
          lineHeight: 1.4,
        }}
      >
        <Highlight text={result.snippet} query={query} />
      </div>
    </div>
  );
}

// Splits `text` on each query token (case-insensitive) and bolds matched
// segments so the user can see which words triggered the result.
function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
  if (tokens.length === 0) return <>{text}</>;
  // Build a single regex that matches any of the tokens. Escape any regex
  // metacharacters in the user's query so it can't blow up the match.
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const splitter = new RegExp(`(${escaped.join("|")})`, "ig");
  const tokenSet = new Set(tokens);
  const parts = text.split(splitter);
  return (
    <>
      {parts.map((part, i) =>
        tokenSet.has(part.toLowerCase()) ? (
          <strong key={i} style={{ fontWeight: 700 }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

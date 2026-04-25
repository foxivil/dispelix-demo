// Lightweight, dependency-free reply generator for the demo chat. Picks a
// keyword-aware response when one matches, otherwise falls back to a random
// line from the generic pool.

const GENERIC_REPLIES = [
  "Got it!",
  "Interesting…",
  "Tell me more.",
  "Hmm, let me think about that.",
  "I see what you mean.",
  "That makes sense.",
  "Cool!",
  "Sounds good to me.",
  "Really?",
  "Nice one.",
  "I hadn't thought of that.",
  "Could you elaborate?",
  "Fascinating.",
  "Let's dig into that.",
  "I'm with you.",
  "Sure thing.",
  "On it!",
  "Got you.",
  "Right on.",
  "Noted.",
];

type Rule = {
  match: RegExp;
  replies: readonly string[];
};

const RULES: readonly Rule[] = [
  {
    match: /\b(hi|hello|hey|hiya|yo)\b/i,
    replies: ["Hey there! 👋", "Hello!", "Hi! How can I help?"],
  },
  {
    match: /\bhow\s+are\s+you\b/i,
    replies: [
      "Doing great, thanks for asking!",
      "All good on my side. You?",
      "Pretty well — running smoothly today.",
    ],
  },
  {
    match: /\b(what(?:'s| is)? your name|who are you)\b/i,
    replies: [
      "I'm just a friendly demo bot.",
      "Call me Echo. I'm here to keep you company.",
    ],
  },
  {
    match: /\b(thanks|thank you|cheers)\b/i,
    replies: ["You're welcome!", "Anytime!", "Happy to help."],
  },
  {
    match: /\b(bye|goodbye|see ya|cya|later)\b/i,
    replies: ["Catch you later! 👋", "Bye for now.", "Take care!"],
  },
  {
    match: /\?\s*$/,
    replies: [
      "Good question — let me think.",
      "Hmm, I'm not totally sure.",
      "Honestly, I'd love your take on that.",
    ],
  },
  {
    match: /\b(i\s+love|amazing|awesome|great|cool)\b/i,
    replies: ["Glad you think so! 🎉", "Right? It's the best.", "100%."],
  },
  {
    match: /\b(sad|tired|bored|annoyed)\b/i,
    replies: [
      "Sorry to hear that.",
      "Hope your day picks up soon.",
      "Want to talk about it?",
    ],
  },
];

function pick(replies: readonly string[]): string {
  return replies[Math.floor(Math.random() * replies.length)];
}

export function generateBotReply(userMessage: string): string {
  for (const rule of RULES) {
    if (rule.match.test(userMessage)) {
      return pick(rule.replies);
    }
  }
  return pick(GENERIC_REPLIES);
}

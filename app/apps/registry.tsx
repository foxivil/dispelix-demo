"use client";

import Files, { type FilesProps } from "./Files";
import Home, { type HomeProps } from "./Home";
import Messenger, { type MessengerProps } from "./Messenger";
import Music, { type MusicProps } from "./Music";
import Photos, { type PhotosProps } from "./Photos";
import Search, { type SearchProps } from "./Search";
import Settings from "./Settings";

export type AppId =
  | "home"
  | "files"
  | "search"
  | "music"
  | "photos"
  | "messages"
  | "settings";

export type AppMeta = {
  id: AppId;
  label: string;
  emoji: string;
};

// Single source of truth for the dock + the app router below.
export const APPS: readonly AppMeta[] = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "files", label: "Files", emoji: "📁" },
  { id: "search", label: "Search", emoji: "🔍" },
  { id: "music", label: "Music", emoji: "🎵" },
  { id: "photos", label: "Photos", emoji: "📷" },
  { id: "messages", label: "Messages", emoji: "💬" },
  { id: "settings", label: "Settings", emoji: "⚙️" },
];

// Bundle of per-app shared props so both screens render the same controlled
// state. Add a new field here when an app needs to lift state into Stage.
export type AppContext = {
  messenger: MessengerProps;
  photos: PhotosProps;
  files: FilesProps;
  search: SearchProps;
  music: MusicProps;
  home: HomeProps;
};

export function renderApp(id: AppId, ctx: AppContext) {
  switch (id) {
    case "messages":
      return <Messenger {...ctx.messenger} />;
    case "home":
      return <Home {...ctx.home} />;
    case "files":
      return <Files {...ctx.files} />;
    case "search":
      return <Search {...ctx.search} />;
    case "music":
      return <Music {...ctx.music} />;
    case "photos":
      return <Photos {...ctx.photos} />;
    case "settings":
      return <Settings />;
  }
}

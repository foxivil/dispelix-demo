# Dual-Screen AR Glasses Interface Demo

A lightweight prototype UI for dual-screen AR glasses, built as a submission for the **Frontier Interfaces Hackathon** organised by **Thinkin'Rocks** from **24–26 April**.

The project responds to the challenge:

> Designing UI/UX interfaces for AR displays

It explores how everyday app interfaces can be adapted for dual-screen AR glasses, with synchronized state, calibration, media capture, voice input, and per-screen display correction.

## Overview

The demo renders a **2560 × 720 AR glasses workspace** split into two synchronized 1280 × 720 displays. Both sides share the same app state, so interactions on one screen are reflected on the other.

The interface includes a dock-based app launcher, calibration controls, messaging, camera capture, file browsing, search, music playback, and per-screen color correction.

## Features

### Dual-screen AR layout

- Simulates left and right AR glasses displays.
- Keeps app state synchronized across both screens.
- Applies opposite alignment offsets to each screen after calibration.

### Screen calibration

- Drag the calibration marker to align the display.
- Use arrow keys for fine adjustment.
- Press `Esc` to exit calibration.
- Calibration correction is split between both screens for better average alignment.

### Dock launcher

- Move the mouse near the bottom of either screen to reveal the dock.
- Open apps from a shared dock.
- The active app is mirrored across both screens.

### Home tour

- Guided onboarding cards explain the demo.
- Navigate with on-screen buttons or keyboard arrow keys.

### Messages

- Chat with a lightweight demo bot.
- Keyword-aware replies for greetings, questions, thanks, goodbyes, and more.
- Voice input support when available in the browser.
- On-screen virtual keyboard.
- Scroll position sync across both mirrored chat views.

### Photos

- AR-style camera viewfinder.
- Single click captures a photo.
- Double click starts video recording.
- Click while recording to stop.
- Captured media is saved and becomes available in Files.

### Files

- Browse captured photos and videos.
- Loads media from `public/files`.
- Thumbnail grid with file size and duration metadata.
- Fullscreen viewer with previous/next navigation.
- Video playback sync across both screens.

### Search

- Demo search interface called **ARsearcher**.
- Live filtering across a small in-memory index.
- Highlights matching query terms.

### Music

- Local playlist playback.
- Play, pause, seek, volume, and mute controls.
- Playback state, scrub position, and volume sync across both screens.

### Settings

- Per-screen RGB color adjustment.
- Tune the left and right screen independently.
- Useful for correcting display tint differences in AR glasses.

## Tech Stack

- **Next.js**
- **React**
- **TypeScript**
- **Lucide React**
- Browser APIs:
  - `MediaDevices`
  - `MediaRecorder`
  - `SpeechRecognition` / `webkitSpeechRecognition`
  - `localStorage`

## Project Structure

```text
apps/
  botReplies.ts       # Lightweight demo chatbot reply generator
  Files.tsx           # Media browser and viewer
  Home.tsx            # Guided onboarding tour
  Messenger.tsx       # Chat UI, voice input, virtual keyboard
  Music.tsx           # Audio player and playlist controls
  Photos.tsx          # Camera capture interface
  Search.tsx          # Local demo search UI
  Settings.tsx        # Per-screen color correction
  registry.tsx        # App registry and app router

components/
  Block.tsx           # Calibratable screen positioning block
  CalibrationMarker.tsx
  Dock.tsx
  Stage.tsx           # Main dual-screen AR stage and shared state

theme/
  ThemeProvider.tsx
  colors.ts
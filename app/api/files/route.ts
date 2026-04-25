import { readdir, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const PUBLIC_FILES_DIR = path.join(process.cwd(), "public", "files");

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".svg",
]);

const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".mov",
  ".m4v",
  ".ogg",
]);

function getMediaKind(filename: string): "photo" | "video" | null {
  const ext = path.extname(filename).toLowerCase();

  if (IMAGE_EXTENSIONS.has(ext)) return "photo";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";

  return null;
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".m4v":
      return "video/x-m4v";
    case ".ogg":
      return "video/ogg";
    default:
      return "application/octet-stream";
  }
}

export async function GET() {
  try {
    const entries = await readdir(PUBLIC_FILES_DIR, {
      withFileTypes: true,
    });

    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const kind = getMediaKind(entry.name);
          if (!kind) return null;

          const filePath = path.join(PUBLIC_FILES_DIR, entry.name);
          const info = await stat(filePath);

          return {
            id: entry.name,
            kind,
            name: entry.name,
            sizeBytes: info.size,
            createdAt: info.mtimeMs,
            url: `/files/${encodeURIComponent(entry.name)}`,
            mimeType: getMimeType(entry.name),
          };
        }),
    );

    return NextResponse.json({
      files: files.filter(Boolean),
    });
  } catch (error) {
    console.error("Failed to read public/files", error);

    return NextResponse.json(
      { files: [], error: "Failed to read files" },
      { status: 500 },
    );
  }
}
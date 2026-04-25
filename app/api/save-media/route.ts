import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "files");

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function makeUniqueFilename(filename: string): string {
  const safeFilename = sanitizeFilename(filename);
  const ext = path.extname(safeFilename);
  const base = path.basename(safeFilename, ext);

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const random = Math.random().toString(36).slice(2, 8);

  return `${base}_${timestamp}_${random}${ext}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const filename = formData.get("filename");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (typeof filename !== "string" || !filename.trim()) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const uniqueFilename = makeUniqueFilename(filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(UPLOAD_DIR, uniqueFilename);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      filename: uniqueFilename,
      publicUrl: `/files/${encodeURIComponent(uniqueFilename)}`,
    });
  } catch (error) {
    console.error("Failed to save media", error);

    return NextResponse.json(
      { error: "Failed to save media" },
      { status: 500 },
    );
  }
}
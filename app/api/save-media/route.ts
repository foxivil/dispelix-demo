import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const filename = formData.get("filename");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file" },
        { status: 400 },
      );
    }

    if (typeof filename !== "string" || !filename.trim()) {
      return NextResponse.json(
        { error: "Missing filename" },
        { status: 400 },
      );
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");

    const uploadDir = path.join(process.cwd(), "public", "images");
    await mkdir(uploadDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filePath = path.join(uploadDir, safeFilename);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      filename: safeFilename,
      publicUrl: `/images/${safeFilename}`,
    });
  } catch (error) {
    console.error("Failed to save media", error);

    return NextResponse.json(
      { error: "Failed to save media" },
      { status: 500 },
    );
  }
}
import fs from "node:fs";
import path from "node:path";
import type { Workspace } from "../workspace.js";

const MAX_EMBED_BYTES = 8 * 1024 * 1024;

export type ReportImageEmbed = {
  mime: string;
  filename: string;
  /** data:image/...;base64,... for Markdown/HTML */
  dataUri: string;
  /** raw bytes for DOCX */
  bytes: Buffer;
  /** approx display size for DOCX (px) */
  width: number;
  height: number;
};

function isImageMeta(kind: string, filename: string, mime?: string): boolean {
  if (kind === "screenshot") return true;
  if (mime?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
}

/** Read image dimensions from PNG/JPEG headers when possible; fallback aspect. */
function roughDimensions(bytes: Buffer, mime: string): { width: number; height: number } {
  try {
    if (mime === "image/png" && bytes.length >= 24) {
      const width = bytes.readUInt32BE(16);
      const height = bytes.readUInt32BE(20);
      if (width > 0 && height > 0 && width < 20000 && height < 20000) {
        return scaleToMax(width, height, 560);
      }
    }
    if (
      (mime === "image/jpeg" || mime === "image/jpg") &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8
    ) {
      let i = 2;
      while (i < bytes.length - 8) {
        if (bytes[i] !== 0xff) break;
        const marker = bytes[i + 1];
        const len = bytes.readUInt16BE(i + 2);
        // SOF0 / SOF2
        if (marker === 0xc0 || marker === 0xc2) {
          const height = bytes.readUInt16BE(i + 5);
          const width = bytes.readUInt16BE(i + 7);
          if (width > 0 && height > 0) return scaleToMax(width, height, 560);
        }
        i += 2 + len;
      }
    }
  } catch {
    // ignore
  }
  return { width: 480, height: 320 };
}

function scaleToMax(w: number, h: number, maxW: number): { width: number; height: number } {
  if (w <= maxW) return { width: w, height: h };
  const scale = maxW / w;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

/**
 * Load a file evidence row as an embeddable image for reports, or null if not an image.
 */
export function loadReportImage(
  ws: Workspace,
  evidence: {
    id: string;
    kind: string;
    path?: string | null;
    meta?: Record<string, unknown>;
  },
): ReportImageEmbed | null {
  if (!evidence.path) return null;
  const abs = path.resolve(ws.sheafDir, evidence.path);
  const root = path.resolve(ws.sheafDir) + path.sep;
  if (!abs.startsWith(root) && abs !== path.resolve(ws.sheafDir)) return null;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;

  const meta = evidence.meta ?? {};
  const filename =
    (typeof meta.originalName === "string" && meta.originalName) ||
    path.basename(abs);
  const mime =
    (typeof meta.mimeType === "string" && meta.mimeType) || guessMime(filename);
  if (!isImageMeta(evidence.kind, filename, mime)) return null;

  const st = fs.statSync(abs);
  if (st.size <= 0 || st.size > MAX_EMBED_BYTES) return null;

  const bytes = fs.readFileSync(abs);
  const dims = roughDimensions(bytes, mime);
  const dataUri = `data:${mime};base64,${bytes.toString("base64")}`;
  return {
    mime,
    filename,
    dataUri,
    bytes,
    width: dims.width,
    height: dims.height,
  };
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

export function docxImageType(
  mime: string,
): "png" | "jpg" | "gif" | "bmp" | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/gif") return "gif";
  if (mime === "image/bmp" || mime === "image/x-ms-bmp") return "bmp";
  // webp/svg not reliably supported by docx ImageRun — skip in DOCX
  return null;
}

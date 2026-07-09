import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import type { Workspace } from "../workspace.js";
import type { ReportOptions } from "../services.js";
import { buildExportPackage, listEvidence } from "../services.js";
import { docxImageType, loadReportImage } from "./images.js";

function cell(text: string, bold = false) {
  return new TableCell({
    width: { size: 2200, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 18, font: "Calibri" })],
      }),
    ],
  });
}

/** Client DOCX export from structured casefile data (includes embedded screenshots). */
export async function buildDocxBuffer(
  ws: Workspace,
  engagementId: string,
  options: ReportOptions = {},
): Promise<Buffer> {
  const pkg = buildExportPackage(ws, engagementId, {
    visibility: options.visibility ?? "active",
    confirmedOnly: options.confirmedOnly,
  });
  const eng = pkg.engagement;
  const findings = pkg.findings as Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    host: string | null;
    path: string | null;
    description: string | null;
    impact: string | null;
    remediation: string | null;
    cwe: string | null;
    cve: string | null;
  }>;

  const allEvidence = listEvidence(ws, engagementId);

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: eng.name,
      heading: HeadingLevel.TITLE,
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Client: ${eng.client || "—"}  ·  Type: ${eng.type}  ·  Status: ${eng.status}`,
          italics: true,
          size: 20,
        }),
      ],
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: options.confirmedOnly
            ? "Profile: confirmed findings only"
            : "Profile: active findings (archived excluded)",
          size: 18,
          color: "666666",
        }),
      ],
    }),
  );
  children.push(new Paragraph({ text: "" }));

  children.push(
    new Paragraph({ text: "Executive summary", heading: HeadingLevel.HEADING_1 }),
  );
  children.push(
    new Paragraph({
      text: `This document summarizes ${findings.length} finding(s) exported from Sheaf. Validate all issues before client delivery.`,
    }),
  );

  children.push(
    new Paragraph({ text: "Findings overview", heading: HeadingLevel.HEADING_1 }),
  );

  if (findings.length === 0) {
    children.push(new Paragraph({ text: "No findings in this export profile." }));
  } else {
    children.push(
      new Table({
        width: { size: 9000, type: WidthType.DXA },
        rows: [
          new TableRow({
            children: [
              cell("Severity", true),
              cell("Status", true),
              cell("Title", true),
              cell("Host", true),
            ],
          }),
          ...findings.map(
            (f) =>
              new TableRow({
                children: [
                  cell(f.severity),
                  cell(f.status),
                  cell(f.title),
                  cell(f.host || "—"),
                ],
              }),
          ),
        ],
      }),
    );
  }

  for (const f of findings) {
    children.push(new Paragraph({ text: "" }));
    children.push(
      new Paragraph({
        text: f.title,
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${f.severity.toUpperCase()} · ${f.status}${f.host ? ` · ${f.host}` : ""}${f.path ?? ""}`,
            size: 18,
            color: "666666",
          }),
        ],
      }),
    );
    if (f.cwe || f.cve) {
      children.push(
        new Paragraph({
          text: [f.cwe, f.cve].filter(Boolean).join(" · "),
        }),
      );
    }
    children.push(new Paragraph({ text: "Description", heading: HeadingLevel.HEADING_3 }));
    children.push(new Paragraph({ text: f.description || "—" }));
    children.push(new Paragraph({ text: "Impact", heading: HeadingLevel.HEADING_3 }));
    children.push(new Paragraph({ text: f.impact || "—" }));
    children.push(new Paragraph({ text: "Remediation", heading: HeadingLevel.HEADING_3 }));
    children.push(new Paragraph({ text: f.remediation || "—" }));

    const linked = allEvidence.filter((e) => e.findingId === f.id);
    const images = linked
      .map((e) => ({ e, img: loadReportImage(ws, e) }))
      .filter((x): x is { e: (typeof linked)[0]; img: NonNullable<ReturnType<typeof loadReportImage>> } =>
        Boolean(x.img),
      );

    if (images.length) {
      children.push(new Paragraph({ text: "Evidence", heading: HeadingLevel.HEADING_3 }));
      let fig = 0;
      for (const { img } of images) {
        const dtype = docxImageType(img.mime);
        if (!dtype) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Image not embedded in DOCX: ${img.filename} (${img.mime})]`,
                  italics: true,
                  size: 18,
                  color: "666666",
                }),
              ],
            }),
          );
          continue;
        }
        fig += 1;
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Figure ${fig}: ${img.filename}`,
                italics: true,
                size: 18,
              }),
            ],
          }),
        );
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: dtype,
                data: img.bytes,
                transformation: {
                  width: img.width,
                  height: img.height,
                },
                altText: {
                  title: img.filename,
                  description: `Evidence screenshot ${img.filename}`,
                  name: img.filename,
                },
              }),
            ],
          }),
        );
      }
    }

    // Text evidence snippets
    for (const e of linked) {
      if (e.contentText && e.contentText.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Text evidence (${e.kind})`,
                bold: true,
                size: 18,
              }),
            ],
          }),
        );
        const snippet = e.contentText.trim().slice(0, 3500);
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: snippet,
                font: "Consolas",
                size: 16,
              }),
            ],
          }),
        );
      }
    }
  }

  children.push(new Paragraph({ text: "" }));
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Generated by Sheaf — local-first engagement casefile.",
          italics: true,
          size: 16,
          color: "888888",
        }),
      ],
    }),
  );

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

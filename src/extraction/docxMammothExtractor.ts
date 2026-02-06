import mammoth from "mammoth";
import { ExtractedFieldInput, PdfExtractor } from "./engine";

const MAX_FIELDS = 200;
const MAX_RAW_TEXT_CHARS = 20000;

function normalizeBodyText(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  // Drop obvious headers/footers repeated many times (short lines repeated).
  const counts = new Map<string, number>();
  for (const line of lines) {
    if (line.length <= 40) {
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
  }
  const filtered = lines.filter((line) => {
    if (line.length <= 40 && (counts.get(line) ?? 0) >= 5) {
      return false;
    }
    // Remove standalone page numbers.
    if (
      /^page\s+\d+(\s+of\s+\d+)?$/i.test(line) ||
      /^\d+\s*\/\s*\d+$/.test(line)
    ) {
      return false;
    }
    return true;
  });

  // Merge broken sentences: join lines when the previous line doesn't end with punctuation.
  const merged: string[] = [];
  for (const line of filtered) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.length > 0 &&
      !/[.!?:;]$/.test(prev) &&
      /^[a-z(]/.test(line)
    ) {
      merged[merged.length - 1] = `${prev} ${line}`;
    } else {
      merged.push(line);
    }
  }

  return merged.join("\n");
}

export class DocxMammothExtractor implements PdfExtractor {
  async extract(buffer: Buffer): Promise<ExtractedFieldInput[]> {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim();
    const fields: ExtractedFieldInput[] = [];

    // Best-effort KV extraction similar to PDF path.
    const lines = text.split(/\r?\n/).map((line) => line.trim());
    for (const line of lines) {
      if (!line || fields.length >= MAX_FIELDS) {
        continue;
      }
      const kvMatch = line.match(/^(.+?)\s*[:\-]\s*(.+)$/);
      if (kvMatch) {
        fields.push({
          name: kvMatch[1].trim(),
          value: kvMatch[2].trim(),
          source: "text"
        });
      }
    }

    const rawText = text.slice(0, MAX_RAW_TEXT_CHARS);
    if (rawText) {
      fields.push({
        name: "__raw_text__",
        value: rawText,
        source: "raw"
      });

      fields.push({
        name: "__normalized_text__",
        value: normalizeBodyText(rawText).slice(0, MAX_RAW_TEXT_CHARS),
        source: "normalized"
      });
    }

    return fields;
  }
}


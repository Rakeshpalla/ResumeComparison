/**
 * Creates a parseable uncompressed PDF from plain text.
 * Used by e2e-test.mjs to generate realistic resume PDFs.
 */

export function makePdf(text) {
  // Escape PDF string special chars
  const lines = text.split("\n").map(line =>
    line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
  );

  // Build content stream — one line per row
  const streamLines = ["BT", "/F1 11 Tf", "50 750 Td", "14 TL"];
  for (const line of lines) {
    streamLines.push(`(${line.slice(0, 200)}) Tj T*`);
  }
  streamLines.push("ET");
  const stream = streamLines.join("\n");
  const streamLen = Buffer.byteLength(stream, "latin1");

  const objs = [
    "",  // 0 = free
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj",
    `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj"
  ];

  // Build body and track xref offsets
  const header = "%PDF-1.4\n";
  let body = header;
  const offsets = [0]; // obj 0 = free
  for (let i = 1; i < objs.length; i++) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += objs[i] + "\n";
  }

  const xrefOffset = Buffer.byteLength(body, "latin1");
  const xrefLines = [
    "xref",
    `0 ${objs.length}`,
    "0000000000 65535 f "
  ];
  for (let i = 1; i < objs.length; i++) {
    xrefLines.push(String(offsets[i]).padStart(10, "0") + " 00000 n ");
  }
  xrefLines.push(
    "trailer",
    `<< /Size ${objs.length} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF"
  );

  return Buffer.from(body + xrefLines.join("\n"), "latin1");
}

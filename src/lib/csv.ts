export function escapeCsv(value: string) {
  const shouldQuote = /[",\n]/.test(value);
  const escaped = value.replace(/"/g, "\"\"");
  return shouldQuote ? `"${escaped}"` : escaped;
}

export function buildCsv(
  headers: string[],
  rows: string[][]
) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map((value) => escapeCsv(String(value ?? ""))).join(","));
  }
  return lines.join("\n");
}

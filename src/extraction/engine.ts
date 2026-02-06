export type ExtractedFieldInput = {
  name: string;
  value: string;
  source: string;
};

export interface PdfExtractor {
  extract(buffer: Buffer): Promise<ExtractedFieldInput[]>;
}

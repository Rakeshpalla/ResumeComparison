"use client";

type Props = { data: object | object[] };

/**
 * Injects JSON-LD structured data for SEO and AI search engines.
 * Pass a single schema object or array of schemas.
 */
export function StructuredData({ data }: Props) {
  const json = Array.isArray(data) ? data : [data];
  return (
    <>
      {json.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

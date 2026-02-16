import type { ReactNode } from "react";
import { buildMetadata } from "../../../../lib/metadata";

type Props = { children: ReactNode; params: { sessionId: string } };

export function generateMetadata({ params }: Props) {
  const { sessionId } = params;
  return buildMetadata({
    title: "Compare Resumes",
    description: `Compare candidates for session ${sessionId.slice(0, 8)}… View rankings and hiring insights.`,
    path: `/compare/${sessionId}`,
  });
}

export default function CompareLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

import { buildMetadata } from "@/lib/metadata";
import { ThankYouContent } from "./ThankYouContent";

export const metadata = buildMetadata({
  title: "Thank you for your feedback",
  description:
    "Thanks for helping us improve the Resume Comparison Engine. Get your personalized hiring tip and share with other hiring managers.",
  path: "/feedback/thank-you",
});

type Props = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default function ThankYouPage({ searchParams }: Props) {
  const params = searchParams;
  const rating = typeof params.rating === "string" ? params.rating : "";

  return (
    <ThankYouContent
      usefulnessRating={rating ? parseInt(rating, 10) : 0}
    />
  );
}

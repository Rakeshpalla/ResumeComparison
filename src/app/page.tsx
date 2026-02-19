import { redirect } from "next/navigation";

export default function HomePage() {
  const requireLogin = process.env.REQUIRE_LOGIN === "true";
  redirect(requireLogin ? "/login" : "/upload");
}

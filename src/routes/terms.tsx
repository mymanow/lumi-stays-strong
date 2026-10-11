import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/hold/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Conditions d'utilisation — Hold" },
      { name: "description", content: "Hold est réservé aux adultes et n'est pas un service médical." },
      { property: "og:title", content: "Conditions d'utilisation — Hold" },
      { property: "og:description", content: "Hold est réservé aux adultes et n'est pas un service médical." },
    ],
  }),
  component: () => <LegalPage kind="terms" />,
});

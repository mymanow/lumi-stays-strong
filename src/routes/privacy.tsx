import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/hold/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Confidentialité — Hold" },
      { name: "description", content: "Ce que Hold stocke, ce qui est envoyé au coach, et pourquoi tes messages non envoyés ne quittent jamais ton appareil." },
      { property: "og:title", content: "Confidentialité — Hold" },
      { property: "og:description", content: "Ce que Hold stocke et ce qui est envoyé au coach." },
    ],
  }),
  component: () => <LegalPage kind="privacy" />,
});

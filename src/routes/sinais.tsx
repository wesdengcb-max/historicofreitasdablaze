import { createFileRoute } from "@tanstack/react-router";
import { SinaisPage } from "@/components/sections/SinaisSection";

export const Route = createFileRoute("/sinais")({
  head: () => ({
    meta: [
      { title: "Sinais · Freitas da Blaze" },
      { name: "description", content: "Sinais ao vivo com horários projetados e status de confirmação." },
      { property: "og:title", content: "Sinais · Freitas da Blaze" },
      { property: "og:description", content: "Sinais ao vivo com horários projetados e status de confirmação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SinaisPage,
});

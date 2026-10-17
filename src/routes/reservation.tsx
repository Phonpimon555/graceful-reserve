import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/reservation")({
  head: () => ({ meta: [
    { title: "Reservations · Riverside Kitchen" },
    { name: "description", content: "Reserve a table at Riverside Kitchen." },
    { property: "og:title", content: "Reservations · Riverside Kitchen" },
    { property: "og:description", content: "Reserve a table at Riverside Kitchen." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Navigate to="/" />,
});

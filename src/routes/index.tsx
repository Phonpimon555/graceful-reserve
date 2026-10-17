import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Welcome · Riverside Kitchen" },
    { name: "description", content: "Riverside Kitchen lakeside Thai dining and table reservations." },
    { property: "og:title", content: "Welcome · Riverside Kitchen" },
    { property: "og:description", content: "Riverside Kitchen lakeside Thai dining and table reservations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <Navigate to="/login" />,
});
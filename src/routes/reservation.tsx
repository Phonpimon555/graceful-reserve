import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/reservation")({
  component: () => <Navigate to="/" />,
});

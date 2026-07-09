import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  component: History,
});

function History() {
  return (
    <div className="min-h-screen flex items-center justify-center text-3xl font-bold">
      ประวัติการจอง (Coming Soon)
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-black text-white p-4 text-center font-sans">
      <h1 className="text-xl">olá como está? vamos em ajudar hoje?</h1>
    </div>
  ),
});

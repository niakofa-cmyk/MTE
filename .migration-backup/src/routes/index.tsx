import { createFileRoute } from "@tanstack/react-router";
import { Mission } from "@/game/Mission";

export const Route = createFileRoute("/")({
  component: Mission,
});

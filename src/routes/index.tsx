import { createFileRoute } from "@tanstack/react-router";
import { SavepressApp } from "@/components/savepress/app";

export const Route = createFileRoute("/")({ component: SavepressApp });

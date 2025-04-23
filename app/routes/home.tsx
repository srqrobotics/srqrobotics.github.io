import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Circuit Smith" },
    { name: "ToolKit for DIY Circuits", content: "Welcome to Circuit Smith!" },
  ];
}

export default function Home() {
  return null;
}

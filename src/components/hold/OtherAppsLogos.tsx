import { useState } from "react";
import { Bot, MessageCircle, Search, Sparkles, type LucideIcon } from "lucide-react";

/**
 * Logos of the general-purpose AI apps on the "Les autres applis" card. Drop the official logo of each brand
 * (from its press kit, respecting its brand guidelines) in public/brands/ under these names. Until a file is there,
 * a neutral icon is shown in its place: no logo is drawn by hand.
 */
const APPS: { name: string; src: string; Fallback: LucideIcon }[] = [
  { name: "ChatGPT", src: "/brands/chatgpt.svg", Fallback: MessageCircle },
  { name: "Claude", src: "/brands/claude.svg", Fallback: Sparkles },
  { name: "Gemini", src: "/brands/gemini.svg", Fallback: Bot },
  { name: "Perplexity", src: "/brands/perplexity.svg", Fallback: Search },
];

function Logo({ name, src, Fallback, first }: (typeof APPS)[number] & { first: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-[#3b3f8f] ${first ? "" : "-ml-2.5"}`}>
      {failed
        ? <Fallback aria-hidden size={15} className="text-[#2e3865]" />
        : <img src={src} alt="" width={32} height={32} className="h-full w-full object-contain p-1" onError={() => setFailed(true)} />}
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function OtherAppsLogos() {
  return (
    <div className="mt-3 flex justify-center" aria-label={APPS.map((a) => a.name).join(", ")} role="img">
      {APPS.map((a, i) => <Logo key={a.name} {...a} first={i === 0} />)}
    </div>
  );
}

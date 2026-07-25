const avatarColors: Record<string, string> = {
  "bg-amber-500": "bg-amber-500",
  "bg-emerald-500": "bg-emerald-500",
  "bg-indigo-500": "bg-indigo-500",
  "bg-purple-500": "bg-purple-500",
  "bg-rose-500": "bg-rose-500",
  "bg-sky-500": "bg-sky-500",
};

export function getAgentAvatarColor(color: string) {
  return avatarColors[color] ?? "bg-slate-500";
}

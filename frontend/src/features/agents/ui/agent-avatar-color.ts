const avatarColors: Record<string, string> = {
  "bg-amber-500": "bg-chart-4 text-foreground",
  "bg-emerald-500": "bg-chart-2 text-primary-foreground",
  "bg-indigo-500": "bg-primary text-foreground",
  "bg-purple-500": "bg-chart-5 text-foreground",
  "bg-rose-500": "bg-chart-1 text-foreground",
  "bg-sky-500": "bg-chart-3 text-primary-foreground",
};

export function getAgentAvatarColor(color: string): string {
  return avatarColors[color] ?? "bg-secondary text-foreground";
}

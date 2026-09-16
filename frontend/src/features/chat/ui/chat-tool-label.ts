const TOOL_LABEL_KEYS: Record<string, string> = {
  get_domain_topics: "CHAT_UI.TOOL_GET_DOMAIN_TOPICS",
  get_topic_detail: "CHAT_UI.TOOL_GET_TOPIC_DETAIL",
  list_domains: "CHAT_UI.TOOL_LIST_DOMAINS",
  search_knowledge: "CHAT_UI.TOOL_SEARCH_KNOWLEDGE",
};

export function chatToolLabelKey(name: string): string {
  return TOOL_LABEL_KEYS[name] ?? "CHAT_UI.TOOL_GENERIC";
}

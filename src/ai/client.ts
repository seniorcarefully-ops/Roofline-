import Anthropic from "@anthropic-ai/sdk";

/** Shared Claude client. Reads ANTHROPIC_API_KEY (set on Render; never logged). */
export const claude = new Anthropic();

/** Model for customer-facing conversations (owner may change per route after measuring). */
export const CONVERSATION_MODEL = "claude-opus-5-5";

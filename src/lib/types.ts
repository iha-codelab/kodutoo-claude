// JSON shapes shared by the API routes and the client.

export type PromptDTO = {
  id: string;
  slug: string | null;
  name: string;
  content: string;
};

export type MessageDTO = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachmentName: string | null;
  createdAt: string;
};

export type ConversationSummaryDTO = {
  id: string;
  title: string | null;
  createdAt: string;
};

export type ConversationDTO = ConversationSummaryDTO & {
  promptId: string | null;
  model: string;
  temperature: number;
  topP: number;
  messages: MessageDTO[];
};

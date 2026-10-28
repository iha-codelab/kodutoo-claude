import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, readJson } from "@/lib/api";
import { LIMITS, MOCK_REPLY_DELAY_MS } from "@/lib/constants";
import { generateMockReply, styleForPromptSlug } from "@/lib/mock";
import { optionalAttachmentName, requireText } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function makeTitle(text: string) {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > LIMITS.title ? `${oneLine.slice(0, LIMITS.title).trimEnd()}…` : oneLine;
}

// Saves the user's message, waits to simulate "typing", then saves a mock reply.
export const POST = handle(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const body = await readJson(request);
  const content = requireText(body.content, "Sõnum", LIMITS.message);
  const attachmentName = optionalAttachmentName(body.attachmentName);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { prompt: { select: { slug: true } } },
  });
  if (!conversation) throw new ApiError(404, "Vestlust ei leitud. Võimalik, et see on kustutatud.");

  const userMessage = await prisma.message.create({
    data: { conversationId: id, role: "user", content, attachmentName },
  });

  let title = conversation.title;
  if (!title) {
    title = makeTitle(content);
    await prisma.conversation.update({ where: { id }, data: { title } });
  }

  await sleep(MOCK_REPLY_DELAY_MS);

  let reply = generateMockReply(content, styleForPromptSlug(conversation.prompt?.slug));
  if (attachmentName) {
    reply = `(Demo ei loe manuste sisu – nägin ainult faili nime „${attachmentName}“.)\n\n${reply}`;
  }

  const assistantMessage = await prisma.message.create({
    data: { conversationId: id, role: "assistant", content: reply },
  });

  return NextResponse.json({ userMessage, assistantMessage, title }, { status: 201 });
});

// "Tühjenda vestlus": removes all messages but keeps the conversation and its settings.
export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  const exists = await prisma.conversation.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new ApiError(404, "Vestlust ei leitud. Võimalik, et see on kustutatud.");
  const { count } = await prisma.message.deleteMany({ where: { conversationId: id } });
  return NextResponse.json({ ok: true, deleted: count });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/api";
import { DEFAULT_PROMPT_SLUG } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, createdAt: true },
  });
  return NextResponse.json(conversations);
});

export const POST = handle(async () => {
  const defaultPrompt = await prisma.prompt.findUnique({ where: { slug: DEFAULT_PROMPT_SLUG } });
  const conversation = await prisma.conversation.create({
    data: { promptId: defaultPrompt?.id ?? null },
    include: { messages: true },
  });
  return NextResponse.json(conversation, { status: 201 });
});

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, readJson } from "@/lib/api";
import { LIMITS } from "@/lib/constants";
import { requireText } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const body = await readJson(request);
  const prompt = await prisma.prompt.update({
    where: { id },
    data: {
      name: requireText(body.name, "Prompti nimi", LIMITS.promptName),
      content: requireText(body.content, "Prompti tekst", LIMITS.promptContent),
    },
    select: { id: true, slug: true, name: true, content: true },
  });
  return NextResponse.json(prompt);
});

// Conversations using this prompt are kept; their promptId becomes null (onDelete: SetNull).
export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  await prisma.prompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

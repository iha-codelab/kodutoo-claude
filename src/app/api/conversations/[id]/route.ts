import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, handle, readJson } from "@/lib/api";
import { parseModel, parseOptionalId, parseUnitNumber } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) throw new ApiError(404, "Vestlust ei leitud. Võimalik, et see on kustutatud.");
  return NextResponse.json(conversation);
});

export const PATCH = handle(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const body = await readJson(request);

  const data: { promptId?: string | null; model?: string; temperature?: number; topP?: number } = {};
  if ("promptId" in body) {
    data.promptId = parseOptionalId(body.promptId);
    if (data.promptId) {
      const prompt = await prisma.prompt.findUnique({ where: { id: data.promptId } });
      if (!prompt) throw new ApiError(400, "Valitud prompti ei leitud. Võimalik, et see on kustutatud.");
    }
  }
  if ("model" in body) data.model = parseModel(body.model);
  if ("temperature" in body) data.temperature = parseUnitNumber(body.temperature, "Temperature");
  if ("topP" in body) data.topP = parseUnitNumber(body.topP, "Top-P");

  const conversation = await prisma.conversation.update({
    where: { id },
    data,
    select: { id: true, promptId: true, model: true, temperature: true, topP: true },
  });
  return NextResponse.json(conversation);
});

export const DELETE = handle(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});

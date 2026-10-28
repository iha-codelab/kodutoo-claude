import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handle, readJson } from "@/lib/api";
import { LIMITS } from "@/lib/constants";
import { requireText } from "@/lib/validation";

export const dynamic = "force-dynamic";

const select = { id: true, slug: true, name: true, content: true } as const;

export const GET = handle(async () => {
  const prompts = await prisma.prompt.findMany({ orderBy: { createdAt: "asc" }, select });
  return NextResponse.json(prompts);
});

export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const prompt = await prisma.prompt.create({
    data: {
      name: requireText(body.name, "Prompti nimi", LIMITS.promptName),
      content: requireText(body.content, "Prompti tekst", LIMITS.promptContent),
    },
    select,
  });
  return NextResponse.json(prompt, { status: 201 });
});

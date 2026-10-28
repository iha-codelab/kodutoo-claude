import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new ApiError(400, "Päring oli vigane. Palun proovige uuesti.");
}

/** Wraps a route handler and turns thrown errors into friendly Estonian JSON errors. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError) return jsonError(error.status, error.message);
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2025" || error.code === "P2003")) {
        return jsonError(404, "Kirjet ei leitud. Võimalik, et see on juba kustutatud.");
      }
      if (error instanceof Prisma.PrismaClientInitializationError) {
        console.error(error);
        return jsonError(503, "Andmebaasiga ei õnnestunud ühendust saada. Palun proovige hiljem uuesti.");
      }
      console.error(error);
      return jsonError(500, "Midagi läks valesti. Palun proovige uuesti.");
    }
  };
}

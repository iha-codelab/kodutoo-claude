import { ApiError } from "./api";
import { LIMITS, MODELS, type ModelName } from "./constants";

export function requireText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApiError(400, `${label} ei tohi olla tühi.`);
  }
  const text = value.trim();
  if (text.length > max) throw new ApiError(400, `${label} võib olla kuni ${max} tähemärki pikk.`);
  return text;
}

export function optionalAttachmentName(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(400, "Faili nimi on vigane.");
  return value.trim().slice(0, LIMITS.attachmentName) || null;
}

export function parseModel(value: unknown): ModelName {
  if (typeof value !== "string" || !MODELS.includes(value as ModelName)) {
    throw new ApiError(400, "Valitud mudel ei ole lubatud.");
  }
  return value as ModelName;
}

export function parseUnitNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ApiError(400, `${label} peab olema arv vahemikus 0 kuni 1.`);
  }
  return Math.round(value * 100) / 100;
}

export function parseOptionalId(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    throw new ApiError(400, "Valitud prompt on vigane.");
  }
  return value;
}

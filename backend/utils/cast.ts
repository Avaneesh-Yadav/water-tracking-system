/**
 * Cast mysql2 pool.query callback results for strict-ish typing without full refactor.
 */
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export function rows<T extends RowDataPacket = RowDataPacket>(value: unknown): T[] {
  return (value as T[]) ?? [];
}

export function resultHeader(value: unknown): ResultSetHeader {
  return value as ResultSetHeader;
}

export function queryString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return fallback;
}

/** Loosen unknown callback payloads during incremental typing. */
export type LooseRecord = Record<string, unknown>;

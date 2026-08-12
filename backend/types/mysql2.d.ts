import type { OkPacket, ResultSetHeader, RowDataPacket } from "mysql2";

declare module "mysql2" {
  interface Pool {
    query<T extends RowDataPacket[] | ResultSetHeader | OkPacket = RowDataPacket[]>(
      sql: string,
      values?: unknown,
      callback?: (err: Error | null, results: T, fields?: unknown) => void
    ): void;
  }
}

export {};

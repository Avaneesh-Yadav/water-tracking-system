import type { ResultSetHeader, RowDataPacket } from "mysql2";

export type QueryError = Error | null;

export type QueryRows<T extends RowDataPacket = RowDataPacket> = T[];

export type RowsCallback<T extends RowDataPacket = RowDataPacket> = (
  err: QueryError,
  results?: QueryRows<T>
) => void;

export type ResultCallback = (err: QueryError, result?: ResultSetHeader) => void;

export type CountRow = RowDataPacket & { total: number };

export type SettingRow = RowDataPacket & {
  setting_key: string;
  setting_value: string;
  updated_at?: Date;
};

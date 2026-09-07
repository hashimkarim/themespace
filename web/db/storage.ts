export type SqlValue = string | number | null;

export interface StorageQuery {
  bind(...values: SqlValue[]): StorageQuery;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface ThemeStorage {
  prepare(sql: string): StorageQuery;
  batch(statements: string[]): Promise<unknown>;
}

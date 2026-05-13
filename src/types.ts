export type CellValue = string | number | boolean | bigint | null | undefined;

export interface QueryResult {
  columns: string[];
  rows: CellValue[][];
}

import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";
declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right" | "center";
  }
  interface TableMeta<TData extends RowData> {
    accountName?: (id: string) => string;
    categoryName?: (id: string) => string;
  }
}

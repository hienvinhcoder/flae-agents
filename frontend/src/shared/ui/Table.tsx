import type { ReactNode } from 'react';

export interface TableColumn<Row> {
  header: string;
  key: string;
  render: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  caption: string;
  columns: readonly TableColumn<Row>[];
  emptyMessage: string;
  getRowKey?: (row: Row, index: number) => string;
  renderMobileRow?: (row: Row, index: number) => ReactNode;
  rows: readonly Row[];
}

export function Table<Row>({ caption, columns, emptyMessage, getRowKey, renderMobileRow, rows }: TableProps<Row>) {
  return (
    <div className="grid gap-3">
      {renderMobileRow ? (
        <div className="grid gap-3 md:hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-10 text-center text-ui-ink-muted">{emptyMessage}</p>
          ) : rows.map((row, index) => (
            <div key={getRowKey?.(row, index) ?? String(index)}>{renderMobileRow(row, index)}</div>
          ))}
        </div>
      ) : null}
      <div className={renderMobileRow ? 'hidden overflow-x-auto md:block' : 'overflow-x-auto'}>
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-y border-ui-divider bg-ui-raised/55 text-ui-ink-secondary">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3 font-semibold" key={column.key} scope="col">{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-divider">
            {rows.length === 0 ? (
              <tr><td className="px-4 py-10 text-center text-ui-ink-muted" colSpan={columns.length}>{emptyMessage}</td></tr>
            ) : rows.map((row, index) => (
              <tr className="transition-colors duration-200 hover:bg-ui-interactive motion-reduce:transition-none" key={getRowKey?.(row, index) ?? String(index)}>
                {columns.map((column) => <td className="px-4 py-3 text-ui-ink-secondary" key={column.key}>{column.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

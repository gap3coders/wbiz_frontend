import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No data yet',
  emptyDescription = 'Data will appear here once available.',
  onRowClick,
  sortKey,
  sortDir,
  onSort,
  className = '',
}) {
  return (
    <div className={`bg-white border border-surface-200 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-4 py-3 text-left text-sm font-semibold text-surface-600
                    ${col.sortable ? 'cursor-pointer hover:text-surface-800 select-none' : ''}
                    ${col.width || ''}
                  `}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <div className="skeleton h-5 w-3/4 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center">
                      <Inbox className="w-6 h-6 text-surface-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-700">{emptyTitle}</p>
                      <p className="text-sm text-surface-500 mt-0.5">{emptyDescription}</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row._id || row.id || i}
                  className={`
                    hover:bg-surface-50 transition-colors
                    ${onRowClick ? 'cursor-pointer' : ''}
                  `}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5 text-sm text-surface-700">
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

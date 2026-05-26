import { PanelFooter } from "./PanelFooter";

type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Keep footer visible so paired cards stay the same height */
  alwaysShow?: boolean;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  alwaysShow = false,
}: PaginationProps) {
  if (totalPages <= 1 && !alwaysShow) {
    return null;
  }

  const singlePage = totalPages <= 1;

  return (
    <PanelFooter className={singlePage ? "justify-center" : "justify-between"}>
      {singlePage ? (
        <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Page 1 Of 1
        </span>
      ) : (
        <>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-bold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Page {page} Of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-bold uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </>
      )}
    </PanelFooter>
  );
}

export const PAGE_SIZE = 5;

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(count: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize));
}

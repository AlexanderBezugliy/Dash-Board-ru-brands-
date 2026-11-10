import { useEffect, useState } from "react"
import { BookX, ChevronsRight, List, MapPinned, ShieldAlert, Unplug } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  countFor,
  filters,
  formatCheckedAt,
  type DomainCheck,
  type FilterId,
} from "@/lib/records"

const icons: Record<FilterId, LucideIcon> = {
  all: List,
  http: Unplug,
  ru: MapPinned,
  rkn: ShieldAlert,
  index: BookX,
}

export function AppSidebar({
  filter,
  onFilter,
  rows,
  checkedAt,
}: {
  filter: FilterId
  onFilter: (filter: FilterId) => void
  rows: DomainCheck[]
  checkedAt: string | null
}) {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setOpen(false)
  }, [])

  return (
    <nav
      className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-gray-200 bg-white p-2 shadow-sm transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 ${
        open ? "w-64" : "w-16"
      }`}
    >
      <div className="mb-6 border-b border-gray-200 pb-4 dark:border-gray-800">
        <div className="flex items-center gap-3 rounded-md p-2">
          <div className="grid size-10 shrink-0 place-content-center rounded-lg bg-blue-600 text-white shadow-sm">
            <List className="h-5 w-5" />
          </div>
          {open ? (
            <div>
              <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                Проверка сайтов
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                {rows.length} доменов
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        {filters.map((item) => {
          const Icon = icons[item.id]
          const count = countFor(rows, item.id, checkedAt)
          const selected = filter === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              title={item.label}
              onClick={() => onFilter(item.id)}
              className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
                selected
                  ? "border-l-2 border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <div className="grid h-full w-12 place-content-center">
                <Icon className="h-4 w-4" />
              </div>
              {open ? <span className="text-sm font-medium">{item.label}</span> : null}
              {count !== null && open ? (
                <span className="absolute right-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1 text-xs font-medium text-white dark:bg-blue-600">
                  {count}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-auto">
        {open ? (
          <p className="px-3 pb-3 text-xs leading-snug text-gray-500 dark:text-gray-400">
            {formatCheckedAt(checkedAt)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="w-full border-t border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
        >
          <div className="flex items-center p-3">
            <div className="grid size-10 place-content-center">
              <ChevronsRight
                className={`h-4 w-4 text-gray-500 transition-transform duration-300 dark:text-gray-400 ${
                  open ? "rotate-180" : ""
                }`}
              />
            </div>
            {open ? (
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Скрыть</span>
            ) : null}
          </div>
        </button>
      </div>
    </nav>
  )
}

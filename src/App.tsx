import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { AppSidebar } from "@/components/app-sidebar"
import { DomainTable } from "@/components/domain-table"
import { Input } from "@/components/ui/input"
import { filterRows, loadRows, summaryText, type FilterId } from "@/lib/records"

const loaded = loadRows()

export default function App() {
  const [filter, setFilter] = useState<FilterId>("all")
  const [query, setQuery] = useState("")
  const [isDark, setIsDark] = useState(false)
  const visible = filterRows(loaded.rows, filter, query)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    document.documentElement.style.colorScheme = isDark ? "dark" : "light"
  }, [isDark])

  return (
    <div className="flex min-h-screen w-full bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <AppSidebar
        filter={filter}
        onFilter={setFilter}
        rows={loaded.rows}
        checkedAt={loaded.checkedAt}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-gray-50 p-4 md:p-6 dark:bg-gray-950">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Домены</h1>
            <p className="mt-1 max-w-[62ch] text-gray-600 dark:text-gray-400">
              {summaryText(loaded.rows, loaded.checkedAt)}
            </p>
          </div>
          <div className="flex items-end gap-3">
            <form
              role="search"
              className="w-full sm:w-72"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="domain-search" className="mb-1 block text-sm text-gray-600 dark:text-gray-400">
                Найти домен
              </label>
              <Input
                id="domain-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="casinotopru.com"
                autoComplete="off"
                spellCheck={false}
                className="h-10 border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              />
            </form>
            <button
              type="button"
              aria-pressed={isDark}
              onClick={() => setIsDark((value) => !value)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">{isDark ? "Светлая тема" : "Тёмная тема"}</span>
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <DomainTable rows={visible} query={query} />
        </div>
      </div>
    </div>
  )
}

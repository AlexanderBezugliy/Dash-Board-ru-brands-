import { useState, type CSSProperties } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { DomainTable } from "@/components/domain-table"
import { Input } from "@/components/ui/input"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { filterRows, loadRows, summaryText, type FilterId } from "@/lib/records"

const loaded = loadRows()

export default function App() {
  const [filter, setFilter] = useState<FilterId>("all")
  const [query, setQuery] = useState("")
  const visible = filterRows(loaded.rows, filter, query)

  return (
    <TooltipProvider>
      <SidebarProvider style={{ "--sidebar-width": "17.5rem" } as CSSProperties}>
        <AppSidebar
          filter={filter}
          onFilter={setFilter}
          rows={loaded.rows}
          checkedAt={loaded.checkedAt}
        />
        <SidebarInset className="flex h-svh min-w-0 flex-col bg-background">
          <header className="flex shrink-0 flex-col gap-4 border-b border-border px-4 py-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-2">
              <SidebarTrigger className="mt-0.5" />
              <div>
                <h1 className="text-2xl leading-none font-medium tracking-tight">Домены</h1>
                <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-muted-foreground">
                  {summaryText(loaded.rows, loaded.checkedAt)}
                </p>
              </div>
            </div>
            <form
              role="search"
              className="w-full md:w-72"
              onSubmit={(event) => event.preventDefault()}
            >
              <label htmlFor="domain-search" className="mb-1 block text-sm">
                Найти домен
              </label>
              <Input
                id="domain-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="casinotopru.com"
                autoComplete="off"
                spellCheck={false}
              />
            </form>
          </header>
          <DomainTable rows={visible} query={query} />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

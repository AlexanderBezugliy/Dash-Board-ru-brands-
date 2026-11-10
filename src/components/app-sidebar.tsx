import { BookX, List, MapPinned, ShieldAlert, Unplug } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
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
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2 px-3 py-4">
        <p className="text-lg leading-tight font-medium tracking-tight group-data-[collapsible=icon]:hidden">
          Проверка сайтов
        </p>
        <p className="text-sm leading-snug text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden">
          Четыре проверки на каждый домен.
        </p>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Показать</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filters.map((item) => {
                const Icon = icons[item.id]
                const count = countFor(rows, item.id, checkedAt)
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      type="button"
                      isActive={filter === item.id}
                      tooltip={item.label}
                      aria-pressed={filter === item.id}
                      onClick={() => onFilter(item.id)}
                      className="rounded-none"
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {count !== null ? <SidebarMenuBadge>{count}</SidebarMenuBadge> : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <p className="px-2 pb-2 text-sm leading-snug text-sidebar-foreground/75">
          {formatCheckedAt(checkedAt)}
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

import sitesDocument from "../../data/sites.json" with { type: "json" }
import statusDocument from "../../data/status.json" with { type: "json" }

export const filters = [
  { id: "all", label: "Все домены" },
  { id: "http", label: "Не отвечают" },
  { id: "ru", label: "Не открылись в РФ" },
  { id: "rkn", label: "В реестре" },
  { id: "index", label: "Без индекса" },
] as const

export type FilterId = (typeof filters)[number]["id"]

export type RuState = "pending" | "done" | "no-probe" | "error"

export type DomainCheck = {
  domain: string
  http: { code: number | null; alive: boolean | null; error: string | null }
  ru: { code: number | null; state: RuState; error: string | null }
  rkn: { listed: boolean | null; error: string | null }
  yandex: { indexed: number | null; error: string | null }
}

const numberFormat = new Intl.NumberFormat("ru-RU")
const checkedAtFormat = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function pendingCheck(domain: string): DomainCheck {
  return {
    domain,
    http: { code: null, alive: null, error: null },
    ru: { code: null, state: "pending", error: null },
    rkn: { listed: null, error: null },
    yandex: { indexed: null, error: null },
  }
}

function ruState(value: unknown): RuState {
  if (value === "done" || value === "no-probe" || value === "error" || value === "pending") {
    return value
  }
  return "pending"
}

function readCheck(domain: string, value: unknown): DomainCheck {
  if (!isRecord(value)) return pendingCheck(domain)
  const http = isRecord(value.http) ? value.http : {}
  const ru = isRecord(value.ru) ? value.ru : {}
  const rkn = isRecord(value.rkn) ? value.rkn : {}
  const yandex = isRecord(value.yandex) ? value.yandex : {}
  return {
    domain,
    http: {
      code: nullableNumber(http.code),
      alive: nullableBoolean(http.alive),
      error: nullableString(http.error),
    },
    ru: {
      code: nullableNumber(ru.code),
      state: ruState(ru.state),
      error: nullableString(ru.error),
    },
    rkn: {
      listed: nullableBoolean(rkn.listed),
      error: nullableString(rkn.error),
    },
    yandex: {
      indexed: nullableNumber(yandex.indexed),
      error: nullableString(yandex.error),
    },
  }
}

function siteDomains(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.domains)) return []
  return value.domains.filter((item): item is string => typeof item === "string" && item.length > 0)
}

export function loadRows(): { checkedAt: string | null; rows: DomainCheck[] } {
  const sites = siteDomains(sitesDocument)
  const byDomain = new Map<string, unknown>()
  let checkedAt: string | null = null
  if (isRecord(statusDocument)) {
    checkedAt = nullableString(statusDocument.checkedAt)
    if (Array.isArray(statusDocument.domains)) {
      for (const item of statusDocument.domains) {
        if (isRecord(item) && typeof item.domain === "string") {
          byDomain.set(item.domain, item)
        }
      }
    }
  }
  return {
    checkedAt,
    rows: sites.map((domain) => readCheck(domain, byDomain.get(domain))),
  }
}

export function matchesFilter(row: DomainCheck, filter: FilterId): boolean {
  if (filter === "all") return true
  if (filter === "http") return row.http.alive === false
  if (filter === "ru") {
    if (row.ru.state === "pending" || row.ru.state === "no-probe") return false
    if (row.ru.state === "done") return row.ru.code !== 200
    return row.ru.error !== "нет токена Globalping"
  }
  if (filter === "rkn") return row.rkn.listed === true
  return row.yandex.indexed === 0 || (row.yandex.indexed === null && row.yandex.error !== null)
}

export function filterRows(rows: DomainCheck[], filter: FilterId, query: string): DomainCheck[] {
  const needle = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (!matchesFilter(row, filter)) return false
    if (!needle) return true
    return row.domain.toLowerCase().includes(needle)
  })
}

export function countFor(rows: DomainCheck[], filter: FilterId, checkedAt: string | null): number | null {
  if (filter !== "all" && checkedAt === null) return null
  return rows.filter((row) => matchesFilter(row, filter)).length
}

function domainsWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return "домен"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "домена"
  return "доменов"
}

export function summaryText(rows: DomainCheck[], checkedAt: string | null): string {
  const total = rows.length
  if (!checkedAt) {
    return `В списке ${total} ${domainsWord(total)}. Результаты появятся после первой проверки.`
  }
  const httpDown = rows.filter((row) => row.http.alive === false).length
  const ruDown = rows.filter((row) => matchesFilter(row, "ru")).length
  const noProbe = rows.filter((row) => row.ru.state === "no-probe").length
  const listed = rows.filter((row) => row.rkn.listed === true).length
  const noAccess = rows.filter((row) => row.yandex.error === "нет доступа").length
  const sentences = [
    httpDown === 0
      ? "Все сайты ответили кодом 200."
      : `Не ответили ${httpDown} из ${total}.`,
  ]
  if (ruDown > 0) sentences.push(`Из России не открылись ${ruDown}.`)
  if (noProbe > 0) sentences.push(`Без российского зонда ${noProbe}.`)
  sentences.push(listed === 0 ? "В реестре РКН никого нет." : `В реестре РКН ${listed}.`)
  if (noAccess > 0) sentences.push("К Яндексу нет доступа.")
  return sentences.join(" ")
}

export function formatCheckedAt(value: string | null): string {
  if (!value) return "Проверка ещё не запускалась."
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Время проверки не разобрать."
  return `Последняя проверка ${checkedAtFormat.format(date)}.`
}

export function formatIndexed(value: number): string {
  return numberFormat.format(value)
}

export function rowHasProblem(row: DomainCheck): boolean {
  if (row.http.alive === false) return true
  if (row.ru.state === "done" && row.ru.code !== 200) return true
  return row.rkn.listed === true
}

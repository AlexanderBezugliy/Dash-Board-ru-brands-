import { formatIndexed, rowHasProblem, type DomainCheck } from "@/lib/records"

function toneClass(tone: "plain" | "quiet" | "stamp" | "alive" | "alarm"): string {
  if (tone === "alive") return "text-alive"
  if (tone === "stamp") return "text-stamp"
  if (tone === "alarm") return "text-alarm"
  if (tone === "quiet") return "text-muted-foreground"
  return "text-foreground"
}

function HttpCell({ row }: { row: DomainCheck }) {
  if (row.http.code === null && row.http.alive === null && row.http.error === null) {
    return <span className={toneClass("quiet")}>ожидание</span>
  }
  if (row.http.code === 200) return <span className={toneClass("alive")}>200</span>
  if (row.http.code !== null) return <span className={toneClass("alarm")}>{row.http.code}</span>
  return <span className={toneClass("alarm")}>{row.http.error ?? "нет ответа"}</span>
}

function RuCell({ row }: { row: DomainCheck }) {
  if (row.ru.state === "pending") return <span className={toneClass("quiet")}>ожидание</span>
  if (row.ru.state === "no-probe") {
    return (
      <abbr
        title="Зонда в России не нашлось. Это не ответ сайта."
        className={`${toneClass("plain")} no-underline`}
      >
        нет зонда
      </abbr>
    )
  }
  if (row.ru.state === "done" && row.ru.code === 200) {
    return <span className={toneClass("alive")}>200</span>
  }
  if (row.ru.state === "done" && row.ru.code !== null) {
    return <span className={toneClass("alarm")}>{row.ru.code}</span>
  }
  return <span className={toneClass("quiet")}>{row.ru.error ?? "ошибка проверки"}</span>
}

function RknCell({ row }: { row: DomainCheck }) {
  if (row.rkn.listed === null && row.rkn.error === null) {
    return <span className={toneClass("quiet")}>ожидание</span>
  }
  if (row.rkn.listed === true) return <span className={toneClass("alarm")}>в реестре</span>
  if (row.rkn.listed === false) return <span className={toneClass("quiet")}>не числится</span>
  return <span className={toneClass("quiet")}>{row.rkn.error ?? "реестр не получен"}</span>
}

function YandexCell({ row }: { row: DomainCheck }) {
  if (row.yandex.indexed === null && row.yandex.error === null) {
    return <span className={toneClass("quiet")}>ожидание</span>
  }
  if (row.yandex.error === "нет доступа") {
    return <span className={toneClass("plain")}>нет доступа</span>
  }
  if (row.yandex.indexed === null) {
    return <span className={toneClass("quiet")}>{row.yandex.error ?? "нет числа"}</span>
  }
  if (row.yandex.indexed === 0) return <span className={toneClass("alarm")}>0</span>
  return <span className={toneClass("stamp")}>{formatIndexed(row.yandex.indexed)}</span>
}

export function DomainTable({ rows, query }: { rows: DomainCheck[]; query: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">Результаты проверки доменов</caption>
        <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
          <tr className="border-b border-gray-200 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th scope="col" className="px-4 py-3 font-normal">
              Домен
            </th>
            <th scope="col" className="px-3 py-3 font-normal">
              Ответ сервера
            </th>
            <th scope="col" className="px-3 py-3 font-normal">
              Из России
            </th>
            <th scope="col" className="px-3 py-3 font-normal">
              Реестр РКН
            </th>
            <th scope="col" className="px-3 py-3 font-normal">
              Страницы в Яндексе
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-gray-500 dark:text-gray-400">
                {query.trim()
                  ? "Такого домена нет в списке."
                  : "В этом списке пусто."}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.domain}
                className={
                  rowHasProblem(row)
                    ? "border-b border-gray-200 shadow-[inset_3px_0_0_var(--alarm)] dark:border-gray-800"
                    : "border-b border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                }
              >
                <th
                  scope="row"
                  className="font-domain px-4 py-3 text-left text-xl leading-none font-semibold whitespace-nowrap text-gray-900 dark:text-gray-100"
                >
                  {row.domain}
                </th>
                <td className="px-3 py-3 text-sm tabular-nums">
                  <HttpCell row={row} />
                </td>
                <td className="px-3 py-3 text-sm tabular-nums">
                  <RuCell row={row} />
                </td>
                <td className="px-3 py-3 text-sm">
                  <RknCell row={row} />
                </td>
                <td className="px-3 py-3 text-sm tabular-nums">
                  <YandexCell row={row} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

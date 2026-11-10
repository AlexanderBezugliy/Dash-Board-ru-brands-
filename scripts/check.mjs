import { readFile, rename, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// Позже: если заданы TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID,
// после записи data/status.json отправить одно сообщение со списком доменов,
// которые не ответили, не открылись из России, попали в реестр РКН
// или остались без доступа к Яндексу. Сейчас Telegram не вызывается.

async function loadEnvFile() {
  let text = ""
  try {
    text = await readFile(join(root, ".env"), "utf8")
  } catch {
    return
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function normalizeDomain(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\.$/, "")
    .split("/")[0]
    .split(":")[0]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await worker(items[index], index)
    }
  }
  const width = Math.max(1, Math.min(limit, items.length))
  await Promise.all(Array.from({ length: width }, () => run()))
  return results
}

async function readJsonResponse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function checkHttp(domain) {
  try {
    const response = await fetch(`https://${domain}/`, {
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "RuBrandsCheck/1.0",
      },
    })
    return {
      code: response.status,
      alive: response.status === 200,
      error: null,
    }
  } catch {
    return { code: null, alive: false, error: "нет ответа" }
  }
}

async function globalping(url, options, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30000),
    })
    if (response.status === 429 && attempt < retries) {
      const reset = Number(response.headers.get("x-ratelimit-reset"))
      const wait = Number.isFinite(reset) && reset > 0 ? Math.min(reset * 1000, 20000) : 3000 * (attempt + 1)
      await sleep(wait)
      continue
    }
    const body = await readJsonResponse(response)
    return { response, body }
  }
  return { response: null, body: null }
}

function ruFromMeasurement(body) {
  const results = Array.isArray(body?.results) ? body.results : []
  if (body?.probesCount === 0 || results.length === 0) {
    return { code: null, state: "no-probe", error: null }
  }
  const result = results[0]?.result
  if (!result || result.status === "in-progress") return null
  if (typeof result.statusCode === "number" && result.statusCode > 0) {
    return { code: result.statusCode, state: "done", error: null }
  }
  return { code: null, state: "error", error: "запрос с зонда не выполнен" }
}

async function createMeasurement(domain, token) {
  const payloads = [
    {
      type: "http",
      target: `https://${domain}`,
      locations: [{ country: "RU" }],
      measurementOptions: { request: { method: "GET" } },
    },
    {
      type: "http",
      target: domain,
      locations: [{ country: "RU" }],
      measurementOptions: {
        protocol: "HTTPS",
        request: { method: "GET", path: "/" },
      },
    },
  ]
  for (const payload of payloads) {
    const { response, body } = await globalping("https://api.globalping.io/v1/measurements", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    if (!response) return { error: "ошибка Globalping" }
    if (response.status === 422 && body?.error?.type === "no_probes_found") {
      return { noProbe: true }
    }
    if (response.status === 400 || response.status === 422) continue
    if (!response.ok) return { error: "ошибка Globalping" }
    if (!body?.id || body.probesCount === 0) return { noProbe: true }
    return { id: body.id }
  }
  return { error: "ошибка Globalping" }
}

async function pollMeasurement(id, token) {
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    const { response, body } = await globalping(`https://api.globalping.io/v1/measurements/${id}`, {
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    })
    if (!response || !response.ok) return { code: null, state: "error", error: "ошибка Globalping" }
    const parsed = ruFromMeasurement(body)
    if (body?.status === "finished") {
      return parsed ?? { code: null, state: "error", error: "нет кода ответа" }
    }
    if (parsed && parsed.state !== "no-probe") return parsed
    await sleep(2000)
  }
  return { code: null, state: "error", error: "таймаут измерения" }
}

async function checkRu(domain, token) {
  if (!token) return { code: null, state: "error", error: "нет токена Globalping" }
  try {
    const created = await createMeasurement(domain, token)
    if (created.noProbe) return { code: null, state: "no-probe", error: null }
    if (!created.id) return { code: null, state: "error", error: created.error ?? "ошибка Globalping" }
    return await pollMeasurement(created.id, token)
  } catch {
    return { code: null, state: "error", error: "ошибка Globalping" }
  }
}

async function loadRkn() {
  try {
    const response = await fetch("https://rknweb.ru/api/v3/domains/", {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(60000),
    })
    if (!response.ok) return { error: "реестр РКН не получен" }
    const body = await readJsonResponse(response)
    if (!body || typeof body !== "object") return { error: "реестр РКН не получен" }
    if (!Array.isArray(body) && typeof body.error === "string") {
      return { error: "реестр РКН не получен" }
    }
    const set = new Set()
    const values = Array.isArray(body) ? body : Object.values(body)
    for (const value of values) {
      if (typeof value === "string") {
        const domain = normalizeDomain(value)
        if (domain) set.add(domain)
      } else if (value && typeof value === "object" && typeof value.domain === "string") {
        const domain = normalizeDomain(value.domain)
        if (domain) set.add(domain)
      }
    }
    if (set.size === 0) return { error: "реестр РКН не получен" }
    return { set }
  } catch {
    return { error: "реестр РКН не получен" }
  }
}

// Новый refresh_token из ответа Яндекса не записываем: это секрет, его место в окружении.
async function yandexToken() {
  const refresh = process.env.YANDEX_REFRESH_TOKEN?.trim() ?? ""
  const clientId = process.env.YANDEX_CLIENT_ID?.trim() ?? ""
  const clientSecret = process.env.YANDEX_CLIENT_SECRET?.trim() ?? ""
  if (!refresh || !clientId || !clientSecret) return { error: "нет доступа" }
  try {
    const response = await fetch("https://oauth.yandex.com/token", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh,
        client_id: clientId,
        client_secret: clientSecret,
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) return { error: "нет доступа" }
    const body = await readJsonResponse(response)
    if (typeof body?.access_token !== "string" || body.access_token.length === 0) {
      return { error: "нет доступа" }
    }
    return { token: body.access_token }
  } catch {
    return { error: "нет доступа" }
  }
}

function hostDomain(host) {
  const url = host?.unicode_host_url || host?.ascii_host_url
  if (typeof url === "string" && url.includes("://")) {
    try {
      return normalizeDomain(new URL(url).hostname)
    } catch {
      return ""
    }
  }
  const hostId = typeof host?.host_id === "string" ? host.host_id : ""
  const parts = hostId.split(":")
  return parts.length >= 2 ? normalizeDomain(parts[1]) : ""
}

function hostRank(host) {
  let score = 0
  if (host?.verified === true) score += 4
  if (typeof host?.host_id === "string" && host.host_id.startsWith("https:")) score += 2
  if (host?.main_mirror?.host_id && host.main_mirror.host_id === host.host_id) score += 1
  return score
}

async function webmaster(path, token) {
  const response = await fetch(`https://api.webmaster.yandex.net/v4${path}`, {
    headers: {
      authorization: `OAuth ${token}`,
      accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  })
  const body = await readJsonResponse(response)
  return { response, body }
}

async function loadHosts(userId, token) {
  const hosts = []
  let offset = 0
  for (;;) {
    const query = offset === 0 ? "" : `?offset=${offset}`
    const { response, body } = await webmaster(`/user/${userId}/hosts${query}`, token)
    if (response.status === 401 || response.status === 403) return { error: "нет доступа" }
    if (!response.ok || !Array.isArray(body?.hosts)) return { error: "ошибка Вебмастера" }
    hosts.push(...body.hosts)
    const total = typeof body.count === "number" ? body.count : hosts.length
    if (body.hosts.length === 0 || hosts.length >= total) break
    offset += body.hosts.length
    if (offset > 5000) break
  }
  return { hosts }
}

async function indexedCount(userId, host, token) {
  if (host.verified === false) return { indexed: null, error: "сайт не подтверждён" }
  const hostId = encodeURIComponent(host.host_id)
  const { response, body } = await webmaster(`/user/${userId}/hosts/${hostId}/summary`, token)
  if (response.status === 401 || response.status === 403) return { indexed: null, error: "нет доступа" }
  if (!response.ok) return { indexed: null, error: "ошибка Вебмастера" }
  if (typeof body?.searchable_pages_count !== "number") {
    return { indexed: null, error: "нет числа страниц" }
  }
  return { indexed: body.searchable_pages_count, error: null }
}

async function loadYandex(domains) {
  const failed = (error) => new Map(domains.map((domain) => [domain, { indexed: null, error }]))
  const access = await yandexToken()
  if (!access.token) return failed(access.error ?? "нет доступа")
  try {
    const user = await webmaster("/user", access.token)
    if (user.response.status === 401 || user.response.status === 403) return failed("нет доступа")
    const userId = user.body?.user_id
    if (!user.response.ok || (typeof userId !== "number" && typeof userId !== "string")) {
      return failed("ошибка Вебмастера")
    }
    const hostsResult = await loadHosts(userId, access.token)
    if (!hostsResult.hosts) return failed(hostsResult.error ?? "ошибка Вебмастера")
    const byDomain = new Map()
    for (const host of hostsResult.hosts) {
      const name = hostDomain(host)
      if (!name || typeof host.host_id !== "string") continue
      const current = byDomain.get(name)
      if (!current || hostRank(host) > hostRank(current)) byDomain.set(name, host)
    }
    const pairs = await mapPool(domains, 4, async (domain) => {
      const host = byDomain.get(normalizeDomain(domain))
      if (!host) return [domain, { indexed: null, error: "сайт не в Вебмастере" }]
      return [domain, await indexedCount(userId, host, access.token)]
    })
    return new Map(pairs)
  } catch {
    return failed("ошибка Вебмастера")
  }
}

async function readDomains() {
  const raw = JSON.parse(await readFile(join(root, "data", "sites.json"), "utf8"))
  if (!Array.isArray(raw?.domains) || raw.domains.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error("В data/sites.json нужен массив domains из непустых строк.")
  }
  return raw.domains
}

async function main() {
  await loadEnvFile()
  const domains = await readDomains()
  const token = process.env.GLOBALPING_TOKEN?.trim() ?? ""
  const [httpList, ruList, rkn, yandex] = await Promise.all([
    mapPool(domains, 6, (domain) => checkHttp(domain)),
    mapPool(domains, 3, (domain) => checkRu(domain, token)),
    loadRkn(),
    loadYandex(domains),
  ])

  const status = {
    checkedAt: new Date().toISOString(),
    domains: domains.map((domain, index) => ({
      domain,
      http: httpList[index],
      ru: ruList[index],
      rkn: rkn.set
        ? { listed: rkn.set.has(normalizeDomain(domain)), error: null }
        : { listed: null, error: rkn.error },
      yandex: yandex.get(domain) ?? { indexed: null, error: "ошибка Вебмастера" },
    })),
  }

  const target = join(root, "data", "status.json")
  const temporary = join(root, "data", "status.json.tmp")
  await writeFile(temporary, `${JSON.stringify(status, null, 2)}\n`)
  await rename(temporary, target)

  const alive = status.domains.filter((item) => item.http.alive).length
  const noProbe = status.domains.filter((item) => item.ru.state === "no-probe").length
  const listed = status.domains.filter((item) => item.rkn.listed).length
  const noAccess = status.domains.filter((item) => item.yandex.error === "нет доступа").length
  console.log(
    `Проверено ${status.domains.length}. Ответили ${alive}. Без зонда в РФ ${noProbe}. В реестре РКН ${listed}. Без доступа к Яндексу ${noAccess}.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Проверка не выполнена.")
  process.exitCode = 1
})

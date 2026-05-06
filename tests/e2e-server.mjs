import { chromium } from '@playwright/test'
import http from 'http'
import { URL } from 'url'

const PORT = 9876
const BASE = 'http://localhost:5173'
const BRAVE_BIN = '/usr/bin/brave-browser'

let browser, page
let state = { phase: 'idle', logs: [] }

function log(msg) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`
  state.logs.push(line)
  if (state.logs.length > 200) state.logs.shift()
  console.log(line)
}

async function waitAndCheck(text, timeout = 15_000) {
  try {
    const el = page.getByText(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))
    await el.first().waitFor({ state: 'visible', timeout })
    return true
  } catch { return false }
}

async function click(label, timeout = 10_000) {
  const btn = page.getByRole('button', { name: new RegExp(label, 'i') })
  await btn.first().waitFor({ state: 'visible', timeout })
  await btn.first().click()
  return true
}

async function fill(placeholder, value) {
  const input = page.getByPlaceholder(placeholder)
  await input.first().waitFor({ state: 'visible', timeout: 5_000 })
  await input.first().fill(value)
  return true
}

async function fillByLabel(label, value) {
  const input = page.getByLabel(label)
  await input.first().waitFor({ state: 'visible', timeout: 5_000 })
  await input.first().fill(value)
  return true
}

async function nav(tab) {
  await click(tab, 10_000)
  await page.waitForTimeout(1_500)
  return true
}

async function snapshot() {
  const html = await page.content()
  const title = await page.title()
  const url = page.url()
  const visibleTexts = await page.evaluate(() => {
    const texts = []
    document.querySelectorAll('button, h1, h2, h3, p, span, div').forEach(el => {
      const t = el.textContent?.trim()
      if (t && t.length > 2 && t.length < 200) texts.push(t)
    })
    return [...new Set(texts)].slice(0, 50)
  })
  return { title, url, html: html.slice(0, 5000), visibleTexts }
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const u = new URL(req.url, `http://localhost:${PORT}`)
  const path = u.pathname
  const params = Object.fromEntries(u.searchParams)

  try {
    switch (path) {
      case '/status': {
        const s = await snapshot()
        res.end(JSON.stringify({ ok: true, phase: state.phase, logs: state.logs.slice(-30), snapshot: s }))
        break
      }

      case '/launch': {
        if (browser) { res.end(JSON.stringify({ ok: true, msg: 'Already launched' })); break }
        log('Launching Brave...')
        browser = await chromium.launch({
          executablePath: BRAVE_BIN,
          headless: false,
          args: [
            '--remote-debugging-port=9222',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
          ],
        })
        const ctx = browser.contexts()[0] || await browser.newContext()
        page = ctx.pages()[0] || await ctx.newPage()
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20_000 })
        await page.waitForTimeout(2_000)
        state.phase = 'launched'
        log('Brave launched and page loaded')
        res.end(JSON.stringify({ ok: true, msg: 'Launched', url: page.url() }))
        break
      }

      case '/connect_cdp': {
        if (browser) { res.end(JSON.stringify({ ok: true, msg: 'Already connected' })); break }
        const ws = params.ws || 'ws://localhost:9222/devtools/browser/00000000-0000-0000-0000-000000000000'
        log(`Connecting to CDP: ${ws}...`)
        browser = await chromium.connectOverCDP(ws)
        const ctx = browser.contexts()[0] || await browser.newContext()
        page = ctx.pages()[0] || await ctx.newPage()
        await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20_000 })
        await page.waitForTimeout(2_000)
        state.phase = 'connected_cdp'
        log('Connected via CDP and page loaded')
        res.end(JSON.stringify({ ok: true, msg: 'Connected', url: page.url() }))
        break
      }

      case '/nav': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        await nav(params.tab || 'Beranda')
        state.phase = `nav_${params.tab}`
        log(`Navigated to ${params.tab}`)
        res.end(JSON.stringify({ ok: true }))
        break
      }

      case '/click': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        await click(params.label || params.text)
        log(`Clicked: ${params.label || params.text}`)
        res.end(JSON.stringify({ ok: true }))
        break
      }

      case '/fill': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        if (params.label) await fillByLabel(params.label, params.value)
        else await fill(params.placeholder, params.value)
        log(`Filled: ${params.label || params.placeholder} = ${params.value}`)
        res.end(JSON.stringify({ ok: true }))
        break
      }

      case '/check': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        const found = await waitAndCheck(params.text, parseInt(params.timeout) || 10_000)
        log(`Check "${params.text}": ${found}`)
        res.end(JSON.stringify({ ok: true, found }))
        break
      }

      case '/wait': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        const ms = parseInt(params.ms) || 2000
        await page.waitForTimeout(ms)
        log(`Waited ${ms}ms`)
        res.end(JSON.stringify({ ok: true }))
        break
      }

      case '/screenshot': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        const buf = await page.screenshot({ fullPage: params.full === '1' })
        res.setHeader('Content-Type', 'image/png')
        res.end(buf)
        break
      }

      case '/snapshot': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        const s = await snapshot()
        res.end(JSON.stringify({ ok: true, snapshot: s }))
        break
      }

      case '/select': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        await page.selectOption(params.selector, params.value)
        log(`Selected ${params.selector} = ${params.value}`)
        res.end(JSON.stringify({ ok: true }))
        break
      }

      case '/type': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        await page.locator(params.selector).first().fill(params.value)
        log(`Typed ${params.selector} = ${params.value}`)
        res.end(JSON.stringify({ ok: true }))
        break
      }

      case '/eval': {
        if (!page) { res.end(JSON.stringify({ ok: false, error: 'Not launched' })); break }
        const result = await page.evaluate(params.code)
        log(`Eval: ${JSON.stringify(result).slice(0, 200)}`)
        res.end(JSON.stringify({ ok: true, result }))
        break
      }

      case '/close': {
        if (browser) { await browser.close(); browser = null; page = null }
        state.phase = 'closed'
        log('Browser closed')
        res.end(JSON.stringify({ ok: true }))
        break
      }

      default:
        res.statusCode = 404
        res.end(JSON.stringify({ ok: false, error: 'Unknown command' }))
    }
  } catch (e) {
    log(`ERROR: ${e.message}`)
    res.statusCode = 500
    res.end(JSON.stringify({ ok: false, error: e.message }))
  }
})

server.listen(PORT, () => {
  log(`🎮 E2E Command Server listening on http://localhost:${PORT}`)
  log('Commands: /launch, /connect_cdp, /nav?tab=Beranda, /click?label=Connect Wallet, /fill?label=Nama&value=Test, /check?text=Berhasil, /wait?ms=3000, /screenshot, /snapshot, /status, /close')
})

// Auto-launch on start
;(async () => {
  try {
    log('Auto-launching Brave...')
    browser = await chromium.launch({
      executablePath: BRAVE_BIN,
      headless: false,
      args: [
        '--remote-debugging-port=9222',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    })
    const ctx = browser.contexts()[0] || await browser.newContext()
    page = ctx.pages()[0] || await ctx.newPage()
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20_000 })
    await page.waitForTimeout(2_000)
    state.phase = 'launched'
    log('Brave auto-launched and page loaded')
  } catch (e) {
    log(`Auto-launch failed: ${e.message}`)
  }
})()

process.on('SIGINT', async () => {
  if (browser) await browser.close()
  process.exit(0)
})

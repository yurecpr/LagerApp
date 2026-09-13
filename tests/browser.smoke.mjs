import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { join, resolve } from 'node:path'

export async function browserSmoke({ backendURL, adminPassword, employeePassword, root }) {
  const { chromium } = await import('../.local-tools/browser/node_modules/playwright/index.mjs')
  const port = 19090 + Math.floor(Math.random() * 500)
  const appURL = `http://127.0.0.1:${port}`
  const app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', '127.0.0.1'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let logs = ''
  app.stdout.on('data', data => { logs += data })
  app.stderr.on('data', data => { logs += data })
  let browser
  try {
    let started = false
    for (let i = 0; i < 100; i++) { try { if ((await fetch(appURL + '/login')).ok) { started = true; break } } catch {} await delay(100) }
    assert.ok(started, logs)
    browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_BINARY || 'C:/Users/yurec/AppData/Local/ms-playwright/chromium-1112/chrome-win/chrome.exe' })
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    // Every backend request is redirected to this test's isolated PocketBase.
    // Never send test mutations to the address compiled from .env.local.
    await context.route('**/api/**', async route => {
      const original = new URL(route.request().url())
      const response = await route.fetch({ url: backendURL + original.pathname + original.search })
      await route.fulfill({ response })
    })
    const page = await context.newPage()
    page.setDefaultTimeout(10000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(appURL + '/setup')
    await page.getByLabel('Email власника PocketBase').fill('owner@example.test')
    await page.getByLabel('Пароль власника PocketBase').fill(adminPassword)
    await page.getByLabel('Ім’я адміністратора складу').fill('Browser Admin')
    await page.getByLabel('Email адміністратора складу').fill('browser-admin@example.test')
    await page.getByLabel('Новий пароль (щонайменше 12 символів)').fill(adminPassword)
    await page.getByRole('button', { name: 'Створити адміністратора', exact: true }).click()
    await page.getByText('Адміністратора створено.', { exact: true }).waitFor()
    assert.ok(await page.evaluate(() => !JSON.parse(localStorage.getItem('pocketbase_auth') || '{}').token), 'Superuser token must not be persisted')
    await page.goto(appURL + '/parts')
    await page.waitForURL('**/login')
    await page.getByLabel('Email', { exact: true }).fill('worker@example.test')
    await page.getByLabel('Пароль', { exact: true }).fill(employeePassword)
    await page.getByRole('button', { name: 'Увійти', exact: true }).click()
    await page.waitForURL(appURL + '/')
    assert.equal(await page.getByRole('link', { name: 'Працівники', exact: true }).count(), 0)
    await page.goto(appURL + '/admin/users')
    await page.getByText('Керування працівниками доступне лише адміністратору.').waitFor()
    await page.goto(appURL + '/locations')
    await page.getByRole('button', { name: 'Нова комірка' }).click()
    await page.getByLabel('Назва', { exact: true }).fill('BROWSER-CELL')
    await page.getByLabel('Код для сканування (необов’язково)').fill('BROWSER-QR')
    await page.getByRole('button', { name: 'Зберегти', exact: true }).click()
    await page.getByRole('link', { name: 'BROWSER-CELL', exact: true }).click()
    await page.getByRole('button', { name: 'Редагувати', exact: true }).click()
    await page.getByLabel('Назва', { exact: true }).fill('BROWSER-EDITED')
    await page.getByRole('button', { name: 'Зберегти', exact: true }).click()
    await page.getByRole('heading', { name: 'BROWSER-EDITED' }).waitFor()
    await page.goto(appURL + '/transactions')
    await page.getByText('Worker', { exact: true }).first().waitFor()
    await page.screenshot({ path: join(root, 'employee-mobile.png'), fullPage: true })
    let releaseRefresh, refreshStarted
    const delayed = new Promise(resolve => { releaseRefresh = resolve })
    const startedRefresh = new Promise(resolve => { refreshStarted = resolve })
    await page.route('**/api/collections/users/auth-refresh', async route => {
      refreshStarted()
      await delayed
      await route.fallback()
    })
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await Promise.race([startedRefresh, delay(8000).then(() => { throw new Error('No refresh request') })])
    await page.getByRole('button', { name: 'Вийти', exact: true }).click()
    const finishedRefresh = page.waitForResponse(response => response.url().includes('/users/auth-refresh'))
    releaseRefresh()
    await finishedRefresh
    await page.waitForURL('**/login')
    await page.unroute('**/api/collections/users/auth-refresh')
    assert.ok(await page.evaluate(() => !JSON.parse(localStorage.getItem('pocketbase_auth') || '{}').token), 'Delayed refresh must not restore a logged-out session')
    await page.getByLabel('Email', { exact: true }).fill('browser-admin@example.test')
    await page.getByLabel('Пароль', { exact: true }).fill(adminPassword)
    await page.getByRole('button', { name: 'Увійти', exact: true }).click()
    await page.getByRole('link', { name: 'Працівники', exact: true }).click()
    await page.getByLabel('Ім’я', { exact: true }).fill('Browser Worker')
    await page.getByLabel('Email', { exact: true }).fill('browser-worker@example.test')
    await page.getByLabel('Пароль (щонайменше 12 символів)', { exact: true }).fill(employeePassword)
    await page.getByRole('button', { name: 'Створити', exact: true }).click()
    await page.getByText('Обліковий запис створено.').waitFor()
    await page.getByText('Browser Worker', { exact: true }).waitFor()
    await page.goto(appURL + '/reports')
    await page.getByRole('button', { name: 'Мало', exact: true }).click()
    await page.getByText('Edited part', { exact: true }).waitFor()
    await page.getByText('Мало при ≤ 7.5 кг', { exact: true }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'Mobile page should not overflow horizontally')
    await page.getByRole('button', { name: 'Переключить на русский', exact: true }).click()
    await page.getByRole('heading', { name: 'Остатки', exact: true }).waitFor()
    await page.reload()
    await page.getByRole('heading', { name: 'Остатки', exact: true }).waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('lager-language')), 'ru', 'Selected language must persist')
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'ru')
    await page.getByRole('button', { name: 'Перемкнути на українську', exact: true }).click()
    await page.getByRole('heading', { name: 'Залишки', exact: true }).waitFor()
    await page.screenshot({ path: join(root, 'admin-mobile.png'), fullPage: true })
    assert.deepEqual(errors, [], 'No browser runtime errors')
    console.log('PASS: browser admin bootstrap, no superuser token persistence, login/logout with delayed refresh, employee admin-route denial, location create/edit, journal rendering, admin user creation, low-stock report, Ukrainian/Russian switch persistence, mobile layout')
  } finally { if (browser) await browser.close(); app.kill() }
}

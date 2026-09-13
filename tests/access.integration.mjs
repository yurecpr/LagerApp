import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, copyFile, readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import PocketBase, { BaseAuthStore } from 'pocketbase'

// Runs a real PocketBase against an isolated temporary database, never ../pb_data.
const binary = resolve(process.env.POCKETBASE_BINARY || '.local-tools/pocketbase-0.40.4/pocketbase.exe')
await mkdir('.local-tools', { recursive: true })
const root = await mkdtemp(resolve('.local-tools/access-test-'))
const migrations = join(root, 'migrations')
await mkdir(migrations)
await copyFile('tests/fixtures/1700000000_warehouse.js', join(migrations, '1700000000_warehouse.js'))
for (const file of await readdir('pocketbase/pb_migrations')) {
  if (file.endsWith('.js')) await copyFile(join('pocketbase/pb_migrations', file), join(migrations, file))
}
const common = [`--dir=${join(root, 'data')}`, `--migrationsDir=${migrations}`, `--hooksDir=${resolve('pocketbase/pb_hooks')}`]
const password = randomUUID() + 'Aa1!'
const setup = spawnSync(binary, ['superuser', 'create', 'owner@example.test', password, ...common], { encoding: 'utf8', windowsHide: true })
assert.equal(setup.status, 0, setup.stderr || setup.stdout || String(setup.error))
const port = 18090 + Math.floor(Math.random() * 1000)
const url = `http://127.0.0.1:${port}`
const server = spawn(binary, ['serve', `--http=127.0.0.1:${port}`, ...common], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
let logs = ''
server.stdout.on('data', data => { logs += data.toString() })
server.stderr.on('data', data => { logs += data.toString() })
const client = () => new PocketBase(url, new BaseAuthStore())
const owner = client(), admin = client(), employee = client(), guest = client()
async function denied(action, statuses = [400, 401, 403, 404]) {
  await assert.rejects(action, error => statuses.includes(error.status), 'Request must be rejected by the server')
}
try {
  let healthy = false
  for (let attempt = 0; attempt < 80; attempt++) {
    try { await guest.health.check(); healthy = true; break } catch { await delay(100) }
  }
  assert.ok(healthy, 'PocketBase did not start: ' + logs)
  await owner.collection('_superusers').authWithPassword('owner@example.test', password)
  const adminRecord = await owner.collection('users').create({ email: 'admin@example.test', password, passwordConfirm: password, name: 'Admin', role: 'admin', active: true })
  await admin.collection('users').authWithPassword('admin@example.test', password)
  const worker = await admin.collection('users').create({ email: 'worker@example.test', password, passwordConfirm: password, name: 'Worker', role: 'employee', active: true })
  await employee.collection('users').authWithPassword('worker@example.test', password)
  await denied(() => guest.collection('users').create({ email: 'intruder@example.test', password, passwordConfirm: password, role: 'admin', active: true }))
  await denied(() => employee.collection('users').update(worker.id, { role: 'admin' }))
  await denied(() => employee.collection('users').update(worker.id, { active: true }))
  await denied(() => employee.collection('users').create({ email: 'intruder@example.test', password, passwordConfirm: password, role: 'admin', active: true }))
  assert.equal((await employee.collection('users').getList()).totalItems, 0)
  await denied(() => admin.collection('users').update(adminRecord.id, { active: false }))
  await denied(() => admin.collection('users').update(adminRecord.id, { role: 'employee' }))
  console.log('PASS: closed registration, employee cannot escalate privileges, admin self-lockout prevention')

  const part = await employee.collection('parts').create({ name: 'Test part', unit: 'кг' })
  await denied(() => employee.collection('parts').create({ name: 'Forged threshold', min_qty: 100 }))
  await denied(() => employee.collection('parts').update(part.id, { min_qty: 100 }))
  await admin.collection('parts').update(part.id, { min_qty: 7.5 })
  assert.equal((await employee.collection('parts').getOne(part.id)).min_qty, 7.5)
  const location = await employee.collection('locations').create({ name: 'TEST-1' })
  await employee.collection('parts').update(part.id, { name: 'Edited part' })
  await employee.collection('locations').update(location.id, { name: 'TEST-2' })
  await denied(() => employee.collection('parts').delete(part.id))
  await denied(() => employee.collection('locations').delete(location.id))
  for (const collection of ['parts', 'locations', 'inventory', 'transactions']) assert.equal((await guest.collection(collection).getList()).totalItems, 0)
  await denied(() => guest.collection('parts').getOne(part.id))
  const unused = await employee.collection('parts').create({ name: 'Unused' })
  await admin.collection('parts').delete(unused.id)
  const upload = new FormData()
  upload.append('photo', new Blob([Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')], { type: 'image/gif' }), 'test.gif')
  const withPhoto = await employee.collection('parts').update(part.id, upload)
  assert.ok([403, 404].includes((await fetch(employee.files.getURL(withPhoto, withPhoto.photo))).status))
  const fileToken = await employee.files.getToken()
  assert.equal((await fetch(employee.files.getURL(withPhoto, withPhoto.photo, { token: fileToken }))).status, 200)
  console.log('PASS: employee catalog editing, admin-only deletion, anonymous data hidden')

  const movement = { part_id: part.id, location_id: location.id, type: 'incoming', qty: 10, notes: '', operation_id: randomUUID() }
  const send = (pb, data) => pb.send('/api/warehouse/movements', { method: 'POST', body: data, requestKey: null })
  await denied(() => send(guest, movement))
  await denied(() => employee.collection('inventory').create({ part_id: part.id, location_id: location.id, qty: 99 }))
  await denied(() => employee.collection('transactions').create({ part_id: part.id, location_id: location.id, type: 'incoming', qty: 99 }))
  const first = await send(employee, { ...movement, actor_id: adminRecord.id, actor_name: 'Forged' })
  assert.equal(first.actor_id, worker.id)
  assert.equal(first.actor_name, 'Worker')
  const replay = await send(employee, movement)
  assert.equal(replay.id, first.id)
  await denied(() => send(employee, { ...movement, qty: 11 }))
  await denied(() => employee.collection('transactions').update(first.id, { qty: 500 }))
  await denied(() => employee.collection('transactions').delete(first.id))
  const balance = async () => (await employee.collection('inventory').getFullList())[0].qty
  assert.equal(await balance(), 10)
  const inventory = (await employee.collection('inventory').getFullList())[0]
  await denied(() => admin.collection('inventory').update(inventory.id, { qty: 999 }))
  await Promise.all(Array.from({ length: 5 }, () => send(employee, { ...movement, type: 'outgoing', qty: 1, operation_id: randomUUID() })))
  assert.equal(await balance(), 5)
  const competing = await Promise.allSettled(Array.from({ length: 2 }, () => send(employee, { ...movement, type: 'outgoing', qty: 4, operation_id: randomUUID() })))
  assert.equal(competing.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal(await balance(), 1)
  await denied(() => send(employee, { ...movement, qty: -5, operation_id: randomUUID() }))
  await denied(() => send(employee, { ...movement, qty: 0, operation_id: randomUUID() }))
  await denied(() => send(employee, { ...movement, type: 'adjustment', qty: 20, notes: 'Count', operation_id: randomUUID() }))
  await send(admin, { ...movement, type: 'adjustment', qty: 2.5, notes: 'Count', operation_id: randomUUID() })
  assert.equal(await balance(), 2.5)
  // Force journal validation to fail after the balance update; both must roll back.
  const schema = await owner.collections.getOne('transactions')
  schema.fields.find(f => f.name === 'notes').max = 3
  await owner.collections.update(schema.id, { fields: schema.fields })
  const beforeFailure = (await employee.collection('transactions').getList()).totalItems
  await denied(() => send(employee, { ...movement, qty: 3, notes: 'too long', operation_id: randomUUID() }))
  assert.equal(await balance(), 2.5)
  assert.equal((await employee.collection('transactions').getList()).totalItems, beforeFailure)
  await denied(() => admin.collection('parts').delete(part.id))
  console.log('PASS: atomic movement, concurrency, insufficient stock, replay protection, authorship, fractional admin correction, rollback')

  const newPassword = randomUUID() + 'Bb2!'
  await admin.collection('users').update(worker.id, { password: newPassword, passwordConfirm: newPassword })
  await denied(() => employee.collection('users').authRefresh())
  await employee.collection('users').authWithPassword('worker@example.test', newPassword)
  await admin.collection('users').update(worker.id, { active: false })
  assert.equal((await employee.collection('parts').getList()).totalItems, 0)
  await denied(() => send(employee, { ...movement, operation_id: randomUUID() }))
  await denied(() => client().collection('users').authWithPassword('worker@example.test', newPassword))
  await admin.collection('users').update(worker.id, { active: true })
  await employee.collection('users').authWithPassword('worker@example.test', newPassword)
  console.log('PASS: password reset, token revocation, blocked accounts cannot read/write/login, reactivation')
  if (process.env.BROWSER_TEST === '1') {
    await owner.collection('users').update(adminRecord.id, { active: false })
    const { browserSmoke } = await import('./browser.smoke.mjs')
    await browserSmoke({ backendURL: url, adminPassword: password, employeePassword: newPassword, root })
  }
  console.log('All access integration checks passed. Isolated test data: ' + root)
} catch (error) {
  console.error('Integration failure:', error)
  console.error(logs.slice(-6000))
  process.exitCode = 1
} finally {
  server.kill()
}

/// <reference path="../../../pb_data/types.d.ts" />

routerAdd('POST', '/api/warehouse/movements', (e) => {
  const body = e.requestInfo().body
  const qty = body.qty
  const type = body.type
  if (!['incoming', 'outgoing', 'adjustment'].includes(type) || typeof qty !== 'number' || !Number.isFinite(qty) || (type === 'adjustment' ? qty < 0 : qty <= 0)) {
    throw new BadRequestError('Вкажіть коректну кількість.')
  }
  if (typeof body.operation_id !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(body.operation_id)) {
    throw new BadRequestError('Відсутній ідентифікатор операції.')
  }
  if (typeof body.notes !== 'undefined' && (typeof body.notes !== 'string' || body.notes.length > 2000)) {
    throw new BadRequestError('Нотатка має містити не більше 2000 символів.')
  }
  let result
  e.app.runInTransaction((app) => {
    const actor = app.findRecordById('users', e.auth.id)
    if (!actor.getBool('active') || !['admin', 'employee'].includes(actor.getString('role'))) throw new ForbiddenError('Доступ закрито.')
    if (type === 'adjustment' && actor.getString('role') !== 'admin') throw new ForbiddenError('Коригування доступне адміністратору.')
    if (type === 'adjustment' && !String(body.notes || '').trim()) throw new BadRequestError('Вкажіть причину коригування.')
    const previous = app.findRecordsByFilter('transactions', 'operation_id = {:key}', '', 1, 0, { key: body.operation_id })
    if (previous.length) {
      const tx = previous[0]
      if (tx.getString('actor_id') !== actor.id || tx.getString('part_id') !== body.part_id || tx.getString('location_id') !== body.location_id || tx.getString('type') !== type || tx.getFloat('qty') !== qty || tx.getString('notes') !== (body.notes || '')) {
        throw new BadRequestError('Цей ідентифікатор уже використано для іншої операції.')
      }
      result = tx.publicExport()
      return
    }
    app.findRecordById('parts', body.part_id)
    app.findRecordById('locations', body.location_id)
    const rows = app.findRecordsByFilter('inventory', 'part_id = {:part} && location_id = {:location}', '', 2, 0, { part: body.part_id, location: body.location_id })
    if (rows.length > 1) throw new BadRequestError('Виявлено дублікати залишків. Зверніться до адміністратора.')
    const inventory = rows[0] || new Record(app.findCollectionByNameOrId('inventory'))
    const current = inventory.getFloat('qty')
    const balance = type === 'adjustment' ? qty : current + (type === 'incoming' ? qty : -qty)
    if (!Number.isFinite(balance) || balance < 0) throw new BadRequestError('Недостатньо товару. Оновіть залишки.')
    inventory.set('part_id', body.part_id)
    inventory.set('location_id', body.location_id)
    inventory.set('qty', balance)
    app.save(inventory)
    const tx = new Record(app.findCollectionByNameOrId('transactions'))
    tx.load({ type, qty, part_id: body.part_id, location_id: body.location_id, notes: body.notes || '', operation_id: body.operation_id, actor_id: actor.id, actor_name: actor.getString('name') || actor.email(), balance_after: balance })
    app.save(tx)
    result = tx.publicExport()
  })
  return e.json(200, result)
}, $apis.requireAuth('users'))

onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth() && e.auth && e.record.id === e.auth.id && (!e.record.getBool('active') || e.record.getString('role') !== 'admin')) {
    throw new BadRequestError('Не можна заблокувати власний обліковий запис або зняти свою роль адміністратора.')
  }
  e.next()
}, 'users')

// Employees may edit catalog details, but only admins choose the low-stock limit.
onRecordUpdateRequest((e) => {
  if (!e.hasSuperuserAuth() && e.auth && e.auth.getString('role') !== 'admin' && e.record.getFloat('min_qty') !== e.record.original().getFloat('min_qty')) {
    throw new ForbiddenError('Поріг малого залишку може змінювати лише адміністратор.')
  }
  e.next()
}, 'parts')

onRecordCreateRequest((e) => {
  if (!e.hasSuperuserAuth() && e.auth && e.auth.getString('role') !== 'admin' && e.record.getFloat('min_qty') !== 0) {
    throw new ForbiddenError('Поріг малого залишку може задавати лише адміністратор.')
  }
  e.next()
}, 'parts')

// Preserve stock and historical links: delete only unused catalog entries.
onRecordDeleteRequest((e) => {
  const field = e.record.collection().name === 'parts' ? 'part_id' : 'location_id'
  for (const name of ['inventory', 'transactions']) {
    const rows = e.app.findRecordsByFilter(name, field + ' = {:id}', '', 1, 0, { id: e.record.id })
    if (rows.length) throw new BadRequestError('Запис використовується в залишках або журналі. Видалення заборонено.')
  }
  e.next()
}, 'parts', 'locations')

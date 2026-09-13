// Minimal pre-upgrade schema; test data only, never applied to the live warehouse.
migrate((app) => {
  try { app.findCollectionByNameOrId('users') } catch {
    app.save(new Collection({ name: 'users', type: 'auth', fields: [{ name: 'name', type: 'text' }], passwordAuth: { enabled: true } }))
  }
  const parts = new Collection({ name: 'parts', type: 'base', fields: [{ name: 'name', type: 'text', required: true }, { name: 'article', type: 'text' }, { name: 'category', type: 'select', values: ['radio', 'auto'], maxSelect: 1 }, { name: 'unit', type: 'text' }, { name: 'photo', type: 'file', maxSelect: 1 }] })
  const locations = new Collection({ name: 'locations', type: 'base', fields: [{ name: 'name', type: 'text', required: true }, { name: 'notes', type: 'text' }, { name: 'qr_code', type: 'text' }] })
  app.save(parts); app.save(locations)
  for (const name of ['inventory', 'transactions']) {
    const fields = [
      { name: 'part_id', type: 'relation', collectionId: parts.id, maxSelect: 1, required: true },
      { name: 'location_id', type: 'relation', collectionId: locations.id, maxSelect: 1, required: true },
      { name: 'qty', type: 'number' },
    ]
    if (name === 'transactions') fields.push({ name: 'type', type: 'select', values: ['incoming', 'outgoing'], maxSelect: 1, required: true }, { name: 'notes', type: 'text' }, { name: 'date', type: 'autodate', onCreate: true })
    app.save(new Collection({ name, type: 'base', fields, listRule: '', viewRule: '', createRule: '', updateRule: '', deleteRule: '' }))
  }
})

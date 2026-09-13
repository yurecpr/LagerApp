migrate((app) => {
  const users = app.findCollectionByNameOrId('users')
  users.fields.add(new SelectField({ name: 'role', values: ['admin', 'employee'], maxSelect: 1, required: true }))
  users.fields.add(new BoolField({ name: 'active' }))
  const staff = '@request.auth.id != "" && @request.auth.active = true && (@request.auth.role = "admin" || @request.auth.role = "employee")'
  const admin = '@request.auth.id != "" && @request.auth.active = true && @request.auth.role = "admin"'
  users.listRule = admin
  users.viewRule = `(${admin}) || (${staff} && id = @request.auth.id)`
  users.createRule = admin
  users.updateRule = admin
  users.deleteRule = null // Deactivate accounts to preserve authorship.
  users.manageRule = admin
  users.authRule = 'active = true'
  users.passwordAuth.enabled = true
  app.save(users)
  app.db().newQuery("UPDATE users SET role = 'employee', active = true WHERE role = ''").execute()

  for (const name of ['parts', 'locations', 'inventory', 'transactions']) {
    const collection = app.findCollectionByNameOrId(name)
    collection.listRule = staff
    collection.viewRule = staff
    collection.createRule = ['parts', 'locations'].includes(name) ? staff : null
    collection.updateRule = ['parts', 'locations'].includes(name) ? staff : null
    collection.deleteRule = ['parts', 'locations'].includes(name) ? admin : null
    if (name === 'parts') {
      const photo = collection.fields.getByName('photo')
      if (photo) photo.protected = true
    }
    if (name === 'inventory') {
      collection.fields.getByName('qty').min = 0
      collection.indexes.push('CREATE UNIQUE INDEX idx_inventory_part_location ON inventory (part_id, location_id)')
    }
    if (name === 'transactions') {
      collection.fields.getByName('type').values = ['incoming', 'outgoing', 'adjustment']
      collection.fields.add(new RelationField({ name: 'actor_id', collectionId: users.id, maxSelect: 1, cascadeDelete: false }))
      collection.fields.add(new TextField({ name: 'actor_name', max: 255 }))
      collection.fields.add(new TextField({ name: 'operation_id', max: 100 }))
      collection.fields.add(new NumberField({ name: 'balance_after', min: 0 }))
      collection.indexes.push("CREATE UNIQUE INDEX idx_transactions_operation ON transactions (operation_id) WHERE operation_id != ''")
    }
    app.save(collection)
  }
})

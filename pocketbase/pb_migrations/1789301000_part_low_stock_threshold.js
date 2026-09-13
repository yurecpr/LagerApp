migrate((app) => {
  const parts = app.findCollectionByNameOrId('parts')
  parts.fields.add(new NumberField({ name: 'min_qty', min: 0 }))
  app.save(parts)
})

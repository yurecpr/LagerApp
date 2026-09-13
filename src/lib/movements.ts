import pb from './pocketbase'

export type Movement = {
  type: 'incoming' | 'outgoing' | 'adjustment'
  part_id: string
  location_id: string
  qty: number
  notes?: string
}

// Reuse the ID on retries, including after a page reload or a lost response.
export async function saveMovement(movement: Movement) {
  const body = { ...movement, notes: movement.notes || '' }
  const key = `warehouse-movement:${pb.authStore.record?.id}:${JSON.stringify(body)}`
  let operationId = sessionStorage.getItem(key)
  if (!operationId) {
    operationId = Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('')
    sessionStorage.setItem(key, operationId)
  }
  try {
    const result = await pb.send('/api/warehouse/movements', { method: 'POST', body: { ...body, operation_id: operationId }, requestKey: null })
    sessionStorage.removeItem(key)
    return result
  } catch (error) {
    // A validation/authorization rejection did not commit the movement.
    const status = (error as { status?: number }).status
    if (status && status >= 400 && status < 500) sessionStorage.removeItem(key)
    throw error
  }
}

export function errorMessage(error: unknown) {
  const err = error as { response?: { message?: string }; message?: string }
  return err.response?.message || err.message || 'Не вдалося зберегти. Перевірте з’єднання та повторіть.'
}

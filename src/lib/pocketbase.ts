import PocketBase from 'pocketbase'

// On a phone, localhost is the phone itself. Follow the host used to open
// the app unless deployment explicitly configures a separate API address.
const defaultURL = typeof window === 'undefined'
  ? 'http://localhost:8090'
  : `${window.location.protocol}//${window.location.hostname}:8090`
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || defaultURL)

export default pb

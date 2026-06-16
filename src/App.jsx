import { useEffect, useRef, useState } from 'react'
import './App.css'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'

// ---------------- LEAFLET ICON FIX ----------------

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

if (L.Icon.Default && !L.Icon.Default._patched) {
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })
  L.Icon.Default._patched = true
}

// ---------------- CONSTANTS ----------------

const PRESET_DEPARTMENTS = [
  'Clothing',
  'Shoes',
  'Furniture',
  'Electronics',
  'Books',
  'Toys',
  'Housewares',
  'Media (DVDs/CDs/Records)',
]

const EMPTY_FORM = {
  storeName: '',
  address: '',
  departments: [],
  coords: null,
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'any',
  'at',
  'best',
  'by',
  'for',
  'from',
  'find',
  'get',
  'good',
  'in',
  'into',
  'item',
  'items',
  'looking',
  'me',
  'near',
  'of',
  'on',
  'or',
  'please',
  'search',
  'show',
  'the',
  'to',
  'want',
  'with',
])

const CATEGORY_HINTS = {
  clothing: [
    'clothing',
    'clothes',
    'apparel',
    'fashion',
    'shirt',
    'shirts',
    'tee',
    'tees',
    'tshirt',
    'tshirts',
    't-shirt',
    't-shirts',
    'top',
    'tops',
    'blouse',
    'blouses',
    'sweater',
    'sweaters',
    'hoodie',
    'hoodies',
    'jacket',
    'jackets',
    'coat',
    'coats',
    'jean',
    'jeans',
    'denim',
    'pants',
    'trouser',
    'trousers',
    'shorts',
    'dress',
    'dresses',
    'skirt',
    'skirts',
    'suit',
    'suits',
  ],
  shoes: [
    'shoes',
    'shoe',
    'footwear',
    'sneaker',
    'sneakers',
    'boot',
    'boots',
    'sandals',
    'sandal',
    'heel',
    'heels',
    'loafer',
    'loafers',
    'slipper',
    'slippers',
    'cleat',
    'cleats',
  ],
  furniture: [
    'furniture',
    'chair',
    'chairs',
    'table',
    'tables',
    'desk',
    'desks',
    'couch',
    'couches',
    'sofa',
    'sofas',
    'loveseat',
    'loveseats',
    'bed',
    'beds',
    'mattress',
    'mattresses',
    'dresser',
    'dressers',
    'nightstand',
    'nightstands',
    'shelf',
    'shelves',
    'cabinet',
    'cabinets',
    'bookcase',
    'bookcases',
    'stool',
    'stools',
    'bench',
    'benches',
  ],
  electronics: [
    'electronics',
    'electronic',
    'tv',
    'tvs',
    'television',
    'televisions',
    'computer',
    'computers',
    'laptop',
    'laptops',
    'phone',
    'phones',
    'tablet',
    'tablets',
    'monitor',
    'monitors',
    'speaker',
    'speakers',
    'headphone',
    'headphones',
    'console',
    'consoles',
    'game',
    'games',
    'camera',
    'cameras',
    'printer',
    'printers',
    'charger',
    'chargers',
    'cable',
    'cables',
  ],
  books: [
    'books',
    'book',
    'novel',
    'novels',
    'paperback',
    'paperbacks',
    'hardcover',
    'hardcovers',
    'magazine',
    'magazines',
    'comic',
    'comics',
    'textbook',
    'textbooks',
    'cookbook',
    'cookbooks',
    'reader',
    'readers',
  ],
  toys: [
    'toys',
    'toy',
    'lego',
    'legos',
    'puzzle',
    'puzzles',
    'doll',
    'dolls',
    'figure',
    'figures',
    'plush',
    'stuffed',
    'game',
    'games',
    'playset',
    'playsets',
  ],
  housewares: [
    'housewares',
    'houseware',
    'kitchen',
    'kitchenware',
    'dish',
    'dishes',
    'plate',
    'plates',
    'bowl',
    'bowls',
    'pan',
    'pans',
    'pot',
    'pots',
    'mug',
    'mugs',
    'glass',
    'glasses',
    'lamp',
    'lamps',
    'decor',
    'decoration',
    'blanket',
    'blankets',
    'pillow',
    'pillows',
    'rug',
    'rugs',
    'curtain',
    'curtains',
    'storage',
    'basket',
    'baskets',
    'vase',
    'vases',
    'utensil',
    'utensils',
    'blender',
    'toaster',
    'microwave',
    'vacuum',
  ],
  media: [
    'media',
    'dvd',
    'dvds',
    'cd',
    'cds',
    'record',
    'records',
    'vinyl',
    'album',
    'albums',
    'blu-ray',
    'bluray',
    'cassette',
    'cassettes',
    'tape',
    'tapes',
    'movie',
    'movies',
    'music',
  ],
}

const EMPTY_ARRAY = []

const APP_STYLES = {
  shell: {
    minHeight: '100vh',
    background:
      'radial-gradient(circle at top, rgba(16,48,92,0.96) 0%, rgba(4,10,20,1) 55%, rgba(1,5,12,1) 100%)',
    color: '#ffffff',
    padding: '16px',
    boxSizing: 'border-box',
  },
  container: {
    maxWidth: '1180px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: 'clamp(1.8rem, 4vw, 3rem)',
    lineHeight: 1.05,
    letterSpacing: '-0.04em',
    color: '#ffffff',
  },
  subtitle: {
    margin: 0,
    color: 'rgba(255,255,255,0.78)',
    fontSize: '0.98rem',
  },
  panel: {
    position: 'relative',
    zIndex: 5,
    background: 'rgba(7, 18, 34, 0.92)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '22px',
    padding: '14px',
    boxShadow: '0 16px 38px rgba(0,0,0,0.22)',
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    margin: '0 0 10px',
    fontSize: '1.2rem',
    color: '#ffffff',
  },
  buttonPrimary: {
    appearance: 'none',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 16px',
    background: '#ffffff',
    color: '#071427',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
  },
  buttonSecondary: {
    appearance: 'none',
    border: '1px solid rgba(255,255,255,0.20)',
    borderRadius: '14px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '44px',
  },
  buttonTiny: {
    appearance: 'none',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '10px',
    padding: '6px 9px',
    background: 'rgba(255,255,255,0.08)',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    minHeight: '30px',
    fontSize: '0.8rem',
    lineHeight: 1,
  },
  buttonTinyPrimary: {
    appearance: 'none',
    border: 'none',
    borderRadius: '10px',
    padding: '6px 9px',
    background: '#ffffff',
    color: '#071427',
    fontWeight: 800,
    cursor: 'pointer',
    minHeight: '30px',
    fontSize: '0.8rem',
    lineHeight: 1,
  },
  input: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.07)',
    color: '#ffffff',
    padding: '12px 14px',
    outline: 'none',
    minHeight: '44px',
  },
  select: {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.07)',
    color: '#ffffff',
    padding: '12px 14px',
    outline: 'none',
    minHeight: '44px',
  },
  darkCard: {
    position: 'relative',
    zIndex: 5,
    background: 'linear-gradient(180deg, rgba(14,35,64,0.96), rgba(7,18,34,0.96))',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '20px',
    padding: '14px',
    boxShadow: '0 12px 24px rgba(0,0,0,0.18)',
  },
  muted: {
    color: 'rgba(255,255,255,0.72)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '999px',
    padding: '7px 10px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: '#ffffff',
    fontSize: '0.86rem',
    fontWeight: 700,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  badgeStrong: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '999px',
    padding: '7px 10px',
    background: '#ffffff',
    color: '#071427',
    fontSize: '0.86rem',
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
}

const layoutCSS = `
  .app-shell .form-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }

  .app-shell .stack-gap {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .app-shell .toolbar-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 10px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .app-shell .dept-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    margin-left: 12px;
    margin-top: 8px;
    max-width: 100%;
    box-sizing: border-box;
  }

  .app-shell .top-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
  }

  .app-shell .search-list {
    display: grid;
    gap: 12px;
  }

  .app-shell .store-list {
    display: grid;
    gap: 12px;
  }

  .app-shell .map-shell {
    position: relative;
    z-index: 0;
    height: 320px;
    margin-bottom: 20px;
    border-radius: 22px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.10);
  }

  .app-shell .map-shell .leaflet-container {
    height: 100%;
    width: 100%;
  }

  .app-shell fieldset.dept-fieldset {
    max-width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    margin-bottom: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px;
    padding: 12px;
    color: #ffffff;
  }

  .app-shell fieldset.dept-fieldset > legend {
    color: #ffffff;
    padding: 0 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-weight: 700;
  }

  .app-shell .menu-popover {
    background: rgba(7,18,34,0.98);
    color: white;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 14px;
    z-index: 20;
    min-width: 140px;
    max-width: min(240px, calc(100vw - 32px));
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(0,0,0,0.28);
  }

  .app-shell .menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 11px 14px;
    border: none;
    background: none;
    cursor: pointer;
    color: white;
  }

  .app-shell .menu-item-danger {
    color: #ff9b9b;
  }

  .app-shell .subdept-input {
    width: 100%;
    box-sizing: border-box;
    margin-top: 10px;
    min-height: 40px;
    padding: 8px 10px !important;
    font-size: 0.95rem;
    border-radius: 12px;
  }

  .app-shell .drawer-overlay {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.42);
  }

  .app-shell .drawer-panel {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 41;
    width: min(430px, 90vw);
    height: 100vh;
    overflow-y: auto;
    background: rgba(7, 18, 34, 0.98);
    border-right: 1px solid rgba(255,255,255,0.12);
    box-shadow: 18px 0 40px rgba(0,0,0,0.38);
    padding: 16px;
    box-sizing: border-box;
  }

  .app-shell .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 1px solid rgba(255,255,255,0.12);
  }

  .app-shell .drawer-header h2 {
    margin: 0;
  }

  .app-shell .drawer-header p {
    margin: 4px 0 0;
  }

  .app-shell .location-picker {
    position: relative;
  }

  .app-shell .location-suggestions {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    z-index: 12;
    background: rgba(7,18,34,0.98);
    border: 1px solid rgba(255,255,255,0.16);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 30px rgba(0,0,0,0.3);
    max-height: 260px;
    overflow-y: auto;
  }

  .app-shell .location-suggestion {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: none;
    color: white;
    padding: 12px 14px;
    cursor: pointer;
  }

  .app-shell .location-suggestion:hover {
    background: rgba(255,255,255,0.07);
  }

  .app-shell .location-suggestion small {
    display: block;
    opacity: 0.74;
    margin-top: 4px;
    line-height: 1.35;
  }

  .app-shell .location-note {
    margin-top: 8px;
    font-size: 0.92rem;
    color: rgba(255,255,255,0.74);
  }

  .app-shell .score-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }

  .app-shell .store-card-head {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: flex-start;
  }

  .app-shell .store-card-title {
    color: #ffffff;
    font-size: 1.05rem;
    line-height: 1.25;
  }

  .app-shell .store-card-meta {
    margin-top: 8px;
    color: rgba(255,255,255,0.88);
  }

  .app-shell .store-card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  @media (max-width: 768px) {
    .app-shell {
      padding: 12px;
    }

    .app-shell .form-grid {
      grid-template-columns: 1fr;
      gap: 12px;
    }

    .app-shell .toolbar-grid {
      grid-template-columns: 1fr;
    }

    .app-shell .dept-row {
      grid-template-columns: 1fr;
      margin-left: 0;
    }

    .app-shell .top-actions {
      align-items: stretch;
    }

    .app-shell .map-shell {
      height: 240px;
    }

    .app-shell .stack-gap > * {
      width: 100%;
    }

    .app-shell fieldset.dept-fieldset {
      padding: 10px;
    }

    .app-shell .subdept-input {
      min-height: 38px;
      padding: 7px 10px !important;
      font-size: 0.92rem;
    }

    .app-shell .drawer-panel {
      width: min(92vw, 430px);
    }

    .app-shell .burger-button {
      width: 36px !important;
      height: 36px !important;
      min-height: 36px !important;
      padding: 0 !important;
      font-size: 0.95rem !important;
      border-radius: 11px !important;
    }
  }
`

// ---------------- HELPERS ----------------

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function singularize(token) {
  if (!token) return token
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`
  }
  if (token.endsWith('ses') && token.length > 3) {
    return token.slice(0, -2)
  }
  if (token.endsWith('s') && token.length > 3) {
    return token.slice(0, -1)
  }
  return token
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .map((t) => singularize(t))
    .filter(Boolean)
    .filter((t) => !STOP_WORDS.has(t))
}

function buildQueryProfile(query) {
  const raw = normalizeText(query)
  const tokens = tokenize(query)
  const expandedTokens = new Set(tokens)
  const categoryHints = new Set()

  for (const token of tokens) {
    for (const [categoryKey, aliases] of Object.entries(CATEGORY_HINTS)) {
      if (
        aliases.some(
          (alias) =>
            alias === token ||
            alias.includes(token) ||
            token.includes(alias)
        )
      ) {
        categoryHints.add(categoryKey)
      }
    }

    const extra = {
      lamp: ['housewares'],
      chair: ['furniture'],
      couch: ['furniture'],
      sofa: ['furniture'],
      desk: ['furniture'],
      jeans: ['clothing'],
      denim: ['clothing'],
      tv: ['electronics'],
      phone: ['electronics'],
      laptop: ['electronics'],
      book: ['books'],
      novel: ['books'],
      puzzle: ['toys'],
      toy: ['toys'],
      dvd: ['media'],
      record: ['media'],
      vinyl: ['media'],
      mug: ['housewares'],
      bowl: ['housewares'],
      blanket: ['housewares'],
      pillow: ['housewares'],
    }[token]

    if (extra) {
      for (const hint of extra) categoryHints.add(hint)
    }
  }

  return { raw, tokens, expandedTokens, categoryHints }
}

function containsLooseMatch(text, queryProfile) {
  const normalized = normalizeText(text)
  if (!normalized || !queryProfile.raw) return false

  if (normalized.includes(queryProfile.raw)) return true

  for (const token of queryProfile.tokens) {
    if (normalized.includes(token)) return true
  }

  return false
}

function tokenOverlapScore(text, queryProfile) {
  const textTokens = tokenize(text)
  if (!textTokens.length || !queryProfile.tokens.length) return 0

  let score = 0
  const matched = new Set()

  for (const textToken of textTokens) {
    if (queryProfile.expandedTokens.has(textToken)) {
      matched.add(textToken)
      score += 3
      continue
    }

    for (const queryToken of queryProfile.tokens) {
      if (
        textToken === queryToken ||
        textToken.includes(queryToken) ||
        queryToken.includes(textToken)
      ) {
        matched.add(textToken)
        score += 2
        break
      }
    }
  }

  return score + matched.size * 0.5
}

function resolveCategoryKey(label) {
  const normalized = normalizeText(label)

  for (const [categoryKey, aliases] of Object.entries(CATEGORY_HINTS)) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
      return categoryKey
    }
  }

  return null
}

function shortenAddress(address) {
  if (!address) return ''
  const parts = String(address).split(',').map((p) => p.trim())
  if (parts.length <= 2) return address

  const street =
    parts[0].match(/^\d+$/) && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0]

  const city = parts.slice(1).find((p) => p && !/^\d+$/.test(p)) || parts[1] || ''

  return city ? `${street}, ${city}` : street
}

function safeArray(value) {
  return Array.isArray(value) ? value : EMPTY_ARRAY
}

function makeEmptyForm() {
  return {
    storeName: '',
    address: '',
    departments: [],
    coords: null,
  }
}

function calculateStoreSerendipity(store) {
  const departments = safeArray(store.departments)
  const allRatings = []

  for (const dept of departments) {
    const deptRating = Number(dept.rating)
    if (Number.isFinite(deptRating)) allRatings.push(deptRating)

    for (const sub of safeArray(dept.subDepartments)) {
      const subRating = Number(sub.rating)
      if (Number.isFinite(subRating)) allRatings.push(subRating)
    }
  }

  if (allRatings.length === 0) return 0

  const avg = allRatings.reduce((sum, n) => sum + n, 0) / allRatings.length
  const breadthBonus = Math.min(15, departments.length * 2 + Math.max(0, allRatings.length - 1) * 0.45)
  const normalized = (avg / 5) * 85 + breadthBonus

  return Math.max(0, Math.min(100, Number(normalized.toFixed(1))))
}

// ---------------- LOCATION PICKER ----------------

function LocationPicker({ value, coords, onChange, placeholder = 'Search a location or address...' }) {
  const [query, setQuery] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setQuery(value || '')
  }, [value])

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      setSuggestions([])
      setLoading(false)
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      if (trimmed.length < 3) {
        setSuggestions([])
        setLoading(false)
        return
      }

      setLoading(true)

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(trimmed)}`
        )
        const data = await res.json()

        if (!cancelled) {
          setSuggestions(Array.isArray(data) ? data.slice(0, 5) : [])
        }
      } catch {
        if (!cancelled) {
          setSuggestions([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query])

  const selectSuggestion = (item) => {
    const lat = parseFloat(item.lat)
    const lng = parseFloat(item.lon)

    setQuery(item.display_name)
    setSuggestions([])
    onChange({
      address: item.display_name,
      coords: Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null,
    })
  }

  return (
    <div className="location-picker">
      <input
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          const nextValue = e.target.value
          setQuery(nextValue)
          onChange({
            address: nextValue,
            coords: null,
          })
        }}
        style={APP_STYLES.input}
      />

      {coords && (
        <div className="location-note">
          Location pinned: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </div>
      )}

      {loading && <div className="location-note">Searching locations…</div>}

      {query.trim().length >= 3 && suggestions.length > 0 && (
        <div className="location-suggestions">
          {suggestions.map((item) => (
            <button
              key={`${item.place_id}-${item.display_name}`}
              type="button"
              className="location-suggestion"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectSuggestion(item)}
            >
              <strong>{item.display_name.split(',')[0]}</strong>
              <small>{item.display_name}</small>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 3 && !loading && suggestions.length === 0 && (
        <div className="location-note">
          No suggestions yet. You can still submit and it will try to geocode the text.
        </div>
      )}
    </div>
  )
}

// ---------------- MAP CLICK ----------------

function MapClickHandler({ onSelect }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        )
        const data = await res.json()

        onSelect({
          lat,
          lng,
          address: data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        })
      } catch {
        onSelect({
          lat,
          lng,
          address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        })
      }
    },
  })

  return null
}

// ---------------- MAP VIEW ----------------

function MapView({ stores, onPickLocation }) {
  const center = [28.8, -82.3]

  return (
    <div className="map-shell">
      <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onSelect={onPickLocation} />

        {stores.map((store) => (
          <Marker key={store.id} position={[store.lat, store.lng]}>
            <Popup>
              <strong>{store.name}</strong>
              <br />
              {store.address}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

// ---------------- STORE CATEGORY DISPLAY ----------------

function StoreDepartmentsDisplay({ departments }) {
  const safeDepartments = safeArray(departments)

  if (!safeDepartments.length) {
    return (
      <div style={{ color: '#ffffff', fontSize: '0.95rem', opacity: 0.82 }}>
        No departments added yet.
      </div>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      {safeDepartments.map((dept) => {
        const subDepartments = safeArray(dept.subDepartments)

        return (
          <div key={dept.id} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#ffffff', lineHeight: 1.35 }}>
              {dept.name} - {dept.rating}/5
            </div>

            {subDepartments.length > 0 && (
              <div style={{ marginLeft: 16, marginTop: 6 }}>
                {subDepartments.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      fontSize: '0.94rem',
                      color: '#ffffff',
                      opacity: 0.82,
                      lineHeight: 1.35,
                    }}
                  >
                    {sub.name} - {sub.rating}/5
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------- DEPARTMENT EDITOR ----------------

function DepartmentEditor({ departments, onChange }) {
  const [customDeptName, setCustomDeptName] = useState('')

  const addDepartment = (name) => {
    if (!name.trim()) return

    onChange([
      ...departments,
      {
        id: makeId(),
        name,
        rating: 3,
        subDepartments: [],
      },
    ])
  }

  const update = (next) => onChange(next)

  const removeDepartment = (id) => update(departments.filter((d) => d.id !== id))

  const updateDeptRating = (id, rating) =>
    update(departments.map((d) => (d.id === id ? { ...d, rating: Number(rating) } : d)))

  const addSubDepartment = (deptId, name) => {
    if (!name.trim()) return
    update(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: [
                ...safeArray(d.subDepartments),
                {
                  id: makeId(),
                  name,
                  rating: 3,
                },
              ],
            }
          : d
      )
    )
  }

  const removeSubDepartment = (deptId, subId) =>
    update(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: safeArray(d.subDepartments).filter((s) => s.id !== subId),
            }
          : d
      )
    )

  const updateSubRating = (deptId, subId, rating) =>
    update(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: safeArray(d.subDepartments).map((s) =>
                s.id === subId ? { ...s, rating: Number(rating) } : s
              ),
            }
          : d
      )
    )

  return (
    <div style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="toolbar-grid">
        <input
          value={customDeptName}
          onChange={(e) => setCustomDeptName(e.target.value)}
          placeholder="Custom department"
          style={APP_STYLES.input}
        />

        <button
          type="button"
          onClick={() => {
            addDepartment(customDeptName)
            setCustomDeptName('')
          }}
          style={APP_STYLES.buttonPrimary}
        >
          Add
        </button>

        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) addDepartment(e.target.value)
            e.target.value = ''
          }}
          style={APP_STYLES.select}
        >
          <option value="" disabled>
            Preset
          </option>
          {PRESET_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {departments.map((dept) => (
        <fieldset key={dept.id} className="dept-fieldset">
          <legend>
            <span>{dept.name}</span>
            <button
              type="button"
              onClick={() => removeDepartment(dept.id)}
              style={APP_STYLES.buttonSecondary}
            >
              Remove
            </button>
          </legend>

          <label style={{ display: 'block', marginTop: 8, color: '#ffffff' }}>
            Rating:{' '}
            <input
              type="number"
              min="1"
              max="5"
              value={dept.rating}
              onChange={(e) => updateDeptRating(dept.id, e.target.value)}
              style={{
                width: '72px',
                marginLeft: 8,
                ...APP_STYLES.input,
                padding: '10px 12px',
              }}
            />
          </label>

          {safeArray(dept.subDepartments).map((sub) => (
            <div key={sub.id} className="dept-row">
              <span
                style={{
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  color: '#ffffff',
                }}
              >
                {sub.name}
              </span>

              <input
                type="number"
                min="1"
                max="5"
                value={sub.rating}
                onChange={(e) => updateSubRating(dept.id, sub.id, e.target.value)}
                style={{
                  width: '72px',
                  ...APP_STYLES.input,
                  padding: '10px 12px',
                }}
              />

              <button
                type="button"
                onClick={() => removeSubDepartment(dept.id, sub.id)}
                style={APP_STYLES.buttonSecondary}
              >
                Remove
              </button>
            </div>
          ))}

          <input
            className="subdept-input"
            placeholder="Add sub-department (press Enter)"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addSubDepartment(dept.id, e.target.value)
                e.target.value = ''
              }
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginTop: '10px',
              ...APP_STYLES.input,
            }}
          />
        </fieldset>
      ))}
    </div>
  )
}

// ---------------- OPTIONS MENU ----------------

function OptionsMenu({ onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return

    const updatePlacement = () => {
      const button = buttonRef.current
      if (!button) return

      const rect = button.getBoundingClientRect()
      const estimatedWidth = 150
      const estimatedHeight = 132
      const margin = 8

      let left = rect.right - estimatedWidth
      left = Math.max(margin, Math.min(left, window.innerWidth - estimatedWidth - margin))

      let top = rect.bottom + 6
      if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - estimatedHeight - 6)
      }

      setMenuStyle({
        position: 'fixed',
        top,
        left,
        width: estimatedWidth,
      })
    }

    updatePlacement()

    const onScrollOrResize = () => updatePlacement()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [open])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onClick={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={APP_STYLES.buttonTiny}
      >
        ⋯
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />

          <div className="menu-popover" style={menuStyle || { position: 'fixed', top: 0, left: 0 }}>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onView()
              }}
              className="menu-item"
            >
              View
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
              className="menu-item"
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
              className="menu-item menu-item-danger"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ---------------- RECOMMENDATION ENGINE ----------------

function serendipityScoreStore(store, query) {
  const profile = buildQueryProfile(query)
  let serendipityScore = 0
  const reasons = []

  const addReason = (label) => {
    if (!label) return
    if (!reasons.includes(label)) reasons.push(label)
  }

  const storeNameOverlap = tokenOverlapScore(store.name, profile)
  if (containsLooseMatch(store.name, profile)) {
    serendipityScore += 12
    addReason('store name')
  }
  if (storeNameOverlap > 0) {
    serendipityScore += storeNameOverlap * 2
  }

  if (containsLooseMatch(store.address, profile)) {
    serendipityScore += 2
    addReason('location')
  }

  const departments = safeArray(store.departments)
  let matchedDepartments = 0
  let matchedSubDepartments = 0
  let ratingBoost = 0

  for (const dept of departments) {
    const deptRating = Number(dept.rating) || 0
    const deptKey = resolveCategoryKey(dept.name)
    const deptHintHit = deptKey && profile.categoryHints.has(deptKey)

    let deptScore = 0

    if (containsLooseMatch(dept.name, profile)) {
      deptScore += 10
      addReason(dept.name)
    }

    const deptOverlap = tokenOverlapScore(dept.name, profile)
    deptScore += deptOverlap * 3

    if (deptHintHit) {
      deptScore += 16
      addReason(dept.name)
    }

    deptScore += deptRating * 1.75

    const subDepartments = safeArray(dept.subDepartments)

    for (const sub of subDepartments) {
      const subRating = Number(sub.rating) || 0
      let subScore = 0

      if (containsLooseMatch(sub.name, profile)) {
        subScore += 8
        addReason(sub.name)
      }

      const subOverlap = tokenOverlapScore(sub.name, profile)
      subScore += subOverlap * 4

      if (deptHintHit) {
        subScore += 8
      }

      subScore += subRating * 2

      if (subScore > 0) {
        matchedSubDepartments += 1
        serendipityScore += subScore
        addReason(`${dept.name} → ${sub.name}`)
      }
    }

    if (deptScore > 0) {
      matchedDepartments += 1
      serendipityScore += deptScore
      ratingBoost += deptRating
      addReason(dept.name)
    }
  }

  serendipityScore += matchedDepartments * 2.5
  serendipityScore += matchedSubDepartments * 1.25
  serendipityScore += ratingBoost * 0.4

  if (matchedDepartments > 0 || matchedSubDepartments > 0) {
    serendipityScore += Math.min(6, departments.length * 0.25)
  }

  return {
    serendipityScore,
    reasons,
    matchedDepartments,
    matchedSubDepartments,
  }
}

// ---------------- FORM PANEL ----------------

function StoreFormPanel({
  title,
  submitLabel,
  form,
  setForm,
  onSubmit,
  onCancel,
}) {
  return (
    <form onSubmit={onSubmit} style={{ ...APP_STYLES.panel, marginBottom: '16px' }} className="store-card">
      <div className="top-actions" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={APP_STYLES.sectionTitle}>{title}</h2>
        </div>

        <button type="button" onClick={onCancel} style={APP_STYLES.buttonSecondary}>
          Cancel
        </button>
      </div>

      <div className="form-grid">
        <div className="stack-gap">
          <input
            placeholder="Store name"
            value={form.storeName}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                storeName: e.target.value,
              }))
            }
            style={APP_STYLES.input}
          />

          <LocationPicker
            value={form.address}
            coords={form.coords}
            onChange={(next) =>
              setForm((prev) => ({
                ...prev,
                address: next.address,
                coords: next.coords,
              }))
            }
          />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" style={APP_STYLES.buttonPrimary}>
              {submitLabel}
            </button>

            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  address: '',
                  coords: null,
                }))
              }
              style={APP_STYLES.buttonSecondary}
            >
              Clear Location
            </button>
          </div>
        </div>

        <DepartmentEditor
          departments={form.departments}
          onChange={(departments) =>
            setForm((prev) => ({
              ...prev,
              departments,
            }))
          }
        />
      </div>
    </form>
  )
}

// ---------------- STORE PREVIEW ----------------

function StorePreviewPanel({ store, onClose, onEdit, previewRef }) {
  if (!store) return null

  const storeSerendipityScore = calculateStoreSerendipity(store)

  return (
    <div ref={previewRef} style={{ ...APP_STYLES.panel, marginBottom: '16px' }}>
      <div className="top-actions" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={APP_STYLES.sectionTitle}>Store preview</h2>
        </div>

        <button type="button" onClick={onClose} style={APP_STYLES.buttonSecondary}>
          Close
        </button>
      </div>

      <div style={APP_STYLES.darkCard}>
        <div className="store-card-head">
          <strong className="store-card-title">{store.name}</strong>

          <span style={APP_STYLES.badgeStrong}>
            {storeSerendipityScore.toFixed(0)}/100
          </span>
        </div>

        <div className="score-row">
          <span style={APP_STYLES.badge}>Store Serendipity</span>
          <span style={APP_STYLES.badge}>
            {safeArray(store.departments).length} departments
          </span>
        </div>

        <p className="store-card-meta">{store.address}</p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <button type="button" onClick={onEdit} style={APP_STYLES.buttonPrimary}>
            Edit Store
          </button>

          <button type="button" onClick={onClose} style={APP_STYLES.buttonSecondary}>
            Back
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <StoreDepartmentsDisplay departments={store.departments} />
        </div>
      </div>
    </div>
  )
}

// ---------------- HOVER PEEK ----------------

function HoverPeek({ store, onOpen }) {
  if (!store) return null

  const score = calculateStoreSerendipity(store)

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 50,
        width: 'min(360px, calc(100vw - 32px))',
        pointerEvents: 'none',
      }}
    >
      <div style={{ ...APP_STYLES.darkCard, pointerEvents: 'none' }}>
        <div className="store-card-head">
          <strong className="store-card-title">{store.name}</strong>
          <span style={APP_STYLES.badgeStrong}>{score.toFixed(0)}/100</span>
        </div>

        <p className="store-card-meta" style={{ marginBottom: 0 }}>
          {shortenAddress(store.address)}
        </p>

        <div style={{ marginTop: 10, fontSize: '0.92rem', color: 'rgba(255,255,255,0.78)' }}>
          Hover preview
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button
            type="button"
            onClick={onOpen}
            style={{ ...APP_STYLES.buttonTinyPrimary, pointerEvents: 'auto' }}
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------- MAIN APP ----------------

export default function App() {
  const [stores, setStores] = useState(() => {
    try {
      const saved = localStorage.getItem('stores')
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(makeEmptyForm())

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(makeEmptyForm())

  const [expandedStoreId, setExpandedStoreId] = useState(null)
  const [previewStore, setPreviewStore] = useState(null)
  const [hoveredStore, setHoveredStore] = useState(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  const previewRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('stores', JSON.stringify(stores))
  }, [stores])

  useEffect(() => {
    const trimmed = searchQuery.trim()

    if (!trimmed) {
      setSearchResults([])
      return
    }

    const results = stores
      .map((store) => {
        const searchScored = serendipityScoreStore(store, trimmed)
        const storeSerendipityScore = calculateStoreSerendipity(store)

        return {
          ...store,
          ...searchScored,
          storeSerendipityScore,
        }
      })
      .filter((s) => s.serendipityScore > 0)
      .sort((a, b) => {
        if (b.serendipityScore !== a.serendipityScore) {
          return b.serendipityScore - a.serendipityScore
        }

        return b.storeSerendipityScore - a.storeSerendipityScore
      })
      .slice(0, 3)

    setSearchResults(results)
  }, [searchQuery, stores])

  useEffect(() => {
    if (!previewStore || !previewRef.current) return

    const node = previewRef.current
    const scrollPreview = () => {
      const top = Math.max(0, node.getBoundingClientRect().top + window.pageYOffset - 10)
      window.scrollTo({ top, behavior: 'smooth' })
      node.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const t1 = window.setTimeout(() => {
      requestAnimationFrame(scrollPreview)
    }, 60)

    const t2 = window.setTimeout(scrollPreview, 260)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [previewStore])

  const geocode = async (addr) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(addr)}`
      )
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) return null

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        address: data[0].display_name || addr,
      }
    } catch {
      return null
    }
  }

  const resetCreate = () => {
    setShowCreateForm(false)
    setCreateForm(makeEmptyForm())
  }

  const addStore = async (e) => {
    e.preventDefault()

    if (!createForm.storeName.trim() || !createForm.address.trim()) {
      return
    }

    let coords = createForm.coords
    let address = createForm.address

    if (!coords) {
      const geo = await geocode(createForm.address)
      if (geo) {
        coords = { lat: geo.lat, lng: geo.lng }
        address = geo.address || createForm.address
      }
    }

    if (!coords) {
      alert('No location found')
      return
    }

    setStores((prev) => [
      ...prev,
      {
        id: makeId(),
        name: createForm.storeName,
        address,
        lat: coords.lat,
        lng: coords.lng,
        departments: createForm.departments,
      },
    ])

    resetCreate()
    setDrawerOpen(false)
  }

  const startEdit = (store) => {
    setEditId(store.id)
    setShowCreateForm(false)
    setDrawerOpen(false)
    setExpandedStoreId(null)
    setPreviewStore(null)
    setHoveredStore(null)
    setEditForm({
      storeName: store.name,
      address: store.address,
      coords: { lat: store.lat, lng: store.lng },
      departments: store.departments,
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm(makeEmptyForm())
  }

  const saveEdit = async (e) => {
    e.preventDefault()

    if (!editForm.storeName.trim() || !editForm.address.trim()) {
      return
    }

    let coords = editForm.coords
    let address = editForm.address

    if (!coords) {
      const geo = await geocode(editForm.address)
      if (geo) {
        coords = { lat: geo.lat, lng: geo.lng }
        address = geo.address || editForm.address
      }
    }

    if (!coords) {
      alert('No location found')
      return
    }

    setStores((prev) =>
      prev.map((s) =>
        s.id === editId
          ? {
              ...s,
              name: editForm.storeName,
              address,
              lat: coords.lat,
              lng: coords.lng,
              departments: editForm.departments,
            }
          : s
      )
    )

    setEditId(null)
    setEditForm(makeEmptyForm())
  }

  const deleteStore = (id) => {
    setStores((prev) => prev.filter((s) => s.id !== id))
    if (editId === id) {
      cancelEdit()
    }
    if (previewStore?.id === id) {
      setPreviewStore(null)
    }
    if (hoveredStore?.id === id) {
      setHoveredStore(null)
    }
  }

  const handleMapPick = ({ lat, lng, address }) => {
    if (editId) {
      setEditForm((p) => ({ ...p, address, coords: { lat, lng } }))
      return
    }

    if (showCreateForm) {
      setCreateForm((p) => ({ ...p, address, coords: { lat, lng } }))
    }
  }

  const openPreview = (store) => {
    setPreviewStore(store)
    setDrawerOpen(false)
    setHoveredStore(null)
    setExpandedStoreId(null)
  }

  return (
    <div className="app-shell" style={APP_STYLES.shell}>
      <style>{layoutCSS}</style>

      <div style={APP_STYLES.container}>
        <div style={APP_STYLES.headerRow}>
          <div
            className="header-bar"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'nowrap',
              width: '100%',
            }}
          >
            <div
              className="header-brand"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                className="header-copy"
                style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}
              >
                <h1 style={APP_STYLES.title}>Thrifter Sifter</h1>
                <p style={APP_STYLES.subtitle}>Serendipitous search on the thrifting trail</p>
              </div>
            </div>

            <button
              type="button"
              className="burger-button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open saved stores menu"
              style={{
                width: '40px',
                height: '40px',
                minHeight: '40px',
                padding: 0,
                fontSize: '1rem',
                borderRadius: '12px',
                flex: '0 0 auto',
              }}
            >
              ☰
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div style={{ ...APP_STYLES.panel, marginBottom: '16px' }}>
          <h2 style={APP_STYLES.sectionTitle}>Search</h2>

          <input
            style={APP_STYLES.input}
            placeholder="Search for an item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery.trim() && searchResults.length === 0 && (
            <div style={{ marginTop: 10, color: '#ffffff', opacity: 0.72 }}>
              No strong matches yet.
            </div>
          )}

          {searchResults.length > 0 && (
            <div style={{ marginTop: 12 }} className="search-list">
              <h3 style={{ margin: '0 0 4px', color: '#ffffff' }}>Top Matches</h3>

              {searchResults.map((s) => (
                <div key={s.id} style={APP_STYLES.darkCard}>
                  <div className="store-card-head">
                    <strong className="store-card-title">{s.name}</strong>

                    <span style={APP_STYLES.badgeStrong}>
                      Search {s.serendipityScore.toFixed(1)}
                    </span>
                  </div>

                  <div style={{ color: '#ffffff', opacity: 0.88, marginTop: 6 }}>
                    {shortenAddress(s.address)}
                  </div>

                  <div className="score-row">
                    <span style={APP_STYLES.badge}>
                      Store score {s.storeSerendipityScore.toFixed(0)}/100
                    </span>
                  </div>

                  {s.reasons?.length > 0 && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: '0.92rem',
                        color: '#ffffff',
                        opacity: 0.78,
                      }}
                    >
                      Matches: {s.reasons.slice(0, 3).join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAP */}
        <MapView stores={stores} onPickLocation={handleMapPick} />

        {/* CREATE BUTTON / PANEL BELOW MAP */}
        {!editId && !showCreateForm && (
          <div style={{ ...APP_STYLES.panel, marginBottom: '16px' }} className="store-card">
            <div className="top-actions">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                style={APP_STYLES.buttonPrimary}
              >
                Add Store
              </button>
            </div>
          </div>
        )}

        {/* CREATE */}
        {!editId && showCreateForm && (
          <StoreFormPanel
            title="Add Store"
            submitLabel="Create"
            form={createForm}
            setForm={setCreateForm}
            onSubmit={addStore}
            onCancel={resetCreate}
          />
        )}

        {/* EDIT */}
        {editId && (
          <StoreFormPanel
            title="Edit Store"
            submitLabel="Save Changes"
            form={editForm}
            setForm={setEditForm}
            onSubmit={saveEdit}
            onCancel={cancelEdit}
          />
        )}

        {/* INLINE PREVIEW PANEL BELOW THE MAIN FLOW */}
        <StorePreviewPanel
          store={previewStore}
          onClose={() => setPreviewStore(null)}
          onEdit={() => {
            const target = previewStore
            setPreviewStore(null)
            if (target) startEdit(target)
          }}
          previewRef={previewRef}
        />
      </div>

      {/* DRAWER */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setDrawerOpen(false)} />

          <aside className="drawer-panel">
            <div className="drawer-header">
              <div>
                <h2 style={APP_STYLES.sectionTitle}>Saved Stores</h2>
                <p style={APP_STYLES.muted}>
                  {stores.length} saved {stores.length === 1 ? 'store' : 'stores'}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                style={APP_STYLES.buttonSecondary}
              >
                Close
              </button>
            </div>

            <div className="store-list">
              {stores.length === 0 && (
                <p style={{ color: '#ffffff', opacity: 0.75, marginTop: 0 }}>
                  No stores yet. Use Add Store to create one.
                </p>
              )}

              {stores.map((store) => {
                const isOpen = expandedStoreId === store.id
                const storeSerendipityScore = calculateStoreSerendipity(store)

                return (
                  <div
                    key={store.id}
                    style={{
                      ...APP_STYLES.darkCard,
                      cursor: 'pointer',
                    }}
                    onMouseEnter={() => setHoveredStore(store)}
                    onMouseLeave={() =>
                      setHoveredStore((curr) => (curr?.id === store.id ? null : curr))
                    }
                    onClick={() => setExpandedStoreId(isOpen ? null : store.id)}
                  >
                    <div className="store-card-head">
                      <strong className="store-card-title">{store.name}</strong>

                      <span style={APP_STYLES.badgeStrong}>
                        {storeSerendipityScore.toFixed(0)}/100
                      </span>
                    </div>

                    <p className="store-card-meta">{shortenAddress(store.address)}</p>

                    <div className="score-row">
                      <span style={APP_STYLES.badge}>Store Serendipity</span>
                      <span style={APP_STYLES.badge}>
                        {safeArray(store.departments).length} departments
                      </span>
                    </div>

                    <div
                      className="store-card-actions"
                      style={{ marginTop: 10 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        style={APP_STYLES.buttonTinyPrimary}
                        onClick={() => openPreview(store)}
                      >
                        View
                      </button>

                      <OptionsMenu
                        onView={() => openPreview(store)}
                        onEdit={() => startEdit(store)}
                        onDelete={() => deleteStore(store.id)}
                      />
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 12 }} onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 10,
                            alignItems: 'center',
                            marginBottom: 10,
                            flexWrap: 'wrap',
                          }}
                        >
                          <div style={{ color: '#ffffff', fontWeight: 700 }}>
                            Store details
                          </div>

                          <button
                            type="button"
                            style={APP_STYLES.buttonTiny}
                            onClick={() => openPreview(store)}
                          >
                            View
                          </button>
                        </div>

                        <StoreDepartmentsDisplay departments={store.departments} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>
        </>
      )}

      {/* HOVER PEEK */}
      {hoveredStore && !previewStore && !drawerOpen && (
        <HoverPeek store={hoveredStore} onOpen={() => openPreview(hoveredStore)} />
      )}
    </div>
  )
}
import { useState, useEffect } from 'react'
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
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    margin-top: 0;
    background: rgba(7,18,34,0.98);
    color: white;
    border: 1px solid rgba(255,255,255,0.18);
    border-radius: 14px;
    z-index: 10;
    min-width: 140px;
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
    if (
      aliases.some(
        (alias) => normalized === alias || normalized.includes(alias)
      )
    ) {
      return categoryKey
    }
  }

  return null
}

function shortenAddress(address) {
  if (!address) return ''
  const parts = address.split(',').map((p) => p.trim())
  if (parts.length <= 2) return address

  const street =
    parts[0].match(/^\d+$/) && parts[1]
      ? `${parts[0]} ${parts[1]}`
      : parts[0]

  const city =
    parts.slice(1).find((p) => p && !/^\d+$/.test(p)) || parts[1] || ''

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

// ---------------- MAP CLICK ----------------

function MapClickHandler({ onSelect }) {
  useMapEvents({
    async click(e) {
      const { lat, lng } = e.latlng

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
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
            <div
              style={{
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.35,
              }}
            >
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

  const removeDepartment = (id) =>
    update(departments.filter((d) => d.id !== id))

  const updateDeptRating = (id, rating) =>
    update(
      departments.map((d) =>
        d.id === id ? { ...d, rating: Number(rating) } : d
      )
    )

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
              subDepartments: safeArray(d.subDepartments).filter(
                (s) => s.id !== subId
              ),
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
            <button type="button" onClick={() => removeDepartment(dept.id)} style={APP_STYLES.buttonSecondary}>
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
                onChange={(e) =>
                  updateSubRating(dept.id, sub.id, e.target.value)
                }
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

function OptionsMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={APP_STYLES.buttonSecondary}
      >
        Options
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 5 }}
          />

          <div className="menu-popover">
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
    addReason('address')
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

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState(makeEmptyForm())

  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(makeEmptyForm())

  const [expandedStoreId, setExpandedStoreId] = useState(null)
  const [showStores, setShowStores] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

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
        const scored = serendipityScoreStore(store, trimmed)
        return { ...store, ...scored }
      })
      .filter((s) => s.serendipityScore > 0)
      .sort((a, b) => b.serendipityScore - a.serendipityScore)
      .slice(0, 3)

    setSearchResults(results)
  }, [searchQuery, stores])

  const geocode = async (addr) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          addr
        )}`
      )
      const data = await res.json()
      if (!data.length) return null

      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
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
    if (!coords) coords = await geocode(createForm.address)

    if (!coords) {
      alert('No location found')
      return
    }

    setStores([
      ...stores,
      {
        id: Date.now(),
        name: createForm.storeName,
        address: createForm.address,
        lat: coords.lat,
        lng: coords.lng,
        departments: createForm.departments,
      },
    ])

    resetCreate()
    setShowStores(true)
  }

  const startEdit = (store) => {
    setEditId(store.id)
    setShowCreateForm(false)
    setShowStores(true)
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
    if (!coords) coords = await geocode(editForm.address)

    if (!coords) {
      alert('No location found')
      return
    }

    setStores(
      stores.map((s) =>
        s.id === editId
          ? {
              ...s,
              name: editForm.storeName,
              address: editForm.address,
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
    setStores(stores.filter((s) => s.id !== id))
    if (editId === id) {
      cancelEdit()
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

  return (
    <div className="app-shell" style={APP_STYLES.shell}>
      <style>{layoutCSS}</style>

      <div style={APP_STYLES.container}>
        <div style={APP_STYLES.headerRow}>
          <h1 style={APP_STYLES.title}>Thrifter Sifter</h1>
          <p style={APP_STYLES.subtitle}>
            Search above the map, create stores, then reveal saved stores when you need them.
          </p>
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
                  <strong
                    style={{
                      color: '#ffffff',
                      fontSize: '1.02rem',
                      display: 'block',
                      marginBottom: 4,
                    }}
                  >
                    {s.name}
                  </strong>

                  <div style={{ color: '#ffffff', opacity: 0.88 }}>
                    {shortenAddress(s.address)}
                  </div>

                  <div style={{ color: '#ffffff', marginTop: 6 }}>
                    Serendipity Score: {s.serendipityScore.toFixed(1)}
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

        {/* ADD / EDIT ACTIONS */}
        {!editId && !showCreateForm && (
          <div style={{ ...APP_STYLES.panel, marginBottom: '16px' }}>
            <div className="top-actions">
              <div>
                <h2 style={APP_STYLES.sectionTitle}>Add a store</h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditId(null)
                  setShowCreateForm(true)
                }}
                style={APP_STYLES.buttonPrimary}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* CREATE */}
        {!editId && showCreateForm && (
          <form onSubmit={addStore} style={{ ...APP_STYLES.panel, marginBottom: '16px' }}>
            <div className="top-actions" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={APP_STYLES.sectionTitle}>Add Store</h2>
              </div>

              <button
                type="button"
                onClick={resetCreate}
                style={APP_STYLES.buttonSecondary}
              >
                Cancel
              </button>
            </div>

            <div className="form-grid">
              <div className="stack-gap">
                <input
                  placeholder="Store name"
                  value={createForm.storeName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, storeName: e.target.value })
                  }
                  style={APP_STYLES.input}
                />

                <input
                  placeholder="Address"
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      address: e.target.value,
                      coords: null,
                    })
                  }
                  style={APP_STYLES.input}
                />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="submit" style={APP_STYLES.buttonPrimary}>
                    Finish
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        address: '',
                        coords: null,
                      })
                    }
                    style={APP_STYLES.buttonSecondary}
                  >
                    Clear Address
                  </button>
                </div>
              </div>

              <DepartmentEditor
                departments={createForm.departments}
                onChange={(departments) =>
                  setCreateForm({ ...createForm, departments })
                }
              />
            </div>
          </form>
        )}

        {/* EDIT */}
        {editId && (
          <form onSubmit={saveEdit} style={{ ...APP_STYLES.panel, marginBottom: '16px' }}>
            <div className="top-actions" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={APP_STYLES.sectionTitle}>Edit Store</h2>
              </div>

              <button
                type="button"
                onClick={cancelEdit}
                style={APP_STYLES.buttonSecondary}
              >
                Cancel
              </button>
            </div>

            <div className="form-grid">
              <div className="stack-gap">
                <input
                  placeholder="Store name"
                  value={editForm.storeName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, storeName: e.target.value })
                  }
                  style={APP_STYLES.input}
                />

                <input
                  placeholder="Address"
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      address: e.target.value,
                      coords: null,
                    })
                  }
                  style={APP_STYLES.input}
                />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="submit" style={APP_STYLES.buttonPrimary}>
                    Finish
                  </button>

                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={APP_STYLES.buttonSecondary}
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <DepartmentEditor
                departments={editForm.departments}
                onChange={(departments) =>
                  setEditForm({ ...editForm, departments })
                }
              />
            </div>
          </form>
        )}

        {/* STORES COLLAPSIBLE */}
        <div style={APP_STYLES.panel}>
          <div className="top-actions">
            <div>
              <h2 style={APP_STYLES.sectionTitle}>Saved Stores</h2>
              <div style={APP_STYLES.muted}>
                Click to show or hide the stores you have already created.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowStores((v) => !v)}
              style={APP_STYLES.buttonSecondary}
            >
              {showStores ? 'Hide Stores' : `Show Stores (${stores.length})`}
            </button>
          </div>

          {showStores && (
            <div style={{ marginTop: 14 }} className="store-list">
              {stores.length === 0 && (
                <p style={{ color: '#ffffff', opacity: 0.75, marginTop: 0 }}>
                  No stores yet.
                </p>
              )}

              {stores.map((store) => {
                const isOpen = expandedStoreId === store.id

                return (
                  <div
                    key={store.id}
                    style={{
                      ...APP_STYLES.darkCard,
                      cursor: 'pointer',
                    }}
                    onClick={() =>
                      setExpandedStoreId(isOpen ? null : store.id)
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <strong
                        style={{
                          color: '#ffffff',
                          fontSize: '1.05rem',
                          lineHeight: 1.25,
                        }}
                      >
                        {store.name}
                      </strong>

                      <span style={{ color: '#ffffff', opacity: 0.8 }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>

                    <p
                      style={{
                        marginBottom: 0,
                        color: '#ffffff',
                        opacity: 0.88,
                        marginTop: 8,
                      }}
                    >
                      {shortenAddress(store.address)}
                    </p>

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

                          <OptionsMenu
                            onEdit={() => startEdit(store)}
                            onDelete={() => deleteStore(store.id)}
                          />
                        </div>

                        <StoreDepartmentsDisplay departments={store.departments} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
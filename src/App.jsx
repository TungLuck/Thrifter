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
    'lamp',
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

    // A few helpful broad expansions for common thrift-item queries
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
    <div style={{ height: '300px', marginBottom: '20px' }}>
      <MapContainer center={center} zoom={10} style={{ height: '100%' }}>
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
      <div style={{ color: '#667085', fontSize: '0.92rem' }}>
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
            <div style={{ fontWeight: 600 }}>
              {dept.name} - {dept.rating}/5
            </div>

            {subDepartments.length > 0 && (
              <div style={{ marginLeft: 16, marginTop: 4 }}>
                {subDepartments.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      fontSize: '0.9em',
                      color: '#667085',
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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto auto',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '10px',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
      >
        <input
          value={customDeptName}
          onChange={(e) => setCustomDeptName(e.target.value)}
          placeholder="Custom department"
          style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
        />

        <button
          type="button"
          onClick={() => {
            addDepartment(customDeptName)
            setCustomDeptName('')
          }}
        >
          Add
        </button>

        <select
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) addDepartment(e.target.value)
            e.target.value = ''
          }}
          style={{ minWidth: 0, boxSizing: 'border-box' }}
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
        <fieldset
          key={dept.id}
          style={{
            maxWidth: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            marginBottom: '10px',
          }}
        >
          <legend>
            {dept.name}
            <button type="button" onClick={() => removeDepartment(dept.id)}>
              Remove
            </button>
          </legend>

          <label>
            Rating:{' '}
            <input
              type="number"
              min="1"
              max="5"
              value={dept.rating}
              onChange={(e) => updateDeptRating(dept.id, e.target.value)}
              style={{ width: '60px' }}
            />
          </label>

          {safeArray(dept.subDepartments).map((sub) => (
            <div
              key={sub.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                gap: '8px',
                alignItems: 'center',
                marginLeft: '12px',
                marginTop: '8px',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
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
                style={{ width: '60px' }}
              />

              <button
                type="button"
                onClick={() => removeSubDepartment(dept.id, sub.id)}
              >
                Remove
              </button>
            </div>
          ))}

          <input
            placeholder="Add sub-department (Enter)"
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
      >
        Options
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 5 }}
          />

          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              background: '#0a1f3c',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              zIndex: 10,
              minWidth: '120px',
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onEdit()
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'white',
              }}
            >
              Edit
            </button>

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onDelete()
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: '#ff6b6b',
              }}
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

function scoreStore(store, query) {
  const profile = buildQueryProfile(query)
  let score = 0
  const reasons = []

  const addReason = (label) => {
    if (!label) return
    if (!reasons.includes(label)) reasons.push(label)
  }

  // Store name should matter a bit, especially if users name stores descriptively.
  const storeNameOverlap = tokenOverlapScore(store.name, profile)
  if (containsLooseMatch(store.name, profile)) {
    score += 12
    addReason('store name')
  }
  if (storeNameOverlap > 0) {
    score += storeNameOverlap * 2
  }

  // Address is a weak signal; keep it small.
  if (containsLooseMatch(store.address, profile)) {
    score += 2
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
        score += subScore
        addReason(`${dept.name} → ${sub.name}`)
      }
    }

    if (deptScore > 0) {
      matchedDepartments += 1
      score += deptScore
      ratingBoost += deptRating
      addReason(dept.name)
    }
  }

  // Breadth bonus: stores with multiple relevant departments rank higher.
  score += matchedDepartments * 2.5
  score += matchedSubDepartments * 1.25

  // Small boost for overall store quality if it has decent ratings in matched sections.
  score += ratingBoost * 0.4

  // Keep score from being too flat by adding a tiny density factor.
  if (matchedDepartments > 0 || matchedSubDepartments > 0) {
    score += Math.min(6, departments.length * 0.25)
  }

  return {
    score,
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

  const [createForm, setCreateForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  const [expandedStoreId, setExpandedStoreId] = useState(null)

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
        const scored = scoreStore(store, trimmed)
        return { ...store, ...scored }
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    setSearchResults(results)
  }, [searchQuery, stores])

  // ---------------- GEOCODE ----------------

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

  // ---------------- CREATE ----------------

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

    setCreateForm(EMPTY_FORM)
  }

  // ---------------- EDIT ----------------

  const startEdit = (store) => {
    setEditId(store.id)
    setEditForm({
      storeName: store.name,
      address: store.address,
      coords: { lat: store.lat, lng: store.lng },
      departments: store.departments,
    })
  }

  const cancelEdit = () => {
    setEditId(null)
    setEditForm(EMPTY_FORM)
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
    setEditForm(EMPTY_FORM)
  }

  const deleteStore = (id) => {
    setStores(stores.filter((s) => s.id !== id))
    if (editId === id) {
      cancelEdit()
    }
  }

  const handleMapPick = ({ lat, lng, address }) => {
    const setter = editId ? setEditForm : setCreateForm
    setter((p) => ({ ...p, address, coords: { lat, lng } }))
  }

  // ---------------- UI ----------------

  return (
    <div className="app-container">
      <h1>Thrifter Sifter</h1>

      <MapView stores={stores} onPickLocation={handleMapPick} />

      {/* SEARCH */}
      <div style={{ margin: '10px 0 20px' }}>
        <input
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
          placeholder="Search for an item..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {searchQuery.trim() && searchResults.length === 0 && (
          <div style={{ marginTop: 10, color: '#667085' }}>
            No strong matches yet.
          </div>
        )}

        {searchResults.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <h3>Top Matches</h3>

            {searchResults.map((s) => (
              <div key={s.id} className="store-card">
                <strong style={{ color: '#0a1f3c' }}>{s.name}</strong>
                <div style={{ color: '#0a1f3c' }}>{shortenAddress(s.address)}</div>
                <div style={{ color: '#0a1f3c' }}>Score: {s.score.toFixed(1)}</div>

                {s.reasons?.length > 0 && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: '0.9rem',
                      color: '#667085',
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

      {/* CREATE */}
      {!editId && (
        <form onSubmit={addStore}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                placeholder="Store name"
                value={createForm.storeName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, storeName: e.target.value })
                }
                style={{ width: '100%', boxSizing: 'border-box' }}
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
                style={{ width: '100%', boxSizing: 'border-box' }}
              />

              <button type="submit">Add Store</button>
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
        <form onSubmit={saveEdit}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                placeholder="Store name"
                value={editForm.storeName}
                onChange={(e) =>
                  setEditForm({ ...editForm, storeName: e.target.value })
                }
                style={{ width: '100%', boxSizing: 'border-box' }}
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
                style={{ width: '100%', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="submit">Save</button>
                <button type="button" onClick={cancelEdit}>
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

      {/* STORE LIST */}
      <h2>Stores</h2>

      {stores.length === 0 && <p style={{ color: '#667085' }}>No stores yet.</p>}

      {stores.map((store) => (
        <div
          key={store.id}
          className="store-card"
          onClick={() =>
            setExpandedStoreId(
              expandedStoreId === store.id ? null : store.id
            )
          }
          style={{
            cursor: 'pointer',
            color: '#0a1f3c',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong style={{ color: '#0a1f3c' }}>{store.name}</strong>

            <OptionsMenu
              onEdit={() => startEdit(store)}
              onDelete={() => deleteStore(store.id)}
            />
          </div>

          <p style={{ marginBottom: 0, color: '#0a1f3c' }}>
            {shortenAddress(store.address)}
          </p>

          {expandedStoreId === store.id && (
            <div style={{ marginTop: 8 }}>
              <StoreDepartmentsDisplay departments={store.departments} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
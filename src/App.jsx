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
  treasureScore: 5,
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

function safeArray(value) {
  return Array.isArray(value) ? value : EMPTY_ARRAY
}

function normalizeTreasureScore(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 5
  return Math.min(10, Math.max(1, n))
}

function formatTreasureScore(value) {
  return `${normalizeTreasureScore(value)}/10`
}

function normalizeDepartmentRecord(dept) {
  const safeDept = dept || {}

  return {
    id: safeDept.id || makeId(),
    name: safeDept.name || '',
    rating: Number(safeDept.rating) || 3,
    notes: typeof safeDept.notes === 'string' ? safeDept.notes : '',
    subDepartments: safeArray(safeDept.subDepartments).map((sub) => ({
      id: sub?.id || makeId(),
      name: sub?.name || '',
      rating: Number(sub?.rating) || 3,
      notes: typeof sub?.notes === 'string' ? sub.notes : '',
    })),
  }
}

function normalizeStoreRecord(store) {
  const safeStore = store || {}

  return {
    id: safeStore.id || Date.now(),
    name: safeStore.name || '',
    address: safeStore.address || '',
    lat: Number(safeStore.lat) || 0,
    lng: Number(safeStore.lng) || 0,
    treasureScore: normalizeTreasureScore(safeStore.treasureScore),
    departments: safeArray(safeStore.departments).map(normalizeDepartmentRecord),
  }
}

function scoreField(text, queryTokens, weight) {
  const normalized = normalizeText(text)
  if (!normalized || !queryTokens.length) {
    return { score: 0, matchedTokens: 0 }
  }

  const fieldTokens = tokenize(text)
  if (!fieldTokens.length) {
    return { score: 0, matchedTokens: 0 }
  }

  const fieldSet = new Set(fieldTokens)
  let score = 0
  let matchedTokens = 0

  for (const token of queryTokens) {
    if (fieldSet.has(token)) {
      score += weight * 4
      matchedTokens += 1
    }
  }

  if (queryTokens.length > 1 && normalized.includes(queryTokens.join(' '))) {
    score += weight * 2
  }

  score += matchedTokens * weight * 0.5

  return { score, matchedTokens }
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

            {dept.notes?.trim() && (
              <div
                style={{
                  marginTop: 3,
                  marginLeft: 14,
                  fontSize: '0.85em',
                  color: '#667085',
                  lineHeight: 1.35,
                }}
              >
                Common items: {dept.notes}
              </div>
            )}

            {subDepartments.length > 0 && (
              <div style={{ marginLeft: 16, marginTop: 4 }}>
                {subDepartments.map((sub) => (
                  <div key={sub.id} style={{ marginBottom: 6 }}>
                    <div
                      style={{
                        fontSize: '0.9em',
                        color: '#667085',
                        lineHeight: 1.35,
                      }}
                    >
                      {sub.name} - {sub.rating}/5
                    </div>
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

  const update = (next) => onChange(next)

  const addDepartment = (name) => {
    if (!name.trim()) return

    update([
      ...departments,
      {
        id: makeId(),
        name,
        rating: 3,
        notes: '',
        subDepartments: [],
      },
    ])
  }

  const removeDepartment = (id) =>
    update(departments.filter((d) => d.id !== id))

  const updateDeptRating = (id, rating) =>
    update(
      departments.map((d) =>
        d.id === id ? { ...d, rating: Number(rating) } : d
      )
    )

  const updateDeptNotes = (id, notes) =>
    update(
      departments.map((d) =>
        d.id === id ? { ...d, notes } : d
      )
    )

  const addSubDepartment = (deptId) => {
    const name = window.prompt('Sub department name')
    if (!name || !name.trim()) return

    update(
      departments.map((d) =>
        d.id === deptId
          ? {
              ...d,
              subDepartments: [
                ...safeArray(d.subDepartments),
                {
                  id: makeId(),
                  name: name.trim(),
                  rating: 3,
                  notes: '',
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

      {departments.map((dept) => {
        const subDepartments = safeArray(dept.subDepartments)

        return (
          <div
            key={dept.id}
            style={{
              maxWidth: '100%',
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'hidden',
              marginBottom: '10px',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '6px',
              padding: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '12px',
                maxWidth: '100%',
                boxSizing: 'border-box',
              }}
            >
              <strong
                className="editor-heading"
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  overflowWrap: 'anywhere',
                  lineHeight: 1.25,
                  color: 'var(--editor-heading-color, #ffffff)',
                }}
              >
                {dept.name}
              </strong>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  flex: '0 0 auto',
                }}
              >
                <button type="button" onClick={() => removeDepartment(dept.id)}>
                  Remove
                </button>

                <button type="button" onClick={() => addSubDepartment(dept.id)}>
                  Add
                </button>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>
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

              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>
                  Common items
                </label>
                <div
                  style={{
                    marginBottom: 6,
                    fontSize: '0.82rem',
                    color: '#667085',
                    lineHeight: 1.35,
                  }}
                >
                  Examples: jeans, novels, pots etc.
                </div>
                <textarea
                  value={dept.notes || ''}
                  onChange={(e) => updateDeptNotes(dept.id, e.target.value)}
                  placeholder="jeans, novels, pots..."
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>
            </div>

            {subDepartments.length > 0 && (
              <div style={{ marginTop: 10 }}>
                {subDepartments.map((sub) => (
                  <div
                    key={sub.id}
                    style={{
                      marginLeft: '12px',
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid rgba(0,0,0,0.08)',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                        gap: '8px',
                        alignItems: 'center',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <strong
                        className="editor-heading"
                        style={{
                          minWidth: 0,
                          overflowWrap: 'anywhere',
                          color: 'var(--editor-heading-color, #ffffff)',
                        }}
                      >
                        {sub.name}
                      </strong>

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
  const q = String(query || '').trim()
  const queryTokens = tokenize(q)

  if (!q || !queryTokens.length) {
    return {
      score: 0,
      reasons: [],
      matchedDepartments: 0,
      matchedSubDepartments: 0,
    }
  }

  let score = 0
  const reasons = []
  const addReason = (label) => {
    if (label && !reasons.includes(label)) reasons.push(label)
  }

  const storeNameScore = scoreField(store.name, queryTokens, 5)
  if (storeNameScore.score > 0) {
    score += storeNameScore.score
    addReason('store name')
  }

  const departments = safeArray(store.departments)
  let matchedDepartments = 0
  let matchedSubDepartments = 0

  for (const dept of departments) {
    const deptNameScore = scoreField(dept.name, queryTokens, 4)
    const deptNotesScore = scoreField(dept.notes || '', queryTokens, 3)

    const deptScore = deptNameScore.score + deptNotesScore.score

    if (deptScore > 0) {
      matchedDepartments += 1
      score += deptScore
      score += (Number(dept.rating) || 0) * 1.5
      addReason(dept.name)
      if (dept.notes?.trim()) addReason(`${dept.name} notes`)
    }

    for (const sub of safeArray(dept.subDepartments)) {
      const subNameScore = scoreField(sub.name, queryTokens, 4.5)
      const subScore = subNameScore.score

      if (subScore > 0) {
        matchedSubDepartments += 1
        score += subScore
        score += (Number(sub.rating) || 0) * 1.25
        addReason(`${dept.name} → ${sub.name}`)
      }
    }
  }

  if (matchedDepartments > 0 || matchedSubDepartments > 0 || storeNameScore.score > 0) {
    score += matchedDepartments * 1.5
    score += matchedSubDepartments * 1
  }

  score += normalizeTreasureScore(store.treasureScore) * 0.35

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
      return Array.isArray(parsed) ? parsed.map(normalizeStoreRecord) : []
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
      .filter((s) => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    setSearchResults(results)
  }, [searchQuery, stores])

  // ---------------- GEOCODE ----------------

  const geocode = async (addr) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`
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

    setStores((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: createForm.storeName,
        address: createForm.address,
        lat: coords.lat,
        lng: coords.lng,
        treasureScore: normalizeTreasureScore(createForm.treasureScore),
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
      treasureScore: normalizeTreasureScore(store.treasureScore),
      departments: safeArray(store.departments).map((dept) => ({
        ...dept,
        notes: dept.notes || '',
        subDepartments: safeArray(dept.subDepartments).map((sub) => ({
          ...sub,
          notes: sub.notes || '',
        })),
      })),
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

    setStores((prev) =>
      prev.map((s) =>
        s.id === editId
          ? {
              ...s,
              name: editForm.storeName,
              address: editForm.address,
              lat: coords.lat,
              lng: coords.lng,
              treasureScore: normalizeTreasureScore(editForm.treasureScore),
              departments: editForm.departments,
            }
          : s
      )
    )

    setEditId(null)
    setEditForm(EMPTY_FORM)
  }

  const deleteStore = (id) => {
    setStores((prev) => prev.filter((s) => s.id !== id))
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: '12px',
              }}
            >
              {searchResults.map((s) => (
                <div
                  key={s.id}
                  className="store-card"
                  style={{
                    minHeight: '170px',
                    borderRadius: '16px',
                    padding: '14px',
                    boxSizing: 'border-box',
                  }}
                >
                  <strong style={{ color: '#0a1f3c' }}>{s.name}</strong>
                  <div style={{ color: '#0a1f3c' }}>{shortenAddress(s.address)}</div>
                  <div style={{ color: '#0a1f3c' }}>Score: {s.score.toFixed(1)}</div>
                  <div
                    style={{
                      marginTop: 8,
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: 'rgba(10,31,60,0.08)',
                      color: '#0a1f3c',
                      fontSize: '0.85rem',
                    }}
                  >
                    Discovery {formatTreasureScore(s.treasureScore)}
                  </div>

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

              <label style={{ display: 'block' }}>
                Hidden Treasure Score
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={createForm.treasureScore}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      treasureScore: Number(e.target.value),
                    })
                  }
                  style={{ width: '80px', display: 'block', marginTop: 6 }}
                />
              </label>

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

              <label style={{ display: 'block' }}>
                Hidden Treasure Score
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.treasureScore}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      treasureScore: Number(e.target.value),
                    })
                  }
                  style={{ width: '80px', display: 'block', marginTop: 6 }}
                />
              </label>

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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '12px',
        }}
      >
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
              minHeight: '180px',
              borderRadius: '16px',
              padding: '14px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
            >
              <strong style={{ color: '#0a1f3c' }}>{store.name}</strong>

              <OptionsMenu
                onEdit={() => startEdit(store)}
                onDelete={() => deleteStore(store.id)}
              />
            </div>

            <p style={{ marginBottom: 0, color: '#0a1f3c' }}>
              {shortenAddress(store.address)}
            </p>

            <div
              style={{
                marginTop: 8,
                display: 'inline-block',
                padding: '4px 8px',
                borderRadius: 999,
                background: 'rgba(10,31,60,0.08)',
                color: '#0a1f3c',
                fontSize: '0.85rem',
              }}
            >
              Discovery {formatTreasureScore(store.treasureScore)}
            </div>

            {expandedStoreId === store.id && (
              <div style={{ marginTop: 8 }}>
                <StoreDepartmentsDisplay departments={store.departments} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
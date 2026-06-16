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
    parts[0].match(/^\d+$/) && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0]

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
    <div className="map-wrap">
      <MapContainer center={center} zoom={10} className="map-container">
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
    return <div className="muted-text">No departments added yet.</div>
  }

  return (
    <div className="dept-display">
      {safeDepartments.map((dept) => {
        const subDepartments = safeArray(dept.subDepartments)

        return (
          <div key={dept.id} className="dept-display-block">
            <div className="dept-title">
              {dept.name} - {dept.rating}/5
            </div>

            {dept.notes?.trim() && (
              <div className="dept-note">Notes: {dept.notes}</div>
            )}

            {subDepartments.length > 0 && (
              <div className="dept-sublist">
                {subDepartments.map((sub) => (
                  <div key={sub.id} className="dept-subitem">
                    <div className="dept-subtitle">
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
    <div className="dept-editor">
      <div className="dept-toolbar">
        <input
          value={customDeptName}
          onChange={(e) => setCustomDeptName(e.target.value)}
          placeholder="Custom department"
          className="text-input"
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
          className="text-input"
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
          <div key={dept.id} className="dept-card">
            <div className="dept-card-top">
              <strong className="dept-card-name">{dept.name}</strong>

              <div className="dept-card-actions">
                <button type="button" onClick={() => removeDepartment(dept.id)}>
                  Remove
                </button>

                <button type="button" onClick={() => addSubDepartment(dept.id)}>
                  Add
                </button>
              </div>
            </div>

            <div className="dept-edit-row">
              <label className="rating-row">
                Rating:
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={dept.rating}
                  onChange={(e) => updateDeptRating(dept.id, e.target.value)}
                  className="rating-input"
                />
              </label>

              <input
                value={dept.notes || ''}
                onChange={(e) => updateDeptNotes(dept.id, e.target.value)}
                placeholder="Department notes / keywords"
                className="text-input"
              />
            </div>

            {subDepartments.length > 0 && (
              <div className="subdept-list">
                {subDepartments.map((sub) => (
                  <div key={sub.id} className="subdept-card">
                    <div className="subdept-row">
                      <strong className="subdept-name">{sub.name}</strong>

                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={sub.rating}
                        onChange={(e) =>
                          updateSubRating(dept.id, sub.id, e.target.value)
                        }
                        className="rating-input"
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
      className="options-wrap"
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
            className="menu-backdrop"
          />

          <div className="options-menu">
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
              className="menu-item menu-delete"
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
      <div className="search-section">
        <input
          className="text-input search-input"
          placeholder="Search for an item..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {searchQuery.trim() && searchResults.length === 0 && (
          <div className="muted-text">No strong matches yet.</div>
        )}

        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>Top Matches</h3>

            {searchResults.map((s) => (
              <div key={s.id} className="store-card">
                <strong className="store-name">{s.name}</strong>
                <div className="store-address">{shortenAddress(s.address)}</div>
                <div className="store-score">Score: {s.score.toFixed(1)}</div>

                {s.reasons?.length > 0 && (
                  <div className="muted-text matches-line">
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
          <div className="form-grid">
            <div className="form-column">
              <input
                className="text-input"
                placeholder="Store name"
                value={createForm.storeName}
                onChange={(e) =>
                  setCreateForm({ ...createForm, storeName: e.target.value })
                }
              />

              <input
                className="text-input"
                placeholder="Address"
                value={createForm.address}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    address: e.target.value,
                    coords: null,
                  })
                }
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
          <div className="form-grid">
            <div className="form-column">
              <input
                className="text-input"
                placeholder="Store name"
                value={editForm.storeName}
                onChange={(e) =>
                  setEditForm({ ...editForm, storeName: e.target.value })
                }
              />

              <input
                className="text-input"
                placeholder="Address"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    address: e.target.value,
                    coords: null,
                  })
                }
              />

              <div className="edit-buttons">
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

      {stores.length === 0 && <p className="muted-text">No stores yet.</p>}

      {stores.map((store) => (
        <div
          key={store.id}
          className="store-card clickable"
          onClick={() =>
            setExpandedStoreId(
              expandedStoreId === store.id ? null : store.id
            )
          }
        >
          <div className="store-topline">
            <strong className="store-name">{store.name}</strong>

            <OptionsMenu
              onEdit={() => startEdit(store)}
              onDelete={() => deleteStore(store.id)}
            />
          </div>

          <p className="store-address">{shortenAddress(store.address)}</p>

          {expandedStoreId === store.id && (
            <div className="expanded-area">
              <StoreDepartmentsDisplay departments={store.departments} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
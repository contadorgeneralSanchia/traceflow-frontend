<script setup>
import { ref, onMounted, computed } from "vue"
import api from "../../api/axios"

// -------------------------
// Estado base
// -------------------------
const locations = ref([])
const inventory = ref([])

const selectedLocationId = ref("")
const materialFilter = ref("")

const loadingInventory = ref(false)
const errorInventory = ref(null)

// -------------------------
// KPIs de inventario (desde /inventory/kpis)
// -------------------------
const kpis = ref({
  MP_GENERAL: 0,
  PT: 0,
  MERMA: 0
})
const loadingKpis = ref(false)
const errorKpis = ref(null)

// -------------------------
// Merma por máquina
// -------------------------
const wasteReport = ref({})
const loadingWaste = ref(false)
const errorWaste = ref(null)

// -------------------------
// Helpers
// -------------------------
const isPlainObject = v =>
  v !== null && typeof v === "object" && !Array.isArray(v)

const normalizeInventoryAll = raw => {
  if (Array.isArray(raw)) return raw

  if (isPlainObject(raw)) {
    const rows = []
    for (const [locName, items] of Object.entries(raw)) {
      const loc = locations.value.find(l => l.name === locName)
      const locId = loc?.id ?? null
      const locType = loc?.type ?? null

      ;(items || []).forEach((it, idx) => {
        rows.push({
          id: `${locName}-${idx}-${String(it.material ?? "")}`,
          location_id: locId,
          location_name: locName,
          location_type: locType,
          lot_id: null,
          lot_code: null,
          material: it.material,
          quantity: it.quantity
        })
      })
    }
    return rows
  }

  return []
}

// -------------------------
// Cargar ubicaciones
// -------------------------
const loadLocations = async () => {
  try {
    const res = await api.get("/locations/")
    locations.value = res.data || []
  } catch (err) {
    console.error("Error cargando ubicaciones", err)
  }
}

// -------------------------
// Cargar inventario global
// -------------------------
const loadInventory = async () => {
  loadingInventory.value = true
  errorInventory.value = null
  try {
    const res = await api.get("/inventory/all")
    inventory.value = normalizeInventoryAll(res.data)
  } catch (err) {
    console.error("Error cargando inventario", err)
    errorInventory.value = "No se pudo cargar el inventario."
    inventory.value = []
  } finally {
    loadingInventory.value = false
  }
}

// -------------------------
// Cargar KPIs
// -------------------------
const loadKpis = async () => {
  loadingKpis.value = true
  errorKpis.value = null
  try {
    const res = await api.get("/inventory/kpis")
    kpis.value = {
      MP_GENERAL: Number(res.data?.MP_GENERAL || 0),
      PT: Number(res.data?.PT || 0),
      MERMA: Number(res.data?.MERMA || 0)
    }
  } catch (err) {
    console.error("Error cargando KPIs", err)
    errorKpis.value = "No se pudieron cargar los KPIs."
    kpis.value = { MP_GENERAL: 0, PT: 0, MERMA: 0 }
  } finally {
    loadingKpis.value = false
  }
}

// -------------------------
// Cargar reporte de merma
// -------------------------
const loadWasteReport = async () => {
  loadingWaste.value = true
  errorWaste.value = null
  try {
    const res = await api.get("/machines/waste-report")
    wasteReport.value = res.data || {}
  } catch (err) {
    console.error("Error cargando merma", err)
    errorWaste.value = "No se pudo cargar el reporte de merma."
    wasteReport.value = {}
  } finally {
    loadingWaste.value = false
  }
}

// -------------------------
// Inventario filtrado
// -------------------------
const filteredInventory = computed(() => {
  let data = [...inventory.value]

  if (selectedLocationId.value) {
    const locId = Number(selectedLocationId.value)
    data = data.filter(item => Number(item.location_id) === locId)
  }

  if (materialFilter.value.trim()) {
    const q = materialFilter.value.toLowerCase()
    data = data.filter(item =>
      String(item.material || "").toLowerCase().includes(q)
    )
  }

  return data
})

const totalQtyFiltered = computed(() =>
  filteredInventory.value.reduce(
    (acc, item) => acc + Number(item.quantity || 0),
    0
  )
)

const totalsByType = computed(() => ({
  MP_GENERAL: Number(kpis.value.MP_GENERAL || 0),
  PT: Number(kpis.value.PT || 0),
  MERMA: Number(kpis.value.MERMA || 0)
}))

const wasteRows = computed(() => {
  const report = wasteReport.value || {}
  const entries = Object.entries(report)

  const rows = entries.map(([machineId, waste]) => {
    const idNum = Number(machineId)
    const loc = locations.value.find(l => l.id === idNum)
    const name = loc?.name || `Máquina ${idNum}`

    return {
      machineId: idNum,
      machineName: name,
      waste: Number(waste)
    }
  })

  rows.sort((a, b) => b.waste - a.waste)
  return rows
})

const top3Waste = computed(() => wasteRows.value.slice(0, 3))

const refreshAll = async () => {
  await loadInventory()
  await loadKpis()
  await loadWasteReport()
}

onMounted(async () => {
  await loadLocations()
  await refreshAll()
})
</script>

<template>
  <div class="dashboard-grid">
    <section class="card">
      <header class="card-header">
        <div>
          <h2>Inventario por ubicación</h2>
          <p class="subtitle">Vista consolidada para el supervisor, con filtros rápidos.</p>
        </div>
        <button class="btn-outline" @click="refreshAll">Actualizar</button>
      </header>

      <div class="filters-grid">
        <div class="field-group">
          <label>Ubicación</label>
          <select v-model="selectedLocationId">
            <option value="">Todas</option>
            <option v-for="loc in locations" :key="loc.id" :value="loc.id">
              {{ loc.name }}
            </option>
          </select>
        </div>

        <div class="field-group">
          <label>Material</label>
          <input v-model="materialFilter" type="text" placeholder="Buscar por material…" />
        </div>

        <div class="field-group total-chip-wrapper">
          <label>Total en la tabla</label>
          <span class="badge-total">{{ totalQtyFiltered.toFixed(2) }}</span>
        </div>
      </div>

      <div class="card-body">
        <p v-if="loadingInventory">Cargando inventario…</p>
        <p v-else-if="errorInventory" class="error">{{ errorInventory }}</p>
        <p v-else-if="filteredInventory.length === 0" class="empty">
          No hay registros para los filtros aplicados.
        </p>

        <table v-else class="table">
          <thead>
            <tr>
              <th>Ubicación</th>
              <th>Tipo</th>
              <th>Lote</th>
              <th>Material</th>
              <th style="text-align:right;">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filteredInventory" :key="row.id">
              <td>{{ row.location_name || row.location_id }}</td>
              <td>{{ row.location_type || "-" }}</td>
              <td>{{ row.lot_code || row.lot_id || "-" }}</td>
              <td>{{ row.material }}</td>
              <td style="text-align:right;">{{ Number(row.quantity || 0).toFixed(2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="card kpi-column">
      <div>
        <p v-if="loadingKpis" class="subtitle">Cargando KPIs…</p>
        <p v-else-if="errorKpis" class="error">{{ errorKpis }}</p>

        <div class="kpi-grid">
          <div class="kpi-card">
            <p class="kpi-label">Total MP_GENERAL</p>
            <p class="kpi-value">{{ totalsByType.MP_GENERAL.toFixed(2) }}</p>
          </div>

          <div class="kpi-card">
            <p class="kpi-label">Total Producto Terminado</p>
            <p class="kpi-value">{{ totalsByType.PT.toFixed(2) }}</p>
          </div>

          <div class="kpi-card">
            <p class="kpi-label">Total MERMA</p>
            <p class="kpi-value kpi-danger">{{ totalsByType.MERMA.toFixed(2) }}</p>
          </div>
        </div>
      </div>

      <div class="block">
        <header class="block-header">
          <div>
            <h3>Top 3 máquinas con mayor merma</h3>
            <p class="subtitle">Basado en los procesos registrados en MachineProcess.</p>
          </div>
          <button class="btn-outline" @click="loadWasteReport">Actualizar</button>
        </header>

        <p v-if="loadingWaste">Cargando merma…</p>
        <p v-else-if="errorWaste" class="error">{{ errorWaste }}</p>
        <p v-else-if="top3Waste.length === 0" class="empty">
          Aún no hay procesos registrados.
        </p>

        <ul v-else class="waste-list">
          <li v-for="row in top3Waste" :key="row.machineId" class="waste-item">
            <div class="waste-main">
              <span class="waste-name">{{ row.machineName }}</span>
              <span class="waste-qty">{{ row.waste.toFixed(2) }}</span>
            </div>
            <p class="waste-subtitle">ID ubicación: {{ row.machineId }}</p>
          </li>
        </ul>
      </div>

     <!-- <router-link to="/operario" class="btn-outline">
        Ir a Operario (modo cobertura)
      </router-link> -->

    </section>




  </div>


</template>

<style scoped>
/* (tu mismo CSS, intacto) */
.dashboard-grid { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 1.25rem; }
.card { background: white; border-radius: 0.75rem; border: 1px solid #e5e7eb; padding: 1rem 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.card-header, .block-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; }
.subtitle { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
.filters-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 0.8fr); gap: 0.75rem; }
.field-group { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; }
label { font-weight: 500; color: #374151; }
select, input { border-radius: 0.5rem; border: 1px solid #d1d5db; padding: 0.4rem 0.6rem; font-size: 0.85rem; }
.total-chip-wrapper { justify-content: flex-end; }
.badge-total { display: inline-flex; align-items: center; padding: 0.2rem 0.7rem; border-radius: 999px; background: rgba(16, 185, 129, 0.12); color: #047857; font-size: 0.75rem; font-weight: 600; }
.table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.table th, .table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #f3f4f6; }
.table thead { background: #f9fafb; }
.empty { font-size: 0.8rem; color: #9ca3af; }
.error { font-size: 0.8rem; color: #b91c1c; }
.btn-outline { border-radius: 999px; padding: 0.3rem 0.9rem; font-size: 0.75rem; border: 1px solid #d1d5db; background: white; cursor: pointer; }
.kpi-column { gap: 1.25rem; }
.kpi-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem; }
.kpi-card { border-radius: 0.75rem; border: 1px solid #e5e7eb; padding: 0.6rem 0.8rem; display: flex; flex-direction: column; gap: 0.25rem; }
.kpi-label { font-size: 0.75rem; color: #6b7280; }
.kpi-value { font-size: 1rem; font-weight: 600; color: #111827; }
.kpi-danger { color: #b91c1c; }
.block { display: flex; flex-direction: column; gap: 0.5rem; }
.waste-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.waste-item { border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.45rem 0.6rem; }
.waste-main { display: flex; justify-content: space-between; font-size: 0.8rem; }
.waste-name { font-weight: 500; }
.waste-qty { font-variant-numeric: tabular-nums; }
.waste-subtitle { margin-top: 0.1rem; font-size: 0.7rem; color: #6b7280; }
</style>

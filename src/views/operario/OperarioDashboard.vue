<!-- src/views/operario/OperarioDashboard.vue -->
<script setup>
import { onMounted, ref, computed, watch } from "vue"
import api from "../../api/axios"
import { useAuthStore } from "../../stores/auth"

const auth = useAuthStore()
const actorName = computed(() => auth.user?.username || auth.user?.sub || "usuario")

// ------------ estado base ------------
const locations = ref([])
const currentLocationId = ref(null)
const productsMP = ref([])
const moveProductId = ref(null)
const inventory = ref([])
const loadingInventory = ref(false)
const inventoryError = ref(null)

// ------------ pendientes ------------
const pendingMovements = ref([])
const pendingLoading = ref(false)
const pendingError = ref(null)
const pendingSuccess = ref(null)

// ------------ movimiento interno (por lote) ------------
const moveFrom = ref(null)
const moveTo = ref(null)

const moveOriginInventory = ref([])
const moveOriginMaterials = computed(() => {
  const set = new Set((moveOriginInventory.value || []).map(x => x.material))
  return Array.from(set).sort()
})

const moveMaterialPick = ref("")
const moveLotsFromApi = ref([])
const moveLots = computed(() => moveLotsFromApi.value || [])

const loadProductsMP = async () => {
  const res = await api.get("/products", { params: { category: "MP", active: true } })
  productsMP.value = res.data || []
  if (!purchaseProductId.value && productsMP.value.length > 0) {
    purchaseProductId.value = productsMP.value[0].id
  }
}

const purchaseProductId = ref(null)




const moveSelectedKey = ref(null)
const moveMaterial = ref("")
const moveLotId = ref(null)
const moveMaxQty = ref(0)
const moveSupplierLot = ref("")

const moveQty = ref("")
const moveLoading = ref(false)
const moveError = ref(null)
const moveSuccess = ref(null)

// ------------ compra ------------
const registerPurchase = async () => {
  purchaseError.value = null
  purchaseSuccess.value = null

  if (!purchaseProductId.value || !purchaseQty.value) {
    purchaseError.value = "Producto y cantidad son obligatorios."
    return
  }

  const qty = Number(purchaseQty.value)
  if (qty <= 0) {
    purchaseError.value = "Cantidad debe ser mayor a 0."
    return
  }

  purchaseLoading.value = true
  try {
    const payload = {
      product_id: Number(purchaseProductId.value), // ✅ CLAVE
      quantity: qty,
      supplier_lot: purchaseSupplierLot.value?.trim() || null,
      sent_by: actorName.value,
    }

    await api.post("/movements/purchase", payload)

    purchaseSuccess.value = "Compra registrada correctamente."
    purchaseQty.value = ""
    purchaseSupplierLot.value = ""

    await loadInventory()
  } catch (err) {
    purchaseError.value =
      err?.response?.data?.detail ||
      "No se pudo registrar la compra."
  } finally {
    purchaseLoading.value = false
  }
}



const purchaseQty = ref("")
const purchaseSupplierLot = ref("")
const purchaseLoading = ref(false)
const purchaseError = ref(null)
const purchaseSuccess = ref(null)

// ------------ venta / despacho ------------
const sellFrom = ref(null)
const sellOriginInventory = ref([])

const sellLots = computed(() => {
  return (sellOriginInventory.value || [])
    .filter(x => Number(x.quantity) > 0)
    .map(x => ({
      key: `${x.lot_id}-${x.material}`,
      lot_id: x.lot_id,
      lot_code: x.lot_code || `Lote ${x.lot_id}`,
      material: x.material,
      quantity: Number(x.quantity),
    }))
})

const sellSelectedKey = ref(null)
const sellLotId = ref(null)
const sellMaterial = ref("")
const sellMaxQty = ref(0)
const sellQty = ref("")
const sellCustomer = ref("")
const sellLoading = ref(false)
const sellError = ref(null)
const sellSuccess = ref(null)

// ✅ ------------ proceso de máquina V2 (N insumos + 2 salidas) ------------
const v2Loading = ref(false)
const v2Error = ref(null)
const v2Success = ref(null)

const v2Inputs = ref([{ lot_id: null, material: "", quantity: "" }])

const v2OutputType = ref("PT") // "PT" | "SEMI"
const v2OutputMaterial = ref("")
const v2OutputQty = ref("")
const v2WasteMaterial = ref("MERMA")
const v2WasteQty = ref("")
const v2OutputProductId = ref(null)
const v2WasteProductId = ref(null)
// helpers
const currentLocation = computed(() =>
  locations.value.find(l => l.id === currentLocationId.value) || null
)

const isMachineLocation = computed(() => currentLocation.value?.type === "MAQ")

const availableLotsInLocation = computed(() =>
  (inventory.value || []).map(item => ({
    lotId: item.lot_id,
    lotCode: item.lot_code || `Lote ${item.lot_id}`,
    material: item.material,
    quantity: Number(item.quantity),
  }))
)

// --- consulta lotes disponibles (incluye supplier_lot) ---
const fetchAvailableLots = async (locationId, productId) => {
  if (!locationId || !productId) return []
  const res = await api.get(`/lots/available/${locationId}`, {
    params: { product_id: productId }
  })
  return (res.data || []).map(x => ({
    key: `${x.lot_id}`,
    lot_id: x.lot_id,
    lot_code: x.lot_code,
    product_id: x.product_id,
    supplier_lot: x.supplier_lot || null,
    material: x.material,
    quantity: Number(x.quantity),
  }))
}


// ------------ cargar ubicaciones ------------
const loadLocations = async () => {
  const res = await api.get("/locations/")
  locations.value = res.data || []

  if (!currentLocationId.value && locations.value.length > 0) {
    currentLocationId.value = locations.value[0].id
  }

  if (!moveFrom.value && locations.value.length > 0) moveFrom.value = locations.value[0].id
  if (!moveTo.value && locations.value.length > 1) moveTo.value = locations.value[1].id

  const pt = locations.value.find(l => l.type === "PT")
  if (!sellFrom.value) sellFrom.value = pt?.id || locations.value[0]?.id || null
}

// ------------ inventario ubicación actual ------------
const loadInventory = async () => {
  if (!currentLocationId.value) return
  loadingInventory.value = true
  inventoryError.value = null

  try {
    const res = await api.get(`/inventory/location/${currentLocationId.value}/flat`)

    inventory.value = res.data || []

    // defaults para V2: si estamos en máquina y hay inventario, setea primera línea
    const lots = availableLotsInLocation.value
    if (isMachineLocation.value && lots.length > 0) {
      if (!v2Inputs.value[0].lot_id) {
        v2Inputs.value[0].lot_id = lots[0].lotId
        v2Inputs.value[0].material = lots[0].material
      }
    }
  } catch (err) {
    inventoryError.value = "No se pudo cargar el inventario."
  } finally {
    loadingInventory.value = false
  }
}

// ------------ pendientes ------------
const loadPendingMovements = async () => {
  if (!currentLocationId.value) return
  pendingLoading.value = true
  pendingError.value = null

  try {
    const res = await api.get(`/movements/pending/${currentLocationId.value}`)
    pendingMovements.value = res.data || []
  } catch (err) {
    pendingError.value = "No se pudieron cargar los movimientos pendientes."
  } finally {
    pendingLoading.value = false
  }
}

// ------------ aceptar / rechazar ------------
const acceptPending = async (movementId) => {
  pendingError.value = null
  pendingSuccess.value = null
  try {
    await api.post(`/movements/receive/${movementId}`, { actor: actorName.value })
    pendingSuccess.value = `Movimiento #${movementId} aceptado por ${actorName.value}.`

    // ✅ NOTA: el success YA NO oculta la tabla (se arregla en template)
    await loadInventory()
    await loadPendingMovements()

    // opcional: limpiar success después de 2.5s
    setTimeout(() => { pendingSuccess.value = null }, 2500)
  } catch (err) {
    pendingError.value = err?.response?.data?.detail || "No se pudo aceptar el movimiento."
  }
}

const rejectPending = async (movementId) => {
  pendingError.value = null
  pendingSuccess.value = null
  try {
    await api.post(`/movements/reject/${movementId}`, { actor: actorName.value })
    pendingSuccess.value = `Movimiento #${movementId} rechazado por ${actorName.value}.`
    await loadInventory()
    await loadPendingMovements()
    setTimeout(() => { pendingSuccess.value = null }, 2500)
  } catch (err) {
    pendingError.value = err?.response?.data?.detail || "No se pudo rechazar el movimiento."
  }
}

// ------------ cambiar ubicación actual ------------
const handleLocationChange = async () => {
  pendingSuccess.value = null
  v2Success.value = null
  v2Error.value = null
  await loadInventory()
  await loadPendingMovements()
}

// ------------ cargar inventario ORIGEN para movimiento interno ------------
const loadMoveOriginInventory = async () => {
  if (!moveFrom.value) return

  const res = await api.get(`/inventory/location/${moveFrom.value}/flat`)
  moveOriginInventory.value = res.data || []

  moveLotsFromApi.value = []
  moveSelectedKey.value = null
  moveLotId.value = null
  moveProductId.value = null
  moveMaterial.value = ""
  moveMaxQty.value = 0
  moveSupplierLot.value = ""

  if (moveOriginInventory.value.length === 0) return

  if (!moveMaterialPick.value) {
    moveMaterialPick.value = moveOriginInventory.value[0].material
  }

  const product = moveOriginInventory.value.find(
    x => x.material === moveMaterialPick.value
  )

  if (!product) return

  moveLotsFromApi.value = await fetchAvailableLots(
    Number(moveFrom.value),
    Number(product.product_id)
  )

  if (moveLotsFromApi.value.length > 0) {
    moveSelectedKey.value = moveLotsFromApi.value[0].key
    applyMoveSelected()
  }
}


const applyMoveSelected = () => {
  const sel = moveLots.value.find(x => x.key === moveSelectedKey.value)
  if (!sel) return

  moveMaterial.value = sel.material
  moveLotId.value = sel.lot_id
  moveProductId.value = sel.product_id   // ✅ CLAVE
  moveMaxQty.value = sel.quantity
  moveSupplierLot.value = sel.supplier_lot || ""

  if (Number(moveQty.value || 0) > sel.quantity) {
    moveQty.value = ""
  }
}


watch(moveFrom, async () => {
  await loadMoveOriginInventory()
})

watch(moveMaterialPick, async () => {
  if (!moveFrom.value || !moveMaterialPick.value) return

  const product = moveOriginInventory.value.find(
    x => x.material === moveMaterialPick.value
  )

  if (!product) {
    moveLotsFromApi.value = []
    return
  }

  moveLotsFromApi.value = await fetchAvailableLots(
    Number(moveFrom.value),
    Number(product.product_id)
  )

  if (moveLots.value.length > 0) {
    moveSelectedKey.value = moveLots.value[0].key
    applyMoveSelected()
  } else {
    moveSelectedKey.value = null
    moveMaterial.value = ""
    moveLotId.value = null
    moveProductId.value = null
    moveMaxQty.value = 0
    moveSupplierLot.value = ""
  }
})


watch(moveSelectedKey, () => {
  applyMoveSelected()
})

// ------------ registrar movimiento interno ------------
const registerInternalMovement = async () => {
  moveError.value = null
  moveSuccess.value = null

  if (!moveFrom.value || !moveTo.value) {
    moveError.value = "Debes seleccionar origen y destino."
    return
  }

  if (moveFrom.value === moveTo.value) {
    moveError.value = "Origen y destino no pueden ser la misma ubicación."
    return
  }

  if (!moveLotId.value || !moveMaterial.value) {
    moveError.value = "Debes seleccionar un lote del origen."
    return
  }

  if (!moveQty.value) {
    moveError.value = "Cantidad es obligatoria."
    return
  }

  const qty = Number(moveQty.value)
  if (qty <= 0) {
    moveError.value = "Cantidad debe ser mayor a 0."
    return
  }

  if (qty > Number(moveMaxQty.value)) {
    moveError.value = `Cantidad supera existencias. Máximo: ${moveMaxQty.value}`
    return
  }

  moveLoading.value = true
  try {
    const payload = {
      from_location: Number(moveFrom.value),
      to_location: Number(moveTo.value),
      lot_id: Number(moveLotId.value),
      product_id: Number(moveProductId.value),
      quantity: qty,
      sent_by: actorName.value,
    }


    await api.post("/movements/send", payload)

    moveSuccess.value =
      "Movimiento enviado (PENDIENTE). El destino debe aceptar o rechazar."
    moveQty.value = ""

    await loadMoveOriginInventory()
    await loadInventory()
    await loadPendingMovements()
  } catch (err) {
    moveError.value =
      err?.response?.data?.detail ||
      "No se pudo registrar el movimiento."
  } finally {
    moveLoading.value = false
  }
}


// ------------ cargar inventario para venta ------------
const loadSellOriginInventory = async () => {
  if (!sellFrom.value) return
  const res = await api.get(`/inventory/location/${sellFrom.value}`)
  sellOriginInventory.value = res.data || []

  if (sellLots.value.length > 0) {
    sellSelectedKey.value = sellLots.value[0].key
    applySellSelected()
  } else {
    sellSelectedKey.value = null
    sellMaterial.value = ""
    sellLotId.value = null
    sellMaxQty.value = 0
  }
}

const applySellSelected = () => {
  const sel = sellLots.value.find(x => x.key === sellSelectedKey.value)
  if (!sel) return
  sellMaterial.value = sel.material
  sellLotId.value = sel.lot_id
  sellMaxQty.value = sel.quantity
  if (Number(sellQty.value || 0) > sel.quantity) sellQty.value = ""
}

watch(sellFrom, async () => {
  await loadSellOriginInventory()
})

watch(sellSelectedKey, () => {
  applySellSelected()
})

// ------------ venta / despacho ------------
const registerSale = async () => {
  sellError.value = null
  sellSuccess.value = null

  if (!sellFrom.value) return (sellError.value = "Selecciona ubicación de despacho (PT).")
  if (!sellLotId.value || !sellMaterial.value) return (sellError.value = "Selecciona un lote para vender.")
  if (!sellQty.value) return (sellError.value = "Cantidad es obligatoria.")

  const qty = Number(sellQty.value)
  if (qty <= 0) return (sellError.value = "Cantidad debe ser mayor a 0.")
  if (qty > Number(sellMaxQty.value)) return (sellError.value = `Cantidad supera existencias. Máximo: ${sellMaxQty.value}`)

  sellLoading.value = true
  try {
    const payload = {
      from_location: Number(sellFrom.value),
      lot_id: Number(sellLotId.value),
      quantity: qty,
      sold_by: actorName.value,
      customer: sellCustomer.value?.trim() || null,
    }




    await api.post("/movements/sell", payload)

    sellSuccess.value = "Venta/Despacho registrado. Inventario descargado del sistema."
    sellQty.value = ""
    sellCustomer.value = ""

    await loadSellOriginInventory()
    await loadInventory()
  } catch (err) {
    sellError.value = err?.response?.data?.detail || "No se pudo registrar la venta."
  } finally {
    sellLoading.value = false
  }
}

// ✅ ------------ V2 helpers ------------
const addV2InputRow = () => {
  v2Inputs.value.push({ lot_id: null, material: "", quantity: "" })
}

const removeV2InputRow = (idx) => {
  if (v2Inputs.value.length <= 1) return
  v2Inputs.value.splice(idx, 1)
}

const onV2LotChange = (idx) => {
  const row = v2Inputs.value[idx]
  const lot = availableLotsInLocation.value.find(x => x.lotId === Number(row.lot_id))
  if (lot) row.material = lot.material
}

const v2TotalInput = computed(() => {
  return (v2Inputs.value || []).reduce((acc, r) => acc + Number(r.quantity || 0), 0)
})

const v2TotalOutput = computed(() => {
  const mainOut = Number(v2OutputQty.value || 0)
  const wasteOut = Number(v2WasteQty.value || 0)
  return mainOut + wasteOut
})

const productsPT = computed(() =>
  products.value.filter(p => p.category === "PT")
)

const productsSEMI = computed(() =>
  products.value.filter(p => p.category === "SEMI")
)

const productsMERMA = computed(() =>
  products.value.filter(p => p.category === "MERMA")
)

// ✅ ------------ registrar proceso de máquina V2 ------------
const registerMachineProcessV2 = async () => {
  v2Error.value = null
  v2Success.value = null

  if (!isMachineLocation.value) {
    v2Error.value = "Debes estar en una ubicación de tipo MÁQUINA."
    return
  }

  const cleanedInputs = []
  for (const r of v2Inputs.value) {
    const lotId = Number(r.lot_id)
    const qty = Number(r.quantity)
    const mat = (r.material || "").trim()

    if (!lotId || !mat || !r.quantity) {
      v2Error.value = "En insumos: lote, material y cantidad son obligatorios en cada línea."
      return
    }
    if (qty <= 0) {
      v2Error.value = "En insumos: cantidad debe ser > 0."
      return
    }
    cleanedInputs.push({ lot_id: lotId, material: mat, quantity: qty })
  }

  const mainQty = Number(v2OutputQty.value)
  const wasteQty = Number(v2WasteQty.value || 0)

  if (!v2OutputProductId.value || !v2OutputQty.value) {
    v2Error.value = "Debes seleccionar producto y cantidad de salida principal."
    return
  }
  if (mainQty <= 0) {
    v2Error.value = "La cantidad de PT/SEMI debe ser > 0."
    return
  }

  if (wasteQty < 0) {
    v2Error.value = "La merma no puede ser negativa."
    return
  }
  if (wasteQty > 0 && !v2WasteMaterial.value?.trim()) {
    v2Error.value = "Si hay merma > 0, debes indicar material de merma."
    return
  }

  const inTotal = Math.round(v2TotalInput.value * 10000) / 10000
  const outTotal = Math.round(v2TotalOutput.value * 10000) / 10000
  if (inTotal !== outTotal) {
    v2Error.value = `Balance no cuadra: total insumos (${inTotal}) ≠ total salidas (${outTotal}).`
    return
  }

 if (!v2OutputProductId.value) {
  v2Error.value = "Debes seleccionar el producto de salida (PT / SEMI)."
  return
}

const outputs = [
  {
    kind: v2OutputType.value === "SEMI" ? "SEMI" : "PT",
    product_id: Number(v2OutputProductId.value),
    quantity: mainQty
  }
]

if (wasteQty > 0) {
  if (!v2WasteProductId.value) {
    v2Error.value = "Debes seleccionar el producto de merma."
    return
  }

  outputs.push({
    kind: "MERMA",
    product_id: Number(v2WasteProductId.value),
    quantity: wasteQty
  })
}


  v2Loading.value = true
  try {
    const payload = {
      machine_id: Number(currentLocationId.value),
      processed_by: actorName.value,
      inputs: cleanedInputs,
      outputs
    }

    const res = await api.post("/machines/process-v2", payload)

    v2Success.value =
      `Proceso V2 creado. Run #${res.data.run_id}. ` +
      `Input total: ${res.data.total_input_qty}. Output total: ${res.data.total_output_qty}.`

    await loadInventory()
    await loadPendingMovements()

    v2Inputs.value = [{ lot_id: null, material: "", quantity: "" }]
    v2OutputMaterial.value = ""
    v2OutputQty.value = ""
    v2WasteQty.value = ""
  } catch (err) {
    v2Error.value =
      err?.response?.data?.detail ||
      err?.response?.data?.error ||
      "No se pudo registrar el proceso V2."
  } finally {
    v2Loading.value = false
    v2OutputProductId.value = null
    v2WasteProductId.value = null

  }
}

const getLocationName = (id) => {
  const loc = locations.value.find(l => l.id === id)
  return loc ? loc.name : `ID ${id}`
}

onMounted(async () => {
  await loadLocations()
  await loadProductsMP()
  await loadProducts()
  await loadInventory()
  await loadPendingMovements()
  await loadMoveOriginInventory()
  await loadSellOriginInventory()
})

// --------- PRODUCTOS (catálogo admin) ----------
const products = ref([])
const productMap = computed(() => {
  const map = {}
  for (const p of products.value) map[p.id] = p
  return map
})

const loadProducts = async () => {
  const res = await api.get("/products", { params: { active: true } })
  products.value = res.data || []
}


</script>

<template>
  <div class="grid">
    <!-- IZQUIERDA -->
    <section class="card">
      <div class="card-header">
        <div>
          <h3>Ubicación de trabajo</h3>
          <p class="subtitle">
            Estás trabajando en:
            <strong>{{ currentLocation?.name || "Sin ubicación" }}</strong>
            <span v-if="isMachineLocation" class="badge-machine">Máquina</span>
          </p>
        </div>
      </div>

      <div class="field-group">
        <label>Ubicación actual</label>
        <select v-model="currentLocationId" @change="handleLocationChange">
          <option v-for="loc in locations" :key="loc.id" :value="loc.id">
            {{ loc.name }} ({{ loc.type }})
          </option>
        </select>
      </div>

      <div class="card-body">
        <div class="inventory-header">
          <h4>Inventario en esta ubicación</h4>
          <button @click="loadInventory" class="btn-outline">Actualizar</button>
        </div>

        <p v-if="loadingInventory">Cargando inventario...</p>
        <p v-else-if="inventoryError" class="error">{{ inventoryError }}</p>
        <p v-else-if="inventory.length === 0" class="empty">No hay inventario registrado en esta ubicación.</p>

        <table v-else class="table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Material</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in inventory" :key="item.id">
              <td>{{ item.lot_code || item.lot_id }}</td>
              <td>{{ item.material }}</td>
              <td>{{ item.quantity }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <hr />

      <!-- PENDIENTES -->
      <div class="block">
        <div class="pending-header">
          <h4>Movimientos pendientes (por recibir)</h4>
          <button @click="loadPendingMovements" class="btn-outline">Actualizar</button>
        </div>

        <p v-if="pendingLoading">Cargando pendientes...</p>
        <p v-if="pendingError" class="error">{{ pendingError }}</p>

        <!-- ✅ FIX: success NO oculta tabla -->
        <p v-if="pendingSuccess" class="success">{{ pendingSuccess }}</p>

        <p v-if="!pendingLoading && !pendingError && pendingMovements.length === 0" class="empty">
          No hay movimientos pendientes para esta ubicación.
        </p>

        <table v-if="!pendingLoading && pendingMovements.length > 0" class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Origen</th>
              <th>Material</th>
              <th>Cant.</th>
              <th>Lote</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in pendingMovements" :key="m.id">
              <td>#{{ m.id }}</td>
              <td>{{ getLocationName(m.from_location) }}</td>
              <td>{{ m.material }}</td>
              <td>{{ m.quantity }}</td>
              <td>{{ m.lot_id }}</td>
              <td class="actions">
                <button class="btn-accept" @click="acceptPending(m.id)">Aceptar</button>
                <button class="btn-reject" @click="rejectPending(m.id)">Rechazar</button>
              </td>
            </tr>
          </tbody>
        </table>

        <p class="hint">
          Al aceptar: entra al inventario de esta ubicación. Al rechazar: regresa al origen.
        </p>
      </div>
    </section>

    <!-- DERECHA -->
    <section class="card vertical">
      <!-- MOVIMIENTO INTERNO -->
      <div class="block">
        <h3>Registrar movimiento interno (por lote)</h3>
        <p class="subtitle">
          Se envía como <strong>PENDIENTE</strong>. El destino debe aceptar o rechazar.
        </p>

        <div class="grid-2">
          <div class="field-group">
            <label>Origen</label>
            <select v-model="moveFrom">
              <option v-for="loc in locations" :key="'from-' + loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>

          <div class="field-group">
            <label>Destino</label>
            <select v-model="moveTo">
              <option v-for="loc in locations" :key="'to-' + loc.id" :value="loc.id">
                {{ loc.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="field-group">
          <label>Material (filtrar lotes en ORIGEN)</label>
          <select v-model="moveMaterialPick">
            <option v-for="m in moveOriginMaterials" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
          <p class="hint" v-if="moveOriginMaterials.length === 0">El origen no tiene materiales disponibles.</p>
        </div>

        <div class="field-group">
          <label>Lote disponible en ORIGEN</label>
          <select v-model="moveSelectedKey">
            <option v-for="x in moveLots" :key="x.key" :value="x.key">
              {{ x.lot_code }}
              <span v-if="x.supplier_lot"> — Prov: {{ x.supplier_lot }}</span>
              — {{ x.material }} ({{ x.quantity }})
            </option>
          </select>
          <p class="hint" v-if="moveLots.length === 0">No hay lotes disponibles para ese material.</p>
        </div>

        <div class="field-group" v-if="moveSupplierLot">
          <label>Lote proveedor (del lote seleccionado)</label>
          <input :value="moveSupplierLot" type="text" disabled />
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label>Material</label>
            <input v-model="moveMaterial" type="text" disabled />
          </div>
          <div class="field-group">
            <label>Máximo disponible</label>
            <input :value="moveMaxQty" type="text" disabled />
          </div>
        </div>

        <div class="field-group">
          <label>Cantidad</label>
          <input v-model="moveQty" type="number" min="0" step="0.01" />
        </div>

        <p v-if="moveError" class="error">{{ moveError }}</p>
        <p v-if="moveSuccess" class="success">{{ moveSuccess }}</p>

        <button class="btn-primary" :disabled="moveLoading || moveLots.length === 0" @click="registerInternalMovement">
          {{ moveLoading ? "Enviando..." : "Enviar movimiento (PENDIENTE)" }}
        </button>
      </div>

      <hr />

      <!-- COMPRA -->
      <div class="block">
        <h3>Registrar compra (entrada a Materia prima general)</h3>
        <p class="subtitle">
          Cada compra se registra como un nuevo lote raíz y se envía directo a
          <strong>materia prima general</strong>.
        </p>

        <div class="field-group">
          <label>Material</label>
           <label>Producto (Materia Prima)</label>
                <select v-model="purchaseProductId">
                  <option v-for="p in productsMP" :key="p.id" :value="p.id">
                    {{ p.sku }} — {{ p.name }}
                  </option>
                </select>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label>Cantidad</label>
            <input v-model="purchaseQty" type="number" min="0" step="0.01" />
          </div>
          <div class="field-group">
            <label>Lote proveedor (opcional)</label>
            <input v-model="purchaseSupplierLot" type="text" placeholder="Ej: LOTE-FACTURA-123" />
          </div>
        </div>

        <p v-if="purchaseError" class="error">{{ purchaseError }}</p>
        <p v-if="purchaseSuccess" class="success">{{ purchaseSuccess }}</p>

        <button class="btn-primary" :disabled="purchaseLoading" @click="registerPurchase">
          {{ purchaseLoading ? "Registrando..." : "Registrar compra" }}
        </button>
      </div>

      <hr />

      <!-- VENTA -->
      <div class="block">
        <h3>Venta / Despacho (descargo definitivo)</h3>
        <p class="subtitle">
          Descarga inventario del sistema (ej: producto terminado facturado y despachado).
        </p>

        <div class="field-group">
          <label>Ubicación de salida (normalmente PT)</label>
          <select v-model="sellFrom">
            <option v-for="loc in locations" :key="'sell-' + loc.id" :value="loc.id">
              {{ loc.name }} ({{ loc.type }})
            </option>
          </select>
        </div>

        <div class="field-group">
          <label>Lote disponible en salida</label>
          <select v-model="sellSelectedKey">
            <option v-for="x in sellLots" :key="x.key" :value="x.key">
              {{ x.lot_code }} — {{ x.material }} ({{ x.quantity }})
            </option>
          </select>
          <p class="hint" v-if="sellLots.length === 0">No hay inventario disponible para venta en esa ubicación.</p>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label>Material</label>
            <input v-model="sellMaterial" type="text" disabled />
          </div>
          <div class="field-group">
            <label>Máximo disponible</label>
            <input :value="sellMaxQty" type="text" disabled />
          </div>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label>Cantidad</label>
            <input v-model="sellQty" type="number" min="0" step="0.01" />
          </div>
          <div class="field-group">
            <label>Cliente / referencia (opcional)</label>
            <input v-model="sellCustomer" type="text" placeholder="Ej: Cliente X / Factura #..." />
          </div>
        </div>

        <p v-if="sellError" class="error">{{ sellError }}</p>
        <p v-if="sellSuccess" class="success">{{ sellSuccess }}</p>

        <button class="btn-primary" :disabled="sellLoading || sellLots.length === 0" @click="registerSale">
          {{ sellLoading ? "Registrando..." : "Registrar venta/ despacho" }}
        </button>
      </div>

      <hr />

      <!-- PROCESO DE MÁQUINA V2 -->
      <div v-if="isMachineLocation" class="block">
        <h3>Proceso de máquina V2 (N insumos → PT/SEMI + MERMA)</h3>
        <p class="subtitle">
          Agregas <strong>N insumos</strong> (lotes en la máquina). Salida principal puede ser
          <strong>PT</strong> o <strong>SEMITERMINADO</strong> y opcionalmente <strong>MERMA</strong>.
          Balance: insumos = salidas.
        </p>

        <h4 class="subsection">Insumos (materias primas)</h4>

        <div v-for="(row, idx) in v2Inputs" :key="'in-'+idx" class="v2-row">
          <div class="grid-2">
            <div class="field-group">
              <label>Lote (en esta máquina)</label>
              <select v-model="row.lot_id" @change="onV2LotChange(idx)">
                <option v-for="lot in availableLotsInLocation" :key="'v2lot-'+lot.lotId" :value="lot.lotId">
                  {{ lot.lotCode }} — {{ lot.material }} ({{ lot.quantity }})
                </option>
              </select>
            </div>

            <div class="field-group">
              <label>Cantidad</label>
              <input v-model="row.quantity" type="number" min="0" step="0.01" />
            </div>
          </div>

          <div class="field-group">
            <label>Material (auto si eliges lote)</label>
            <input v-model="row.material" type="text" placeholder="Ej: PP" />
          </div>

          <div class="row-actions">
            <button class="btn-outline" @click="addV2InputRow">+ agregar insumo</button>
            <button class="btn-outline danger" :disabled="v2Inputs.length <= 1" @click="removeV2InputRow(idx)">- quitar</button>
          </div>

          <hr class="thin" />
        </div>

        <p class="hint">Total insumos: <strong>{{ v2TotalInput }}</strong></p>

        <h4 class="subsection">Salidas</h4>

        <div class="field-group">
          <label>Tipo salida principal</label>
          <select v-model="v2OutputType">
            <option value="PT">Producto Terminado (PT)</option>
            <option value="SEMI">Semiterminado</option>
          </select>
        </div>

        <div class="grid-2">
          <div class="field-group">
            <label>Producto salida principal</label>
              <select v-model="v2OutputProductId">
                <option
                  v-for="p in (v2OutputType === 'SEMI' ? productsSEMI : productsPT)"
                  :key="p.id"
                  :value="p.id"
                >
                  {{ p.sku }} — {{ p.name }}
                </option>
              </select>

          </div>
          <div class="field-group">
            <label>Cantidad salida principal</label>
            <input v-model="v2OutputQty" type="number" min="0" step="0.01" />
          </div>
        </div>
        <div class="grid-2">
          <div class="field-group">
            <label>Producto de merma</label>
              <select v-model="v2WasteProductId">
                <option v-for="p in productsMERMA" :key="p.id" :value="p.id">
                  {{ p.sku }} — {{ p.name }}
                </option>
              </select>

          </div>
          <div class="field-group">
            <label>Merma (qty)</label>
            <input v-model="v2WasteQty" type="number" min="0" step="0.01" />
          </div>
        </div>

        <p class="hint">Total salidas: <strong>{{ v2TotalOutput }}</strong></p>

        <p v-if="v2Error" class="error">{{ v2Error }}</p>
        <p v-if="v2Success" class="success">{{ v2Success }}</p>

        <button class="btn-primary" :disabled="v2Loading" @click="registerMachineProcessV2">
          {{ v2Loading ? "Procesando..." : "Registrar proceso V2" }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 2fr); gap: 1.25rem; }
.card { background: white; border-radius: 0.75rem; padding: 1rem 1.25rem; border: 1px solid #e5e7eb; display: flex; flex-direction: column; gap: 1rem; }
.card.vertical { gap: 1.5rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.subtitle { font-size: 0.8rem; color: #6b7280; }
.field-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem; }
label { font-size: 0.8rem; font-weight: 500; color: #374151; }
select, input { border-radius: 0.5rem; border: 1px solid #d1d5db; padding: 0.45rem 0.6rem; font-size: 0.85rem; }
.table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
.table th, .table td { padding: 0.4rem 0.5rem; border-bottom: 1px solid #f3f4f6; }
.table thead { background: #f9fafb; }
.inventory-header, .pending-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.empty { font-size: 0.8rem; color: #9ca3af; }
.btn-primary { background: linear-gradient(135deg, #38bdf8, #6366f1); color: white; border: none; border-radius: 999px; padding: 0.5rem 1.4rem; font-size: 0.8rem; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: default; }
.btn-outline { border-radius: 999px; padding: 0.3rem 0.9rem; font-size: 0.75rem; border: 1px solid #d1d5db; background: white; cursor: pointer; }
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.block { display: flex; flex-direction: column; gap: 0.5rem; }
.error { color: #b91c1c; font-size: 0.8rem; }
.success { color: #15803d; font-size: 0.8rem; }
.badge-machine { margin-left: 0.5rem; padding: 0.1rem 0.5rem; border-radius: 999px; background: rgba(59, 130, 246, 0.15); color: #1d4ed8; font-size: 0.7rem; }
.actions { display: flex; gap: 0.4rem; }
.btn-accept { border: none; border-radius: 999px; padding: 0.25rem 0.7rem; font-size: 0.75rem; cursor: pointer; background: rgba(34, 197, 94, 0.15); color: #166534; }
.btn-reject { border: none; border-radius: 999px; padding: 0.25rem 0.7rem; font-size: 0.75rem; cursor: pointer; background: rgba(239, 68, 68, 0.15); color: #991b1b; }
.hint { font-size: 0.75rem; color: #6b7280; }
.subsection { margin-top: 0.25rem; font-size: 0.9rem; color: #111827; }
.v2-row { padding: 0.5rem 0; }
.row-actions { display: flex; gap: 0.5rem; align-items: center; }
.thin { border: none; border-top: 1px solid #f3f4f6; margin: 0.25rem 0; }
.danger { border-color: rgba(239,68,68,.5); color: #991b1b; }
</style>

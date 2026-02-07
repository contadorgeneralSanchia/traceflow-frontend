<!-- src/views/Admin.vue -->
<script setup>
import { ref, onMounted, computed } from "vue"
import api from "../api/axios"

import {
  fetchProductsAll,
  createProduct,
  updateProduct,
  toggleProductActive
} from "../api/products"

// -------------------------
// Estado
// -------------------------
const activeTab = ref("locations") // locations | users | tools

// Ubicaciones
const locations = ref([])
const loadingLocations = ref(false)
const errorLocations = ref(null)

const newLoc = ref({ name: "", type: "MP_GENERAL" })
const locSearch = ref("")

// Usuarios
const users = ref([])
const loadingUsers = ref(false)
const errorUsers = ref(null)

const newUser = ref({
  username: "",
  password: "",
  role: "operario",
  active: true
})

// -------------------------
// Productos
// -------------------------
const products = ref([])
const loadingProducts = ref(false)
const errorProducts = ref(null)

const newProduct = ref({
  sku: "",
  name: "",
  category: "MP",
  uom: "kg",
  active: true
})

const loadProducts = async () => {
  loadingProducts.value = true
  errorProducts.value = null
  try {
    const res = await fetchProductsAll()
    products.value = res.data || []
  } catch (e) {
    console.error(e)
    errorProducts.value = "No se pudieron cargar los productos."
    products.value = []
  } finally {
    loadingProducts.value = false
  }
}

const createNewProduct = async () => {
  const p = newProduct.value

  if (!p.sku.trim()) return alert("SKU es obligatorio.")
  if (!p.name.trim()) return alert("Nombre es obligatorio.")

  try {
    await createProduct({
      sku: p.sku.trim(),
      name: p.name.trim(),
      category: p.category,
      uom: p.uom || "kg",
      active: !!p.active
    })

    newProduct.value = {
      sku: "",
      name: "",
      category: "MP",
      uom: "kg",
      active: true
    }

    await loadProducts()
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.detail || "No se pudo crear el producto.")
  }
}

const toggleActiveProduct = async (prod) => {
  try {
    await toggleProductActive(prod)
    await loadProducts()
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.detail || "No se pudo actualizar el producto.")
  }
}


// Tools / Info
const serverInfo = ref({
  api: "http://127.0.0.1:8002",
  docs: "http://127.0.0.1:8002/docs"
})

// -------------------------
// Helpers
// -------------------------
const filteredLocations = computed(() => {
  const q = locSearch.value.trim().toLowerCase()
  if (!q) return locations.value
  return locations.value.filter(l =>
    `${l.name} ${l.type}`.toLowerCase().includes(q)
  )
})

// -------------------------
// API calls (Ubicaciones)
// -------------------------
const loadLocations = async () => {
  loadingLocations.value = true
  errorLocations.value = null
  try {
    const res = await api.get("/locations/")
    locations.value = res.data || []
  } catch (e) {
    console.error(e)
    errorLocations.value = "No se pudieron cargar ubicaciones."
  } finally {
    loadingLocations.value = false
  }
}

const createLocation = async () => {
  const name = newLoc.value.name.trim()
  const type = String(newLoc.value.type || "").trim()

  if (!name) return alert("Nombre de ubicación es obligatorio.")
  if (!type) return alert("Tipo de ubicación es obligatorio.")

  try {
    await api.post("/locations/", { name, type })

    newLoc.value.name = ""
    newLoc.value.type = "MP_GENERAL"
    await loadLocations()
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.detail || "No se pudo crear la ubicación.")
  }
}

// -------------------------
// API calls (Usuarios)
// -------------------------
const loadUsers = async () => {
  loadingUsers.value = true
  errorUsers.value = null
  try {
    const res = await api.get("/users/")
    users.value = res.data || []
  } catch (e) {
    console.error(e)
    errorUsers.value = "No se pudo cargar /users/ (o el endpoint no existe todavía)."
    users.value = []
  } finally {
    loadingUsers.value = false
  }
}

const createUser = async () => {
  const u = newUser.value.username.trim()
  const p = newUser.value.password.trim()

  if (!u) return alert("Username es obligatorio.")
  if (!p) return alert("Password es obligatorio.")

  try {
    await api.post("/users/", {
      username: u,
      password: p,
      role: newUser.value.role,
      active: !!newUser.value.active
    })

    newUser.value.username = ""
    newUser.value.password = ""
    newUser.value.role = "operario"
    newUser.value.active = true

    await loadUsers()
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.detail || "No se pudo crear el usuario.")
  }
}

const resetPassword = ref({}) // { [userId]: "nuevoPass" }

const toggleUserActive = async (u) => {
  try {
    await api.patch(`/users/${u.id}/active`, { active: !u.active })
    await loadUsers()
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.detail || "No se pudo actualizar el estado del usuario.")
  }
}

const doResetPassword = async (u) => {
  const newPass = String(resetPassword.value[u.id] || "").trim()
  if (!newPass) return alert("Escribe un password nuevo.")
  try {
    await api.post(`/users/${u.id}/reset-password`, { password: newPass })
    resetPassword.value[u.id] = ""
    alert("Password actualizado.")
  } catch (e) {
    console.error(e)
    alert(e.response?.data?.detail || "No se pudo resetear el password.")
  }
}


// -------------------------
// Montaje
// -------------------------
onMounted(async () => {
  await loadLocations()
})
</script>

<template>
  <div class="page">
    <header class="page-header">
      <div>
        <h1>Panel Administrador</h1>
        <p class="subtitle">Configuración y mantenimiento del sistema TraceFlow.</p>
      </div>

      <div class="tabbar">
        <button class="tab" :class="{ active: activeTab === 'locations' }" @click="activeTab = 'locations'">
          Ubicaciones
        </button>

        <button
          class="tab"
          :class="{ active: activeTab === 'products' }"
          @click="activeTab = 'products'; loadProducts()"
        >
          Productos
        </button>

        <button class="tab" :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'; loadUsers()">
          Usuarios
        </button>

        <button class="tab" :class="{ active: activeTab === 'tools' }" @click="activeTab = 'tools'">
          Herramientas
        </button>


      </div>
    </header>

    <!-- TAB: UBICACIONES -->
    <section v-if="activeTab === 'locations'" class="card">
      <div class="card-header">
        <div>
          <h2>Gestión de ubicaciones</h2>
          <p class="subtitle">Crear y revisar ubicaciones del sistema.</p>
        </div>
        <button class="btn-outline" @click="loadLocations" :disabled="loadingLocations">
          {{ loadingLocations ? "Actualizando..." : "Actualizar" }}
        </button>
      </div>

      <div class="grid">
        <!-- Crear -->
        <div class="subcard">
          <h3>Nueva ubicación</h3>

          <div class="field">
            <label>Nombre</label>
            <input v-model="newLoc.name" placeholder="Ej: bodega A, máquina 6, MP general..." />
          </div>

          <div class="field">
            <label>Tipo</label>
            <select v-model="newLoc.type">
              <option value="COMPRAS">COMPRAS</option>
              <option value="MP_GENERAL">MP_GENERAL</option>
              <option value="MP_PLANTA">MP_PLANTA</option>
              <option value="MEZCAL">MEZCAL</option>
              <option value="MAQ">MAQ</option>
              <option value="SEMITERMINADO">SEMITERMINADO</option>
              <option value="PT">PT</option>
              <option value="MERMA">MERMA</option>
            </select>
          </div>

          <button class="btn-primary" @click="createLocation">
            Crear ubicación
          </button>

          <p class="hint">
            Tip: tus máquinas también son ubicaciones tipo <b>MAQ</b>.
          </p>
        </div>

        <!-- Listado -->
        <div class="subcard">
          <h3>Listado</h3>

          <div class="field">
            <label>Buscar</label>
            <input v-model="locSearch" placeholder="Filtrar por nombre o tipo..." />
          </div>

          <p v-if="errorLocations" class="error">{{ errorLocations }}</p>
          <p v-else-if="loadingLocations" class="subtitle">Cargando...</p>

          <table v-else class="table">
            <thead>
              <tr>
                <th style="width:80px;">ID</th>
                <th>Nombre</th>
                <th style="width:140px;">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredLocations.length === 0">
                <td colspan="3" class="empty">Sin resultados.</td>
              </tr>
              <tr v-for="l in filteredLocations" :key="l.id">
                <td>{{ l.id }}</td>
                <td>{{ l.name }}</td>
                <td><span class="pill">{{ l.type }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- TAB: USUARIOS -->
    <section v-else-if="activeTab === 'users'" class="card">
      <div class="card-header">
        <div>
          <h2>Gestión de usuarios</h2>
          <p class="subtitle">Crear usuarios y asignar roles (admin, supervisor, operario).</p>
        </div>
        <button class="btn-outline" @click="loadUsers" :disabled="loadingUsers">
          {{ loadingUsers ? "Actualizando..." : "Actualizar" }}
        </button>
      </div>

      <div class="grid">
        <!-- Crear usuario -->
        <div class="subcard">
          <h3>Nuevo usuario</h3>

          <div class="field">
            <label>Username</label>
            <input v-model="newUser.username" placeholder="Ej: operario1" />
          </div>

          <div class="field">
            <label>Password</label>
            <input v-model="newUser.password" type="password" placeholder="••••••••" />
          </div>

          <div class="field">
            <label>Rol</label>
            <select v-model="newUser.role">
              <option value="operario">operario</option>
              <option value="supervisor">supervisor</option>
              <option value="admin">admin</option>
            </select>
          </div>

          <div class="field checkrow">
            <input type="checkbox" v-model="newUser.active" />
            <label class="checklabel">Activo</label>
          </div>

          <button class="btn-primary" @click="createUser">
            Crear usuario
          </button>
        </div>

        <!-- Listado -->
        <div class="subcard">
          <h3>Listado</h3>

          <p v-if="errorUsers" class="error">{{ errorUsers }}</p>
          <p v-else-if="loadingUsers" class="subtitle">Cargando...</p>

          <table v-else class="table">
  <thead>
    <tr>
      <th style="width:80px;">ID</th>
      <th>Username</th>
      <th style="width:140px;">Rol</th>
      <th style="width:120px;">Activo</th>
      <th style="width:280px;">Reset Password</th>
    </tr>
  </thead>

  <tbody>
    <tr v-if="users.length === 0">
      <td colspan="5" class="empty">Sin usuarios.</td>
    </tr>

    <tr v-for="u in users" :key="u.id">
      <td>{{ u.id }}</td>
      <td>{{ u.username }}</td>
      <td><span class="pill">{{ u.role }}</span></td>

      <!-- Toggle activo -->
      <td>
        <button class="btn-outline" @click="toggleUserActive(u)">
          {{ u.active ? "Sí" : "No" }}
        </button>
      </td>

      <!-- Reset password -->
      <td>
        <div class="reset-row">
          <input
            class="reset-input"
            type="password"
            v-model="resetPassword[u.id]"
            placeholder="Nuevo password"
          />
          <button class="btn-outline" @click="doResetPassword(u)">
            Reset
          </button>
        </div>
      </td>
    </tr>
  </tbody>
</table>

        </div>
      </div>
    </section>

    <!-- TAB: PRODUCTOS -->
<section v-else-if="activeTab === 'products'" class="card">
  <div class="card-header">
    <div>
      <h2>Catálogo de productos</h2>
      <p class="subtitle">
        Productos base del sistema (MP, SEMI, PT, MERMA).
        Los operarios solo seleccionan, no crean.
      </p>
    </div>
    <button class="btn-outline" @click="loadProducts" :disabled="loadingProducts">
      {{ loadingProducts ? "Actualizando..." : "Actualizar" }}
    </button>
  </div>

  <div class="grid">
    <!-- Crear producto -->
    <div class="subcard">
      <h3>Nuevo producto</h3>

      <div class="field">
        <label>SKU</label>
        <input v-model="newProduct.sku" placeholder="Ej: MP-001" />
      </div>

      <div class="field">
        <label>Nombre</label>
        <input v-model="newProduct.name" placeholder="Ej: Polipropileno" />
      </div>

      <div class="field">
        <label>Categoría</label>
        <select v-model="newProduct.category">
          <option value="MP">MP</option>
          <option value="SEMI">SEMI</option>
          <option value="PT">PT</option>
          <option value="MERMA">MERMA</option>
        </select>
      </div>

      <div class="field">
        <label>Unidad (UOM)</label>
        <input v-model="newProduct.uom" placeholder="kg" />
      </div>

      <div class="field checkrow">
        <input type="checkbox" v-model="newProduct.active" />
        <label class="checklabel">Activo</label>
      </div>

      <button class="btn-primary" @click="createNewProduct">
        Crear producto
      </button>

      <p class="hint">
        Nota: solo puede existir <b>un producto MERMA activo</b>.
      </p>
    </div>

    <!-- Listado -->
    <div class="subcard">
      <h3>Listado</h3>

      <p v-if="errorProducts" class="error">{{ errorProducts }}</p>
      <p v-else-if="loadingProducts" class="subtitle">Cargando...</p>

      <table v-else class="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Nombre</th>
            <th>Categoría</th>
            <th>UOM</th>
            <th>Activo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="products.length === 0">
            <td colspan="5" class="empty">Sin productos.</td>
          </tr>

          <tr v-for="p in products" :key="p.id">
            <td>{{ p.sku }}</td>
            <td>{{ p.name }}</td>
            <td><span class="pill">{{ p.category }}</span></td>
            <td>{{ p.uom }}</td>
            <td>
              <button class="btn-outline" @click="toggleActiveProduct(p)">
                {{ p.active ? "Sí" : "No" }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>


    <!-- TAB: HERRAMIENTAS -->
    <section v-else class="card">
      <h2>Herramientas</h2>
      <p class="subtitle">Accesos rápidos para administración y soporte.</p>

      <div class="tools">
        <div class="tool">
          <p class="tool-title">Swagger / Docs</p>
          <p class="tool-sub">{{ serverInfo.docs }}</p>
          <a class="btn-outline" :href="serverInfo.docs" target="_blank" rel="noreferrer">Abrir /docs</a>
        </div>

        <div class="tool">
          <p class="tool-title">API Base</p>
          <p class="tool-sub">{{ serverInfo.api }}</p>
          <a class="btn-outline" :href="serverInfo.api" target="_blank" rel="noreferrer">Abrir /</a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 1rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.subtitle { font-size: 0.85rem; color: #6b7280; margin-top: 0.2rem; }

.tabbar { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.tab {
  border: 1px solid #d1d5db;
  background: white;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  cursor: pointer;
}
.tab.active {
  border-color: transparent;
  color: white;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
}

.card {
  background: white;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
.subcard {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.field { display: flex; flex-direction: column; gap: 0.25rem; }
label { font-size: 0.8rem; font-weight: 600; color: #374151; }
input, select {
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  padding: 0.45rem 0.6rem;
  font-size: 0.9rem;
}

.checkrow { flex-direction: row; align-items: center; gap: 0.5rem; }
.checklabel { margin: 0; font-weight: 600; }

.table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.table th, .table td { padding: 0.45rem 0.5rem; border-bottom: 1px solid #f3f4f6; text-align: left; }
.table thead { background: #f9fafb; }
.pill {
  display: inline-flex;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(99,102,241,0.12);
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 600;
}

.btn-outline {
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  border: 1px solid #d1d5db;
  background: white;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-primary {
  border-radius: 0.6rem;
  padding: 0.55rem 0.85rem;
  font-size: 0.9rem;
  border: none;
  color: white;
  cursor: pointer;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
}
.hint { font-size: 0.8rem; color: #6b7280; }

.error { color: #b91c1c; font-size: 0.85rem; }
.empty { color: #9ca3af; font-size: 0.85rem; text-align: center; padding: 0.75rem 0; }

.tools { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.9rem; }
.tool { border: 1px solid #e5e7eb; border-radius: 0.75rem; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; }
.tool-title { font-weight: 700; margin: 0; }
.tool-sub { margin: 0; font-size: 0.85rem; color: #6b7280; }


</style>

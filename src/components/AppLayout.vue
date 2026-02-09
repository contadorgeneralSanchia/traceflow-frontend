<!-- src/components/AppLayout.vue -->
<script setup>
import { useRouter } from "vue-router"
import { computed } from "vue"
import { useAuthStore } from "../stores/auth"
import logo from "../assets/logoSI.jpg"
const router = useRouter()
const auth = useAuthStore()

const handleLogout = () => {
  auth.logout()
  router.push("/login")
}

const userName = computed(() => auth.user?.username || auth.user?.sub || "Usuario")

const roleLabel = computed(() => {
  const r = auth.user?.role
  if (!r) return "Sin rol"
  if (r === "admin") return "Administrador"
  if (r === "supervisor") return "Supervisor"
  if (r === "operario") return "Operario"
  return r
})
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="logo">
        <img :src="logo" alt="Logo empresa" class="logo-img" />
        <div class="logo-text">
          <h1>Sanchia International</h1>
          <p>Control de flujo productivo</p>
        </div>
      </div>

      <div class="user-info" v-if="auth.user">
        <p class="user-name">{{ userName }}</p>
        <p class="user-role">{{ roleLabel }}</p>
      </div>

      <nav class="menu">
        <!-- Admin -->
        <router-link
          v-if="auth.user?.role === 'admin'"
          to="/admin"
          class="menu-item"
        >
          Panel Administrador
        </router-link>

        <!-- Supervisor -->
        <router-link
          v-if="auth.user?.role === 'admin' || auth.user?.role === 'supervisor'"
          to="/supervisor"
          class="menu-item"
        >
          Panel Supervisor
        </router-link>

        <!-- Operario (✅ supervisor también puede ver por emergencias) -->
        <router-link
          v-if="auth.user?.role === 'admin' || auth.user?.role === 'operario' || auth.user?.role === 'supervisor'"
          to="/operario"
          class="menu-item"
        >
          Panel Operario
        </router-link>
      </nav>

      <button class="logout-btn" @click="handleLogout">
        Cerrar sesión
      </button>
    </aside>

    <div class="main">
      <header class="topbar">
        <h2>Panel de control TraceFlow</h2>
      </header>

      <section class="content">
        <slot />
      </section>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: #f3f4f6;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.sidebar {
  width: 260px;
  background: #0f172a;
  color: #e5e7eb;
  padding: 1.5rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: white;
}

.logo-img {
  width: 60px;
  height: 80px;
  object-fit: contain;
}

.logo-text h1 {
  font-size: 1rem;
  font-weight: 600;
}

.logo-text p {
  font-size: 0.75rem;
  color: #9ca3af;
}

.user-info {
  padding: 0.75rem 0.75rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.user-name {
  font-size: 0.875rem;
  font-weight: 600;
}

.user-role {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.25rem;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.75rem;
  flex: 1;
}

.menu-item {
  padding: 0.6rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #e5e7eb;
  text-decoration: none;
  display: block;
}

.menu-item.router-link-active {
  background: linear-gradient(135deg, #38bdf8, #6366f1);
}

.menu-item:hover {
  background: rgba(148, 163, 184, 0.25);
}

.logout-btn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 0.75rem;
  font-size: 0.8rem;
  background: rgba(239, 68, 68, 0.12);
  color: #fecaca;
  cursor: pointer;
  margin-top: auto;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 56px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 1.5rem;
  background: white;
}

.topbar h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
}

.content {
  padding: 1.5rem;
}
</style>

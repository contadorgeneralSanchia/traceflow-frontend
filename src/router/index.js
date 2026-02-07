// src/router/index.js
import { createRouter, createWebHistory } from "vue-router"
import { useAuthStore } from "../stores/auth"

import Login from "../views/LoginView.vue"
import Admin from "../views/Admin.vue"
import OperarioDashboard from "../views/operario/OperarioDashboard.vue"
import SupervisorDashboard from "../views/supervisor/SupervisorDashboard.vue"

const routes = [
  {
    path: "/login",
    name: "login",
    component: Login
  },

  // Redirección simple por rol
  {
    path: "/",
    name: "home",
    meta: { requiresAuth: true },
    beforeEnter: (to, from, next) => {
      const auth = useAuthStore()
      const role = auth.user?.role

      if (role === "admin") return next("/admin")
      if (role === "supervisor") return next("/supervisor")
      if (role === "operario") return next("/operario")
      return next("/login")
    }
  },

  // Admin (solo admin)
  {
    path: "/admin",
    name: "admin",
    component: Admin,
    meta: {
      requiresAuth: true,
      roles: ["admin"]
    }
  },

  // Supervisor (admin también puede ver)
  {
    path: "/supervisor",
    name: "supervisor",
    component: SupervisorDashboard,
    meta: {
      requiresAuth: true,
      roles: ["admin", "supervisor"]
    }
  },

  // Operario (✅ supervisor también puede ver por emergencias)
  {
    path: "/operario",
    name: "operario",
    component: OperarioDashboard,
    meta: {
      requiresAuth: true,
      roles: ["admin", "operario", "supervisor"] // ✅ AQUÍ va el cambio
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  // Si la ruta requiere auth y no hay token
  if (to.meta.requiresAuth && !auth.token) {
    return next("/login")
  }

  // Si la ruta pide roles, validar
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.role)) {
    // si no tiene rol, lo mandamos a home (que redirige por rol)
    return next("/")
  }

  next()
})

export default router

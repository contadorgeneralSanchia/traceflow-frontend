<script setup>
import { onMounted } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"

const router = useRouter()
const auth = useAuthStore()

onMounted(() => {
  // Mantener sesión si recargas
  auth.init()

  // Si no hay token, login
  if (!auth.token) return router.replace("/login")

  const role = auth.user?.role

  // Redirección por rol
  if (role === "admin") return router.replace("/admin")
  if (role === "supervisor") return router.replace("/admin") // o "/supervisor" si existe esa ruta
  if (role === "operario") return router.replace("/operario")

  // fallback
  return router.replace("/login")
})
</script>

<template>
  <div style="padding:16px;">
    Redirigiendo...
  </div>
</template>

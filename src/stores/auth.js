import { defineStore } from "pinia"
import api from "../api/axios"
import { decodeJWT } from "../services/jwt"

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null, // { sub, role, exp }
    token: localStorage.getItem("token") || null,
    loading: false,
    error: null
  }),

  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null

      try {
        const res = await api.post("/auth/login", credentials)

        this.token = res.data.access_token
        localStorage.setItem("token", this.token)

        this.user = decodeJWT(this.token) // { sub, role, exp }
        return true
      } catch (err) {
        this.error = err.response?.data?.detail || "Error de autenticación"
        return false
      } finally {
        this.loading = false
      }
    },

    logout() {
      this.user = null
      this.token = null
      localStorage.removeItem("token")
    },

    // ✅ se asegura que user se recupere al refrescar
    init() {
      const token = localStorage.getItem("token")
      if (!token) {
        this.user = null
        this.token = null
        return
      }

      this.token = token
      const decoded = decodeJWT(token)

      // si token inválido / expirado, limpiar
      if (!decoded || (decoded.exp && Date.now() / 1000 >= decoded.exp)) {
        this.logout()
        return
      }

      this.user = decoded
    }
  }
})

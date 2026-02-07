// src/api/axios.js
import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000
})

// ✅ Interceptor: agrega Authorization Bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// (Opcional) Interceptor de respuesta: si token expiró o es inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el backend responde 401, limpiamos token para evitar loops raros
    if (error?.response?.status === 401) {
      localStorage.removeItem("token")
    }
    return Promise.reject(error)
  }
)

export default api

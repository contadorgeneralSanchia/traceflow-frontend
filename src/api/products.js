// src/api/products.js
import api from "./axios"

// -----------------------------
// LISTAR productos
// -----------------------------
export function fetchProducts(params = {}) {
  return api.get("/products/", { params })
}

// Conveniencia
export function fetchProductsMP() {
  return fetchProducts({ category: "MP", active: true })
}

export function fetchProductsAll() {
  return fetchProducts()
}

// -----------------------------
// CREAR producto
// -----------------------------
export function createProduct(payload) {
  return api.post("/products/", payload)
}

// -----------------------------
// ACTUALIZAR producto
// -----------------------------
export function updateProduct(productId, payload) {
  return api.put(`/products/${productId}`, payload)
}

// -----------------------------
// ACTIVAR / DESACTIVAR
// -----------------------------
export function toggleProductActive(product) {
  return updateProduct(product.id, { active: !product.active })
}

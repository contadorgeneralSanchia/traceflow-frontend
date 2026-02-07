import api from "./axios"

export function fetchAllInventory() {
  return api.get("/inventory/all")
}

export function fetchInventoryByLocation(locationId) {
  return api.get(`/inventory/location/${locationId}`)
}

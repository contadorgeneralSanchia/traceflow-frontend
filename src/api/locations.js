import api from "./axios"

export function fetchLocations() {
  return api.get("/locations/all")
}

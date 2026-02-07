import api from "./axios"

export function sendMovement(payload) {
  // payload debe tener:
  // { from_location, to_location, material, quantity, sent_by }
  return api.post("/movements/send", payload)
}

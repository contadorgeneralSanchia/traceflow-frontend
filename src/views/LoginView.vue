<script setup>
import { ref } from "vue"
import { useAuthStore } from "../stores/auth"
import { useRouter } from "vue-router"

const auth = useAuthStore()
const router = useRouter()

const username = ref("")
const password = ref("")
const error = ref(null)
const loading = ref(false)

const submit = async () => {
  loading.value = true
  error.value = null

  const ok = await auth.login({
    username: username.value,
    password: password.value
  })

  loading.value = false

  if (ok) {
    router.push("/")
  } else {
    error.value = auth.error
  }
}
</script>

<template>
  <div style="max-width:350px;margin:100px auto">
    <h2>Sanchia International. Login</h2>

    <form @submit.prevent="submit">
      <input v-model="username" placeholder="Usuario" />
      <input v-model="password" type="password" placeholder="Contraseña" />

      <button :disabled="loading">
        {{ loading ? "Ingresando..." : "Entrar" }}
      </button>
    </form>

    <p v-if="error" style="color:red">{{ error }}</p>
  </div>
</template>

<template>
  <AppLayout v-if="$route.path !== '/login'">
    <router-view />
  </AppLayout>

  <router-view v-else />
</template>

<script setup>
import AppLayout from "./components/AppLayout.vue"
</script>

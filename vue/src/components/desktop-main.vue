<script setup>
import { RouterView } from 'vue-router';
</script>

<template>
  <el-card shadow="never">
    <RouterView />
  </el-card>
</template>

<style lang="less" scoped>
a {
}

a:hover {
  background-color: transparent;
}

.el-card {
  height: 100%;

  :deep(.el-card__body) {
    height: 100%;
  }
}
</style>

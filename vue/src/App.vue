<script setup>
import Aside from '@/components/desktop-aside.vue';
import Header from '@/components/desktop-header.vue';
import Main from '@/components/desktop-main.vue';
</script>

<template>
  <el-container>
    <el-header>
      <Header />
    </el-header>
    <el-container>
      <el-aside class="desktop-aside">
        <Aside />
      </el-aside>
      <el-main>
        <Main />
      </el-main>
    </el-container>
  </el-container>
</template>

<style lang="less" scoped>
.el-container {
  background: var(--color-gray-background);
}

.desktop-aside {
  width: var(--aside-width);
}

.el-main {
  padding: 0;
  padding-right: 20px;
}
</style>

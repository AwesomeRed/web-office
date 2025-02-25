<script setup>
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const handleRouter = (path) => {
  router.push({
    path,
  });
};

const activeMenu = ref('1');
const menuData = [
  {
    id: '1',
    text: '首页',
    icon: 'House',
    leaf: true,
    path: '/',
  },
  {
    id: '2',
    text: '云文档',
    icon: 'Folder',
    leaf: false,
    children: [
      {
        id: '2-1',
        text: '加密文件夹',
        icon: 'Key',
        leaf: true,
      },
      {
        id: '2-2',
        text: '与我共享',
        icon: 'User',
        leaf: true,
      },
    ],
  },
  {
    id: '3',
    text: '回收站',
    icon: 'Delete',
    leaf: true,
  },
];
</script>

<template>
  <div class="btns-group">
    <el-button type="primary" size="large">
      <el-icon><Plus /></el-icon>
      新建
    </el-button>
    <br />
    <el-button size="large">
      <el-icon><UploadFilled /></el-icon>
      导入
    </el-button>
  </div>
  <br />
  <el-menu :default-active="activeMenu">
    <template v-for="menu in menuData" :key="menu.id">
      <el-menu-item v-if="menu.leaf" :index="menu.id" @click="handleRouter(menu.path)">
        <el-icon><component :is="menu.icon" /></el-icon>
        <span>{{ menu.text }}</span>
      </el-menu-item>

      <el-sub-menu v-else :index="menu.id">
        <template #title>
          <el-icon><Folder /></el-icon>
          <span>{{ menu.text }}</span>
        </template>
        <el-menu-item v-for="subMenu in menu.children" :key="subMenu.id" :index="subMenu.id">
          <el-icon><component :is="subMenu.icon" /></el-icon>
          <span>{{ subMenu.text }}</span>
        </el-menu-item>
      </el-sub-menu>
    </template>
  </el-menu>
</template>

<style lang="less" scoped>
.btns-group {
  display: flex;
  flex-direction: column;
  margin: 0 25px;
}

.el-menu {
  background-color: var(--color-gray-background);
}

:deep(.el-menu) {
  background-color: var(--color-gray-background);
}
</style>

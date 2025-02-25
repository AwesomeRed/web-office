<script setup>
import { Bell, Search, Operation, UserFilled } from '@element-plus/icons-vue';
import logo from './icons/element-plus-logo.svg';
</script>
<template>
  <div class="header-ct">
    <div class="logo-ct">
      <img :src="logo" alt="logo" />
    </div>
    <el-row class="top-bar">
      <el-col :xs="10" :sm="10" :md="10" :lg="8" :xl="8">
        <el-input placeholder="搜索文档" :prefix-icon="Search" />
      </el-col>
      <el-col :xs="14" :sm="14" :md="14" :lg="16" :xl="16" class="tool-btn-group">
        <a class="tool-btn">
          <el-icon><Bell /></el-icon>
        </a>
        <a class="tool-btn">
          <el-icon><Operation /></el-icon>
        </a>
        <el-avatar :icon="UserFilled" :size="25"></el-avatar>
      </el-col>
    </el-row>
  </div>
</template>

<style lang="less" scoped>
.header-ct {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;

  .logo-ct {
    width: var(--aside-width);
    margin-left: -20px;
    background-color: var(--color-gray-background);
    display: flex;
    align-items: center;
    justify-content: center;

    img {
      width: 150px;
    }
  }

  .top-bar {
    flex: 1;
    background-color: var(--color-gray-background);
    align-items: center;

    .tool-btn-group {
      display: flex;
      flex-direction: row;
      justify-content: flex-end;
      align-items: center;

      .tool-btn {
        align-items: center;
        display: flex;
        border-radius: 4px;
        color: #464d5a;
        font-size: 20px;
        gap: 4px;
        height: 32px;
        line-height: 16px;
        padding: 0 4px;
        margin-right: 10px;
      }

      .tool-btn::hover {
        background-color: #fff;
      }
    }
    .el-input {
      max-width: 720px;
      min-width: 248px;
    }
  }
}
</style>

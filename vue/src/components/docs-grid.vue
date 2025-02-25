<script lang="jsx" setup>
import axios from 'axios';
import { useRouter } from 'vue-router';

const loading = ref(false);
const router = useRouter();

// 打开文件
const openDocument = async (rowData) => {
  loading.value = true;
  const response = await axios.get('/api/files/open', {
    params: {
      collectionId: 'doc-collection',
      docId: 'doc-id',
    },
  });
  loading.value = false;
  const isSuccess = response.status === 200 && response.data && response.data.success;
  if (isSuccess) {
    router.push({
      path: '/quill',
      query: {
        fileName: rowData.name,
      },
    });
  } else {
    ElNotification({
      title: '错误',
      message: '无法打开文档',
      type: 'error',
    });
  }
};

const columns = [
  {
    key: 'name',
    dataKey: 'name',
    title: '名称',
    flexGrow: 1,
    cellRenderer: (props) => (
      <a
        href="#"
        onclick={() => {
          openDocument(props.rowData);
        }}
      >
        {props.rowData.name}
      </a>
    ),
  },
  {
    key: 'owner',
    dataKey: 'owner',
    title: '所有者',
    width: 150,
  },
  {
    key: 'lastTime',
    dataKey: 'lastTime',
    title: '最近查看',
    sortable: true,
    width: 150,
  },
  {
    key: 'createdAt',
    dataKey: 'createdAt',
    title: '创建时间',
    width: 150,
  },
  {
    key: 'size',
    dataKey: 'size',
    title: '文档大小',
    width: 150,
  },
];

const data = [
  {
    id: '1',
    name: '富文本编辑',
    owner: '我',
    lastTime: '02-21 15:30',
    createdAt: '2024-12-08',
    size: '5kb',
  },
  {
    id: '2',
    name: '在线编辑示例',
    owner: '我',
    lastTime: '02-21 15:30',
    createdAt: '2024-12-08',
    size: '1kb',
  },
];
</script>

<template>
  <el-auto-resizer>
    <template #default="{ width, height }">
      <el-table-v2 v-loading="loading" :columns="columns" :data="data" :width="width" :height="height" />
    </template>
  </el-auto-resizer>
</template>

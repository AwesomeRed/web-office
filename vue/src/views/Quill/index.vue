<script setup>
import 'quill/dist/quill.core.css';
import 'quill/dist/quill.snow.css';

import { onMounted, onUnmounted, ref, computed, reactive } from 'vue';
import Quill from 'quill';
import QuillType from '@/utils/quill_type';
import QuillCursors from 'quill-cursors';
import ReconnectingWebSocket from 'reconnecting-websocket';
import Client from 'sharedb/lib/client';
import { Back, RefreshRight, Lock, UserFilled } from '@element-plus/icons-vue';
import { useRouter, useRoute } from 'vue-router';

const editorRef = ref(null);

Client.types.register(QuillType.type);
// 建立 WebSocket 连接
const socket = new ReconnectingWebSocket(import.meta.env.VITE_PROXY_DOMAIN_SOCKET, [], {
  maxEnqueuedMessages: 0,
});

const connection = new Client.Connection(socket);
// quill编辑器实例
let editor = null;
// sharedb文档实例
let doc = null;
// quill协同光标模块
let cursorsModule = null;
// 用户状态，用于接收其他用户的状态
const presence = ref({});
// 本机用户状态 - 用于提交本机用户的状态
let localPresence = null;
// 其他在线用户
const remoteClients = ref(new Set());
// 所有在线用户
const onlineAccounter = computed(() => {
  // const local = presence.value.localPresences;
  const remote = {};
  remoteClients.value.forEach((key) => {
    remote[key] = presence.value.remotePresences[key];
  });
  return { ...remote };
});

const getDocument = () => {
  return connection.get('doc-collection', 'doc-id');
};

const initQuillEditor = () => {
  // 使用QuillCursors模块
  Quill.register('modules/cursors', QuillCursors);
  // 获取QuillCursors模块实例
  // const cursorsModule = quillEditor.getModule('cursors');
  // 在组件挂载后初始化Quill编辑器
  return new Quill(editorRef.value, {
    theme: 'snow', // 可选主题，这里使用snow主题
    // 可以在这里配置更多的选项，如工具栏等
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'], // 加粗、斜体、下划线、删除线
        ['link', 'image'], // 链接、图片
        [{ list: 'ordered' }, { list: 'bullet' }], // 有序列表、无序列表
        [{ size: ['small', false, 'large', 'huge'] }], // 字体大小
        [{ color: [] }, { background: [] }], // 字体颜色、背景颜色
        [{ align: [] }], // 对齐方式
        ['clean'], // 清除格式
      ],
      cursors: true,
    },
  });
};

// 更新其他用户的光标位置
const updateOtherCursor = (cursorsModule) => {
  return (clientId, range) => {
    if (range === null) {
      cursorsModule.removeCursor(clientId);
      remoteClients.value.delete(clientId);
      return;
    }
    if (!remoteClients.value.has(clientId)) {
      cursorsModule.createCursor(clientId, range.name, range.color);
      remoteClients.value.add(clientId);
    }
    cursorsModule.moveCursor(clientId, range);
  };
};

const startEdit = () => {
  // 富文本编辑器
  editor = initQuillEditor();
  // sharedb文档
  doc = getDocument();
  // quill协同光标模块
  cursorsModule = editor.getModule('cursors');
  // 用户状态，用于接收其他用户的状态
  presence.value = reactive(connection.getDocPresence('doc-collection', 'doc-id'));
  // 本机用户状态 - 用于提交本机用户的状态
  localPresence = presence.value.create();

  // 向服务器订阅文档
  doc.subscribe((err) => {
    if (err) throw err;
    if (doc.type !== null) {
      // 初次进入先更新一次用户状态
      // localPresence.submit(editor.getSelection());
      editor.setContents(doc.data);
      return doc;
    } else {
      console.error('错误：文档不存在');
    }
  });
  // 监听其他用户的编辑内容更新
  doc.on('op', (delta, source) => {
    if (!source) {
      editor.updateContents(delta);
    }
  });

  // 监听编辑器内容变化事件
  editor.on('text-change', (delta, oldDelta, source) => {
    if (source === 'user') {
      doc.submitOp(delta);
    }
  });

  // 监听编辑器选区变化事件
  editor.on('selection-change', (range, oldRange, source) => {
    if (range && source === 'user') {
      localPresence.submit(range);
    }
  });

  // 监听其他用户的光标位置变化
  const updateOthers = updateOtherCursor(cursorsModule);
  presence.value.subscribe((error) => {
    if (error) throw error;
  });
  presence.value.on('receive', updateOthers);
};

const router = useRouter();
const route = useRoute();
const { fileName } = route.query || {};
const goBack = () => {
  router.back();
};

onMounted(() => {
  startEdit();
});

onUnmounted(() => {
  if (presence.value) {
    presence.value.destroy();
  }
  if (doc) {
    doc.destroy();
  }
  if (editor) {
    // 在组件卸载前销毁Quill编辑器
    editor = null;
    editorRef.value = null;
  }
  if (socket) {
    socket.close();
  }
});
</script>

<template>
  <div class="top-bar">
    <el-row>
      <el-col :span="6" class="btn-groups">
        <el-tooltip effect="dark" content="返回" placement="bottom">
          <el-button :icon="Back" link circle @click="goBack" />
        </el-tooltip>
        <el-button :icon="RefreshRight" link />
        <el-button :icon="Lock" link />
      </el-col>
      <el-col :span="12" class="file-name">{{ fileName }}</el-col>
      <el-col :span="6" class="online-accounter">
        <span v-if="Object.keys(onlineAccounter).length > 0" class="descrip">其他用户：</span>
        <template v-for="(key, index) in Object.keys(onlineAccounter)" :key="key">
          <el-avatar
            :size="25"
            :icon="UserFilled"
            fit="scale-down"
            :style="{ borderColor: onlineAccounter[key].color || 'none', zIndex: 999 - index }"
          >
            {{ onlineAccounter[key].name }}
          </el-avatar>
        </template>
      </el-col>
    </el-row>
  </div>
  <div id="editor" ref="editorRef" />
</template>

<style lang="less" scoped>
#editor {
  height: calc(100% - 80px);
}

:deep(strong) {
  font-weight: bold;
}

:deep(em) {
  font-style: italic;
}

:deep(.ql-editor) {
  padding: 18px;
}

.top-bar {
  background-color: var(--color-gray-background);
  border: 1px solid rgb(204, 204, 204);
  border-bottom: none;
  padding: 8px;

  .btn-groups {
    --el-font-size-base: 18px;

    .is-circle {
      width: 25px;
      height: 25px;
    }
  }

  .file-name {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #505050;
  }

  .online-accounter {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    .descrip {
      font-size: 12px;
      margin-right: 8px;
    }
    .el-avatar {
      border-style: solid;
      border-width: 1px;
      margin-left: -8px;
      box-shadow: 0 0 0 1px #1f232826;
      border-color: #409eff;
    }
  }
}
</style>

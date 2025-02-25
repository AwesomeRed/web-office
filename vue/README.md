# <center> 基于ShareDB + Quill构建实时协作编辑器</center>

## 1. 背景
在Web开发中，很多时候需要实现多人协作编辑的功能，例如在线文档编辑器、在线白板等。这些功能的核心是实现多人实时同步的功能，即当一个用户对文档进行修改时，其他用户能够立即看到修改的结果。为了解决这几个问题，通常有以下几个方案。
- __乐观锁__
乐观锁总是假设最好的情况，每次去拿数据的时候都认为别人不会修改，所以不会上锁，可能需要在更新的时候会判断一下在此期间别人有没有去更新这个数据提示一下，或者干脆不会给予任何的提示信息。
具体到文档编辑上面，可以乐观地认为永远不会有两个人同时编辑同一篇文档，现实中也有这样的场景，比如团队中每个人负责几篇文档，A和B负责的文档不会交叉，B没需要也没权限修改A负责的文档。

- __悲观锁__
悲观锁总是假设最坏的情况，每次去拿数据的时候都认为别人会修改，所以每次在拿数据的时候都会上锁，这样别人想拿这个数据就会阻塞直到它拿到锁。

- __自动合并__
  类似于Git，通过Diff算法对比两个版本的差异，然后自动合并。出现无法解决的冲突交由用户决定。

- __协同编辑__
  可以支持多个用户同时编辑同一个文档，但是需要保证文档的最终一致性。主要有OT算法和CRDT算法两种不同的方法去保持文档的最终一致性。当前有腾讯文档、Google Docs等基于OT算法的成熟商业产品，Atom编辑器使用的是CRDT协同算法。其中也有优秀的开源框架产品，例如ShareDB基于OT算法，Yjs基于CRDT算法。

基于贪多嚼不烂的原因，本文主要介绍基于OT算法的ShareDB+Quill构建实时协作编辑器的方案。通过动手深入了解OT算法。选择编辑富文本文档，它比纯文本文档复杂，比Excel简单，这样一种介于两者之间难度去实现应该是比较合适的，因此选用了Quill富文本编辑器，它的JSON储存结构天然支持OT算法。

## 2.原理分析
### 2.1 认识协同编辑
协同编辑本质上来说其实是一个分布式系统；分布式系统中的CAP理论是一个关键的设计原则。
```
CAP理论概述
C（Consistency，一致性）：所有节点在同一时刻看到的数据完全一致。任何操作都能读到最新写入的数据，类似于强一致性。

A（Availability，可用性）：每个请求（无论读写）都能获得非错误的响应，但不保证数据是最新的。

P（Partition Tolerance，分区容错性）：系统在发生网络分区（节点间通信中断）时仍能继续运行。
```

CAP理论指出，这三个特性中只能同时满足两个。比如，如果系统需要保证分区容错性（因为分布式系统通常需要处理网络分区的问题），那么就必须在一致性和可用性之间做出选择。如果选择一致性，那么在网络分区发生时，系统可能会拒绝写入或读取请求，直到分区恢复，保证数据的一致性，但这样就牺牲了可用性。如果选择可用性，那么系统会继续处理请求，但可能会返回过期的数据，牺牲了一致性。由于网络分区（P）无法避免，实际设计时通常需在一致性（C）和（可用性）A之间取舍。

不过，CAP理论有时候会被误解。实际上当网络情况良好时，一致性和可用性通常是可以同时满足的。对于协同编辑系统来说，网络分区是不可避免的。因此，在设计协同编辑系统时，只需要在一致性和可用性之间做出选择，而不是同时满足。只需要达到最终一致性即可。

最终一致性是指系统在一段时间内，所有用户看到的数据都是一致的。无论是OT算法还是CRDT算法，保持最终一致性是协同算法的指导思想。

### 2.2 OT算法是怎样工作的

在OT算法下，用户编辑文档时，会生成一个变更操作，这个操作是一个JSON对象，包含了操作的类型和位置信息。例如，用户想在文档末尾插入一个字符A，则提交的内容为：{ index: 11, insert: A }。然后，这个操作会被发送到服务器，服务器会将这个操作应用到文档上，生成新的文档。然后，服务器会将这个新的操作发送给其他用户，其他用户也会将这个操作应用到自己的文档上，生成新的文档。这样，所有用户都看到了相同的文档。

### 2.3 脏路径问题
有两个用户ClientA和ClientB，他们都对同一个文档位置进行了修改，如下图：

![冲突问题](f:/workspace/web-office/vue/src/assets/design/1.png "冲突问题")


由于在线文档编辑是通过网络同步变更，所有变更操作即使同时发生，但是通过网络的延迟，到达本地的时候其他用户的变更操作应用总是晚于本地用户操作。因此在不同的用户视角去看，文档的变更应用顺序是不一样的。如下图：

![冲突问题](f:/workspace/web-office/vue/src/assets/design/4.png "冲突问题")

在讨论产生冲突的原因之前，先定义这么一个解决并发冲突的策略：```当A和B产生并发冲突时，优先应用A的变更再应用B。```根据这种策略，当同时插入```A```和```B```时，文档内容的预期结果是```HelloAB```。在这种策略的前提下，上图中用户A的最终结果明显不符合预期。这是因为当插入```A```之后，当前文档的索引位置已经发生了变化，想要获得预期的结果，```B```的操作索引位置需要+1。也就是```{ index: 5 -> 6, insert: B }```。还是基于这种合并策略，用户B因为应用顺序的不同，不用修改索引位置就可以获得预期的结果。但是当改变合并的策略```优先应用B再到A的操作```，预期结果就变成了```HelloBA```，此时就要通过更改用户B里面的A操作的索引位置，才能得到预期的结果。

为了能更清晰地描述这个问题，尝试用符号的方式来表达，假设如下：
``` javascript
OpA：用户A的操作
OpB：用户B的操作
Doc：原文档
DocA：用户A最终显示的文档
DocB：用户B最终显示的文档
```
上图对应的符号表达如下：
```
DocA = Doc + OpA + OpB;
DocB = Doc + OpB + OpA;
DocA ≠ DocB; 
```
也就是说OpA + OpB ≠ OpB + OpA, 两个操作的顺序不能交换，并发操作合并不满足交换律。

为了解决DocA ≠ DocB的问题，需要找到一个函数T转换操作，使得：
```
DocA = DocB;
DocA = Doc + OpA + T(OpB);
DocB = Doc + OpB + OpA;
```
但是到这里还没有正确地定义好T函数，因为还需要为函数T再增加两个额外的参数。再来看一下上面的例子：
- __把OpA加入到参数里__，试想OpA插入的字符长度为2，则OpB的索引位置需要+2, 操作的变换其实和上一次的操作是有关系的。里。
- __增加side参数__，如果按照适当的操作顺序如上面例子的OpB->OpA顺序插入的是不需要变换操作里的索引位置，这个时候为了实现一种标准化的冲突解决策略，再增加一个参数side，用于决定操作是否需要变换。

最终记为：
```OpB' = T(OpB, OpA, side);```
该函数的第一个参数表示即将要发生变更的操作，第二个参数用于告诉T函数应该如何进行变更，第三个参数类似于开关，决定最终的变更操作是否需要变换。此时无论处于哪个客户端，都使用了统一标准的方式处理冲突，不同的只是参数顺序。
```
DocA = Doc + OpA + T(OpB, OpA, 'left');  // 当side为left时，OpB需要变换
DocB = Doc + OpB + T(OpA, OpB, 'right'); // 当side为right时，OpA不需要变换
```
通过函数T的变换，最终解决了脏路径的问题。

### 2.4 网络不稳定导致的问题

在分布式系统中，网络不可信性是一个常见的问题。对于协同编辑来说，可能会出现以下情况，服务端接收到同一个操作两次，或者一个用户基于较旧版本的文档生成了一个操作，但是这个操作在网络不好的情况下延迟到达服务端，这时候编辑的文档已经是最新的了。

为了解决这些问题在提交的操作中增加一个文档的版本号，和一个客户端ID，服务端在处理操作时，遇到同版本号同客户端的内容则认为收到了重复的内容，直接丢弃。

幸好的是sharedb框架自动帮我们管理这些版本号和客户端ID，不需要我们费心。sharedb里面一些处理合并冲突的策略也会根据版本号和客户端ID的字典序来判断操作的先后顺序。

### 2.5 Quill编辑器

Quill是一个开源的富文本编辑器，它的JSON存储结构天然支持OT算法。它的文本结构如下：
```
文档内容：Hello, World
文档JSON：
{
  "ops": [
    {
      "insert": "Hello, World"
    },
  ]
}

当用户A在文档位置2处中插入一个字符A时,产生操作的格式：
{"ops": [{ retain: 2 },{ "insert": "A" }]}

当用户B在文档位置2处中插入一个字符B时，产生操作的格式：
{"ops": [{ retain: 2 },{ "insert": "B" }]}

根据前面已经探讨过的脏路径问题，只需要通过OT算法把A的操作retain+1，就可以解决冲突问题。
{"ops": [{ retain: 3 },{ "insert": "A" }]}
```
原理分析完毕，接下来就可以动手实践了。

## 3.系统集成
- Node服务端配置（Express + sharedb + WebSocket）
- 前端配置（Vue + Quill + WebSocket + sharedb）

Node服务端安装配置
```
npm install express sharedb ws @teamwork/websocket-json-stream quill-delta
```

WEB端可以随意选择喜欢的框架，这里选择Vue，使用Vite脚手架创建Vue项目。
```
npm create vite@latest
```
安装Vue路由和ElementPlus
```
npm install vue-router element-plus
```
安装Quill富文本编辑器+WebSocket工具+sharedb
```
npm install quill sharedb reconnecting-websocket quill-delta
```

## 4.ShareDB + Quill实现
### 4.1 功能
- 支持多用户同时在线编辑在线功能
- 可以看到所有同时在线的用户，以及所有在线用户的光标

### 4.2 时序图
在线多用户协同编辑，除了核心的协同编辑功能外，还依赖对应的用户管理系统，文件管理系统。但是同时打造这些系统会花费大量的时间，所以后面会通过Mock数据的方式去模拟这两个系统。
尽管如此，当考虑整个协同操作的交互流程还是需要把这两个系统的交互也考虑进去，这才能正确地设计这个协同服务。

通过以下时序图展示用户初始化，首次连接服务端打开文档
![时序图](f:/workspace/web-office/vue/src/assets/design/3.png "时序图")

用户打开文档后，在线编辑文档的过程。
![时序图](f:/workspace/web-office/vue/src/assets/design/2.png "时序图")


### 4.3 协同编辑基础功能实现
1、服务端创建ShareDB一个后台实例backend，同时创建WS监听，backend后台监听webstock.

``` javascript
const ShareDB = require('sharedb');
var app = require('../app');
var http = require('http');
var WebSocket = require('ws');
var WebSocketJSONStream = require('@teamwork/websocket-json-stream');

var server = http.createServer(app);
var wss = new WebSocket.Server({ server });

// 创建一个ShareDB的后台实例
var backend = new ShareDB();

wss.on('connection', function(ws) {
  var stream = new WebSocketJSONStream(ws);
  var agent = backend.listen(stream);
  
  ws.on('close', function(ws) {
    // 进行释放;
  });
});

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
```
2、客户端创建ShareDB
``` javascript
import ReconnectingWebSocket from 'reconnecting-websocket';
import Client from 'sharedb/lib/client';

// 建立 WebSocket 连接
const socket = new ReconnectingWebSocket('服务器地址', [], {
  maxEnqueuedMessages: 0,
});
const connection = new Client.Connection(socket);
// 获取文档，这里的分组ID和文档ID可以是真实文档系统里面的文档ID，但是我这里虚拟了一个文档系统。
// 只需要保证所有客户端的分组ID和文档ID是一样的则所有客户端都是编辑同一份文档。
const doc = connection.get('分组ID', '文档ID');

// 向服务器订阅文档
doc.subscribe((err) => {
  if (err) throw err;
  if (doc.type !== null) {
      // 把服务端返回的文件内容加载到编辑器中
      editor.setContents(doc.data);
      return doc;
  } else {
      console.error('错误：文档不存在');
  }
});

// 监听其他用户的编辑内容更新
doc.on('op', (delta, source) => {
  if (!source) {
    // 其他用户操作到来的时候更新文档内容
    editor.updateContents(delta);
  }
});
```
此时的shareDB已经具备了共同编辑的功能，但是shareDB目前还不支持Quill编辑器。这是因为ShareDB支持的OTType(操作数据类型)为JSON0格式
``` javascript
// 插入字段
doc.submitOp({
  op: [{ p: 5, i: 'Hello' }]  // 在位置 5 插入字符串 'Hello'
});

// 删除字段
doc.submitOp({
  op: [{ p: 3, d: 'abc' }]  // 从位置 3 删除 'abc' 三个字符
});
```
可以看到与Quill编辑器的Delta数据类型不同，此时需要对Delta类型数据做适配。sharedb支持自定义操作类型，只需要实现相应的接口就可以
``` javascript
// 引入Quill编辑器提供的Delta类，支持了Delta格式数据的创建，合并等实用的功能
import Delta from 'quill-delta';

const DeltaType = {
  name: 'delta',

  // 创建初始数据格式化
  create: (initial) => {
    return new Delta(initial);
  }

  // 把Delta数据应用到本地Doc快照内
  apply: function (snapshot, delta) {
    snapshot = new Delta(snapshot);
    delta = new Delta(delta);
    return snapshot.compose(delta);
  },

  // 转换函数，就是上面提到的T函数
  transform: function (delta1, delta2, side) {
    delta1 = new Delta(delta1);
    delta2 = new Delta(delta2);
    return delta2.transform(delta1, side === 'left');
  },
  // ....
}
```
转换函数是整个OT算法保证最终一致性的关键，幸运的是Delta类型内置了转换函数。

``` npm install rich-text ```

注册自定义类型到Sharedb
``` javascript

// 服务端
const ShareDB = require('sharedb');
ShareDB.types.register(DeltaType);
...

// 客户端
import Client from 'sharedb/lib/client';
Client.types.register(DeltaType);

```

还有最后一步，只需要在客户端创建Quill编辑器实例即可
``` javascript
const editorRef // Quill编辑器的Dom容器
new Quill(editorRef.value, {
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
```
### 4.4 增加在线用户状态
Sharedb提供Presence类，用于更新用户状态，例如光标位置，用户名称，用户颜色等。
``` javascript
...
// 服务端启用Presence支持
new ShareDB({
  presence: true,
  doNotForwardSendPresenceErrorsToClient: true
});

// 客户端增加Presence支持
const connection = new Client.Connection(socket);
// 可以通过getPresence()和getDocPresence(),
// 创建出来的Presence类有不同的作用域，很明显这里用DocPresence只作用于一个文档
const presence = connection.getDocPresence('文档组ID', '文档ID');
// 本机用户状态 - 用于提交本机用户的状态
const localPresence = presence.create();
// 订阅状态变更
presence.subscribe((error) => {
    if (error) throw error;
  });
// 当接收到其他用户光标变更，更新光标
presence.on('receive', updateOthers);
// 当本地用户操作的时候，提交光标状态
editor.on('selection-change', (range, oldRange, source) => {
  if (range && source === 'user') {
    localPresence.submit(range);
  }
});
```

想要在Quill编辑器中显示其他用户的光标，可以通过安装quill-cursors模块，并且在Quill编辑器里注册此插件
``` javascript 
import QuillCursors from 'quill-cursors';

Quill.register('modules/cursors', QuillCursors);
const editor = new Quill(dom, {
  ...
  cursors: true, // 启用光标
});
const cursorsModule = editor.getModule('cursors');

// 更新其他协同编辑用户的光标
const updateOtherCursor = (cursorsModule) => {
  return (clientId, range) => {
    if (range === null) {
      // 协同编辑者offline的时候要删除光标
      cursorsModule.removeCursor(clientId);
      return;
    }
    if (!remoteClients.value.has(clientId)) {
      // 创建协同编辑者的显示光标
      cursorsModule.createCursor(clientId, range.name, range.color);
    }
    // 移动光标
    cursorsModule.moveCursor(clientId, range);
  };
};

const updateOthers = updateOtherCursor(cursorsModule);
// 当接收到其他用户光标变更，更新光标位置
presence.on('receive', updateOthers);
```
现在需要对协同光标在进行一些优化，给每个用户分配不同的颜色，让不同用户显示不同的光标颜色，并且显示用户的名称。现在提交到服务端的用户状态只包括当前的用户光标位置，不包括用户颜色，用户名称等。此时可以通过服务端sharedb提供的中间件功能，统一把这些用户状态丰富进去。
``` javascript
// sharedb提供多个钩子，可以在shared的不同生命周期实现定制化的功能，这里就用到了sendPresence
// 在服务端发送状态前，先丰富用户信息
backend.use('sendPresence', userAction.richUserInfo);

// 丰富用户信息
function richUserInfo(context, next) {
  // context.presence.src为客户端ID，系统中的用户信息（用户名，用户颜色）
  clientInfo = Clients.getClientInfo(context.presence.src);
  if (context.presence.p) {
      // 把用户信息合并到光标位置信息里，再发送出去
      context.presence.p = Object.assign(context.presence.p, clientInfo);
  }
  return next();
}
```
最后看看成果图
![成果图](f:/workspace/web-office/vue/src/assets/design/show.gif "成果图")

## 5.总结
##### 核心价值

实时协作基石：基于OT算法实现多人编辑的毫秒级同步，兼顾高效与一致性，规避传统方案的冲突难题。

开发提效利器：开箱即用的前后端架构、轻量JSON数据模型、模块化设计，大幅降低实时编辑器开发门槛。

企业级扩展能力：从离线编辑、权限管控到审计追溯，灵活支持复杂业务场景，满足安全与合规需求。

##### 关键特性

算法成熟：OT的集中式冲突解决，简化历史版本管理，适配文档协作场景。

生态友好：无技术栈绑定，兼容主流前后端框架与数据库，扩展模块丰富。

性能卓越：增量同步、内存快照、操作批处理等机制，支撑高并发与弱网环境。

适用边界

推荐场景：在线文档、教育协同、企业办公等需实时协作的中等复杂度文本场景。

慎用场景：超高频操作（如代码实时编译）、超大规模嵌套数据（如3D建模协同）。

##### 未来演进

协同编辑扩充到Excel文档，或者可以协同画画等更丰富更复杂的场景。从OT算法的代码可靠性上面，可以增加测试用例，测试功能，安全性能测试，操作日志等方式去不断追踪优化OT算法。

向CRDT/OT混合模式发展，平衡去中心化需求与算法复杂度。

强化端侧AI能力（如智能语法检查），提升协作编辑体验。

最后附上一些相关连接：
https://cloud.tencent.com/developer/article/2216020
https://blog.csdn.net/React_Community/article/details/123492567

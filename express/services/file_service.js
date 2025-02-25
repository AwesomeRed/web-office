const ShareDBUtil = require('../utils/sharedb_utils');


/**
 * 打开文件
 * @param {String} collectionId - 集合ID
 * @param {String} docId - 文档ID
 * @param {Function} callback - 回调函数
 */
function openFile(collectionId, docId, callback) {
  const backend = ShareDBUtil.getBackend();
  const connection = backend.connect();
  
  // 查找文档
  const doc = connection.get(collectionId, docId);
  doc.fetch(function (err) {
    if (err) {
      callback(err);
    } else if (doc.type === null) {
      // 文档不存在，创建并初始化文档
      // 从数据库获取文档内容
      // ...
      console.error("开始创建Doc文档");
      doc.create([{ insert: 'Hello, World!' }], 'quill', function (err) {
        if (err) {
          callback(err);
        } else {
          callback(null);
        }
      });
    } else {
      // 文档已存在，无需创建
      console.error("已创建Doc文档");
      callback(null);
    }
  });
}


module.exports = {
    openFile
}
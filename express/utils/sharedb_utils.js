const ShareDB = require('sharedb');
const QuillType = require('./quill_type');
const userAction = require('../middleware/user_action');

// sharedb后台总控，单例
let backend = null;


function getBackend() {
  // 如果没有实例化，则实例化一个
  if (backend === null) {
    // 注册自定义类型
    ShareDB.types.register(QuillType.type)

    backend = new ShareDB({
      presence: true,
      doNotForwardSendPresenceErrorsToClient: true
    });

    // backend.use('connect', userAction.register);
    // backend.use('close', userAction.unRegister);
    // 丰富用户状态信息
    backend.use('sendPresence', userAction.richUserInfo);
  }
  return backend;
}

module.exports = {
  getBackend,
};
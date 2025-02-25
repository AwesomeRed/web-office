const Clients = require('../utils/client_collections');

// 定义最大账号数
const MAX_ACCOUNT = 50;

// 记录当前使用的颜色索引
let currentIndex = 0;
// 定义颜色池
const colorPool = [
    '#FF5733', '#C70039', '#900C3F', '#581845',
    '#FFC300', '#DAF7A6', '#FF5733', '#C70039'
];
// 从颜色池中获取颜色的函数
function getColorFromPool() {
    const color = colorPool[currentIndex];
    currentIndex = (currentIndex + 1) % colorPool.length;
    return color;
}

function randomUserCfg() {
    return {
        color: getColorFromPool(),
        name: 'User' + userCount++
    };
}

// 定义用户池
const userPool = {};
let userCount = 0;

function register(context, next) {
    const userId = context.agent.clientId;
    console.log('当前连入用户ID：' + userId);
    console.log('当前用户池：' + JSON.stringify(userPool));
    if (typeof userPool.userId === 'string') {
        return next();
    }

    if (Object.keys(userPool).length >= MAX_ACCOUNT) {
        return next(new Error('Too many users'));
    }

    userPool[userId] = {
        color: getColorFromPool(),
        name: 'User' + userCount++
    };
    return next();
}

function unRegister(context, next) {
    const userId = context.agent.clientId;
    if (typeof userPool.userId === 'string') {
        delete userPool[userId];
    }
    console.log('用户断开连接：' + userId);
}

function richUserInfo(context, next) {
    clientInfo = Clients.getClientInfo(context.presence.src);
    if (context.presence.p) {
        context.presence.p = Object.assign(context.presence.p, clientInfo);
    }
    return next();
}

module.exports = {
    register,
    unRegister,
    richUserInfo,
    randomUserCfg
}
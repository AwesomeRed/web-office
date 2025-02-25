// 定义最大账号数
const MAX_ACCOUNT = 50;

// 记录当前使用的颜色索引
let currentIndex = 0;
let userCount = 0;
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

const clients = {};

function addClient(clientId) {
    if (!clients[clientId]) {
        clients[clientId] = randomUserCfg();
    }
    console.log(clients);
}

function removeClient(clientId) {
    if (clients[clientId]) {
        delete clients[clientId];
    }
}

function getClientInfo(clientId) {
    return clients[clientId];
}

module.exports = {
    addClient,
    removeClient,
    getClientInfo 
}
// 游戏初始化
console.log("Initializing game...");

let arweave;
let aoClient;
let walletAddress;
const AO_PROCESS_ID = "YOUR_AO_PROCESS_ID"; // 替换为你的AO Process ID

let currentScene = 0;
let chapterProgress = 0;
let gameState = {
    inventory: [],
    flags: {}
};

const chapter1Scenes = [
    {
        image: 'url_to_scene_1_image',
        text: "You find yourself in a mysterious laboratory. Screens flicker with data about temporal anomalies.",
        choices: [
            { text: "Examine the main computer", nextScene: 1 },
            { text: "Look around for clues", nextScene: 2 }
        ]
    },
    {
        image: 'url_to_scene_2_image',
        text: "The computer displays a warning: 'Temporal rift detected. Initiate containment protocol?'",
        choices: [
            { text: "Initiate protocol", nextScene: 3 },
            { text: "Ignore and continue searching", nextScene: 4 }
        ]
    },
    // 添加更多场景...
];

// 初始化Arweave和AO客户端
async function init() {
    arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https'
    });
    aoClient = await aoConnect.createClient();
}

// 连接钱包功能
const walletButton = document.getElementById('wallet-button');
walletButton.addEventListener('click', connectWallet);

async function connectWallet() {
    if (typeof window.arweaveWallet === 'undefined') {
        alert('Please install the ArConnect wallet extension!');
        return;
    }

    try {
        await window.arweaveWallet.connect(['ACCESS_ADDRESS', 'SIGN_TRANSACTION']);
        walletAddress = await window.arweaveWallet.getActiveAddress();
        console.log('Connected wallet address:', walletAddress);
        walletButton.textContent = 'Connected';
        walletButton.disabled = true;
        
        // 加载游戏进度
        await loadGameProgress();
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet. Please try again!');
    }
}

function renderScene(sceneIndex) {
    const scene = chapter1Scenes[sceneIndex];
    document.getElementById('scene-image').style.backgroundImage = `url(${scene.image})`;
    document.getElementById('dialog-text').textContent = scene.text;
    
    const choicesDiv = document.getElementById('choices');
    choicesDiv.innerHTML = '';
    scene.choices.forEach(choice => {
        const button = document.createElement('button');
        button.textContent = choice.text;
        button.classList.add('choice-btn');
        button.onclick = () => makeChoice(choice.nextScene);
        choicesDiv.appendChild(button);
    });

    updateProgress();
}

function makeChoice(nextSceneIndex) {
    currentScene = nextSceneIndex;
    renderScene(currentScene);
    updateLocalState({ currentScene, gameState, chapterProgress });
    
    try {
        await saveProgressToAO({ currentScene, gameState, chapterProgress });
    } catch (error) {
        console.error('Failed to save progress:', error);
        // 考虑重试或通知用户
    }
}

function updateProgress() {
    chapterProgress = Math.floor((currentScene / (chapter1Scenes.length - 1)) * 100);
    document.getElementById('progress-value').textContent = chapterProgress;
}

async function saveGameProgress() {
    const progress = {
        currentScene,
        gameState,
        chapterProgress
    };
    await saveProgressToAO(progress);
}

async function loadGameProgress() {
    const progress = await loadProgressFromAO();
    if (progress) {
        localGameState = progress;
        currentScene = progress.currentScene;
        gameState = progress.gameState;
        chapterProgress = progress.chapterProgress;
        renderScene(currentScene);
    } else {
        renderScene(0);
    }
}

// AO 合约交互函数
async function saveProgressToAO(progress) {
    const startTime = Date.now();
    try {
        const result = await aoClient.send(AO_PROCESS_ID, {
            action: "save",
            data: JSON.stringify(progress)
        });
        const endTime = Date.now();
        console.log(`Save operation took ${endTime - startTime}ms`);
        return result;
    } catch (error) {
        console.error('Save failed:', error);
        throw error;
    }
}

async function loadProgressFromAO() {
    if (!walletAddress) {
        console.error('Wallet not connected');
        return;
    }

    try {
        const result = await aoClient.send(AO_PROCESS_ID, {
            action: "get"
        });
        if (result !== "No progress found") {
            const progress = JSON.parse(result);
            console.log('Loaded progress:', progress);
            return progress;
        } else {
            console.log('No saved progress found');
            return null;
        }
    } catch (error) {
        console.error('Failed to load progress:', error);
        return null;
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    init();
    renderScene(0);
});

let localGameState = null;
let updateQueue = [];

// 客户端缓存
async function getGameState() {
    if (!localGameState) {
        localGameState = await loadProgressFromAO();
    }
    return localGameState;
}

// 更新本地状态并异步保存
function updateLocalState(newState) {
    localGameState = newState;
    queueUpdate(newState);
}

// 批量更新
function queueUpdate(update) {
    updateQueue.push(update);
    if (updateQueue.length >= 10) {
        flushUpdates();
    }
}

async function flushUpdates() {
    const updates = updateQueue.splice(0);
    await saveProgressToAO(updates);
}

// 乐观更新
async function makeChoice(nextSceneIndex) {
    currentScene = nextSceneIndex;
    renderScene(currentScene);
    updateLocalState({ currentScene, gameState, chapterProgress });
    
    try {
        await saveProgressToAO({ currentScene, gameState, chapterProgress });
    } catch (error) {
        console.error('Failed to save progress:', error);
        // 考虑重试或通知用户
    }
}

// 性能监控
async function saveProgressToAO(progress) {
    const startTime = Date.now();
    try {
        const result = await aoClient.send(AO_PROCESS_ID, {
            action: "save",
            data: JSON.stringify(progress)
        });
        const endTime = Date.now();
        console.log(`Save operation took ${endTime - startTime}ms`);
        return result;
    } catch (error) {
        console.error('Save failed:', error);
        throw error;
    }
}

// 错误处理和重试机制
async function saveWithRetry(progress, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await saveProgressToAO(progress);
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}

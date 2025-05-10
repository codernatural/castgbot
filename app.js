// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние игры
// Новый баланс игры
let gameState = {
    crypto: 0.000000,
    miners: 0,
    power: 0,
    upgrades: [
        { id: 1, name: "CPU Майнер", price: 0.000010, power: 0.000001, owned: 0, limit: 10 },
        { id: 2, name: "GPU Риг", price: 0.000100, power: 0.000010, owned: 0, limit: 5 },
        { id: 3, name: "ASIC Устройство", price: 0.001000, power: 0.000100, owned: 0, limit: 3 },
        { id: 4, name: "Майнинг Ферма", price: 0.010000, power: 0.001000, owned: 0, limit: 1 }
    ],
    // Платные бусты
    boosts: [
        { id: 1, name: "x2 На 1 час", price: 0.000500, multiplier: 2, duration: 3600, active: false },
        { id: 2, name: "x5 На 4 часа", price: 0.002000, multiplier: 5, duration: 14400, active: false },
        { id: 3, name: "x10 На 12 часов", price: 0.005000, multiplier: 10, duration: 43200, active: false }
    ],
    // Премиум улучшения
    premium: {
        unlimitedLimits: false, // 0.01 ETH
        autoMiner: false       // 0.005 ETH
    },
    lastUpdate: Date.now()
};

// Модифицированная функция майнинга
function mineCrypto() {
    let mined = 0.000001;
    
    // Применяем активные бусты
    const activeBoost = gameState.boosts.find(b => b.active);
    if (activeBoost) {
        mined *= activeBoost.multiplier;
    }
    
    gameState.crypto += mined + (gameState.power / 1000000);
    updateUI();
}

// Новый магазин платных бустов
function createBoostShop() {
    const boostShop = document.getElementById('boost-shop');
    boostShop.innerHTML = '';
    
    gameState.boosts.forEach(boost => {
        const boostItem = document.createElement('div');
        boostItem.className = 'shop-item';
        boostItem.innerHTML = `
            <h4>${boost.name}</h4>
            <p>+${boost.multiplier}x к доходу</p>
            <p>Цена: ${boost.price.toFixed(6)} ETH</p>
            <button class="buy-btn" data-id="${boost.id}">
                ${boost.active ? 'АКТИВЕН' : 'КУПИТЬ'}
            </button>
        `;
        boostShop.appendChild(boostItem);
    });
}

// Покупка буста
function buyBoost(id) {
    const boost = gameState.boosts.find(b => b.id === id);
    if (!boost || boost.active) return;
    
    if (gameState.crypto >= boost.price) {
        gameState.crypto -= boost.price;
        boost.active = true;
        
        setTimeout(() => {
            boost.active = false;
            updateUI();
        }, boost.duration * 1000);
        
        updateUI();
        saveGame();
    } else {
        showPaymentModal(boost.price);
    }
}

// Модальное окно для покупки крипты за реальные деньги
function showPaymentModal(amount) {
    document.getElementById('payment-amount').textContent = amount.toFixed(6);
    document.getElementById('payment-modal').style.display = 'block';
}

// Премиум функции
function buyPremiumUpgrade(type) {
    const prices = {
        'unlimitedLimits': 0.010000,
        'autoMiner': 0.005000
    };
    
    if (confirm(`Купить "${type}" за ${prices[type].toFixed(6)} ETH?`)) {
        gameState.premium[type] = true;
        saveGame();
        updateUI();
    }
}

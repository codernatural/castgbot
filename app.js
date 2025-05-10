// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние игры
let gameState = {
    crypto: 0.000000,
    miners: 0,
    power: 0,
    lastClick: Date.now(),
    upgrades: [
        { id: 1, name: "CPU Майнер", price: 0.000010, power: 0.000001, owned: 0, limit: 10 },
        { id: 2, name: "GPU Риг", price: 0.000100, power: 0.000010, owned: 0, limit: 5 },
        { id: 3, name: "ASIC Устройство", price: 0.001000, power: 0.000100, owned: 0, limit: 3 },
        { id: 4, name: "Майнинг Ферма", price: 0.010000, power: 0.001000, owned: 0, limit: 1 }
    ],
    boosts: [
        { id: 1, name: "x2 На 1 час", price: 0.000500, multiplier: 2, duration: 3600, active: false, endTime: 0 },
        { id: 2, name: "x5 На 4 часа", price: 0.002000, multiplier: 5, duration: 14400, active: false, endTime: 0 },
        { id: 3, name: "x10 На 12 часов", price: 0.005000, multiplier: 10, duration: 43200, active: false, endTime: 0 }
    ],
    premium: {
        unlimitedLimits: false,
        autoMiner: false,
        purchased: false
    },
    referrals: [],
    referralEarnings: 0,
    lastUpdate: Date.now()
};

// DOM элементы
const elements = {
    cryptoDisplay: document.getElementById('crypto-display'),
    minersCount: document.getElementById('miners-count'),
    powerDisplay: document.getElementById('power'),
    userBalance: document.getElementById('user-balance'),
    userName: document.getElementById('user-name'),
    userAvatar: document.getElementById('user-avatar'),
    shopItems: document.getElementById('shop-items'),
    boostShop: document.getElementById('boost-shop'),
    mineBtn: document.getElementById('mine-btn'),
    referralModal: document.getElementById('referral-modal'),
    paymentModal: document.getElementById('payment-modal'),
    paymentAmount: document.getElementById('payment-amount')
};

// Загрузка сохранения
function loadGame() {
    const saved = localStorage.getItem('cryptoMinerSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        
        // Восстановление активных бустов
        parsed.boosts.forEach(boost => {
            if (boost.active && boost.endTime > Date.now()) {
                const remainingTime = boost.endTime - Date.now();
                setTimeout(() => {
                    boost.active = false;
                    updateUI();
                }, remainingTime);
            } else {
                boost.active = false;
            }
        });
        
        Object.assign(gameState, parsed);
        
        // Оффлайн доход
        if (gameState.premium.autoMiner) {
            const offlineTime = (Date.now() - gameState.lastUpdate) / 1000;
            const offlineEarnings = gameState.power * offlineTime * 0.3; // 30% от обычного дохода
            gameState.crypto += offlineEarnings;
        }
    }
}

// Сохранение игры
function saveGame() {
    gameState.lastUpdate = Date.now();
    localStorage.setItem('cryptoMinerSave', JSON.stringify(gameState));
}

// Форматирование чисел
function formatCrypto(value) {
    if (value >= 0.01) return value.toFixed(4);
    if (value >= 0.0001) return value.toFixed(6);
    return value.toFixed(8);
}

// Обновление интерфейса
function updateUI() {
    elements.cryptoDisplay.textContent = formatCrypto(gameState.crypto);
    elements.minersCount.textContent = gameState.miners;
    elements.powerDisplay.textContent = `${formatCrypto(gameState.power)}/сек`;
    elements.userBalance.textContent = `${formatCrypto(gameState.crypto)} ETH`;
    
    // Обновляем магазин
    updateShop();
    updateBoostShop();
    
    // Обновляем активные бусты
    gameState.boosts.forEach(boost => {
        if (boost.active && boost.endTime <= Date.now()) {
            boost.active = false;
        }
    });
    
    // Telegram данные пользователя
    if (tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        elements.userName.textContent = user.first_name || 'Майнер';
        if (user.photo_url) {
            elements.userAvatar.src = user.photo_url;
        }
    }
}

// Обновление магазина улучшений
function updateShop() {
    elements.shopItems.innerHTML = '';
    
    gameState.upgrades.forEach(upgrade => {
        const maxed = upgrade.owned >= upgrade.limit && !gameState.premium.unlimitedLimits;
        const canAfford = gameState.crypto >= upgrade.price;
        
        const item = document.createElement('div');
        item.className = `shop-item ${maxed ? 'maxed' : ''} ${canAfford ? 'affordable' : ''}`;
        item.innerHTML = `
            <div class="shop-item-info">
                <h4>${upgrade.name}</h4>
                <p>+${formatCrypto(upgrade.power)}/сек</p>
                <p>${upgrade.owned}/${gameState.premium.unlimitedLimits ? '∞' : upgrade.limit}</p>
            </div>
            <div class="shop-item-price">${formatCrypto(upgrade.price)} ETH</div>
            <button class="buy-btn" data-id="${upgrade.id}" ${maxed ? 'disabled' : ''}>
                ${maxed ? 'MAX' : 'Купить'}
            </button>
        `;
        elements.shopItems.appendChild(item);
    });
    
    // Обработчики кнопок покупки
    document.querySelectorAll('.shop-item .buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            buyUpgrade(id);
        });
    });
}

// Обновление магазина бустов
function updateBoostShop() {
    elements.boostShop.innerHTML = '';
    
    gameState.boosts.forEach(boost => {
        const active = boost.active && boost.endTime > Date.now();
        const canAfford = gameState.crypto >= boost.price;
        
        const item = document.createElement('div');
        item.className = `shop-item ${active ? 'active' : ''} ${canAfford ? 'affordable' : ''}`;
        item.innerHTML = `
            <div class="shop-item-info">
                <h4>${boost.name}</h4>
                <p>${boost.multiplier}x к доходу</p>
                ${active ? `<p>Осталось: ${Math.ceil((boost.endTime - Date.now()) / 1000 / 60)} мин</p>` : ''}
            </div>
            <div class="shop-item-price">${formatCrypto(boost.price)} ETH</div>
            <button class="buy-btn" data-id="${boost.id}" ${active ? 'disabled' : ''}>
                ${active ? 'Активен' : 'Купить'}
            </button>
        `;
        elements.boostShop.appendChild(item);
    });
    
    // Обработчики кнопок бустов
    document.querySelectorAll('.boost-section .buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            buyBoost(id);
        });
    });
}

// Покупка улучшения
function buyUpgrade(id) {
    const upgrade = gameState.upgrades.find(u => u.id === id);
    if (!upgrade) return;
    
    const maxed = upgrade.owned >= upgrade.limit && !gameState.premium.unlimitedLimits;
    if (maxed) return;
    
    if (gameState.crypto >= upgrade.price) {
        gameState.crypto -= upgrade.price;
        upgrade.owned += 1;
        gameState.miners += 1;
        gameState.power += upgrade.power;
        
        // Увеличиваем цену
        upgrade.price *= 1.15;
        
        updateUI();
        saveGame();
        
        // Анимация
        const btn = document.querySelector(`.shop-item .buy-btn[data-id="${id}"]`);
        btn.textContent = '✓';
        setTimeout(() => {
            btn.textContent = upgrade.owned >= upgrade.limit && !gameState.premium.unlimitedLimits ? 'MAX' : 'Купить';
        }, 500);
    } else {
        showPaymentModal(upgrade.price - gameState.crypto);
    }
}

// Покупка буста
function buyBoost(id) {
    const boost = gameState.boosts.find(b => b.id === id);
    if (!boost || (boost.active && boost.endTime > Date.now())) return;
    
    if (gameState.crypto >= boost.price) {
        gameState.crypto -= boost.price;
        boost.active = true;
        boost.endTime = Date.now() + (boost.duration * 1000);
        
        setTimeout(() => {
            boost.active = false;
            updateUI();
            saveGame();
        }, boost.duration * 1000);
        
        updateUI();
        saveGame();
    } else {
        showPaymentModal(boost.price - gameState.crypto);
    }
}

// Майнинг по клику
function setupMining() {
    elements.mineBtn.addEventListener('click', () => {
        gameState.lastClick = Date.now();
        let mined = 0.000001;
        
        // Применяем активные бусты
        const activeBoost = gameState.boosts.find(b => b.active && b.endTime > Date.now());
        if (activeBoost) {
            mined *= activeBoost.multiplier;
        }
        
        gameState.crypto += mined;
        updateUI();
        saveGame();
        
        // Анимация кнопки
        elements.mineBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            elements.mineBtn.style.transform = 'scale(1)';
        }, 100);
    });
}

// Пассивный доход
function setupPassiveIncome() {
    setInterval(() => {
        if (gameState.power > 0) {
            let earned = gameState.power / 10; // 10 раз в секунду
            
            // Бусты влияют на пассивный доход
            const activeBoost = gameState.boosts.find(b => b.active && b.endTime > Date.now());
            if (activeBoost) {
                earned *= activeBoost.multiplier;
            }
            
            gameState.crypto += earned;
            updateUI();
            saveGame();
        }
    }, 100);
}

// Реферальная система
function setupReferralSystem() {
    // Проверка реферальной ссылки
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    
    if (refId && refId !== tg.initDataUnsafe.user?.id?.toString()) {
        if (!gameState.referrals.includes(refId)) {
            gameState.referrals.push(refId);
            gameState.crypto += 0.000500; // Бонус за реферала
            saveGame();
            updateUI();
        }
    }
    
    // Кнопка рефералов
    document.getElementById('referral-btn').addEventListener('click', () => {
        document.getElementById('referral-link').value = 
            `https://t.me/${tg.initDataUnsafe.bot?.username}?startapp=ref${tg.initDataUnsafe.user?.id}`;
        document.getElementById('referrals-count').textContent = gameState.referrals.length;
        document.getElementById('referrals-earnings').textContent = formatCrypto(gameState.referralEarnings);
        elements.referralModal.style.display = 'block';
    });
    
    // Закрытие модальных окон
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// Платежная система
function setupPaymentSystem() {
    document.getElementById('buy-with-card').addEventListener('click', () => {
        alert('Перенаправляем на страницу оплаты...');
        // В реальном приложении: интеграция с платежным шлюзом
    });
    
    document.getElementById('buy-with-crypto').addEventListener('click', () => {
        alert('Кошелек для перевода: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    });
}

// Показать модальное окно платежа
function showPaymentModal(amount) {
    elements.paymentAmount.textContent = formatCrypto(amount);
    elements.paymentModal.style.display = 'block';
}

// Премиум функции
function buyPremiumUpgrade(type) {
    const prices = {
        unlimitedLimits: 0.010000,
        autoMiner: 0.005000
    };
    
    if (confirm(`Купить "${type}" за ${formatCrypto(prices[type])} ETH?`)) {
        gameState.premium[type] = true;
        gameState.premium.purchased = true;
        saveGame();
        updateUI();
    }
}

// Инициализация игры
function initGame() {
    loadGame();
    updateUI();
    setupMining();
    setupPassiveIncome();
    setupReferralSystem();
    setupPaymentSystem();
    
    // Telegram кнопки
    if (tg.platform !== 'unknown') {
        tg.MainButton.setText('Пригласить друзей').show();
        tg.MainButton.onClick(() => {
            tg.showAlert(`Приглашайте друзей и получайте 10% от их дохода!\nВаша ссылка: https://t.me/${tg.initDataUnsafe.bot?.username}?startapp=ref${tg.initDataUnsafe.user?.id}`);
        });
    }
}

// Запуск игры
document.addEventListener('DOMContentLoaded', initGame);

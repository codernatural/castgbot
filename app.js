// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние игры
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
    boosts: [
        { id: 1, name: "x2 На 1 час", price: 0.000500, multiplier: 2, duration: 3600, active: false, endTime: 0 },
        { id: 2, name: "x5 На 4 часа", price: 0.002000, multiplier: 5, duration: 14400, active: false, endTime: 0 },
        { id: 3, name: "x10 На 12 часов", price: 0.005000, multiplier: 10, duration: 43200, active: false, endTime: 0 }
    ],
    premium: {
        unlimitedLimits: false,
        autoMiner: false
    },
    referrals: [],
    referralEarnings: 0,
    lastUpdate: Date.now(),
    lastDailyBonus: null
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
    paymentAmount: document.getElementById('payment-amount'),
    referralsCount: document.getElementById('referrals-count'),
    referralsEarnings: document.getElementById('referrals-earnings'),
    referralLink: document.getElementById('referral-link'),
    dailyBonusBtn: document.getElementById('daily-bonus'),
    referralBtn: document.getElementById('referral-btn')
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
            const offlineEarnings = gameState.power * offlineTime * 0.3;
            gameState.crypto += offlineEarnings;
        }
    }
    updateUI();
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
    
    // Данные пользователя Telegram
    if (tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        elements.userName.textContent = user.first_name || user.username || 'Игрок';
        if (user.photo_url) {
            elements.userAvatar.src = user.photo_url;
        }
    }
    
    updateShop();
    updateBoostShop();
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
    
    // Обновляем обработчики
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
    
    // Обновляем обработчики
    document.querySelectorAll('.boosts-section .buy-btn').forEach(btn => {
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
        let mined = 0.000001;
        
        // Активный буст
        const activeBoost = gameState.boosts.find(b => b.active && b.endTime > Date.now());
        if (activeBoost) {
            mined *= activeBoost.multiplier;
        }
        
        gameState.crypto += mined;
        updateUI();
        saveGame();
        
        // Анимация
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
            let earned = gameState.power / 10;
            
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
            gameState.crypto += 0.000500;
            saveGame();
            updateUI();
        }
    }
    
    // Кнопка рефералов
    elements.referralBtn.addEventListener('click', () => {
        elements.referralLink.value = 
            `https://t.me/${tg.initDataUnsafe.bot?.username}?startapp=ref${tg.initDataUnsafe.user?.id}`;
        elements.referralsCount.textContent = gameState.referrals.length;
        elements.referralsEarnings.textContent = formatCrypto(gameState.referralEarnings);
        elements.referralModal.style.display = 'flex';
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

// Копирование реферальной ссылки
function copyReferralLink() {
    elements.referralLink.select();
    document.execCommand('copy');
    alert('Ссылка скопирована в буфер обмена!');
}

// Платежная система
function setupPaymentSystem() {
    document.getElementById('buy-with-card').addEventListener('click', () => {
        alert('Перенаправляем на страницу оплаты...');
    });
    
    document.getElementById('buy-with-crypto').addEventListener('click', () => {
        alert('Кошелек для перевода: 0x742d35Cc6634C0532925a3b844Bc454e4438f44e');
    });
}

// Показать модальное окно платежа
function showPaymentModal(amount) {
    elements.paymentAmount.textContent = formatCrypto(amount);
    elements.paymentModal.style.display = 'flex';
}

// Ежедневный бонус
function setupDailyBonus() {
    elements.dailyBonusBtn.addEventListener('click', () => {
        const now = new Date();
        const lastClaim = gameState.lastDailyBonus ? new Date(gameState.lastDailyBonus) : null;
        
        if (!lastClaim || now.toDateString() !== lastClaim.toDateString()) {
            const bonus = 0.000500 + (gameState.power * 0.000100);
            gameState.crypto += bonus;
            gameState.lastDailyBonus = now.toISOString();
            
            updateUI();
            saveGame();
            
            alert(`🎉 Вы получили ежедневный бонус: ${formatCrypto(bonus)} ETH!`);
        } else {
            const nextDay = new Date(lastClaim);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            
            const hoursLeft = Math.ceil((nextDay - now) / (1000 * 60 * 60));
            alert(`⏳ Вы уже получали бонус сегодня. Следующий бонус через ${hoursLeft} часов.`);
        }
    });
}

// Премиум функции
function buyPremiumUpgrade(type) {
    const prices = {
        unlimitedLimits: 0.010000,
        autoMiner: 0.005000
    };
    
    if (confirm(`Купить "${type}" за ${formatCrypto(prices[type])} ETH?`)) {
        if (gameState.crypto >= prices[type]) {
            gameState.crypto -= prices[type];
            gameState.premium[type] = true;
            saveGame();
            updateUI();
            alert('Покупка успешна!');
        } else {
            showPaymentModal(prices[type] - gameState.crypto);
        }
    }
}

// Инициализация игры
function initGame() {
    loadGame();
    setupMining();
    setupPassiveIncome();
    setupReferralSystem();
    setupPaymentSystem();
    setupDailyBonus();
    
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

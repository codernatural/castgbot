// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Состояние игры
let gameState = {
    crypto: 0,
    miners: 0,
    power: 0,
    upgrades: [
        { id: 1, name: "Базовый майнер", price: 10, power: 0.1, owned: 0 },
        { id: 2, name: "Процессор", price: 50, power: 0.5, owned: 0 },
        { id: 3, name: "Видеокарта", price: 200, power: 2, owned: 0 },
        { id: 4, name: "Майнинг-ферма", price: 1000, power: 10, owned: 0 },
        { id: 5, name: "Крипто-ферма", price: 5000, power: 50, owned: 0 }
    ],
    lastDailyBonus: null,
    referrals: [],
    referralEarnings: 0,
    lastUpdate: Date.now()
};

// Загрузка сохранения
function loadGame() {
    const saved = localStorage.getItem('cryptoMinerSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        // Проверяем, когда было последнее обновление
        const offlineTime = (Date.now() - parsed.lastUpdate) / 1000; // в секундах
        if (offlineTime > 10) { // Если прошло больше 10 секунд
            // Начисляем оффлайн-доход
            const offlineEarnings = parsed.power * offlineTime * 0.5; // 50% от обычного дохода
            parsed.crypto += offlineEarnings;
        }
        Object.assign(gameState, parsed);
    }
}

// Сохранение игры
function saveGame() {
    gameState.lastUpdate = Date.now();
    localStorage.setItem('cryptoMinerSave', JSON.stringify(gameState));
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('crypto-display').textContent = gameState.crypto.toFixed(2);
    document.getElementById('miners-count').textContent = gameState.miners;
    document.getElementById('power').textContent = `${gameState.power.toFixed(1)}/сек`;
    document.getElementById('user-balance').textContent = `${gameState.crypto.toFixed(2)} CRYPTO`;
    
    // Обновляем аватар и имя пользователя
    if (tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        document.getElementById('user-name').textContent = user.first_name || 'Игрок';
        if (user.photo_url) {
            document.getElementById('user-avatar').src = user.photo_url;
        }
    }
    
    // Обновляем магазин
    updateShop();
}

// Обновление магазина
function updateShop() {
    const shopContainer = document.getElementById('shop-items');
    shopContainer.innerHTML = '';
    
    gameState.upgrades.forEach(upgrade => {
        const item = document.createElement('div');
        item.className = 'shop-item';
        item.innerHTML = `
            <div class="shop-item-info">
                <div class="shop-item-name">${upgrade.name}</div>
                <div class="shop-item-desc">+${upgrade.power.toFixed(1)} мощности</div>
            </div>
            <div class="shop-item-price">${upgrade.price.toFixed(0)} CRYPTO</div>
            <button class="buy-btn" data-id="${upgrade.id}">Купить (${upgrade.owned})</button>
        `;
        shopContainer.appendChild(item);
    });
    
    // Добавляем обработчики кнопок покупки
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.getAttribute('data-id'));
            buyUpgrade(id);
        });
    });
}

// Покупка улучшения
function buyUpgrade(id) {
    const upgrade = gameState.upgrades.find(u => u.id === id);
    if (!upgrade) return;
    
    if (gameState.crypto >= upgrade.price) {
        gameState.crypto -= upgrade.price;
        upgrade.owned += 1;
        gameState.miners += 1;
        gameState.power += upgrade.power;
        
        // Увеличиваем цену для следующей покупки
        upgrade.price = Math.floor(upgrade.price * 1.15);
        
        updateUI();
        saveGame();
        
        // Визуальная обратная связь
        const btn = document.querySelector(`.buy-btn[data-id="${id}"]`);
        btn.textContent = `Купить (${upgrade.owned})`;
        btn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 200);
    } else {
        alert('Недостаточно CRYPTO!');
    }
}

// Майнинг по клику
function setupMining() {
    const mineBtn = document.getElementById('mine-btn');
    mineBtn.addEventListener('click', () => {
        gameState.crypto += 1 + (gameState.power * 0.1); // Базовый доход + 10% от мощности
        updateUI();
        saveGame();
        
        // Анимация кнопки
        mineBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            mineBtn.style.transform = 'scale(1)';
        }, 100);
    });
}

// Ежедневный бонус
function setupDailyBonus() {
    const dailyBtn = document.getElementById('daily-bonus');
    dailyBtn.addEventListener('click', () => {
        const now = new Date();
        const lastClaim = gameState.lastDailyBonus ? new Date(gameState.lastDailyBonus) : null;
        
        if (!lastClaim || now.getDate() !== lastClaim.getDate()) {
            const bonus = 100 + (gameState.power * 5); // Базовый бонус + 5x мощность
            gameState.crypto += bonus;
            gameState.lastDailyBonus = now.toISOString();
            
            updateUI();
            saveGame();
            
            alert(`🎉 Вы получили ежедневный бонус: ${bonus.toFixed(2)} CRYPTO!`);
        } else {
            const nextDay = new Date(lastClaim);
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0, 0, 0, 0);
            
            const hoursLeft = Math.floor((nextDay - now) / (1000 * 60 * 60));
            alert(`⏳ Вы уже получали бонус сегодня. Следующий бонус через ${hoursLeft} часов.`);
        }
    });
}

// Реферальная система
function setupReferralSystem() {
    const referralBtn = document.getElementById('referral-btn');
    const modal = document.getElementById('referral-modal');
    const closeBtn = document.querySelector('.close');
    
    // Проверяем реферальный параметр в URL
   

// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Данные пользователя
let userData = {
    id: tg.initDataUnsafe.user?.id || 0,
    name: tg.initDataUnsafe.user?.first_name || "Гость",
    avatar: tg.initDataUnsafe.user?.photo_url || "",
    balance: 1000,
    cases: {
        common: 3,
        rare: 1,
        epic: 0,
        legendary: 0
    }
};

// Типы кейсов
const caseTypes = {
    common: {
        name: "Обычный кейс",
        price: 50,
        emoji: "🎁",
        rewards: [
            { amount: 10, chance: 40 },
            { amount: 20, chance: 30 },
            { amount: 50, chance: 20 },
            { amount: 100, chance: 10 }
        ]
    },
    rare: {
        name: "Редкий кейс",
        price: 100,
        emoji: "🔮",
        rewards: [
            { amount: 50, chance: 30 },
            { amount: 100, chance: 25 },
            { amount: 200, chance: 20 },
            { amount: 500, chance: 15 },
            { amount: 1000, chance: 10 }
        ]
    },
    epic: {
        name: "Эпический кейс",
        price: 200,
        emoji: "💎",
        rewards: [
            { amount: 100, chance: 25 },
            { amount: 200, chance: 20 },
            { amount: 500, chance: 20 },
            { amount: 1000, chance: 15 },
            { amount: 2000, chance: 10 },
            { amount: 5000, chance: 10 }
        ]
    },
    legendary: {
        name: "Легендарный кейс",
        price: 500,
        emoji: "🏆",
        rewards: [
            { amount: 500, chance: 20 },
            { amount: 1000, chance: 20 },
            { amount: 2000, chance: 15 },
            { amount: 5000, chance: 15 },
            { amount: 10000, chance: 15 },
            { amount: 20000, chance: 10 },
            { amount: 50000, chance: 5 }
        ]
    }
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Заполняем профиль пользователя
    document.getElementById('user-name').textContent = userData.name;
    document.getElementById('user-balance').textContent = `Баланс: ${userData.balance} монет`;
    
    if (userData.avatar) {
        document.getElementById('user-avatar').src = userData.avatar;
    }

    // Заполняем кейсы пользователя
    renderUserCases();
    
    // Заполняем магазин
    renderShop();
    
    // Настройка модального окна
    setupModal();
});

// Отображение кейсов пользователя
function renderUserCases() {
    const container = document.getElementById('cases-container');
    container.innerHTML = '';
    
    for (const [type, count] of Object.entries(userData.cases)) {
        if (count > 0) {
            const caseInfo = caseTypes[type];
            const caseElement = document.createElement('div');
            caseElement.className = 'case-item';
            caseElement.innerHTML = `
                <h3>${caseInfo.emoji} ${caseInfo.name}</h3>
                <p>Количество: ${count}</p>
            `;
            caseElement.addEventListener('click', () => openCase(type));
            container.appendChild(caseElement);
        }
    }
    
    if (container.innerHTML === '') {
        container.innerHTML = '<p>У вас нет кейсов. Купите их в магазине!</p>';
    }
}

// Отображение магазина
function renderShop() {
    const container = document.getElementById('shop-container');
    container.innerHTML = '';
    
    for (const [type, caseInfo] of Object.entries(caseTypes)) {
        const shopItem = document.createElement('div');
        shopItem.className = 'shop-item';
        shopItem.innerHTML = `
            <h3>${caseInfo.emoji} ${caseInfo.name}</h3>
            <p>Цена: ${caseInfo.price} монет</p>
            <p>Награды: ${caseInfo.rewards.map(r => r.amount).join(', ')}</p>
            <button class="buy-button">Купить</button>
        `;
        
        shopItem.querySelector('.buy-button').addEventListener('click', (e) => {
            e.stopPropagation();
            buyCase(type);
        });
        
        container.appendChild(shopItem);
    }
}

// Настройка модального окна
function setupModal() {
    const modal = document.getElementById('case-modal');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Покупка кейса
function buyCase(type) {
    const caseInfo = caseTypes[type];
    
    if (userData.balance >= caseInfo.price) {
        userData.balance -= caseInfo.price;
        userData.cases[type] += 1;
        
        updateUI();
        alert(`Вы успешно купили ${caseInfo.name}!`);
    } else {
        alert('Недостаточно средств!');
    }
}

// Открытие кейса
function openCase(type) {
    if (userData.cases[type] <= 0) return;
    
    const modal = document.getElementById('case-modal');
    const animation = document.getElementById('case-animation');
    const result = document.getElementById('case-result');
    
    // Показываем модальное окно
    modal.style.display = 'block';
    result.innerHTML = '';
    
    // Уменьшаем количество кейсов
    userData.cases[type] -= 1;
    
    // Анимация
    const slots = animation.querySelectorAll('.slot-item');
    let spins = 0;
    const spinInterval = setInterval(() => {
        slots.forEach(slot => {
            const symbols = ['🎰', '🎲', '🎯', '🎳', '🎮', '💰', '💎'];
            slot.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        });
        
        spins++;
        if (spins > 10) {
            clearInterval(spinInterval);
            showCaseResult(type);
        }
    }, 100);
}

// Показ результата открытия кейса
function showCaseResult(type) {
    const caseInfo = caseTypes[type];
    const result = document.getElementById('case-result');
    
    // Вычисляем выигрыш
    const totalChance = caseInfo.rewards.reduce((sum, reward) => sum + reward.chance, 0);
    let random = Math.random() * totalChance;
    let winAmount = 0;
    
    for (const reward of caseInfo.rewards) {
        if (random <= reward.chance) {
            winAmount = reward.amount;
            break;
        }
        random -= reward.chance;
    }
    
    // Обновляем баланс
    userData.balance += winAmount;
    
    // Показываем результат
    result.innerHTML = `
        <h3>🎉 Поздравляем!</h3>
        <p>Вы выиграли <strong>${winAmount}</strong> монет!</p>
        <p>Ваш баланс: <strong>${userData.balance}</strong> монет</p>
    `;
    
    updateUI();
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('user-balance').textContent = `Баланс: ${userData.balance} монет`;
    renderUserCases();
}

// Обработка кнопки "Назад" в Telegram
tg.BackButton.onClick(() => {
    tg.close();
});
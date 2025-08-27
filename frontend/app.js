// ====================== 
// Версия 6.0 - Принудительные исправления для Telegram
// ======================

console.log('App.js версия 6.0 FORCE загружен:', new Date().toISOString());

// Принудительно устанавливаем белый фон СРАЗУ
document.body.style.cssText = 'background-color: #FFFFFF !important; background: #FFFFFF !important;';
document.documentElement.style.cssText = 'background-color: #FFFFFF !important;';

// ====================== 
// Глобальные переменные
// ======================

let catalogData = null;
let filteredProducts = [];
let currentBrand = null;
let currentPage = 1;
const itemsPerPage = 12;
let searchTimeout = null;

// ====================== 
// Инициализация Telegram Web App
// ======================

function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        try {
            tg.ready();
            tg.expand();
            
            // Устанавливаем цвета
            if (tg.setHeaderColor) {
                tg.setHeaderColor('#5E72E4');
            }
            if (tg.setBackgroundColor) {
                tg.setBackgroundColor('#FFFFFF');
            }
            
            console.log('Telegram WebApp инициализирован');
            return tg;
        } catch (e) {
            console.error('Ошибка инициализации Telegram WebApp:', e);
        }
    }
    return null;
}

// Вызываем инициализацию
const tg = initTelegramWebApp();

function setupTelegramTheme() {
    console.log('Настройка темы для Telegram...');
    
    // Принудительно белая тема
    document.documentElement.style.setProperty('--tg-theme-bg-color', '#FFFFFF');
    document.documentElement.style.setProperty('--tg-theme-text-color', '#2C3E50');
    document.documentElement.style.setProperty('--tg-theme-hint-color', '#6C757D');
    document.documentElement.style.setProperty('--tg-theme-link-color', '#5E72E4');
    document.documentElement.style.setProperty('--tg-theme-button-color', '#5E72E4');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', '#F5F7FA');
    
    // Еще раз принудительно
    document.body.style.backgroundColor = '#FFFFFF';
    document.body.style.background = '#FFFFFF';
    
    if (tg) {
        console.log('Telegram WebApp обнаружен');
        tg.ready();
        tg.expand();
        
        // Переопределяем цвета Telegram
        if (tg.backgroundColor) tg.backgroundColor = '#FFFFFF';
        if (tg.headerColor) tg.headerColor = '#5E72E4';
    }
    
    // Принудительно показываем текст чекбокса
    setTimeout(() => {
        const checkboxText = document.querySelector('.tg-checkbox-text');
        if (checkboxText) {
            checkboxText.style.cssText = 'display: inline-block !important; visibility: visible !important; opacity: 1 !important; color: #2C3E50 !important;';
            console.log('Текст чекбокса принудительно показан');
        }
    }, 100);
}

// ====================== 
// Форматирование цены
// ======================

function formatPrice(price) {
    const numPrice = parseFloat(price) || 0;
    return numPrice.toFixed(2).replace('.', ',');
}

// ====================== 
// Загрузка данных
// ======================

async function loadCatalog() {
    showLoader(true);
    
    try {
        console.log('Начинаем загрузку каталога...');
        
        // Определяем базовый путь
        const baseUrl = window.location.href.replace(/[^\/]*$/, '');
        
        // Пробуем абсолютный путь
        const absoluteUrl = baseUrl + 'catalog.json?v=' + Date.now();
        
        const response = await fetch(absoluteUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        catalogData = await response.json();
        console.log('Успешно загружено:', catalogData.items.length, 'товаров');
        
        processCatalogData();
        initializeUI();
        filteredProducts = [...catalogData.items];
        displayProducts();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showError(`Ошибка загрузки: ${error.message}`);
        
        // Повтор через 2 секунды
        setTimeout(() => {
            if (!catalogData) {
                console.log('Повторная попытка загрузки...');
                loadCatalog();
            }
        }, 2000);
    } finally {
        showLoader(false);
    }
}

// ====================== 
// Обработка данных
// ======================

function processCatalogData() {
    catalogData.items = catalogData.items.map(item => {
        const price = parseFloat(item['Цена']) || 0;
        
        let brand = item['Бренд'];
        if (!brand || brand === 'None') {
            const brandMatch = item['Наименование'].match(/^(iPhone|iPad|Samsung|Xiaomi|Huawei|OnePlus|Apple|Google|Sony|LG|Nokia|Motorola|Realme|Oppo|Vivo)/i);
            brand = brandMatch ? brandMatch[1] : 'Не указан';
        }
        
        return {
            ...item,
            'Бренд': brand,
            price: price,
            formattedPrice: formatPrice(price),
            searchText: `${brand} ${item['Наименование']}`.toLowerCase()
        };
    });
    
    updateStats();
}

// ====================== 
// Инициализация UI
// ======================

function initializeUI() {
    createBrandFilters();
    setupEventListeners();
    
    // Принудительные стили
    document.body.style.backgroundColor = '#FFFFFF';
    
    // Проверяем чекбокс
    const checkboxContainer = document.querySelector('.tg-checkbox-container');
    if (checkboxContainer) {
        checkboxContainer.style.display = 'inline-flex';
    }
    
    const checkboxText = document.querySelector('.tg-checkbox-text');
    if (checkboxText) {
        checkboxText.style.cssText = 'display: inline-block !important; visibility: visible !important; opacity: 1 !important;';
    }
}

// ====================== 
// Создание фильтров
// ======================

function createBrandFilters() {
    const brandsContainer = document.getElementById('brandsContainer');
    const brandsMap = new Map();
    
    catalogData.items.forEach(item => {
        const brand = item['Бренд'];
        if (brand && brand !== 'None' && brand !== 'Не указан') {
            brandsMap.set(brand, (brandsMap.get(brand) || 0) + 1);
        }
    });
    
    brandsContainer.innerHTML = '';
    
    Array.from(brandsMap.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([brand, count]) => {
            const chip = document.createElement('div');
            chip.className = 'brand-chip';
            chip.style.cssText = 'background: #F5F7FA !important; color: #374151 !important;';
            chip.innerHTML = `
                <span>${brand}</span>
                <span class="brand-count">${count}</span>
            `;
            chip.addEventListener('click', () => selectBrand(brand, chip));
            brandsContainer.appendChild(chip);
        });
}

// ====================== 
// Обработчики событий
// ======================

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterProducts, 300);
    });
    
    const inStockCheckbox = document.getElementById('inStockOnly');
    inStockCheckbox.addEventListener('change', filterProducts);
    
    // Отладка чекбокса
    inStockCheckbox.addEventListener('click', function() {
        console.log('Чекбокс нажат:', this.checked);
    });
    
    document.getElementById('clearFilter').addEventListener('click', clearFilters);
    document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('contactManagerBtn').addEventListener('click', contactManager);
    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target.id === 'productModal') closeModal();
    });
}

// ====================== 
// Выбор бренда
// ======================

function selectBrand(brand, chipElement) {
    document.querySelectorAll('.brand-chip').forEach(chip => {
        chip.classList.remove('active');
        chip.style.background = '#F5F7FA';
        chip.style.color = '#374151';
    });
    
    if (currentBrand === brand) {
        currentBrand = null;
    } else {
        currentBrand = brand;
        chipElement.classList.add('active');
        chipElement.style.cssText = 'background: #5E72E4 !important; color: white !important;';
    }
    
    filterProducts();
}

// ====================== 
// Фильтрация
// ======================

function filterProducts() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const inStockOnly = document.getElementById('inStockOnly').checked;
    
    filteredProducts = catalogData.items.filter(item => {
        const matchesSearch = !searchQuery || item.searchText.includes(searchQuery);
        const matchesBrand = !currentBrand || item['Бренд'] === currentBrand;
        const matchesStock = !inStockOnly || item['Остаток'] > 0;
        return matchesSearch && matchesBrand && matchesStock;
    });
    
    currentPage = 1;
    displayProducts();
}

// ====================== 
// Отображение товаров
// ======================

function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.add('visible');
        loadMoreContainer.classList.remove('visible');
        updateResultsCount(0);
        return;
    }
    
    emptyState.classList.remove('visible');
    
    const endIndex = currentPage * itemsPerPage;
    const productsToShow = filteredProducts.slice(0, endIndex);
    
    if (currentPage === 1) {
        grid.innerHTML = '';
    }
    
    productsToShow.forEach((product, index) => {
        if (index >= (currentPage - 1) * itemsPerPage) {
            grid.appendChild(createProductCard(product));
        }
    });
    
    updateResultsCount(productsToShow.length);
    
    if (endIndex < filteredProducts.length) {
        loadMoreContainer.classList.add('visible');
        document.getElementById('loadMoreBtn').textContent = 
            `Показать еще (${filteredProducts.length - endIndex})`;
    } else {
        loadMoreContainer.classList.remove('visible');
    }
}

// ====================== 
// Создание карточки товара - НОВЫЕ КЛАССЫ
// ======================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'tg-product-card'; // Используем новый класс
    
    const hasImage = product['Фото'] && product['Фото'] !== 'None';
    const inStock = product['Остаток'] > 0;
    const stockText = inStock ? `В наличии: ${product['Остаток']} шт` : 'Нет в наличии';
    
    // Создаем обертку для изображения
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'tg-product-image-wrapper';
    imageWrapper.style.cssText = 'height: 160px !important; min-height: 160px !important; max-height: 160px !important; flex: 0 0 160px !important;';
    
    if (hasImage) {
        imageWrapper.innerHTML = `
            <img class="tg-product-image" src="${product['Фото']}" alt="${product['Наименование']}" 
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                 style="width: 100%; height: 100%; object-fit: contain;">
            <div class="tg-no-image" style="display:none;">
                <span>📷</span>
                <p>Нет фото</p>
            </div>
        `;
    } else {
        imageWrapper.innerHTML = `
            <div class="tg-no-image">
                <span>📷</span>
                <p>Нет фото</p>
            </div>
        `;
    }
    
    // Создаем блок с информацией
    const infoDiv = document.createElement('div');
    infoDiv.className = 'tg-product-info';
    infoDiv.style.cssText = 'padding: 12px !important; background: white !important;';
    
    // Бренд
    const brandDiv = document.createElement('div');
    brandDiv.className = 'tg-product-brand';
    brandDiv.textContent = product['Бренд'];
    brandDiv.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; color: #6C757D !important;';
    
    // Название
    const nameDiv = document.createElement('div');
    nameDiv.className = 'tg-product-name';
    nameDiv.textContent = product['Наименование'];
    nameDiv.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; color: #2C3E50 !important; font-weight: 500 !important;';
    
    // Наличие
    const stockDiv = document.createElement('div');
    stockDiv.className = `tg-product-stock ${inStock ? 'in-stock' : 'out-of-stock'}`;
    stockDiv.textContent = stockText;
    stockDiv.style.cssText = `color: ${inStock ? '#2DCE89' : '#F5365C'} !important;`;
    
    // Футер с ценой
    const footerDiv = document.createElement('div');
    footerDiv.className = 'tg-product-footer';
    footerDiv.style.cssText = 'padding-top: 8px; border-top: 1px solid #E5E7EB; margin-top: auto;';
    
    const priceDiv = document.createElement('div');
    priceDiv.className = 'tg-product-price';
    priceDiv.textContent = `${product.formattedPrice} ₽`;
    priceDiv.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; color: #2C3E50 !important; font-size: 18px !important; font-weight: 600 !important;';
    
    footerDiv.appendChild(priceDiv);
    
    // Собираем информационный блок
    infoDiv.appendChild(brandDiv);
    infoDiv.appendChild(nameDiv);
    infoDiv.appendChild(stockDiv);
    infoDiv.appendChild(footerDiv);
    
    // Собираем карточку
    card.appendChild(imageWrapper);
    card.appendChild(infoDiv);
    
    // Обработчик клика
    card.addEventListener('click', () => showProductDetails(product));
    
    return card;
}

// ====================== 
// Детали товара - УСИЛЕННОЕ ОТОБРАЖЕНИЕ
// ======================

function showProductDetails(product) {
    console.log('Открываем товар:', product['Наименование']);
    
    const modal = document.getElementById('productModal');
    const hasImage = product['Фото'] && product['Фото'] !== 'None';
    const inStock = product['Остаток'] > 0;
    
    // Заголовок - принудительное отображение
    const modalTitle = document.getElementById('modalTitle');
    modalTitle.textContent = product['Наименование'];
    modalTitle.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; color: #2C3E50 !important;';
    
    // Бренд - принудительное отображение
    const modalBrand = document.getElementById('modalBrand');
    modalBrand.textContent = product['Бренд'];
    modalBrand.style.cssText = 'display: inline-block !important; visibility: visible !important; opacity: 1 !important; color: #2C3E50 !important;';
    
    // Цена - принудительное отображение
    const modalPrice = document.getElementById('modalPrice');
    modalPrice.innerHTML = `${product.formattedPrice} ₽`;
    modalPrice.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
    
    // Наличие
    const stockElement = document.getElementById('modalStock');
    stockElement.textContent = inStock ? `В наличии: ${product['Остаток']} шт` : 'Нет в наличии';
    stockElement.className = `stock-badge ${inStock ? 'in-stock' : 'out-of-stock'}`;
    
    // Изображение
    const modalImageWrapper = document.getElementById('modalImageWrapper');
    if (hasImage) {
        modalImageWrapper.innerHTML = `
            <img src="${product['Фото']}" alt="${product['Наименование']}" 
                 style="width: 100%; height: 100%; object-fit: contain;"
                 onerror="this.parentElement.innerHTML='<div class=\\'no-image\\'><span>📷</span><p>Нет фото</p></div>'">
        `;
        modalImageWrapper.className = 'modal-image-container with-image';
    } else {
        modalImageWrapper.innerHTML = '<div class="no-image"><span>📷</span><p>Нет фото</p></div>';
        modalImageWrapper.className = 'modal-image-container no-image-container';
    }
    
    // Описание
    const descriptionElement = document.getElementById('modalDescription');
    if (product['Описание'] && product['Описание'] !== 'None' && product['Описание'].trim()) {
        descriptionElement.innerHTML = `<h4>Описание товара:</h4><p>${product['Описание']}</p>`;
        descriptionElement.style.display = 'block';
    } else {
        descriptionElement.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// ====================== 
// Вспомогательные функции
// ======================

function closeModal() {
    document.getElementById('productModal').classList.remove('active');
    document.body.style.overflow = '';
}

function contactManager() {
    const managerLink = 'https://t.me/Ssfrp';
    
    // Проверяем наличие Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        // Используем правильный метод для открытия ссылки
        if (tg.openTelegramLink) {
            tg.openTelegramLink(managerLink);
        } else if (tg.openLink) {
            tg.openLink(managerLink);
        } else {
            // Fallback для старых версий - прямой переход
            window.location.href = managerLink;
        }
    } else {
        // Для обычных браузеров - открываем в том же окне
        window.location.href = managerLink;
    }
}

function loadMore() {
    currentPage++;
    displayProducts();
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('inStockOnly').checked = false;
    currentBrand = null;
    
    document.querySelectorAll('.brand-chip').forEach(chip => {
        chip.classList.remove('active');
        chip.style.background = '#F5F7FA';
        chip.style.color = '#374151';
    });
    
    filterProducts();
}

function updateStats() {
    const totalItems = catalogData.items.length;
    const inStock = catalogData.items.filter(item => item['Остаток'] > 0).length;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('inStock').textContent = inStock;
}

function updateResultsCount(count) {
    document.getElementById('resultsCount').textContent = 
        `Показано: ${count} из ${filteredProducts.length} товаров`;
}

function showLoader(show) {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.toggle('active', show);
    }
}

function showError(message) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white;">
            <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
            <h3 style="margin-bottom: 10px; color: #2C3E50;">Ошибка загрузки</h3>
            <p style="color: #6C757D;">${message}</p>
        </div>
    `;
}

// ====================== 
// ЗАПУСК
// ======================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запускаем v6...');
    
    // Принудительно белый фон
    document.body.style.backgroundColor = '#FFFFFF';
    
    setupTelegramTheme();
    loadCatalog();
    
    // Проверяем и исправляем стили каждые 500мс
    setInterval(() => {
        // Проверяем фон
        if (document.body.style.backgroundColor !== 'rgb(255, 255, 255)' && 
            document.body.style.backgroundColor !== '#FFFFFF') {
            console.log('Исправляем фон...');
            document.body.style.backgroundColor = '#FFFFFF';
        }
        
        // Проверяем видимость текста чекбокса
        const checkboxText = document.querySelector('.tg-checkbox-text');
        if (checkboxText && checkboxText.style.display === 'none') {
            checkboxText.style.display = 'inline-block';
            checkboxText.style.visibility = 'visible';
            checkboxText.style.opacity = '1';
        }
        
        // Проверяем видимость названий и цен в карточках
        document.querySelectorAll('.tg-product-name').forEach(el => {
            if (el && (!el.style.display || el.style.display === 'none')) {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            }
        });
        
        document.querySelectorAll('.tg-product-price').forEach(el => {
            if (el && (!el.style.display || el.style.display === 'none')) {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            }
        });
        
        // Проверяем модальное окно если оно открыто
        const modal = document.getElementById('productModal');
        if (modal && modal.classList.contains('active')) {
            const modalTitle = document.getElementById('modalTitle');
            const modalBrand = document.getElementById('modalBrand');
            
            if (modalTitle && (!modalTitle.style.display || modalTitle.style.display === 'none')) {
                modalTitle.style.display = 'block';
                modalTitle.style.visibility = 'visible';
                modalTitle.style.opacity = '1';
            }
            
            if (modalBrand && (!modalBrand.style.display || modalBrand.style.display === 'none')) {
                modalBrand.style.display = 'inline-block';
                modalBrand.style.visibility = 'visible';
                modalBrand.style.opacity = '1';
            }
        }
    }, 500);
});
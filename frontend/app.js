// ====================== 
// Версия и отладка
// ======================

console.log('App.js версия 4.0 загружен:', new Date().toISOString());
console.log('Исправления: наложение текста, светлый фон, светлые бренды');

// ====================== 
// Глобальные переменные
// ======================

let catalogData = null;
let filteredProducts = [];
let currentCategory = null;
let currentBrand = null;
let currentPage = 1;
const itemsPerPage = 8;
let searchTimeout = null;

// ====================== 
// Инициализация Telegram Web App
// ======================

const tg = window.Telegram ? window.Telegram.WebApp : null;

// Настройка темы Telegram
function setupTelegramTheme() {
    if (!tg) {
        console.log('Telegram WebApp не обнаружен, работаем в браузере');
        // Устанавливаем светлую тему по умолчанию
        document.documentElement.style.setProperty('--tg-theme-bg-color', '#FFFFFF');
        document.documentElement.style.setProperty('--tg-theme-text-color', '#2C3E50');
        document.documentElement.style.setProperty('--tg-theme-hint-color', '#6C757D');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', '#F5F7FA');
        return;
    }
    
    console.log('Telegram WebApp инициализирован');
    tg.ready();
    tg.expand();
    
    // Применяем светлую тему независимо от настроек Telegram
    document.documentElement.style.setProperty('--tg-theme-bg-color', '#FFFFFF');
    document.documentElement.style.setProperty('--tg-theme-text-color', '#2C3E50');
    document.documentElement.style.setProperty('--tg-theme-hint-color', '#6C757D');
    document.documentElement.style.setProperty('--tg-theme-link-color', '#5E72E4');
    document.documentElement.style.setProperty('--tg-theme-button-color', '#5E72E4');
    document.documentElement.style.setProperty('--tg-theme-button-text-color', '#ffffff');
    document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', '#F5F7FA');
    
    // Устанавливаем светлый фон для body
    document.body.style.backgroundColor = '#FFFFFF';
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
        
        const response = await fetch('catalog.json');
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки каталога: ' + response.status);
        }
        
        catalogData = await response.json();
        console.log('Каталог загружен, товаров:', catalogData.items ? catalogData.items.length : 0);
        
        processCatalogData();
        initializeUI();
        
        filteredProducts = [...catalogData.items];
        displayProducts();
        
    } catch (error) {
        console.error('Ошибка загрузки каталога:', error);
        showError('Не удалось загрузить каталог. Попробуйте позже.');
    } finally {
        showLoader(false);
    }
}

// ====================== 
// Обработка данных каталога
// ======================

function processCatalogData() {
    catalogData.items = catalogData.items.map(item => {
        const modelMatch = item['Наименование'].match(/для\s+([^с]+?)(?:\s+с\s+|\s+модуль|\s+плата|$)/i);
        const phoneModel = modelMatch ? modelMatch[1].trim() : '';
        
        const price = parseFloat(item['Цена']) || 0;
        
        let brand = item['Бренд'];
        if (!brand || brand === 'None') {
            const brandMatch = item['Наименование'].match(/^(iPhone|iPad|Samsung|Xiaomi|Huawei|OnePlus|Apple|Google|Sony|LG|Nokia|Motorola|Realme|Oppo|Vivo)/i);
            brand = brandMatch ? brandMatch[1] : 'Не указан';
        }
        
        return {
            ...item,
            'Бренд': brand,
            phoneModel: phoneModel,
            price: price,
            formattedPrice: formatPrice(price),
            searchText: `${brand} ${item['Наименование']} ${phoneModel}`.toLowerCase()
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
    
    // Принудительно устанавливаем светлый фон
    document.body.style.backgroundColor = '#FFFFFF';
    
    const checkboxText = document.querySelector('.checkbox-text');
    if (checkboxText) {
        checkboxText.style.display = 'inline-block';
        checkboxText.style.visibility = 'visible';
        console.log('Текст чекбокса принудительно сделан видимым');
    }
}

// ====================== 
// Создание фильтров по брендам
// ======================

function createBrandFilters() {
    const brandsContainer = document.getElementById('brandsContainer');
    
    const brandsMap = new Map();
    
    catalogData.items.forEach(item => {
        const brand = item['Бренд'];
        if (brand && brand !== 'None' && brand !== 'Не указан') {
            if (!brandsMap.has(brand)) {
                brandsMap.set(brand, 0);
            }
            brandsMap.set(brand, brandsMap.get(brand) + 1);
        }
    });
    
    brandsContainer.innerHTML = '';
    
    const sortedBrands = Array.from(brandsMap.entries()).sort((a, b) => b[1] - a[1]);
    
    sortedBrands.forEach(([brand, count]) => {
        const chip = document.createElement('div');
        chip.className = 'brand-chip';
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
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterProducts();
        }, 300);
    });
    
    const inStockCheckbox = document.getElementById('inStockOnly');
    inStockCheckbox.addEventListener('change', filterProducts);
    
    inStockCheckbox.addEventListener('click', function() {
        console.log('Чекбокс нажат, состояние:', this.checked);
    });
    
    document.getElementById('clearFilter').addEventListener('click', clearFilters);
    document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
    
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
    document.getElementById('productModal').addEventListener('click', (e) => {
        if (e.target.id === 'productModal') {
            closeModal();
        }
    });
}

// ====================== 
// Выбор бренда
// ======================

function selectBrand(brand, chipElement) {
    document.querySelectorAll('.brand-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    if (currentBrand === brand) {
        currentBrand = null;
    } else {
        currentBrand = brand;
        chipElement.classList.add('active');
    }
    
    filterProducts();
}

// ====================== 
// Фильтрация товаров
// ======================

function filterProducts() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const inStockOnly = document.getElementById('inStockOnly').checked;
    
    console.log('Фильтрация: поиск =', searchQuery, ', только в наличии =', inStockOnly, ', бренд =', currentBrand);
    
    filteredProducts = catalogData.items.filter(item => {
        const matchesSearch = !searchQuery || item.searchText.includes(searchQuery);
        const matchesBrand = !currentBrand || item['Бренд'] === currentBrand;
        const matchesStock = !inStockOnly || item['Остаток'] > 0;
        
        return matchesSearch && matchesBrand && matchesStock;
    });
    
    console.log('После фильтрации найдено товаров:', filteredProducts.length);
    
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
    
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    if (currentPage === 1) {
        grid.innerHTML = '';
    }
    
    productsToShow.forEach((product, index) => {
        if (index >= (currentPage - 1) * itemsPerPage) {
            const card = createProductCard(product);
            grid.appendChild(card);
        }
    });
    
    updateResultsCount(productsToShow.length);
    
    if (endIndex < filteredProducts.length) {
        loadMoreContainer.classList.add('visible');
        const remainingItems = filteredProducts.length - endIndex;
        document.getElementById('loadMoreBtn').textContent = `Показать еще (${remainingItems})`;
    } else {
        loadMoreContainer.classList.remove('visible');
    }
}

// ====================== 
// Создание карточки товара - ИСПРАВЛЕНО НАЛОЖЕНИЕ
// ======================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const hasImage = product['Фото'] && product['Фото'] !== 'None';
    const inStock = product['Остаток'] > 0;
    const stockText = inStock ? `В наличии: ${product['Остаток']} шт` : 'Нет в наличии';
    
    // Создаем структуру с фиксированными размерами для изображения
    const imageHTML = hasImage ? 
        `<div class="product-image-wrapper" style="flex: 0 0 160px; height: 160px; min-height: 160px; max-height: 160px;">
            <img class="product-image" src="${product['Фото']}" alt="${product['Наименование']}" 
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="no-image" style="display:none;">
                <span>📷</span>
                <p>Нет фото</p>
            </div>
         </div>` :
        `<div class="product-image-wrapper" style="flex: 0 0 160px; height: 160px; min-height: 160px; max-height: 160px;">
            <div class="no-image">
                <span>📷</span>
                <p>Нет фото</p>
            </div>
        </div>`;
    
    card.innerHTML = `
        ${imageHTML}
        <div class="product-info" style="background: white; position: relative; z-index: 10;">
            <div class="product-brand" style="display: block !important; margin-top: 0;">${product['Бренд']}</div>
            <div class="product-name" style="display: block !important; visibility: visible !important; margin-top: 0;">${product['Наименование']}</div>
            <div class="product-stock ${inStock ? 'in-stock' : 'out-of-stock'}">
                ${stockText}
            </div>
            <div class="product-footer">
                <div class="product-price" style="display: block !important; visibility: visible !important;">${product.formattedPrice} ₽</div>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => showProductDetails(product));
    
    return card;
}

// ====================== 
// Показ деталей товара
// ======================

function showProductDetails(product) {
    console.log('Открываем модальное окно для:', product['Наименование']);
    
    const modal = document.getElementById('productModal');
    const hasImage = product['Фото'] && product['Фото'] !== 'None';
    const inStock = product['Остаток'] > 0;
    
    const modalTitle = document.getElementById('modalTitle');
    const modalBrand = document.getElementById('modalBrand');
    const modalPrice = document.getElementById('modalPrice');
    
    modalTitle.textContent = product['Наименование'];
    modalTitle.style.display = 'block';
    modalTitle.style.visibility = 'visible';
    
    modalBrand.textContent = product['Бренд'];
    modalBrand.style.display = 'inline-block';
    modalBrand.style.visibility = 'visible';
    
    modalPrice.innerHTML = `${product.formattedPrice} ₽`;
    modalPrice.style.display = 'block';
    modalPrice.style.visibility = 'visible';
    
    const stockElement = document.getElementById('modalStock');
    stockElement.textContent = inStock ? `В наличии: ${product['Остаток']} шт` : 'Нет в наличии';
    stockElement.className = `stock-badge ${inStock ? 'in-stock' : 'out-of-stock'}`;
    
    const modalImageWrapper = document.getElementById('modalImageWrapper');
    
    if (hasImage) {
        modalImageWrapper.innerHTML = `
            <img id="modalImage" src="${product['Фото']}" alt="${product['Наименование']}" 
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="no-image" id="modalNoImage" style="display:none;">
                <span>📷</span>
                <p>Нет фото</p>
            </div>
        `;
    } else {
        modalImageWrapper.innerHTML = `
            <div class="no-image" id="modalNoImage">
                <span>📷</span>
                <p>Нет фото</p>
            </div>
        `;
    }
    
    const descriptionElement = document.getElementById('modalDescription');
    if (product['Описание'] && product['Описание'] !== 'None') {
        descriptionElement.innerHTML = `<h4>Описание:</h4><p>${product['Описание']}</p>`;
        descriptionElement.style.display = 'block';
    } else {
        descriptionElement.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    console.log('Модальное окно открыто');
}

// ====================== 
// Закрытие модального окна
// ======================

function closeModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ====================== 
// Загрузить еще
// ======================

function loadMore() {
    currentPage++;
    displayProducts();
}

// ====================== 
// Сброс фильтров
// ======================

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('inStockOnly').checked = false;
    currentBrand = null;
    
    document.querySelectorAll('.brand-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    filterProducts();
}

// ====================== 
// Обновление статистики
// ======================

function updateStats() {
    const totalItems = catalogData.items.length;
    const inStock = catalogData.items.filter(item => item['Остаток'] > 0).length;
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('inStock').textContent = inStock;
}

// ====================== 
// Обновление счетчика результатов
// ======================

function updateResultsCount(count) {
    const totalFiltered = filteredProducts.length;
    document.getElementById('resultsCount').textContent = 
        `Показано: ${count} из ${totalFiltered} товаров`;
}

// ====================== 
// Показ/скрытие загрузчика
// ======================

function showLoader(show) {
    const loader = document.getElementById('loader');
    if (show) {
        loader.classList.add('active');
    } else {
        loader.classList.remove('active');
    }
}

// ====================== 
// Показ ошибки
// ======================

function showError(message) {
    const grid = document.getElementById('productsGrid');
    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
            <h3 style="margin-bottom: 10px;">Ошибка загрузки</h3>
            <p style="color: var(--tg-theme-hint-color);">${message}</p>
        </div>
    `;
}

// ====================== 
// Запуск приложения
// ======================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запускаем приложение');
    
    // Настраиваем тему Telegram (всегда светлую)
    setupTelegramTheme();
    
    // Загружаем каталог
    loadCatalog();
});
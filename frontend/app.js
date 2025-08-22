// ====================== 
// Глобальные переменные
// ======================

let catalogData = null;
let filteredProducts = [];
let currentCategory = null;
let currentBrand = null;
let currentPage = 1;
const itemsPerPage = 8; // Изменено на 8 товаров
let searchTimeout = null;

// ====================== 
// Инициализация Telegram Web App
// ======================

const tg = window.Telegram ? window.Telegram.WebApp : null;

// Настройка темы Telegram
function setupTelegramTheme() {
    if (!tg) return;
    
    tg.ready();
    tg.expand();
    
    // Применяем цвета темы Telegram с мягкой палитрой
    const theme = tg.themeParams;
    if (theme) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#F8F9FA');
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#2C3E50');
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#6C757D');
        document.documentElement.style.setProperty('--tg-theme-link-color', theme.link_color || '#5E72E4');
        document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#5E72E4');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#F0F2F5');
    }
}

// ====================== 
// Форматирование цены
// ======================

function formatPrice(price) {
    // Преобразуем в число и форматируем с 2 знаками после запятой
    const numPrice = parseFloat(price) || 0;
    return numPrice.toFixed(2).replace('.', ',');
}

// ====================== 
// Загрузка данных
// ======================

async function loadCatalog() {
    showLoader(true);
    
    try {
        // В продакшене замените на реальный URL вашего API
        const response = await fetch('catalog.json');
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки каталога');
        }
        
        catalogData = await response.json();
        
        // Обрабатываем данные
        processCatalogData();
        
        // Инициализируем интерфейс
        initializeUI();
        
        // Инициализируем отфильтрованный список всеми товарами
        filteredProducts = [...catalogData.items];
        
        // Показываем первую страницу товаров
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
    // Добавляем вычисляемые поля
    catalogData.items = catalogData.items.map(item => {
        // Извлекаем модель телефона из названия
        const modelMatch = item['Наименование'].match(/для\s+([^с]+?)(?:\s+с\s+|\s+модуль|\s+плата|$)/i);
        const phoneModel = modelMatch ? modelMatch[1].trim() : '';
        
        // Используем цену из данных
        const price = parseFloat(item['Цена']) || 0;
        
        // Исправляем бренд, если он None или пустой
        let brand = item['Бренд'];
        if (!brand || brand === 'None') {
            // Пытаемся извлечь бренд из названия
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
    
    // Обновляем статистику
    updateStats();
}

// ====================== 
// Инициализация UI
// ======================

function initializeUI() {
    // Создаем фильтры по брендам
    createBrandFilters();
    
    // Настраиваем обработчики событий
    setupEventListeners();
}

// ====================== 
// Создание фильтров по брендам
// ======================

function createBrandFilters() {
    const brandsContainer = document.getElementById('brandsContainer');
    
    // Собираем уникальные бренды
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
    
    // Создаем чипы брендов
    brandsContainer.innerHTML = '';
    
    // Сортируем бренды по количеству товаров
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
    // Поиск
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterProducts();
        }, 300);
    });
    
    // Фильтр по наличию
    document.getElementById('inStockOnly').addEventListener('change', filterProducts);
    
    // Сброс фильтров
    document.getElementById('clearFilter').addEventListener('click', clearFilters);
    
    // Кнопка "Показать еще"
    document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
    
    // Закрытие модального окна
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
    // Убираем активный класс со всех чипов
    document.querySelectorAll('.brand-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    // Если выбран тот же бренд, сбрасываем фильтр
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
    
    filteredProducts = catalogData.items.filter(item => {
        // Фильтр по поиску
        const matchesSearch = !searchQuery || item.searchText.includes(searchQuery);
        
        // Фильтр по бренду
        const matchesBrand = !currentBrand || item['Бренд'] === currentBrand;
        
        // Фильтр по наличию
        const matchesStock = !inStockOnly || item['Остаток'] > 0;
        
        return matchesSearch && matchesBrand && matchesStock;
    });
    
    // Сбрасываем страницу
    currentPage = 1;
    
    // Обновляем отображение
    displayProducts();
}

// ====================== 
// Отображение товаров
// ======================

function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    // Если нет товаров
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.add('visible');
        loadMoreContainer.classList.remove('visible');
        updateResultsCount(0);
        return;
    }
    
    emptyState.classList.remove('visible');
    
    // Вычисляем товары для отображения
    const startIndex = 0;
    const endIndex = currentPage * itemsPerPage;
    const productsToShow = filteredProducts.slice(startIndex, endIndex);
    
    // Очищаем сетку при первой странице
    if (currentPage === 1) {
        grid.innerHTML = '';
    }
    
    // Добавляем карточки товаров
    productsToShow.forEach((product, index) => {
        if (index >= (currentPage - 1) * itemsPerPage) {
            const card = createProductCard(product);
            grid.appendChild(card);
        }
    });
    
    // Обновляем счетчик результатов
    updateResultsCount(productsToShow.length);
    
    // Показываем/скрываем кнопку "Показать еще"
    if (endIndex < filteredProducts.length) {
        loadMoreContainer.classList.add('visible');
        const remainingItems = filteredProducts.length - endIndex;
        document.getElementById('loadMoreBtn').textContent = `Показать еще (${remainingItems})`;
    } else {
        loadMoreContainer.classList.remove('visible');
    }
}

// ====================== 
// Создание карточки товара
// ======================

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const hasImage = product['Фото'] && product['Фото'] !== 'None';
    const inStock = product['Остаток'] > 0;
    const stockText = inStock ? `В наличии: ${product['Остаток']} шт` : 'Нет в наличии';
    
    card.innerHTML = `
        ${hasImage ? 
            `<div class="product-image-wrapper">
                <img class="product-image" src="${product['Фото']}" alt="${product['Наименование']}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                <div class="no-image" style="display:none;">
                    <span>📷</span>
                    <p>Нет фото</p>
                </div>
             </div>` :
            `<div class="product-image-wrapper">
                <div class="no-image">
                    <span>📷</span>
                    <p>Нет фото</p>
                </div>
            </div>`
        }
        <div class="product-info">
            <div class="product-brand">${product['Бренд']}</div>
            <div class="product-name">${product['Наименование']}</div>
            <div class="product-stock ${inStock ? 'in-stock' : 'out-of-stock'}">
                ${stockText}
            </div>
            <div class="product-footer">
                <div class="product-price">${product.formattedPrice} ₽</div>
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
    const modal = document.getElementById('productModal');
    const hasImage = product['Фото'] && product['Фото'] !== 'None';
    const inStock = product['Остаток'] > 0;
    
    // Заполняем модальное окно
    document.getElementById('modalTitle').textContent = product['Наименование'];
    document.getElementById('modalBrand').textContent = product['Бренд'];
    
    // Наличие
    const stockElement = document.getElementById('modalStock');
    stockElement.textContent = inStock ? `В наличии: ${product['Остаток']} шт` : 'Нет в наличии';
    stockElement.className = `stock-badge ${inStock ? 'in-stock' : 'out-of-stock'}`;
    
    // Изображение
    const modalImageWrapper = document.getElementById('modalImageWrapper');
    
    if (hasImage) {
        modalImageWrapper.innerHTML = `
            <img id="modalImage" src="${product['Фото']}" alt="${product['Наименование']}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
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
    
    // Цена с форматированием
    document.getElementById('modalPrice').innerHTML = `${product.formattedPrice} ₽`;
    
    // Описание
    const descriptionElement = document.getElementById('modalDescription');
    if (product['Описание'] && product['Описание'] !== 'None') {
        descriptionElement.innerHTML = `<h4>Описание:</h4><p>${product['Описание']}</p>`;
        descriptionElement.style.display = 'block';
    } else {
        descriptionElement.style.display = 'none';
    }
    
    // Показываем модальное окно
    modal.classList.add('active');
    
    // Блокируем скролл body
    document.body.style.overflow = 'hidden';
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
    // Сбрасываем все фильтры
    document.getElementById('searchInput').value = '';
    document.getElementById('inStockOnly').checked = false;
    currentBrand = null;
    
    // Убираем активный класс со всех брендов
    document.querySelectorAll('.brand-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    
    // Перефильтровываем
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
    // Настраиваем тему Telegram
    setupTelegramTheme();
    
    // Загружаем каталог
    loadCatalog();
});
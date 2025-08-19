// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// Глобальные переменные
let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let currentPage = 1;
const productsPerPage = 20;

// API endpoint
const API_URL = 'http://104.165.244.190:5000/api/get_data';

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Инициализация
async function initApp() {
    // Применить тему Telegram
    applyTelegramTheme();
    
    // Загрузить товары
    await loadProducts();
    
    // Инициализировать поиск
    initSearch();
    
    // Инициализировать бесконечный скролл
    initInfiniteScroll();
}

// Применение темы Telegram
function applyTelegramTheme() {
    const theme = tg.themeParams;
    if (theme) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f0f0f0');
    }
}

// Загрузка товаров с API
async function loadProducts() {
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    const productsList = document.getElementById('productsList');
    
    loader.style.display = 'block';
    errorMessage.style.display = 'none';
    productsList.innerHTML = '';
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных');
        }
        
        const data = await response.json();
        allProducts = processProductData(data);
        filteredProducts = [...allProducts];
        
        // Загрузить категории
        loadCategories();
        
        // Отобразить первую страницу товаров
        displayProducts();
        
    } catch (error) {
        console.error('Ошибка:', error);
        errorMessage.style.display = 'block';
        tg.showAlert('Ошибка при загрузке данных. Попробуйте позже.');
    } finally {
        loader.style.display = 'none';
    }
}

// Обработка данных товаров
function processProductData(data) {
    // Преобразуем данные в нужный формат
    // Предполагаем, что API возвращает массив товаров
    if (Array.isArray(data)) {
        return data.map(item => ({
            id: item.id || Math.random().toString(36).substr(2, 9),
            name: item.name || 'Без названия',
            model: item.model || item.phone_model || 'Модель не указана',
            category: extractCategory(item.model || item.phone_model || ''),
            price: item.price || 0,
            image: item.image || item.photo_url || '',
            stock: item.stock || item.quantity || 0,
            description: item.description || ''
        }));
    }
    
    // Если данные в другом формате, пытаемся адаптировать
    if (data.products) {
        return processProductData(data.products);
    }
    
    if (data.items) {
        return processProductData(data.items);
    }
    
    return [];
}

// Извлечение категории из модели
function extractCategory(model) {
    const modelLower = model.toLowerCase();
    
    if (modelLower.includes('iphone')) return 'iPhone';
    if (modelLower.includes('samsung')) return 'Samsung';
    if (modelLower.includes('xiaomi') || modelLower.includes('redmi')) return 'Xiaomi';
    if (modelLower.includes('huawei')) return 'Huawei';
    if (modelLower.includes('honor')) return 'Honor';
    if (modelLower.includes('oppo')) return 'Oppo';
    if (modelLower.includes('vivo')) return 'Vivo';
    if (modelLower.includes('realme')) return 'Realme';
    if (modelLower.includes('oneplus')) return 'OnePlus';
    if (modelLower.includes('nokia')) return 'Nokia';
    
    return 'Другие';
}

// Загрузка категорий
function loadCategories() {
    const categoriesList = document.getElementById('categoriesList');
    const categories = [...new Set(allProducts.map(p => p.category))].sort();
    
    // Очистить существующие категории (кроме "Все")
    const allBtn = categoriesList.querySelector('[data-category="all"]');
    categoriesList.innerHTML = '';
    categoriesList.appendChild(allBtn);
    
    // Добавить новые категории
    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = category;
        btn.dataset.category = category;
        btn.onclick = () => filterByCategory(category);
        categoriesList.appendChild(btn);
    });
}

// Фильтрация по категории
function filterByCategory(category) {
    currentCategory = category;
    currentPage = 1;
    
    // Обновить активную кнопку
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    // Фильтровать товары
    if (category === 'all') {
        filteredProducts = [...allProducts];
    } else {
        filteredProducts = allProducts.filter(p => p.category === category);
    }
    
    // Отобразить отфильтрованные товары
    displayProducts(true);
}

// Отображение товаров
function displayProducts(reset = false) {
    const productsList = document.getElementById('productsList');
    
    if (reset) {
        productsList.innerHTML = '';
        currentPage = 1;
    }
    
    const start = (currentPage - 1) * productsPerPage;
    const end = start + productsPerPage;
    const productsToShow = filteredProducts.slice(start, end);
    
    productsToShow.forEach(product => {
        const card = createProductCard(product);
        productsList.appendChild(card);
    });
    
    // Проверить, есть ли еще товары для загрузки
    if (end >= filteredProducts.length) {
        document.getElementById('loader').style.display = 'none';
    }
}

// Создание карточки товара
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => showProductDetails(product);
    
    const stockClass = product.stock > 0 ? 'in-stock' : 'out-of-stock';
    const stockText = product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии';
    
    card.innerHTML = `
        <img src="${product.image || 'https://via.placeholder.com/160'}" 
             alt="${product.name}" 
             class="product-image"
             onerror="this.src='https://via.placeholder.com/160'">
        <div class="product-info">
            <div class="product-name">${product.name}</div>
            <div class="product-model">${product.model}</div>
            <div class="product-price">${formatPrice(product.price)}</div>
            <span class="product-stock ${stockClass}">${stockText}</span>
        </div>
    `;
    
    return card;
}

// Форматирование цены
function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

// Показать детали товара
function showProductDetails(product) {
    const modal = document.getElementById('productModal');
    const modalBody = document.getElementById('modalBody');
    
    const stockClass = product.stock > 0 ? 'in-stock' : 'out-of-stock';
    const stockText = product.stock > 0 ? `В наличии: ${product.stock} шт.` : 'Нет в наличии';
    
    modalBody.innerHTML = `
        <img src="${product.image || 'https://via.placeholder.com/500'}" 
             alt="${product.name}" 
             class="modal-image"
             onerror="this.src='https://via.placeholder.com/500'">
        <div class="modal-info">
            <h2 class="modal-title">${product.name}</h2>
            <div class="modal-model">Модель: ${product.model}</div>
            <div class="modal-description">
                ${product.description || 'Качественная запчасть для вашего телефона. Гарантия совместимости с указанной моделью.'}
            </div>
            <div class="modal-price">${formatPrice(product.price)}</div>
            <span class="modal-stock ${stockClass}">${stockText}</span>
            <button class="modal-close-btn" onclick="closeModal()">Закрыть</button>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Вибрация при открытии (если поддерживается)
    if (tg.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('light');
    }
}

// Закрыть модальное окно
function closeModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
}

// Инициализация поиска
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            performSearch(e.target.value);
        }, 300);
    });
}

// Выполнить поиск
function performSearch(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (searchTerm === '') {
        // Если поиск пустой, показать все товары текущей категории
        if (currentCategory === 'all') {
            filteredProducts = [...allProducts];
        } else {
            filteredProducts = allProducts.filter(p => p.category === currentCategory);
        }
    } else {
        // Фильтровать по поисковому запросу
        filteredProducts = allProducts.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                 product.model.toLowerCase().includes(searchTerm) ||
                                 product.description.toLowerCase().includes(searchTerm);
            
            const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
            
            return matchesSearch && matchesCategory;
        });
    }
    
    displayProducts(true);
}

// Инициализация бесконечного скролла
function initInfiniteScroll() {
    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
            if (currentPage * productsPerPage < filteredProducts.length) {
                currentPage++;
                displayProducts();
            }
        }
    });
}

// Закрытие модального окна при клике вне его
window.onclick = function(event) {
    const modal = document.getElementById('productModal');
    if (event.target === modal) {
        closeModal();
    }
}
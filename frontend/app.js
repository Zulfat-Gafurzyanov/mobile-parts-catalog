// ====================== 
// Глобальные переменные
// ======================

let catalogData = null;
let filteredProducts = [];
let currentCategory = null;
let currentPage = 1;
const itemsPerPage = 12;
let searchTimeout = null;

// ====================== 
// Инициализация Telegram Web App
// ======================

const tg = window.Telegram.WebApp;

// Настройка темы Telegram
function setupTelegramTheme() {
    tg.ready();
    tg.expand();
    
    // Применяем цвета темы Telegram
    const theme = tg.themeParams;
    if (theme) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', theme.bg_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-text-color', theme.text_color || '#000000');
        document.documentElement.style.setProperty('--tg-theme-hint-color', theme.hint_color || '#999999');
        document.documentElement.style.setProperty('--tg-theme-link-color', theme.link_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-color', theme.button_color || '#2481cc');
        document.documentElement.style.setProperty('--tg-theme-button-text-color', theme.button_text_color || '#ffffff');
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color || '#f1f1f1');
    }
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
        const phoneModel = modelMatch ? modelMatch[1].trim() : item['Бренд'];
        
        // Генерируем случайную цену для демонстрации (в реальном приложении цена должна быть в данных)
        const price = Math.floor(Math.random() * 5000) + 500;
        
        return {
            ...item,
            phoneModel: phoneModel,
            price: price,
            searchText: `${item['Бренд']} ${item['Наименование']} ${phoneModel}`.toLowerCase()
        };
    });
    
    // Обновляем статистику
    updateStats();
}

// ====================== 
// Инициализация UI
// ======================

function initializeUI() {
    // Создаем категории
    createCategories();
    
    // Настраиваем обработчики событий
    setupEventListeners();
}

// ====================== 
// Создание категорий
// ======================

function createCategories() {
    const categoriesContainer = document.getElementById('categoriesContainer');
    
    // Собираем уникальные категории
    const categoriesMap = new Map();
    
    catalogData.items.forEach(item => {
        const category = item['Название группы'];
        if (category && category !== 'None') {
            if (!categoriesMap.has(category)) {
                categoriesMap.set(category, 0);
            }
            categoriesMap.set(category, categoriesMap.get(category) + 1);
        }
    });
    
    // Создаем чипы категорий
    categoriesContainer.innerHTML =
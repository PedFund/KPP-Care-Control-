# 📐 АРХИТЕКТУРА КОДА

## 🏗️ Модульная структура

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│                  (Структура приложения)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
        ┌─────────────────────┴─────────────────────┐
        │                                            │
        ↓                                            ↓
┌──────────────┐                            ┌──────────────┐
│  styles.css  │                            │   app.js     │
│   (Дизайн)   │                            │ (Инициализ.) │
└──────────────┘                            └──────────────┘
                                                    │
                    ┌───────────────────────────────┼────────────────┐
                    │                               │                │
                    ↓                               ↓                ↓
            ┌──────────────┐            ┌──────────────┐   ┌──────────────┐
            │  config.js   │            │   auth.js    │   │    ui.js     │
            │  (Настройки) │            │ (Аутентиф.)  │   │ (Интерфейс)  │
            └──────────────┘            └──────────────┘   └──────────────┘
                    │                               │                │
                    ↓                               ↓                ↓
            ┌──────────────┐            ┌─────────────────────────────┐
            │firebase-init │            │      data-logic.js          │
            │    (БД)      │←───────────│  (Бизнес-логика данных)     │
            └──────────────┘            └─────────────────────────────┘
```

---

## 📦 Описание модулей

### 🎨 **index.html** (9.6 KB)
**Назначение:** Структура HTML, разметка всех экранов и вкладок

**Содержит:**
- Экран входа (login-screen)
- Экран пользователя (user-screen)
  - 6 вкладок: Сводка, Шаги, Пресс, Тренировки, Вода, Питание
- Экран админа (admin-screen)

---

### 🎨 **styles.css** (8.9 KB)
**Назначение:** Все стили приложения

**Особенности:**
- CSS переменные для цветов
- Адаптивный дизайн (mobile-first)
- Анимации и переходы
- Современная типографика

**Ключевые секции:**
- Экран входа
- Навигация (вкладки)
- Карточки статистики
- Формы ввода
- История (grid layouts)
- Админ-панель

---

### ⚙️ **config.js** (498 B)
**Назначение:** Конфигурация Firebase и данные администратора

```javascript
const firebaseConfig = { ... };
const ADMIN_CREDENTIALS = { login, password };
```

**Важно:** Единственное место, где хранятся credentials

---

### 🔥 **firebase-init.js** (370 B)
**Назначение:** Инициализация Firebase при загрузке

```javascript
firebase.initializeApp(firebaseConfig);
db = firebase.firestore();
```

---

### 🔐 **auth.js** (2.5 KB)
**Назначение:** Система аутентификации

**Функции:**
- `getSession()` - получить текущую сессию из localStorage
- `saveSession(userId, isAdmin)` - сохранить сессию
- `clearSession()` - очистить сессию
- `isAdminLogin(username, password)` - проверка админа
- `login(username, password)` - вход (создание нового пользователя или вход существующего)
- `logout()` - выход

**Логика:**
1. Проверка на админа
2. Поиск существующего пользователя
3. Создание нового пользователя при первом входе
4. Сохранение сессии в localStorage

---

### 🧠 **data-logic.js** (8.9 KB)
**Назначение:** Вся бизнес-логика приложения

**Разделы:**

#### 1️⃣ Утилиты для работы с датами
```javascript
getDateKey(date)        // Получить YYYY-MM-DD
dateFromKey(dateKey)    // Преобразовать в Date
addDays(dateKey, days)  // Добавить дни
formatDate(dateKey)     // Форматировать для UI
getDayName(dateKey)     // Название дня недели
```

#### 2️⃣ Расчёт нормы шагов
```javascript
calculateNewGoal(lastEntry, baseSteps)  // Расчёт новой нормы
getCurrentGoal(userData, history)       // Текущая норма
```

**Логика зон:**
- ≥100% → +200
- 85-99% → 0
- 60-84% → -100
- <60% → -300

#### 3️⃣ Поиск пропущенных дней
```javascript
findMissingDays(history, startDateKey)
```
- ТОЛЬКО прошедшие дни
- Текущий день НИКОГДА не пропущенный

#### 4️⃣ Работа с Firestore
```javascript
getUserData(userId)                     // Получить пользователя
getUserHistory(userId)                  // Получить историю
saveDayData(userId, dateKey, data)      // Сохранить день
getAllUsers()                           // Все пользователи (для админа)
```

#### 5️⃣ Статистика
```javascript
getLast7DaysStats(history, metric)      // Последние 7 дней
getWeeklyStats(history, metric)         // Агрегация по неделям
getMonthlyStats(history, metric)        // Агрегация по месяцам
getAbsoluteStats(history, metric)       // Абсолютные min/max
```

---

### 🎨 **ui.js** (23 KB)
**Назначение:** Отрисовка всего интерфейса

**Глобальные переменные:**
```javascript
let currentUser = null;
let currentUserData = null;
let currentHistory = {};
```

**Основные функции:**

#### Навигация
- `showScreen(screenId)` - переключение между экранами
- `setupTabs()` - настройка вкладок

#### Экран пользователя
- `renderUserScreen(userId)` - главный экран
- `renderSummary()` - вкладка "Сводка"
- `renderChecklist(todayEntry)` - чек-лист дня
- `renderMissingDays()` - предупреждение о пропусках
- `openDayInputDialog(dateKey)` - диалог ввода за день
- `saveDayAndRefresh(dateKey, data)` - сохранить и обновить

#### История по вкладкам
- `loadTabData(tabName)` - загрузка данных вкладки
- `renderStepsHistory()` - история шагов
- `renderAbsHistory()` - история пресса
- `renderWorkoutHistory()` - история тренировок
- `renderWaterHistory()` - история воды
- `renderNutritionHistory()` - история питания

#### Админ-панель
- `renderAdminScreen()` - панель администратора

---

### 🚀 **app.js** (2.5 KB)
**Назначение:** Точка входа, инициализация приложения

**Логика запуска:**
```javascript
DOMContentLoaded → 
  ↓
Проверка сессии →
  ├─ Есть сессия (admin) → renderAdminScreen()
  ├─ Есть сессия (user) → renderUserScreen(userId)
  └─ Нет сессии → showScreen('login-screen')
```

**Обработчики:**
- Форма входа (#login-form)
- Кнопки выхода (#logout-btn, #admin-logout-btn)
- Вкладки (setupTabs)
- Форма ввода данных (#today-form)

---

## 🔄 Поток данных

### При входе пользователя:
```
1. app.js → auth.login(username, password)
2. auth.js → проверка/создание пользователя в Firestore
3. auth.js → saveSession(userId)
4. app.js → renderUserScreen(userId)
5. ui.js → getUserData() + getUserHistory()
6. ui.js → renderSummary()
```

### При сохранении данных:
```
1. ui.js → saveDayAndRefresh(dateKey, data)
2. data-logic.js → saveDayData()
3. data-logic.js → getCurrentGoal() для определения нормы
4. Firestore → сохранение документа
5. ui.js → обновление локальной копии history
6. ui.js → renderSummary() для обновления UI
```

### При смене вкладки:
```
1. ui.js → click на tab-btn
2. ui.js → loadTabData(tabName)
3. ui.js → render*History() (в зависимости от вкладки)
4. data-logic.js → getStats() для расчёта статистики
5. ui.js → отрисовка HTML
```

---

## 🎯 Принципы архитектуры

### ✅ Разделение ответственности
- **config.js** - ТОЛЬКО конфигурация
- **auth.js** - ТОЛЬКО аутентификация
- **data-logic.js** - ТОЛЬКО логика данных (без UI)
- **ui.js** - ТОЛЬКО отрисовка (без логики данных)
- **app.js** - ТОЛЬКО инициализация и связывание

### ✅ Чистые функции
Все функции в `data-logic.js`:
- Не зависят от глобального состояния
- Принимают явные параметры
- Возвращают явные результаты
- Легко тестируются

### ✅ Изоляция UI
- Вся логика расчётов изолирована от DOM
- Можно легко заменить UI framework
- Можно переиспользовать data-logic.js

### ✅ Безопасность дат
- Все даты проходят через `getDateKey()`
- Время обнуляется до 00:00:00
- Предотвращаются ошибки часовых поясов

### ✅ Никаких предположений
- Код не заполняет данные автоматически
- Не угадывает намерения пользователя
- Не меняет прошлые записи

---

## 🔧 Точки расширения

### Добавить новую метрику:
1. Добавить поле в форму (`index.html`)
2. Добавить поле в `saveDayData()` (`data-logic.js`)
3. Создать `render*History()` в `ui.js`
4. Добавить вкладку в `loadTabData()`

### Изменить логику расчёта нормы:
1. Отредактировать `calculateNewGoal()` в `data-logic.js`
2. Всё остальное работает автоматически

### Добавить новую статистику:
1. Создать функцию в `data-logic.js` (например, `getYearlyStats()`)
2. Использовать в `render*History()` в `ui.js`

---

## 📏 Размеры модулей

```
index.html       ████████░░ 9.6 KB  (структура)
styles.css       ████████░░ 8.9 KB  (стили)
ui.js            ███████████████████████ 23 KB  (отрисовка)
data-logic.js    ████████░░ 8.9 KB  (логика)
simulator.js     ███████████████████████████ 27 KB  (полная копия для теста)
auth.js          ███░░░░░░░ 2.5 KB  (аутентификация)
app.js           ███░░░░░░░ 2.5 KB  (инициализация)
config.js        █░░░░░░░░░ 498 B   (конфигурация)
firebase-init.js █░░░░░░░░░ 370 B   (инициализация БД)
```

**Итого:** ~88 KB чистого кода (без комментариев)

---

## 🧪 Тестируемость

### Легко тестируемые модули:
- ✅ `data-logic.js` - чистые функции, не зависят от DOM/Firebase
- ✅ `auth.js` - можно мокать localStorage

### Сложнее тестируемые:
- ⚠️ `ui.js` - зависит от DOM (нужен jsdom или Cypress)
- ⚠️ `firebase-init.js` - нужны Firebase emulators

---

## 🎓 Рекомендации для разработчиков

1. **Начинайте с data-logic.js** - это ядро приложения
2. **Изучите calculateNewGoal()** - это самая важная функция
3. **Смотрите ui.js последовательно** - начните с renderSummary()
4. **Тестируйте в simulator.html** - не нужен Firebase
5. **Используйте DevTools** - Console для отладки, Network для запросов

---

✅ **Архитектура чистая, модульная и расширяемая!**

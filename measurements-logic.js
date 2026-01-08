// ================================
// measurements-logic.js
// Логика измерений (антропометрия)
// ================================
//
// Хранилище:
// users/{userId}/measurements/{dateKey}
//
// Правила:
// - 1 запись на день (dateKey = YYYY-MM-DD)
// - все поля необязательные
// - дату можно выбрать, но сохранять ТОЛЬКО за сегодня
// - прошлые даты — только просмотр
//
// Требования окружения:
// - доступны глобальные: db, firebase, getDateKey (из data-logic.js)
// - подключение через <script> без type="module"

// === Допустимые поля измерений ===
const MEASUREMENT_FIELDS = [
  'weight',   // вес, кг
  'height',   // рост, см
  'age',      // возраст, лет
  'chest',    // грудь, см
  'waist',    // талия, см
  'belly',    // живот, см
  'hips',     // бёдра, см
  'comment'   // комментарий
];

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function isValidDateKey(dateKey) {
  return typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

// Парсинг чисел с поддержкой "71,2"
function parseOptionalNumber(value) {
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return undefined;

    const normalized = s.replace(',', '.');
    const n = Number(normalized);
    return Number.isFinite(n) ? n : undefined;
  }

  return undefined;
}

function parseOptionalString(value) {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s ? s : undefined;
}

// Проверяем, ввёл ли пользователь ХОТЯ БЫ ОДНО измерение
function hasAnyMeasurementValue(obj) {
  return MEASUREMENT_FIELDS.some(key => {
    if (key === 'comment') return parseOptionalString(obj[key]) !== undefined;
    return parseOptionalNumber(obj[key]) !== undefined;
  });
}

// Приводим входные данные к чистому виду
function normalizeMeasurementInput(raw) {
  const out = {
    weight: parseOptionalNumber(raw.weight),
    height: parseOptionalNumber(raw.height),
    age: parseOptionalNumber(raw.age),
    chest: parseOptionalNumber(raw.chest),
    waist: parseOptionalNumber(raw.waist),
    belly: parseOptionalNumber(raw.belly),
    hips: parseOptionalNumber(raw.hips),
    comment: parseOptionalString(raw.comment)
  };

  // удаляем undefined, чтобы не писать мусор в Firestore
  Object.keys(out).forEach(k => {
    if (out[k] === undefined) delete out[k];
  });

  return out;
}

// === FIRESTORE ===

// Получить все измерения пользователя
async function getUserMeasurements(userId) {
  try {
    const snapshot = await db
      .collection('users')
      .doc(userId)
      .collection('measurements')
      .orderBy('date', 'desc')
      .get();

    const measurements = {};
    snapshot.forEach(doc => {
      measurements[doc.id] = doc.data();
    });

    return measurements;
  } catch (error) {
    console.error('Ошибка загрузки измерений:', error);
    return {};
  }
}

// Сохранить измерение (ТОЛЬКО за сегодня)
async function saveMeasurement(userId, dateKey, rawData) {
  try {
    const todayKey = getDateKey();

    if (!isValidDateKey(dateKey)) {
      return { success: false, message: 'Некорректная дата измерения.' };
    }

    if (dateKey !== todayKey) {
      return {
        success: false,
        message: 'Редактировать или добавлять измерения за прошлые даты нельзя.'
      };
    }

    const data = normalizeMeasurementInput(rawData);

    if (!hasAnyMeasurementValue(data)) {
      return {
        success: false,
        message: 'Введите хотя бы одно измерение или комментарий.'
      };
    }

    const entry = {
      date: dateKey,
      ...data,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db
      .collection('users')
      .doc(userId)
      .collection('measurements')
      .doc(dateKey)
      .set(entry, { merge: true });

    return { success: true, entry };

  } catch (error) {
    console.error('Ошибка сохранения измерений:', error);
    return {
      success: false,
      message: 'Ошибка сохранения измерений. Попробуйте позже.'
    };
  }
}

// Получить последнее измерение
function getLastMeasurement(measurements) {
  if (!measurements || Object.keys(measurements).length === 0) return null;
  const keys = Object.keys(measurements).sort((a, b) => b.localeCompare(a));
  return measurements[keys[0]] || null;
}

// Преобразовать объект в список (для таблицы/карточек)
function measurementsToList(measurements) {
  if (!measurements) return [];
  return Object.keys(measurements)
    .sort((a, b) => b.localeCompare(a))
    .map(dateKey => ({ dateKey, ...measurements[dateKey] }));
}

// Форматирование чисел для UI
function formatOptionalNumber(value, digits = 1) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) {
    return '—';
  }

  return Number(value).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  });
}
.measurements-table {
  width: 100%;
  overflow-x: auto;
  margin-top: 1rem;
}

.measurements-table table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.measurements-table thead {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.measurements-table th,
.measurements-table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.measurements-table th {
  font-weight: 600;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.measurements-table tbody tr:hover {
  background-color: #f5f5f5;
  transition: background-color 0.2s ease;
}

.measurements-table tbody tr:last-child td {
  border-bottom: none;
}

.measurements-table td {
  font-size: 0.95em;
  color: #333;
}

/* Адаптивность для таблицы */
@media (max-width: 768px) {
  .measurements-table {
    font-size: 0.85em;
  }
  
  .measurements-table th,
  .measurements-table td {
    padding: 8px 10px;
  }
}

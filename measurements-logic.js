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


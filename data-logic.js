// Модуль бизнес-логики данных
// ОБНОВЛЕНО: 2026-01-09 - Улучшен формат дат в недельной статистике

// === УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ ===

// Получить dateKey в формате YYYY-MM-DD (с обнулением времени)
function getDateKey(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Получить объект Date из dateKey
function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Добавить дни к дате
function addDays(dateKey, days) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
}

// Форматировать дату для отображения
function formatDate(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
}

// НОВОЕ: Короткий формат даты для недельной статистики
// Формат: "5-9 янв 26" вместо "5-9 2026"
function formatDateShort(dateKey) {
  const date = dateFromKey(dateKey);
  const day = date.getDate();
  const month = date.toLocaleDateString('ru-RU', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2); // последние 2 цифры
  return `${day} ${month} ${year}`;
}

// Получить название дня недели
function getDayName(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

// === НОВОЕ: Получить понедельник для данной недели ===
// Добавлено: 2026-01-08
// Причина: Корректная агрегация по неделям начиная с понедельника
function getMonday(dateKey) {
  const date = dateFromKey(dateKey);
  const day = date.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const diff = day === 0 ? -6 : 1 - day; // если воскресенье, то -6, иначе 1-day
  date.setDate(date.getDate() + diff);
  return getDateKey(date);
}

// === НОВОЕ: Получить все дни недели начиная с понедельника ===
// Добавлено: 2026-01-08
function getWeekDays(mondayKey) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    days.push(addDays(mondayKey, i));
  }
  return days;
}

// === РАСЧЁТ НОРМЫ ШАГОВ ===

// Рассчитать новую норму на основе последнего дня с данными
function calculateNewGoal(lastEntry, baseSteps) {
  const currentGoal = lastEntry.goal || baseSteps;
  const totalSteps = lastEntry.totalSteps || 0;
  const percentage = (totalSteps / currentGoal) * 100;

  let newGoal = currentGoal;

  if (percentage >= 100) {
    newGoal = currentGoal + 200;
  } else if (percentage >= 85) {
    // Норма не меняется
    newGoal = currentGoal;
  } else if (percentage >= 60) {
    newGoal = currentGoal - 100;
  } else {
    newGoal = currentGoal - 300;
  }

  // Ограничения
  newGoal = Math.max(baseSteps, newGoal);
  newGoal = Math.min(10000, newGoal);

  return newGoal;
}

// Получить текущую норму шагов для пользователя
function getCurrentGoal(userData, history) {
  const baseSteps = userData.baseSteps || 5000;
  
  if (!history || Object.keys(history).length === 0) {
    return baseSteps;
  }

  // Находим последний день с данными
  const sortedDates = Object.keys(history).sort((a, b) => b.localeCompare(a));
  const lastDateKey = sortedDates[0];
  const lastEntry = history[lastDateKey];

  return lastEntry.goal || baseSteps;
}

// === ПОИСК ПРОПУЩЕННЫХ ДНЕЙ ===

// Найти пропущенные дни (только прошедшие)
function findMissingDays(history, startDateKey) {
  const today = getDateKey();
  const missing = [];

  let currentDate = startDateKey;
  
  while (currentDate < today) {
    if (!history[currentDate]) {
      missing.push(currentDate);
    }
    currentDate = addDays(currentDate, 1);
  }

  return missing;
}

// === РАБОТА С ДАННЫМИ FIRESTORE ===

// Получить данные пользователя
async function getUserData(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
}

// Получить историю пользователя
async function getUserHistory(userId) {
  try {
    const snapshot = await db.collection('users').doc(userId).collection('history').get();
    const history = {};
    
    snapshot.forEach(doc => {
      history[doc.id] = doc.data();
    });
    
    return history;
  } catch (error) {
    console.error('Error getting user history:', error);
    return {};
  }
}

// Сохранить данные за день
async function saveDayData(userId, dateKey, data, userData, history) {
  try {
    const baseSteps = userData.baseSteps || 5000;
    
    // Определяем норму для этого дня
    let goalForThisDay;
    
    if (dateKey === getDateKey()) {
      // Для сегодняшнего дня используем текущую норму
      goalForThisDay = getCurrentGoal(userData, history);
    } else {
      // Для прошлых дней рассчитываем норму на основе предыдущего дня
      const prevDateKey = addDays(dateKey, -1);
      if (history[prevDateKey]) {
        goalForThisDay = calculateNewGoal(history[prevDateKey], baseSteps);
      } else {
        goalForThisDay = baseSteps;
      }
    }

    const entry = {
      date: dateKey,
      totalSteps: parseInt(data.totalSteps) || 0,
      treadmillSteps: parseInt(data.treadmillSteps) || 0,
      goal: goalForThisDay,
      treadmillGoal: userData.treadmillGoal || 3000,
      morningExercise: data.morningExercise ? 1 : 0,
      workout: data.workout ? 1 : 0,
      abs: data.abs ? 1 : 0,
      nutrition: parseInt(data.nutrition) || 0,
      water: parseInt(data.water) || 0,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userId).collection('history').doc(dateKey).set(entry);
    
    return { success: true, entry };
  } catch (error) {
    console.error('Error saving day data:', error);
    return { success: false, error };
  }
}

// Получить всех пользователей (для админа) - DEPRECATED, используйте getAllUsersWithDetails из admin-logic.js
async function getAllUsers() {
  try {
    const snapshot = await db.collection('users').get();
    const users = [];
    
    for (const doc of snapshot.docs) {
      const userData = { id: doc.id, ...doc.data() };
      const history = await getUserHistory(doc.id);
      users.push({ ...userData, history });
    }
    
    return users;
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// === СТАТИСТИКА ===

// Получить статистику за последние 7 дней
function getLast7DaysStats(history, metric) {
  const today = getDateKey();
  const stats = [];
  
  for (let i = 6; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    const entry = history[dateKey];
    
    if (entry) {
      stats.push({
        date: dateKey,
        value: entry[metric] || 0
      });
    }
  }
  
  return stats;
}

// === ИСПРАВЛЕНО: Агрегация по неделям (с понедельника) ===
// Изменено: 2026-01-09 - Улучшен формат дат
function getWeeklyStats(history, metric, weeksCount = 4) {
  const today = getDateKey();
  const weeks = [];
  
  for (let w = weeksCount - 1; w >= 0; w--) {
    // Находим понедельник текущей недели
    const currentMonday = getMonday(today);
    
    // Отнимаем w недель (7 * w дней)
    const weekMonday = addDays(currentMonday, -7 * w);
    const weekDays = getWeekDays(weekMonday);
    
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    
    weekDays.forEach(dateKey => {
      // Для текущей недели считаем только до сегодня
      if (w === 0 && dateKey > today) return;
      
      const entry = history[dateKey];
      
      if (entry && entry[metric] !== undefined) {
        const value = entry[metric];
        sum += value;
        count++;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
    
    if (count > 0) {
      const weekStart = weekDays[0];
      const weekEnd = w === 0 && weekDays[6] > today ? today : weekDays[6];
      
      // НОВОЕ: Формат "5-9 янв 26"
      const startShort = formatDateShort(weekStart);
      const endShort = formatDateShort(weekEnd);
      const periodLabel = `${startShort.split(' ')[0]}-${endShort}`;
      
      weeks.push({
        period: periodLabel,
        avg: Math.round(sum / count),
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
        count,
        weekDays: weekDays
      });
    }
  }
  
  return weeks;
}

// === НОВОЕ: Агрегация по неделям для бинарных показателей (зарядка, тренировки, пресс) ===
// Добавлено: 2026-01-08
// Для: зарядка, тренировки, пресс
// Считается: выполнено/всего, процент
function getWeeklyBinaryStats(history, metric, weeksCount = 4) {
  const today = getDateKey();
  const weeks = [];
  
  for (let w = weeksCount - 1; w >= 0; w--) {
    const currentMonday = getMonday(today);
    const weekMonday = addDays(currentMonday, -7 * w);
    const weekDays = getWeekDays(weekMonday);
    
    let doneCount = 0;
    let totalDays = 0;
    
    weekDays.forEach(dateKey => {
      // Для текущей недели считаем только до сегодня
      if (w === 0 && dateKey > today) return;
      
      const entry = history[dateKey];
      
      if (entry && entry[metric] !== undefined) {
        totalDays++;
        if (entry[metric] === 1) {
          doneCount++;
        }
      }
    });
    
    if (totalDays > 0) {
      const weekStart = weekDays[0];
      const weekEnd = w === 0 && weekDays[6] > today ? today : weekDays[6];
      const percentage = Math.round((doneCount / totalDays) * 100);
      
      // НОВОЕ: Формат "5-9 янв 26"
      const startShort = formatDateShort(weekStart);
      const endShort = formatDateShort(weekEnd);
      const periodLabel = `${startShort.split(' ')[0]}-${endShort}`;
      
      weeks.push({
        period: periodLabel,
        done: doneCount,
        total: totalDays,
        percentage: percentage,
        weekDays: weekDays
      });
    }
  }
  
  return weeks;
}

// === НОВОЕ: Агрегация по неделям для воды (с правильным средним) ===
// Добавлено: 2026-01-08
function getWeeklyWaterStats(history, weeksCount = 4) {
  const waterLabels = ['<250мл', '250-500мл', '500-750мл', '750мл-1л', '1-1.5л', '1.5-2л', '>2л'];
  const today = getDateKey();
  const weeks = [];
  
  for (let w = weeksCount - 1; w >= 0; w--) {
    const currentMonday = getMonday(today);
    const weekMonday = addDays(currentMonday, -7 * w);
    const weekDays = getWeekDays(weekMonday);
    
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    
    weekDays.forEach(dateKey => {
      // Для текущей недели считаем только до сегодня
      if (w === 0 && dateKey > today) return;
      
      const entry = history[dateKey];
      
      if (entry && entry.water !== undefined) {
        const value = entry.water;
        sum += value;
        count++;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    });
    
    if (count > 0) {
      const weekStart = weekDays[0];
      const weekEnd = w === 0 && weekDays[6] > today ? today : weekDays[6];
      const avgValue = Math.round(sum / count);
      
      // НОВОЕ: Формат "5-9 янв 26"
      const startShort = formatDateShort(weekStart);
      const endShort = formatDateShort(weekEnd);
      const periodLabel = `${startShort.split(' ')[0]}-${endShort}`;
      
      weeks.push({
        period: periodLabel,
        avg: avgValue,
        avgLabel: waterLabels[avgValue] || '—',
        min: min === Infinity ? 0 : min,
        minLabel: waterLabels[min] || '—',
        max: max === -Infinity ? 0 : max,
        maxLabel: waterLabels[max] || '—',
        count,
        weekDays: weekDays
      });
    }
  }
  
  return weeks;
}

// === ИСПРАВЛЕНО: Агрегация по неделям для питания (приоритет категорий) ===
// Обновлено: 2026-01-09
// Было: считалось среднее арифметическое
// Стало: показывается распределение по категориям + наиболее частая категория
function getWeeklyNutritionStats(history, weeksCount = 4) {
  const nutritionLabels = {
    '-2': 'Сильное недоедание',
    '-1': 'Небольшое недоедание',
    '0': 'По плану',
    '1': 'Небольшое переедание',
    '2': 'Сильное переедание'
  };
  
  const today = getDateKey();
  const weeks = [];
  
  for (let w = weeksCount - 1; w >= 0; w--) {
    const currentMonday = getMonday(today);
    const weekMonday = addDays(currentMonday, -7 * w);
    const weekDays = getWeekDays(weekMonday);
    
    // Подсчитываем распределение по категориям
    const distribution = {
      '-2': 0,
      '-1': 0,
      '0': 0,
      '1': 0,
      '2': 0
    };
    let count = 0;
    
    weekDays.forEach(dateKey => {
      // Для текущей недели считаем только до сегодня
      if (w === 0 && dateKey > today) return;
      
      const entry = history[dateKey];
      
      if (entry && entry.nutrition !== undefined) {
        const nutritionValue = String(entry.nutrition);
        if (distribution.hasOwnProperty(nutritionValue)) {
          distribution[nutritionValue]++;
          count++;
        }
      }
    });
    
    if (count > 0) {
      const weekStart = weekDays[0];
      const weekEnd = w === 0 && weekDays[6] > today ? today : weekDays[6];
      
      // Находим наиболее частую категорию
      // ПРИОРИТЕТ: если есть небольшое недоедание, оно приоритетнее
      let dominantCategory = '0';
      let maxCount = 0;
      
      // Определяем приоритет: небольшое недоедание > по плану > остальные
      const priorityOrder = ['-1', '0', '1', '-2', '2'];
      
      for (const category of priorityOrder) {
        if (distribution[category] > maxCount) {
          maxCount = distribution[category];
          dominantCategory = category;
        }
      }
      
      // Формируем детальное описание
      const details = Object.keys(distribution)
        .filter(key => distribution[key] > 0)
        .map(key => `${nutritionLabels[key]}: ${distribution[key]}`)
        .join(', ');
      
      // НОВОЕ: Формат "5-9 янв 26"
      const startShort = formatDateShort(weekStart);
      const endShort = formatDateShort(weekEnd);
      const periodLabel = `${startShort.split(' ')[0]}-${endShort}`;
      
      weeks.push({
        period: periodLabel,
        dominantCategory: dominantCategory,
        dominantLabel: nutritionLabels[dominantCategory],
        distribution: distribution,
        details: details,
        count: count,
        weekDays: weekDays
      });
    }
  }
  
  return weeks;
}

// Агрегация по месяцам
function getMonthlyStats(history, metric, monthsCount = 3) {
  const today = new Date();
  const months = [];
  
  for (let m = monthsCount - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const monthKey = monthDate.toISOString().slice(0, 7); // YYYY-MM
    
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    
    Object.keys(history).forEach(dateKey => {
      if (dateKey.startsWith(monthKey)) {
        const entry = history[dateKey];
        if (entry && entry[metric] !== undefined) {
          const value = entry[metric];
          sum += value;
          count++;
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    });
    
    if (count > 0) {
      months.push({
        period: monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
        avg: Math.round(sum / count),
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
        count
      });
    }
  }
  
  return months;
}

// Абсолютные min/max за всё время
function getAbsoluteStats(history, metric) {
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let count = 0;
  
  Object.values(history).forEach(entry => {
    if (entry && entry[metric] !== undefined) {
      const value = entry[metric];
      sum += value;
      count++;
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  });
  
  return {
    min: min === Infinity ? 0 : min,
    max: max === -Infinity ? 0 : max,
    avg: count > 0 ? Math.round(sum / count) : 0,
    total: count
  };
}

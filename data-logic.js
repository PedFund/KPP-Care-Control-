// Модуль бизнес-логики данных

// === УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ ===

// Получить dateKey в формате YYYY-MM-DD (с обнулением времени)
function getDateKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
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

// Получить название дня недели
function getDayName(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
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

// Получить всех пользователей (для админа)
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

// Агрегация по неделям
function getWeeklyStats(history, metric, weeksCount = 4) {
  const today = getDateKey();
  const weeks = [];
  
  for (let w = weeksCount - 1; w >= 0; w--) {
    const weekEnd = addDays(today, -w * 7);
    const weekStart = addDays(weekEnd, -6);
    
    let sum = 0;
    let count = 0;
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i < 7; i++) {
      const dateKey = addDays(weekStart, i);
      const entry = history[dateKey];
      
      if (entry && entry[metric] !== undefined) {
        const value = entry[metric];
        sum += value;
        count++;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    
    if (count > 0) {
      weeks.push({
        period: `${formatDate(weekStart).split(' ')[0]}-${formatDate(weekEnd).split(' ')[0]}`,
        avg: Math.round(sum / count),
        min: min === Infinity ? 0 : min,
        max: max === -Infinity ? 0 : max,
        count
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

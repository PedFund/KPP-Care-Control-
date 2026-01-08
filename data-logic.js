// ================================
// МОДУЛЬ БИЗНЕС-ЛОГИКИ ДАННЫХ
// ================================

// === УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ ===

// Получить dateKey в формате YYYY-MM-DD
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

// Форматировать дату
function formatDate(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// День недели
function getDayName(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

// === НЕДЕЛИ (ISO, С ПОНЕДЕЛЬНИКА) ===

// Начало недели (понедельник)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=вс, 1=пн
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Конец недели (воскресенье)
function getWeekEnd(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  return d;
}

// Название месяца
function getMonthName(date) {
  return date.toLocaleDateString('ru-RU', { month: 'long' });
}

// Формат недели: 2–8 января / 29 января – 4 февраля
function formatWeekPeriod(weekStart) {
  const start = new Date(weekStart);
  const end = getWeekEnd(start);

  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${getMonthName(start)}`;
  }

  return `${start.getDate()} ${getMonthName(start)} – ${end.getDate()} ${getMonthName(end)}`;
}

// === РАСЧЁТ НОРМЫ ШАГОВ ===

function calculateNewGoal(lastEntry, baseSteps) {
  const currentGoal = lastEntry.goal || baseSteps;
  const totalSteps = lastEntry.totalSteps || 0;
  const percentage = (totalSteps / currentGoal) * 100;

  let newGoal = currentGoal;

  if (percentage >= 100) newGoal += 200;
  else if (percentage >= 60) newGoal -= 100;
  else newGoal -= 300;

  newGoal = Math.max(baseSteps, newGoal);
  newGoal = Math.min(10000, newGoal);

  return newGoal;
}

function getCurrentGoal(userData, history) {
  const baseSteps = userData.baseSteps || 5000;
  if (!history || Object.keys(history).length === 0) return baseSteps;

  const sortedDates = Object.keys(history).sort((a, b) => b.localeCompare(a));
  const lastEntry = history[sortedDates[0]];
  return lastEntry.goal || baseSteps;
}

// === ПРОПУЩЕННЫЕ ДНИ ===

function findMissingDays(history, startDateKey) {
  const today = getDateKey();
  const missing = [];
  let currentDate = startDateKey;

  while (currentDate < today) {
    if (!history[currentDate]) missing.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return missing;
}

// === FIRESTORE ===

async function getUserData(userId) {
  try {
    const doc = await db.collection('users').doc(userId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch {
    return null;
  }
}

async function getUserHistory(userId) {
  try {
    const snapshot = await db.collection('users').doc(userId).collection('history').get();
    const history = {};
    snapshot.forEach(doc => history[doc.id] = doc.data());
    return history;
  } catch {
    return {};
  }
}

async function saveDayData(userId, dateKey, data, userData, history) {
  try {
    const baseSteps = userData.baseSteps || 5000;
    let goalForThisDay;

    if (dateKey === getDateKey()) {
      goalForThisDay = getCurrentGoal(userData, history);
    } else {
      const prevDateKey = addDays(dateKey, -1);
      goalForThisDay = history[prevDateKey]
        ? calculateNewGoal(history[prevDateKey], baseSteps)
        : baseSteps;
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

    await db.collection('users').doc(userId)
      .collection('history').doc(dateKey).set(entry);

    return { success: true, entry };
  } catch (error) {
    return { success: false, error };
  }
}

// === СТАТИСТИКА ===

// Последние 7 дней
function getLast7DaysStats(history, metric) {
  const today = getDateKey();
  const stats = [];

  for (let i = 6; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    if (history[dateKey]) {
      stats.push({ date: dateKey, value: history[dateKey][metric] || 0 });
    }
  }
  return stats;
}

// === НЕДЕЛИ (БИНАРНЫЕ ПОКАЗАТЕЛИ) ===

function getWeeklyBinaryStats(history, key, weeksCount = 4) {
  const weeks = {};

  Object.entries(history).forEach(([dateKey, entry]) => {
    if (entry[key] === undefined) return;

    const date = dateFromKey(dateKey);
    const weekStart = getWeekStart(date);
    const weekKey = getDateKey(weekStart);

    if (!weeks[weekKey]) {
      weeks[weekKey] = { weekStart, done: 0, total: 0 };
    }

    weeks[weekKey].total++;
    if (entry[key] === 1) weeks[weekKey].done++;
  });

  return Object.values(weeks)
    .sort((a, b) => a.weekStart - b.weekStart)
    .slice(-weeksCount)
    .map(w => ({
      period: formatWeekPeriod(w.weekStart),
      done: w.done,
      total: w.total,
      percent: w.total > 0 ? Math.round((w.done / w.total) * 100) : 0
    }));
}

// === МЕСЯЦЫ (ИЗ НЕДЕЛЬ, ПО БОЛЬШИНСТВУ ДНЕЙ) ===

function getMonthlyBinaryStatsFromWeeks(history, key, monthsCount = 3) {
  const weekly = getWeeklyBinaryStats(history, key, 100);
  const months = {};

  weekly.forEach(week => {
    const start = getWeekStart(dateFromKey(`${week.period.split(' ')[0]}-01`));
    const end = getWeekEnd(start);

    let chosenMonth;
    if (start.getMonth() === end.getMonth()) {
      chosenMonth = start;
    } else {
      const daysStart = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() - start.getDate() + 1;
      const daysEnd = end.getDate();
      chosenMonth = daysStart >= daysEnd ? start : end;
    }

    const keyMonth = `${chosenMonth.getFullYear()}-${chosenMonth.getMonth()}`;
    if (!months[keyMonth]) {
      months[keyMonth] = { label: getMonthName(chosenMonth), done: 0, total: 0 };
    }

    months[keyMonth].done += week.done;
    months[keyMonth].total += week.total;
  });

  return Object.values(months)
    .slice(-monthsCount)
    .map(m => ({
      period: m.label,
      done: m.done,
      total: m.total,
      percent: m.total > 0 ? Math.round((m.done / m.total) * 100) : 0
    }));
}

// === АБСОЛЮТНЫЕ СТАТИСТИКИ ===

function getAbsoluteStats(history, metric) {
  let min = Infinity, max = -Infinity, sum = 0, count = 0;

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
// ===============================
// БИНАРНАЯ АГРЕГАЦИЯ (0 / 1)
// Неделя начинается с ПОНЕДЕЛЬНИКА
// ===============================

// Получить понедельник недели для dateKey
function getMonday(dateKey) {
  const d = dateFromKey(dateKey);
  const day = d.getDay(); // 0=вс, 1=пн
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return getDateKey(d);
}

// Агрегация по неделям для бинарных метрик
function getWeeklyBinaryStats(history, metric, weeksCount = 4) {
  const todayKey = getDateKey();
  const currentMonday = getMonday(todayKey);
  const weeks = [];

  for (let w = weeksCount - 1; w >= 0; w--) {
    const weekStart = addDays(currentMonday, -w * 7);
    const weekEnd = addDays(weekStart, 6);

    let done = 0;
    let total = 0;

    for (let i = 0; i < 7; i++) {
      const dateKey = addDays(weekStart, i);
      const entry = history[dateKey];
      if (entry && entry[metric] !== undefined) {
        total++;
        if (entry[metric] === 1) done++;
      }
    }

    if (total > 0) {
      weeks.push({
        period: `${formatDate(weekStart)} – ${formatDate(weekEnd)}`,
        done,
        total,
        percent: Math.round((done / total) * 100)
      });
    }
  }

  return weeks;
}

// Агрегация по месяцам ИЗ НЕДЕЛЬ
// Месяц определяется по большинству дней недели
function getMonthlyBinaryStatsFromWeeks(history, metric, monthsCount = 3) {
  const weeks = getWeeklyBinaryStats(history, metric, 12);
  const monthsMap = {};

  weeks.forEach(week => {
    const startKey = week.period.split('–')[0].trim();
    const startDate = new Date(startKey);
    const monthKey = `${startDate.getFullYear()}-${startDate.getMonth()}`;

    if (!monthsMap[monthKey]) {
      monthsMap[monthKey] = {
        done: 0,
        total: 0,
        label: startDate.toLocaleDateString('ru-RU', {
          month: 'long',
          year: 'numeric'
        })
      };
    }

    monthsMap[monthKey].done += week.done;
    monthsMap[monthKey].total += week.total;
  });

  return Object.values(monthsMap)
    .slice(-monthsCount)
    .map(m => ({
      period: m.label,
      done: m.done,
      total: m.total,
      percent: m.total > 0 ? Math.round((m.done / m.total) * 100) : 0
    }));
}


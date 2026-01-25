// ================================
// admin-logic.js (FIXED VERSION)
// Изолированная логика админ-панели
// ================================
//
// ✅ ИСПРАВЛЕНО: Добавлено подтягивание исходного и текущего веса из measurements
//
// Функционал:
// - Получение данных всех пользователей
// - Агрегация статистики по дням/неделям
// - Подсчёт прогресса и выполнения
// - ✅ НОВОЕ: Подсчёт исходного и текущего веса из измерений
//
// Требования окружения:
// - доступны глобальные: db, getDateKey, getMonday, getWeekDays, addDays, formatDate
// - подключение через <script> без type="module"

// === ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЕЙ ===

// Получить всех пользователей с их историей и измерениями
async function getAllUsersWithDetails() {
  try {
    const snapshot = await db.collection('users').get();
    const users = [];
    
    for (const doc of snapshot.docs) {
      const userData = { id: doc.id, ...doc.data() };
      
      // История активности
      const history = await getUserHistory(doc.id);
      
      // Измерения
      const measurements = await getUserMeasurements(doc.id);
      
      users.push({ ...userData, history, measurements });
    }
    
    return users;
  } catch (error) {
    console.error('Ошибка загрузки пользователей:', error);
    return [];
  }
}

// === АГРЕГАЦИЯ СТАТИСТИКИ ===

// Состояние за сегодня для пользователя
function getUserTodayState(user) {
  const today = getDateKey();
  const todayEntry = user.history[today];
  const currentGoal = getCurrentGoal(user, user.history);
  
  if (!todayEntry) {
    return {
      hasData: false,
      goal: currentGoal,
      steps: 0,
      progress: 0,
      morningExercise: false,
      workout: false,
      abs: false,
      water: null,
      nutrition: null
    };
  }
  
  return {
    hasData: true,
    goal: currentGoal,
    steps: todayEntry.totalSteps || 0,
    progress: Math.round((todayEntry.totalSteps || 0) / currentGoal * 100),
    morningExercise: todayEntry.morningExercise === 1,
    workout: todayEntry.workout === 1,
    abs: todayEntry.abs === 1,
    water: todayEntry.water,
    nutrition: todayEntry.nutrition
  };
}

// Состояние за вчера для пользователя
function getUserYesterdayState(user) {
  const yesterday = addDays(getDateKey(), -1);
  const yesterdayEntry = user.history[yesterday];
  
  if (!yesterdayEntry) {
    return {
      hasData: false,
      steps: 0,
      progress: 0,
      morningExercise: false,
      workout: false,
      abs: false
    };
  }
  
  const goal = yesterdayEntry.goal || 5000;
  
  return {
    hasData: true,
    steps: yesterdayEntry.totalSteps || 0,
    progress: Math.round((yesterdayEntry.totalSteps || 0) / goal * 100),
    morningExercise: yesterdayEntry.morningExercise === 1,
    workout: yesterdayEntry.workout === 1,
    abs: yesterdayEntry.abs === 1
  };
}

// Состояние за текущую неделю (понедельник - сегодня)
function getUserCurrentWeekState(user) {
  const today = getDateKey();
  const monday = getMonday(today);
  const weekDays = getWeekDays(monday);
  
  let totalDays = 0;
  let daysWithData = 0;
  let stepsSum = 0;
  let morningExerciseCount = 0;
  let workoutCount = 0;
  let absCount = 0;
  
  weekDays.forEach(dateKey => {
    // Считаем только до сегодня включительно
    if (dateKey <= today) {
      totalDays++;
      const entry = user.history[dateKey];
      
      if (entry) {
        daysWithData++;
        stepsSum += entry.totalSteps || 0;
        if (entry.morningExercise === 1) morningExerciseCount++;
        if (entry.workout === 1) workoutCount++;
        if (entry.abs === 1) absCount++;
      }
    }
  });
  
  return {
    totalDays,
    daysWithData,
    avgSteps: daysWithData > 0 ? Math.round(stepsSum / daysWithData) : 0,
    morningExercise: {
      done: morningExerciseCount,
      total: totalDays,
      percentage: totalDays > 0 ? Math.round((morningExerciseCount / totalDays) * 100) : 0
    },
    workout: {
      done: workoutCount,
      total: totalDays,
      percentage: totalDays > 0 ? Math.round((workoutCount / totalDays) * 100) : 0
    },
    abs: {
      done: absCount,
      total: totalDays,
      percentage: totalDays > 0 ? Math.round((absCount / totalDays) * 100) : 0
    }
  };
}

// === ДЕТАЛЬНАЯ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ===

// ✅ ИСПРАВЛЕНО: Целевой вес и текущие показатели
function getUserMeasurementsState(user) {
  const measurementsList = measurementsToList(user.measurements);
  
  if (measurementsList.length === 0) {
    return {
      hasData: false,
      startWeight: null,      // ✅ НОВОЕ: исходный вес (первая запись)
      currentWeight: null,    // текущий вес (последняя запись)
      targetWeight: user.targetWeight || null,
      lastMeasurement: null
    };
  }
  
  // measurementsList уже отсортирован по убыванию даты (последние записи первые)
  const latest = measurementsList[0]; // последняя запись
  const first = measurementsList[measurementsList.length - 1]; // первая запись
  
  return {
    hasData: true,
    startWeight: first.weight || null,        // ✅ НОВОЕ: исходный вес
    currentWeight: latest.weight || null,     // текущий вес
    targetWeight: user.targetWeight || null,
    lastMeasurement: latest,
    history: measurementsList.slice(0, 7) // последние 7 записей
  };
}

// Динамика по дням (последние 7 дней)
function getUserLast7DaysDynamics(user) {
  const today = getDateKey();
  const days = [];
  
  for (let i = 6; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    const entry = user.history[dateKey];
    
    days.push({
      date: dateKey,
      hasData: !!entry,
      steps: entry ? entry.totalSteps || 0 : 0,
      goal: entry ? entry.goal || 5000 : 5000,
      morningExercise: entry ? entry.morningExercise === 1 : false,
      workout: entry ? entry.workout === 1 : false,
      abs: entry ? entry.abs === 1 : false
    });
  }
  
  return days;
}

// Динамика по неделям (последние 4 недели)
function getUserLast4WeeksDynamics(user) {
  const today = getDateKey();
  const currentMonday = getMonday(today);
  const weeks = [];
  
  for (let w = 3; w >= 0; w--) {
    const weekMonday = addDays(currentMonday, -7 * w);
    const weekDays = getWeekDays(weekMonday);
    
    let stepsSum = 0;
    let daysWithData = 0;
    let morningExerciseCount = 0;
    let workoutCount = 0;
    let absCount = 0;
    let totalDaysInWeek = 0;
    
    weekDays.forEach(dateKey => {
      // Для текущей недели считаем только до сегодня
      if (w === 0 && dateKey > today) return;
      
      totalDaysInWeek++;
      const entry = user.history[dateKey];
      
      if (entry) {
        daysWithData++;
        stepsSum += entry.totalSteps || 0;
        if (entry.morningExercise === 1) morningExerciseCount++;
        if (entry.workout === 1) workoutCount++;
        if (entry.abs === 1) absCount++;
      }
    });
    
    const weekStart = weekDays[0];
    const weekEnd = w === 0 && weekDays[6] > today ? today : weekDays[6];
    
    weeks.push({
      period: `${formatDate(weekStart).split(' ')[0]}-${formatDate(weekEnd).split(' ')[0]}`,
      daysWithData,
      totalDays: totalDaysInWeek,
      avgSteps: daysWithData > 0 ? Math.round(stepsSum / daysWithData) : 0,
      morningExercise: {
        done: morningExerciseCount,
        total: totalDaysInWeek,
        percentage: totalDaysInWeek > 0 ? Math.round((morningExerciseCount / totalDaysInWeek) * 100) : 0
      },
      workout: {
        done: workoutCount,
        total: totalDaysInWeek,
        percentage: totalDaysInWeek > 0 ? Math.round((workoutCount / totalDaysInWeek) * 100) : 0
      },
      abs: {
        done: absCount,
        total: totalDaysInWeek,
        percentage: totalDaysInWeek > 0 ? Math.round((absCount / totalDaysInWeek) * 100) : 0
      }
    });
  }
  
  return weeks;
}

// ✅ ИСПРАВЛЕНО: Общая статистика за всё время (добавлена статистика по весу)
function getUserAllTimeStats(user) {
  const history = user.history;
  const totalDays = Object.keys(history).length;
  
  // ✅ НОВОЕ: Данные о весе
  const measurements = getUserMeasurementsState(user);
  const waterStats = getUserWaterStats(user.history);
  const nutritionStats = getUserNutritionStats(user.history);
  const sleepStats = getUserSleepStats(user.history);
  
  if (totalDays === 0) {
    return {
      totalDays: 0,
      avgSteps: 0,
      totalSteps: 0,
      minSteps: 0,
      maxSteps: 0,
      morningExercise: { done: 0, total: 0, percentage: 0 },
      workout: { done: 0, total: 0, percentage: 0 },
      abs: { done: 0, total: 0, percentage: 0 },
      water: waterStats,
      nutrition: nutritionStats,
      sleep: sleepStats,
      // ✅ НОВОЕ: данные о весе
      startWeight: measurements.startWeight,
      currentWeight: measurements.currentWeight,
      targetWeight: measurements.targetWeight
    };
  }
  
  let stepsSum = 0;
  let minSteps = Infinity;
  let maxSteps = -Infinity;
  let morningExerciseCount = 0;
  let workoutCount = 0;
  let absCount = 0;
  
  Object.values(history).forEach(entry => {
    if (entry.totalSteps !== undefined) {
      stepsSum += entry.totalSteps || 0;
      minSteps = Math.min(minSteps, entry.totalSteps || 0);
      maxSteps = Math.max(maxSteps, entry.totalSteps || 0);
    }
    if (entry.morningExercise === 1) morningExerciseCount++;
    if (entry.workout === 1) workoutCount++;
    if (entry.abs === 1) absCount++;
  });
  
  return {
    totalDays,
    avgSteps: Math.round(stepsSum / totalDays),
    totalSteps: stepsSum,
    minSteps: minSteps === Infinity ? 0 : minSteps,
    maxSteps: maxSteps === -Infinity ? 0 : maxSteps,
    morningExercise: {
      done: morningExerciseCount,
      total: totalDays,
      percentage: Math.round((morningExerciseCount / totalDays) * 100)
    },
    workout: {
      done: workoutCount,
      total: totalDays,
      percentage: Math.round((workoutCount / totalDays) * 100)
    },
    abs: {
      done: absCount,
      total: totalDays,
      percentage: Math.round((absCount / totalDays) * 100)
    },
    water: waterStats,
    nutrition: nutritionStats,
    sleep: sleepStats,
    // ✅ НОВОЕ: данные о весе
    startWeight: measurements.startWeight,
    currentWeight: measurements.currentWeight,
    targetWeight: measurements.targetWeight
  };
}

// ✅ НОВЫЕ ФУНКЦИИ: Статистика по воде, питанию и сну

function getUserWaterStats(history) {
  let sum = 0;
  let count = 0;
  
  Object.values(history).forEach(entry => {
    if (entry.water !== undefined && entry.water !== null) {
      sum += entry.water;
      count++;
    }
  });
  
  return {
    avg: count > 0 ? (sum / count).toFixed(1) : null,
    count: count
  };
}

function getUserNutritionStats(history) {
  let sum = 0;
  let count = 0;
  
  Object.values(history).forEach(entry => {
    if (entry.nutrition !== undefined && entry.nutrition !== null) {
      sum += entry.nutrition;
      count++;
    }
  });
  
  return {
    avg: count > 0 ? (sum / count).toFixed(1) : null,
    count: count
  };
}

function getUserSleepStats(history) {
  let totalMinutes = 0;
  let count = 0;
  let bedTimes = [];
  
  Object.values(history).forEach(entry => {
    if (entry.sleepDuration && entry.sleepDuration > 0) {
      totalMinutes += entry.sleepDuration;
      count++;
    }
    if (entry.bedTime) {
      bedTimes.push(entry.bedTime);
    }
  });
  
  // Средняя продолжительность сна
  const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : null;
  let avgDuration = null;
  if (avgMinutes !== null) {
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    avgDuration = `${hours}ч ${mins}мин`;
  }
  
// Среднее время отхода ко сну (примерное)
let avgBedTime = null;
if (bedTimes.length > 0) {
  // Конвертируем времена в минуты от полуночи
  const bedMinutes = bedTimes.map(time => {
    const [h, m] = time.split(':').map(Number);
    let minutes = h * 60 + m;
    // Если время с 00:00 до 05:59, считаем что это ночь (добавляем 24 часа)
    if (h >= 0 && h < 6) minutes += 24 * 60;
    return minutes;
  });

  const avgBedMinutes = Math.round(bedMinutes.reduce((a, b) => a + b, 0) / bedMinutes.length);
  // Нормализуем обратно к диапазону 0-1439
  const normalizedMinutes = avgBedMinutes >= 24 * 60 ? avgBedMinutes - 24 * 60 : avgBedMinutes;
  const bedH = Math.floor(normalizedMinutes / 60);  // ← переименовал h в bedH
  const bedM = normalizedMinutes % 60;              // ← переименовал m в bedM

  avgBedTime = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;
}

return {
  avgDuration: avgDuration,
  avgBedTime: avgBedTime,
  count: count
};

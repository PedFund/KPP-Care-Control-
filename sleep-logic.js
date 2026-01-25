// ================================
// sleep-logic.js
// Логика работы со сном
// ================================

// === РАСЧЁТ ДЛИТЕЛЬНОСТИ СНА ===

/**
 * Рассчитывает длительность сна в минутах
 * @param {string} bedTime - Время укладывания (формат "HH:MM", например "23:30")
 * @param {string} wakeTime - Время пробуждения (формат "HH:MM", например "07:00")
 * @returns {number} Длительность сна в минутах
 */
function calculateSleepDuration(bedTime, wakeTime) {
  if (!bedTime || !wakeTime) return 0;
  
  const [bedH, bedM] = bedTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  
  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;
  
  // Если время пробуждения раньше времени укладывания,
  // значит проснулись на следующий день
  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60; // Добавляем 24 часа
  }
  
  return wakeMinutes - bedMinutes;
}

/**
 * Форматирует длительность сна в читаемый вид
 * @param {number} minutes - Длительность в минутах
 * @returns {string} Форматированная строка ("7ч 30мин")
 */
function formatSleepDuration(minutes) {
  if (!minutes || minutes === 0) return '—';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}ч`;
  }
  
  return `${hours}ч ${mins}мин`;
}

/**
 * Конвертирует минуты в часы (с десятыми)
 * @param {number} minutes - Длительность в минутах
 * @returns {number} Длительность в часах (например, 7.5)
 */
function minutesToHours(minutes) {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * Определяет качество сна по длительности
 * @param {number} minutes - Длительность в минутах
 * @returns {object} Объект с цветом и текстом
 */
function getSleepQuality(minutes) {
  const hours = minutes / 60;
  
  if (hours < 6) {
    return {
      color: '#ef4444', // красный
      text: 'Мало',
      category: 'insufficient'
    };
  } else if (hours >= 6 && hours <= 8) {
    return {
      color: '#10b981', // зелёный
      text: 'Норма',
      category: 'normal'
    };
  } else {
    return {
      color: '#3b82f6', // синий
      text: 'Много',
      category: 'excess'
    };
  }
}

// === СТАТИСТИКА СНА ===

/**
 * Вычисляет статистику сна за период
 * @param {object} history - История записей
 * @returns {object} Статистика сна
 */
function calculateSleepStats(history) {
  const entries = Object.values(history).filter(e => e.bedTime && e.wakeTime);
  
  if (entries.length === 0) {
    return {
      totalDays: 0,
      avgDuration: 0,
      avgBedTime: null,
      avgWakeTime: null,
      minDuration: 0,
      maxDuration: 0
    };
  }
  
  // Средняя длительность
  const totalDuration = entries.reduce((sum, e) => sum + (e.sleepDuration || 0), 0);
  const avgDuration = Math.round(totalDuration / entries.length);
  
  // Минимальная и максимальная длительность
  const durations = entries.map(e => e.sleepDuration || 0);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  // Типичное (медианное) время укладывания
  const bedTimes = entries.map(e => {
    const [h, m] = e.bedTime.split(':').map(Number);
    let minutes = h * 60 + m;
    // Если время с 00:00 до 05:59, считаем что это ночь
    if (h >= 0 && h < 6) minutes += 24 * 60;
    return minutes;
  });
  
  // Сортировка
  bedTimes.sort((a, b) => a - b);
  
  // Медиана
  const mid = Math.floor(bedTimes.length / 2);
  const medianBedMinutes =
    bedTimes.length % 2 !== 0
      ? bedTimes[mid]
      : Math.round((bedTimes[mid - 1] + bedTimes[mid]) / 2);
  
  // Нормализация
  const normalizedMinutes = medianBedMinutes >= 24 * 60 ? medianBedMinutes - 24 * 60 : medianBedMinutes;
  const bedH = Math.floor(normalizedMinutes / 60);
  const bedM = normalizedMinutes % 60;
  const avgBedTime = `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`;
 
  // Среднее время пробуждения
  const wakeTimes = entries.map(e => {
    const [h, m] = e.wakeTime.split(':').map(Number);
    return h * 60 + m;
  });
  const avgWakeMinutes = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length);
  const avgWakeH = Math.floor(avgWakeMinutes / 60);
  const avgWakeM = avgWakeMinutes % 60;
  const avgWakeTime = `${String(avgWakeH).padStart(2, '0')}:${String(avgWakeM).padStart(2, '0')}`;
  
  return {
    totalDays: entries.length,
    avgDuration,
    avgBedTime,
    avgWakeTime,
    minDuration,
    maxDuration
  };
}

// === ПОДГОТОВКА ДАННЫХ ДЛЯ ГРАФИКОВ ===

/**
 * Подготавливает данные для графика времени укладывания
 * @param {array} users - Массив пользователей с историей
 * @param {array} dates - Массив дат для отображения
 * @returns {object} Данные для графика
 */
function prepareBedTimeChartData(users, dates) {
  const datasets = [];
  
  users.forEach((user, index) => {
    const color = USER_COLORS[index % USER_COLORS.length];
    
    const data = dates.map(date => {
      const entry = user.history[date];
      if (!entry || !entry.bedTime) return null;
      
      // Конвертируем время в минуты с полуночи
      const [h, m] = entry.bedTime.split(':').map(Number);
      let minutes = h * 60 + m;
      
      // Если время после полуночи (00:00-05:59), добавляем 24 часа
      // для корректного отображения на графике
      if (h < 6) minutes += 24 * 60;
      
      return minutes;
    });
    
    datasets.push({
      label: user.name,
      data: data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: 2,
      tension: 0.1,
      fill: false,
      pointRadius: 6,
      pointHoverRadius: 9,
      pointBorderWidth: 2,
      pointBorderColor: '#ffffff',
      pointBackgroundColor: color
    });
  });
  
  return { datasets };
}

/**
 * Подготавливает данные для графика длительности сна
 * @param {array} users - Массив пользователей с историей
 * @param {array} dates - Массив дат для отображения
 * @returns {object} Данные для графика
 */
function prepareSleepDurationChartData(users, dates) {
  const datasets = [];
  
  users.forEach((user, index) => {
    const color = USER_COLORS[index % USER_COLORS.length];
    
    const data = dates.map(date => {
      const entry = user.history[date];
      if (!entry || !entry.sleepDuration) return null;
      
      // Возвращаем длительность в часах
      return minutesToHours(entry.sleepDuration);
    });
    
    datasets.push({
      label: user.name,
      data: data,
      borderColor: color,
      backgroundColor: color + '50', // 50% прозрачность
      borderWidth: 2,
      tension: 0.1,
      fill: false,
      pointRadius: 6,
      pointHoverRadius: 9,
      pointBorderWidth: 2,
      pointBorderColor: '#ffffff',
      pointBackgroundColor: color
    });
  });
  
  return { datasets };
}

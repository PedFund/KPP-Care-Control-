// Модуль UI - отрисовка интерфейса
// ОБНОВЛЕНО: 2026-01-09 - Измерения: разделены разовые и регулярные поля

let currentUser = null;
let currentUserData = null;
let currentHistory = {};
let currentMeasurements = {};

// === НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ ===

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

// === ВКЛАДКИ ===

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      // Переключаем активную кнопку
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Переключаем контент
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabName}`).classList.add('active');
      
      // Загружаем данные для вкладки
      loadTabData(tabName);
    });
  });
}

// === ЭКРАН ПОЛЬЗОВАТЕЛЯ ===

async function renderUserScreen(userId) {
  currentUser = userId;
  
  // Загружаем данные
  currentUserData = await getUserData(userId);
  currentHistory = await getUserHistory(userId);
  currentMeasurements = await getUserMeasurements(userId);
  
  if (!currentUserData) {
    alert('Ошибка загрузки данных пользователя');
    logout();
    return;
  }
  
  // Обновляем приветствие
  document.getElementById('user-welcome').textContent = `Привет, ${currentUserData.name}! 👋`;
  
  // Отрисовываем сводку
  renderSummary();
  
  showScreen('user-screen');
}

// =====================================================
// НОВЫЕ ФУНКЦИИ ДЛЯ ВКЛАДКИ "СВОДКА" v4.7
// =====================================================

// Вспомогательные функции для визуализации

// Капли для воды (0-6)
function renderWaterDrops(waterValue) {
  const waterLabels = [
    'до 250 мл',
    'до 500 мл',
    'до 750 мл',
    'до 1 л',
    'до 1.5 л',
    'до 2 л',
    '2 л+'
  ];
  
  const drops = '💧'.repeat(Math.min(waterValue, 6));
  const emptyDrops = '○'.repeat(Math.max(0, 6 - waterValue));
  const label = waterLabels[waterValue] || waterLabels[0];
  
  return `<span class="water-drops">${drops}${emptyDrops}</span> <span class="water-label">${label}</span>`;
}

// Цветные кружки для питания (-2..+2)
function renderNutritionCircles(nutritionValue) {
  const colors = {
    '-2': '#e74c3c',  // красный (сильное недоедание)
    '-1': '#ff9999',  // розовый (небольшое недоедание)
    '0': '#2ecc71',   // зелёный (норма)
    '1': '#8b4513',   // коричневый (небольшое переедание)
    '2': '#2c3e50'    // чёрный (переедание)
  };
  
  const labels = {
    '-2': 'Сильное недоедание',
    '-1': 'Небольшое недоедание',
    '0': 'По плану',
    '1': 'Небольшое переедание',
    '2': 'Переедание'
  };
  
  let circles = '';
  for (let i = -2; i <= 2; i++) {
    const color = i === nutritionValue ? colors[i.toString()] : '#ddd';
    circles += `<span style="display: inline-block; width: 16px; height: 16px; border-radius: 50%; background-color: ${color}; margin: 0 2px;"></span>`;
  }
  
  const label = labels[nutritionValue.toString()] || 'По плану';
  
  return `<div class="nutrition-circles">${circles}</div><div class="nutrition-label">${label}</div>`;
}
 // === ОТОБРАЖЕНИЕ СНА ===
function renderSleepRow(bedTime, wakeTime, sleepDuration) {
  if (!bedTime || !wakeTime || !sleepDuration) {
    return `
      <div class="checklist-item">
        🛏️ Сон: <span style="color: #999;">—</span>
      </div>
    `;
  }

  const hours = Math.floor(sleepDuration / 60);
  const minutes = sleepDuration % 60;
  const durationText = minutes > 0 
    ? `${hours}ч ${minutes}мин` 
    : `${hours}ч`;

  // Цвет по длительности
  let color = '#999';
  if (sleepDuration < 420) color = '#ef4444';       // <7ч красный
  else if (sleepDuration <= 480) color = '#10b981'; // 7-8ч зеленый
  else color = '#3b82f6';                           // >8ч синий

  return `
    <div class="checklist-item">
      🛏️ Сон: 
      <span style="color: ${color}; font-weight: 500;">
        ${bedTime} → ${wakeTime} (${durationText})
      </span>
    </div>
  `;
}

// БЛОК 1: "Сегодня" (детальный чек-лист)
function renderTodayBlock(todayEntry, currentGoal) {
  const today = getDateKey();
  const todaySteps = todayEntry ? todayEntry.totalSteps : 0;
  const treadmillSteps = todayEntry ? todayEntry.treadmillSteps : 0;
  const morningExercise = todayEntry ? (todayEntry.morningExercise === 1 || todayEntry.morningExercise === true) : false;
  const workout = todayEntry ? (todayEntry.workout === 1 || todayEntry.workout === true) : false;
  const abs = todayEntry ? (todayEntry.abs === 1 || todayEntry.abs === true) : false;
  const water = todayEntry ? todayEntry.water : 0;
  const nutrition = todayEntry ? todayEntry.nutrition : 0;
  
  // Прогресс по шагам
  const progress = currentGoal > 0 ? Math.round((todaySteps / currentGoal) * 100) : 0;
  const progressColor = progress >= 100 ? '#2ecc71' : progress >= 70 ? '#f39c12' : '#e74c3c';
  
  // Формируем HTML
  const html = `
    <div class="summary-block today-block">
      <h3>📅 Сегодня <span style="font-size: 0.9em; color: #7f8c8d;">${formatDate(today)}</span></h3>
      <div class="today-checklist">
        
        <!-- Шаги -->
        <div class="checklist-row">
          <span class="row-label">🚶 Шаги:</span>
          <span class="row-value">
            ${todaySteps > 0 
              ? `<strong>${todaySteps.toLocaleString('ru-RU')}</strong> из ${currentGoal.toLocaleString('ru-RU')} (${progress}%)
                 <div class="progress-bar-mini" style="width: 100%; height: 8px; background-color: #ecf0f1; border-radius: 4px; margin-top: 4px; overflow: hidden;">
                   <div style="width: ${Math.min(progress, 100)}%; height: 100%; background-color: ${progressColor}; transition: width 0.3s;"></div>
                 </div>`
              : '<span style="color: #95a5a6;">—</span>'}
          </span>
        </div>
        
        <!-- Дорожка -->
        ${treadmillSteps > 0 
          ? `<div class="checklist-row">
               <span class="row-label">🏃 Дорожка:</span>
               <span class="row-value"><strong>${treadmillSteps.toLocaleString('ru-RU')}</strong> шагов</span>
             </div>`
          : ''}
        
        <!-- Зарядка -->
        <div class="checklist-row">
          <span class="row-label">🧘 Зарядка:</span>
          <span class="row-value">${morningExercise ? '✅' : '❌'}</span>
        </div>
        
        <!-- Тренировка -->
        <div class="checklist-row">
          <span class="row-label">🏋️ Тренировка:</span>
          <span class="row-value">${workout ? '✅' : '❌'}</span>
        </div>
        
        <!-- Пресс -->
        <div class="checklist-row">
          <span class="row-label">💪 Пресс:</span>
          <span class="row-value">${abs ? '✅' : '❌'}</span>
        </div>
        
        <!-- Вода -->
        <div class="checklist-row">
          <span class="row-label">💧 Вода:</span>
          <span class="row-value">${renderWaterDrops(water)}</span>
        </div>
        
        <!-- Питание -->
        <div class="checklist-row">
          <span class="row-label">🍽️ Питание:</span>
          <span class="row-value">${renderNutritionCircles(nutrition)}</span>
        </div>
        
        <!-- ✅ СОН -->
        ${renderSleepRow(
          todayEntry ? todayEntry.bedTime : null,
          todayEntry ? todayEntry.wakeTime : null,
          todayEntry ? todayEntry.sleepDuration : 0
        )}

      </div>
    </div>
  `;
  
  return html;
}

// БЛОК 2: Расчёт статистики за всё время (+ СОН)
function calculateStatistics(history) {
  const allDays = Object.keys(history);
  const daysWithData = allDays.filter(dateKey => {
    const entry = history[dateKey];
    return entry && (entry.totalSteps > 0 || entry.morningExercise !== undefined || entry.workout !== undefined || entry.abs !== undefined || entry.water !== undefined || entry.nutrition !== undefined);
  });
  
  let totalSteps = 0;
  let morningCount = 0;
  let workoutCount = 0;
  let absCount = 0;
  let waterSum = 0;
  let nutritionSum = 0;
  
  // ✅ НОВОЕ: Статистика сна
  let sleepDurationSum = 0;
  let sleepCount = 0;
  let bedTimeMinutesSum = 0;
  let bedTimeCount = 0;
  
  daysWithData.forEach(dateKey => {
    const entry = history[dateKey];
    totalSteps += entry.totalSteps || 0;
    if (entry.morningExercise === 1) morningCount++;
    if (entry.workout === 1) workoutCount++;
    if (entry.abs === 1) absCount++;
    waterSum += entry.water || 0;
    nutritionSum += entry.nutrition || 0;
  
    // ✅ НОВОЕ: Подсчёт сна
    if (entry.sleepDuration && entry.sleepDuration > 0) {
      sleepDurationSum += entry.sleepDuration;
      sleepCount++;
    }
    
     if (entry.bedTime) {
      const [hours, minutes] = entry.bedTime.split(':').map(Number);
      let totalMinutes = hours * 60 + minutes;
      // Если время с 00:00 до 05:59, считаем следующим днём
      if (hours >= 0 && hours < 6) totalMinutes += 24 * 60;
      bedTimeMinutesSum += totalMinutes;
      bedTimeCount++;
    }
  }); 
  const daysCount = daysWithData.length || 1; // Избегаем деления на 0
  const avgSteps = Math.round(totalSteps / daysCount);
  const morningPercent = Math.round((morningCount / daysCount) * 100);
  const workoutPercent = Math.round((workoutCount / daysCount) * 100);
  const absPercent = Math.round((absCount / daysCount) * 100);
  const waterAvg = (waterSum / daysCount).toFixed(1);
  const nutritionAvg = (nutritionSum / daysCount).toFixed(1);
  
  // Текстовая интерпретация питания
  const nutritionLabels = {
    '-2': 'Сильное недоедание',
    '-1': 'Небольшое недоедание',
    '0': 'По плану',
    '1': 'Небольшое переедание',
    '2': 'Переедание'
  };
  const nutritionRounded = Math.round(nutritionAvg);
  const nutritionText = nutritionLabels[nutritionRounded.toString()] || 'По плану';
  
  // ✅ НОВОЕ: Статистика сна
  let sleepStats = null;
  
  if (sleepCount > 0) {
    const avgDuration = Math.round(sleepDurationSum / sleepCount);
    const hours = Math.floor(avgDuration / 60);
    const minutes = avgDuration % 60;
    const avgDurationText = minutes > 0 ? `${hours}ч ${minutes}мин` : `${hours}ч`;
    
    // Цвет по длительности
    let durationColor = '#999';
    if (avgDuration < 420) durationColor = '#ef4444';       // <7ч красный
    else if (avgDuration <= 480) durationColor = '#10b981'; // 7-8ч зеленый
    else durationColor = '#3b82f6';                         // >8ч синий
    
    // Среднее время укладывания
    let avgBedTime = '—';
    if (bedTimeCount > 0) {
      const avgMinutes = Math.round(bedTimeMinutesSum / bedTimeCount);
      // Нормализуем обратно
      const normalized = avgMinutes >= 1440 ? avgMinutes - 1440 : avgMinutes;
      const bedHours = Math.floor(normalized / 60);
      const bedMinutes = normalized % 60;
      avgBedTime = `${String(bedHours).padStart(2, '0')}:${String(bedMinutes).padStart(2, '0')}`;
    }

    
    sleepStats = {
      avgDuration,
      avgDurationText,
      durationColor,
      avgBedTime,
      sleepCount
    };
  }
  
  return {
    daysCount,
    totalSteps,
    avgSteps,
    morningCount,
    morningPercent,
    workoutCount,
    workoutPercent,
    absCount,
    absPercent,
    waterAvg,
    nutritionAvg,
    nutritionText,
    sleepStats  // ✅ НОВОЕ ПОЛЕ
  };
}

// БЛОК 2: Рендер статистики (КОМПАКТНАЯ ВЕРСИЯ + СОН) - ИСПРАВЛЕНО v2
function renderStatisticsBlock(stats) {
  const html = `
    <div class="summary-block statistics-block">
      <h3 style="display: flex; align-items: center; gap: 8px; font-size: 1.2em; margin-bottom: 12px; color: #2c3e50 !important;">
        📊 Ваша статистика
      </h3>
      
      <p class="stat-period" style="margin-bottom: 15px; color: #2c3e50 !important;">Ведёте дневник: <strong>${stats.daysCount} дней</strong></p>
      
      <div class="today-checklist" style="gap: 8px;">
        
        <!-- Шаги -->
        <div class="checklist-row">
          <span class="row-label" style="color: #2c3e50 !important;">🚶 Шагов:</span>
          <span class="row-value" style="color: #2c3e50 !important;">
            Всего: <strong>${stats.totalSteps.toLocaleString('ru-RU')}</strong><br>
            Среднее: <strong>${stats.avgSteps.toLocaleString('ru-RU')}</strong> / день
          </span>
        </div>
        
        <!-- Зарядки -->
        <div class="checklist-row">
          <span class="row-label" style="color: #2c3e50 !important;">🧘 Зарядки:</span>
          <span class="row-value" style="color: #2c3e50 !important;"><strong>${stats.morningCount}</strong> / ${stats.daysCount} дней (${stats.morningPercent}%)</span>
        </div>
        
        <!-- Тренировки -->
        <div class="checklist-row">
          <span class="row-label" style="color: #2c3e50 !important;">🏋️ Тренировки:</span>
          <span class="row-value" style="color: #2c3e50 !important;"><strong>${stats.workoutCount}</strong> / ${stats.daysCount} дней (${stats.workoutPercent}%)</span>
        </div>
        
        <!-- Пресс -->
        <div class="checklist-row">
          <span class="row-label" style="color: #2c3e50 !important;">💪 Пресс:</span>
          <span class="row-value" style="color: #2c3e50 !important;"><strong>${stats.absCount}</strong> / ${stats.daysCount} дней (${stats.absPercent}%)</span>
        </div>
        
        <!-- Вода -->
        <div class="checklist-row">
          <span class="row-label" style="color: #2c3e50 !important;">💧 Вода:</span>
          <span class="row-value" style="color: #2c3e50 !important;">Среднее: <strong>${stats.waterAvg}</strong></span>
        </div>
        
        <!-- Питание -->
        <div class="checklist-row">
          <span class="row-label" style="color: #2c3e50 !important;">🍽️ Питание:</span>
          <span class="row-value" style="color: #2c3e50 !important;">Среднее: <strong>${stats.nutritionAvg}</strong> (${stats.nutritionText})</span>
        </div>
        
        <!-- ✅ СОН -->
        ${stats.sleepStats ? `
          <div class="checklist-row">
            <span class="row-label" style="color: #2c3e50 !important;">🛏️ Сон:</span>
            <span class="row-value" style="color: #2c3e50 !important;">
              Спите в среднем: <strong style="color: ${stats.sleepStats.durationColor} !important;">${stats.sleepStats.avgDurationText}</strong><br>
              Ложитесь примерно в: <strong>${stats.sleepStats.avgBedTime}</strong>
            </span>
          </div>
        ` : ''}
        
      </div>
    </div>
  `;
  
  return html;
}


// =====================================================
// ОБНОВЛЕННАЯ ФУНКЦИЯ renderSummary()
// =====================================================

function renderSummary() {
  const today = getDateKey();
  const todayEntry = currentHistory[today];
  const currentGoal = getCurrentGoal(currentUserData, currentHistory);
  
  // Дата (оставляем для совместимости, если нужно)
  document.getElementById('today-date').textContent = formatDate(today);
  
  // === НОВЫЕ БЛОКИ ===
  
  // Блок 1: Сегодня
  const todayBlockHTML = renderTodayBlock(todayEntry, currentGoal);
  
  // Блок 2: Статистика
  const stats = calculateStatistics(currentHistory);
  const statsBlockHTML = renderStatisticsBlock(stats);
  
  // Вставляем оба блока в контейнер "summary-blocks"
  const summaryBlocksContainer = document.getElementById('summary-blocks');
  if (summaryBlocksContainer) {
    summaryBlocksContainer.innerHTML = `
      <div class="summary-row">
        <div class="summary-col">${todayBlockHTML}</div>
        <div class="summary-col">${statsBlockHTML}</div>
      </div>
    `;
  }
  
  // === СТАРЫЕ БЛОКИ (убираем/скрываем) ===
  
  // Убираем "Норма шагов" (если есть отдельный блок)
  const goalBlock = document.getElementById('goal-block');
  if (goalBlock) goalBlock.style.display = 'none';
  
  // Убираем "Прогресс сегодня" (если есть отдельный блок)
  const progressBlock = document.getElementById('progress-block');
  if (progressBlock) progressBlock.style.display = 'none';
  
  // Убираем старый "Чек-лист дня" (если есть)
  const checklistBlock = document.getElementById('checklist-block');
  if (checklistBlock) checklistBlock.style.display = 'none';
  
  // === ОСТАВЛЯЕМ ===
  
  // Пропущенные дни
  renderMissingDays();
  
  // Заполняем форму ввода данных
  if (todayEntry) {
    document.getElementById('input-total-steps').value = todayEntry.totalSteps || '';
    document.getElementById('input-treadmill-steps').value = todayEntry.treadmillSteps || '';
    document.getElementById('input-morningExercise').checked = todayEntry.morningExercise === 1;
    document.getElementById('input-workout').checked = todayEntry.workout === 1;
    document.getElementById('input-abs').checked = todayEntry.abs === 1;
    document.getElementById('input-nutrition').value = todayEntry.nutrition || 0;
    // ✅ СОН
    document.getElementById('input-bed-time').value = todayEntry.bedTime || '';
    document.getElementById('input-wake-time').value = todayEntry.wakeTime || '';
    document.getElementById('input-water').value = todayEntry.water || 3;
  } else {
    document.getElementById('input-total-steps').value = '';
    document.getElementById('input-treadmill-steps').value = '';
    document.getElementById('input-morningExercise').checked = false;
    document.getElementById('input-workout').checked = false;
    document.getElementById('input-abs').checked = false;
    document.getElementById('input-nutrition').value = 0;
    document.getElementById('input-water').value = 3;
    // ✅ СОН (сброс)
    document.getElementById('input-bed-time').value = '';
    document.getElementById('input-wake-time').value = '';
  }
}

function renderChecklist(todayEntry) {
  const checklist = [
    { icon: '🚶', label: 'Шаги', key: 'totalSteps', check: (e) => e && e.totalSteps > 0 },
    { icon: '🏃', label: 'Дорожка', key: 'treadmillSteps', check: (e) => e && e.treadmillSteps > 0 },
    { icon: '🧘', label: 'Зарядка', key: 'morningExercise', check: (e) => e && e.morningExercise === 1 },
    { icon: '🏋️', label: 'Тренировка', key: 'workout', check: (e) => e && e.workout === 1 },
    { icon: '💪', label: 'Пресс', key: 'abs', check: (e) => e && e.abs === 1 },
    { icon: '💧', label: 'Вода', key: 'water', check: (e) => e && e.water >= 3 },
    { icon: '🍽️', label: 'Питание', key: 'nutrition', check: (e) => e && e.nutrition === 0 },
  ];
  
  const html = checklist.map(item => {
    const done = item.check(todayEntry);
    return `
      <div class="checklist-item ${done ? 'done' : ''}">
        <span class="checklist-icon">${done ? '✅' : '⬜'}</span>
        <span>${item.icon} ${item.label}</span>
      </div>
    `;
  }).join('');
  
  document.getElementById('daily-checklist').innerHTML = html;
}

function renderMissingDays() {
  const startDate = currentUserData.createdAt ? 
    getDateKey(currentUserData.createdAt.toDate()) : 
    getDateKey();
  
  const missing = findMissingDays(currentHistory, startDate);
  
  const container = document.getElementById('missing-days-alert');
  
  if (missing.length === 0) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';
  container.innerHTML = `
    <h3>⚠️ Пропущенные дни: ${missing.length}</h3>
    <p>Вы можете ввести данные за эти дни:</p>
    <div class="missing-days-list">
      ${missing.slice(0, 10).map(dateKey => `
        <button class="missing-day-btn" data-date="${dateKey}">
          ${formatDate(dateKey)}
        </button>
      `).join('')}
      ${missing.length > 10 ? `<p>...и ещё ${missing.length - 10} дней</p>` : ''}
    </div>
  `;
  
  // Обработчики для кнопок
  container.querySelectorAll('.missing-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dateKey = btn.dataset.date;
      openDayInputDialog(dateKey);
    });
  });
}

function openDayInputDialog(dateKey) {
  const entry = currentHistory[dateKey];
  
  const totalSteps = prompt(
    `${formatDate(dateKey)}\n\nВведите общее количество шагов:`,
    entry ? entry.totalSteps : ''
  );
  
  if (totalSteps === null) return;
  
  const treadmillSteps = prompt(
    `Введите шаги на дорожке:`,
    entry ? entry.treadmillSteps : ''
  );
  
  if (treadmillSteps === null) return;
  
  const morningExercise = confirm('Была зарядка? Ок - если сделана; Отмена - если отсутствовала');
  const workout = confirm('Была тренировка? Ок - если сделана; Отмена - если отсутствовала');
  const abs = confirm('Пресс был сделан? Ок - если сделан; Отмена - если не сделан');
  
  const nutrition = prompt(
    'Питание: введите значение от -2 до 2 (-2 = сильное НЕдоедание, -1 = небольшое НЕдоедание, 0 = НОРМА, 1 = небольшое ПЕРЕедание, 2 = сильное ПЕРЕедание)',
    entry ? entry.nutrition : '0'
  );
  
  const water = prompt(
    'Вода: : введите значение от 0 до 6 (0 = <250мл, 1 = 250-500мл, 2 = 500-750мл, 3 = 750-1000мл, 4 = 1-1.5л, 5 = 1.5-2л, 6 = >2л):',
    entry ? entry.water : '3'
  );
  
  // Сохраняем
  saveDayAndRefresh(dateKey, {
    totalSteps: totalSteps,
    treadmillSteps: treadmillSteps,
    morningExercise: morningExercise,
    workout: workout,
    abs: abs,
    nutrition: nutrition,
    water: water
  });
}

async function saveDayAndRefresh(dateKey, data) {
  const result = await saveDayData(currentUser, dateKey, data, currentUserData, currentHistory);
  
  if (result.success) {
    // Обновляем локальную копию
    currentHistory[dateKey] = result.entry;
    
    // Перерисовываем интерфейс
    renderSummary();
    
    alert('✅ Данные сохранены!');
  } else {
    alert('❌ Ошибка сохранения данных');
  }
}

// === ЗАГРУЗКА ДАННЫХ ДЛЯ ВКЛАДОК ===

function loadTabData(tabName) {
  switch (tabName) {
    case 'steps':
      renderStepsHistory();
      break;
    case 'morningExercise':
      renderMorningExerciseHistory();
      break;
    case 'abs':
      renderAbsHistory();
      break;
    case 'workout':
      renderWorkoutHistory();
      break;
    case 'water':
      renderWaterHistory();
      break;
    case 'nutrition':
      renderNutritionHistory();
      break;
      // В switch внутри setupTabs():
    case 'sleep':
      renderSleepHistory();
      break;
    case 'measurements':
      renderMeasurements();
      break;
  }
}

// === ИСТОРИЯ ШАГОВ ===

function renderStepsHistory() {
  const absolute = getAbsoluteStats(currentHistory, 'totalSteps');
  const last7Days = getLast7DaysStats(currentHistory, 'totalSteps');
  const weeks = getWeeklyStats(currentHistory, 'totalSteps', 4);
  const months = getMonthlyStats(currentHistory, 'totalSteps', 3);
  
  // Статистика
  document.getElementById('steps-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего записей</span>
      <span class="stat-value">${absolute.total}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Минимум</span>
      <span class="stat-value">${absolute.min.toLocaleString('ru-RU')}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Максимум</span>
      <span class="stat-value">${absolute.max.toLocaleString('ru-RU')}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Среднее</span>
      <span class="stat-value">${absolute.avg.toLocaleString('ru-RU')}</span>
    </div>
  `;
  
  // История
  let html = '';
  
  // Последние 7 дней (детально)
  if (last7Days.length > 0) {
    html += `
      <div class="history-section">
        <h4>Последние 7 дней</h4>
        <div class="history-grid">
          ${last7Days.map(item => {
            const entry = currentHistory[item.date];
            const percentage = entry ? (entry.totalSteps / entry.goal) * 100 : 0;
            const className = percentage >= 100 ? 'success' : percentage >= 85 ? 'warning' : 'danger';
            
            return `
              <div class="history-item ${className}">
                <div class="history-date">${getDayName(item.date)}, ${formatDate(item.date).split(' ')[0]}</div>
                <div class="history-value">${item.value.toLocaleString('ru-RU')}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  // Недели
  if (weeks.length > 0) {
    html += `
      <div class="history-section">
        <h4>По неделям (с понедельника)</h4>
        <div class="history-grid">
          ${weeks.map(week => `
            <div class="history-item">
              <div class="history-date">${week.period}</div>
              <div class="history-value">${week.avg.toLocaleString('ru-RU')}</div>
              <div style="font-size:0.75em;color:#666;">
                ${week.min}–${week.max}<br>
                (${week.count} дн.)
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  // Месяцы
  if (months.length > 0) {
    html += `
      <div class="history-section">
        <h4>По месяцам</h4>
        <div class="history-grid">
          ${months.map(month => `
            <div class="history-item">
              <div class="history-date">${month.period}</div>
              <div class="history-value">${month.avg.toLocaleString('ru-RU')}</div>
              <div style="font-size:0.75em;color:#666;">
                ${month.min}–${month.max}<br>
                (${month.count} дн.)
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  document.getElementById('steps-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИСТОРИЯ ЗАРЯДКИ ===
function renderMorningExerciseHistory() {
  const last7Days = getLast7DaysStats(currentHistory, 'morningExercise');
  const weeks = getWeeklyBinaryStats(currentHistory, 'morningExercise', 4);

  let totalDone = 0;
  let totalDays = 0;

  Object.values(currentHistory).forEach(entry => {
    if (entry.morningExercise !== undefined) {
      totalDays++;
      if (entry.morningExercise === 1) totalDone++;
    }
  });

  const percentage = totalDays > 0 ? Math.round((totalDone / totalDays) * 100) : 0;

  document.getElementById('morningExercise-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего дней</span>
      <span class="stat-value">${totalDays}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Выполнено</span>
      <span class="stat-value">${totalDone}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">% выполнения</span>
      <span class="stat-value">${percentage}%</span>
    </div>
  `;

  let html = '';

  if (last7Days.length > 0) {
    html += `
      <div class="history-section">
        <h4>Последние 7 дней</h4>
        <div class="history-grid">
          ${last7Days.map(item => `
            <div class="history-item ${item.value === 1 ? 'success' : ''}">
              <div class="history-date">
                ${getDayName(item.date)}, ${formatDate(item.date).split(' ')[0]}
              </div>
              <div class="history-value">
                ${item.value === 1 ? '✅ Выполнена' : '⬜ Не выполнена'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (weeks.length > 0) {
    html += `
      <div class="history-section">
        <h4>По неделям (с понедельника)</h4>
        <div class="history-grid">
          ${weeks.map(week => `
            <div class="history-item ${week.percentage >= 70 ? 'success' : week.percentage >= 50 ? 'warning' : ''}">
              <div class="history-date">${week.period}</div>
              <div class="history-value">${week.done} / ${week.total}</div>
              <div style="font-size:0.75em;color:#666;">${week.percentage}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  document.getElementById('morningExercise-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИСТОРИЯ ПРЕССА ===

function renderAbsHistory() {
  const last7Days = getLast7DaysStats(currentHistory, 'abs');
  const weeks = getWeeklyBinaryStats(currentHistory, 'abs', 4);
  const months = getMonthlyStats(currentHistory, 'abs', 3);
  
  // Подсчитываем выполнения
  let totalDone = 0;
  let totalDays = 0;
  Object.values(currentHistory).forEach(entry => {
    if (entry.abs !== undefined) {
      totalDays++;
      if (entry.abs === 1) totalDone++;
    }
  });
  
  const percentage = totalDays > 0 ? Math.round((totalDone / totalDays) * 100) : 0;
  
  document.getElementById('abs-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего дней</span>
      <span class="stat-value">${totalDays}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Выполнено</span>
      <span class="stat-value">${totalDone}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">% выполнения</span>
      <span class="stat-value">${percentage}%</span>
    </div>
  `;
  
  let html = '';
  
  if (last7Days.length > 0) {
    html += `
      <div class="history-section">
        <h4>Последние 7 дней</h4>
        <div class="history-grid">
          ${last7Days.map(item => `
            <div class="history-item ${item.value === 1 ? 'success' : ''}">
              <div class="history-date">${getDayName(item.date)}, ${formatDate(item.date).split(' ')[0]}</div>
              <div class="history-value">${item.value === 1 ? '✅ Сделан' : '⬜ Не сделан'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  if (weeks.length > 0) {
    html += `
      <div class="history-section">
        <h4>По неделям (с понедельника)</h4>
        <div class="history-grid">
          ${weeks.map(week => `
            <div class="history-item ${week.percentage >= 70 ? 'success' : week.percentage >= 50 ? 'warning' : ''}">
              <div class="history-date">${week.period}</div>
              <div class="history-value">${week.done} / ${week.total}</div>
              <div style="font-size:0.75em;color:#666;">${week.percentage}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  document.getElementById('abs-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИСТОРИЯ ТРЕНИРОВОК ===

function renderWorkoutHistory() {
  const last7Days = getLast7DaysStats(currentHistory, 'workout');
  const weeks = getWeeklyBinaryStats(currentHistory, 'workout', 4);
  const months = getMonthlyStats(currentHistory, 'workout', 3);
  
  let totalWorkouts = 0;
  let totalDays = 0;
  Object.values(currentHistory).forEach(entry => {
    if (entry.workout !== undefined) {
      totalDays++;
      if (entry.workout === 1) totalWorkouts++;
    }
  });
  
  const percentage = totalDays > 0 ? Math.round((totalWorkouts / totalDays) * 100) : 0;
  
  document.getElementById('workout-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего дней</span>
      <span class="stat-value">${totalDays}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Тренировок</span>
      <span class="stat-value">${totalWorkouts}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">% активности</span>
      <span class="stat-value">${percentage}%</span>
    </div>
  `;
  
  let html = '';
  
  if (last7Days.length > 0) {
    html += `
      <div class="history-section">
        <h4>Последние 7 дней</h4>
        <div class="history-grid">
          ${last7Days.map(item => `
            <div class="history-item ${item.value === 1 ? 'success' : ''}">
              <div class="history-date">${getDayName(item.date)}, ${formatDate(item.date).split(' ')[0]}</div>
              <div class="history-value">${item.value === 1 ? '✅ Была' : '⬜ Не было'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  if (weeks.length > 0) {
    html += `
      <div class="history-section">
        <h4>По неделям (с понедельника)</h4>
        <div class="history-grid">
          ${weeks.map(week => `
            <div class="history-item ${week.percentage >= 70 ? 'success' : week.percentage >= 50 ? 'warning' : ''}">
              <div class="history-date">${week.period}</div>
              <div class="history-value">${week.done} / ${week.total}</div>
              <div style="font-size:0.75em;color:#666;">${week.percentage}%</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  document.getElementById('workout-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИСТОРИЯ ВОДЫ ===

function renderWaterHistory() {
  const absolute = getAbsoluteStats(currentHistory, 'water');
  const last7Days = getLast7DaysStats(currentHistory, 'water');
  const weeks = getWeeklyWaterStats(currentHistory, 4);
  
  const waterLabels = ['<250мл', '250-500мл', '500-750мл', '750мл-1л', '1-1.5л', '1.5-2л', '>2л'];
  
  document.getElementById('water-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего записей</span>
      <span class="stat-value">${absolute.total}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Минимум</span>
      <span class="stat-value">${waterLabels[absolute.min] || '—'}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Максимум</span>
      <span class="stat-value">${waterLabels[absolute.max] || '—'}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Среднее</span>
      <span class="stat-value">${waterLabels[absolute.avg] || '—'}</span>
    </div>
  `;
  
  let html = '';
  
  if (last7Days.length > 0) {
    html += `
      <div class="history-section">
        <h4>Последние 7 дней</h4>
        <div class="history-grid">
          ${last7Days.map(item => {
            const className = item.value >= 4 ? 'success' : item.value >= 3 ? 'warning' : '';
            return `
              <div class="history-item ${className}">
                <div class="history-date">${getDayName(item.date)}, ${formatDate(item.date).split(' ')[0]}</div>
                <div class="history-value">${waterLabels[item.value] || '—'}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  if (weeks.length > 0) {
    html += `
      <div class="history-section">
        <h4>По неделям (с понедельника)</h4>
        <div class="history-grid">
          ${weeks.map(week => {
            const className = week.avg >= 4 ? 'success' : week.avg >= 3 ? 'warning' : '';
            return `
              <div class="history-item ${className}">
                <div class="history-date">${week.period}</div>
                <div class="history-value">${week.avgLabel}</div>
                <div style="font-size:0.75em;color:#666;">
                  ${week.minLabel}–${week.maxLabel}<br>
                  (${week.count} дн.)
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  document.getElementById('water-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИСПРАВЛЕНО: ИСТОРИЯ ПИТАНИЯ (с детальным распределением) ===
// Обновлено: 2026-01-09

function renderNutritionHistory() {
  const absolute = getAbsoluteStats(currentHistory, 'nutrition');
  const last7Days = getLast7DaysStats(currentHistory, 'nutrition');
  const weeks = getWeeklyNutritionStats(currentHistory, 4);
  
  const nutritionLabels = {
    '-2': 'Сильное недоедание',
    '-1': 'Небольшое недоедание',
    '0': 'По плану',
    '1': 'Небольшое переедание',
    '2': 'Сильное переедание'
  };
  
  document.getElementById('nutrition-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего записей</span>
      <span class="stat-value">${absolute.total}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Среднее</span>
      <span class="stat-value">${nutritionLabels[absolute.avg] || 'По плану'}</span>
    </div>
  `;
  
  let html = '';
  
  if (last7Days.length > 0) {
    html += `
      <div class="history-section">
        <h4>Последние 7 дней</h4>
        <div class="history-grid">
          ${last7Days.map(item => {
            const className = item.value === 0 ? 'success' : item.value === -1 ? 'warning' : item.value === 1 ? 'warning-light' : 'danger';
            return `
              <div class="history-item ${className}">
                <div class="history-date">${getDayName(item.date)}, ${formatDate(item.date).split(' ')[0]}</div>
                <div class="history-value" style="font-size:0.9em;">${nutritionLabels[item.value] || 'По плану'}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  if (weeks.length > 0) {
    html += `
      <div class="history-section">
        <h4>По неделям (с понедельника)</h4>
        <div class="history-grid">
          ${weeks.map(week => {
            // Определяем CSS класс по доминирующей категории
            const dominantValue = parseInt(week.dominantCategory);
            let className;
            if (dominantValue === 0) className = 'success';
            else if (dominantValue === -1) className = 'warning';
            else if (dominantValue === 1) className = 'warning-light';
            else className = 'danger';
          
            return `
              <div class="history-item ${className}">
                <div class="history-date">${week.period}</div>
                <div class="history-value" style="font-size:0.85em;">
                  <strong>${week.dominantLabel}</strong>
                </div>
                <div style="font-size:0.7em;color:#666;margin-top:4px;">
                  ${week.details}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  document.getElementById('nutrition-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИЗМЕРЕНИЯ (ОБНОВЛЕНО 2026-01-09) ===
// Изменения:
// - Разовые поля (рост, возраст, целевой вес) вынесены в отдельную секцию
// - История: дата, вес, грудь, талия, живот, бёдра, комментарий, До цели (вычисляемое)

async function renderMeasurements() {
  // Перезагружаем измерения при каждом открытии вкладки
  currentMeasurements = await getUserMeasurements(currentUser);
  const measurementsList = measurementsToList(currentMeasurements);
  const todayKey = getDateKey();
  const todayMeasurement = currentMeasurements[todayKey];
  
  // Получаем разовые данные из userData
  const height = currentUserData.height || '';
  const age = currentUserData.age || '';
  const targetWeight = currentUserData.targetWeight || '';
  
  // Получаем последнее измерение веса
  const latestWeight = getLastMeasurement(currentMeasurements);
  const currentWeight = latestWeight?.weight || null;
  
  // БЛОК 1: Разовые параметры (вводятся один раз)
  const onceParamsHtml = `
    <div class="input-section" style="background: #f8f9fa; border-left: 4px solid #667eea;">
      <h3>📋 Базовые параметры (вводятся один раз)</h3>
      <form id="once-params-form" class="compact-form">
        <div class="form-row">
          <label>
            Рост, см
            <input type="number" id="once-height" step="0.1" placeholder="Например: 175" value="${height}">
          </label>
          <label>
            Возраст, лет
            <input type="number" id="once-age" placeholder="Например: 30" value="${age}">
          </label>
          <label>
            Целевой вес, кг
            <input type="number" id="once-target-weight" step="0.1" placeholder="Например: 70" value="${targetWeight}">
          </label>
        </div>
        <button type="submit" class="btn-primary">Сохранить базовые параметры</button>
      </form>
    </div>
  `;
  
  // БЛОК 2: Текущий прогресс (если есть данные)
  let progressBlock = '';
  if (currentWeight && targetWeight) {
    const diff = targetWeight - currentWeight; // ИСПРАВЛЕНО: (целевой - текущий)
    const diffAbs = Math.abs(diff);
    const progressText = diff < 0 
      ? `Осталось сбросить: <strong>${diffAbs.toFixed(1)} кг</strong>` 
      : diff > 0 
        ? `Вес ниже целевого на: <strong>${diffAbs.toFixed(1)} кг</strong>` // ИСПРАВЛЕНО: правильный текст
        : `<strong>Цель достигнута! 🎉</strong>`;
    
    progressBlock = `
      <div class="measurements-progress" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <div style="display: flex; justify-content: space-around; text-align: center;">
          <div>
            <div style="font-size: 0.9em; opacity: 0.9;">Текущий вес</div>
            <div style="font-size: 1.8em; font-weight: bold;">${currentWeight.toFixed(1)} кг</div>
          </div>
          <div>
            <div style="font-size: 0.9em; opacity: 0.9;">Целевой вес</div>
            <div style="font-size: 1.8em; font-weight: bold;">${targetWeight} кг</div>
          </div>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 1.1em;">
          ${progressText}
        </div>
      </div>
    `;
  }
  
  // БЛОК 3: Регулярные измерения (вводятся часто)
  const regularMeasurementsHtml = `
    <div class="input-section">
      <h3>📏 Измерения за сегодня</h3>
      <form id="measurements-form-el" class="compact-form">
        <div class="form-row">
          <label>
            Вес, кг
            <input type="number" id="measurement-weight" step="0.1" placeholder="Например: 71.5" value="${todayMeasurement?.weight || ''}">
          </label>
          <label>
            Грудь, см
            <input type="number" id="measurement-chest" step="0.1" placeholder="Например: 95" value="${todayMeasurement?.chest || ''}">
          </label>
          <label>
            Талия, см
            <input type="number" id="measurement-waist" step="0.1" placeholder="Например: 80" value="${todayMeasurement?.waist || ''}">
          </label>
          <label>
            Живот, см
            <input type="number" id="measurement-belly" step="0.1" placeholder="Например: 85" value="${todayMeasurement?.belly || ''}">
          </label>
          <label>
            Бёдра, см
            <input type="number" id="measurement-hips" step="0.1" placeholder="Например: 100" value="${todayMeasurement?.hips || ''}">
          </label>
        </div>
        <div class="form-row">
          <label style="flex: 1;">
            Комментарий
            <input type="text" id="measurement-comment" placeholder="Опционально" value="${todayMeasurement?.comment || ''}">
          </label>
        </div>
        <button type="submit" class="btn-primary">Сохранить измерения</button>
      </form>
    </div>
  `;
  
  // Собираем всё вместе
  document.getElementById('measurements-form').innerHTML = onceParamsHtml + progressBlock + regularMeasurementsHtml;
  
  // ОБРАБОТЧИК: Сохранение базовых параметров
  document.getElementById('once-params-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newHeight = document.getElementById('once-height').value;
    const newAge = document.getElementById('once-age').value;
    const newTargetWeight = document.getElementById('once-target-weight').value;
    
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Сохраняем...';
    
    try {
      const updateData = {};
      if (newHeight) updateData.height = parseFloat(newHeight);
      if (newAge) updateData.age = parseInt(newAge);
      if (newTargetWeight) updateData.targetWeight = parseFloat(newTargetWeight);
      
      await db.collection('users').doc(currentUser).update(updateData);
      
      // Обновляем локальные данные
      currentUserData = { ...currentUserData, ...updateData };
      
      alert('✅ Базовые параметры сохранены!');
      renderMeasurements(); // Перерисовываем
    } catch (error) {
      console.error('Ошибка сохранения базовых параметров:', error);
      alert('❌ Ошибка сохранения базовых параметров');
      btn.disabled = false;
      btn.textContent = 'Сохранить базовые параметры';
    }
  });
  
  // ОБРАБОТЧИК: Сохранение регулярных измерений
  document.getElementById('measurements-form-el').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      weight: document.getElementById('measurement-weight').value,
      chest: document.getElementById('measurement-chest').value,
      waist: document.getElementById('measurement-waist').value,
      belly: document.getElementById('measurement-belly').value,
      hips: document.getElementById('measurement-hips').value,
      comment: document.getElementById('measurement-comment').value
    };
    
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Сохраняем...';
    
    const result = await saveMeasurement(currentUser, todayKey, data);
    
    if (result.success) {
      alert('✅ Измерения сохранены!');
      renderMeasurements(); // Перезагружаем вкладку
    } else {
      alert(`❌ ${result.message || 'Ошибка сохранения'}`);
      btn.disabled = false;
      btn.textContent = 'Сохранить измерения';
    }
  });
  
  // БЛОК 4: История измерений
  if (measurementsList.length === 0) {
    document.getElementById('measurements-history').innerHTML = '<p>Нет измерений</p>';
    return;
  }
  
  const historyHtml = `
    <div class="history-section">
      <h4>История измерений</h4>
      <div class="measurements-table">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Вес</th>
              <th>Грудь</th>
              <th>Талия</th>
              <th>Живот</th>
              <th>Бёдра</th>
              <th>Комментарий</th>
              <th>До цели</th>
            </tr>
          </thead>
          <tbody>
            ${measurementsList.slice(0, 30).map(m => {
              const toGoal = m.weight && targetWeight 
                ? (parseFloat(targetWeight) - m.weight).toFixed(1) // ИСПРАВЛЕНО: (целевой - текущий)
                : '—';
              const toGoalClass = toGoal !== '—' && parseFloat(toGoal) < 0 ? 'style="color: #e74c3c;"' : // ИСПРАВЛЕНО: красный при отрицательном
                                  toGoal !== '—' && parseFloat(toGoal) >= 0 ? 'style="color: #27ae60;"' : ''; // ИСПРАВЛЕНО: зелёный при >= 0
              
              return `
                <tr>
                  <td>${formatDate(m.dateKey).split(' ').slice(0, 2).join(' ')}</td>
                  <td><strong>${formatOptionalNumber(m.weight, 1)}</strong></td>
                  <td>${formatOptionalNumber(m.chest, 1)}</td>
                  <td>${formatOptionalNumber(m.waist, 1)}</td>
                  <td>${formatOptionalNumber(m.belly, 1)}</td>
                  <td>${formatOptionalNumber(m.hips, 1)}</td>
                  <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${m.comment || '—'}</td>
                  <td ${toGoalClass}><strong>${toGoal !== '—' ? (toGoal > 0 ? '+' + toGoal : toGoal) + ' кг' : '—'}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${measurementsList.length > 30 ? `<p style="text-align: center; color: #666; margin-top: 10px;">...и ещё ${measurementsList.length - 30} записей</p>` : ''}
    </div>
  `;
  
  document.getElementById('measurements-history').innerHTML = historyHtml;
}

// === АДМИН-ПАНЕЛЬ ===



// Добавить эту функцию в ui.js
// Требуется: Chart.js (уже подключен в проекте)

// Цветовая схема для участников
const USER_COLORS = [
  '#3498db', // синий
  '#e74c3c', // красный
  '#2ecc71', // зелёный
  '#f39c12', // оранжевый
  '#9b59b6', // фиолетовый
  '#1abc9c', // бирюзовый
  '#e67e22', // тёмно-оранжевый
  '#34495e', // тёмно-серый
  '#16a085', // тёмно-бирюзовый
  '#c0392b'  // тёмно-красный
];

// Кэш графиков для обновления
let adminCharts = {};

// === ФУНКЦИЯ ОТРИСОВКИ ДЕТАЛЬНОЙ АДМИН-ПАНЕЛИ ===

async function renderAdminDetailedView() {
  const users = await getAllUsers();
  
  if (!users || users.length === 0) {
    document.getElementById('admin-detailed-content').innerHTML = '<p>Нет данных для отображения</p>';
    return;
  }
  
  // Подготовка данных
  const chartData = prepareChartData(users);
  
  // HTML для 8 графиков
const html = `
  <div class="admin-charts-grid">
    <div class="chart-container">
      <h3>📊 Питание</h3>
      <canvas id="chart-nutrition"></canvas>
    </div>
    <div class="chart-container">
      <h3>🚶 Шаги</h3>
      <canvas id="chart-steps"></canvas>
    </div>
    <div class="chart-container">
      <h3>🌅 Зарядки</h3>
      <canvas id="chart-morning"></canvas>
    </div>
    <div class="chart-container">
      <h3>💪 Тренировки</h3>
      <canvas id="chart-workouts"></canvas>
    </div>
    <div class="chart-container">
      <h3>🏋️ Пресс</h3>
      <canvas id="chart-abs"></canvas>
    </div>
    <div class="chart-container">
      <h3>💧 Вода</h3>
      <canvas id="chart-water"></canvas>
    </div>
    <!-- ✅ НОВЫЕ ГРАФИКИ СНА -->
    <div class="chart-container">
      <h3>🌙 Время укладывания</h3>
      <canvas id="chart-bedtime"></canvas>
    </div>
    <div class="chart-container">
      <h3>⏰ Длительность сна</h3>
      <canvas id="chart-sleepDuration"></canvas>
    </div>
  </div>
`;
  
  document.getElementById('admin-detailed-content').innerHTML = html;
  
  // Отрисовываем графики
  setTimeout(() => {
    renderChart('nutrition', chartData, '🍽️ Питание');
    renderChart('steps', chartData, '🚶 Шаги');
    renderChart('morning', chartData, '🌅 Зарядки');
    renderChart('workouts', chartData, '💪 Тренировки');
    renderChart('abs', chartData, '🏋️ Пресс');
    renderChart('water', chartData, '💧 Вода');
   // ✅ НОВЫЕ ГРАФИКИ СНА
    renderChart('bedtime', chartData, '🌙 Время укладывания');
    renderChart('sleepDuration', chartData, '⏰ Длительность сна');
  }, 100);
}

// === ПОДГОТОВКА ДАННЫХ ДЛЯ ГРАФИКОВ ===

function prepareChartData(users) {
  // ИЗМЕНЕНИЕ 2: Получаем последние 10 дней (было 30)
  const today = getDateKey();
  const dates = [];
  for (let i = 13; i >= 0; i--) {
    dates.push(addDays(today, -i));
  }
  
  // Подготовка данных для каждого участника
  const datasets = {};
  
  users.forEach((user, index) => {
    const color = USER_COLORS[index % USER_COLORS.length];
    const userName = user.name;
    
    // ИЗМЕНЕНИЕ 3: Данные по датам для каждой метрики
    // Если данных нет в БД, оставляем null (не будет точки)
    const nutrition = dates.map(date => {
      const entry = user.history[date];
      return entry && entry.nutrition !== undefined ? entry.nutrition : null;
    });
    
    const steps = dates.map(date => {
      const entry = user.history[date];
      return entry && entry.totalSteps !== undefined ? entry.totalSteps : null;
    });
    
    // ИЗМЕНЕНИЕ 1 и 3: Для бинарных метрик (Да/Нет)
    // Если данных нет в истории, возвращаем null (не будет точки)
    // Если данные есть, возвращаем 1 или 0
   const morning = dates.map(date => {
    const entry = user.history[date];
    if (!entry) return null;
    return (entry.morningExercise === 1 || entry.morningExercise === true) ? 1 : 0;
  });
  
  const workouts = dates.map(date => {
    const entry = user.history[date];
    if (!entry) return null;
    return (entry.workout === 1 || entry.workout === true) ? 1 : 0;
  });
  
  const abs = dates.map(date => {
    const entry = user.history[date];
    if (!entry) return null;
    return (entry.abs === 1 || entry.abs === true) ? 1 : 0;
  });
    
    const water = dates.map(date => {
      const entry = user.history[date];
      return entry && entry.water !== undefined ? entry.water : null;
    });
    
    // Добавляем датасеты
    if (!datasets.nutrition) datasets.nutrition = [];
    if (!datasets.steps) datasets.steps = [];
    if (!datasets.morning) datasets.morning = [];
    if (!datasets.workouts) datasets.workouts = [];
    if (!datasets.abs) datasets.abs = [];
    if (!datasets.water) datasets.water = [];
    
    datasets.nutrition.push({
      label: userName,
      data: nutrition,
      borderColor: color,
      backgroundColor: color + '30',
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      spanGaps: true // Соединяет точки через пропуски
    });
    
    datasets.steps.push({
      label: userName,
      data: steps,
      borderColor: color,
      backgroundColor: color + '30',
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      spanGaps: true
    });
    
    // ИЗМЕНЕНИЕ 4: Для бинарных метрик убираем stepped и добавляем spanGaps: false
    // Это даст прямые линии между точками без зубцов
    datasets.morning.push({
      label: userName,
      data: morning,
      borderColor: color,
      backgroundColor: color + '50',
      borderWidth: 2,
      tension: 0, // Прямые линии
      fill: false,
      spanGaps: false // НЕ соединяем через пропуски
    });
    
    datasets.workouts.push({
      label: userName,
      data: workouts,
      borderColor: color,
      backgroundColor: color + '50',
      borderWidth: 2,
      tension: 0,
      fill: false,
      spanGaps: false
    });
    
    datasets.abs.push({
      label: userName,
      data: abs,
      borderColor: color,
      backgroundColor: color + '50',
      borderWidth: 2,
      tension: 0,
      fill: false,
      spanGaps: false
    });
    
    datasets.water.push({
      label: userName,
      data: water,
      borderColor: color,
      backgroundColor: color + '30',
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      spanGaps: true
    });
    // ✅ НОВОЕ: Время укладывания (bedTime)
// Конвертируем "23:30" → минуты от полуночи (23*60 + 30 = 1410)
// Для отображения: если >= 20:00 (1200 мин), то показываем как есть
// Если < 6:00 (360 мин), добавляем 1440 (следующий день)
const bedtimeMinutes = dates.map(date => {
  const entry = user.history[date];
  if (!entry || !entry.bedTime) return null;
  
  const [hours, minutes] = entry.bedTime.split(':').map(Number);
  let totalMinutes = hours * 60 + minutes;
  
  // Если время раннее утро (00:00 - 05:59), считаем следующим днём
  if (totalMinutes < 360) {
    totalMinutes += 1440;
  }
  
  return totalMinutes;
});

// ✅ НОВОЕ: Длительность сна (в часах для удобства отображения)
const sleepDurationHours = dates.map(date => {
  const entry = user.history[date];
  if (!entry || !entry.sleepDuration) return null;
  return (entry.sleepDuration / 60).toFixed(1); // Минуты → часы
});

// Добавляем датасеты
if (!datasets.bedtime) datasets.bedtime = [];
if (!datasets.sleepDuration) datasets.sleepDuration = [];

datasets.bedtime.push({
  label: userName,
  data: bedtimeMinutes,
  borderColor: color,
  backgroundColor: color + '50',
  borderWidth: 2,
  tension: 0,
  fill: false,
  spanGaps: false,
  pointRadius: 5,
  pointHoverRadius: 7
});

datasets.sleepDuration.push({
  label: userName,
  data: sleepDurationHours,
  backgroundColor: color + '80',
  borderColor: color,
  borderWidth: 1
});
  });
  
  return {
    dates: dates,
    datasets: datasets
  };
}

// === ОТРИСОВКА ГРАФИКА ===

function renderChart(metricKey, chartData, title) {
  const ctx = document.getElementById(`chart-${metricKey}`);
  
  if (!ctx) {
    console.error(`Canvas для ${metricKey} не найден`);
    return;
  }
  
  // Уничтожаем старый график если есть
  if (adminCharts[metricKey]) {
    adminCharts[metricKey].destroy();
   }
  // ✅ JITTER ПЛАГИН
  const jitterPlugin = {
    id: 'jitterPlugin',
    afterDatasetsDraw(chart) {
      if (metricKey !== 'morning' && metricKey !== 'workouts' && metricKey !== 'abs') {
        return;
      }
      
      const yScale = chart.scales.y;
      if (!yScale) return;
      
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta || !meta.data) return;
        
        const totalDatasets = chart.data.datasets.length;
        const jitterRange = 0.15;
        const jitterStep = totalDatasets > 1 ? (jitterRange * 2) / (totalDatasets - 1) : 0;
        const jitterOffset = -jitterRange + (datasetIndex * jitterStep);
        
        meta.data.forEach((point, index) => {
          const value = dataset.data[index];
          if (value === 0 || value === 1) {
            const baseY = yScale.getPixelForValue(value);
            const pixelOffset = jitterOffset * 20;
            point.y = baseY + pixelOffset;
          }
        });
      });
    }
  };

    // Форматируем даты для отображения
  const labels = chartData.dates.map(d => {
    const date = dateFromKey(d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  });
  
  // Конфигурация графика
  const config = {
    type: metricKey === 'sleepDuration' ? 'bar' : 'line',
    data: { 
      labels: labels,
      datasets: chartData.datasets[metricKey]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'top',
          align: 'start',
          labels: {
            usePointStyle: true,
            padding: 8,
            boxWidth: 12,
            font: {
              size: window.innerWidth < 768 ? 10 : 11
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 12,
          titleFont: {
            size: 13
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            title: function(context) {
              return chartData.dates[context[0].dataIndex];
            },
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              
              if (metricKey === 'nutrition') {
                const value = context.parsed.y;
                const labels = {
                  '-2': 'Сильное недоедание',
                  '-1': 'Небольшое недоедание',
                  '0': 'По плану',
                  '1': 'Небольшое переедание',
                  '2': 'Переедание'
                };
                label += labels[value] || value;
              } else if (['morning', 'workouts', 'abs'].includes(metricKey)) {
                label += context.parsed.y === 1 ? 'Выполнено ✓' : 'Не выполнено';
              } else if (metricKey === 'water') {
                const waterValues = {
                  0: 'до 250 мл',
                  1: 'до 500 мл',
                  2: 'до 750 мл',
                  3: 'до 1 л',
                  4: 'до 1.5 л',
                  5: 'до 2 л',
                  6: '2 л+'
                };
                label += waterValues[context.parsed.y] || context.parsed.y + ' мл';
              } else if (metricKey === 'steps') {
                label += context.parsed.y.toLocaleString('ru-RU') + ' шагов';
              } else {
                label += context.parsed.y;
              }
              
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Дата'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 15
          }
        },
        y: {
          display: true,
          title: {
            display: true,
            text: getYAxisLabel(metricKey)
          },
          beginAtZero: metricKey !== 'nutrition' && metricKey !== 'bedtime',
          
          min: ['morning', 'workouts', 'abs'].includes(metricKey) ? -0.2 
               : metricKey === 'water' ? 0 
               : metricKey === 'nutrition' ? -2 
               : metricKey === 'bedtime' ? 1200
               : metricKey === 'sleepDuration' ? 0
               : undefined,
          
          max: ['morning', 'workouts', 'abs'].includes(metricKey) ? 1.2 
               : metricKey === 'water' ? 6 
               : metricKey === 'nutrition' ? 2 
               : metricKey === 'bedtime' ? 1560
               : metricKey === 'sleepDuration' ? 12
               : undefined,
          
          ticks: {
            stepSize: ['morning', 'workouts', 'abs'].includes(metricKey) ? 1 
                      : metricKey === 'water' ? 1 
                      : metricKey === 'nutrition' ? 1 
                      : metricKey === 'bedtime' ? 60
                      : metricKey === 'sleepDuration' ? 1
                      : undefined,
            
            autoSkip: metricKey === 'water' || metricKey === 'nutrition' ? false : true,
            
            callback: function(value) {
              if (metricKey === 'bedtime') {
                const hours = Math.floor(value / 60);
                const minutes = value % 60;
                const displayHours = hours >= 24 ? hours - 24 : hours;
                return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              }
              
              if (metricKey === 'sleepDuration') {
                return value + 'ч';
              }
              
              if (metricKey === 'nutrition') {
                const labels = {
                  '-2': 'Сильное недоедание',
                  '-1': 'Небольшое недоедание',
                  '0': 'По плану',
                  '1': 'Небольшое переедание',
                  '2': 'Переедание'
                };
                return labels[value] || value;
              } else if (['morning', 'workouts', 'abs'].includes(metricKey)) {
                if (value === 1) return 'Да';
                if (value === 0) return 'Нет';
                return '';
              } else if (metricKey === 'water') {
                const waterLabels = {
                  0: 'до 250',
                  1: 'до 500',
                  2: 'до 750',
                  3: 'до 1000',
                  4: 'до 1500',
                  5: 'до 2000',
                  6: '2000+'
                };
                return (waterLabels[value] || value) + ' мл';
              } else if (metricKey === 'steps') {
                return value.toLocaleString('ru-RU');
              }
              return value;
            }
          }
        }
      }
    }
  };
  
  // Создаём график
  adminCharts[metricKey] = new Chart(ctx, {
    ...config,
    plugins: [jitterPlugin]
  });
}


// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function getYAxisLabel(metricKey) {
  const labels = {
    'nutrition': 'Статус питания',
    'steps': 'Количество шагов',
    'morning': 'Зарядка',
    'workouts': 'Тренировка',
    'abs': 'Пресс',
    'water': 'Вода (мл)',
    'bedtime': 'Время',           // ✅ НОВОЕ
    'sleepDuration': 'Часы сна'   // ✅ НОВОЕ
  };
  return labels[metricKey] || '';
}

// === ОБНОВЛЕНИЕ renderAdminScreen ДЛЯ ПОДДЕРЖКИ ВКЛАДОК ===

// ЗАМЕНИТЬ существующую функцию renderAdminScreen на эту:

async function renderAdminScreen() {
  showScreen('admin-screen');
  
  // Проверяем, есть ли вкладки
  const overviewTab = document.getElementById('admin-tab-overview');
  const detailedTab = document.getElementById('admin-tab-detailed');
  
  if (!overviewTab || !detailedTab) {
    // Старая версия без вкладок - показываем только overview
    await renderAdminOverview();
    return;
  }
  
  // Настраиваем переключение вкладок
  setupAdminTabs();
  
  // По умолчанию показываем Overview
  await renderAdminOverview();
}

// ============================================
// ФУНКЦИЯ: renderAdminOverview() — ОБЗОР АДМИН-ПАНЕЛИ
// С ДОБАВЛЕНИЕМ ВЕСА (исходный / текущий / целевой)
// ============================================

async function renderAdminOverview() {
  const users = await getAllUsersWithDetails();

  if (!users || users.length === 0) {
    document.getElementById('admin-content').innerHTML = '<div class="admin-error">Нет данных пользователей</div>';
    return;
  }

  const userCards = users.map(user => {
    const stats = calculateStatistics(user.history);
    const daysCount = stats.daysCount;
    
    // Склонение слова "день"
    let daysText;
    if (daysCount % 10 === 1 && daysCount % 100 !== 11) {
      daysText = 'день';
    } else if ([2, 3, 4].includes(daysCount % 10) && ![12, 13, 14].includes(daysCount % 100)) {
      daysText = 'дня';
    } else {
      daysText = 'дней';
    }

    // ✅ ПОЛУЧЕНИЕ ДАННЫХ О ВЕСЕ
    const targetWeight = user.targetWeight || null;
    
    // Исходный и текущий вес — из measurements
    let startWeight = null;
    let currentWeight = null;
    if (user.measurements && Object.keys(user.measurements).length > 0) {
      // Сортируем даты в прямом порядке (от старых к новым)
      const sortedDates = Object.keys(user.measurements).sort((a, b) => a.localeCompare(b));
      
      // Исходный вес — первое измерение
      for (const date of sortedDates) {
        const entry = user.measurements[date];
        if (entry.weight && !isNaN(parseFloat(entry.weight))) {
          startWeight = parseFloat(entry.weight);
          break;
        }
      }
      
      // Текущий вес — последнее измерение (идем в обратном порядке)
      for (let i = sortedDates.length - 1; i >= 0; i--) {
        const entry = user.measurements[sortedDates[i]];
        if (entry.weight && !isNaN(parseFloat(entry.weight))) {
          currentWeight = parseFloat(entry.weight);
          break;
        }
      }
    }

    // Формирование строки веса
    let weightHTML = '';
    if (startWeight || currentWeight || targetWeight) {
      const startText = startWeight ? `${startWeight} кг` : '<span style="color: #999;">—</span>';
      const currentText = currentWeight ? `${currentWeight} кг` : '<span style="color: #999;">—</span>';
      const targetText = targetWeight ? `${targetWeight} кг` : '<span style="color: #999;">—</span>';

      weightHTML = `
        <div class="stat-row">
          <span class="stat-icon">⚖️</span>
          <span class="stat-label">Вес:</span>
          <span class="stat-value">
            Исходный: ${startText}<br>
            Текущий: ${currentText}<br>
            Целевой: ${targetText}
          </span>
        </div>
      `;
    }

    // Формирование статистики сна
    let sleepHTML = '';
    if (stats.sleepStats) {
      const { durationColor, avgDurationText, avgBedTime } = stats.sleepStats;
      sleepHTML = `
        <div class="stat-row">
          <span class="stat-icon">🛏️</span>
          <span class="stat-label">Сон:</span>
          <span class="stat-value">
            Спит в среднем: <span style="color: ${durationColor}; font-weight: 500;">${avgDurationText}</span><br>
            Ложится примерно в: ${avgBedTime}
          </span>
        </div>
      `;
    }

    return `
      <div class="user-card">
        <h3>${user.name}</h3>
        <p style="color: #666; margin-bottom: 15px;">
          Ведёт дневник: <strong>${daysCount}</strong> ${daysText}
        </p>
        
        <div class="user-stats-compact">
          <!-- ШАГИ -->
          <div class="stat-row">
            <span class="stat-icon">🚶</span>
            <span class="stat-label">Шагов:</span>
            <span class="stat-value">
              Всего: ${stats.totalSteps.toLocaleString()}<br>
              Среднее: ${stats.avgSteps} / день
            </span>
          </div>

          <!-- ЗАРЯДКИ -->
          <div class="stat-row">
            <span class="stat-icon">🧘</span>
            <span class="stat-label">Зарядки:</span>
            <span class="stat-value">
              ${stats.morningCount} / ${daysCount} дней (${stats.morningPercent}%)
            </span>
          </div>

          <!-- ТРЕНИРОВКИ -->
          <div class="stat-row">
            <span class="stat-icon">🏋️</span>
            <span class="stat-label">Тренировки:</span>
            <span class="stat-value">
              ${stats.workoutCount} / ${daysCount} дней (${stats.workoutPercent}%)
            </span>
          </div>

          <!-- ПРЕСС -->
          <div class="stat-row">
            <span class="stat-icon">💪</span>
            <span class="stat-label">Пресс:</span>
            <span class="stat-value">
              ${stats.absCount} / ${daysCount} дней (${stats.absPercent}%)
            </span>
          </div>

          <!-- ВОДА -->
          <div class="stat-row">
            <span class="stat-icon">💧</span>
            <span class="stat-label">Вода 0-6:</span>
            <span class="stat-value">Среднее: ${stats.waterAvg}</span>
          </div>

          <!-- ПИТАНИЕ -->
          <div class="stat-row">
            <span class="stat-icon">🍽️</span>
            <span class="stat-label">Питание -2 2:</span>
            <span class="stat-value">
              Среднее: ${stats.nutritionAvg} (${stats.nutritionText})
            </span>
          </div>

          <!-- ✅ ВЕС -->
          ${weightHTML}

          <!-- СОН -->
          ${sleepHTML}
        </div>
      </div>
    `;
  }).join('');

  // ✅ ВСТАВЛЯЕМ HTML В DOM!
  const html = `
    <div class="admin-overview-grid">
      ${userCards}
    </div>
  `;
  
 // Ищем существующий контейнер .admin-overview-grid
 const gridContainer = document.querySelector('.admin-overview-grid');
 
 if (gridContainer) {
   // Вставляем карточки напрямую в существующий grid
   gridContainer.innerHTML = userCards;
 } else {
   // Если grid не найден, создаём его и вставляем в admin-tab-overview
   const container = document.getElementById('admin-tab-overview') 
                    || document.getElementById('admin-content');
   if (container) {
     container.innerHTML = html;
   } else {
     console.error('❌ Контейнер для админ-панели не найден!');
   }
 }
}

// ============================================
// ЭКСПОРТ (если используется модульная система)
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAdminOverview };
}


// === НАСТРОЙКА ВКЛАДОК АДМИН-ПАНЕЛИ ===

function setupAdminTabs() {
  const overviewBtn = document.querySelector('[data-admin-tab="overview"]');
  const detailedBtn = document.querySelector('[data-admin-tab="detailed"]');
  
  if (!overviewBtn || !detailedBtn) return;
  
  // Удаляем старые обработчики
  overviewBtn.replaceWith(overviewBtn.cloneNode(true));
  detailedBtn.replaceWith(detailedBtn.cloneNode(true));
  
  // Получаем новые ссылки
  const newOverviewBtn = document.querySelector('[data-admin-tab="overview"]');
  const newDetailedBtn = document.querySelector('[data-admin-tab="detailed"]');
  
  // Обработчик для Overview
  newOverviewBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Переключаем активную кнопку
    document.querySelectorAll('[data-admin-tab]').forEach(btn => btn.classList.remove('active'));
    newOverviewBtn.classList.add('active');
    
    // Переключаем контент
    document.getElementById('admin-tab-overview').classList.add('active');
    document.getElementById('admin-tab-detailed').classList.remove('active');
    
    await renderAdminOverview();
  });
  
  // Обработчик для Детально
  newDetailedBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Переключаем активную кнопку
    document.querySelectorAll('[data-admin-tab]').forEach(btn => btn.classList.remove('active'));
    newDetailedBtn.classList.add('active');
    
    // Переключаем контент
    document.getElementById('admin-tab-overview').classList.remove('active');
    document.getElementById('admin-tab-detailed').classList.add('active');
    
    await renderAdminDetailedView();
  });
}
// === ИСТОРИЯ СНА ===
function renderSleepHistory() {
  const weekStats = getWeeklySleepStats(currentHistory);
  const monthStats = getMonthlySleepStats(currentHistory);
  
  // Подсчёт общей статистики
  let totalRecords = 0;
  let totalDuration = 0;
  
  Object.values(currentHistory).forEach(entry => {
    if (entry.bedTime && entry.wakeTime && entry.sleepDuration) {
      totalRecords++;
      totalDuration += entry.sleepDuration;
    }
  });
  
  const avgDuration = totalRecords > 0 ? totalDuration / totalRecords : 0;
  const avgHours = Math.floor(avgDuration / 60);
  const avgMinutes = Math.round(avgDuration % 60);
  
  // Статистика сверху
  document.getElementById('sleep-stats').innerHTML = `
    <div class="stat-item">
      <span class="stat-label">Всего записей</span>
      <span class="stat-value">${totalRecords}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Среднее</span>
      <span class="stat-value">${totalRecords > 0 ? `${avgHours}ч ${avgMinutes}мин` : '—'}</span>
    </div>
  `;
  
  // Последние 7 дней
  const weekHTML = weekStats.map(day => {
    if (!day.duration) {
      return `
        <div class="history-item">
          <div class="history-date">${day.displayDate}</div>
          <div class="history-value" style="color: #999;">—</div>
        </div>
      `;
    }
    
    const hours = Math.floor(day.duration / 60);
    const minutes = Math.round(day.duration % 60);
    const className = day.status === 'По плану' ? 'success' : day.status === 'Недосыпание' ? 'danger' : 'warning';
    
    return `
      <div class="history-item ${className}">
        <div class="history-date">${day.displayDate}</div>
        <div class="history-value">${hours}ч ${minutes > 0 ? minutes + 'мин' : ''}</div>
        <div style="font-size:0.75em;color:#666;">
          🛏️ ${day.bedTime} → ⏰ ${day.wakeTime}<br>
          ⏱️ ${hours}ч ${minutes > 0 ? minutes + 'мин' : ''}
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('sleep-last-week').innerHTML = weekHTML;
  
  // По неделям
  const monthHTML = monthStats.map(week => {
    const hours = Math.floor(week.avgDuration / 60);
    const minutes = Math.round(week.avgDuration % 60);
    const className = week.status === 'По плану' ? 'success' : week.status === 'Недосыпание' ? 'danger' : 'warning';
    
    return `
      <div class="history-item ${className}">
        <div class="history-date">${week.dateRange}</div>
        <div class="history-value">${hours}ч ${minutes > 0 ? minutes + 'мин' : ''}</div>
        <div style="font-size:0.75em;color:#666;">
          📊 ${week.records.length} дн. • Среднее: ${hours}ч ${minutes > 0 ? minutes + 'мин' : ''}
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('sleep-by-weeks').innerHTML = `<div class="history-grid">${monthHTML}</div>`;
}



// === ЭКСПОРТ ФУНКЦИЙ ===
// Эти функции нужно добавить в глобальную область видимости или модуль

// В конце ui.js добавить:
// window.renderAdminDetailedView = renderAdminDetailedView;
// window.setupAdminTabs = setupAdminTabs;


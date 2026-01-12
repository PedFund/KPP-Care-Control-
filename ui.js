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

function renderSummary() {
  const today = getDateKey();
  const todayEntry = currentHistory[today];
  const currentGoal = getCurrentGoal(currentUserData, currentHistory);
  
  // Дата
  document.getElementById('today-date').textContent = formatDate(today);
  
  // Норма шагов
  document.getElementById('current-goal').textContent = currentGoal.toLocaleString('ru-RU');
  
  // Прогресс
  const todaySteps = todayEntry ? todayEntry.totalSteps : 0;
  document.getElementById('today-steps').textContent = todaySteps.toLocaleString('ru-RU');
  
  const progress = Math.min(100, (todaySteps / currentGoal) * 100);
  document.getElementById('steps-progress').style.width = `${progress}%`;
  
  // Чек-лист
  renderChecklist(todayEntry);
  
  // Пропущенные дни
  renderMissingDays();
  
  // Заполняем форму
  if (todayEntry) {
    document.getElementById('input-total-steps').value = todayEntry.totalSteps || '';
    document.getElementById('input-treadmill-steps').value = todayEntry.treadmillSteps || '';
    document.getElementById('input-morningExercise').checked = todayEntry.morningExercise === 1;
    document.getElementById('input-workout').checked = todayEntry.workout === 1;
    document.getElementById('input-abs').checked = todayEntry.abs === 1;
    document.getElementById('input-nutrition').value = todayEntry.nutrition || 0;
    document.getElementById('input-water').value = todayEntry.water || 3;
  } else {
    document.getElementById('input-total-steps').value = '';
    document.getElementById('input-treadmill-steps').value = '';
    document.getElementById('input-morningExercise').checked = false;
    document.getElementById('input-workout').checked = false;
    document.getElementById('input-abs').checked = false;
    document.getElementById('input-nutrition').value = 0;
    document.getElementById('input-water').value = 3;
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
                ${entry ? `<div style="font-size:0.8em;color:#666;">норма: ${entry.goal}</div>` : ''}
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
            let className;if (dominantValue === 0) className = 'success';else if (dominantValue === -1) className = 'warning';else if (dominantValue === 1) className = 'warning-light';else className = 'danger';// OLD: 
                            Math.abs(dominantValue) === 1 ? 'warning' : 'danger';
            
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
  
  // HTML для 6 графиков
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
      if (!entry) return null; // Нет записи за день
      return entry.morningExercise === 1 ? 1 : 0;
    });
    
    const workouts = dates.map(date => {
      const entry = user.history[date];
      if (!entry) return null;
      return entry.workout === 1 ? 1 : 0;
    });
    
    const abs = dates.map(date => {
      const entry = user.history[date];
      if (!entry) return null;
      return entry.abs === 1 ? 1 : 0;
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
  
  // Форматируем даты для отображения
  const labels = chartData.dates.map(d => {
    const date = dateFromKey(d);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  });
  
  // Конфигурация графика
  const config = {
    type: 'line',
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
          align: 'start',  // Выравнивание слева
          labels: {
            usePointStyle: true,
            padding: 8,      // Уменьшаем отступ для мобильных
            boxWidth: 12,    // Меньше размер кружка
            font: {
              size: window.innerWidth < 768 ? 10 : 11  // Динамический размер
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
              
              // Специальная обработка для разных метрик
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
                // Конвертируем из диапазонов в мл (для tooltip)
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
          beginAtZero: metricKey !== 'nutrition',
          // Настройки для разных графиков:
          // Да-нет: от -0.2 до 1.2 (с паддингом)
          // Вода: от 0 до 6
          // Питание: от -2 до 2
          min: ['morning', 'workouts', 'abs'].includes(metricKey) ? -0.2 
               : metricKey === 'water' ? 0 
               : metricKey === 'nutrition' ? -2 
               : undefined,
          max: ['morning', 'workouts', 'abs'].includes(metricKey) ? 1.2 
               : metricKey === 'water' ? 6 
               : metricKey === 'nutrition' ? 2 
               : undefined,
          ticks: {
            // Шаг 1 для да-нет, воды, питания
            stepSize: ['morning', 'workouts', 'abs'].includes(metricKey) ? 1 
                      : metricKey === 'water' ? 1 
                      : metricKey === 'nutrition' ? 1 
                      : undefined,
            // Не пропускать метки для воды и питания
            autoSkip: metricKey === 'water' || metricKey === 'nutrition' ? false : true,
            callback: function(value) {
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
                // Да-Нет графики: показываем только 0 и 1
                if (value === 1) return 'Да';
                if (value === 0) return 'Нет';
                return '';  // Скрываем промежуточные значения
              } else if (metricKey === 'water') {
                // Подписи воды: до 250мл, до 500мл, до 750мл, до 1л, до 1.5л, до 2л, 2л+
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
  adminCharts[metricKey] = new Chart(ctx, config);
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

function getYAxisLabel(metricKey) {
  const labels = {
    'nutrition': 'Статус питания',
    'steps': 'Количество шагов',
    'morning': 'Зарядка',
    'workouts': 'Тренировка',
    'abs': 'Пресс',
    'water': 'Вода (мл)'
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

// === ФУНКЦИЯ ОБЗОРА (СТАРАЯ ЛОГИКА) ===

async function renderAdminOverview() {
  const users = await getAllUsers();
  
  const html = users.map(user => {
    const absolute = getAbsoluteStats(user.history, 'totalSteps');
    const currentGoal = getCurrentGoal(user, user.history);
    const today = getDateKey();
    const todayEntry = user.history[today];
    const todaySteps = todayEntry ? todayEntry.totalSteps : 0;
    
    let totalMorningExercises = 0;
    let totalAbs = 0;
    let totalWorkouts = 0;
    let totalDays = Object.keys(user.history).length;
    
    Object.values(user.history).forEach(entry => {
      if (entry.morningExercise === 1) totalMorningExercises++;
      if (entry.abs === 1) totalAbs++;
      if (entry.workout === 1) totalWorkouts++;
    });
    
    return `
      <div class="user-card">
        <h3>${user.name}</h3>
        <div class="user-stats">
          <div class="user-stat-item">
            <div class="user-stat-label">Норма шагов</div>
            <div class="user-stat-value">${currentGoal.toLocaleString('ru-RU')}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Сегодня шагов</div>
            <div class="user-stat-value">${todaySteps.toLocaleString('ru-RU')}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Дней записей</div>
            <div class="user-stat-value">${totalDays}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Мин шагов</div>
            <div class="user-stat-value">${absolute.min.toLocaleString('ru-RU')}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Макс шагов</div>
            <div class="user-stat-value">${absolute.max.toLocaleString('ru-RU')}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Средние шаги</div>
            <div class="user-stat-value">${absolute.avg.toLocaleString('ru-RU')}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Зарядки</div>
            <div class="user-stat-value">${totalMorningExercises}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Тренировки</div>
            <div class="user-stat-value">${totalWorkouts}</div>
          </div>
          <div class="user-stat-item">
            <div class="user-stat-label">Прессы</div>
            <div class="user-stat-value">${totalAbs}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('users-list').innerHTML = html || '<p>Нет пользователей</p>';
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

// === ЭКСПОРТ ФУНКЦИЙ ===
// Эти функции нужно добавить в глобальную область видимости или модуль

// В конце ui.js добавить:
// window.renderAdminDetailedView = renderAdminDetailedView;
// window.setupAdminTabs = setupAdminTabs;


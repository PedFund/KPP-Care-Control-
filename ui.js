// Модуль UI - отрисовка интерфейса

let currentUser = null;
let currentUserData = null;
let currentHistory = {};

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
  
  const morningExercise = confirm('Была зарядка?');
  const workout = confirm('Была тренировка?');
  const abs = confirm('Пресс был сделан?');
  
  const nutrition = prompt(
    'Питание (-2 = сильное недоедание, -1 = небольшое недоедание, 0 = норма, 1 = небольшое переедание, 2 = сильное переедание):',
    entry ? entry.nutrition : '0'
  );
  
  const water = prompt(
    'Вода (0 = <250мл, 1 = 250-500мл, 2 = 500-750мл, 3 = 750-1000мл, 4 = 1-1.5л, 5 = 1.5-2л, 6 = >2л):',
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

// === ИСТОРИЯ ПИТАНИЯ ===

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
            const className = item.value === 0 ? 'success' : Math.abs(item.value) === 1 ? 'warning' : 'danger';
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
            const className = week.avg === 0 ? 'success' : Math.abs(week.avg) === 1 ? 'warning' : 'danger';
            return `
              <div class="history-item ${className}">
                <div class="history-date">${week.period}</div>
                <div class="history-value" style="font-size:0.85em;">${week.avgLabel}</div>
                <div style="font-size:0.75em;color:#666;">(${week.count} дн.)</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
  
  document.getElementById('nutrition-history').innerHTML = html || '<p>Нет данных</p>';
}

// === ИЗМЕРЕНИЯ (НОВОЕ!) ===

async function renderMeasurements() {
  const measurements = await getUserMeasurements(currentUser);
  const measurementsList = measurementsToList(measurements);
  const todayKey = getDateKey();
  const todayMeasurement = measurements[todayKey];
  
  // Форма ввода
  const formHtml = `
    <div class="input-section">
      <h3>Добавить измерения за сегодня</h3>
      <form id="measurements-form-el" class="compact-form">
        <div class="form-row">
          <label>
            Вес, кг
            <input type="number" id="measurement-weight" step="0.1" placeholder="Например: 71.5" value="${todayMeasurement?.weight || ''}">
          </label>
          <label>
            Рост, см
            <input type="number" id="measurement-height" step="0.1" placeholder="Например: 175" value="${todayMeasurement?.height || ''}">
          </label>
          <label>
            Возраст, лет
            <input type="number" id="measurement-age" placeholder="Например: 30" value="${todayMeasurement?.age || ''}">
          </label>
        </div>
        <div class="form-row">
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
  
  document.getElementById('measurements-form').innerHTML = formHtml;
  
  // Обработчик формы
  document.getElementById('measurements-form-el').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
      weight: document.getElementById('measurement-weight').value,
      height: document.getElementById('measurement-height').value,
      age: document.getElementById('measurement-age').value,
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
  
  // История измерений
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
              <th>Рост</th>
              <th>Возраст</th>
              <th>Грудь</th>
              <th>Талия</th>
              <th>Живот</th>
              <th>Бёдра</th>
              <th>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            ${measurementsList.slice(0, 20).map(m => `
              <tr>
                <td>${formatDate(m.dateKey)}</td>
                <td>${formatOptionalNumber(m.weight, 1)}</td>
                <td>${formatOptionalNumber(m.height, 0)}</td>
                <td>${formatOptionalNumber(m.age, 0)}</td>
                <td>${formatOptionalNumber(m.chest, 1)}</td>
                <td>${formatOptionalNumber(m.waist, 1)}</td>
                <td>${formatOptionalNumber(m.belly, 1)}</td>
                <td>${formatOptionalNumber(m.hips, 1)}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${m.comment || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${measurementsList.length > 20 ? `<p style="text-align: center; color: #666;">...и ещё ${measurementsList.length - 20} записей</p>` : ''}
    </div>
  `;
  
  document.getElementById('measurements-history').innerHTML = historyHtml;
}

// === АДМИН-ПАНЕЛЬ ===

async function renderAdminScreen() {
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
  
  showScreen('admin-screen');
}

// СИМУЛЯТОР - работает без Firebase, использует localStorage

// === КОНФИГУРАЦИЯ ===

const ADMIN_CREDENTIALS = {
  login: 'admin',
  password: 'Kpp2026cc'
};

const AUTH_KEY = 'kpp_auth_session';
const USERS_KEY = 'kpp_users';
const HISTORY_KEY_PREFIX = 'kpp_history_';

// === УТИЛИТЫ ДЛЯ РАБОТЫ С ДАТАМИ ===

function getDateKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey, days) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + days);
  return getDateKey(date);
}

function formatDate(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  });
}

function getDayName(dateKey) {
  const date = dateFromKey(dateKey);
  return date.toLocaleDateString('ru-RU', { weekday: 'short' });
}

// === ХРАНИЛИЩЕ (localStorage вместо Firebase) ===

function getAllUsers() {
  const users = localStorage.getItem(USERS_KEY);
  return users ? JSON.parse(users) : [];
}

function saveAllUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getUserById(userId) {
  const users = getAllUsers();
  return users.find(u => u.id === userId);
}

function getUserHistory(userId) {
  const historyKey = HISTORY_KEY_PREFIX + userId;
  const history = localStorage.getItem(historyKey);
  return history ? JSON.parse(history) : {};
}

function saveUserHistory(userId, history) {
  const historyKey = HISTORY_KEY_PREFIX + userId;
  localStorage.setItem(historyKey, JSON.stringify(history));
}

// === АУТЕНТИФИКАЦИЯ ===

function getSession() {
  const session = localStorage.getItem(AUTH_KEY);
  return session ? JSON.parse(session) : null;
}

function saveSession(userId, isAdmin = false) {
  const session = { userId, isAdmin, timestamp: Date.now() };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

function isAdminLogin(username, password) {
  return username === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password;
}

function login(username, password) {
  if (isAdminLogin(username, password)) {
    saveSession('admin', true);
    return { success: true, isAdmin: true };
  }

  const users = getAllUsers();
  let existingUser = users.find(u => u.name === username);

  if (existingUser) {
    if (existingUser.password === password) {
      saveSession(existingUser.id, false);
      return { success: true, isAdmin: false, userId: existingUser.id };
    } else {
      return { success: false, error: 'Неверный пароль' };
    }
  } else {
    // Создаём нового пользователя
    const newUser = {
      id: 'user_' + Date.now(),
      name: username,
      password: password,
      baseSteps: 5000,
      treadmillGoal: 3000,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveAllUsers(users);
    saveSession(newUser.id, false);

    return { success: true, isAdmin: false, userId: newUser.id, isNewUser: true };
  }
}

function logout() {
  clearSession();
  location.reload();
}

// === ЛОГИКА РАСЧЁТА НОРМЫ ===

function calculateNewGoal(lastEntry, baseSteps) {
  const currentGoal = lastEntry.goal || baseSteps;
  const totalSteps = lastEntry.totalSteps || 0;
  const percentage = (totalSteps / currentGoal) * 100;

  let newGoal = currentGoal;

  if (percentage >= 100) {
    newGoal = currentGoal + 200;
  } else if (percentage >= 85) {
    newGoal = currentGoal;
  } else if (percentage >= 60) {
    newGoal = currentGoal - 100;
  } else {
    newGoal = currentGoal - 300;
  }

  newGoal = Math.max(baseSteps, newGoal);
  newGoal = Math.min(10000, newGoal);

  return newGoal;
}

function getCurrentGoal(userData, history) {
  const baseSteps = userData.baseSteps || 5000;
  
  if (!history || Object.keys(history).length === 0) {
    return baseSteps;
  }

  const sortedDates = Object.keys(history).sort((a, b) => b.localeCompare(a));
  const lastDateKey = sortedDates[0];
  const lastEntry = history[lastDateKey];

  return lastEntry.goal || baseSteps;
}

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

function saveDayData(userId, dateKey, data) {
  const userData = getUserById(userId);
  const history = getUserHistory(userId);
  const baseSteps = userData.baseSteps || 5000;

  let goalForThisDay;
  
  if (dateKey === getDateKey()) {
    goalForThisDay = getCurrentGoal(userData, history);
  } else {
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
    timestamp: new Date().toISOString()
  };

  history[dateKey] = entry;
  saveUserHistory(userId, history);

  return { success: true, entry };
}

// === СТАТИСТИКА ===

function getLast7DaysStats(history, metric) {
  const today = getDateKey();
  const stats = [];
  
  for (let i = 6; i >= 0; i--) {
    const dateKey = addDays(today, -i);
    const entry = history[dateKey];
    
    if (entry) {
      stats.push({ date: dateKey, value: entry[metric] || 0 });
    }
  }
  
  return stats;
}

function getWeeklyStats(history, metric, weeksCount = 4) {
  const today = getDateKey();
  const weeks = [];
  
  for (let w = weeksCount - 1; w >= 0; w--) {
    const weekEnd = addDays(today, -w * 7);
    const weekStart = addDays(weekEnd, -6);
    
    let sum = 0, count = 0, min = Infinity, max = -Infinity;
    
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

function getMonthlyStats(history, metric, monthsCount = 3) {
  const today = new Date();
  const months = [];
  
  for (let m = monthsCount - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const monthKey = monthDate.toISOString().slice(0, 7);
    
    let sum = 0, count = 0, min = Infinity, max = -Infinity;
    
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
}

// === UI ===

let currentUser = null;
let currentUserData = null;
let currentHistory = {};

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById(`tab-${tabName}`).classList.add('active');
      
      loadTabData(tabName);
    });
  });
}

function renderUserScreen(userId) {
  currentUser = userId;
  currentUserData = getUserById(userId);
  currentHistory = getUserHistory(userId);
  
  if (!currentUserData) {
    alert('Ошибка загрузки данных пользователя');
    logout();
    return;
  }
  
  document.getElementById('user-welcome').textContent = `Привет, ${currentUserData.name}! 👋`;
  renderSummary();
  showScreen('user-screen');
}

function renderSummary() {
  const today = getDateKey();
  const todayEntry = currentHistory[today];
  const currentGoal = getCurrentGoal(currentUserData, currentHistory);
  
  document.getElementById('today-date').textContent = formatDate(today);
  document.getElementById('current-goal').textContent = currentGoal.toLocaleString('ru-RU');
  
  const todaySteps = todayEntry ? todayEntry.totalSteps : 0;
  document.getElementById('today-steps').textContent = todaySteps.toLocaleString('ru-RU');
  
  const progress = Math.min(100, (todaySteps / currentGoal) * 100);
  document.getElementById('steps-progress').style.width = `${progress}%`;
  
  renderChecklist(todayEntry);
  renderMissingDays();
  
  if (todayEntry) {
    document.getElementById('input-total-steps').value = todayEntry.totalSteps || '';
    document.getElementById('input-treadmill-steps').value = todayEntry.treadmillSteps || '';
    document.getElementById('input-workout').checked = todayEntry.workout === 1;
    document.getElementById('input-abs').checked = todayEntry.abs === 1;
    document.getElementById('input-nutrition').value = todayEntry.nutrition || 0;
    document.getElementById('input-water').value = todayEntry.water || 3;
  } else {
    document.getElementById('input-total-steps').value = '';
    document.getElementById('input-treadmill-steps').value = '';
    document.getElementById('input-workout').checked = false;
    document.getElementById('input-abs').checked = false;
    document.getElementById('input-nutrition').value = 0;
    document.getElementById('input-water').value = 3;
  }
}

function renderChecklist(todayEntry) {
  const checklist = [
    { icon: '🚶', label: 'Шаги', check: (e) => e && e.totalSteps > 0 },
    { icon: '🏃', label: 'Дорожка', check: (e) => e && e.treadmillSteps > 0 },
    { icon: '🏋️', label: 'Тренировка', check: (e) => e && e.workout === 1 },
    { icon: '💪', label: 'Пресс', check: (e) => e && e.abs === 1 },
    { icon: '💧', label: 'Вода', check: (e) => e && e.water >= 3 },
    { icon: '🍽️', label: 'Питание', check: (e) => e && e.nutrition === 0 },
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
    getDateKey(new Date(currentUserData.createdAt)) : 
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
  
  container.querySelectorAll('.missing-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dateKey = btn.dataset.date;
      openDayInputDialog(dateKey);
    });
  });
}

function openDayInputDialog(dateKey) {
  const entry = currentHistory[dateKey];
  
  const totalSteps = prompt(`${formatDate(dateKey)}\n\nВведите общее количество шагов:`, entry ? entry.totalSteps : '');
  if (totalSteps === null) return;
  
  const treadmillSteps = prompt(`Введите шаги на дорожке:`, entry ? entry.treadmillSteps : '');
  if (treadmillSteps === null) return;
  
  const workout = confirm('Была тренировка?');
  const abs = confirm('Пресс был сделан?');
  
  const nutrition = prompt('Питание (-2..+2):', entry ? entry.nutrition : '0');
  const water = prompt('Вода (0..6):', entry ? entry.water : '3');
  
  saveDayAndRefresh(dateKey, {
    totalSteps, treadmillSteps, workout, abs, nutrition, water
  });
}

function saveDayAndRefresh(dateKey, data) {
  const result = saveDayData(currentUser, dateKey, data);
  
  if (result.success) {
    currentHistory[dateKey] = result.entry;
    renderSummary();
    alert('✅ Данные сохранены!');
  } else {
    alert('❌ Ошибка сохранения данных');
  }
}

function loadTabData(tabName) {
  switch (tabName) {
    case 'steps': renderStepsHistory(); break;
    case 'abs': renderAbsHistory(); break;
    case 'workout': renderWorkoutHistory(); break;
    case 'water': renderWaterHistory(); break;
    case 'nutrition': renderNutritionHistory(); break;
  }
}

// Копируем функции отрисовки истории из ui.js (сокращённо)

function renderStepsHistory() {
  const absolute = getAbsoluteStats(currentHistory, 'totalSteps');
  const last7Days = getLast7DaysStats(currentHistory, 'totalSteps');
  
  document.getElementById('steps-stats').innerHTML = `
    <div class="stat-item"><span class="stat-label">Всего записей</span><span class="stat-value">${absolute.total}</span></div>
    <div class="stat-item"><span class="stat-label">Минимум</span><span class="stat-value">${absolute.min.toLocaleString('ru-RU')}</span></div>
    <div class="stat-item"><span class="stat-label">Максимум</span><span class="stat-value">${absolute.max.toLocaleString('ru-RU')}</span></div>
    <div class="stat-item"><span class="stat-label">Среднее</span><span class="stat-value">${absolute.avg.toLocaleString('ru-RU')}</span></div>
  `;
  
  let html = last7Days.length > 0 ? `
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
  ` : '';
  
  document.getElementById('steps-history').innerHTML = html || '<p>Нет данных</p>';
}

function renderAbsHistory() {
  const last7Days = getLast7DaysStats(currentHistory, 'abs');
  let totalDone = 0, totalDays = 0;
  Object.values(currentHistory).forEach(entry => {
    if (entry.abs !== undefined) {
      totalDays++;
      if (entry.abs === 1) totalDone++;
    }
  });
  
  const percentage = totalDays > 0 ? Math.round((totalDone / totalDays) * 100) : 0;
  
  document.getElementById('abs-stats').innerHTML = `
    <div class="stat-item"><span class="stat-label">Всего дней</span><span class="stat-value">${totalDays}</span></div>
    <div class="stat-item"><span class="stat-label">Выполнено</span><span class="stat-value">${totalDone}</span></div>
    <div class="stat-item"><span class="stat-label">% выполнения</span><span class="stat-value">${percentage}%</span></div>
  `;
  
  let html = last7Days.length > 0 ? `
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
  ` : '';
  
  document.getElementById('abs-history').innerHTML = html || '<p>Нет данных</p>';
}

function renderWorkoutHistory() {
  const last7Days = getLast7DaysStats(currentHistory, 'workout');
  let totalWorkouts = 0, totalDays = 0;
  Object.values(currentHistory).forEach(entry => {
    if (entry.workout !== undefined) {
      totalDays++;
      if (entry.workout === 1) totalWorkouts++;
    }
  });
  
  const percentage = totalDays > 0 ? Math.round((totalWorkouts / totalDays) * 100) : 0;
  
  document.getElementById('workout-stats').innerHTML = `
    <div class="stat-item"><span class="stat-label">Всего дней</span><span class="stat-value">${totalDays}</span></div>
    <div class="stat-item"><span class="stat-label">Тренировок</span><span class="stat-value">${totalWorkouts}</span></div>
    <div class="stat-item"><span class="stat-label">% активности</span><span class="stat-value">${percentage}%</span></div>
  `;
  
  let html = last7Days.length > 0 ? `
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
  ` : '';
  
  document.getElementById('workout-history').innerHTML = html || '<p>Нет данных</p>';
}

function renderWaterHistory() {
  const absolute = getAbsoluteStats(currentHistory, 'water');
  const last7Days = getLast7DaysStats(currentHistory, 'water');
  const waterLabels = ['<250мл', '250-500мл', '500-750мл', '750мл-1л', '1-1.5л', '1.5-2л', '>2л'];
  
  document.getElementById('water-stats').innerHTML = `
    <div class="stat-item"><span class="stat-label">Всего записей</span><span class="stat-value">${absolute.total}</span></div>
    <div class="stat-item"><span class="stat-label">Минимум</span><span class="stat-value">${waterLabels[absolute.min] || '—'}</span></div>
    <div class="stat-item"><span class="stat-label">Максимум</span><span class="stat-value">${waterLabels[absolute.max] || '—'}</span></div>
  `;
  
  let html = last7Days.length > 0 ? `
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
  ` : '';
  
  document.getElementById('water-history').innerHTML = html || '<p>Нет данных</p>';
}

function renderNutritionHistory() {
  const absolute = getAbsoluteStats(currentHistory, 'nutrition');
  const last7Days = getLast7DaysStats(currentHistory, 'nutrition');
  const nutritionLabels = {'-2': 'Сильное недоедание', '-1': 'Небольшое недоедание', '0': 'По плану', '1': 'Небольшое переедание', '2': 'Сильное переедание'};
  
  document.getElementById('nutrition-stats').innerHTML = `
    <div class="stat-item"><span class="stat-label">Всего записей</span><span class="stat-value">${absolute.total}</span></div>
    <div class="stat-item"><span class="stat-label">Среднее</span><span class="stat-value">${nutritionLabels[absolute.avg] || 'По плану'}</span></div>
  `;
  
  let html = last7Days.length > 0 ? `
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
  ` : '';
  
  document.getElementById('nutrition-history').innerHTML = html || '<p>Нет данных</p>';
}

function renderAdminScreen() {
  const users = getAllUsers();
  
  const html = users.map(user => {
    const history = getUserHistory(user.id);
    const absolute = getAbsoluteStats(history, 'totalSteps');
    const currentGoal = getCurrentGoal(user, history);
    const today = getDateKey();
    const todayEntry = history[today];
    const todaySteps = todayEntry ? todayEntry.totalSteps : 0;
    
    let totalAbs = 0, totalWorkouts = 0, totalDays = Object.keys(history).length;
    Object.values(history).forEach(entry => {
      if (entry.abs === 1) totalAbs++;
      if (entry.workout === 1) totalWorkouts++;
    });
    
    return `
      <div class="user-card">
        <h3>${user.name}</h3>
        <div class="user-stats">
          <div class="user-stat-item"><div class="user-stat-label">Норма шагов</div><div class="user-stat-value">${currentGoal.toLocaleString('ru-RU')}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Сегодня шагов</div><div class="user-stat-value">${todaySteps.toLocaleString('ru-RU')}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Дней записей</div><div class="user-stat-value">${totalDays}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Мин шагов</div><div class="user-stat-value">${absolute.min.toLocaleString('ru-RU')}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Макс шагов</div><div class="user-stat-value">${absolute.max.toLocaleString('ru-RU')}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Средние шаги</div><div class="user-stat-value">${absolute.avg.toLocaleString('ru-RU')}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Тренировок</div><div class="user-stat-value">${totalWorkouts}</div></div>
          <div class="user-stat-item"><div class="user-stat-label">Пресс выполнен</div><div class="user-stat-value">${totalAbs}</div></div>
        </div>
      </div>
    `;
  }).join('');
  
  document.getElementById('users-list').innerHTML = html || '<p>Нет пользователей</p>';
  showScreen('admin-screen');
}

// === ИНИЦИАЛИЗАЦИЯ ===

document.addEventListener('DOMContentLoaded', () => {
  const session = getSession();
  
  if (session) {
    if (session.isAdmin) {
      renderAdminScreen();
    } else {
      renderUserScreen(session.userId);
    }
  } else {
    showScreen('login-screen');
  }
  
  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
      alert('Введите логин и пароль');
      return;
    }
    
    const result = login(username, password);
    
    if (result.success) {
      if (result.isAdmin) {
        renderAdminScreen();
      } else {
        renderUserScreen(result.userId);
        if (result.isNewUser) {
          alert(`Добро пожаловать, ${username}! 🎉\n\nВаш аккаунт создан.\nНачальная норма шагов: 5000`);
        }
      }
    } else {
      alert(`Ошибка входа: ${result.error}`);
    }
  });
  
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('admin-logout-btn').addEventListener('click', logout);
  
  setupTabs();
  
  document.getElementById('today-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const data = {
      totalSteps: document.getElementById('input-total-steps').value,
      treadmillSteps: document.getElementById('input-treadmill-steps').value,
      workout: document.getElementById('input-workout').checked,
      abs: document.getElementById('input-abs').checked,
      nutrition: document.getElementById('input-nutrition').value,
      water: document.getElementById('input-water').value
    };
    
    saveDayAndRefresh(getDateKey(), data);
  });
});

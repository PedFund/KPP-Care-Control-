// ================================
// admin-ui.js
// UI админ-панели с вкладками
// ================================
//
// Структура:
// - Вкладка "Обзор": карточки всех пользователей с кратким состоянием
// - Вкладка "Детально": подробная статистика выбранного пользователя
//
// Требования окружения:
// - доступны функции из admin-logic.js
// - подключение через <script> без type="module"

let currentAdminTab = 'overview';
let selectedUserId = null;
let allUsersData = [];

// === РЕНДЕРИНГ АДМИН-ЭКРАНА ===

async function renderAdminScreen() {
  // Загружаем данные всех пользователей
  allUsersData = await getAllUsersWithDetails();
  window.allUsers = allUsersData;
  
  console.log('✅ Загружено пользователей:', allUsersData.length);
  console.log('Пользователи:', allUsersData.map(u => u.name).join(', '));
  // Показываем экран
  showScreen('admin-screen');
  
  // Переключаемся на вкладку "Обзор"
  switchAdminTab('overview');
}

// === ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ===

function setupAdminTabs() {
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchAdminTab(tabName);
    });
  });
}

function switchAdminTab(tabName) {
  currentAdminTab = tabName;
  
  // Переключаем активную кнопку
  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.admin-tab-btn[data-tab="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Переключаем контент
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  const activeContent = document.getElementById(`admin-tab-${tabName}`);
  if (activeContent) activeContent.classList.add('active');
  
  // Загружаем данные для вкладки
  if (tabName === 'overview') {
    renderUsersOverview();
  } else if (tabName === 'details' && selectedUserId) {
    renderUserDetails(selectedUserId);
  }
}

// === ВКЛАДКА: ОБЗОР ПОЛЬЗОВАТЕЛЕЙ ===

function renderUsersOverview() {
  const container = document.getElementById('users-overview-list');
  
  if (allUsersData.length === 0) {
    container.innerHTML = '<p class="no-data">Нет пользователей</p>';
    return;
  }
  
  const html = allUsersData.map(user => {
    const today = getUserTodayState(user);
    const yesterday = getUserYesterdayState(user);
    const week = getUserCurrentWeekState(user);
    const allTime = getUserAllTimeStats(user); // ✅ НОВОЕ: получаем статистику за всё время
    
    return `
      <div class="admin-user-card" data-user-id="${user.id}">
        <div class="admin-user-header">
          <h3>${user.name}</h3>
          <button class="btn-link" onclick="selectUserDetails('${user.id}')">
            Подробнее →
          </button>
        </div>
        
        <div class="admin-stats-grid">
          <!-- Сегодня -->
          <div class="admin-stat-block">
            <h4>Сегодня</h4>
            <div class="admin-stat-row">
              <span>Шаги:</span>
              <span class="${today.progress >= 100 ? 'success' : today.progress >= 85 ? 'warning' : ''}">
                ${today.steps.toLocaleString('ru-RU')} / ${today.goal.toLocaleString('ru-RU')}
                (${today.progress}%)
              </span>
            </div>
            <div class="admin-stat-row">
              <span>Активности:</span>
              <span>
                ${today.morningExercise ? '🧘' : '⬜'} зарядка
                ${today.workout ? '🏋️' : '⬜'} тренировка
                ${today.abs ? '💪' : '⬜'} пресс
              </span>
            </div>
          </div>
          
          <!-- Вчера -->
          <div class="admin-stat-block">
            <h4>Вчера</h4>
            <div class="admin-stat-row">
              <span>Шаги:</span>
              <span class="${yesterday.progress >= 100 ? 'success' : yesterday.progress >= 85 ? 'warning' : ''}">
                ${yesterday.hasData ? yesterday.steps.toLocaleString('ru-RU') + ' (' + yesterday.progress + '%)' : 'Нет данных'}
              </span>
            </div>
            <div class="admin-stat-row">
              <span>Активности:</span>
              <span>
                ${yesterday.morningExercise ? '🧘' : '⬜'} зарядка
                ${yesterday.workout ? '🏋️' : '⬜'} тренировка
                ${yesterday.abs ? '💪' : '⬜'} пресс
              </span>
            </div>
          </div>
          
          <!-- Текущая неделя -->
          <div class="admin-stat-block">
            <h4>Ведёт дневник: ${allTime.totalDays} ${allTime.totalDays === 1 ? 'день' : allTime.totalDays < 5 ? 'дня' : 'дней'}</h4>
            
            <div class="admin-stat-row">
              <span>🚶 Шагов:</span>
              <span>Всего: ${allTime.totalSteps.toLocaleString('ru-RU')}<br>Среднее: ${allTime.avgSteps.toLocaleString('ru-RU')} / день</span>
            </div>
            <div class="admin-stat-row">
              <span>🧘 Зарядки:</span>
              <span>${allTime.morningExercise.done} / ${allTime.morningExercise.total} дней (${allTime.morningExercise.percentage}%)</span>
            </div>
            <div class="admin-stat-row">
              <span>🏋️ Тренировки:</span>
              <span>${allTime.workout.done} / ${allTime.workout.total} дней (${allTime.workout.percentage}%)</span>
            </div>
            <div class="admin-stat-row">
              <span>💪 Пресс:</span>
              <span>${allTime.abs.done} / ${allTime.abs.total} дней (${allTime.abs.percentage}%)</span>
            </div>
            <div class="admin-stat-row">
              <span>💧 Вода:</span>
              <span>Среднее: ${allTime.water.avg !== null ? allTime.water.avg : '—'}</span>
            </div>
            <div class="admin-stat-row">
              <span>🍽️ Питание:</span>
              <span>Среднее: ${allTime.nutrition.avg !== null ? allTime.nutrition.avg : '—'} ${allTime.nutrition.avg !== null ? (allTime.nutrition.avg == 0 ? '(По плану)' : '') : ''}</span>
            </div>
            <div class="admin-stat-row">
              <span>⚖️ Вес:</span>
              <span>
                Исходный: ${allTime.startWeight !== null ? allTime.startWeight + ' кг' : '—'}<br>
                Текущий: ${allTime.currentWeight !== null ? allTime.currentWeight + ' кг' : '—'}<br>
                Целевой: ${allTime.targetWeight !== null ? allTime.targetWeight + ' кг' : '—'}
              </span>
            </div>
            ${allTime.sleep.avgDuration !== null ? `
            <div class="admin-stat-row">
              <span>🛏️ Сон:</span>
              <span>
                Спит в среднем: ${allTime.sleep.avgDuration}<br>
                Ложится примерно в: ${allTime.sleep.avgBedTime || '—'}
              </span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
}

// === ВКЛАДКА: ДЕТАЛЬНАЯ СТАТИСТИКА ПОЛЬЗОВАТЕЛЯ ===

function selectUserDetails(userId) {
  selectedUserId = userId;
  switchAdminTab('details');
  renderUserDetails(userId);
}

function renderUserDetails(userId) {
  const user = allUsersData.find(u => u.id === userId);
  
  if (!user) {
    document.getElementById('user-details-content').innerHTML = '<p class="no-data">Пользователь не найден</p>';
    return;
  }
  
  const measurements = getUserMeasurementsState(user);
  const last7Days = getUserLast7DaysDynamics(user);
  const last4Weeks = getUserLast4WeeksDynamics(user);
  const allTime = getUserAllTimeStats(user);
  
  const html = `
    <div class="user-details-header">
      <h3>${user.name}</h3>
      <button class="btn-secondary" onclick="switchAdminTab('overview')">← Назад к обзору</button>
    </div>
    
    <!-- Целевой вес и текущие показатели -->
    <div class="details-section">
      <h4>📏 Измерения</h4>
      ${measurements.hasData ? `
        <div class="measurements-summary">
          <div class="measurement-item">
            <span class="label">Исходный вес:</span>
            <span class="value">${measurements.startWeight ? measurements.startWeight + ' кг' : '—'}</span>
          </div>
          <div class="measurement-item">
            <span class="label">Текущий вес:</span>
            <span class="value">${measurements.currentWeight ? measurements.currentWeight + ' кг' : '—'}</span>
          </div>
          <div class="measurement-item">
            <span class="label">Целевой вес:</span>
            <span class="value">${measurements.targetWeight ? measurements.targetWeight + ' кг' : 'Не указан'}</span>
          </div>
          ${measurements.lastMeasurement.height ? `
            <div class="measurement-item">
              <span class="label">Рост:</span>
              <span class="value">${measurements.lastMeasurement.height} см</span>
            </div>
          ` : ''}
          ${measurements.lastMeasurement.waist ? `
            <div class="measurement-item">
              <span class="label">Талия:</span>
              <span class="value">${measurements.lastMeasurement.waist} см</span>
            </div>
          ` : ''}
        </div>
      ` : '<p class="no-data">Нет данных измерений</p>'}
    </div>
    
    <!-- Динамика по последним 7 дням -->
    <div class="details-section">
      <h4>📊 Последние 7 дней</h4>
      <div class="dynamics-table">
        <table>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Шаги</th>
              <th>Норма</th>
              <th>%</th>
              <th>Зарядка</th>
              <th>Тренировка</th>
              <th>Пресс</th>
            </tr>
          </thead>
          <tbody>
            ${last7Days.map(day => {
              const progress = day.hasData ? Math.round((day.steps / day.goal) * 100) : 0;
              const progressClass = progress >= 100 ? 'success' : progress >= 85 ? 'warning' : '';
              
              return `
                <tr>
                  <td>${formatDate(day.date).split(' ').slice(0, 2).join(' ')}</td>
                  <td>${day.hasData ? day.steps.toLocaleString('ru-RU') : '—'}</td>
                  <td>${day.goal.toLocaleString('ru-RU')}</td>
                  <td class="${progressClass}">${progress}%</td>
                  <td>${day.morningExercise ? '✅' : '⬜'}</td>
                  <td>${day.workout ? '✅' : '⬜'}</td>
                  <td>${day.abs ? '✅' : '⬜'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Динамика по неделям -->
    <div class="details-section">
      <h4>📅 Последние 4 недели</h4>
      <div class="dynamics-table">
        <table>
          <thead>
            <tr>
              <th>Период</th>
              <th>Средние шаги</th>
              <th>Дней с данными</th>
              <th>Зарядка</th>
              <th>Тренировки</th>
              <th>Пресс</th>
            </tr>
          </thead>
          <tbody>
            ${last4Weeks.map(week => `
              <tr>
                <td>${week.period}</td>
                <td>${week.avgSteps.toLocaleString('ru-RU')}</td>
                <td>${week.daysWithData}/${week.totalDays}</td>
                <td>${week.morningExercise.done}/${week.morningExercise.total} (${week.morningExercise.percentage}%)</td>
                <td>${week.workout.done}/${week.workout.total} (${week.workout.percentage}%)</td>
                <td>${week.abs.done}/${week.abs.total} (${week.abs.percentage}%)</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- Статистика за всё время -->
    <div class="details-section">
      <h4>📈 Статистика за всё время</h4>
      <div class="alltime-stats">
        <div class="stat-card">
          <span class="stat-label">Всего дней с данными</span>
          <span class="stat-value">${allTime.totalDays}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Средние шаги</span>
          <span class="stat-value">${allTime.avgSteps.toLocaleString('ru-RU')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Минимум шагов</span>
          <span class="stat-value">${allTime.minSteps.toLocaleString('ru-RU')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Максимум шагов</span>
          <span class="stat-value">${allTime.maxSteps.toLocaleString('ru-RU')}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Зарядка</span>
          <span class="stat-value">${allTime.morningExercise.done}/${allTime.morningExercise.total} (${allTime.morningExercise.percentage}%)</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Тренировки</span>
          <span class="stat-value">${allTime.workout.done}/${allTime.workout.total} (${allTime.workout.percentage}%)</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Пресс</span>
          <span class="stat-value">${allTime.abs.done}/${allTime.abs.total} (${allTime.abs.percentage}%)</span>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('user-details-content').innerHTML = html;
}

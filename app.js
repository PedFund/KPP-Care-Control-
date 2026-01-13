// Главный файл приложения

document.addEventListener('DOMContentLoaded', () => {
  // Проверяем сессию
  const session = getSession();
  
  if (session) {
    // Пользователь уже залогинен
    if (session.isAdmin) {
      renderAdminScreen();
    } else {
      renderUserScreen(session.userId);
    }
  } else {
    // Показываем экран входа
    showScreen('login-screen');
  }
  
  // === ОБРАБОТЧИКИ ВХОДА ===
  
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
      alert('Введите логин и пароль');
      return;
    }
    
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Входим...';
    
    const result = await login(username, password);
    
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
      btn.disabled = false;
      btn.textContent = 'Войти';
    }
  });
  
  // === ОБРАБОТЧИКИ ВЫХОДА ===
  
  document.getElementById('logout-btn').addEventListener('click', logout);
  document.getElementById('admin-logout-btn').addEventListener('click', logout);
  
  // === НАСТРОЙКА ВКЛАДОК ПОЛЬЗОВАТЕЛЯ ===
  
  setupTabs();
  
  // === НАСТРОЙКА ВКЛАДОК АДМИНА ===
  
  setupAdminTabs();
  
  // === ФОРМА ВВОДА ДАННЫХ ===
  
  document.getElementById('today-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // ✅ НОВЫЕ ПОЛЯ: СОН
    const bedTime = document.getElementById('input-bed-time').value;
    const wakeTime = document.getElementById('input-wake-time').value;
    const sleepDuration = calculateSleepDuration(bedTime, wakeTime);
    
    const data = {
      totalSteps: document.getElementById('input-total-steps').value,
      treadmillSteps: document.getElementById('input-treadmill-steps').value,
      morningExercise: document.getElementById('input-morningExercise').checked,
      workout: document.getElementById('input-workout').checked,
      abs: document.getElementById('input-abs').checked,
      nutrition: document.getElementById('input-nutrition').value,
      water: document.getElementById('input-water').value,
      
      // ✅ СОН
      bedTime: bedTime || null,
      wakeTime: wakeTime || null,
      sleepDuration: sleepDuration || 0
    };
    
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Сохраняем...';
    
    await saveDayAndRefresh(getDateKey(), data);
    
    btn.disabled = false;
    btn.textContent = 'Сохранить';
  });

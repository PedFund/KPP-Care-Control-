// Модуль аутентификации

const AUTH_KEY = 'kpp_auth_session';

// Получить текущую сессию
function getSession() {
  const session = localStorage.getItem(AUTH_KEY);
  return session ? JSON.parse(session) : null;
}

// Сохранить сессию
function saveSession(userId, isAdmin = false) {
  const session = {
    userId,
    isAdmin,
    timestamp: Date.now()
  };
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

// Очистить сессию
function clearSession() {
  localStorage.removeItem(AUTH_KEY);
}

// Проверка админа
function isAdminLogin(username, password) {
  return username === ADMIN_CREDENTIALS.login && password === ADMIN_CREDENTIALS.password;
}

// Вход пользователя
async function login(username, password) {
  // Проверка на админа
  if (isAdminLogin(username, password)) {
    saveSession('admin', true);
    return { success: true, isAdmin: true };
  }

  // Проверка обычного пользователя
  try {
    // Ищем пользователя по имени
    const usersSnapshot = await db.collection('users').get();
    
    let existingUser = null;
    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name === username) {
        existingUser = { id: doc.id, ...data };
      }
    });

    if (existingUser) {
      // Пользователь существует - проверяем пароль
      if (existingUser.password === password) {
        saveSession(existingUser.id, false);
        return { success: true, isAdmin: false, userId: existingUser.id };
      } else {
        return { success: false, error: 'Неверный пароль' };
      }
    } else {
      // Новый пользователь - создаём
      const newUser = {
        name: username,
        password: password,
        baseSteps: 5000, // Стартовая норма
        treadmillGoal: 3000,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('users').add(newUser);
      saveSession(docRef.id, false);
      
      return { success: true, isAdmin: false, userId: docRef.id, isNewUser: true };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Ошибка подключения к базе данных' };
  }
}

// Выход
function logout() {
  clearSession();
  location.reload();
}

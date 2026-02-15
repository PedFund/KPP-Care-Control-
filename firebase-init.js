// Инициализация Firebase
let db;

function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);

    // 🔥 ВАЖНО: включаем сохранение сессии между страницами
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(() => {
        console.log("Auth persistence LOCAL enabled");
      })
      .catch((error) => {
        console.error("Persistence error:", error);
      });

    db = firebase.firestore();

    console.log('Firebase initialized successfully');

  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Инициализируем при загрузке
initFirebase();

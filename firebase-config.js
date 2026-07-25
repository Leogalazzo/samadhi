// ==========================================================
// FIREBASE-CONFIG.JS - Inicialización de Firebase y Firestore
// ==========================================================
// Se importa como módulo ES (por eso en el HTML va con type="module").

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXsX4Kaz2_7pB2o7Q6flAQQujyOnQQDcQ",
  authDomain: "samadhi-6b040.firebaseapp.com",
  projectId: "samadhi-6b040",
  storageBucket: "samadhi-6b040.firebasestorage.app",
  messagingSenderId: "714062925937",
  appId: "1:714062925937:web:5f5b268b49120a4f154bd0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
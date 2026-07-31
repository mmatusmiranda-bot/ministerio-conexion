import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDZFYTWU12nNulTiuv0pMo4wpPrgaAdCqg",
  authDomain: "ministerio-conexion-miel.firebaseapp.com",
  projectId: "ministerio-conexion-miel",
  storageBucket: "ministerio-conexion-miel.firebasestorage.app",
  messagingSenderId: "127258268492",
  appId: "1:127258268492:web:80512d123c1f902f80f5e9"
};
// Inicializamos la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Exportamos la Autenticación y la Base de Datos para usarlas en App.jsx
export const auth = getAuth(app);
export const db = getFirestore(app);
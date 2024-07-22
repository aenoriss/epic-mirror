import { initializeApp } from "firebase/app";
import { getDatabase, ref,  query, orderByChild, limitToLast, get, set, onValue, push, update, runTransaction} from "firebase/database";
import { getStorage, deleteObject } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCzeiWlUdYEAnhQ42Tzfl8-MMXUPdn90ts",
  authDomain: "sigmaagro-8488e.firebaseapp.com",
  projectId: "sigmaagro-8488e",
  storageBucket: "sigmaagro-8488e.appspot.com",
  messagingSenderId: "204989417891",
  appId: "1:204989417891:web:e2666b78abc6f26aee7216",
  measurementId: "G-T21GD49HBL"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase();
export const storage = getStorage(app);

export const handleGoogleSignUp = async () => {
    return await signInWithPopup(auth, provider)
       .then((result) => {
         const {isNewUser} = getAdditionalUserInfo(result)
         return {credential: result, isNewUser};
       })
       .catch((error) => {
         console.error("Error signing up with Google:", error);
       });
  };
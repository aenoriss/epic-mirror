import { initializeApp } from "firebase/app";
import { getDatabase, ref,  query, orderByChild, limitToLast, get, set, onValue, push, update, runTransaction} from "firebase/database";
import { getStorage, getDownloadURL, uploadBytes, ref as sRef } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCzeiWlUdYEAnhQ42Tzfl8-MMXUPdn90ts",
  authDomain: "sigmaagro-8488e.firebaseapp.com",
  databaseURL: "https://sigmaagro-8488e-default-rtdb.firebaseio.com",
  projectId: "sigmaagro-8488e",
  storageBucket: "sigmaagro-8488e.appspot.com",
  messagingSenderId: "204989417891",
  appId: "1:204989417891:web:e2666b78abc6f26aee7216",
  measurementId: "G-T21GD49HBL"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);

export const saveCurrentCapture = async (blob) => {
  try {
    const storageRef = sRef(storage, 'captures/' + Date.now() + '.png');
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('Uploaded a blob or file!');
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("downloadURL", downloadURL);

    const currentCaptureRef = ref(db, 'captures');
    const uniqueId = push(currentCaptureRef, downloadURL).key;

    return uniqueId;

  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
  }
};

export const getImgUrl = async (id) => {
  try {
    const captureRef = ref(db, 'captures/' + id);
    const snapshot = await get(captureRef);

    if(snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }

  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
  }
};
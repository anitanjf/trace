import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getDatabase } from "firebase/database"; 

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app); 

const googleProvider = new GoogleAuthProvider();

export const logInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out Error:", error);
  }
};

const normalizeArchiveValue = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

export const createArchivePassageId = (quoteText, author = 'Unknown') => {
  const source = `${normalizeArchiveValue(quoteText)}|${normalizeArchiveValue(author)}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `passage_${(hash >>> 0).toString(36)}`;
};

export const saveQuoteToArchive = async (userId, quoteText, author) => {
  if (!userId || !String(quoteText || '').trim()) return null;

  const normalizedAuthor = String(author || 'Unknown').trim() || 'Unknown';
  const bookmarksRef = collection(db, "users", userId, "bookmarks");
  const passageId = createArchivePassageId(quoteText, normalizedAuthor);

  try {
    const existingSnapshot = await getDocs(query(bookmarksRef, where("quoteText", "==", quoteText)));
    const existingDocument = existingSnapshot.docs.find(
      snapshot => normalizeArchiveValue(snapshot.data().author) === normalizeArchiveValue(normalizedAuthor)
    );
    const bookmarkRef = existingDocument?.ref || doc(bookmarksRef, passageId);

    await setDoc(bookmarkRef, {
      passageId,
      quoteText,
      author: normalizedAuthor,
      savedAt: serverTimestamp()
    }, { merge: true });

    return { id: bookmarkRef.id, passageId };
  } catch (error) {
    console.error("Failed to preserve passage:", error);
    throw error;
  }
};

export const removeQuoteFromArchive = async (userId, bookmarkId) => {
  if (!userId || !bookmarkId) return;
  await deleteDoc(doc(db, "users", userId, "bookmarks", bookmarkId));
};

import { db, auth, storage } from '../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveUserShow(show: any): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.error("User not signed in");
    return;
  }
  const showId = show.title.replace(/[^a-zA-Z0-9_\-]/g, '');
  const path = `users/${userId}/shows/${showId}`;
  try {
    let finalAudioUrl = show.audioUrl;
    let finalCoverImage = show.coverImage;

    if (finalAudioUrl && finalAudioUrl.startsWith('data:audio/')) {
      const audioRef = ref(storage, `users/${userId}/shows/${showId}/audio.mp3`);
      await uploadString(audioRef, finalAudioUrl, 'data_url');
      finalAudioUrl = await getDownloadURL(audioRef);
    }

    if (finalCoverImage && finalCoverImage.startsWith('data:image/')) {
      const coverRef = ref(storage, `users/${userId}/shows/${showId}/cover.png`);
      await uploadString(coverRef, finalCoverImage, 'data_url');
      finalCoverImage = await getDownloadURL(coverRef);
    }

    const showData = {
      ...show,
      audioUrl: finalAudioUrl,
      coverImage: finalCoverImage,
      userId,
      createdAt: serverTimestamp()
    };
    if (showData.isBase64Encoded) {
        delete showData.isBase64Encoded;
    }

    await setDoc(doc(db, 'users', userId, 'shows', showId), showData);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getUserShows(): Promise<any[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    return [];
  }
  const path = `users/${userId}/shows`;
  try {
    const q = query(collection(db, 'users', userId, 'shows'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const shows: any[] = [];
    snapshot.forEach(doc => {
      shows.push(doc.data());
    });
    return shows;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return [];
  }
}

export async function deleteUserShow(title: string): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) {
    console.error("User not signed in");
    return;
  }
  const showId = title.replace(/[^a-zA-Z0-9_\-]/g, '');
  const path = `users/${userId}/shows/${showId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'shows', showId));
    
    try {
        const audioRef = ref(storage, `users/${userId}/shows/${showId}/audio.mp3`);
        await deleteObject(audioRef);
    } catch (e) {}
    
    try {
        const coverRef = ref(storage, `users/${userId}/shows/${showId}/cover.png`);
        await deleteObject(coverRef);
    } catch (e) {}
    
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

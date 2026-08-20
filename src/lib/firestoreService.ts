import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, Conversation, ChatMessage, MessageAttachment, Community, CallRecord, QuickNote } from '../types';

// Helper to get initials & tone
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'م';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const TONES = [
  'bg-orange-100 text-orange-900',
  'bg-[#e9e5ff] text-[#4338ca]',
  'bg-[#b8f3df] text-[#065f46]',
  'bg-yellow-100 text-yellow-900',
  'bg-blue-100 text-blue-900',
  'bg-rose-100 text-rose-900',
];

export function getRandomTone(seed?: string): string {
  if (!seed) return TONES[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TONES.length;
  return TONES[index];
}

// 1. User Profile Operations
export async function syncUserProfile(user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null }): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    // update online status and lastSeen
    await updateDoc(userRef, {
      isOnline: true,
      lastSeen: new Date().toISOString(),
    }).catch(() => {});
    return { ...data, uid: user.uid };
  }

  // Derive initial username from email or name
  let defaultUsername = 'user_' + user.uid.slice(0, 6);
  if (user.email) {
    defaultUsername = user.email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase() || defaultUsername;
  }

  const newProfile: UserProfile = {
    uid: user.uid,
    displayName: user.displayName || 'مستخدم جديد',
    username: defaultUsername,
    email: user.email || '',
    phoneNumber: '',
    countryCode: '+20',
    countryName: 'مصر',
    photoURL: user.photoURL || '',
    bio: 'مرحباً، أنا أستخدم Malek Message للتواصل مع الأصدقاء.',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    onboardingCompleted: false,
  };

  await setDoc(userRef, newProfile, { merge: true });
  return newProfile;
}

export async function completeUserOnboarding(
  uid: string,
  data: {
    username: string;
    phoneNumber: string;
    countryCode: string;
    countryName: string;
    displayName?: string;
    photoURL?: string;
  }
): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    username: data.username.toLowerCase(),
    phoneNumber: data.phoneNumber,
    countryCode: data.countryCode,
    countryName: data.countryName,
    displayName: data.displayName || 'مستخدم',
    ...(data.photoURL && { photoURL: data.photoURL }),
    onboardingCompleted: true,
    lastSeen: new Date().toISOString(),
  });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...data,
    lastSeen: new Date().toISOString(),
  });
}

export async function searchUsers(searchTerm: string, currentUid: string): Promise<UserProfile[]> {
  const clean = searchTerm.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return [];

  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(query(usersRef, limit(30)));
    const results: UserProfile[] = [];

    snap.forEach((d) => {
      const u = d.data() as UserProfile;
      if (u.uid !== currentUid) {
        const matchName = u.displayName && u.displayName.toLowerCase().includes(clean);
        const matchUser = u.username && u.username.toLowerCase().includes(clean);
        const matchPhone = u.phoneNumber && u.phoneNumber.includes(clean);
        if (matchName || matchUser || matchPhone) {
          results.push(u);
        }
      }
    });

    return results;
  } catch (err) {
    console.error('Error searching users:', err);
    return [];
  }
}

// Helper to normalize message timestamp and date from any Firestore format
export function normalizeMessage(id: string, data: any): ChatMessage {
  let ts = 0;
  if (typeof data.timestamp === 'number' && !isNaN(data.timestamp) && data.timestamp > 0) {
    ts = data.timestamp;
  } else if (data.timestamp && typeof data.timestamp.toMillis === 'function') {
    ts = data.timestamp.toMillis();
  } else if (data.timestamp && typeof data.timestamp.seconds === 'number') {
    ts = data.timestamp.seconds * 1000;
  } else if (typeof data.timestamp === 'string') {
    const num = Number(data.timestamp);
    if (!isNaN(num) && num > 0) ts = num;
    else {
      const p = Date.parse(data.timestamp);
      if (!isNaN(p)) ts = p;
    }
  } else if (data.createdAt) {
    if (typeof data.createdAt.toMillis === 'function') {
      ts = data.createdAt.toMillis();
    } else if (typeof data.createdAt.seconds === 'number') {
      ts = data.createdAt.seconds * 1000;
    } else {
      const p = Date.parse(data.createdAt);
      if (!isNaN(p)) ts = p;
    }
  }

  // Fallback if timestamp was completely missing: deterministic numeric hash based on document id
  if (!ts || ts <= 0) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    // Map to a stable timestamp in the past
    ts = 1700000000000 + Math.abs(hash % 100000000);
  }

  let displayTime = data.createdAt;
  if (!displayTime || typeof displayTime !== 'string' || displayTime.length > 25) {
    try {
      displayTime = new Date(ts).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch {
      displayTime = '';
    }
  }

  // Build unified attachments array
  let attachmentsList: MessageAttachment[] = [];
  if (Array.isArray(data.attachments) && data.attachments.length > 0) {
    attachmentsList = data.attachments.map((att: any) => ({
      fileUrl: att.fileUrl || att.url || '',
      fileName: att.fileName || att.name || 'ملف مرفق',
      fileType: att.fileType || 'file',
      fileSize: att.fileSize || att.size || 0,
    })).filter((att: MessageAttachment) => !!att.fileUrl);
  } else if (data.fileUrl) {
    attachmentsList = [
      {
        fileUrl: data.fileUrl,
        fileName: data.fileName || 'ملف مرفق',
        fileType: data.fileType || 'file',
        fileSize: data.fileSize || 0,
      },
    ];
  }

  const primaryAttachment = attachmentsList[0];

  return {
    id,
    senderId: data.senderId || '',
    senderName: data.senderName || 'مستخدم',
    senderUsername: data.senderUsername,
    text: data.text || '',
    fileUrl: primaryAttachment ? primaryAttachment.fileUrl : data.fileUrl,
    fileName: primaryAttachment ? primaryAttachment.fileName : data.fileName,
    fileType: primaryAttachment ? primaryAttachment.fileType : data.fileType,
    fileSize: primaryAttachment ? primaryAttachment.fileSize : data.fileSize,
    attachments: attachmentsList,
    createdAt: displayTime,
    timestamp: ts,
    read: data.read ?? false,
  };
}

// 2. Conversations & Messaging
export function subscribeToConversations(uid: string, onUpdate: (convs: Conversation[]) => void) {
  const convsRef = collection(db, 'conversations');
  const q = query(convsRef, where('participants', 'array-contains', uid));

  return onSnapshot(q, (snapshot) => {
    const list: Conversation[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Conversation, 'id'>) });
    });
    list.sort((a, b) => {
      const tA = (a as any).lastMessageTimestamp || (a.createdAt ? Date.parse(a.createdAt) : 0) || 0;
      const tB = (b as any).lastMessageTimestamp || (b.createdAt ? Date.parse(b.createdAt) : 0) || 0;
      return tB - tA;
    });
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToConversations listener error:', err);
  });
}

export async function getOrCreateConversation(currentUser: UserProfile, targetUser: UserProfile): Promise<string> {
  const convsRef = collection(db, 'conversations');
  const q = query(convsRef, where('participants', 'array-contains', currentUser.uid));
  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as Conversation;
    if (data.participants.includes(targetUser.uid) && data.participants.length === 2) {
      return docSnap.id;
    }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const newConvData: Omit<Conversation, 'id'> & { lastMessageTimestamp: number } = {
    participants: [currentUser.uid, targetUser.uid],
    participantData: {
      [currentUser.uid]: {
        displayName: currentUser.displayName,
        username: currentUser.username,
        photoURL: currentUser.photoURL,
        phoneNumber: currentUser.phoneNumber ? `${currentUser.countryCode || ''} ${currentUser.phoneNumber}` : undefined,
        letters: getInitials(currentUser.displayName),
        tone: getRandomTone(currentUser.uid),
      },
      [targetUser.uid]: {
        displayName: targetUser.displayName,
        username: targetUser.username,
        photoURL: targetUser.photoURL,
        phoneNumber: targetUser.phoneNumber ? `${targetUser.countryCode || ''} ${targetUser.phoneNumber}` : undefined,
        letters: getInitials(targetUser.displayName),
        tone: getRandomTone(targetUser.uid),
      },
    },
    lastMessage: 'محادثة جديدة',
    lastMessageTime: timeStr,
    lastMessageTimestamp: Date.now(),
    lastSenderId: currentUser.uid,
    createdAt: now.toISOString(),
  };

  const docRef = await addDoc(convsRef, newConvData);
  return docRef.id;
}

export function subscribeToMessages(conversationId: string, onUpdate: (msgs: ChatMessage[]) => void) {
  const msgsRef = collection(db, 'conversations', conversationId, 'messages');

  const processSnap = (snapshot: any) => {
    const list: ChatMessage[] = [];
    snapshot.forEach((d: any) => {
      list.push(normalizeMessage(d.id, d.data()));
    });
    // Strict ascending chronological sorting (oldest first at top, newest at bottom)
    list.sort((a, b) => {
      const diff = (a.timestamp || 0) - (b.timestamp || 0);
      if (diff !== 0) return diff;
      return a.id.localeCompare(b.id);
    });
    onUpdate(list);
  };

  try {
    const q = query(msgsRef, orderBy('timestamp', 'asc'));
    return onSnapshot(
      q,
      processSnap,
      (err) => {
        console.warn('subscribeToMessages orderBy warning, using collection listener:', err);
        return onSnapshot(msgsRef, processSnap, (err2) => {
          console.error('subscribeToMessages fallback error:', err2);
        });
      }
    );
  } catch {
    return onSnapshot(msgsRef, processSnap);
  }
}

export async function sendMessage(
  conversationId: string,
  sender: UserProfile,
  text: string,
  attachment?: MessageAttachment | MessageAttachment[]
): Promise<void> {
  const cleanText = text ? text.trim() : '';
  
  // Normalize attachments input
  let attachmentsList: MessageAttachment[] = [];
  if (Array.isArray(attachment)) {
    attachmentsList = attachment.filter((a) => !!a && !!a.fileUrl);
  } else if (attachment && attachment.fileUrl) {
    attachmentsList = [attachment];
  }

  if (!cleanText && attachmentsList.length === 0) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const msgsRef = collection(db, 'conversations', conversationId, 'messages');

  const currentTs = Date.now();
  const firstAttachment = attachmentsList[0];

  const msgData: any = {
    senderId: sender.uid,
    senderName: sender.displayName || 'مستخدم',
    senderUsername: sender.username || '',
    text: cleanText,
    createdAt: timeStr,
    timestamp: currentTs,
    read: false,
    attachments: attachmentsList,
    ...(firstAttachment && {
      fileUrl: firstAttachment.fileUrl,
      fileName: firstAttachment.fileName || 'ملف مرفق',
      fileType: firstAttachment.fileType || 'file',
      fileSize: firstAttachment.fileSize || 0,
    }),
  };

  await addDoc(msgsRef, msgData);

  // Generate friendly preview text for conversation list
  let previewText = cleanText;
  if (!previewText) {
    if (attachmentsList.length === 1) {
      const type = attachmentsList[0].fileType;
      previewText = type === 'image' ? '📷 صورة مرفقة' : type === 'video' ? '🎥 فيديو مرفق' : type === 'audio' ? '🎵 تسجيل صوتي' : '📎 ملف مرفق';
    } else if (attachmentsList.length > 1) {
      previewText = `📎 ${attachmentsList.length} مرفقات`;
    }
  }

  // Update conversation parent doc
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: previewText,
    lastMessageTime: timeStr,
    lastMessageTimestamp: currentTs,
    lastSenderId: sender.uid,
  }).catch(() => {});
}

export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  const msgDocRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  await deleteDoc(msgDocRef);

  // Update conversation doc with latest remaining message if possible
  try {
    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(msgsRef, orderBy('timestamp', 'desc'), limit(1));
    const snap = await getDocs(q);
    const convRef = doc(db, 'conversations', conversationId);
    if (!snap.empty) {
      const last = snap.docs[0].data();
      const preview = last.text || (last.fileType === 'image' ? '📷 صورة مرفقة' : last.fileType === 'video' ? '🎥 فيديو مرفق' : '📎 ملف مرفق');
      await updateDoc(convRef, {
        lastMessage: preview,
        lastMessageTime: last.createdAt || '',
        lastMessageTimestamp: last.timestamp || Date.now(),
        lastSenderId: last.senderId || '',
      });
    } else {
      await updateDoc(convRef, {
        lastMessage: 'لا توجد رسائل',
        lastMessageTime: '',
        lastMessageTimestamp: 0,
        lastSenderId: '',
      });
    }
  } catch (err) {
    console.warn('Post-delete conversation update fallback:', err);
  }
}

export async function clearConversationMessages(conversationId: string): Promise<void> {
  const msgsRef = collection(db, 'conversations', conversationId, 'messages');
  const snap = await getDocs(msgsRef);
  
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }

  // Update conversation document
  const convRef = doc(db, 'conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: 'تم مسح محتوى المحادثة',
    lastMessageTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    lastMessageTimestamp: Date.now(),
    lastSenderId: '',
  }).catch(() => {});
}

// 3. Communities
export function subscribeToCommunities(onUpdate: (comms: Community[]) => void) {
  const commsRef = collection(db, 'communities');
  return onSnapshot(commsRef, (snapshot) => {
    const list: Community[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<Community, 'id'>) });
    });
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToCommunities error:', err);
  });
}

export async function createCommunity(
  user: UserProfile,
  title: string,
  description: string,
  coverUrl?: string
): Promise<string> {
  const commsRef = collection(db, 'communities');
  const newComm = {
    title: title.trim(),
    description: description.trim(),
    createdBy: user.uid,
    creatorName: user.displayName,
    members: [user.uid],
    membersCount: 1,
    letters: getInitials(title),
    tone: getRandomTone(title),
    ...(coverUrl && { coverUrl }),
    createdAt: new Date().toISOString(),
  };
  const res = await addDoc(commsRef, newComm);
  return res.id;
}

export async function toggleCommunityMembership(communityId: string, uid: string, isJoining: boolean): Promise<void> {
  const commRef = doc(db, 'communities', communityId);
  if (isJoining) {
    await updateDoc(commRef, {
      members: arrayUnion(uid),
      membersCount: increment(1),
    });
  } else {
    await updateDoc(commRef, {
      members: arrayRemove(uid),
      membersCount: increment(-1),
    });
  }
}

// 4. Calls
export function subscribeToCalls(uid: string, onUpdate: (calls: CallRecord[]) => void) {
  const callsRef = collection(db, 'calls');
  return onSnapshot(callsRef, (snapshot) => {
    const list: CallRecord[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as Omit<CallRecord, 'id'>;
      if (data.hostId === uid || (data.participants && data.participants.includes(uid))) {
        list.push({ id: d.id, ...data });
      }
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToCalls error:', err);
  });
}

export async function createCallRecord(user: UserProfile, title: string, type: 'video' | 'audio' | 'group' = 'group'): Promise<CallRecord> {
  const callsRef = collection(db, 'calls');
  const callCode = 'malek-' + Math.random().toString(36).substring(2, 7) + '-' + Math.random().toString(36).substring(2, 6);
  const newCall = {
    title: title.trim() || `مكالمة ${user.displayName}`,
    hostId: user.uid,
    hostName: user.displayName,
    link: `https://meet.jit.si/${callCode}`,
    type,
    createdAt: new Date().toISOString(),
    participants: [user.uid],
  };

  const docRef = await addDoc(callsRef, newCall);
  return { id: docRef.id, ...newCall };
}

// 5. Quick Notes
export function subscribeToNotes(onUpdate: (notes: QuickNote[]) => void) {
  const notesRef = collection(db, 'notes');
  return onSnapshot(notesRef, (snapshot) => {
    const list: QuickNote[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<QuickNote, 'id'>) });
    });
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    onUpdate(list);
  }, (err) => {
    console.warn('subscribeToNotes error:', err);
  });
}

export async function createQuickNote(user: UserProfile, content: string, imageUrl?: string): Promise<string> {
  const notesRef = collection(db, 'notes');
  const newNote = {
    authorId: user.uid,
    authorName: user.displayName,
    authorUsername: user.username,
    content: content.trim(),
    ...(imageUrl && { imageUrl }),
    createdAt: new Date().toISOString(),
  };
  const docRef = await addDoc(notesRef, newNote);
  return docRef.id;
}

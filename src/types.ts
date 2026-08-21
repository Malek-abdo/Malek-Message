export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  countryName?: string;
  photoURL?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt?: string;
  onboardingCompleted?: boolean;
}

export interface MessageAttachment {
  fileUrl: string;
  fileName?: string;
  fileType?: 'image' | 'video' | 'audio' | 'file';
  fileSize?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername?: string;
  text: string;
  // Legacy single attachment fields (for backwards compatibility)
  fileUrl?: string;
  fileName?: string;
  fileType?: 'image' | 'video' | 'audio' | 'file';
  fileSize?: number;
  // Unified attachments array (WhatsApp-style: text + attachments in same message)
  attachments?: MessageAttachment[];
  createdAt: string;
  timestamp?: number;
  read?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[]; // uids
  participantData?: Record<string, {
    displayName: string;
    username: string;
    photoURL?: string;
    phoneNumber?: string;
    letters: string;
    tone: string;
  }>;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number;
  lastSenderId?: string;
  updatedAt?: number;
  createdAt: string;
  unreadCount?: Record<string, number>;
}

export interface Community {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  creatorName?: string;
  members: string[]; // uids
  membersCount: number;
  letters: string;
  tone: string;
  coverUrl?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimestamp?: number;
  lastSenderName?: string;
  createdAt: string;
}

export interface CallRecord {
  id: string;
  title: string;
  hostId: string;
  hostName: string;
  hostPhoto?: string;
  targetId?: string;
  targetName?: string;
  targetPhoto?: string;
  link: string;
  type: 'video' | 'audio' | 'group';
  status?: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed';
  createdAt: string;
  participants: string[];
}

export interface QuickNote {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  createdAt: string;
}

export interface CountryInfo {
  code: string; // e.g. "EG"
  name: string; // e.g. "مصر"
  dialCode: string; // e.g. "+20"
  flag: string; // e.g. "🇪🇬"
}

export const APP_LOGO_URL =
  'https://mp3tourl.com/images/1787241217081-a8bda64b-12f2-4d59-a023-81f2360649be.jpeg';

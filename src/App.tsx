/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db, googleProvider } from './lib/firebase';
import {
  syncUserProfile,
  subscribeToConversations,
  subscribeToMessages,
  subscribeToCommunities,
  subscribeToCommunityMessages,
  toggleCommunityMembership,
  subscribeToCalls,
  subscribeToNotes,
  createCallRecord,
  updateCallStatus,
} from './lib/firestoreService';
import { UserProfile, Conversation, ChatMessage, Community, CallRecord, QuickNote, APP_LOGO_URL } from './types';

// Modals & Subcomponents
import { OnboardingModal } from './components/OnboardingModal';
import { ChatView } from './components/ChatView';
import { CommunityChatView } from './components/CommunityChatView';
import { InboxList } from './components/InboxList';
import { HomeFeed } from './components/HomeFeed';
import { DiscoverView } from './components/DiscoverView';
import { CallsView } from './components/CallsView';
import { ProfileView } from './components/ProfileView';
import { MediaLightbox } from './components/MediaLightbox';
import { SidebarNav } from './components/SidebarNav';
import { BottomNav } from './components/BottomNav';
import { NewChatModal } from './components/NewChatModal';
import { NewCommunityModal } from './components/NewCommunityModal';
import { CallModal } from './components/CallModal';
import { NewNoteModal } from './components/NewNoteModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ActiveInAppCall } from './components/ActiveInAppCall';
import { IncomingCallModal } from './components/IncomingCallModal';
import {
  MessageNotificationToast,
  IncomingMessageNotification,
} from './components/MessageNotificationToast';
import {
  playMessageSound,
  showBrowserNotification,
  getNotificationPermission,
  requestNotificationPermission,
} from './lib/notifications';

import {
  Sparkles,
  MessageSquare,
  Loader2,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  Bell,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'home' | 'inbox' | 'discover' | 'calls' | 'profile'>('home');

  // Real Firestore Data States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Community Group Chat States
  const [communities, setCommunities] = useState<Community[]>([]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  const [communityMessages, setCommunityMessages] = useState<ChatMessage[]>([]);

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [notes, setNotes] = useState<QuickNote[]>([]);

  // Notification States
  const [incomingNotification, setIncomingNotification] = useState<IncomingMessageNotification | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default';
  });

  // Modals & UI States
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [newChatModalOpen, setNewChatModalOpen] = useState<boolean>(false);
  const [newCommunityModalOpen, setNewCommunityModalOpen] = useState<boolean>(false);
  const [callModalOpen, setCallModalOpen] = useState<boolean>(false);
  const [newNoteModalOpen, setNewNoteModalOpen] = useState<boolean>(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState<boolean>(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // In-App Call Active State
  const [activeInAppCall, setActiveInAppCall] = useState<CallRecord | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallRecord | null>(null);

  // Active state references for real-time listener callback
  const selectedConvIdRef = React.useRef<string | null>(selectedConvId);
  const activeTabRef = React.useRef<'home' | 'inbox' | 'discover' | 'calls' | 'profile'>(activeTab);
  const prevConvsRef = React.useRef<Map<string, number>>(new Map());
  const initialLoadedRef = React.useRef<boolean>(false);
  const activeInAppCallRef = React.useRef<CallRecord | null>(null);

  useEffect(() => {
    activeInAppCallRef.current = activeInAppCall;
  }, [activeInAppCall]);

  useEffect(() => {
    selectedConvIdRef.current = selectedConvId;
  }, [selectedConvId]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Auth form fallback state (for Email/Password Login & Registration)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setNotificationToast(msg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // 1. Check Firestore connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
    testConnection();
  }, []);

  // 2. Auth State Observer & Profile Syncing with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoadingAuth(true);
      if (user) {
        setFirebaseUser(user);
        try {
          const profile = await syncUserProfile(user);
          setUserProfile(profile);

          // Check if user needs onboarding (e.g. choose username & phone number)
          if (!profile.onboardingCompleted && (!profile.phoneNumber || profile.username.startsWith('user_'))) {
            setOnboardingOpen(true);
          }
        } catch (err) {
          console.warn('Profile sync fallback:', err);
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || 'مستخدم جديد',
            username: user.email ? user.email.split('@')[0] : 'user_' + user.uid.slice(0, 5),
            email: user.email || '',
            phoneNumber: '',
            countryCode: '+20',
            countryName: 'مصر',
            photoURL: user.photoURL || '',
            bio: 'مرحباً، أنا أستخدم Malek Message للتواصل مع الأصدقاء.',
            isOnline: true,
            createdAt: new Date().toISOString(),
            onboardingCompleted: false,
          };
          setUserProfile(fallbackProfile);
          setOnboardingOpen(true);
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Realtime Firestore Subscriptions for User Data with Message Notifications
  useEffect(() => {
    if (!userProfile) return;

    const unsubConvs = subscribeToConversations(userProfile.uid, (data) => {
      // If first load, store current timestamps and don't notify
      if (!initialLoadedRef.current) {
        initialLoadedRef.current = true;
        const initialMap = new Map<string, number>();
        data.forEach((c) => {
          const ts = c.lastMessageTimestamp || (c.createdAt ? Date.parse(c.createdAt) : 0) || 0;
          initialMap.set(c.id, ts);
        });
        prevConvsRef.current = initialMap;
        setConversations(data);
        return;
      }

      // Check each conversation for new incoming messages from the other user
      data.forEach((conv) => {
        const prevTime = prevConvsRef.current.get(conv.id) || 0;
        const currTime = conv.lastMessageTimestamp || (conv.createdAt ? Date.parse(conv.createdAt) : 0) || 0;

        if (currTime > prevTime) {
          const otherUid = conv.participants.find((id) => id !== userProfile.uid) || '';
          const otherData = conv.participantData?.[otherUid];
          const displayName = otherData?.displayName || 'صديق';
          const username = otherData?.username || otherUid.slice(0, 6);
          const photoURL = otherData?.photoURL;

          // If the last message was sent by someone other than current user
          if (conv.lastSenderId && conv.lastSenderId !== userProfile.uid) {
            // 1. Play synthesized message chime
            playMessageSound();

            // 2. Trigger browser notification if page is blurred or in background
            showBrowserNotification(
              `رسالة جديدة من ${displayName}`,
              {
                body: conv.lastMessage || 'أرسل مرفقاً جديداً',
                icon: photoURL,
                tag: `msg-${conv.id}`,
              },
              () => {
                setSelectedConvId(conv.id);
                setActiveTab('inbox');
              }
            );

            // 3. Show In-App Interactive Notification Toast if not active in this conversation
            const isCurrentChat = selectedConvIdRef.current === conv.id && activeTabRef.current === 'inbox';
            if (!isCurrentChat) {
              setIncomingNotification({
                conversationId: conv.id,
                senderName: displayName,
                senderUsername: username,
                senderPhoto: photoURL,
                senderUid: otherUid,
                messageText: conv.lastMessage || 'مرفق جديد',
                timeStr: new Date(currTime).toLocaleTimeString('ar-EG', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                hasAttachment: !conv.lastMessage,
              });
            }
          }
        }
      });

      // Update timestamps map
      const nextMap = new Map<string, number>();
      data.forEach((c) => {
        const ts = c.lastMessageTimestamp || (c.createdAt ? Date.parse(c.createdAt) : 0) || 0;
        nextMap.set(c.id, ts);
      });
      prevConvsRef.current = nextMap;

      setConversations(data);
    });

    const unsubComms = subscribeToCommunities((data) => {
      setCommunities(data);
    });

    const unsubCalls = subscribeToCalls(userProfile.uid, (data) => {
      setCalls(data);

      // Check for incoming direct call targeting current user
      const activeCall = activeInAppCallRef.current;
      const ringingCall = data.find((c) => {
        if (c.targetId === userProfile.uid && c.status === 'ringing') {
          // Verify call was created in the last 2 minutes
          const callAgeMs = Date.now() - new Date(c.createdAt).getTime();
          return callAgeMs < 120000;
        }
        return false;
      });

      if (ringingCall && (!activeCall || activeCall.id !== ringingCall.id)) {
        setIncomingCall(ringingCall);
      } else if (!ringingCall) {
        setIncomingCall(null);
      }

      // If we are already in this call, keep its latest data synced
      if (activeCall) {
        const updated = data.find((c) => c.id === activeCall.id);
        if (updated) {
          if (updated.status === 'ended' || updated.status === 'declined') {
            setActiveInAppCall(null);
            showToast(updated.status === 'declined' ? 'تم رفض المكالمة من الطرف الآخر' : 'تم إنهاء المكالمة');
          } else {
            setActiveInAppCall(updated);
          }
        }
      }
    });

    const unsubNotes = subscribeToNotes((data) => {
      setNotes(data);
    });

    return () => {
      if (unsubConvs) unsubConvs();
      if (unsubComms) unsubComms();
      if (unsubCalls) unsubCalls();
      if (unsubNotes) unsubNotes();
    };
  }, [userProfile?.uid]);

  // 4. Realtime Firestore Subscription for Active 1-on-1 Chat Messages
  useEffect(() => {
    if (!selectedConvId) {
      setMessages([]);
      return;
    }

    const unsubMsgs = subscribeToMessages(selectedConvId, (data) => {
      setMessages(data);
    });

    return () => {
      if (unsubMsgs) unsubMsgs();
    };
  }, [selectedConvId]);

  // 5. Realtime Firestore Subscription for Active Community Group Chat
  useEffect(() => {
    if (!selectedCommunityId) {
      setCommunityMessages([]);
      return;
    }

    const unsubCommMsgs = subscribeToCommunityMessages(selectedCommunityId, (data) => {
      setCommunityMessages(data);
    });

    return () => {
      if (unsubCommMsgs) unsubCommMsgs();
    };
  }, [selectedCommunityId]);

  // Handle Google Sign In with fallback
  const handleGoogleSignIn = async () => {
    try {
      setAuthSubmitting(true);
      setAuthError('');
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        showToast('تم تسجيل الدخول بنجاح عبر حساب Google!');
      }
    } catch (err: any) {
      console.warn('Popup sign in error:', err);
      const code = err?.code || '';
      if (code === 'auth/popup-blocked' || err?.message?.includes('popup')) {
        setAuthError('تم حظر النافذة المنبثقة في المتصفح. يمكنك إدخال بريدك وكلمة المرور أدناه للتسجيل.');
      } else if (code === 'auth/unauthorized-domain') {
        setAuthError('النطاق غير مصرح به في Firebase Console. يرجى استخدام البريد وكلمة المرور أدناه للدخول فوراً.');
      } else if (code === 'auth/operation-not-allowed' || code === 'auth/admin-restricted-operation') {
        setAuthError('تسجيل Google غير مفعّل في لوحة تحكم Firebase حالياً. استخدم البريد وكلمة المرور أدناه وسيعمل فوراً.');
      } else if (code === 'auth/popup-closed-by-user') {
        setAuthError('تم إغلاق نافذة تسجيل الدخول قبل الاكتمال.');
      } else {
        setAuthError('تعذر تسجيل الدخول عبر Google. يمكنك استخدام البريد الإلكتروني أو الدخول السريع أدناه.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Email / Password Auth (Registration & Login with fallback)
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim();
    const cleanPassword = passwordInput;
    const cleanName = nameInput.trim();

    if (!cleanEmail) {
      setAuthError('يرجى إدخال البريد الإلكتروني.');
      return;
    }

    if (!cleanPassword) {
      setAuthError('يرجى إدخال كلمة المرور.');
      return;
    }

    if (authMode === 'register' && !cleanName) {
      setAuthError('يرجى إدخال اسمك الكامل للتسجيل.');
      return;
    }

    if (cleanPassword.length < 6) {
      setAuthError('كلمة المرور يجب أن تكون 6 أحرف أو أرقام على الأقل.');
      return;
    }

    try {
      setAuthSubmitting(true);
      setAuthError('');

      let userCredential;
      try {
        if (authMode === 'register') {
          userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        } else {
          userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        }
      } catch (innerErr: any) {
        const errCode = innerErr?.code || '';
        // If Email/Password provider is disabled in Firebase console, smoothly fall back to Anonymous Auth session
        if (errCode === 'auth/operation-not-allowed' || innerErr?.message?.includes('operation-not-allowed')) {
          console.warn('Email/Password provider not enabled in Firebase, falling back to instant authenticated session...');
          userCredential = await signInAnonymously(auth);
        } else {
          throw innerErr;
        }
      }

      if (userCredential?.user) {
        const user = userCredential.user;
        const displayName = cleanName || (cleanEmail ? cleanEmail.split('@')[0] : 'مستخدم Malek Message');
        await updateProfile(user, { displayName }).catch(() => {});
        await syncUserProfile({
          uid: user.uid,
          displayName,
          email: cleanEmail,
          photoURL: '',
        }).catch(() => {});

        showToast(
          authMode === 'register'
            ? `تم إنشاء الحساب بنجاح! مرحباً بك يا ${displayName}`
            : `تم تسجيل الدخول بنجاح! مرحباً بك يا ${displayName}`
        );
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-email') {
        setAuthError('صيغة البريد الإلكتروني غير صحيحة.');
      } else if (code === 'auth/user-not-found') {
        setAuthError('الحساب غير موجود، يرجى التبديل إلى "إنشاء حساب جديد".');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setAuthError(
          authMode === 'login'
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة. إذا لم يكن لديك حساب، اضغط على "إنشاء حساب جديد" بالأسفل.'
            : 'البيانات المدخلة غير صحيحة، يرجى التحقق من صحة البريد وكلمة المرور.'
        );
      } else if (code === 'auth/email-already-in-use') {
        setAuthError('البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول بدلاً من التسجيل.');
      } else if (code === 'auth/weak-password') {
        setAuthError('كلمة المرور ضعيفة، يرجى استخدام 6 أحرف أو أرقام على الأقل.');
      } else if (code === 'auth/too-many-requests') {
        setAuthError('تم حظر المحاولات مؤقتاً بسبب تكرار الأخطاء، يرجى المحاولة لاحقاً.');
      } else if (code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed' || err?.message?.includes('admin-restricted-operation')) {
        setAuthError('تسجيل الدخول بالبريد الإلكتروني غير مفعّل في إعدادات المشروع. يرجى الضغط على زر "تسجيل الدخول عبر Google" أعلاه للمتابعة بنجاح.');
      } else if (code === 'auth/network-request-failed') {
        setAuthError('فشل الاتصال، يرجى التحقق من اتصالك بالإنترنت.');
      } else {
        setAuthError(err?.message || 'حدث خطأ أثناء المصادقة، يرجى التحقق من البيانات.');
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Quick Instant / Guest Sign In
  const handleGuestSignIn = async () => {
    try {
      setAuthSubmitting(true);
      setAuthError('');
      const userCredential = await signInAnonymously(auth);
      if (userCredential.user) {
        const guestName = nameInput.trim() || 'ضيف ' + Math.floor(1000 + Math.random() * 9000);
        await updateProfile(userCredential.user, { displayName: guestName }).catch(() => {});
        await syncUserProfile({
          uid: userCredential.user.uid,
          displayName: guestName,
          email: '',
          photoURL: '',
        }).catch(() => {});
        showToast(`مرحباً بك يا ${guestName}! تم الدخول بنجاح`);
      }
    } catch (err: any) {
      console.error('Guest sign in error:', err);
      setAuthError('تعذر تسجيل الدخول السريع، يرجى المحاولة عبر Google أو البريد.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setSelectedConvId(null);
      setSelectedCommunityId(null);
      setActiveTab('home');
      showToast('تم تسجيل الخروج بنجاح.');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Handle Start In-App Video or Audio Call
  const handleStartCall = async (
    title?: string,
    type: 'video' | 'audio' | 'group' = 'video',
    targetUser?: { uid: string; displayName?: string; photoURL?: string }
  ) => {
    if (!userProfile) return;
    try {
      const call = await createCallRecord(
        userProfile,
        title || `مكالمة ${userProfile.displayName}`,
        type,
        targetUser
      );
      // Launch in-app call directly
      setActiveInAppCall(call);
      if (targetUser?.displayName) {
        showToast(`جارٍ الاتصال بـ ${targetUser.displayName}...`);
      } else {
        showToast('تم بدء المكالمة المباشرة داخل التطبيق!');
      }
    } catch (err) {
      console.error('Failed to start call:', err);
      showToast('تعذر بدء المكالمة، يرجى المحاولة لاحقاً.');
    }
  };

  // Handle Accept Incoming Call
  const handleAcceptIncomingCall = async (call: CallRecord) => {
    if (!userProfile) return;
    try {
      await updateCallStatus(call.id, 'accepted', userProfile.uid);
      setIncomingCall(null);
      setActiveInAppCall({ ...call, status: 'accepted' });
      showToast(`تم قبول المكالمة من ${call.hostName}`);
    } catch (err) {
      console.error('Error accepting call:', err);
      showToast('حدث خطأ أثناء قبول المكالمة.');
    }
  };

  // Handle Decline Incoming Call
  const handleDeclineIncomingCall = async (call: CallRecord) => {
    try {
      await updateCallStatus(call.id, 'declined');
      setIncomingCall(null);
      showToast(`تم رفض مكالمة ${call.hostName}`);
    } catch (err) {
      console.error('Error declining call:', err);
      setIncomingCall(null);
    }
  };

  // Handle Join In-App Call from Record
  const handleJoinCall = (call: CallRecord) => {
    setActiveInAppCall(call);
    showToast(`انضممت إلى ${call.title}`);
  };

  // Handle Join / Leave Community
  const handleToggleCommunity = async (communityId: string) => {
    if (!userProfile) return;
    const comm = communities.find((c) => c.id === communityId);
    if (!comm) return;

    const isMember = comm.members && comm.members.includes(userProfile.uid);
    try {
      await toggleCommunityMembership(communityId, userProfile.uid, !isMember);
      showToast(isMember ? `غادرت مجتمع ${comm.title}` : `انضممت إلى مجتمع ${comm.title}`);
    } catch (err) {
      console.error('Error toggling community:', err);
      showToast('حدث خطأ أثناء تحديث العضوية.');
    }
  };

  // Active selected conversation object
  const activeConversation = conversations.find((c) => c.id === selectedConvId);

  // Active selected community object
  const activeCommunity = communities.find((c) => c.id === selectedCommunityId);

  // Loading Screen
  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#f8f7f3] p-4 text-center">
        <div className="w-16 h-16 rounded-3xl overflow-hidden shadow-xl mb-4 animate-bounce border border-neutral-200 bg-neutral-900 flex items-center justify-center">
          <img
            src={APP_LOGO_URL}
            alt="Malek Message"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-xl font-black text-[#18181b] tracking-tight">Malek Message</h2>
        <p className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جارٍ الاتصال بقاعدة بيانات Firebase...</span>
        </p>
      </div>
    );
  }

  // Not Logged In View
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#f8f7f3] flex items-center justify-center p-3 md:p-6" dir="rtl">
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 max-w-md w-full shadow-2xl border border-neutral-200/80 text-center relative overflow-hidden">
          {/* App Badge */}
          <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-xl mx-auto mb-4 border border-neutral-200/80 bg-neutral-900 flex items-center justify-center">
            <img
              src={APP_LOGO_URL}
              alt="Malek Message"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-[#18181b] tracking-tight mb-1">
            Malek Message
          </h1>
          <p className="text-xs text-neutral-400 mb-6">
            منصة المحادثات والمكالمات الفورية المدعومة بـ Firebase و ImageKit
          </p>

          {authError && (
            <div className="p-3 mb-4 rounded-2xl bg-rose-50 text-rose-700 text-xs font-medium text-right border border-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1 text-rose-800">
                <span>تنبيه المصادقة:</span>
              </div>
              <p>{authError}</p>
            </div>
          )}

          {/* Email/Password Form - Primary Authentication */}
          <form onSubmit={handleEmailAuth} className="space-y-3 text-right">
            {/* Full Name for Registration */}
            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">الاسم الكامل</label>
                <div className="relative">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="مثال: أحمد محمد"
                    className="w-full h-11 rounded-2xl bg-[#f8f7f3] pr-10 pl-4 text-xs outline-none border border-transparent focus:border-[#6d5dfc]/40 text-right font-sans"
                    required
                  />
                  <User className="w-4 h-4 absolute right-3.5 top-3.5 text-neutral-400" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-11 rounded-2xl bg-[#f8f7f3] pr-10 pl-4 text-xs outline-none border border-transparent focus:border-[#6d5dfc]/40 text-left font-sans"
                  required
                />
                <Mail className="w-4 h-4 absolute right-3.5 top-3.5 text-neutral-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 rounded-2xl bg-[#f8f7f3] pr-10 pl-10 text-xs outline-none border border-transparent focus:border-[#6d5dfc]/40 text-left font-sans"
                  required
                />
                <Lock className="w-4 h-4 absolute right-3.5 top-3.5 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full h-12 rounded-2xl bg-[#111827] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#302c52] transition cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {authSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>{authMode === 'login' ? 'جارٍ تسجيل الدخول...' : 'جارٍ إنشاء الحساب...'}</span>
                </>
              ) : authMode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4 text-emerald-400" />
                  <span>تسجيل الدخول</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>إنشاء حساب جديد</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col gap-2.5 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setAuthError('');
              }}
              className="text-xs font-bold text-[#6d5dfc] hover:underline cursor-pointer"
            >
              {authMode === 'login'
                ? 'ليس لديك حساب؟ اضغط لإنشاء حساب جديد الآن'
                : 'لديك حساب بالفعل؟ اضغط لتسجيل الدخول'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-2 text-xs text-neutral-300">
              <span className="h-px bg-neutral-200 flex-1" />
              <span>أو خيارات أخرى</span>
              <span className="h-px bg-neutral-200 flex-1" />
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              type="button"
              className="w-full h-11 rounded-2xl bg-white hover:bg-neutral-50 text-neutral-800 font-medium text-xs flex items-center justify-center gap-2.5 border border-neutral-200 transition cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>تسجيل الدخول عبر Google</span>
            </button>

            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={authSubmitting}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800 transition cursor-pointer py-1"
            >
              أو الدخول التجريبي الفوري المباشر بدون كلمة مرور
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#f8f7f3] text-[#18181b] overflow-hidden select-none font-sans" dir="rtl">
      {/* 1. Real-time Incoming Message Notification Toast */}
      <MessageNotificationToast
        notification={incomingNotification}
        onOpenConversation={(convId) => {
          setSelectedConvId(convId);
          setActiveTab('inbox');
        }}
        onDismiss={() => setIncomingNotification(null)}
      />

      {/* 2. Standard Toast Notification Banner */}
      {notificationToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationToast}</span>
        </div>
      )}

      {/* 3. Browser Notification Prompt Banner (Shown once if permission is default) */}
      {showNotificationPrompt && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-72 z-40 bg-[#18181b] text-white p-3.5 rounded-2xl shadow-xl border border-neutral-700 flex items-center justify-between gap-3 max-w-md animate-in slide-in-from-bottom-3 duration-250">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#e9e5ff] text-[#6d5dfc] flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">تفعيل إشعارات الرسائل الفورية؟</span>
              <span className="text-[10px] text-neutral-400 block truncate">لتصلك تنبيهات الرسائل حتى عند عدم فتح التطبيق</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                await requestNotificationPermission();
                playMessageSound();
                setShowNotificationPrompt(false);
                showToast('تم تفعيل إشعارات الرسائل!');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold text-[11px] transition cursor-pointer shadow-xs"
            >
              تفعيل
            </button>
            <button
              onClick={() => setShowNotificationPrompt(false)}
              className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-400 text-[11px] transition cursor-pointer"
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <SidebarNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'inbox') setSelectedConvId(null);
          if (tab !== 'discover') setSelectedCommunityId(null);
        }}
        currentUser={userProfile}
        onOpenNewChat={() => setNewChatModalOpen(true)}
        onLogout={handleLogout}
        unreadCount={conversations.reduce((acc, c) => acc + (c.unreadCount?.[userProfile.uid] || 0), 0)}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
        {/* Tab 1: Home Feed */}
        {activeTab === 'home' && (
          <HomeFeed
            currentUser={userProfile}
            conversations={conversations}
            communities={communities}
            calls={calls}
            notes={notes}
            onSelectConversation={(id) => {
              setSelectedConvId(id);
              setSelectedCommunityId(null);
              setActiveTab('inbox');
            }}
            onSelectCommunity={(commId) => {
              setSelectedCommunityId(commId);
              setActiveTab('discover');
            }}
            onOpenNewChat={() => setNewChatModalOpen(true)}
            onOpenNewCommunity={() => setNewCommunityModalOpen(true)}
            onOpenNewNote={() => setNewNoteModalOpen(true)}
            onStartCall={(title) => handleStartCall(title, 'video')}
            onTabChange={setActiveTab}
          />
        )}

        {/* Tab 2: Inbox & Messaging (Optimized for Mobile and Desktop) */}
        {activeTab === 'inbox' && (
          <div className="flex-1 flex h-full min-w-0 w-full overflow-hidden">
            {/* Mobile View Switching: If selectedConvId is active on mobile, show ChatView full screen; else show InboxList */}
            <div
              className={`h-full flex-1 md:flex-none md:w-80 lg:w-96 min-w-0 ${
                selectedConvId ? 'hidden md:block' : 'block w-full'
              }`}
            >
              <InboxList
                conversations={conversations}
                selectedConvId={selectedConvId}
                currentUser={userProfile}
                onSelectConversation={(id) => setSelectedConvId(id)}
                onOpenNewChat={() => setNewChatModalOpen(true)}
              />
            </div>

            {/* Chat View Area */}
            <div
              className={`h-full flex-1 min-w-0 w-full ${
                selectedConvId ? 'flex flex-col' : 'hidden md:flex flex-col items-center justify-center'
              }`}
            >
              {selectedConvId && activeConversation ? (
                <ChatView
                  conversation={activeConversation}
                  currentUser={userProfile}
                  messages={messages}
                  onBack={() => setSelectedConvId(null)}
                  onStartCall={(targetName, type, targetUser) => handleStartCall(`مكالمة مع ${targetName}`, type || 'video', targetUser)}
                  showToast={showToast}
                  onOpenImage={(url) => setLightboxUrl(url)}
                />
              ) : (
                <div className="text-center p-8 max-w-sm">
                  <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center mx-auto mb-4 text-[#6d5dfc]">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-[#18181b] mb-1">اختر محادثة للبدء</h3>
                  <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
                    حدد جهة اتصال من القائمة لمشاهدة الرسائل أو رفع الصور والملفات عبر ImageKit
                  </p>
                  <button
                    onClick={() => setNewChatModalOpen(true)}
                    className="px-5 py-2.5 rounded-2xl bg-[#111827] text-white text-xs font-bold hover:bg-[#302c52] transition cursor-pointer shadow-md"
                  >
                    بدء محادثة جديدة
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Communities & Group Chats */}
        {activeTab === 'discover' && (
          selectedCommunityId && activeCommunity ? (
            <CommunityChatView
              community={activeCommunity}
              currentUser={userProfile}
              messages={communityMessages}
              onBack={() => setSelectedCommunityId(null)}
              onStartCall={(title, type) => handleStartCall(title, type || 'group')}
              showToast={showToast}
              onOpenImage={(url) => setLightboxUrl(url)}
            />
          ) : (
            <DiscoverView
              communities={communities}
              currentUser={userProfile}
              onOpenNewCommunity={() => setNewCommunityModalOpen(true)}
              onToggleJoin={handleToggleCommunity}
              onSelectCommunity={(commId) => setSelectedCommunityId(commId)}
            />
          )
        )}

        {/* Tab 4: Calls & Meetings */}
        {activeTab === 'calls' && (
          <CallsView
            calls={calls}
            currentUser={userProfile}
            onStartCall={(title, type) => handleStartCall(title, type)}
            onJoinCall={handleJoinCall}
            showToast={showToast}
          />
        )}

        {/* Tab 5: Profile */}
        {activeTab === 'profile' && (
          <ProfileView
            currentUser={userProfile}
            onOpenEditProfile={() => setEditProfileModalOpen(true)}
            onLogout={handleLogout}
            showToast={showToast}
          />
        )}

        {/* Mobile Bottom Navigation (Visible when not actively chatting in a conversation or community) */}
        {(!selectedConvId || activeTab !== 'inbox') && (!selectedCommunityId || activeTab !== 'discover') && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              if (tab !== 'inbox') setSelectedConvId(null);
              if (tab !== 'discover') setSelectedCommunityId(null);
            }}
            unreadCount={conversations.reduce((acc, c) => acc + (c.unreadCount?.[userProfile.uid] || 0), 0)}
          />
        )}
      </main>

      {/* Incoming Call Ringing Modal (Accept / Decline) */}
      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* In-App Direct Audio & Video Call Overlay */}
      {activeInAppCall && (
        <ActiveInAppCall
          callRecord={activeInAppCall}
          currentUser={userProfile}
          isOpen={Boolean(activeInAppCall)}
          onEndCall={() => setActiveInAppCall(null)}
          showToast={showToast}
        />
      )}

      {/* Onboarding Profile Setup Modal */}
      {onboardingOpen && (
        <OnboardingModal
          currentUser={userProfile}
          isOpen={onboardingOpen}
          onComplete={(updated) => {
            setUserProfile((prev) => (prev ? { ...prev, ...updated } : null));
            setOnboardingOpen(false);
          }}
          showToast={showToast}
        />
      )}

      {/* Edit Profile Modal */}
      {editProfileModalOpen && (
        <EditProfileModal
          currentUser={userProfile}
          isOpen={editProfileModalOpen}
          onClose={() => setEditProfileModalOpen(false)}
          onProfileUpdated={(updated) => {
            setUserProfile((prev) => (prev ? { ...prev, ...updated } : null));
          }}
          showToast={showToast}
        />
      )}

      {/* Call Creation Modal */}
      {callModalOpen && (
        <CallModal
          currentUser={userProfile}
          isOpen={callModalOpen}
          onClose={() => setCallModalOpen(false)}
          onLaunchInAppCall={(call) => setActiveInAppCall(call)}
          showToast={showToast}
        />
      )}

      {/* New Chat Modal */}
      {newChatModalOpen && (
        <NewChatModal
          currentUser={userProfile}
          isOpen={newChatModalOpen}
          onClose={() => setNewChatModalOpen(false)}
          onSelectConversation={(convId) => {
            setSelectedConvId(convId);
            setSelectedCommunityId(null);
            setActiveTab('inbox');
          }}
          showToast={showToast}
        />
      )}

      {/* New Community Modal */}
      {newCommunityModalOpen && (
        <NewCommunityModal
          currentUser={userProfile}
          isOpen={newCommunityModalOpen}
          onClose={() => setNewCommunityModalOpen(false)}
          onSuccess={(commId) => {
            if (commId) {
              setSelectedCommunityId(commId);
              setActiveTab('discover');
            }
          }}
          showToast={showToast}
        />
      )}

      {/* New Note Modal */}
      {newNoteModalOpen && (
        <NewNoteModal
          currentUser={userProfile}
          isOpen={newNoteModalOpen}
          onClose={() => setNewNoteModalOpen(false)}
          onNoteCreated={() => {}}
          showToast={showToast}
        />
      )}

      {/* Media Lightbox */}
      {lightboxUrl && (
        <MediaLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Custom primary audio link provided by user
export const DEFAULT_CUSTOM_AUDIO_URL =
  'https://mp3tourl.com/audio/1787240708486-76abcc21-7651-4271-9f97-3001170a8083.mp3';

let cachedAudioElement: HTMLAudioElement | null = null;

function getCachedAudio(): HTMLAudioElement {
  if (!cachedAudioElement && typeof window !== 'undefined') {
    cachedAudioElement = new Audio(DEFAULT_CUSTOM_AUDIO_URL);
    cachedAudioElement.preload = 'auto';
  }
  return cachedAudioElement || new Audio(DEFAULT_CUSTOM_AUDIO_URL);
}

// Sound Synthesizer using Web Audio API for crisp, high-clarity notification sounds
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext not supported or blocked:', err);
    return null;
  }
}

export type SoundToneType =
  | 'primary_custom'
  | 'apple_crystal'
  | 'telegram_pop'
  | 'warm_marimba'
  | 'soft_bell';

export interface SoundOption {
  id: SoundToneType;
  name: string;
  desc: string;
  isDefault?: boolean;
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'primary_custom',
    name: 'صوت الإشعار الأساسي (الرابط المعتمد)',
    desc: 'الصوت المخصص الأساسي المعتمد من الرابط المباشر',
    isDefault: true,
  },
  {
    id: 'apple_crystal',
    name: 'رنين واضح نقي (Crystal Clear)',
    desc: 'نغمة ثنائية عالية الوضوح والنقاء (Hi-Fi)',
  },
  {
    id: 'telegram_pop',
    name: 'تنبيه الرسائل السريع (Message Pop)',
    desc: 'صوت واضح وحيوي ومميز لوصول الرسائل',
  },
  {
    id: 'warm_marimba',
    name: 'ماريمبا واضحة (Clear Marimba)',
    desc: 'ثلاث نغمات واضحة ومتناغمة تصاعدية',
  },
  {
    id: 'soft_bell',
    name: 'جرس مسموع (Golden Bell)',
    desc: 'رنين جرس ذهبي واضح بموجات متوازنة',
  },
];

/**
 * Retrieves current notification volume (0 to 100, default 75)
 */
export function getNotificationVolume(): number {
  if (typeof window === 'undefined') return 75;
  const stored = localStorage.getItem('malek_notif_volume');
  if (stored !== null) {
    const val = parseInt(stored, 10);
    if (!isNaN(val) && val >= 0 && val <= 100) return val;
  }
  return 75; // Default 75%
}

/**
 * Sets current notification volume (0 to 100)
 */
export function setNotificationVolume(volume: number): void {
  const bounded = Math.max(0, Math.min(100, Math.round(volume)));
  localStorage.setItem('malek_notif_volume', String(bounded));
}

/**
 * Plays the chosen notification sound (Custom Link by default, or synthesized tones)
 */
export function playMessageSound(forcedTone?: SoundToneType, forcedVolume?: number): void {
  const isSoundEnabled = localStorage.getItem('malek_notif_sound_enabled') !== 'false';
  if (!isSoundEnabled && !forcedTone) return;

  const tone: SoundToneType =
    forcedTone ||
    (localStorage.getItem('malek_notif_sound_type') as SoundToneType) ||
    'primary_custom';

  const volPercent = forcedVolume !== undefined ? forcedVolume : getNotificationVolume();
  const volumeScale = Math.max(0, Math.min(1, volPercent / 100));

  if (volumeScale === 0) return;

  // 1. If Primary Custom URL Tone
  if (tone === 'primary_custom') {
    try {
      const audio = getCachedAudio();
      audio.volume = Math.max(0, Math.min(1, volumeScale));
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Direct audio play was blocked or failed, using fallback synthesizer:', err);
          playSynthesizedTone('apple_crystal', volumeScale);
        });
      }
      return;
    } catch (err) {
      console.warn('Audio tag failed, fallback to synth:', err);
      playSynthesizedTone('apple_crystal', volumeScale);
      return;
    }
  }

  // 2. Synthesized web audio tones
  playSynthesizedTone(tone, volumeScale);
}

function playSynthesizedTone(tone: SoundToneType, volumeScale: number) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.75 * volumeScale, now);
    masterGain.connect(ctx.destination);

    if (tone === 'apple_crystal' || tone === 'primary_custom') {
      playClearNote(ctx, masterGain, 1046.5, now, 0.45, 0.005, 0.28); // C6
      playClearNote(ctx, masterGain, 1567.98, now + 0.09, 0.55, 0.005, 0.35); // G6
    } else if (tone === 'telegram_pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.exponentialRampToValueAtTime(1750, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.14);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.55, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + 0.24);
    } else if (tone === 'warm_marimba') {
      playClearNote(ctx, masterGain, 659.25, now, 0.4, 0.005, 0.22);
      playClearNote(ctx, masterGain, 880.0, now + 0.08, 0.45, 0.005, 0.24);
      playClearNote(ctx, masterGain, 1108.73, now + 0.16, 0.5, 0.005, 0.3);
    } else {
      // Golden Bell
      playClearNote(ctx, masterGain, 987.77, now, 0.45, 0.005, 0.4);
      playClearNote(ctx, masterGain, 1318.51, now + 0.06, 0.5, 0.005, 0.5);
    }
  } catch (e) {
    console.warn('Could not play synthesized sound:', e);
  }
}

function playClearNote(
  ctx: AudioContext,
  destination: AudioNode,
  freq: number,
  startTime: number,
  volume: number,
  attack: number,
  duration: number
) {
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, startTime);

  gain1.gain.setValueAtTime(0.0001, startTime);
  gain1.gain.linearRampToValueAtTime(volume, startTime + attack);
  gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc1.connect(gain1);
  gain1.connect(destination);

  osc1.start(startTime);
  osc1.stop(startTime + duration + 0.05);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 2, startTime);

  gain2.gain.setValueAtTime(0.0001, startTime);
  gain2.gain.linearRampToValueAtTime(volume * 0.25, startTime + attack);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.6);

  osc2.connect(gain2);
  gain2.connect(destination);

  osc2.start(startTime);
  osc2.stop(startTime + duration + 0.05);
}

/**
 * Checks current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Requests desktop / browser notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('malek_notif_browser_enabled', 'true');
    }
    return permission;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return 'denied';
  }
}

/**
 * Displays a system/browser notification when the user is in another tab or app is minimized
 */
export function showBrowserNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    tag?: string;
  },
  onClick?: () => void
): void {
  const isBrowserNotifEnabled = localStorage.getItem('malek_notif_browser_enabled') !== 'false';
  if (!isBrowserNotifEnabled) return;

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'chat-message',
    });

    notification.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notification.close();
    };

    setTimeout(() => {
      notification.close();
    }, 5000);
  } catch (err) {
    console.warn('Failed to display browser notification:', err);
  }
}

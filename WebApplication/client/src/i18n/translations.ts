/**
 * Bilingual copy — বাংলা (default) and English.
 *
 * Every user-visible string lives here so the two languages can never drift:
 * `Translation` is derived from the Bengali object, so omitting a key in
 * English is a compile-time error.
 */

export const bn = {
  meta: { htmlLang: 'bn', label: 'বাংলা' },

  header: {
    tagline: 'অডিও থেকে লেখা',
    subtitle: 'Whisper AI দিয়ে দ্রুত ও নির্ভুল প্রতিলিপি',
    poweredBy: 'Whisper large-v3-turbo',
  },

  account: {
    signIn: 'লগইন',
    signOut: 'লগআউট',
    dashboard: 'ড্যাশবোর্ড',
    menuLabel: 'অ্যাকাউন্ট মেনু',
  },

  auth: {
    fields: {
      identifier: 'ইউজারনেম বা ইমেইল',
      identifierHint: 'যেকোনো একটি দিলেই হবে',
      username: 'ইউজারনেম',
      usernameHint: '৩–৩২ অক্ষর — অক্ষর, সংখ্যা, . _ -',
      email: 'ইমেইল',
      password: 'পাসওয়ার্ড',
      passwordHint: 'কমপক্ষে ৬ অক্ষর',
      fullName: 'পূর্ণ নাম',
      optional: 'ঐচ্ছিক',
      showPassword: 'পাসওয়ার্ড দেখান',
      hidePassword: 'পাসওয়ার্ড লুকান',
    },
    speech: {
      greeting: 'স্বাগতম! আবার দেখা হয়ে ভালো লাগল।',
      identifier: 'এখানে আপনার ইউজারনেম বা ইমেইল লিখুন।',
      password: 'চোখ বন্ধ করে আছি — নিশ্চিন্তে লিখুন।',
      peeking: 'দেখাচ্ছেন? ঠিক আছে, তাকিয়ে আছি!',
      welcome: 'দারুণ! ভেতরে নিয়ে যাচ্ছি…',
      tryAgain: 'ওহ, মিলল না। আরেকবার চেষ্টা করুন।',
      registerGreeting: 'নতুন এসেছেন? চলুন অ্যাকাউন্ট বানাই।',
      register: 'এই ঘরটা পূরণ করুন।',
      created: 'অ্যাকাউন্ট তৈরি! স্বাগতম।',
      checkFields: 'লাল লেখা ঘরগুলো একটু দেখুন।',
      forgotGreeting: 'পাসওয়ার্ড ভুলে গেছেন? চিন্তা নেই।',
      forgotEmail: 'অ্যাকাউন্টের ইমেইলটা দিন।',
      sent: 'পাঠিয়ে দিয়েছি! ইনবক্স দেখুন।',
      resetGreeting: 'নতুন একটা পাসওয়ার্ড বেছে নিন।',
      passwordChanged: 'হয়ে গেছে! এখন লগইন করুন।',
      badLink: 'লিংকটা অসম্পূর্ণ মনে হচ্ছে…',
    },
    login: {
      title: 'লগইন করুন',
      subtitle: 'আপনার অ্যাকাউন্টে ফিরে আসুন',
      submit: 'লগইন',
      submitting: 'যাচাই করা হচ্ছে…',
      noAccount: 'অ্যাকাউন্ট নেই?',
      registerLink: 'রেজিস্টার করুন',
      forgotLink: 'পাসওয়ার্ড ভুলে গেছেন?',
    },
    register: {
      title: 'অ্যাকাউন্ট তৈরি করুন',
      subtitle: 'কয়েক সেকেন্ডেই শুরু করুন',
      submit: 'রেজিস্টার',
      submitting: 'তৈরি হচ্ছে…',
      haveAccount: 'আগে থেকেই অ্যাকাউন্ট আছে?',
      loginLink: 'লগইন করুন',
    },
    forgot: {
      title: 'পাসওয়ার্ড রিসেট',
      subtitle: 'রিসেট লিংক পাঠিয়ে দেব',
      emailHint: 'রেজিস্ট্রেশনে যে ইমেইল দিয়েছিলেন',
      submit: 'রিসেট লিংক পাঠান',
      submitting: 'পাঠানো হচ্ছে…',
      remembered: 'মনে পড়ে গেছে?',
      loginLink: 'লগইনে ফিরুন',
      devNoticeTitle: 'ডেভেলপমেন্ট মোড',
      devNoticeBody: 'ইমেইল সার্ভিস এখনো যুক্ত হয়নি, তাই লিংকটা এখানে দেখানো হচ্ছে।',
    },
    reset: {
      title: 'নতুন পাসওয়ার্ড',
      subtitle: 'নতুন একটি পাসওয়ার্ড দিন',
      newPassword: 'নতুন পাসওয়ার্ড',
      submit: 'পাসওয়ার্ড বদলান',
      submitting: 'সংরক্ষণ হচ্ছে…',
      success: 'পাসওয়ার্ড বদলে গেছে। লগইন পেজে নিয়ে যাচ্ছি…',
      backToLogin: 'লগইনে ফিরুন',
      invalidTitle: 'লিংকটি কাজ করছে না',
      invalidSubtitle: 'রিসেট টোকেন পাওয়া যায়নি',
      invalidBody: 'লিংকটি অসম্পূর্ণ। নতুন করে একটি রিসেট লিংক চেয়ে নিন।',
      requestNew: 'নতুন লিংক চান',
    },
    errors: {
      network: 'সার্ভারে পৌঁছানো যাচ্ছে না। ইন্টারনেট দেখে আবার চেষ্টা করুন।',
      sessionExpired: 'আপনার সেশনের মেয়াদ শেষ হয়েছে। অনুগ্রহ করে আবার লগইন করুন।',
    },
    dashboard: {
      greeting: 'স্বাগতম,',
      subtitle: 'আপনার অ্যাকাউন্টে সবকিছু ঠিক আছে।',
      transcribeTitle: 'অডিও থেকে লেখা',
      transcribeBody: 'ফাইল আপলোড করে প্রতিলিপি নিন।',
      adminTitle: 'অ্যাডমিন ড্যাশবোর্ড',
      adminBody: 'পরিসংখ্যান, লগ ও সেটিংস দেখুন।',
    },
  },

  hero: {
    title: 'আপনার অডিও, সেকেন্ডেই লেখা',
    description:
      'MP3, WAV বা M4A ফাইল আপলোড করুন — কৃত্রিম বুদ্ধিমত্তা দিয়ে সম্পূর্ণ প্রতিলিপি পান। বাংলা ও ইংরেজিসহ ৯৯টি ভাষা সমর্থিত।',
  },

  upload: {
    title: 'অডিও ফাইল আপলোড করুন',
    dropHere: 'ফাইল এখানে ছাড়ুন',
    dragDrop: 'ফাইল টেনে আনুন অথবা',
    browse: 'ব্রাউজ করুন',
    formats: 'MP3 · WAV · M4A',
    maxSize: 'সর্বোচ্চ ১০ মেগাবাইট',
    change: 'ফাইল পরিবর্তন করুন',
    remove: 'সরান',
    selected: 'নির্বাচিত ফাইল',
  },

  language: {
    label: 'অডিওর ভাষা',
    auto: 'স্বয়ংক্রিয় শনাক্তকরণ',
    bengali: 'বাংলা',
    english: 'ইংরেজি',
    hint: 'সঠিক ভাষা বাছাই করলে নির্ভুলতা বাড়ে',
    more: 'আরও ভাষা',
    searchPlaceholder: 'ভাষা খুঁজুন…',
    allLanguages: 'সব ভাষা',
    noMatch: 'কোনো ভাষা মেলেনি',
    totalCount: 'মোট {count}টি ভাষা সমর্থিত',
  },

  player: {
    title: 'শুনে দেখুন',
    play: 'চালান',
    pause: 'থামান',
    speed: 'গতি',
    seek: 'সময় নির্বাচন',
  },

  actions: {
    transcribe: 'প্রতিলিপি তৈরি করুন',
    transcribing: 'প্রতিলিপি তৈরি হচ্ছে…',
    cancel: 'বাতিল করুন',
    tryAgain: 'আবার চেষ্টা করুন',
    reset: 'নতুন ফাইল',
  },

  progress: {
    uploading: 'ফাইল আপলোড হচ্ছে',
    processing: 'AI মডেল বিশ্লেষণ করছে',
    finalizing: 'প্রতিলিপি প্রস্তুত হচ্ছে',
    hint: 'বড় ফাইলে কিছুটা সময় লাগতে পারে — পাতা বন্ধ করবেন না',
    elapsed: 'সময় অতিবাহিত',
  },

  result: {
    title: 'প্রতিলিপি',
    empty: 'এখনো কোনো প্রতিলিপি নেই',
    emptyHint: 'একটি অডিও ফাইল আপলোড করে শুরু করুন',
    copy: 'কপি করুন',
    copied: 'কপি হয়েছে!',
    download: 'ডাউনলোড .txt',
    words: 'শব্দ',
    characters: 'অক্ষর',
    duration: 'সময় লেগেছে',
  },

  errors: {
    title: 'সমস্যা হয়েছে',
    NO_FILE: 'কোনো ফাইল নির্বাচন করা হয়নি।',
    FILE_TOO_LARGE: 'ফাইলটি ১০ মেগাবাইটের চেয়ে বড়। ছোট ফাইল ব্যবহার করুন।',
    UNSUPPORTED_MEDIA_TYPE: 'এই ফাইল ফরম্যাট সমর্থিত নয়। MP3, WAV বা M4A ব্যবহার করুন।',
    RATE_LIMITED: 'অনেক বেশি অনুরোধ পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    HF_TOKEN_MISSING: 'সার্ভারে API টোকেন সেট করা নেই। প্রশাসকের সাথে যোগাযোগ করুন।',
    HF_AUTH_FAILED: 'API টোকেন গ্রহণযোগ্য নয়। প্রশাসকের সাথে যোগাযোগ করুন।',
    UPSTREAM_UNAVAILABLE: 'AI মডেল এখন প্রস্তুত হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
    UPSTREAM_TIMEOUT: 'সময় শেষ হয়ে গেছে। ছোট একটি ফাইল দিয়ে চেষ্টা করুন।',
    UPSTREAM_ERROR: 'প্রতিলিপি সেবায় সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    NETWORK: 'সার্ভারের সাথে সংযোগ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।',
    CANCELLED: 'অনুরোধটি বাতিল করা হয়েছে।',
    UNKNOWN: 'অপ্রত্যাশিত সমস্যা হয়েছে। আবার চেষ্টা করুন।',
    clientTooLarge: 'ফাইলটি {size} — সর্বোচ্চ সীমা ১০ মেগাবাইট।',
    clientBadType: '“{name}” সমর্থিত নয়। শুধু MP3, WAV বা M4A ফাইল দিন।',
  },

  status: {
    online: 'সার্ভার সচল',
    offline: 'সার্ভার বন্ধ',
    checking: 'সংযোগ পরীক্ষা…',
    notConfigured: 'API টোকেন নেই',
  },

  footer: {
    builtWith: 'তৈরি করেছে',
    privacy: 'আপনার অডিও প্রতিলিপির পরপরই সার্ভার থেকে মুছে ফেলা হয়।',
  },
} as const;

/** Shape every language must satisfy. */
/**
 * Every locale must mirror the Bengali structure exactly — same keys, at any
 * depth, with strings at the leaves. Recursing rather than assuming two levels
 * means a nested section (like `auth.fields`) is still checked key-for-key
 * instead of failing to typecheck.
 */
type Mirror<T> = { readonly [K in keyof T]: T[K] extends string ? string : Mirror<T[K]> };

export type Translation = Mirror<typeof bn>;

export const en: Translation = {
  meta: { htmlLang: 'en', label: 'English' },

  header: {
    tagline: 'Audio to text',
    subtitle: 'Fast, accurate transcription powered by Whisper AI',
    poweredBy: 'Whisper large-v3-turbo',
  },

  account: {
    signIn: 'Sign in',
    signOut: 'Sign out',
    dashboard: 'Dashboard',
    menuLabel: 'Account menu',
  },

  auth: {
    fields: {
      identifier: 'Username or email',
      identifierHint: 'Either one works',
      username: 'Username',
      usernameHint: '3–32 characters: letters, numbers, . _ -',
      email: 'Email',
      password: 'Password',
      passwordHint: 'At least 6 characters',
      fullName: 'Full name',
      optional: 'Optional',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
    },
    speech: {
      greeting: 'Welcome back! Good to see you.',
      identifier: 'Pop your username or email in here.',
      password: 'Eyes closed — type away.',
      peeking: 'Showing it? Fine, I am looking!',
      welcome: 'Nice! Taking you inside…',
      tryAgain: 'Hmm, that did not match. Try again.',
      registerGreeting: 'New here? Let us make you an account.',
      register: 'Fill in this one.',
      created: 'Account created. Welcome aboard!',
      checkFields: 'Have a look at the fields in red.',
      forgotGreeting: 'Forgot your password? No trouble.',
      forgotEmail: 'Give me the email on your account.',
      sent: 'Sent! Go check your inbox.',
      resetGreeting: 'Pick yourself a new password.',
      passwordChanged: 'All done! Sign in with it now.',
      badLink: 'That link looks incomplete…',
    },
    login: {
      title: 'Sign in',
      subtitle: 'Welcome back to your account',
      submit: 'Sign in',
      submitting: 'Checking…',
      noAccount: 'No account yet?',
      registerLink: 'Create one',
      forgotLink: 'Forgot your password?',
    },
    register: {
      title: 'Create an account',
      subtitle: 'Get started in a few seconds',
      submit: 'Create account',
      submitting: 'Creating…',
      haveAccount: 'Already have an account?',
      loginLink: 'Sign in',
    },
    forgot: {
      title: 'Reset your password',
      subtitle: 'We will send you a reset link',
      emailHint: 'The address you registered with',
      submit: 'Send reset link',
      submitting: 'Sending…',
      remembered: 'Remembered it?',
      loginLink: 'Back to sign in',
      devNoticeTitle: 'Development mode',
      devNoticeBody: 'No mail service is configured yet, so the link is shown here.',
    },
    reset: {
      title: 'Set a new password',
      subtitle: 'Choose something you have not used before',
      newPassword: 'New password',
      submit: 'Change password',
      submitting: 'Saving…',
      success: 'Password changed. Taking you to sign in…',
      backToLogin: 'Back to sign in',
      invalidTitle: 'This link does not work',
      invalidSubtitle: 'No reset token found',
      invalidBody: 'The link is incomplete. Request a fresh reset link.',
      requestNew: 'Request a new link',
    },
    errors: {
      network: 'Could not reach the server. Check your connection and try again.',
      sessionExpired: 'Your session has expired. Please sign in again.',
    },
    dashboard: {
      greeting: 'Welcome,',
      subtitle: 'Everything on your account is in order.',
      transcribeTitle: 'Transcribe audio',
      transcribeBody: 'Upload a file and get the text back.',
      adminTitle: 'Admin dashboard',
      adminBody: 'Stats, logs and settings.',
    },
  },

  hero: {
    title: 'Your audio, written in seconds',
    description:
      'Upload an MP3, WAV or M4A file and get a full AI transcript. Supports 99 languages including Bengali and English.',
  },

  upload: {
    title: 'Upload an audio file',
    dropHere: 'Drop the file here',
    dragDrop: 'Drag and drop a file, or',
    browse: 'browse',
    formats: 'MP3 · WAV · M4A',
    maxSize: 'Maximum 10 MB',
    change: 'Change file',
    remove: 'Remove',
    selected: 'Selected file',
  },

  language: {
    label: 'Audio language',
    auto: 'Detect automatically',
    bengali: 'Bengali',
    english: 'English',
    hint: 'Choosing the right language improves accuracy',
    more: 'More languages',
    searchPlaceholder: 'Search languages…',
    allLanguages: 'All languages',
    noMatch: 'No language matches',
    totalCount: '{count} languages supported',
  },

  player: {
    title: 'Preview',
    play: 'Play',
    pause: 'Pause',
    speed: 'Speed',
    seek: 'Seek',
  },

  actions: {
    transcribe: 'Transcribe',
    transcribing: 'Transcribing…',
    cancel: 'Cancel',
    tryAgain: 'Try again',
    reset: 'New file',
  },

  progress: {
    uploading: 'Uploading file',
    processing: 'AI model is listening',
    finalizing: 'Preparing transcript',
    hint: 'Large files can take a while — please keep this page open',
    elapsed: 'Elapsed',
  },

  result: {
    title: 'Transcript',
    empty: 'No transcript yet',
    emptyHint: 'Upload an audio file to get started',
    copy: 'Copy',
    copied: 'Copied!',
    download: 'Download .txt',
    words: 'words',
    characters: 'characters',
    duration: 'took',
  },

  errors: {
    title: 'Something went wrong',
    NO_FILE: 'No file was selected.',
    FILE_TOO_LARGE: 'That file is larger than 10 MB. Please use a smaller one.',
    UNSUPPORTED_MEDIA_TYPE: 'That format is not supported. Use MP3, WAV or M4A.',
    RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
    HF_TOKEN_MISSING: 'The server has no API token configured. Contact the administrator.',
    HF_AUTH_FAILED: 'The API token was rejected. Contact the administrator.',
    UPSTREAM_UNAVAILABLE: 'The AI model is warming up. Please try again shortly.',
    UPSTREAM_TIMEOUT: 'The request timed out. Try a shorter clip.',
    UPSTREAM_ERROR: 'The transcription service failed. Please try again.',
    NETWORK: 'Could not reach the server. Check your internet connection.',
    CANCELLED: 'The request was cancelled.',
    UNKNOWN: 'An unexpected error occurred. Please try again.',
    clientTooLarge: 'That file is {size} — the limit is 10 MB.',
    clientBadType: '“{name}” is not supported. Please use MP3, WAV or M4A.',
  },

  status: {
    online: 'Server online',
    offline: 'Server offline',
    checking: 'Checking…',
    notConfigured: 'No API token',
  },

  footer: {
    builtWith: 'Built by',
    privacy: 'Your audio is deleted from the server immediately after transcription.',
  },
};

export const translations = { bn, en } as const;
export type Locale = keyof typeof translations;
export const LOCALES = Object.keys(translations) as Locale[];

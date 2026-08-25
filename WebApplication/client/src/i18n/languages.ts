/**
 * Spoken languages Whisper can transcribe.
 *
 * Codes mirror the server's SUPPORTED_LANGUAGES allow-list. Each entry carries
 * an endonym (the language's own name) so users can find their language without
 * reading English, plus a Bengali name for the bn locale.
 *
 * `popular` marks the shortlist shown as quick-pick buttons.
 */

export type SpokenLanguage = {
  code: string;
  /** The language's own name. */
  native: string;
  /** English name. */
  en: string;
  /** Bengali name. */
  bn: string;
  popular?: boolean;
};

export const SPOKEN_LANGUAGES: SpokenLanguage[] = [
  { code: 'bn', native: 'বাংলা', en: 'Bengali', bn: 'বাংলা', popular: true },
  { code: 'en', native: 'English', en: 'English', bn: 'ইংরেজি', popular: true },
  { code: 'hi', native: 'हिन्दी', en: 'Hindi', bn: 'হিন্দি', popular: true },
  { code: 'ur', native: 'اردو', en: 'Urdu', bn: 'উর্দু', popular: true },
  { code: 'ar', native: 'العربية', en: 'Arabic', bn: 'আরবি', popular: true },
  { code: 'es', native: 'Español', en: 'Spanish', bn: 'স্প্যানিশ', popular: true },

  { code: 'af', native: 'Afrikaans', en: 'Afrikaans', bn: 'আফ্রিকান্স' },
  { code: 'am', native: 'አማርኛ', en: 'Amharic', bn: 'আমহারিক' },
  { code: 'as', native: 'অসমীয়া', en: 'Assamese', bn: 'অসমীয়া' },
  { code: 'az', native: 'Azərbaycan', en: 'Azerbaijani', bn: 'আজারবাইজানি' },
  { code: 'ba', native: 'Башҡорт', en: 'Bashkir', bn: 'বাশকির' },
  { code: 'be', native: 'Беларуская', en: 'Belarusian', bn: 'বেলারুশীয়' },
  { code: 'bg', native: 'Български', en: 'Bulgarian', bn: 'বুলগেরীয়' },
  { code: 'bo', native: 'བོད་སྐད', en: 'Tibetan', bn: 'তিব্বতি' },
  { code: 'br', native: 'Brezhoneg', en: 'Breton', bn: 'ব্রেটন' },
  { code: 'bs', native: 'Bosanski', en: 'Bosnian', bn: 'বসনীয়' },
  { code: 'ca', native: 'Català', en: 'Catalan', bn: 'কাতালান' },
  { code: 'cs', native: 'Čeština', en: 'Czech', bn: 'চেক' },
  { code: 'cy', native: 'Cymraeg', en: 'Welsh', bn: 'ওয়েলশ' },
  { code: 'da', native: 'Dansk', en: 'Danish', bn: 'ড্যানিশ' },
  { code: 'de', native: 'Deutsch', en: 'German', bn: 'জার্মান' },
  { code: 'el', native: 'Ελληνικά', en: 'Greek', bn: 'গ্রিক' },
  { code: 'et', native: 'Eesti', en: 'Estonian', bn: 'এস্তোনীয়' },
  { code: 'eu', native: 'Euskara', en: 'Basque', bn: 'বাস্ক' },
  { code: 'fa', native: 'فارسی', en: 'Persian', bn: 'ফারসি' },
  { code: 'fi', native: 'Suomi', en: 'Finnish', bn: 'ফিনিশ' },
  { code: 'fo', native: 'Føroyskt', en: 'Faroese', bn: 'ফারোজি' },
  { code: 'fr', native: 'Français', en: 'French', bn: 'ফরাসি' },
  { code: 'gl', native: 'Galego', en: 'Galician', bn: 'গালিসীয়' },
  { code: 'gu', native: 'ગુજરાતી', en: 'Gujarati', bn: 'গুজরাটি' },
  { code: 'ha', native: 'Hausa', en: 'Hausa', bn: 'হাউসা' },
  { code: 'haw', native: 'ʻŌlelo Hawaiʻi', en: 'Hawaiian', bn: 'হাওয়াইয়ান' },
  { code: 'he', native: 'עברית', en: 'Hebrew', bn: 'হিব্রু' },
  { code: 'hr', native: 'Hrvatski', en: 'Croatian', bn: 'ক্রোয়েশীয়' },
  { code: 'ht', native: 'Kreyòl ayisyen', en: 'Haitian Creole', bn: 'হাইতিয়ান ক্রেওল' },
  { code: 'hu', native: 'Magyar', en: 'Hungarian', bn: 'হাঙ্গেরীয়' },
  { code: 'hy', native: 'Հայերեն', en: 'Armenian', bn: 'আর্মেনীয়' },
  { code: 'id', native: 'Bahasa Indonesia', en: 'Indonesian', bn: 'ইন্দোনেশীয়' },
  { code: 'is', native: 'Íslenska', en: 'Icelandic', bn: 'আইসল্যান্ডীয়' },
  { code: 'it', native: 'Italiano', en: 'Italian', bn: 'ইতালীয়' },
  { code: 'ja', native: '日本語', en: 'Japanese', bn: 'জাপানি' },
  { code: 'jw', native: 'Basa Jawa', en: 'Javanese', bn: 'জাভানিজ' },
  { code: 'ka', native: 'ქართული', en: 'Georgian', bn: 'জর্জীয়' },
  { code: 'kk', native: 'Қазақ', en: 'Kazakh', bn: 'কাজাখ' },
  { code: 'km', native: 'ភាសាខ្មែរ', en: 'Khmer', bn: 'খমের' },
  { code: 'kn', native: 'ಕನ್ನಡ', en: 'Kannada', bn: 'কন্নড়' },
  { code: 'ko', native: '한국어', en: 'Korean', bn: 'কোরীয়' },
  { code: 'la', native: 'Latina', en: 'Latin', bn: 'লাতিন' },
  { code: 'lb', native: 'Lëtzebuergesch', en: 'Luxembourgish', bn: 'লুক্সেমবার্গীয়' },
  { code: 'ln', native: 'Lingála', en: 'Lingala', bn: 'লিঙ্গালা' },
  { code: 'lo', native: 'ລາວ', en: 'Lao', bn: 'লাও' },
  { code: 'lt', native: 'Lietuvių', en: 'Lithuanian', bn: 'লিথুয়েনীয়' },
  { code: 'lv', native: 'Latviešu', en: 'Latvian', bn: 'লাটভীয়' },
  { code: 'mg', native: 'Malagasy', en: 'Malagasy', bn: 'মালাগাসি' },
  { code: 'mi', native: 'Te Reo Māori', en: 'Maori', bn: 'মাওরি' },
  { code: 'mk', native: 'Македонски', en: 'Macedonian', bn: 'মেসিডোনীয়' },
  { code: 'ml', native: 'മലയാളം', en: 'Malayalam', bn: 'মালয়ালম' },
  { code: 'mn', native: 'Монгол', en: 'Mongolian', bn: 'মঙ্গোলীয়' },
  { code: 'mr', native: 'मराठी', en: 'Marathi', bn: 'মারাঠি' },
  { code: 'ms', native: 'Bahasa Melayu', en: 'Malay', bn: 'মালয়' },
  { code: 'mt', native: 'Malti', en: 'Maltese', bn: 'মাল্টিজ' },
  { code: 'my', native: 'မြန်မာ', en: 'Burmese', bn: 'বর্মি' },
  { code: 'ne', native: 'नेपाली', en: 'Nepali', bn: 'নেপালি' },
  { code: 'nl', native: 'Nederlands', en: 'Dutch', bn: 'ডাচ' },
  { code: 'nn', native: 'Nynorsk', en: 'Nynorsk', bn: 'নিনরস্ক' },
  { code: 'no', native: 'Norsk', en: 'Norwegian', bn: 'নরওয়েজীয়' },
  { code: 'oc', native: 'Occitan', en: 'Occitan', bn: 'অক্সিটান' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ', en: 'Punjabi', bn: 'পাঞ্জাবি' },
  { code: 'pl', native: 'Polski', en: 'Polish', bn: 'পোলিশ' },
  { code: 'ps', native: 'پښتو', en: 'Pashto', bn: 'পশতু' },
  { code: 'pt', native: 'Português', en: 'Portuguese', bn: 'পর্তুগিজ' },
  { code: 'ro', native: 'Română', en: 'Romanian', bn: 'রোমানীয়' },
  { code: 'ru', native: 'Русский', en: 'Russian', bn: 'রুশ' },
  { code: 'sa', native: 'संस्कृतम्', en: 'Sanskrit', bn: 'সংস্কৃত' },
  { code: 'sd', native: 'سنڌي', en: 'Sindhi', bn: 'সিন্ধি' },
  { code: 'si', native: 'සිංහල', en: 'Sinhala', bn: 'সিংহলি' },
  { code: 'sk', native: 'Slovenčina', en: 'Slovak', bn: 'স্লোভাক' },
  { code: 'sl', native: 'Slovenščina', en: 'Slovenian', bn: 'স্লোভেনীয়' },
  { code: 'sn', native: 'ChiShona', en: 'Shona', bn: 'শোনা' },
  { code: 'so', native: 'Soomaali', en: 'Somali', bn: 'সোমালি' },
  { code: 'sq', native: 'Shqip', en: 'Albanian', bn: 'আলবেনীয়' },
  { code: 'sr', native: 'Српски', en: 'Serbian', bn: 'সার্বীয়' },
  { code: 'su', native: 'Basa Sunda', en: 'Sundanese', bn: 'সুন্দানিজ' },
  { code: 'sv', native: 'Svenska', en: 'Swedish', bn: 'সুইডিশ' },
  { code: 'sw', native: 'Kiswahili', en: 'Swahili', bn: 'সোয়াহিলি' },
  { code: 'ta', native: 'தமிழ்', en: 'Tamil', bn: 'তামিল' },
  { code: 'te', native: 'తెలుగు', en: 'Telugu', bn: 'তেলুগু' },
  { code: 'tg', native: 'Тоҷикӣ', en: 'Tajik', bn: 'তাজিক' },
  { code: 'th', native: 'ไทย', en: 'Thai', bn: 'থাই' },
  { code: 'tk', native: 'Türkmen', en: 'Turkmen', bn: 'তুর্কমেন' },
  { code: 'tl', native: 'Tagalog', en: 'Tagalog', bn: 'তাগালগ' },
  { code: 'tr', native: 'Türkçe', en: 'Turkish', bn: 'তুর্কি' },
  { code: 'tt', native: 'Татарча', en: 'Tatar', bn: 'তাতার' },
  { code: 'uk', native: 'Українська', en: 'Ukrainian', bn: 'ইউক্রেনীয়' },
  { code: 'uz', native: 'Oʻzbek', en: 'Uzbek', bn: 'উজবেক' },
  { code: 'vi', native: 'Tiếng Việt', en: 'Vietnamese', bn: 'ভিয়েতনামি' },
  { code: 'yi', native: 'ייִדיש', en: 'Yiddish', bn: 'ইদ্দিশ' },
  { code: 'yo', native: 'Yorùbá', en: 'Yoruba', bn: 'ইওরুবা' },
  { code: 'yue', native: '粵語', en: 'Cantonese', bn: 'ক্যান্টনিজ' },
  { code: 'zh', native: '中文', en: 'Chinese', bn: 'চীনা' },
];

export const POPULAR_LANGUAGES = SPOKEN_LANGUAGES.filter((l) => l.popular);

/** Total spoken languages the model accepts. */
export const LANGUAGE_COUNT = SPOKEN_LANGUAGES.length;

/** Alphabetical by English name, for the full dropdown. */
export const SORTED_LANGUAGES = [...SPOKEN_LANGUAGES].sort((a, b) => a.en.localeCompare(b.en));

export function findLanguage(code: string): SpokenLanguage | undefined {
  return SPOKEN_LANGUAGES.find((l) => l.code === code);
}

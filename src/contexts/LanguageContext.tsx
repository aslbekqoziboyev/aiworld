import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'uz' | 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  uz: {
    // Sidebar
    'sidebar.title': 'AI Image Connect',
    'sidebar.gallery': 'Rasmlarni kuzatish',
    'sidebar.upload': 'Rasm joylash',
    'sidebar.aiGenerate': 'AI\'dan foydalanish',
    'sidebar.chats': 'Chatlar',
    'sidebar.login': 'Kirish',
    'sidebar.profile': 'Profil',
    'sidebar.logout': 'Chiqish',
    'sidebar.user': 'Foydalanuvchi',
    'sidebar.main': 'Asosiy',
    
    // Gallery
    'gallery.title': 'Rasmlar galereyasi',
    'gallery.subtitle': 'AI va ijod - San\'at va texnologiya uyg\'unligi',
    'gallery.search': 'Teglar bo\'yicha qidirish... (#nature, #AI, #art)',
    'gallery.notFound': 'Hech narsa topilmadi',
    'gallery.tryOther': 'Boshqa teglar bilan qidiring',
    
    // AI Generate
    'ai.intro.title': 'Sun\'iy Intellekt bilan Rasm Yaratish',
    'ai.intro.subtitle': 'Tasavvuringizni haqiqatga aylantiring',
    'ai.intro.start': 'Boshlash',
    'ai.intro.feature1': 'Yuqori Sifatli Rasmlar',
    'ai.intro.feature1desc': 'Professional darajadagi rasmlarni bir necha soniyada yarating',
    'ai.intro.feature2': 'Keng Imkoniyatlar',
    'ai.intro.feature2desc': 'San\'at, dizayn, fotorealizm - xohlaganingizni yarating',
    'ai.intro.feature3': 'Oson Foydalanish',
    'ai.intro.feature3desc': 'Faqat tasvirlab bering, qolganini AI bajaradi',
    'ai.intro.howWorks': 'Qanday Ishlaydi?',
    'ai.intro.step1': 'Tasvirlang',
    'ai.intro.step1desc': 'Yaratmoqchi bo\'lgan rasimingizni so\'zlar bilan tasvirlab bering',
    'ai.intro.step2': 'AI Yaratadi',
    'ai.intro.step2desc': 'Sun\'iy intellekt sizning tasviringiz asosida rasm yaratadi',
    'ai.intro.step3': 'Yuklab Oling',
    'ai.intro.step3desc': 'Tayyor rasmni yuklab oling va ulashing',
    'ai.intro.examples': 'Misol Promptlar',
    'ai.intro.example1': 'Yulduzli osmonda uchayotgan fantastik shahar',
    'ai.intro.example2': 'Neon yorug\'likdagi futuristik avtomobil',
    'ai.intro.example3': 'Tog\'lar orasidagi go\'zal qishloq',
    'ai.intro.loginRequired': 'AI yaratish uchun tizimga kiring',
    
    // Auth
    'auth.login': 'Kirish',
    'auth.signup': 'Ro\'yxatdan o\'tish',
    'auth.email': 'Email',
    'auth.password': 'Parol',
    'auth.fullName': 'To\'liq ism',
    'auth.username': 'Foydalanuvchi nomi',
  },
  ru: {
    // Sidebar
    'sidebar.title': 'AI Image Connect',
    'sidebar.gallery': 'Просмотр изображений',
    'sidebar.upload': 'Загрузить изображение',
    'sidebar.aiGenerate': 'Использовать AI',
    'sidebar.chats': 'Чаты',
    'sidebar.login': 'Войти',
    'sidebar.profile': 'Профиль',
    'sidebar.logout': 'Выйти',
    'sidebar.user': 'Пользователь',
    'sidebar.main': 'Основное',
    
    // Gallery
    'gallery.title': 'Галерея изображений',
    'gallery.subtitle': 'AI и творчество - Гармония искусства и технологии',
    'gallery.search': 'Поиск по тегам... (#природа, #AI, #искусство)',
    'gallery.notFound': 'Ничего не найдено',
    'gallery.tryOther': 'Попробуйте другие теги',
    
    // AI Generate
    'ai.intro.title': 'Создание Изображений с Искусственным Интеллектом',
    'ai.intro.subtitle': 'Превратите ваше воображение в реальность',
    'ai.intro.start': 'Начать',
    'ai.intro.feature1': 'Высококачественные Изображения',
    'ai.intro.feature1desc': 'Создавайте изображения профессионального уровня за считанные секунды',
    'ai.intro.feature2': 'Широкие Возможности',
    'ai.intro.feature2desc': 'Искусство, дизайн, фотореализм - создавайте что угодно',
    'ai.intro.feature3': 'Простота Использования',
    'ai.intro.feature3desc': 'Просто опишите, остальное сделает AI',
    'ai.intro.howWorks': 'Как Это Работает?',
    'ai.intro.step1': 'Опишите',
    'ai.intro.step1desc': 'Опишите словами изображение, которое хотите создать',
    'ai.intro.step2': 'AI Создает',
    'ai.intro.step2desc': 'Искусственный интеллект создает изображение на основе вашего описания',
    'ai.intro.step3': 'Скачайте',
    'ai.intro.step3desc': 'Скачайте готовое изображение и поделитесь им',
    'ai.intro.examples': 'Примеры Промптов',
    'ai.intro.example1': 'Фантастический город, летающий в звездном небе',
    'ai.intro.example2': 'Футуристический автомобиль в неоновом свете',
    'ai.intro.example3': 'Красивая деревня среди гор',
    'ai.intro.loginRequired': 'Войдите в систему для использования AI',
    
    // Auth
    'auth.login': 'Войти',
    'auth.signup': 'Регистрация',
    'auth.email': 'Email',
    'auth.password': 'Пароль',
    'auth.fullName': 'Полное имя',
    'auth.username': 'Имя пользователя',
  },
  en: {
    // Sidebar
    'sidebar.title': 'AI Image Connect',
    'sidebar.gallery': 'View Images',
    'sidebar.upload': 'Upload Image',
    'sidebar.aiGenerate': 'Use AI',
    'sidebar.chats': 'Chats',
    'sidebar.login': 'Login',
    'sidebar.profile': 'Profile',
    'sidebar.logout': 'Logout',
    'sidebar.user': 'User',
    'sidebar.main': 'Main',
    
    // Gallery
    'gallery.title': 'Image Gallery',
    'gallery.subtitle': 'AI and creativity - Harmony of art and technology',
    'gallery.search': 'Search by tags... (#nature, #AI, #art)',
    'gallery.notFound': 'Nothing found',
    'gallery.tryOther': 'Try other tags',
    
    // AI Generate
    'ai.intro.title': 'AI Image Generation',
    'ai.intro.subtitle': 'Turn your imagination into reality',
    'ai.intro.start': 'Get Started',
    'ai.intro.feature1': 'High-Quality Images',
    'ai.intro.feature1desc': 'Create professional-level images in seconds',
    'ai.intro.feature2': 'Wide Possibilities',
    'ai.intro.feature2desc': 'Art, design, photorealism - create anything',
    'ai.intro.feature3': 'Easy to Use',
    'ai.intro.feature3desc': 'Just describe it, AI does the rest',
    'ai.intro.howWorks': 'How It Works?',
    'ai.intro.step1': 'Describe',
    'ai.intro.step1desc': 'Describe in words the image you want to create',
    'ai.intro.step2': 'AI Creates',
    'ai.intro.step2desc': 'Artificial intelligence creates an image based on your description',
    'ai.intro.step3': 'Download',
    'ai.intro.step3desc': 'Download the finished image and share it',
    'ai.intro.examples': 'Example Prompts',
    'ai.intro.example1': 'Fantasy city flying in a starry sky',
    'ai.intro.example2': 'Futuristic car in neon lights',
    'ai.intro.example3': 'Beautiful village among mountains',
    'ai.intro.loginRequired': 'Login to use AI generation',
    
    // Auth
    'auth.login': 'Login',
    'auth.signup': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.fullName': 'Full Name',
    'auth.username': 'Username',
  },
};

// Country to language mapping
const countryLanguageMap: Record<string, Language> = {
  'UZ': 'uz',
  'RU': 'ru',
  'KZ': 'ru',
  'BY': 'ru',
  'TJ': 'ru',
  'KG': 'ru',
  'default': 'en',
};

const detectLanguageFromLocation = async (): Promise<Language> => {
  try {
    // Try to get country from IP
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const countryCode = data.country_code;
    
    return countryLanguageMap[countryCode] || countryLanguageMap.default;
  } catch (error) {
    console.error('Error detecting location:', error);
    // Fallback to browser language
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'uz' || browserLang === 'ru') return browserLang as Language;
    return 'en';
  }
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('uz');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initLanguage = async () => {
      // Check localStorage first
      const savedLang = localStorage.getItem('language') as Language;
      
      if (savedLang && ['uz', 'ru', 'en'].includes(savedLang)) {
        setLanguageState(savedLang);
      } else {
        // Detect from geolocation
        const detectedLang = await detectLanguageFromLocation();
        setLanguageState(detectedLang);
        localStorage.setItem('language', detectedLang);
      }
      
      setIsInitialized(true);
    };

    initLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['uz']] || key;
  };

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}

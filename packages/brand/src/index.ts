export interface LocalizedString {
  hi: string;
  en: string;
}

export interface BrandConfig {
  productName: LocalizedString;
  tagline: LocalizedString;
  features: {
    quizzes: LocalizedString;
    rewardsWallet: LocalizedString;
    offlineLibrary: LocalizedString;
    weeklyReport: LocalizedString;
    pointsCurrency: LocalizedString;
  };
}

export const brandConfig: BrandConfig = {
  productName: {
    hi: 'चौक',
    en: 'Chalk',
  },
  tagline: {
    hi: 'ऑफ़लाइन-प्रथम शिक्षण और पुरस्कार',
    en: 'Offline-first learning and rewards',
  },
  features: {
    quizzes: {
      hi: 'चतुर',
      en: 'Chatur',
    },
    rewardsWallet: {
      hi: 'गुल्लक',
      en: 'Gullak',
    },
    offlineLibrary: {
      hi: 'बस्ता',
      en: 'Basta',
    },
    weeklyReport: {
      hi: 'प्रगति पत्र',
      en: 'Pragati Patra',
    },
    pointsCurrency: {
      hi: 'विद्या पॉइंट्स',
      en: 'Vidya Points',
    },
  },
};

export function getFeatureName(
  feature: keyof BrandConfig['features'],
  lang: 'hi' | 'en',
): string {
  return brandConfig.features[feature][lang];
}

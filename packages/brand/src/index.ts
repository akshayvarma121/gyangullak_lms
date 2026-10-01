export interface LocalizedString {
  hi: string;
  en: string;
}

export interface BrandConfig {
  productName: LocalizedString;
  tagline: LocalizedString;
  features: {
    quizzes: LocalizedString;
    gullak: {
      name: LocalizedString;
      points: LocalizedString;
    };
    offlineLibrary: LocalizedString;
    weeklyReport: LocalizedString;
  };
}

export const brandConfig: BrandConfig = {
  productName: {
    hi: 'ज्ञान गुल्लक', // needs_human_review
    en: 'Gyan Gullak',
  },
  tagline: {
    hi: 'ऑफ़लाइन-प्रथम शिक्षण और पुरस्कार', // needs_human_review
    en: 'Offline-first learning and rewards',
  },
  features: {
    quizzes: {
      hi: 'चतुर', // needs_human_review
      en: 'Daily Bounties',
    },
    gullak: {
      name: {
        hi: 'गुल्लक', // needs_human_review
        en: 'Loot Bazaar',
      },
      points: {
        hi: 'गुल्लक पॉइंट', // needs_human_review
        en: 'Coins',
      },
    },
    offlineLibrary: {
      hi: 'बस्ता', // needs_human_review
      en: 'Godaam',
    },
    weeklyReport: {
      hi: 'प्रगति पत्र', // needs_human_review
      en: 'e-Report',
    },
  },
};


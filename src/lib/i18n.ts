import type { IssueCategory, ReportStatus, SupportedLanguage } from '../types/civic';

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'हिन्दी',
  kn: 'ಕನ್ನಡ',
};

type TranslationDict = {
  nav: {
    home: string;
    explore: string;
    liveMap: string;
    analytics: string;
    projects: string;
    howItWorks: string;
    aboutUs: string;
    dashboard: string;
    login: string;
    reportIssue: string;
    overview: string;
    myReports: string;
    community: string;
    notifications: string;
    profile: string;
    officerPortal: string;
    adminPortal: string;
    signOut: string;
  };
  hero: {
    tagline: string;
    heading: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
    openMap: string;
  };
  landing: {
    totalReports: string;
    pendingReview: string;
    inProgress: string;
    resolvedVerified: string;
    howItWorksTitle: string;
    howItWorksSub: string;
    categoriesTitle: string;
    categoriesSub: string;
    browseAll: string;
    latestTitle: string;
    liveMapPreviewTitle: string;
    liveMapPreviewSub: string;
    civicChampionsTitle: string;
    civicChampionsSub: string;
  };
  report: {
    pageTitle: string;
    pageSubtitle: string;
    offlineNotice: string;
    onlineReady: string;
    draftRecovered: string;
    discardDraft: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    step6: string;
    nextStep: string;
    prevStep: string;
    submitReport: string;
    retrySubmit: string;
    voiceGuide: string;
    stopVoice: string;
    assistButton: string;
    applySuggestion: string;
    dismissSuggestion: string;
    removePhoto: string;
    successTitle: string;
    trackingId: string;
  };
  map: {
    mapView: string;
    listView: string;
    clearFilters: string;
    nearbyTitle: string;
    nearbyPrompt: string;
    enableNearby: string;
    disableNearby: string;
  };
  profile: {
    languageLabel: string;
    textSizeLabel: string;
    normal: string;
    large: string;
    extraLarge: string;
    notificationsTitle: string;
    deleteAccount: string;
  };
  categories: Record<IssueCategory, string>;
  statuses: Record<ReportStatus, string>;
};

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDict> = {
  en: {
    nav: {
      home: 'Home',
      explore: 'Explore Issues',
      liveMap: 'Live Map',
      analytics: 'Analytics',
      projects: 'Projects',
      howItWorks: 'How It Works',
      aboutUs: 'About Us',
      dashboard: 'Dashboard',
      login: 'Login',
      reportIssue: 'Report an Issue',
      overview: 'Overview',
      myReports: 'My Reports',
      community: 'Community & Points',
      notifications: 'Notifications',
      profile: 'Profile & Settings',
      officerPortal: 'Officer Workbench',
      adminPortal: 'Admin Console',
      signOut: 'Sign Out',
    },
    hero: {
      tagline: 'Your Voice. Your City. Your Change.',
      heading: "Your City Deserves Better. Let's Make It Happen.",
      subtitle:
        'Report civic problems, track real progress and work together to build cleaner, safer and smarter communities.',
      primaryCta: 'Report an Issue',
      secondaryCta: 'Explore Live Map',
      openMap: 'Open Full Map',
    },
    landing: {
      totalReports: 'Total Civic Reports',
      pendingReview: 'Pending Review',
      inProgress: 'Active In Progress',
      resolvedVerified: 'Resolved & Verified',
      howItWorksTitle: 'How Janta Check Works',
      howItWorksSub:
        'A transparent six-step guided workflow from neighborhood photograph to community-verified resolution.',
      categoriesTitle: 'Civic Issue Categories',
      categoriesSub: 'Report infrastructure defects across six core urban maintenance tracks.',
      browseAll: 'Browse all issues',
      latestTitle: 'Latest Reported Issues',
      liveMapPreviewTitle: 'Live City Infrastructure Map',
      liveMapPreviewSub:
        'Inspect active neighborhood complaints and resolution status directly on OpenStreetMap.',
      civicChampionsTitle: 'Civic Champion Spotlight',
      civicChampionsSub:
        'Top community contributors earning transparent Civic Points by reporting and verifying local repairs.',
    },
    report: {
      pageTitle: 'Guided Civic Issue Reporting',
      pageSubtitle:
        'Upload or click a photograph, let AI detect the issue, confirm map coordinates, and verify duplicates in 6 guided steps',
      offlineNotice: 'Your report is saved as a draft. Connect to the internet to submit it.',
      onlineReady: 'Online · Draft auto-saved locally in IndexedDB',
      draftRecovered: 'Recovered your unsent offline report draft from local storage.',
      discardDraft: 'Discard Draft',
      step1: 'Photo',
      step2: 'AI Analysis',
      step3: 'Location',
      step4: 'Details',
      step5: 'Duplicates',
      step6: 'Confirm',
      nextStep: 'Continue',
      prevStep: 'Back',
      submitReport: 'Submit Civic Report',
      retrySubmit: 'Retry Submission',
      voiceGuide: 'Voice Guide',
      stopVoice: 'Stop Voice',
      assistButton: 'Improve with Smart Complaint Assistant',
      applySuggestion: 'Approve & Apply Suggestion',
      dismissSuggestion: 'Keep My Draft',
      removePhoto: 'Remove / Replace Photo',
      successTitle: 'Civic Report Submitted Successfully',
      trackingId: 'Tracking ID',
    },
    map: {
      mapView: 'Map View',
      listView: 'List View',
      clearFilters: 'Clear Filters',
      nearbyTitle: 'Nearby Unresolved Issues',
      nearbyPrompt: 'Share approximate device location once to surface unresolved issues around you.',
      enableNearby: 'Show Nearby Issues',
      disableNearby: 'Hide Nearby / Clear Location',
    },
    profile: {
      languageLabel: 'Preferred Language',
      textSizeLabel: 'Accessibility Text Size',
      normal: 'Normal',
      large: 'Large',
      extraLarge: 'Extra Large',
      notificationsTitle: 'Notification Preferences',
      deleteAccount: 'Delete Account & Personal Data',
    },
    categories: {
      pothole: 'Potholes & Damaged Roads',
      garbage: 'Garbage Accumulation',
      streetlight: 'Damaged Streetlights',
      water_leakage: 'Water Leakage',
      drainage: 'Drainage & Sanitation',
      other: 'Other Infrastructure',
    },
    statuses: {
      Submitted: 'Submitted',
      'Under Review': 'Under Review',
      Acknowledged: 'Acknowledged',
      'In Progress': 'In Progress',
      'Resolved - Awaiting Verification': 'Resolved - Awaiting Verification',
      Reopened: 'Reopened',
      Closed: 'Closed',
    },
  },
  hi: {
    nav: {
      home: 'होम',
      explore: 'शिकायतें देखें',
      liveMap: 'लाइव मैप',
      analytics: 'विश्लेषण',
      projects: 'विकास कार्य',
      howItWorks: 'यह कैसे काम करता है',
      aboutUs: 'हमारे बारे में',
      dashboard: 'डैशबोर्ड',
      login: 'लॉगिन',
      reportIssue: 'समस्या दर्ज करें',
      overview: 'सारांश',
      myReports: 'मेरी रिपोर्ट्स',
      community: 'समुदाय और अंक',
      notifications: 'सूचनाएं',
      profile: 'प्रोफ़ाइल और सेटिंग्स',
      officerPortal: 'अधिकारी कार्यक्षेत्र',
      adminPortal: 'एडमिन कंसोल',
      signOut: 'लॉग आउट',
    },
    hero: {
      tagline: 'आपकी आवाज़। आपका शहर। आपका बदलाव।',
      heading: 'आपका शहर बेहतर का हकदार है। आइए इसे साकार करें।',
      subtitle:
        'नागरिक समस्याओं की रिपोर्ट करें, वास्तविक प्रगति ट्रैक करें और स्वच्छ, सुरक्षित तथा स्मार्ट समुदाय बनाने में सहयोग करें।',
      primaryCta: 'समस्या दर्ज करें',
      secondaryCta: 'लाइव मैप देखें',
      openMap: 'पूरा मैप खोलें',
    },
    landing: {
      totalReports: 'कुल नागरिक रिपोर्ट',
      pendingReview: 'समीक्षा हेतु लंबित',
      inProgress: 'प्रगति पर कार्य',
      resolvedVerified: 'समाधान और सत्यापित',
      howItWorksTitle: 'जनता चेक कैसे काम करता है',
      howItWorksSub: 'फोटो से लेकर सामुदायिक सत्यापन तक छह चरणों की पारदर्शी प्रक्रिया।',
      categoriesTitle: 'नागरिक समस्या श्रेणियां',
      categoriesSub: 'छह प्रमुख शहरी बुनियादी ढांचा श्रेणियों में समस्याएं दर्ज करें।',
      browseAll: 'सभी समस्याएं देखें',
      latestTitle: 'नवीनतम दर्ज समस्याएं',
      liveMapPreviewTitle: 'लाइव शहर बुनियादी ढांचा मानचित्र',
      liveMapPreviewSub: 'ओपनस्ट्रीटमैप पर सक्रिय शिकायतें और समाधान स्थिति देखें।',
      civicChampionsTitle: 'नागरिक चैंपियन सम्मान',
      civicChampionsSub: 'स्थानीय सुधारों की रिपोर्ट और सत्यापन करने वाले शीर्ष नागरिक।',
    },
    report: {
      pageTitle: 'निर्देशित नागरिक समस्या रिपोर्टिंग',
      pageSubtitle:
        'फोटो अपलोड करें या खींचें, AI से समस्या पहचानें, स्थान चुनें और 6 चरणों में डुप्लिकेट जांचें',
      offlineNotice: 'आपकी रिपोर्ट ड्राफ्ट के रूप में सहेजी गई है। इसे सबमिट करने के लिए इंटरनेट से जुड़ें।',
      onlineReady: 'ऑनलाइन · ड्राफ्ट स्थानीय रूप से सुरक्षित है',
      draftRecovered: 'आपका अधूरा ऑफ़लाइन रिपोर्ट ड्राफ्ट पुनर्प्राप्त कर लिया गया है।',
      discardDraft: 'ड्राफ्ट हटाएं',
      step1: 'फोटो',
      step2: 'AI विश्लेषण',
      step3: 'स्थान',
      step4: 'विवरण',
      step5: 'डुप्लिकेट जांच',
      step6: 'पुष्टि करें',
      nextStep: 'आगे बढ़ें',
      prevStep: 'पीछे',
      submitReport: 'रिपोर्ट सबमिट करें',
      retrySubmit: 'पुनः प्रयास करें',
      voiceGuide: 'आवाज़ मार्गदर्शन',
      stopVoice: 'आवाज़ रोकें',
      assistButton: 'स्मार्ट शिकायत सहायक से सुधारें',
      applySuggestion: 'सुझाव स्वीकार करें और लागू करें',
      dismissSuggestion: 'मेरा ड्राफ्ट रखें',
      removePhoto: 'फोटो बदलें / हटाएं',
      successTitle: 'नागरिक रिपोर्ट सफलतापूर्वक दर्ज हुई',
      trackingId: 'ट्रैकिंग आईडी',
    },
    map: {
      mapView: 'मैप दृश्य',
      listView: 'सूची दृश्य',
      clearFilters: 'फ़िल्टर साफ़ करें',
      nearbyTitle: 'आस-पास की अनसुलझी समस्याएं',
      nearbyPrompt: 'अपने आस-पास की सक्रिय समस्याएं देखने के लिए अनुमानित स्थान साझा करें।',
      enableNearby: 'आस-पास की समस्याएं दिखाएं',
      disableNearby: 'स्थान साफ़ करें',
    },
    profile: {
      languageLabel: 'पसंदीदा भाषा',
      textSizeLabel: 'फ़ॉन्ट आकार (सुगम्यता)',
      normal: 'सामान्य',
      large: 'बड़ा',
      extraLarge: 'अतिरिक्त बड़ा',
      notificationsTitle: 'सूचना प्राथमिकताएं',
      deleteAccount: 'खाता और व्यक्तिगत डेटा हटाएं',
    },
    categories: {
      pothole: 'गड्ढे और क्षतिग्रस्त सड़कें',
      garbage: 'कचरा जमाव',
      streetlight: 'खराब स्ट्रीटलाइट',
      water_leakage: 'पानी का रिसाव',
      drainage: 'जल निकासी और स्वच्छता',
      other: 'अन्य बुनियादी ढांचा समस्या',
    },
    statuses: {
      Submitted: 'दर्ज किया गया',
      'Under Review': 'समीक्षाधीन',
      Acknowledged: 'स्वीकृत',
      'In Progress': 'प्रगति पर',
      'Resolved - Awaiting Verification': 'सुलझाया गया - सत्यापन शेष',
      Reopened: 'पुनः खोला गया',
      Closed: 'बंद',
    },
  },
  kn: {
    nav: {
      home: 'ಮುಖಪುಟ',
      explore: 'ದೂರುಗಳನ್ನು ನೋಡಿ',
      liveMap: 'ಲೈವ್ ನಕ್ಷೆ',
      analytics: 'ವಿಶ್ಲೇಷಣೆ',
      projects: 'ಅಭಿವೃದ್ಧಿ ಯೋಜನೆಗಳು',
      howItWorks: 'ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
      aboutUs: 'ನಮ್ಮ ಬಗ್ಗೆ',
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      login: 'ಲಾಗಿನ್',
      reportIssue: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
      overview: 'ಅವಲೋಕನ',
      myReports: 'ನನ್ನ ವರದಿಗಳು',
      community: 'ಸಮುದಾಯ ಮತ್ತು ಅಂಕಗಳು',
      notifications: 'ಸೂಚನೆಗಳು',
      profile: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
      officerPortal: 'ಅಧಿಕಾರಿ ಕಾರ್ಯಕ್ಷೇತ್ರ',
      adminPortal: 'ನಿರ್ವಾಹಕ ಕನ್ಸೋಲ್',
      signOut: 'ಲಾಗ್ ಔಟ್',
    },
    hero: {
      tagline: 'ನಿಮ್ಮ ಧ್ವನಿ. ನಿಮ್ಮ ನಗರ. ನಿಮ್ಮ ಬದಲಾವಣೆ.',
      heading: 'ನಿಮ್ಮ ನಗರವು ಉತ್ತಮ ಸೌಲಭ್ಯಕ್ಕೆ ಅರ್ಹವಾಗಿದೆ. ಬನ್ನಿ ಬದಲಾವಣೆ ತರೋಣ.',
      subtitle:
        'ನಾಗರಿಕ ಮೂಲಸೌಕರ್ಯ ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಿ, ನೈಜ ಪ್ರಗತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ ಮತ್ತು ಸ್ವಚ್ಛ ಹಾಗೂ ಸುರಕ್ಷಿತ ಸಮುದಾಯಗಳನ್ನು ನಿರ್ಮಿಸಿ.',
      primaryCta: 'ಸಮಸ್ಯೆ ವರದಿ ಮಾಡಿ',
      secondaryCta: 'ಲೈವ್ ನಕ್ಷೆ ನೋಡಿ',
      openMap: 'ಪೂರ್ಣ ನಕ್ಷೆ ತೆರೆಯಿರಿ',
    },
    landing: {
      totalReports: 'ಒಟ್ಟು ನಾಗರಿಕ ವರದಿಗಳು',
      pendingReview: 'ಪರಿಶೀಲನೆ ಬಾಕಿ',
      inProgress: 'ಪ್ರಗತಿಯಲ್ಲಿರುವ ಕೆಲಸಗಳು',
      resolvedVerified: 'ಪರಿಹರಿಸಿದ ಮತ್ತು ದೃಢೀಕರಿಸಿದ',
      howItWorksTitle: 'ಜನತಾ ಚೆಕ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ',
      howItWorksSub: 'ಫೋಟೋದಿಂದ ಸಮುದಾಯ ದೃಢೀಕರಣದವರೆಗೆ ಆರು ಹಂತಗಳ ಪಾರದರ್ಶಕ ಪ್ರಕ್ರಿಯೆ.',
      categoriesTitle: 'ಸಮಸ್ಯೆಯ ವರ್ಗಗಳು',
      categoriesSub: 'ಆರು ಪ್ರಮುಖ ನಗರ ಮೂಲಸೌಕರ್ಯ ವಿಭಾಗಗಳಲ್ಲಿ ದೂರುಗಳನ್ನು ಸಲ್ಲಿಸಿ.',
      browseAll: 'ಎಲ್ಲಾ ದೂರುಗಳನ್ನು ನೋಡಿ',
      latestTitle: 'ಇತ್ತೀಚಿನ ವರದಿಯಾದ ಸಮಸ್ಯೆಗಳು',
      liveMapPreviewTitle: 'ಲೈವ್ ನಗರ ಮೂಲಸೌಕರ್ಯ ನಕ್ಷೆ',
      liveMapPreviewSub: 'ಓಪನ್‌ಸ್ಟ್ರೀಟ್‌ಮ್ಯಾಪ್‌ನಲ್ಲಿ ಸಕ್ರಿಯ ದೂರುಗಳು ಮತ್ತು ಪರಿಹಾರ ಸ್ಥಿತಿಯನ್ನು ವೀಕ್ಷಿಸಿ.',
      civicChampionsTitle: 'ನಾಗರಿಕ ಚಾಂಪಿಯನ್‌ಗಳು',
      civicChampionsSub: 'ಸ್ಥಳೀಯ ಸಮಸ್ಯೆಗಳನ್ನು ವರದಿ ಮಾಡಿ ಪರಿಶೀಲಿಸುವ ಪ್ರಮುಖ ನಾಗರಿಕರು.',
    },
    report: {
      pageTitle: 'ಮಾರ್ಗದರ್ಶಿ ನಾಗರಿಕ ಸಮಸ್ಯೆ ವರದಿ',
      pageSubtitle:
        'ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ, AI ಮೂಲಕ ಸಮಸ್ಯೆ ಗುರುತಿಸಿ, ಸ್ಥಳವನ್ನು ದೃಢೀಕರಿಸಿ ಮತ್ತು 6 ಹಂತಗಳಲ್ಲಿ ಸಲ್ಲಿಸಿ',
      offlineNotice: 'ನಿಮ್ಮ ವರದಿಯನ್ನು ಡ್ರಾಫ್ಟ್ ಆಗಿ ಉಳಿಸಲಾಗಿದೆ. ಸಲ್ಲಿಸಲು ಇಂಟರ್ನೆಟ್‌ಗೆ ಸಂಪರ್ಕಿಸಿ.',
      onlineReady: 'ಆನ್‌ಲೈನ್ · ಡ್ರಾಫ್ಟ್ ಸ್ಥಳೀಯವಾಗಿ ಉಳಿಸಲಾಗಿದೆ',
      draftRecovered: 'ಸ್ಥಳೀಯ ಸಂಗ್ರಹಣೆಯಿಂದ ನಿಮ್ಮ ಉಳಿಸಿದ ಡ್ರಾಫ್ಟ್ ಅನ್ನು ಮರುಪಡೆಯಲಾಗಿದೆ.',
      discardDraft: 'ಡ್ರಾಫ್ಟ್ ಅಳಿಸಿ',
      step1: 'ಫೋಟೋ',
      step2: 'AI ವಿಶ್ಲೇಷಣೆ',
      step3: 'ಸ್ಥಳ',
      step4: 'ವಿವರಗಳು',
      step5: 'ನಕಲು ಪರಿಶೀಲನೆ',
      step6: 'ದೃಢೀಕರಿಸಿ',
      nextStep: 'ಮುಂದುವರಿಸಿ',
      prevStep: 'ಹಿಂದೆ',
      submitReport: 'ವರದಿ ಸಲ್ಲಿಸಿ',
      retrySubmit: 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ',
      voiceGuide: 'ಧ್ವನಿ ಮಾರ್ಗದರ್ಶಿ',
      stopVoice: 'ಧ್ವನಿ ನಿಲ್ಲಿಸಿ',
      assistButton: 'ಸ್ಮಾರ್ಟ್ ದೂರು ಸಹಾಯಕದಿಂದ ಸುಧಾರಿಸಿ',
      applySuggestion: 'ಸಲಹೆಯನ್ನು ಅನ್ವಯಿಸಿ',
      dismissSuggestion: 'ನನ್ನ ಡ್ರಾಫ್ಟ್ ಉಳಿಸಿ',
      removePhoto: 'ಫೋಟೋ ಬದಲಾಯಿಸಿ',
      successTitle: 'ನಾಗರಿಕ ವರದಿಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಸಲ್ಲಿಸಲಾಗಿದೆ',
      trackingId: 'ಟ್ರ್ಯಾಕಿಂಗ್ ಐಡಿ',
    },
    map: {
      mapView: 'ನಕ್ಷೆ ನೋಟ',
      listView: 'ಪಟ್ಟಿ ನೋಟ',
      clearFilters: 'ಫಿಲ್ಟರ್ ತೆರವುಗೊಳಿಸಿ',
      nearbyTitle: 'ಹತ್ತಿರದ ಬಗೆಹರಿಯದ ಸಮಸ್ಯೆಗಳು',
      nearbyPrompt: 'ನಿಮ್ಮ ಸುತ್ತಮುತ್ತಲಿನ ದೂರುಗಳನ್ನು ನೋಡಲು ಸ್ಥಳ ಅನುಮತಿ ನೀಡಿ.',
      enableNearby: 'ಹತ್ತಿರದ ಸಮಸ್ಯೆಗಳನ್ನು ತೋರಿಸಿ',
      disableNearby: 'ಸ್ಥಳ ತೆರವುಗೊಳಿಸಿ',
    },
    profile: {
      languageLabel: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
      textSizeLabel: 'ಪಠ್ಯ ಗಾತ್ರ (ಪ್ರವೇಶಸಾಧ್ಯತೆ)',
      normal: 'ಸಾಮಾನ್ಯ',
      large: 'ದೊಡ್ಡದು',
      extraLarge: 'ಅತಿ ದೊಡ್ಡದು',
      notificationsTitle: 'ಸೂಚನೆ ಆದ್ಯತೆಗಳು',
      deleteAccount: 'ಖಾತೆ ಮತ್ತು ವೈಯಕ್ತಿಕ ಡೇಟಾ ಅಳಿಸಿ',
    },
    categories: {
      pothole: 'ಗುಂಡಿಗಳು ಮತ್ತು ಹಾಳಾದ ರಸ್ತೆಗಳು',
      garbage: 'ಕಸ ಸಂಗ್ರಹಣೆ',
      streetlight: 'ಹಾಳಾದ ಬೀದಿದೀಪಗಳು',
      water_leakage: 'ನೀರಿನ ಸೋರಿಕೆ',
      drainage: 'ಒಳಚರಂಡಿ ಮತ್ತು ನೈರ್ಮಲ್ಯ',
      other: 'ಇತರೆ ಮೂಲಸೌಕರ್ಯ ಸಮಸ್ಯೆಗಳು',
    },
    statuses: {
      Submitted: 'ಸಲ್ಲಿಸಲಾಗಿದೆ',
      'Under Review': 'ಪರಿಶೀಲನೆಯಲ್ಲಿದೆ',
      Acknowledged: 'ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
      'In Progress': 'ಪ್ರಗತಿಯಲ್ಲಿದೆ',
      'Resolved - Awaiting Verification': 'ಪರಿಹರಿಸಲಾಗಿದೆ - ಪರಿಶೀಲನೆ ಬಾಕಿ',
      Reopened: 'ಮರುತೆರೆಯಲಾಗಿದೆ',
      Closed: 'ಮುಚ್ಚಲಾಗಿದೆ',
    },
  },
};

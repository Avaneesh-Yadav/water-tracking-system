import React, { createContext, useContext, useMemo, useState } from "react";

const STRINGS = {
  en: {
    dashboard: "Dashboard",
    consumers: "Consumers",
    employees: "Employee(s)",
    reports: "Reports",
    bulk: "Bulk ops",
    consumption: "Consumption",
    payments: "Payments",
    help: "Help",
    billing: "Billing",
    field: "Field / meters",
    service: "Service desk",
    inbox: "Inbox",
    map: "Map",
    apply: "New connection",
  },
  hi: {
    dashboard: "डैशबोर्ड",
    consumers: "उपभोक्ता",
    employees: "कर्मचारी",
    reports: "रिपोर्ट",
    bulk: "बल्क कार्य",
    consumption: "उपयोग",
    payments: "भुगतान",
    help: "सहायता",
    billing: "बिलिंग",
    field: "मीटर / फील्ड",
    service: "सेवा डेस्क",
    inbox: "इनबॉक्स",
    map: "मानचित्र",
    apply: "नया कनेक्शन",
  },
} as const;

type Lang = "en" | "hi";
type Key = keyof typeof STRINGS.en;

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => STRINGS.en[k],
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("aquaflow_lang") === "hi" ? "hi" : "en"));
  const setLang = (l: Lang) => {
    localStorage.setItem("aquaflow_lang", l);
    setLangState(l);
    document.documentElement.lang = l === "hi" ? "hi" : "en";
  };
  const value = useMemo(
    () => ({ lang, setLang, t: (k: Key) => STRINGS[lang][k] || STRINGS.en[k] }),
    [lang]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

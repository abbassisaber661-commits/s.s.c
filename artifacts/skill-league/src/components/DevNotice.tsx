import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { Language } from "@/lib/i18n";

const SEEN_KEY = "sl_dev_notice_seen_v1";

interface DevNoticeText {
  title: string;
  body: string;
  continueLabel: string;
}

const DEV_NOTICE_TEXT: Record<"en" | "ar" | "fr", DevNoticeText> = {
  en: {
    title: "Welcome to S.S.C ❤️",
    body:
      "The application is still under development and improvement.\nYou may encounter some errors or incomplete features at this stage.\nWe are continuously working to improve your experience and add new features.\n\nThank you for your support and trust.",
    continueLabel: "Continue",
  },
  ar: {
    title: "مرحباً بك في S.S.C ❤️",
    body:
      "التطبيق مازال في مرحلة التطوير والتحسين.\nقد تواجه بعض الأخطاء أو بعض الميزات غير المكتملة حالياً.\nنعمل باستمرار على تحسين التجربة وإضافة ميزات جديدة.\n\nشكراً لدعمك وثقتك.",
    continueLabel: "متابعة",
  },
  fr: {
    title: "Bienvenue sur S.S.C ❤️",
    body:
      "L'application est encore en cours de développement et d'amélioration.\nVous pouvez rencontrer certaines erreurs ou des fonctionnalités incomplètes à ce stade.\nNous travaillons continuellement à améliorer votre expérience et à ajouter de nouvelles fonctionnalités.\n\nMerci pour votre soutien et votre confiance.",
    continueLabel: "Continuer",
  },
};

function resolveNoticeLanguage(lang: Language): "en" | "ar" | "fr" {
  if (lang === "ar") return "ar";
  if (lang === "fr") return "fr";
  return "en";
}

/**
 * Friendly one-time-per-session development notice shown after a
 * successful login. Purely presentational — does not touch auth,
 * payments, subscription, or DB logic in any way.
 */
export default function DevNotice() {
  const { currentLanguage } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SEEN_KEY);
      if (!seen) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
  };

  const noticeLang = resolveNoticeLanguage(currentLanguage);
  const tx = DEV_NOTICE_TEXT[noticeLang];
  const rtl = noticeLang === "ar";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="dev-notice-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10500] flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(5,3,15,0.55)", backdropFilter: "blur(3px)" }}
          onClick={dismiss}
        >
          <motion.div
            key="dev-notice-card"
            dir={rtl ? "rtl" : "ltr"}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg,#150f30 0%,#1a1440 55%,#12102b 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            <div
              className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(124,58,237,0.28) 0%,transparent 70%)" }}
            />

            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className={`absolute top-3 ${rtl ? "left-3" : "right-3"} w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 z-10`}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}
            >
              <X size={15} className="text-white/70" />
            </button>

            <div className="relative px-6 pt-7 pb-6">
              <h2 className="text-white font-black text-lg leading-snug mb-3 pr-6">
                {tx.title}
              </h2>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
                {tx.body}
              </p>

              <button
                type="button"
                onClick={dismiss}
                className="mt-6 w-full py-3 rounded-2xl text-white font-bold text-sm transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                  boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
                }}
              >
                {tx.continueLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

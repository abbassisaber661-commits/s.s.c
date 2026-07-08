/**
 * SubscriptionPage.tsx
 *
 * Full subscription onboarding via real Pi Network payments (Testnet).
 *
 * Flow:
 *  1. User taps a plan card → handleSubscribe(plan)
 *  2. Pi.authenticate(["username","payments"]) — opens Pi wallet auth
 *  3. POST /api/auth/pi with accessToken → backend creates/gets player, returns JWT
 *  4. JWT + playerId stored locally
 *  5. Pi.createPayment() called synchronously (within Pi Browser gesture context)
 *     └─ onReadyForServerApproval: POST /api/pi/payments (create) + /approve
 *     └─ onReadyForServerCompletion: POST /api/pi/payments/:id/complete
 *        → backend writes subscription record → frontend saves LocalSubscription
 *        → setAuthFromPi() → navigate to /
 *  6. onCancel / onError: reset loading state, show error
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useGame } from "@/contexts/GameContext";
import { Language, LANGUAGES } from "@/lib/i18n";
import { useEntryLanguage } from "@/contexts/EntryLanguageContext";
import { ensurePiInitialized } from "@/lib/pi-auth";
import { api, setToken, setStoredPlayerId } from "@/lib/apiClient";
import PiSignInButton from "@/components/PiSignInButton";
import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlanId,
  confirmSubscription,
} from "@/lib/pi-subscription";
import { Logo } from "@/components/Logo";
import { Globe } from "lucide-react";

/* ─── Subscription price map ────────────────────────────────────────────── */
const PLAN_PRICE: Record<SubscriptionPlanId, number> = {
  premium3: 3,
  premium1: 1,
};

const PLAN_DURATION_DAYS = 30;

/* ─── Translations ──────────────────────────────────────────────────────── */
interface SubT {
  heading:        string;
  subheading:     string;
  powered:        string;
  pi_test_notice: string;
  connecting:     string;
  authenticating: string;
  processing:     string;
  error_pi:       string;
  error_payment:  string;
  footer:         string;
  premium_name:   string;
  premium_features: string[];
  standard_name:  string;
  standard_features: string[];
  recommended:    string;
  days:           string;
  guest_enter:    string;
  guest_note:     string;
  language_label: string;
}

const T: Record<Language, SubT> = {
  en: {
    heading:        "Subscribe to S.S.C",
    subheading:     "Choose your plan to get started",
    powered:        "Payments powered by Pi Network",
    pi_test_notice: "PI TEST is used for all payments during the testing phase. This is NOT real Pi cryptocurrency.",
    connecting:     "Connecting to Pi…",
    authenticating: "Authenticating with Pi…",
    processing:     "Processing payment…",
    error_pi:       "Pi Network authentication failed. Please try again.",
    error_payment:  "Payment failed or was cancelled. Please try again.",
    footer:         "Your subscription is tied to your Pi account and lasts 30 days. Renewal requires a new payment.",
    premium_name:   "Premium",
    premium_features: ["Full access to all features", "Competitive league participation", "DN$ Wallet & Creator earnings", "Exclusive premium badges", "Priority matchmaking", "All social features unlocked", "Marketplace & Jobs access", "Monthly reward drops"],
    standard_name:  "Standard",
    standard_features: ["Core platform access", "League participation", "DN$ Wallet activated", "Social features", "Marketplace access"],
    recommended:    "⭐ RECOMMENDED",
    days:           "days",
    guest_enter:    "Continue as Guest",
    guest_note:     "Browse only · No payments · Data not saved",
    language_label: "Language",
  },
  ar: {
    heading:        "اشترك في S.S.C",
    subheading:     "اختر خطتك للبدء",
    powered:        "المدفوعات بدعم من شبكة Pi",
    pi_test_notice: "يُستخدم PI TEST لجميع المدفوعات خلال مرحلة الاختبار. هذه ليست عملة Pi حقيقية.",
    connecting:     "جارٍ الاتصال بـ Pi…",
    authenticating: "جارٍ التحقق مع Pi…",
    processing:     "جارٍ معالجة الدفع…",
    error_pi:       "فشل التحقق من Pi Network. يرجى المحاولة مرة أخرى.",
    error_payment:  "فشل الدفع أو تم إلغاؤه. يرجى المحاولة مرة أخرى.",
    footer:         "اشتراكك مرتبط بحساب Pi ويستمر 30 يومًا. يتطلب التجديد دفعة جديدة.",
    premium_name:   "بريميوم",
    premium_features: ["وصول كامل لجميع الميزات", "مشاركة في الدوري التنافسي", "محفظة DN$ وأرباح المبدعين", "شارات بريميوم حصرية", "مطابقة ذات أولوية", "جميع الميزات الاجتماعية مفعّلة", "الوصول للسوق والوظائف", "مكافآت شهرية"],
    standard_name:  "ستاندرد",
    standard_features: ["وصول أساسي للمنصة", "مشاركة في الدوري", "تفعيل محفظة DN$", "الميزات الاجتماعية", "وصول للسوق"],
    recommended:    "⭐ موصى به",
    days:           "يوم",
    guest_enter:    "الدخول كضيف",
    guest_note:     "تصفح فقط · بدون دفع · لا تُحفظ البيانات",
    language_label: "اللغة",
  },
  fr: {
    heading:        "S'abonner à S.S.C",
    subheading:     "Choisissez votre formule",
    powered:        "Paiements via Pi Network",
    pi_test_notice: "PI TEST est utilisé pour tous les paiements en phase de test. Ce n'est PAS du vrai Pi.",
    connecting:     "Connexion à Pi…",
    authenticating: "Authentification Pi…",
    processing:     "Traitement du paiement…",
    error_pi:       "Échec de l'authentification Pi Network. Veuillez réessayer.",
    error_payment:  "Paiement échoué ou annulé. Veuillez réessayer.",
    footer:         "Votre abonnement est lié à votre compte Pi et dure 30 jours. Le renouvellement nécessite un nouveau paiement.",
    premium_name:   "Premium",
    premium_features: ["Accès complet", "Participation aux ligues compétitives", "Portefeuille DN$ & gains créateurs", "Badges premium exclusifs", "Matchmaking prioritaire", "Toutes les fonctions sociales", "Accès Marketplace & Emplois", "Récompenses mensuelles"],
    standard_name:  "Standard",
    standard_features: ["Accès de base", "Participation aux ligues", "Portefeuille DN$ activé", "Fonctions sociales", "Accès Marketplace"],
    recommended:    "⭐ RECOMMANDÉ",
    days:           "jours",
    guest_enter:    "Continuer en invité",
    guest_note:     "Navigation uniquement · Sans paiement · Données non sauvegardées",
    language_label: "Langue",
  },
  es: {
    heading:        "Suscríbete a S.S.C",
    subheading:     "Elige tu plan",
    powered:        "Pagos a través de Pi Network",
    pi_test_notice: "PI TEST se usa para todos los pagos en la fase de prueba. No es Pi real.",
    connecting:     "Conectando con Pi…",
    authenticating: "Autenticando con Pi…",
    processing:     "Procesando pago…",
    error_pi:       "Fallo en la autenticación de Pi Network. Por favor, inténtalo de nuevo.",
    error_payment:  "Pago fallido o cancelado. Por favor, inténtalo de nuevo.",
    footer:         "Tu suscripción está vinculada a tu cuenta Pi y dura 30 días. La renovación requiere un nuevo pago.",
    premium_name:   "Premium",
    premium_features: ["Acceso completo", "Participación en ligas competitivas", "Cartera DN$ & ganancias creador", "Insignias premium exclusivas", "Emparejamiento prioritario", "Todas las funciones sociales", "Acceso a Marketplace y Empleos", "Recompensas mensuales"],
    standard_name:  "Estándar",
    standard_features: ["Acceso básico", "Participación en ligas", "Cartera DN$ activada", "Funciones sociales", "Acceso a Marketplace"],
    recommended:    "⭐ RECOMENDADO",
    days:           "días",
    guest_enter:    "Continuar como invitado",
    guest_note:     "Solo exploración · Sin pagos · Datos no guardados",
    language_label: "Idioma",
  },
  de: {
    heading:        "S.S.C abonnieren",
    subheading:     "Wähle deinen Plan",
    powered:        "Zahlungen über Pi Network",
    pi_test_notice: "PI TEST wird während der Testphase für alle Zahlungen verwendet. Dies ist KEIN echtes Pi.",
    connecting:     "Verbindung mit Pi…",
    authenticating: "Authentifizierung mit Pi…",
    processing:     "Zahlung wird verarbeitet…",
    error_pi:       "Pi Network-Authentifizierung fehlgeschlagen. Bitte versuche es erneut.",
    error_payment:  "Zahlung fehlgeschlagen oder abgebrochen. Bitte versuche es erneut.",
    footer:         "Dein Abonnement ist mit deinem Pi-Konto verknüpft und dauert 30 Tage. Verlängerung erfordert eine neue Zahlung.",
    premium_name:   "Premium",
    premium_features: ["Vollzugriff", "Teilnahme an Wettkampfligen", "DN$-Wallet & Creator-Einnahmen", "Exklusive Premium-Abzeichen", "Prioritäts-Matchmaking", "Alle sozialen Funktionen", "Zugang zu Marktplatz & Jobs", "Monatliche Belohnungen"],
    standard_name:  "Standard",
    standard_features: ["Grundzugang", "Ligenteilnahme", "DN$-Wallet aktiviert", "Soziale Funktionen", "Marktplatzzugang"],
    recommended:    "⭐ EMPFOHLEN",
    days:           "Tage",
    guest_enter:    "Als Gast fortfahren",
    guest_note:     "Nur browsen · Keine Zahlung · Daten nicht gespeichert",
    language_label: "Sprache",
  },
  pt: {
    heading:        "Assine o S.S.C",
    subheading:     "Escolha seu plano",
    powered:        "Pagamentos via Pi Network",
    pi_test_notice: "PI TEST é usado para todos os pagamentos na fase de teste. NÃO é Pi real.",
    connecting:     "Conectando ao Pi…",
    authenticating: "Autenticando com Pi…",
    processing:     "Processando pagamento…",
    error_pi:       "Falha na autenticação do Pi Network. Por favor, tente novamente.",
    error_payment:  "Pagamento falhou ou foi cancelado. Por favor, tente novamente.",
    footer:         "Sua assinatura está vinculada à sua conta Pi e dura 30 dias. A renovação requer um novo pagamento.",
    premium_name:   "Premium",
    premium_features: ["Acesso completo", "Participação em ligas competitivas", "Carteira DN$ & ganhos criador", "Distintivos premium exclusivos", "Matchmaking prioritário", "Todas as funções sociais", "Acesso a Marketplace e Empregos", "Recompensas mensais"],
    standard_name:  "Padrão",
    standard_features: ["Acesso básico", "Participação em ligas", "Carteira DN$ ativada", "Funções sociais", "Acesso ao Marketplace"],
    recommended:    "⭐ RECOMENDADO",
    days:           "dias",
    guest_enter:    "Continuar como convidado",
    guest_note:     "Apenas navegação · Sem pagamento · Dados não salvos",
    language_label: "Idioma",
  },
  tr: {
    heading:        "S.S.C'e Abone Ol",
    subheading:     "Planını seç",
    powered:        "Pi Network ile ödemeler",
    pi_test_notice: "PI TEST, test aşamasında tüm ödemeler için kullanılır. Bu gerçek Pi değildir.",
    connecting:     "Pi'ye bağlanıyor…",
    authenticating: "Pi ile doğrulanıyor…",
    processing:     "Ödeme işleniyor…",
    error_pi:       "Pi Network kimlik doğrulaması başarısız. Lütfen tekrar deneyin.",
    error_payment:  "Ödeme başarısız veya iptal edildi. Lütfen tekrar deneyin.",
    footer:         "Aboneliğiniz Pi hesabınıza bağlıdır ve 30 gün sürer. Yenileme yeni bir ödeme gerektirir.",
    premium_name:   "Premium",
    premium_features: ["Tüm özelliklere tam erişim", "Rekabetçi lig katılımı", "DN$ Cüzdanı & Yaratıcı kazançları", "Özel premium rozetler", "Öncelikli eşleştirme", "Tüm sosyal özellikler", "Pazar & İş erişimi", "Aylık ödüller"],
    standard_name:  "Standart",
    standard_features: ["Temel platform erişimi", "Lig katılımı", "DN$ Cüzdanı aktif", "Sosyal özellikler", "Pazar erişimi"],
    recommended:    "⭐ ÖNERİLEN",
    days:           "gün",
    guest_enter:    "Misafir olarak devam et",
    guest_note:     "Yalnızca göz atma · Ödeme yok · Veri kaydedilmez",
    language_label: "Dil",
  },
  hi: {
    heading:        "S.S.C सब्सक्राइब करें",
    subheading:     "अपना प्लान चुनें",
    powered:        "Pi Network द्वारा संचालित भुगतान",
    pi_test_notice: "परीक्षण चरण के दौरान PI TEST सभी भुगतानों के लिए उपयोग किया जाता है। यह वास्तविक Pi नहीं है।",
    connecting:     "Pi से जोड़ रहे हैं…",
    authenticating: "Pi के साथ प्रमाणित कर रहे हैं…",
    processing:     "भुगतान प्रोसेस हो रहा है…",
    error_pi:       "Pi Network प्रमाणीकरण विफल। कृपया पुनः प्रयास करें।",
    error_payment:  "भुगतान विफल या रद्द किया गया। कृपया पुनः प्रयास करें।",
    footer:         "आपकी सदस्यता आपके Pi खाते से जुड़ी है और 30 दिन तक चलती है। नवीनीकरण के लिए नए भुगतान की आवश्यकता है।",
    premium_name:   "प्रीमियम",
    premium_features: ["सभी सुविधाओं तक पूर्ण पहुँच", "प्रतिस्पर्धी लीग भागीदारी", "DN$ वॉलेट और क्रिएटर कमाई", "विशेष प्रीमियम बैज", "प्राथमिकता मैचमेकिंग", "सभी सोशल फीचर", "मार्केटप्लेस और जॉब्स एक्सेस", "मासिक पुरस्कार"],
    standard_name:  "स्टैंडर्ड",
    standard_features: ["मूल प्लेटफ़ॉर्म एक्सेस", "लीग भागीदारी", "DN$ वॉलेट सक्रिय", "सोशल फीचर", "मार्केटप्लेस एक्सेस"],
    recommended:    "⭐ अनुशंसित",
    days:           "दिन",
    guest_enter:    "अतिथि के रूप में जारी रखें",
    guest_note:     "केवल ब्राउज़िंग · कोई भुगतान नहीं · डेटा सहेजा नहीं जाता",
    language_label: "भाषा",
  },
  zh: {
    heading:        "订阅 S.S.C",
    subheading:     "选择您的套餐",
    powered:        "通过 Pi Network 支付",
    pi_test_notice: "测试阶段所有付款均使用 PI TEST，这不是真实的 Pi 加密货币。",
    connecting:     "正在连接 Pi…",
    authenticating: "正在通过 Pi 验证…",
    processing:     "正在处理付款…",
    error_pi:       "Pi Network 身份验证失败，请重试。",
    error_payment:  "付款失败或已取消，请重试。",
    footer:         "您的订阅与 Pi 账户绑定，有效期 30 天。续订需要新的付款。",
    premium_name:   "高级版",
    premium_features: ["完整功能访问", "参与竞技联赛", "DN$钱包和创作者收益", "专属高级徽章", "优先匹配", "所有社交功能", "市场和工作访问", "每月奖励"],
    standard_name:  "标准版",
    standard_features: ["基础平台访问", "联赛参与", "DN$钱包已激活", "社交功能", "市场访问"],
    recommended:    "⭐ 推荐",
    days:           "天",
    guest_enter:    "以访客身份继续",
    guest_note:     "仅限浏览 · 无需付款 · 数据不保存",
    language_label: "语言",
  },
  ru: {
    heading:        "Подписаться на S.S.C",
    subheading:     "Выберите план",
    powered:        "Платежи через Pi Network",
    pi_test_notice: "PI TEST используется для всех платежей в период тестирования. Это НЕ настоящий Pi.",
    connecting:     "Подключение к Pi…",
    authenticating: "Аутентификация Pi…",
    processing:     "Обработка платежа…",
    error_pi:       "Ошибка аутентификации Pi Network. Попробуйте ещё раз.",
    error_payment:  "Платёж не прошёл или отменён. Попробуйте ещё раз.",
    footer:         "Ваша подписка привязана к аккаунту Pi и действует 30 дней. Продление требует нового платежа.",
    premium_name:   "Премиум",
    premium_features: ["Полный доступ", "Участие в лигах", "DN$-кошелёк и доходы создателя", "Эксклюзивные значки", "Приоритетный матчмейкинг", "Все социальные функции", "Доступ к рынку и вакансиям", "Ежемесячные награды"],
    standard_name:  "Стандарт",
    standard_features: ["Базовый доступ", "Участие в лигах", "DN$-кошелёк активирован", "Социальные функции", "Доступ к рынку"],
    recommended:    "⭐ РЕКОМЕНДУЕТСЯ",
    days:           "дней",
    guest_enter:    "Войти как гость",
    guest_note:     "Только просмотр · Без оплаты · Данные не сохраняются",
    language_label: "Язык",
  },
};

/* ─── Languages shown on the subscription screen selector ──────────────── */
const SUB_LANGUAGE_CODES: Language[] = ["ar", "en", "fr"];
const SUB_LANGUAGES = SUB_LANGUAGE_CODES
  .map(code => LANGUAGES.find(l => l.code === code))
  .filter((l): l is (typeof LANGUAGES)[number] => !!l);

/* ─── Plan card data ────────────────────────────────────────────────────── */
interface PlanConfig {
  id:        SubscriptionPlanId;
  icon:      string;
  price:     number;
  gradient:  string;
  glow:      string;
  border:    string;
  btnStyle:  React.CSSProperties;
  featured:  boolean;
}

const PLANS: PlanConfig[] = [
  {
    id:        "premium3",
    icon:      "💎",
    price:     3,
    gradient:  "from-violet-600 via-purple-600 to-indigo-700",
    glow:      "rgba(139,92,246,0.5)",
    border:    "rgba(167,139,250,0.5)",
    btnStyle:  {
      background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
      boxShadow:  "0 0 30px rgba(124,58,237,0.6)",
      color:      "white",
    },
    featured:  true,
  },
  {
    id:        "premium1",
    icon:      "💰",
    price:     1,
    gradient:  "from-blue-600 to-indigo-700",
    glow:      "rgba(99,102,241,0.4)",
    border:    "rgba(99,102,241,0.4)",
    btnStyle:  {
      background: "linear-gradient(135deg,#2563eb,#4f46e5)",
      boxShadow:  "0 0 20px rgba(99,102,241,0.5)",
      color:      "white",
    },
    featured:  false,
  },
];

/* ─── Loading step labels ───────────────────────────────────────────────── */
type LoadStep = "idle" | "connecting" | "authenticating" | "processing" | "done";

/* ─── Component ─────────────────────────────────────────────────────────── */
interface Props {
  onBack?: () => void;
}

export default function SubscriptionPage({ onBack }: Props) {
  const { language, setLanguage, isRTL } = useEntryLanguage();
  const { setAuthFromPi, loginAsGuest, loginWithPiNetwork } = useGame();
  const [, navigate]        = useLocation();
  const tx                  = T[language];

  const [loadingPlan,   setLoadingPlan]   = useState<SubscriptionPlanId | null>(null);
  const [loadStep,      setLoadStep]      = useState<LoadStep>("idle");
  const [error,         setError]         = useState("");
  const [signInError,   setSignInError]   = useState("");
  const [signInSuccess, setSignInSuccess] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  /* ── Core subscription payment handler ─────────────────────────────────── */
  const handleSubscribe = async (plan: PlanConfig) => {
    if (loadingPlan) return;
    setError("");
    setLoadingPlan(plan.id);
    setLoadStep("connecting");

    try {
      /* Step 1 ─ Ensure Pi SDK is ready ─────────────────────────────────── */
      const sdkReady = await ensurePiInitialized();
      // Re-read window.Pi AFTER ensurePiInitialized() resolves — the SDK
      // script may have been dynamically injected during init, so capturing
      // it before the await would yield a stale undefined reference.
      const PiSDK = (window as any).Pi;
      if (!sdkReady || !PiSDK) {
        setError(tx.error_pi);
        setLoadingPlan(null);
        setLoadStep("idle");
        return;
      }

      /* Step 2 ─ Pi.authenticate() — opens Pi wallet, gets access token ─── */
      setLoadStep("authenticating");

      let piAccessToken: string;
      let piUid:         string;
      let piUsername:    string;

      try {
        /**
         * Scope: ["username", "payments"]
         *   "username"  — needed to create/look up the player account
         *   "payments"  — required to call Pi.createPayment()
         *
         * onIncompletePaymentFound fires if a previous session's payment was
         * interrupted after the user confirmed but before our server called
         * /complete.  We forward the Pi payment ID (and blockchain tx id if
         * present) to the backend, which:
         *   • txId present  → calls POST /v2/payments/:id/complete, fulfills sub
         *   • txId absent   → marks the payment failed (never hit the blockchain)
         *
         * The callback must be async so Pi SDK waits for it before proceeding.
         * It is fire-and-forget from the user's perspective — errors are logged
         * but never shown as a blocking error.
         */
        const authResult: { accessToken: string; user: { uid: string; username: string } } =
          await PiSDK.authenticate(
            ["username", "payments"],
            async (incompletePayment: {
              identifier: string;
              transaction: { txid: string } | null;
            }) => {
              console.info("[Sub] onIncompletePaymentFound:", incompletePayment.identifier);
              try {
                await api.pi.incomplete(
                  incompletePayment.identifier,
                  incompletePayment.transaction?.txid,
                );
                console.info("[Sub] Incomplete payment handled");
              } catch (err) {
                // Non-fatal — log and let auth proceed; the user can still
                // subscribe again.  The previous payment remains in the DB.
                console.error("[Sub] Failed to handle incomplete payment:", err);
              }
            },
          );
        piAccessToken = authResult.accessToken;
        piUid         = authResult.user.uid;
        piUsername    = authResult.user.username ?? `Pi_${authResult.user.uid.slice(0, 6)}`;
      } catch (authErr) {
        console.error("[Sub] Pi.authenticate() failed", authErr);
        setError(tx.error_pi);
        setLoadingPlan(null);
        setLoadStep("idle");
        return;
      }

      /* Step 3 ─ Backend Pi auth → create/get player, issue JWT ─────────── */
      let playerId:  string;
      let jwtToken:  string;
      let isOwnerUser = false;

      try {
        const authResp = await api.auth.pi(piAccessToken);
        jwtToken    = authResp.token;
        playerId    = authResp.player.id;
        isOwnerUser = !!(authResp as Record<string, unknown>).isOwner;
        // Persist token + playerId so subsequent API calls are authenticated
        setToken(jwtToken);
        setStoredPlayerId(playerId);
      } catch (backendErr) {
        console.error("[Sub] Backend auth/pi failed", backendErr);
        setError(tx.error_pi);
        setLoadingPlan(null);
        setLoadStep("idle");
        return;
      }

      /* Owner bypass ─ skip payment, enter app directly ─────────────────── */
      if (isOwnerUser) {
        console.info("[Sub] Owner detected — skipping payment gate");
        // Synthetic subscription so the gate passes (local-only, non-expiring)
        confirmSubscription({ playerId, plan: "premium3" as never, piTxId: "owner_bypass" });
        setAuthFromPi(piUid, piUsername);
        setLoadStep("done");
        navigate("/");
        return;
      }

      /* Step 4 ─ Pi.createPayment() — must be in the gesture context ─────── */
      setLoadStep("processing");

      await new Promise<void>((resolve, reject) => {
        // backendPaymentId is shared between the two async callbacks.
        // Pi SDK guarantees onReadyForServerApproval fires and the server
        // must respond before onReadyForServerCompletion is called.
        // We use a polling guard as an extra safety net for edge cases.
        let backendPaymentId: string | null = null;
        let approvalError: Error | null = null;

        try {
          PiSDK.createPayment(
            {
              amount:   plan.price,
              memo:     `S.S.C ${plan.id === "premium3" ? "Premium" : "Standard"} — ${PLAN_DURATION_DAYS}${tx.days}`,
              metadata: { kind: "subscription", plan: plan.id, playerId },
            },
            {
              onReadyForServerApproval: async (piPaymentId: string) => {
                console.debug("[Sub] onReadyForServerApproval", piPaymentId);
                try {
                  // Create our internal ledger record
                  const { paymentId } = await api.pi.create({
                    playerId,
                    amount:   plan.price,
                    memo:     `S.S.C Premium — ${plan.id} — 30 days`,
                    metadata: { kind: "subscription", plan: plan.id },
                  });
                  backendPaymentId = paymentId;
                  // Approve the Pi Network payment via our backend.
                  // This is a hard failure — backend calls Pi Network
                  // POST /v2/payments/:id/approve; if rejected, we abort
                  // rather than proceeding to a payment that can't complete.
                  await api.pi.approve(paymentId, piPaymentId);
                  console.debug("[Sub] Payment approved, backendId=", paymentId);
                } catch (e) {
                  console.error("[Sub] onReadyForServerApproval error", e);
                  approvalError = e instanceof Error ? e : new Error(String(e));
                }
              },

              onReadyForServerCompletion: async (piPaymentId: string, piTxId: string) => {
                console.debug("[Sub] onReadyForServerCompletion", piPaymentId, piTxId);

                // Safety guard: wait up to 10s for the approval callback to
                // finish in case of any sequencing edge case.
                if (!backendPaymentId && !approvalError) {
                  console.warn("[Sub] Waiting for backendPaymentId…");
                  for (let i = 0; i < 100; i++) {
                    await new Promise(r => setTimeout(r, 100));
                    if (backendPaymentId || approvalError) break;
                  }
                }

                if (approvalError) {
                  reject(approvalError);
                  return;
                }

                if (!backendPaymentId) {
                  console.error("[Sub] backendPaymentId still null after wait — rejecting");
                  reject(new Error("payment_setup_failed"));
                  return;
                }

                try {
                  // Complete and verify on the backend (writes subscriptions row)
                  await api.pi.complete(backendPaymentId, piTxId);
                  console.debug("[Sub] Payment completed — subscription active");

                  // Persist subscription locally so auth guard is satisfied immediately
                  confirmSubscription({ playerId, plan: plan.id, piTxId });

                  // Set auth state in React — user is now logged in
                  setAuthFromPi(piUid, piUsername);

                  resolve();
                } catch (e) {
                  console.error("[Sub] onReadyForServerCompletion error", e);
                  reject(e);
                }
              },

              onCancel: (piPaymentId: string) => {
                console.debug("[Sub] Payment cancelled", piPaymentId);
                // Mark as failed in our backend if we have a record
                if (backendPaymentId) {
                  api.pi.fail(backendPaymentId, "user_cancelled").catch(() => {});
                }
                reject(new Error("cancelled"));
              },

              onError: (err: unknown, payment: unknown) => {
                console.error("[Sub] Pi payment error", err, payment);
                if (backendPaymentId) {
                  api.pi.fail(backendPaymentId, "pi_error").catch(() => {});
                }
                reject(err instanceof Error ? err : new Error("pi_error"));
              },
            },
          );
        } catch (syncErr) {
          // Pi.createPayment() itself threw synchronously (e.g. called outside Pi Browser)
          console.error("[Sub] Pi.createPayment() sync error", syncErr);
          reject(syncErr instanceof Error ? syncErr : new Error("pi_sdk_error"));
        }
      });

      /* Step 5 ─ Success → navigate to home ─────────────────────────────── */
      setLoadStep("done");
      navigate("/");

    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? "";
      if (msg === "cancelled") {
        setError(tx.error_payment);
      } else {
        setError(tx.error_payment);
      }
      setLoadingPlan(null);
      setLoadStep("idle");
    }
  };

  /* ── Step label ─────────────────────────────────────────────────────────── */
  const stepLabel = (() => {
    if (loadStep === "connecting")     return tx.connecting;
    if (loadStep === "authenticating") return tx.authenticating;
    if (loadStep === "processing")     return tx.processing;
    return "";
  })();

  /* ── Plan display helpers ───────────────────────────────────────────────── */
  const planDisplay = (plan: PlanConfig) => ({
    name:     plan.id === "premium3" ? tx.premium_name : tx.standard_name,
    features: plan.id === "premium3" ? tx.premium_features : tx.standard_features,
  });

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background:
          "linear-gradient(160deg,#0a0818 0%,#130d2e 35%,#0d1a3a 70%,#0a0818 100%)",
      }}
    >
      {/* Ambient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-5%] right-[-10%] w-[55vw] h-[55vw] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 70%)" }}
        />
        <div
          className="absolute bottom-[0%] left-[-10%] w-[50vw] h-[50vw] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(59,130,246,0.13) 0%,transparent 70%)" }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-5 pt-6 pb-2">
        {onBack && (
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={onBack}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <span className="text-white text-base">{isRTL ? "→" : "←"}</span>
          </motion.button>
        )}
        <Logo size={36} rounded="rounded-xl" />
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex flex-col leading-none mb-0.5">
            <span className="text-white font-black text-lg tracking-tight">S.S.C</span>
            <span className="text-white/50 font-semibold" style={{ fontSize: 9, letterSpacing: "0.08em" }}>SkillLeague Social Channel</span>
          </div>
          <p className="text-white/40 text-xs">{tx.powered}</p>
        </motion.div>
      </div>

      {/* Language selector — isolated card, never overlaps other content */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        ref={langRef}
        className="mx-5 mt-3 rounded-2xl px-4 py-3 flex items-center flex-wrap gap-3 relative z-10"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)" }}
      >
        <div className="flex items-center gap-1.5 text-white/55 text-xs font-bold shrink-0">
          <Globe size={14} />
          <span>{tx.language_label}</span>
        </div>
        <div className="flex items-center gap-2 flex-1 flex-wrap" role="group" aria-label={tx.language_label}>
          {SUB_LANGUAGES.map(lang => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                aria-pressed={active}
                onClick={() => setLanguage(lang.code as Language)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                style={{
                  background: active
                    ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                    : "rgba(255,255,255,0.08)",
                  border: active
                    ? "1px solid rgba(167,139,250,0.6)"
                    : "1px solid rgba(255,255,255,0.14)",
                  color: active ? "#ffffff" : "rgba(255,255,255,0.65)",
                  boxShadow: active ? "0 0 14px rgba(124,58,237,0.5)" : "none",
                }}
              >
                {lang.native}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* PI TEST notice */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-5 mt-3 rounded-2xl px-4 py-3 flex items-start gap-2.5 relative z-10"
        style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }}
      >
        <span className="text-lg flex-shrink-0 mt-0.5">⚠️</span>
        <p className="text-amber-300 text-xs leading-relaxed">
          <span className="font-bold">PI TEST — </span>{tx.pi_test_notice}
        </p>
      </motion.div>

      {/* Plan cards */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8 flex flex-col gap-4 relative z-10">
        {PLANS.map((plan, idx) => {
          const d       = planDisplay(plan);
          const loading = loadingPlan === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 + idx * 0.12 }}
              className="relative rounded-3xl overflow-hidden"
              style={{
                background: plan.featured
                  ? "linear-gradient(160deg,rgba(124,58,237,0.15) 0%,rgba(79,70,229,0.1) 100%)"
                  : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${plan.border}`,
                boxShadow: plan.featured
                  ? `0 0 40px ${plan.glow},0 0 80px rgba(124,58,237,0.08)`
                  : "none",
              }}
            >
              {/* Recommended badge */}
              {plan.featured && (
                <div
                  className="absolute top-0 left-0 right-0 flex justify-center py-2 text-black font-black text-xs tracking-wider"
                  style={{ background: "linear-gradient(90deg,#f59e0b,#fbbf24)" }}
                >
                  {tx.recommended}
                </div>
              )}

              <div className={`p-5 ${plan.featured ? "pt-9" : ""}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br ${plan.gradient} shadow-lg`}
                      style={{ boxShadow: `0 6px 20px ${plan.glow}` }}
                    >
                      {plan.icon}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-base leading-tight">{d.name}</h3>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-white font-black text-xl leading-none">{plan.price}</span>
                        <span
                          className="text-xs font-black tracking-wide px-1.5 py-0.5 rounded-lg"
                          style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}
                        >
                          PI TEST
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-white/40 text-xs">{PLAN_DURATION_DAYS} {tx.days}</p>
                    {plan.featured && (
                      <motion.span
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                        className="text-xl"
                      >
                        ✨
                      </motion.span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div
                  className="my-4 h-px"
                  style={{ background: `linear-gradient(90deg,transparent,${plan.border},transparent)` }}
                />

                {/* Features */}
                <ul className="flex flex-col gap-2">
                  {d.features.map((f, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: i * 0.03 }}
                      className="flex items-center gap-2.5"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                        style={{
                          background: `linear-gradient(135deg,${plan.glow.replace(/[\d.]+\)$/, "0.9)")},${plan.glow})`,
                        }}
                      >
                        <span style={{ fontSize: 8, color: "white" }}>✓</span>
                      </div>
                      <span className="text-white/70 text-sm">{f}</span>
                    </motion.li>
                  ))}
                </ul>

                {/* CTA button */}
                <motion.button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loadingPlan !== null}
                  className="w-full mt-5 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 disabled:opacity-60"
                  style={{ ...plan.btnStyle, height: 52 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="spinner"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 rounded-full border-2"
                          style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }}
                        />
                        <span className="text-xs opacity-80">{stepLabel}</span>
                      </motion.div>
                    ) : (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        𝛑 {plan.id === "premium3"
                          ? `${tx.premium_name} — ${plan.price} PI TEST`
                          : `${tx.standard_name} — ${plan.price} PI TEST`}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </motion.div>
          );
        })}

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mx-1 rounded-2xl px-4 py-3 text-center"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
            >
              <p className="text-red-400 text-sm font-semibold">⚠️ {error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/30 text-xs leading-relaxed px-4"
        >
          {tx.footer}
        </motion.p>

        {/* ── Manual "Sign in with Pi" — for returning subscribers ─────────
             If auto-auth (fired at boot inside Pi Browser) didn't complete,
             or the user is on desktop/non-Pi browser, this gives them a
             manual trigger.  Verification is always server-authoritative:
             POST /api/auth/pi → backend GET /v2/me → JWT.              ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center gap-3 pt-1"
        >
          {/* Divider */}
          <div className="flex items-center gap-2 w-full px-4">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <span className="text-white/25 text-xs font-medium">
              {language === "ar" ? "لديك حساب Pi بالفعل؟" : "Already have a Pi account?"}
            </span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Pi sign-in button — scope: username only, backend-verified */}
          <PiSignInButton
            label={language === "ar" ? "تسجيل الدخول بـ Pi" : "Sign in with Pi"}
            onSuccess={() => {
              setSignInSuccess(true);
              navigate("/");
            }}
            onError={(msg) => setSignInError(msg)}
            style={{ width: "100%", maxWidth: 300 }}
          />

          {/* sign-in error */}
          <AnimatePresence>
            {signInError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs text-center px-4"
              >
                ⚠️ {signInError}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="text-white/25 text-[10px] text-center px-6 leading-relaxed">
            {language === "ar"
              ? "إذا كان اشتراكك لا يزال سارياً، سيتحقق الخادم وسيتم تسجيل دخولك مباشرةً."
              : "If your subscription is still active, the server will verify it and sign you in directly."}
          </p>
        </motion.div>

        {/* ── Guest entry ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.75 }}
          className="flex flex-col items-center gap-2 pt-1 pb-1"
        >
          <div className="flex items-center gap-2 w-full px-4">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
            <span className="text-white/15 text-xs">أو</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          </div>
          <button
            onClick={() => { loginAsGuest(); navigate("/"); }}
            disabled={loadingPlan !== null}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all active:scale-95 disabled:opacity-40"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <span className="text-base leading-none">👤</span>
            <div className="text-left">
              <p className="text-sm font-semibold leading-tight" style={{ color: "rgba(255,255,255,0.6)" }}>
                {tx.guest_enter}
              </p>
              <p className="text-[10px] leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                {tx.guest_note}
              </p>
            </div>
          </button>
        </motion.div>

      </div>
    </div>
  );
}

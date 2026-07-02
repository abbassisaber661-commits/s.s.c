import { useState } from "react";
import IntroPage from "./IntroPage";
import SubscriptionPage from "./SubscriptionPage";
import { EntryLanguageProvider } from "@/contexts/EntryLanguageContext";

type Step = "intro" | "subscription";

export default function EntryFlow() {
  const [step, setStep] = useState<Step>("intro");

  return (
    <EntryLanguageProvider>
      {step === "intro"
        ? <IntroPage onContinue={() => setStep("subscription")} />
        : <SubscriptionPage onBack={() => setStep("intro")} />}
    </EntryLanguageProvider>
  );
}

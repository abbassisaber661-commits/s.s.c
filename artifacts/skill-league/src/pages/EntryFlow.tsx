import { useState } from "react";
import IntroPage from "./IntroPage";
import SubscriptionPage from "./SubscriptionPage";

type Step = "intro" | "subscription";

export default function EntryFlow() {
  const [step, setStep] = useState<Step>("intro");

  if (step === "intro") {
    return <IntroPage onContinue={() => setStep("subscription")} />;
  }

  return <SubscriptionPage onBack={() => setStep("intro")} />;
}

import { useEffect } from "react";
import { useLocation } from "wouter";

export default function LeaguesHub() {
  const [, go] = useLocation();
  useEffect(() => { go("/league-select"); }, []);
  return null;
}

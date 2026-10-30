import type { ReactNode } from "react";

export const metadata = {
  title: "Forex Watchlist | AlgoEdge",
  description: "Real-time forex trading signals and watchlist",
};

export default function ForexLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
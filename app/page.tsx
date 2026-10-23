"use client";
import dynamic from "next/dynamic";

// All data lives in localStorage, so the app renders only in the browser.
const App = dynamic(() => import("@/components/App"), { ssr: false, loading: () => <div className="boot" /> });

export default function Page() {
  return <App />;
}

'use client';

import dynamic from 'next/dynamic';

// Dynamic imports with SSR disabled to prevent DOMMatrix errors during build
const Stage = dynamic(() => import("@/components/Canvas/Stage"), { ssr: false });
const Toolbar = dynamic(() => import("@/components/UI/Toolbar"), { ssr: false });
const Header = dynamic(() => import("@/components/UI/Header"), { ssr: false });
const PageNavigator = dynamic(() => import("@/components/UI/PageNavigator"), { ssr: false });

export default function Home() {
  return (
    <>
      <Header />
      <Stage />
      <Toolbar />
      <PageNavigator />
    </>
  );
}

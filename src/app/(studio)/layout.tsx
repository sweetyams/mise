'use client';

import { useState, useCallback } from 'react';
import StudioNav from '@/components/studio-nav';
import GenerationPanel from '@/components/generation-panel';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRecipeSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--ed-bg)' }} key={refreshKey}>
      <StudioNav onNewRecipe={() => setPanelOpen(true)} />
      <main>{children}</main>
      <GenerationPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onRecipeSaved={handleRecipeSaved}
      />
    </div>
  );
}

import StudioNav from '@/components/studio-nav';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--ed-bg)' }}>
      <StudioNav />
      <main>{children}</main>
    </div>
  );
}

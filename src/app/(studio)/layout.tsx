import StudioNav from '@/components/studio-nav';

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StudioNav />
      <main>{children}</main>
    </div>
  );
}

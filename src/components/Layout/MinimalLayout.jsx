import GlobalHeader from './GlobalHeader';

export default function MinimalLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <GlobalHeader />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-surface-200/60 bg-white py-4">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 flex items-center justify-between">
          <p className="text-[11px] text-surface-400">&copy; {new Date().getFullYear()} WBIZ.IN. All rights reserved.</p>
          <p className="text-[11px] text-surface-400">Your Business. Your WhatsApp. One Powerful Platform.</p>
        </div>
      </footer>
    </div>
  );
}

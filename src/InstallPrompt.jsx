import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button 
        onClick={handleInstall}
        className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-full shadow-2xl hover:scale-105 transition-transform font-bold text-sm"
      >
        <Download size={16} /> Install App
      </button>
    </div>
  );
}
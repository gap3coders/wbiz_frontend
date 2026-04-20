import { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, Download, Copy, RefreshCw, Smartphone, MessageSquare, Link2, Check, Image, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';

const QR_SIZES = [
  { label: 'Small', value: 200, px: '200×200' },
  { label: 'Medium', value: 300, px: '300×300' },
  { label: 'Large', value: 400, px: '400×400' },
  { label: 'Print', value: 600, px: '600×600' },
];

const QR_COLORS = [
  { label: 'Classic', dark: '#000000', light: '#ffffff' },
  { label: 'WhatsApp', dark: '#075E54', light: '#ffffff' },
  { label: 'Brand', dark: '#25D366', light: '#ffffff' },
  { label: 'Dark', dark: '#1e293b', light: '#f8fafc' },
];

export default function QRCodeGenerator() {
  const { tenant, whatsappAccount } = useAuth();
  const canvasRef = useRef(null);

  const [phone, setPhone] = useState('');
  const [prefillMsg, setPrefillMsg] = useState('');
  const [size, setSize] = useState(300);
  const [colorIdx, setColorIdx] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Extract phone from WhatsApp account
  useEffect(() => {
    const displayPhone = whatsappAccount?.display_phone_number || tenant?.wa_display_phone || '';
    // Strip non-numeric for wa.me link (remove +, spaces, dashes)
    const cleaned = displayPhone.replace(/[^0-9]/g, '');
    if (cleaned) setPhone(cleaned);
  }, [whatsappAccount, tenant]);

  // Build the wa.me link
  const waLink = phone
    ? `https://wa.me/${phone}${prefillMsg.trim() ? `?text=${encodeURIComponent(prefillMsg.trim())}` : ''}`
    : '';

  // Generate QR code on canvas
  const generateQR = useCallback(async () => {
    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const colors = QR_COLORS[colorIdx];
      await QRCode.toCanvas(canvas, waLink, {
        width: size,
        margin: 2,
        color: {
          dark: colors.dark,
          light: colors.light,
        },
        errorCorrectionLevel: 'H',
      });
      setGenerated(true);
    } catch (err) {
      console.error('QR generation error:', err);
      toast.error('Failed to generate QR code');
    }
  }, [phone, prefillMsg, size, colorIdx, waLink]);

  // Auto-generate when config changes and phone is valid
  useEffect(() => {
    if (phone.trim().length >= 10) {
      generateQR();
    }
  }, [phone, prefillMsg, size, colorIdx, generateQR]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !generated) return;
    const link = document.createElement('a');
    link.download = `whatsapp-qr-${phone}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR code downloaded');
  };

  const handleCopyLink = () => {
    if (!waLink) return;
    navigator.clipboard.writeText(waLink).then(() => {
      setLinkCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">QR Code Generator</h1>
          <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
            <QrCode className="w-3.5 h-3.5" /> Generate WhatsApp QR codes and short links for easy customer access
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ═══════ LEFT: Configuration (3 cols) ═══════ */}
        <div className="lg:col-span-3 space-y-5">
          {/* Phone & Message */}
          <div className="bg-white rounded-xl border border-surface-200">
            <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-brand-500" />
              </div>
              <h3 className="text-[14px] font-bold text-surface-900">WhatsApp Details</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Phone Number *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value.replace(/[^0-9]/g, '')); setGenerated(false); }}
                  placeholder="e.g. 919876543210"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
                <p className="text-[11px] text-surface-400 mt-1">Country code + number, no spaces or special characters</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Pre-filled Message <span className="text-surface-400 font-normal">(optional)</span></label>
                <textarea
                  value={prefillMsg}
                  onChange={(e) => { setPrefillMsg(e.target.value); setGenerated(false); }}
                  placeholder="Hi! I'd like to know more about your services..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                />
                <p className="text-[11px] text-surface-400 mt-1">{prefillMsg.length}/500 characters</p>
              </div>
            </div>
          </div>

          {/* QR Customization */}
          <div className="bg-white rounded-xl border border-surface-200">
            <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                <Image className="w-4 h-4 text-violet-500" />
              </div>
              <h3 className="text-[14px] font-bold text-surface-900">QR Customization</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Size */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-2">Size</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {QR_SIZES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => { setSize(s.value); setGenerated(false); }}
                      className={`px-3.5 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
                        size === s.value
                          ? 'bg-brand-50 text-brand-700 border-brand-200'
                          : 'text-surface-500 border-surface-200 hover:bg-surface-50'
                      }`}
                    >
                      {s.label}
                      <span className="text-[10px] ml-1 opacity-60">{s.px}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <label className="block text-[12px] font-semibold text-surface-700 mb-2">Color Theme</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {QR_COLORS.map((c, idx) => (
                    <button
                      key={c.label}
                      onClick={() => { setColorIdx(idx); setGenerated(false); }}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-semibold border transition-all ${
                        colorIdx === idx
                          ? 'bg-brand-50 text-brand-700 border-brand-200'
                          : 'text-surface-500 border-surface-200 hover:bg-surface-50'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full border border-surface-200" style={{ backgroundColor: c.dark }} />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Link Preview & Actions */}
          {waLink && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Link2 className="w-4 h-4 text-brand-500" />
                <h3 className="text-[13px] font-bold text-surface-900">WhatsApp Link</h3>
              </div>
              <div className="flex items-center gap-2 bg-surface-50 rounded-lg p-3 border border-surface-100">
                <p className="text-[12px] text-brand-700 font-mono truncate flex-1">{waLink}</p>
                <button
                  onClick={handleCopyLink}
                  className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                    linkCopied
                      ? 'bg-green-50 text-green-600'
                      : 'text-surface-400 hover:text-brand-600 hover:bg-brand-50'
                  }`}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-all flex-shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ═══════ RIGHT: Preview (2 cols) ═══════ */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-surface-200 sticky top-5">
            <div className="px-5 py-3.5 border-b border-surface-100 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-surface-900">QR Preview</h3>
              {generated && (
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-900 text-white rounded-lg text-[11px] font-semibold hover:bg-surface-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>
            <div className="p-5 flex flex-col items-center justify-center min-h-[380px]">
              {!phone.trim() ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-8 h-8 text-surface-300" />
                  </div>
                  <p className="text-[13px] text-surface-500 font-medium">Enter a phone number</p>
                  <p className="text-[11px] text-surface-400 mt-1">QR code will auto-generate</p>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-white rounded-xl border border-surface-200 shadow-sm mb-4">
                    <canvas ref={canvasRef} className="block rounded-lg" style={{ maxWidth: '100%', height: 'auto' }} />
                  </div>
                  <p className="text-[12px] text-surface-500 text-center mb-4">
                    Scan to start a WhatsApp conversation
                  </p>

                  {/* Download Buttons */}
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={handleDownload}
                      disabled={!generated}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg text-[13px] transition-colors disabled:opacity-40"
                    >
                      <Download className="w-4 h-4" /> Download PNG
                    </button>
                    <button
                      onClick={handleCopyLink}
                      disabled={!waLink}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold rounded-lg text-[13px] transition-colors disabled:opacity-40"
                    >
                      {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {linkCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

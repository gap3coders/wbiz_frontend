import { Check, CheckCheck, FileText, Play, Phone as PhoneIcon, ExternalLink, Copy, ArrowLeft, MoreVertical, Smile, Paperclip, Camera, Mic } from 'lucide-react';

/**
 * WhatsApp Phone Preview — Global Component
 *
 * Renders a realistic iPhone mockup with WhatsApp chat UI.
 * Supports: template messages (header image/video/document/text, body, footer, buttons),
 * plain text, and media messages.
 *
 * Usage:
 *   <WhatsAppPhonePreview
 *     header={{ type: 'image', url: '...' }}
 *     body="Hello {{1}}, your order {{2}} is ready"
 *     footer="Reply STOP to opt out"
 *     buttons={[{ type: 'URL', text: 'Track Order', url: '...' }]}
 *     variables={{ 1: 'John', 2: '#1234' }}
 *     contactName="WBIZ.IN"
 *   />
 */

/* ── Variable replacement ── */
const renderTextWithVars = (text, variables = {}) => {
  if (!text) return null;
  const parts = text.split(/(\{\{\d+\}\})/g);
  return parts.map((part, i) => {
    const match = part.match(/\{\{(\d+)\}\}/);
    if (match) {
      const key = match[1];
      const value = variables[key];
      if (value) return <span key={i} className="font-semibold">{value}</span>;
      return (
        <span key={i} className="bg-[#FFF3CD] text-[#856404] px-1 rounded text-[11px] font-medium">
          {`{{${key}}}`}
        </span>
      );
    }
    return part.split('\n').map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ));
  });
};

/* ── Status ticks ── */
const StatusTicks = ({ status = 'read' }) => {
  if (status === 'read') return <CheckCheck className="w-[12px] h-[12px] text-[#53BDEB]" strokeWidth={2.5} />;
  if (status === 'delivered') return <CheckCheck className="w-[12px] h-[12px] text-[#8696A0]" strokeWidth={2.5} />;
  return <Check className="w-[12px] h-[12px] text-[#8696A0]" strokeWidth={2.5} />;
};

/* ── Header renderers ── */
const HeaderImage = ({ url }) => (
  <div className="aspect-[16/10] bg-[#E2E8F0] rounded-md overflow-hidden mx-1 mt-1">
    {url ? (
      <img src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <div className="w-full h-full flex flex-col items-center justify-center text-[#94A3B8]">
        <svg className="w-10 h-10 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span className="text-[12px] font-medium">Image</span>
      </div>
    )}
  </div>
);

const HeaderVideo = ({ url }) => (
  <div className="aspect-video bg-[#1A1A2E] rounded-md overflow-hidden mx-1 mt-1 relative flex items-center justify-center">
    {url ? (
      <>
        <video src={url} className="w-full h-full object-cover" muted />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
      </>
    ) : (
      <div className="flex flex-col items-center text-[#64748B]">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-1">
          <Play className="w-6 h-6 text-white/60 fill-white/60 ml-0.5" />
        </div>
        <span className="text-[12px] font-medium text-white/50">Video</span>
      </div>
    )}
  </div>
);

const HeaderDocument = ({ filename, url }) => (
  <div className="mx-1 mt-1 p-3 bg-[#d1f4cc] rounded-md flex items-center gap-3">
    <div className="w-10 h-10 rounded-md bg-white/70 flex items-center justify-center flex-shrink-0">
      <FileText className="w-5 h-5 text-[#E53935]" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-medium text-[#111B21] truncate">{filename || 'Document.pdf'}</p>
      <p className="text-[11px] text-[#667781]">PDF • Document</p>
    </div>
  </div>
);

/* ── Audio message ── */
const AudioMessage = () => (
  <div className="mx-1 mt-1 p-2.5 flex items-center gap-2.5">
    <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
    </div>
    <div className="flex-1">
      <div className="h-2 bg-[#8696A0]/30 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-[#00A884] rounded-full" />
      </div>
      <p className="text-[11px] text-[#667781] mt-1">0:12</p>
    </div>
  </div>
);

/* ── Button icons ── */
const ButtonIcon = ({ type }) => {
  if (type === 'URL') return <ExternalLink className="w-3.5 h-3.5" />;
  if (type === 'PHONE_NUMBER') return <PhoneIcon className="w-3.5 h-3.5" />;
  if (type === 'COPY_CODE') return <Copy className="w-3.5 h-3.5" />;
  return null;
};

/* ── Main Component ── */
export default function WhatsAppPhonePreview({
  header,
  body = '',
  footer,
  buttons = [],
  variables = {},
  direction = 'outbound',
  timestamp,
  status = 'read',
  contactName = 'WBIZ.IN',
  contactAvatar,
  className = '',
  emptyMessage = 'Your message preview will appear here',
}) {
  const time = timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isOutbound = direction === 'outbound';
  const hasContent = body || header || (buttons && buttons.length > 0);

  return (
    <div className={`w-full max-w-[340px] mx-auto ${className}`}>
      {/* ── iPhone Frame ── */}
      <div className="relative bg-[#1C1C1E] rounded-[2.8rem] p-[10px] shadow-2xl shadow-black/25" style={{ aspectRatio: '9/19.2' }}>
        {/* Dynamic Island */}
        <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-[100px] h-[26px] bg-[#1C1C1E] rounded-full z-10" />

        {/* Screen */}
        <div className="bg-[#1C1C1E] rounded-[2.2rem] overflow-hidden h-full flex flex-col">
          {/* ─ iOS Status Bar ─ */}
          <div className="flex items-center justify-between px-7 pt-3 pb-1 bg-[#075E54] flex-shrink-0">
            <span className="text-[12px] text-white font-semibold">9:41</span>
            <div className="flex items-center gap-1.5 text-white">
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" /></svg>
              <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.34C7 21.4 7.6 22 8.33 22h7.34c.73 0 1.33-.6 1.33-1.33V5.33C17 4.6 16.4 4 15.67 4z" /></svg>
            </div>
          </div>

          {/* ─ WhatsApp Header ─ */}
          <div className="bg-[#075E54] flex items-center gap-2 px-3 pb-2.5 flex-shrink-0">
            <ArrowLeft className="w-[18px] h-[18px] text-white flex-shrink-0" />
            <div className="w-[34px] h-[34px] rounded-full bg-[#DFE5E7] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {contactAvatar ? (
                <img src={contactAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <svg className="w-[20px] h-[20px] text-[#CFD4D6]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate leading-tight">{contactName}</p>
              <p className="text-[11px] text-[#82c8bb] leading-tight">online</p>
            </div>
            <MoreVertical className="w-[18px] h-[18px] text-white/70 flex-shrink-0" />
          </div>

          {/* ─ Chat Area ─ */}
          <div
            className="flex-1 py-3 flex flex-col justify-end overflow-y-auto"
            style={{
              backgroundColor: '#ECE5DD',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5bfb5' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          >
            {/* Today chip */}
            <div className="flex justify-center mb-3">
              <span className="text-[10px] text-[#54656F] bg-white/90 px-2.5 py-[3px] rounded-md shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] font-medium">
                TODAY
              </span>
            </div>

            {hasContent ? (
              <>
                {/* Message bubble */}
                <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-2.5`}>
                  <div
                    className={`relative max-w-[88%] rounded-lg overflow-hidden ${
                      isOutbound ? 'bg-[#D9FDD3]' : 'bg-white'
                    } shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]`}
                  >
                    {/* SVG tail */}
                    {isOutbound && (
                      <div className="absolute -right-[6px] top-0">
                        <svg width="8" height="13" viewBox="0 0 8 13">
                          <path d="M0 0L8 0L0 13Z" fill="#D9FDD3" />
                        </svg>
                      </div>
                    )}
                    {!isOutbound && (
                      <div className="absolute -left-[6px] top-0">
                        <svg width="8" height="13" viewBox="0 0 8 13">
                          <path d="M8 0L0 0L8 13Z" fill="white" />
                        </svg>
                      </div>
                    )}

                    {/* Header */}
                    {header && (
                      <>
                        {header.type === 'image' && <HeaderImage url={header.url} />}
                        {header.type === 'video' && <HeaderVideo url={header.url} />}
                        {header.type === 'document' && <HeaderDocument filename={header.filename} url={header.url} />}
                        {header.type === 'audio' && <AudioMessage />}
                        {header.type === 'text' && header.text && (
                          <p className="px-2 pt-1.5 text-[13px] font-bold text-[#111B21] leading-snug">
                            {renderTextWithVars(header.text, variables)}
                          </p>
                        )}
                      </>
                    )}

                    {/* Body */}
                    {body && (
                      <p className="px-2 pt-1.5 pb-1 text-[13px] text-[#111B21] leading-[18px] whitespace-pre-wrap break-words">
                        {renderTextWithVars(body, variables)}
                      </p>
                    )}

                    {/* Footer */}
                    {footer && (
                      <p className="px-2 pb-0.5 text-[11px] text-[#8696A0] leading-[15px]">
                        {footer}
                      </p>
                    )}

                    {/* Timestamp + ticks */}
                    <div className="flex items-center justify-end gap-1 px-2 pb-1.5 -mt-0.5">
                      <span className="text-[10px] text-[#667781]">{time}</span>
                      {isOutbound && <StatusTicks status={status} />}
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                {buttons.length > 0 && (
                  <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-2.5 mt-[2px]`}>
                    <div className="max-w-[88%] w-full space-y-[2px]">
                      {buttons.map((btn, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-center gap-1.5 py-[7px] text-[12px] font-medium text-[#00A884] bg-white rounded-md shadow-[0_1px_0.5px_rgba(0,0,0,0.1)]"
                        >
                          <ButtonIcon type={btn.type} />
                          <span className="truncate">{btn.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center px-6">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-white/60 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
                    <svg className="w-7 h-7 text-[#8696A0]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-[#8696A0] font-medium leading-tight">{emptyMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* ─ Input Bar ─ */}
          <div className="bg-[#F0F2F5] flex items-center gap-1.5 px-2 py-[6px] flex-shrink-0">
            <div className="flex-1 bg-white rounded-full flex items-center gap-2 px-3 py-[7px]">
              <Smile className="w-[16px] h-[16px] text-[#8696A0] flex-shrink-0" />
              <span className="text-[12px] text-[#8696A0] flex-1">Type a message</span>
              <Paperclip className="w-[16px] h-[16px] text-[#8696A0] flex-shrink-0" />
              <Camera className="w-[16px] h-[16px] text-[#8696A0] flex-shrink-0" />
            </div>
            <div className="w-[34px] h-[34px] rounded-full bg-[#00A884] flex items-center justify-center flex-shrink-0">
              <Mic className="w-[16px] h-[16px] text-white" />
            </div>
          </div>

          {/* Bottom safe area */}
          <div className="h-4 bg-[#F0F2F5]" />
        </div>
      </div>

      {/* Home indicator */}
      <div className="flex justify-center mt-1">
        <div className="w-[100px] h-[4px] bg-[#3A3A3C] rounded-full" />
      </div>
    </div>
  );
}

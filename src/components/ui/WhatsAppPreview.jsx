import { Check, CheckCheck, FileText, Play, Phone as PhoneIcon, ExternalLink, Copy, Clock, Wifi, Battery, Signal } from 'lucide-react';

/**
 * WhatsApp Message Preview Component
 * Renders a pixel-perfect WhatsApp-style message preview.
 *
 * @param {object} props
 * @param {'template'|'text'|'image'|'video'|'document'|'audio'} props.type
 * @param {object} props.header - {type: 'text'|'image'|'video'|'document', text?, url?}
 * @param {string} props.body - Message body text with {{1}}, {{2}} placeholders
 * @param {string} props.footer - Footer text
 * @param {Array} props.buttons - [{type: 'QUICK_REPLY'|'URL'|'PHONE_NUMBER'|'COPY_CODE', text, url?, phone?}]
 * @param {object} props.variables - {1: 'value', 2: 'value'} to replace placeholders
 * @param {'outbound'|'inbound'} props.direction
 * @param {string} props.timestamp
 * @param {'sent'|'delivered'|'read'} props.status
 * @param {boolean} props.showPhoneFrame
 * @param {string} props.contactName
 */
export default function WhatsAppPreview({
  type = 'template',
  header,
  body = '',
  footer,
  buttons = [],
  variables = {},
  direction = 'outbound',
  timestamp,
  status = 'read',
  showPhoneFrame = true,
  contactName = 'WBIZ.IN',
}) {
  const time = timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const isOutbound = direction === 'outbound';

  // Replace variables in body text
  const renderBody = (text) => {
    if (!text) return null;
    const parts = text.split(/(\{\{\d+\}\})/g);
    return parts.map((part, i) => {
      const match = part.match(/\{\{(\d+)\}\}/);
      if (match) {
        const varKey = match[1];
        const value = variables[varKey];
        if (value) {
          return <span key={i} className="font-medium">{value}</span>;
        }
        return (
          <span key={i} className="bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded text-[13px] font-medium">
            {`{{${varKey}}}`}
          </span>
        );
      }
      // Handle newlines
      return part.split('\n').map((line, j) => (
        <span key={`${i}-${j}`}>
          {j > 0 && <br />}
          {line}
        </span>
      ));
    });
  };

  const StatusIcon = () => {
    if (!isOutbound) return null;
    if (status === 'read') return <CheckCheck className="w-[14px] h-[14px] text-[#53BDEB]" />;
    if (status === 'delivered') return <CheckCheck className="w-[14px] h-[14px] text-[#8696A0]" />;
    return <Check className="w-[14px] h-[14px] text-[#8696A0]" />;
  };

  const bubble = (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-3`}>
      <div
        className={`
          relative max-w-[85%] rounded-lg overflow-hidden
          ${isOutbound ? 'bg-[#DCF8C6]' : 'bg-white'}
          shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]
        `}
      >
        {/* Header */}
        {header && (
          <div>
            {header.type === 'image' && (
              <div className="bg-surface-200 aspect-[16/9] flex items-center justify-center">
                {header.url ? (
                  <img src={header.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-surface-400 text-sm">Image Header</div>
                )}
              </div>
            )}
            {header.type === 'video' && (
              <div className="bg-surface-800 aspect-video flex items-center justify-center relative">
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white fill-white" />
                </div>
              </div>
            )}
            {header.type === 'document' && (
              <div className="mx-2 mt-2 p-3 bg-[#d1f4cc] rounded-md flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-white/60 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111B21] truncate">
                    {header.filename || 'Document.pdf'}
                  </p>
                  <p className="text-[11px] text-[#667781]">PDF</p>
                </div>
              </div>
            )}
            {header.type === 'text' && header.text && (
              <p className="px-2.5 pt-2 text-[15px] font-bold text-[#111B21] leading-snug">
                {renderBody(header.text)}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        {body && (
          <p className="px-2.5 pt-1.5 pb-1 text-[14.5px] text-[#111B21] leading-[20px] whitespace-pre-wrap break-words">
            {renderBody(body)}
          </p>
        )}

        {/* Footer */}
        {footer && (
          <p className="px-2.5 pb-1 text-[12px] text-[#8696A0] leading-[16px]">
            {footer}
          </p>
        )}

        {/* Timestamp + Status */}
        <div className="flex items-center justify-end gap-1 px-2.5 pb-1.5 -mt-1">
          <span className="text-[11px] text-[#667781]">{time}</span>
          <StatusIcon />
        </div>
      </div>
    </div>
  );

  // Buttons (rendered outside the bubble, below it)
  const buttonSection = buttons.length > 0 && (
    <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-3 mt-0.5`}>
      <div className="max-w-[85%] w-full">
        {buttons.map((btn, i) => (
          <div
            key={i}
            className={`
              flex items-center justify-center gap-2 py-2 text-[14px] font-medium text-[#00A884]
              bg-white rounded-lg mt-0.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] cursor-default
            `}
          >
            {btn.type === 'URL' && <ExternalLink className="w-3.5 h-3.5" />}
            {btn.type === 'PHONE_NUMBER' && <PhoneIcon className="w-3.5 h-3.5" />}
            {btn.type === 'COPY_CODE' && <Copy className="w-3.5 h-3.5" />}
            {btn.text}
          </div>
        ))}
      </div>
    </div>
  );

  if (!showPhoneFrame) {
    return (
      <div className="wa-chat-bg rounded-xl p-4 min-h-[200px] flex flex-col justify-center gap-1">
        {bubble}
        {buttonSection}
      </div>
    );
  }

  // Phone frame version
  return (
    <div className="w-full max-w-[320px] mx-auto">
      <div className="bg-surface-900 rounded-[2rem] p-2 shadow-xl">
        <div className="bg-surface-900 rounded-[1.5rem] overflow-hidden">
          {/* Status Bar */}
          <div className="flex items-center justify-between px-6 py-1.5 bg-surface-900">
            <span className="text-[12px] text-white font-medium">9:41</span>
            <div className="flex items-center gap-1.5 text-white">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* WhatsApp Header */}
          <div className="bg-[#075E54] flex items-center gap-3 px-3 py-2.5">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <div className="w-8 h-8 rounded-full bg-[#DFE5E7] flex items-center justify-center">
              <svg className="w-5 h-5 text-[#CFD4D6]" viewBox="0 0 212 212" fill="currentColor">
                <path d="M106.251.5C164.653.5 212 47.846 212 106.25S164.653 212 106.25 212C47.846 212 .5 164.654.5 106.25S47.846.5 106.251.5z" fill="#DFE5E7" />
                <path d="M173.561 171.615a62.767 62.767 0 0 0-2.065-2.955 67.7 67.7 0 0 0-2.608-3.299 70.112 70.112 0 0 0-3.184-3.527 71.097 71.097 0 0 0-5.924-5.47 72.458 72.458 0 0 0-10.204-7.026 75.2 75.2 0 0 0-5.98-3.055c-.062-.028-.118-.059-.18-.087-9.792-4.44-22.106-7.529-37.416-7.529s-27.624 3.089-37.416 7.529c-.338.153-.653.318-.985.474a75.37 75.37 0 0 0-6.229 3.298 72.589 72.589 0 0 0-9.15 6.395 71.243 71.243 0 0 0-5.924 5.47 70.064 70.064 0 0 0-3.184 3.527 67.142 67.142 0 0 0-2.609 3.299 63.292 63.292 0 0 0-2.065 2.955 56.33 56.33 0 0 0-1.447 2.324c-.033.056-.073.119-.104.174a47.92 47.92 0 0 0-1.07 1.926c-.559 1.068-.818 1.678-.818 1.678v.398c18.285 17.927 43.322 28.985 70.945 28.985 27.623 0 52.661-11.058 70.945-28.985v-.398s-.259-.61-.818-1.678a49.004 49.004 0 0 0-1.07-1.926c-.031-.055-.071-.118-.104-.174a56.18 56.18 0 0 0-1.447-2.324zM106.002 125.5c2.645 0 5.212-.253 7.68-.737a38.272 38.272 0 0 0 3.624-.896 37.124 37.124 0 0 0 5.12-1.958 36.307 36.307 0 0 0 6.15-3.67 35.923 35.923 0 0 0 9.489-10.48 36.558 36.558 0 0 0 2.422-4.84 37.051 37.051 0 0 0 1.716-5.25c.299-1.208.542-2.443.725-3.701.275-1.887.417-3.827.417-5.811s-.142-3.925-.417-5.811a38.734 38.734 0 0 0-.725-3.701 37.05 37.05 0 0 0-1.716-5.25 36.558 36.558 0 0 0-2.422-4.84 35.923 35.923 0 0 0-9.489-10.48 36.347 36.347 0 0 0-6.15-3.67 37.124 37.124 0 0 0-5.12-1.958 38.272 38.272 0 0 0-3.624-.896 39.875 39.875 0 0 0-7.68-.737c-21.162 0-37.345 16.183-37.345 37.345 0 21.159 16.183 37.342 37.345 37.342z" fill="#CFD4D6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-medium text-white truncate">{contactName}</p>
              <p className="text-[12px] text-[#82c8bb]">online</p>
            </div>
          </div>

          {/* Chat Area */}
          <div className="wa-chat-bg min-h-[280px] py-4 flex flex-col justify-end gap-1">
            {/* Date Chip */}
            <div className="flex justify-center mb-3">
              <span className="text-[11px] text-[#667781] bg-white px-3 py-1 rounded-md shadow-sm font-medium">
                Today
              </span>
            </div>
            {bubble}
            {buttonSection}
          </div>

          {/* Input Bar */}
          <div className="bg-[#F0F2F5] flex items-center gap-2 px-2 py-1.5">
            <div className="flex-1 bg-white rounded-full flex items-center px-3 py-2">
              <span className="text-[14px] text-[#667781]">Type a message</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#00A884] flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

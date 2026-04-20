import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  UploadCloud,
  FileText,
  Download,
  Hash,
  Phone,
  Users,
  Mail,
  Tag,
  StickyNote,
  Loader2,
  X,
} from 'lucide-react';
import api from './api/axios';
import { COUNTRY_PHONE_OPTIONS, parsePhoneInput } from './utils/phone';

const IGNORE_OPTION = '__ignore__';

const IMPORT_FIELDS = [
  { key: 'phone', label: 'Phone Number', description: 'Required WhatsApp or mobile number', required: true, icon: Phone },
  { key: 'country_code', label: 'Country Code', description: 'Dial code such as 91, 1, 44', icon: Hash },
  { key: 'phone_number', label: 'Local Number', description: 'Phone number without country code', icon: Phone },
  { key: 'name', label: 'Name', description: 'Display name for the contact', icon: Users },
  { key: 'email', label: 'Email', description: 'Optional email address', icon: Mail },
  { key: 'labels', label: 'Tags', description: 'Comma, semicolon, or pipe separated tags', icon: Tag },
  { key: 'notes', label: 'Notes', description: 'Internal notes saved on the contact', icon: StickyNote },
];

const FIELD_ALIASES = {
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'number', 'whatsapp', 'whatsapp number', 'wa number', 'contact number'],
  country_code: ['country code', 'dial code', 'isd code', 'cc'],
  phone_number: ['phone number only', 'local number', 'national number', 'mobile number only'],
  name: ['name', 'full name', 'customer name', 'first name', 'display name'],
  email: ['email', 'email address', 'mail'],
  labels: ['labels', 'label', 'tags', 'tag', 'groups', 'category', 'categories', 'segment'],
  notes: ['notes', 'note', 'remarks', 'remark', 'comments', 'comment', 'description'],
};

const normalizeHeader = (value = '') =>
  String(value).trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');

const splitLabels = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  return String(value || '').split(/[;,|]/).map((item) => item.trim()).filter(Boolean);
};

const parseFileRows = async (file) => {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) throw new Error('No sheet found in the uploaded file');

  const sheet = workbook.Sheets[firstSheetName];
  const rows = utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
  if (!rows.length) throw new Error('The uploaded file is empty');

  const headerRow = rows[0] || [];
  const headers = headerRow.map((value, index) => {
    const label = String(value || '').trim();
    return label || `Column ${index + 1}`;
  });

  const dataRows = rows
    .slice(1)
    .map((row, rowIndex) => {
      const record = { __rowNumber: rowIndex + 2 };
      headers.forEach((header, index) => { record[header] = String(row?.[index] ?? '').trim(); });
      return record;
    })
    .filter((row) => headers.some((header) => String(row[header] || '').trim()));

  if (!dataRows.length) throw new Error('The uploaded file has headers but no contact rows');
  return { fileName: file.name, sheetName: firstSheetName, headers, rows: dataRows };
};

const guessMapping = (headers) => {
  const nextMapping = {};
  IMPORT_FIELDS.forEach((field) => {
    const match = headers.find((header) => FIELD_ALIASES[field.key]?.includes(normalizeHeader(header)));
    nextMapping[field.key] = match || IGNORE_OPTION;
  });
  return nextMapping;
};

const buildMappedRows = (rows, mapping, defaultCountryCode) =>
  rows.map((row) => ({
    ...parsePhoneInput({
      phone: mapping.phone !== IGNORE_OPTION ? String(row[mapping.phone] || '').trim() : '',
      country_code: mapping.country_code !== IGNORE_OPTION ? String(row[mapping.country_code] || '').trim() : '',
      phone_number: mapping.phone_number !== IGNORE_OPTION ? String(row[mapping.phone_number] || '').trim() : '',
      default_country_code: defaultCountryCode,
    }),
    row_number: row.__rowNumber,
    name: mapping.name !== IGNORE_OPTION ? String(row[mapping.name] || '').trim() : '',
    email: mapping.email !== IGNORE_OPTION ? String(row[mapping.email] || '').trim() : '',
    labels: mapping.labels !== IGNORE_OPTION ? splitLabels(row[mapping.labels]) : [],
    notes: mapping.notes !== IGNORE_OPTION ? String(row[mapping.notes] || '').trim() : '',
  }));

const buildPreviewRows = (mappedRows) => {
  const seen = new Set();
  return mappedRows.map((row) => {
    let issue = null;
    if (!row.phone) issue = row.error || 'Missing phone number';
    else if (!row.ok) issue = row.error || 'Invalid phone number';
    else if (seen.has(row.phone)) issue = 'Duplicate phone in file';
    else seen.add(row.phone);
    return { ...row, preview_status: issue ? 'warning' : 'ready', preview_issue: issue };
  });
};

const STEPS = [
  { key: 'upload', label: 'Upload', icon: UploadCloud },
  { key: 'mapping', label: 'Map Fields', icon: FileText },
  { key: 'review', label: 'Review', icon: CheckCircle2 },
  { key: 'result', label: 'Results', icon: FileSpreadsheet },
];

const getStepIndex = (step) => STEPS.findIndex(s => s.key === step);

/**
 * ContactImportWizard renders CONTENT ONLY — no modal wrapper.
 * The parent component provides the modal chrome.
 * Props: onComplete (called when done/close), defaultCountryCode
 */
export default function ContactImportWizard({ onComplete, defaultCountryCode = '91' }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState('upload');
  const [fileMeta, setFileMeta] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [defaultDialCode, setDefaultDialCode] = useState(defaultCountryCode || '91');
  const [bulkCountryCode, setBulkCountryCode] = useState(defaultCountryCode || '91');
  const [bulkCountryOverrides, setBulkCountryOverrides] = useState({});
  const [applyingBulkCountry, setApplyingBulkCountry] = useState(false);
  const [customFieldDefs, setCustomFieldDefs] = useState([]);
  const [customFieldMapping, setCustomFieldMapping] = useState({}); // { csvColumn: fieldDefId }

  useEffect(() => {
    api.get('/custom-fields').then(r => setCustomFieldDefs((r.data?.data?.fields || []).filter(f => f.is_active))).catch(() => {});
  }, []);

  const mappedRows = useMemo(() => buildMappedRows(rawRows, mapping, defaultDialCode), [rawRows, mapping, defaultDialCode]);
  const previewRows = useMemo(() => buildPreviewRows(mappedRows), [mappedRows]);

  const previewSummary = useMemo(() => {
    const ready = previewRows.filter((row) => row.preview_status === 'ready').length;
    return { total: previewRows.length, ready, warnings: previewRows.length - ready };
  }, [previewRows]);

  const stepIndex = getStepIndex(step);

  const handleFile = async (file) => {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseFileRows(file);
      const guessedMapping = guessMapping(parsed.headers);
      setFileMeta({ name: file.name, size: file.size, sheetName: parsed.sheetName });
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(guessedMapping);
      setImportReport(null);
      setStep('mapping');
      toast.success(`${parsed.rows.length} row(s) loaded from ${file.name}`);
    } catch (error) {
      toast.error(error.message || 'Failed to parse file');
    } finally { setParsing(false); }
  };

  const openPicker = () => fileInputRef.current?.click();

  const downloadSampleCsv = () => {
    const sample = [
      ['country_code', 'phone_number', 'name', 'email', 'labels', 'notes'],
      [defaultDialCode, '9876543210', 'Sample Contact', 'sample@example.com', 'vip,lead', 'Imported with country code'],
    ].map((row) => row.map((value) => `"${String(value || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts_sample.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleChangeFile = async (event) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    await handleFile(file);
  };

  const goToReview = () => {
    const hasCombinedPhone = mapping.phone && mapping.phone !== IGNORE_OPTION;
    const hasSplitPhone = mapping.country_code && mapping.country_code !== IGNORE_OPTION && mapping.phone_number && mapping.phone_number !== IGNORE_OPTION;
    if (!hasCombinedPhone && !hasSplitPhone) {
      toast.error('Map phone or both country code + local number columns before continuing');
      return;
    }
    setStep('review');
  };

  const importContacts = async () => {
    if (!previewRows.length) { toast.error('No rows to import'); return; }
    setImporting(true);
    try {
      // Build custom field info from customFieldMapping
      const activeCustomMappings = Object.entries(customFieldMapping).filter(([, val]) => val !== IGNORE_OPTION);
      const autoCreateColumns = activeCustomMappings.filter(([, val]) => val === '__auto_create__').map(([col]) => col);
      const existingFieldMappings = activeCustomMappings.filter(([, val]) => val !== '__auto_create__');

      // Build a lookup: fieldDefId -> field_name for existing custom fields
      const fieldDefLookup = {};
      customFieldDefs.forEach(fd => { fieldDefLookup[fd.id] = fd.field_name; });

      const contactsPayload = mappedRows.map(({ ok, error, ...row }) => {
        const custom_fields = {};
        // Map columns to existing custom field definitions
        existingFieldMappings.forEach(([col, fieldDefId]) => {
          const fieldName = fieldDefLookup[fieldDefId];
          if (fieldName) {
            const rawRow = rawRows.find(r => r.__rowNumber === row.row_number);
            custom_fields[fieldName] = String(rawRow?.[col] ?? '').trim();
          }
        });
        // Map auto-create columns (use column header as field name)
        autoCreateColumns.forEach(col => {
          const rawRow = rawRows.find(r => r.__rowNumber === row.row_number);
          custom_fields[col] = String(rawRow?.[col] ?? '').trim();
        });
        return Object.keys(custom_fields).length > 0 ? { ...row, custom_fields } : row;
      });

      const payload = { contacts: contactsPayload };
      if (autoCreateColumns.length > 0) {
        payload.auto_create_fields = true;
        payload.unmapped_columns = autoCreateColumns;
      }

      const { data } = await api.post('/contacts/import', payload);
      setImportReport(data.data);
      setBulkCountryCode(defaultDialCode || defaultCountryCode || '91');
      setBulkCountryOverrides({});
      setStep('result');
      toast.success(`Imported ${data.data.imported} contact(s)`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  };

  const importedPhones = useMemo(
    () => (importReport?.results || [])
      .filter((row) => ['created', 'updated'].includes(String(row.status || '').toLowerCase()) && row.phone)
      .map((row) => String(row.phone || '').replace(/[^\d]/g, '')),
    [importReport]
  );

  const needsCountryFix = useMemo(() => {
    const normalizedDefault = String(bulkCountryCode || '').replace(/[^\d]/g, '');
    if (!normalizedDefault || !importedPhones.length) return false;
    return importedPhones.some((phone) => !String(phone || '').startsWith(normalizedDefault));
  }, [importedPhones, bulkCountryCode]);

  const applyBulkCountryFix = async () => {
    if (!importedPhones.length) { toast.error('No imported phones available for country code update'); return; }
    setApplyingBulkCountry(true);
    try {
      const { data } = await api.post('/contacts/maintenance/bulk-country-code', {
        phones: importedPhones,
        default_country_code: bulkCountryCode,
        overrides: bulkCountryOverrides,
      });
      const report = data?.data || {};
      toast.success(`Country code update done. Updated ${report.updated || 0}, skipped ${report.skipped || 0}.`);
      onComplete?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to apply bulk country code');
    } finally { setApplyingBulkCountry(false); }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* ── Step Indicator ── */}
      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((s, idx) => {
          const active = idx === stepIndex;
          const completed = idx < stepIndex;
          const StepIcon = s.icon;
          return (
            <div key={s.key} className={`rounded-xl border p-3 transition-all ${active ? 'border-brand-300 bg-brand-50/60' : completed ? 'border-emerald-200 bg-emerald-50/40' : 'border-surface-100 bg-surface-50/50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${active ? 'bg-brand-600 text-white' : completed ? 'bg-emerald-500 text-white' : 'bg-surface-200 text-surface-400'}`}>
                  {completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-brand-700' : completed ? 'text-emerald-600' : 'text-surface-400'}`}>Step {idx + 1}</span>
              </div>
              <p className={`text-[12px] font-semibold ${active || completed ? 'text-surface-900' : 'text-surface-400'}`}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={handleChangeFile} />

      {/* ════════════ STEP 1: UPLOAD ════════════ */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={async (e) => { e.preventDefault(); setDragActive(false); await handleFile(e.dataTransfer.files?.[0]); }}
          className={`rounded-xl border-2 border-dashed p-8 text-center transition-all ${dragActive ? 'border-brand-400 bg-brand-50/40' : 'border-surface-200 bg-surface-50/50'}`}
        >
          <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-white border border-surface-200 flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="w-7 h-7 text-brand-600" />
          </div>
          <h3 className="text-[16px] font-bold text-surface-900">Upload CSV or Excel file</h3>
          <p className="text-[12px] text-surface-400 mt-1.5 max-w-md mx-auto">
            Drop a <code className="bg-white border border-surface-200 px-1.5 py-0.5 rounded text-[11px] font-mono">csv</code> or <code className="bg-white border border-surface-200 px-1.5 py-0.5 rounded text-[11px] font-mono">xlsx</code> file here, or click to browse. We'll let you map columns before importing.
          </p>
          <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button onClick={openPicker} disabled={parsing} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50">
              {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {parsing ? 'Reading file...' : 'Choose File'}
            </button>
            <button onClick={downloadSampleCsv} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-200 bg-white text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
              <Download className="w-3.5 h-3.5" /> Sample CSV
            </button>
          </div>
          <div className="mt-4 rounded-lg bg-white border border-surface-100 px-4 py-2.5 inline-block">
            <p className="text-[11px] text-surface-400">Supported columns: <span className="font-semibold text-surface-600">phone</span> or <span className="font-semibold text-surface-600">country_code + phone_number</span>, name, email, tags, notes</p>
          </div>
        </div>
      )}

      {/* ════════════ STEP 2: MAPPING ════════════ */}
      {step === 'mapping' && (
        <div className="space-y-4">
          {/* File info bar */}
          <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <FileSpreadsheet className="w-[18px] h-[18px] text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-surface-900">{fileMeta?.name}</p>
                <p className="text-[11px] text-surface-400">{rawRows.length} row(s) from sheet "{fileMeta?.sheetName}" {fileMeta?.size ? `· ${formatFileSize(fileMeta.size)}` : ''}</p>
              </div>
            </div>
            <button onClick={openPicker} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-surface-200 bg-white text-[11px] font-semibold text-surface-600 hover:bg-surface-50 transition-all">
              <RefreshCw className="w-3 h-3" /> Change File
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: Field Mapping */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-100">
                <h3 className="text-[14px] font-bold text-surface-900">Column Mapping</h3>
                <p className="text-[11px] text-surface-400 mt-0.5">Map your file columns to contact fields</p>
              </div>
              <div className="p-4 space-y-3">
                {/* Default country code */}
                <div className="rounded-lg bg-surface-50 border border-surface-100 p-3">
                  <label className="text-[10px] font-bold text-surface-500 uppercase tracking-wider mb-1.5 block">Default Country Code</label>
                  <select value={defaultDialCode} onChange={(e) => setDefaultDialCode(e.target.value)} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none">
                    {COUNTRY_PHONE_OPTIONS.map((o) => <option key={`${o.iso2}-${o.dialCode}`} value={o.dialCode}>{o.country} (+{o.dialCode})</option>)}
                  </select>
                </div>

                {/* Field selectors */}
                {IMPORT_FIELDS.map((field) => {
                  const FieldIcon = field.icon;
                  return (
                    <div key={field.key} className="rounded-lg bg-surface-50 border border-surface-100 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FieldIcon className="w-3 h-3 text-surface-500" />
                        <span className="text-[11px] font-bold text-surface-700">{field.label}</span>
                        {field.required && <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">Required</span>}
                      </div>
                      <p className="text-[10px] text-surface-400 mb-2">{field.description}</p>
                      <select
                        value={mapping[field.key] || IGNORE_OPTION}
                        onChange={(e) => setMapping((c) => ({ ...c, [field.key]: e.target.value }))}
                        className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                      >
                        <option value={IGNORE_OPTION}>— Do not import —</option>
                        {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  );
                })}

                {/* Custom Fields Mapping */}
                {(() => {
                  const standardMappedCols = new Set(Object.values(mapping).filter(v => v !== IGNORE_OPTION));
                  const unmappedColumns = headers.filter(h => !standardMappedCols.has(h));
                  if (!unmappedColumns.length) return null;
                  return (
                    <div className="rounded-lg bg-violet-50/60 border border-violet-200 p-3 mt-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Tag className="w-3 h-3 text-violet-500" />
                        <span className="text-[11px] font-bold text-violet-700">Custom Fields</span>
                      </div>
                      <p className="text-[10px] text-violet-500 mb-3">Map remaining columns to custom fields or auto-create new ones</p>
                      <div className="space-y-2">
                        {unmappedColumns.map((col) => (
                          <div key={col} className="rounded-md bg-white border border-violet-100 p-2">
                            <p className="text-[10px] font-semibold text-surface-600 mb-1">{col}</p>
                            <select
                              value={customFieldMapping[col] || IGNORE_OPTION}
                              onChange={(e) => setCustomFieldMapping((prev) => ({ ...prev, [col]: e.target.value }))}
                              className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-[12px] font-medium text-surface-700 focus:ring-2 focus:ring-violet-500/20 focus:outline-none"
                            >
                              <option value={IGNORE_OPTION}>{'\u2014'} Skip {'\u2014'}</option>
                              {customFieldDefs.map((fd) => (
                                <option key={fd.id} value={fd.id}>{fd.field_name}</option>
                              ))}
                              <option value="__auto_create__">{'\u2795'} Create new field</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Right: File Preview */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-surface-100">
                  <h3 className="text-[14px] font-bold text-surface-900">File Preview</h3>
                  <p className="text-[11px] text-surface-400 mt-0.5">First rows from your upload</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-surface-100 bg-surface-50/60">
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Row</th>
                        {headers.map((h) => <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {rawRows.slice(0, 6).map((row) => (
                        <tr key={row.__rowNumber} className="hover:bg-surface-50/60 transition-colors">
                          <td className="px-4 py-2 text-[11px] font-semibold text-surface-500">{row.__rowNumber}</td>
                          {headers.map((h) => <td key={`${row.__rowNumber}-${h}`} className="px-4 py-2 text-[11px] text-surface-700 max-w-[140px] truncate">{row[h] || '—'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Normalized phone preview */}
              <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50/60">
                  <h3 className="text-[13px] font-bold text-emerald-800">Normalized Phone Preview</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-surface-100 bg-surface-50/60">
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Row</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Input</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Country</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Local</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Final</th>
                        <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {mappedRows.slice(0, 6).map((row) => {
                        const rawInput = mapping.phone !== IGNORE_OPTION
                          ? String(rawRows.find((r) => r.__rowNumber === row.row_number)?.[mapping.phone] || '')
                          : `${String(rawRows.find((r) => r.__rowNumber === row.row_number)?.[mapping.country_code] || '')} ${String(rawRows.find((r) => r.__rowNumber === row.row_number)?.[mapping.phone_number] || '')}`.trim();
                        return (
                          <tr key={`mp-${row.row_number}`} className="hover:bg-surface-50/60 transition-colors">
                            <td className="px-4 py-2 text-[11px] font-semibold text-surface-500">{row.row_number}</td>
                            <td className="px-4 py-2 text-[11px] text-surface-700">{rawInput || '—'}</td>
                            <td className="px-4 py-2 text-[11px] text-surface-700">{row.country_code ? `+${row.country_code}` : '—'}</td>
                            <td className="px-4 py-2 text-[11px] text-surface-700">{row.phone_number || '—'}</td>
                            <td className="px-4 py-2 text-[11px] font-semibold text-surface-900">{row.phone || '—'}</td>
                            <td className="px-4 py-2">
                              {row.ok
                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600"><CheckCircle2 className="w-3 h-3" /> OK</span>
                                : <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600"><AlertTriangle className="w-3 h-3" /> {row.error || 'Review'}</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-100">
            <button onClick={() => setStep('upload')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-surface-600 hover:bg-surface-100 transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button onClick={goToReview} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
              Review Import <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════ STEP 3: REVIEW ════════════ */}
      {step === 'review' && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-surface-200 p-4">
              <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Rows Found</p>
              <p className="text-[22px] font-extrabold text-surface-900 mt-1">{previewSummary.total}</p>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-4">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ready</p>
              <p className="text-[22px] font-extrabold text-emerald-700 mt-1">{previewSummary.ready}</p>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-4">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Warnings</p>
              <p className="text-[22px] font-extrabold text-amber-700 mt-1">{previewSummary.warnings}</p>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-100">
              <h3 className="text-[14px] font-bold text-surface-900">Mapped Preview</h3>
              <p className="text-[11px] text-surface-400 mt-0.5">Check how rows will be imported</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-surface-100 bg-surface-50/60">
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Row</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Phone</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Name</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Email</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Tags</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Issue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {previewRows.slice(0, 12).map((row) => (
                    <tr key={row.row_number} className="hover:bg-surface-50/60 transition-colors">
                      <td className="px-4 py-2">
                        {row.preview_status === 'ready'
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ready</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Warning</span>}
                      </td>
                      <td className="px-4 py-2 text-[11px] font-semibold text-surface-500">{row.row_number}</td>
                      <td className="px-4 py-2 text-[11px] font-medium text-surface-900">{row.phone || '—'}</td>
                      <td className="px-4 py-2 text-[11px] text-surface-700">{row.name || '—'}</td>
                      <td className="px-4 py-2 text-[11px] text-surface-500">{row.email || '—'}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          {row.labels.slice(0, 2).map(l => <span key={l} className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full">{l}</span>)}
                          {row.labels.length > 2 && <span className="text-[9px] text-surface-400">+{row.labels.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-[11px] text-amber-600">{row.preview_issue || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length > 12 && <p className="px-5 py-2.5 text-[11px] text-surface-400 border-t border-surface-100">Showing first 12 of {previewRows.length} rows. All rows will be imported.</p>}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-100">
            <button onClick={() => setStep('mapping')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-surface-600 hover:bg-surface-100 transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Mapping
            </button>
            <button onClick={importContacts} disabled={importing} className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {importing ? 'Importing...' : `Import ${previewSummary.ready} Contact(s)`}
            </button>
          </div>
        </div>
      )}

      {/* ════════════ STEP 4: RESULTS ════════════ */}
      {step === 'result' && (
        <div className="space-y-4">
          {/* Result KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Processed', value: importReport?.processed || 0, color: 'text-surface-600', bg: 'bg-surface-50', border: 'border-surface-200' },
              { label: 'Created', value: importReport?.created || 0, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
              { label: 'Updated', value: importReport?.updated || 0, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
              { label: 'Skipped', value: importReport?.skipped || 0, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border ${k.border} ${k.bg} p-4`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${k.color}`}>{k.label}</p>
                <p className={`text-[22px] font-extrabold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Auto-created custom fields notice */}
          {importReport?.auto_created_fields?.length > 0 && (
            <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Tag className="w-4 h-4 text-violet-600" />
                <span className="text-[12px] font-bold text-violet-800">Custom Fields Created</span>
              </div>
              <p className="text-[11px] text-violet-700">
                {importReport.auto_created_fields.length} new custom field{importReport.auto_created_fields.length !== 1 ? 's were' : ' was'} auto-created:{' '}
                <span className="font-semibold">{importReport.auto_created_fields.join(', ')}</span>
              </p>
            </div>
          )}

          {/* Country code fix */}
          {needsCountryFix && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span className="text-[12px] font-bold text-blue-800">Country Code Fix</span>
              </div>
              <p className="text-[11px] text-blue-700 mb-3">If your source file mixed phone formats, bulk-apply a default code and optionally override specific contacts.</p>
              <div className="grid gap-3 md:grid-cols-[200px,1fr]">
                <div>
                  <label className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1 block">Default Code</label>
                  <select value={bulkCountryCode} onChange={(e) => setBulkCountryCode(e.target.value)} className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-[12px] text-surface-700 focus:ring-2 focus:ring-blue-500/20 focus:outline-none">
                    {COUNTRY_PHONE_OPTIONS.map((o) => <option key={`bulk-${o.iso2}-${o.dialCode}`} value={o.dialCode}>+{o.dialCode} ({o.country})</option>)}
                  </select>
                </div>
                <div className="max-h-28 overflow-y-auto rounded-lg border border-blue-100 bg-white p-2 space-y-1.5">
                  {importedPhones.slice(0, 20).map((phone) => (
                    <div key={`bulk-${phone}`} className="grid grid-cols-[1fr,130px] gap-2 items-center">
                      <p className="text-[11px] text-surface-700 truncate">{phone}</p>
                      <select value={bulkCountryOverrides[phone] || ''} onChange={(e) => setBulkCountryOverrides((c) => ({ ...c, [phone]: e.target.value }))} className="rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-[11px] focus:outline-none">
                        <option value="">Use default</option>
                        {COUNTRY_PHONE_OPTIONS.map((o) => <option key={`ov-${phone}-${o.iso2}`} value={o.dialCode}>+{o.dialCode}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={applyBulkCountryFix} disabled={applyingBulkCountry} className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[12px] font-semibold rounded-lg transition-colors">
                {applyingBulkCountry ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {applyingBulkCountry ? 'Applying...' : 'Apply Country Code Update'}
              </button>
            </div>
          )}

          {/* Results table */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-surface-100">
              <h3 className="text-[14px] font-bold text-surface-900">Import Results</h3>
              <p className="text-[11px] text-surface-400 mt-0.5">Row-by-row outcome</p>
            </div>
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full min-w-[500px]">
                <thead className="sticky top-0">
                  <tr className="border-b border-surface-100 bg-surface-50/60">
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Status</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Row</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Phone</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Name</th>
                    <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-surface-400">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100">
                  {(importReport?.results || []).map((result) => {
                    const isSkipped = result.status === 'skipped';
                    const isUpdated = result.status === 'updated';
                    return (
                      <tr key={`${result.row_number}-${result.phone}-${result.status}`} className="hover:bg-surface-50/60 transition-colors">
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isSkipped ? 'bg-amber-50 text-amber-700 border-amber-200' : isUpdated ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isSkipped ? 'bg-amber-500' : isUpdated ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            {result.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[11px] font-semibold text-surface-500">{result.row_number}</td>
                        <td className="px-4 py-2 text-[11px] font-medium text-surface-900">{result.phone || '—'}</td>
                        <td className="px-4 py-2 text-[11px] text-surface-700">{result.name || '—'}</td>
                        <td className="px-4 py-2 text-[11px] text-surface-500">{result.reason || 'Imported successfully'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-surface-100">
            <button onClick={() => { setStep('upload'); setFileMeta(null); setHeaders([]); setRawRows([]); setMapping({}); setCustomFieldMapping({}); setImportReport(null); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-surface-600 hover:bg-surface-100 transition-all">
              <ArrowLeft className="w-3.5 h-3.5" /> Import Another File
            </button>
            <button onClick={() => onComplete?.()} className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors">
              <CheckCircle2 className="w-4 h-4" /> Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

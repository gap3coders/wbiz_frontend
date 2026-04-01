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
} from 'lucide-react';
import api from './api/axios';
import PortalModal from './components/Portal/PortalModal';

const IGNORE_OPTION = '__ignore__';

const IMPORT_FIELDS = [
  { key: 'phone', label: 'Phone Number', description: 'Required WhatsApp or mobile number', required: true },
  { key: 'name', label: 'Name', description: 'Display name for the contact' },
  { key: 'email', label: 'Email', description: 'Optional email address' },
  { key: 'labels', label: 'Tags', description: 'Comma, semicolon, or pipe separated tags' },
  { key: 'notes', label: 'Notes', description: 'Internal notes saved on the contact' },
];

const FIELD_ALIASES = {
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'number', 'whatsapp', 'whatsapp number', 'wa number', 'contact number'],
  name: ['name', 'full name', 'customer name', 'first name', 'display name'],
  email: ['email', 'email address', 'mail'],
  labels: ['labels', 'label', 'tags', 'tag', 'groups', 'category', 'categories', 'segment'],
  notes: ['notes', 'note', 'remarks', 'remark', 'comments', 'comment', 'description'],
};

const normalizeHeader = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const normalizePhone = (value = '') => String(value || '').replace(/[^\d]/g, '');

const splitLabels = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  return String(value || '')
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseFileRows = async (file) => {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames?.[0];

  if (!firstSheetName) {
    throw new Error('No sheet found in the uploaded file');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });

  if (!rows.length) {
    throw new Error('The uploaded file is empty');
  }

  const headerRow = rows[0] || [];
  const headers = headerRow.map((value, index) => {
    const label = String(value || '').trim();
    return label || `Column ${index + 1}`;
  });

  const dataRows = rows
    .slice(1)
    .map((row, rowIndex) => {
      const record = { __rowNumber: rowIndex + 2 };
      headers.forEach((header, index) => {
        record[header] = String(row?.[index] ?? '').trim();
      });
      return record;
    })
    .filter((row) => headers.some((header) => String(row[header] || '').trim()));

  if (!dataRows.length) {
    throw new Error('The uploaded file has headers but no contact rows');
  }

  return {
    fileName: file.name,
    sheetName: firstSheetName,
    headers,
    rows: dataRows,
  };
};

const guessMapping = (headers) => {
  const nextMapping = {};
  IMPORT_FIELDS.forEach((field) => {
    const match = headers.find((header) => FIELD_ALIASES[field.key]?.includes(normalizeHeader(header)));
    nextMapping[field.key] = match || IGNORE_OPTION;
  });
  return nextMapping;
};

const buildMappedRows = (rows, mapping) =>
  rows.map((row) => ({
    row_number: row.__rowNumber,
    phone: mapping.phone !== IGNORE_OPTION ? normalizePhone(row[mapping.phone]) : '',
    name: mapping.name !== IGNORE_OPTION ? String(row[mapping.name] || '').trim() : '',
    email: mapping.email !== IGNORE_OPTION ? String(row[mapping.email] || '').trim() : '',
    labels: mapping.labels !== IGNORE_OPTION ? splitLabels(row[mapping.labels]) : [],
    notes: mapping.notes !== IGNORE_OPTION ? String(row[mapping.notes] || '').trim() : '',
  }));

const buildPreviewRows = (mappedRows) => {
  const seen = new Set();
  return mappedRows.map((row) => {
    let issue = null;
    if (!row.phone) issue = 'Missing phone number';
    else if (seen.has(row.phone)) issue = 'Duplicate phone in file';
    else seen.add(row.phone);

    return {
      ...row,
      preview_status: issue ? 'warning' : 'ready',
      preview_issue: issue,
    };
  });
};

const getStepIndex = (step) => ['upload', 'mapping', 'review', 'result'].indexOf(step);

export default function ContactImportWizard({ open, onClose, onImported }) {
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

  useEffect(() => {
    if (open) return;
    setStep('upload');
    setFileMeta(null);
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setParsing(false);
    setImporting(false);
    setDragActive(false);
    setImportReport(null);
  }, [open]);

  const mappedRows = useMemo(() => buildMappedRows(rawRows, mapping), [rawRows, mapping]);
  const previewRows = useMemo(() => buildPreviewRows(mappedRows), [mappedRows]);

  const previewSummary = useMemo(() => {
    const ready = previewRows.filter((row) => row.preview_status === 'ready').length;
    const warnings = previewRows.length - ready;
    return {
      total: previewRows.length,
      ready,
      warnings,
    };
  }, [previewRows]);

  const handleFile = async (file) => {
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseFileRows(file);
      const guessedMapping = guessMapping(parsed.headers);
      setFileMeta({
        name: file.name,
        size: file.size,
        sheetName: parsed.sheetName,
      });
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setMapping(guessedMapping);
      setImportReport(null);
      setStep('mapping');
      toast.success(`${parsed.rows.length} row(s) loaded from ${file.name}`);
    } catch (error) {
      toast.error(error.message || 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  };

  const openPicker = () => fileInputRef.current?.click();

  const handleChangeFile = async (event) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = '';
    await handleFile(file);
  };

  const goToReview = () => {
    if (!mapping.phone || mapping.phone === IGNORE_OPTION) {
      toast.error('Map a phone number column before continuing');
      return;
    }
    setStep('review');
  };

  const importContacts = async () => {
    if (!previewRows.length) {
      toast.error('No rows to import');
      return;
    }

    setImporting(true);
    try {
      const { data } = await api.post('/contacts/import', {
        contacts: mappedRows,
      });
      setImportReport(data.data);
      setStep('result');
      onImported?.();
      toast.success(`Imported ${data.data.imported} contact(s)`);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const stepIndex = getStepIndex(step);

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      title="Import Contacts"
      subtitle="Upload CSV or XLSX, map your file columns, review the rows, and import with a full result summary."
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {['Upload', 'Map Fields', 'Review', 'Results'].map((label, index) => {
            const active = index === stepIndex;
            const completed = index < stepIndex;
            return (
              <div
                key={label}
                className={`rounded-2xl border px-4 py-3 ${
                  active
                    ? 'border-emerald-200 bg-emerald-50'
                    : completed
                      ? 'border-emerald-100 bg-white'
                      : 'border-gray-100 bg-gray-50'
                }`}
              >
                <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${active || completed ? 'text-emerald-600' : 'text-gray-400'}`}>
                  Step {index + 1}
                </p>
                <p className={`mt-1 text-sm font-semibold ${active || completed ? 'text-gray-900' : 'text-gray-500'}`}>{label}</p>
              </div>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={handleChangeFile}
        />
        {step === 'upload' ? (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={async (event) => {
              event.preventDefault();
              setDragActive(false);
              await handleFile(event.dataTransfer.files?.[0]);
            }}
            className={`rounded-[32px] border-2 border-dashed px-6 py-10 text-center transition-all ${
              dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-[#f8fbfa]'
            }`}
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-600 shadow-sm">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Upload CSV or Excel file</h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
              Drop a <code className="rounded bg-white px-1.5 py-0.5 text-xs">.csv</code> or{' '}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">.xlsx</code> file here. We will let you map
              the columns before anything is imported.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openPicker}
                disabled={parsing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {parsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {parsing ? 'Reading file...' : 'Choose file'}
              </button>
              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-500">
                Supported columns: phone, name, email, tags, notes
              </div>
            </div>
          </div>
        ) : null}

        {step === 'mapping' ? (
          <div className="grid gap-6 xl:grid-cols-[1fr,1.2fr]">
            <div className="rounded-[28px] border border-gray-100 bg-white p-5">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Uploaded File</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">{fileMeta?.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{rawRows.length} data row(s) from sheet {fileMeta?.sheetName}</p>
              </div>

              <div className="space-y-4">
                {IMPORT_FIELDS.map((field) => (
                  <div key={field.key} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{field.label}</p>
                      {field.required ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-600">Required</span> : null}
                    </div>
                    <p className="mb-3 text-xs text-gray-500">{field.description}</p>
                    <select
                      value={mapping[field.key] || IGNORE_OPTION}
                      onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700"
                    >
                      <option value={IGNORE_OPTION}>Do not import this field</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex justify-between gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={goToReview}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Review Import
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">File Preview</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">First rows from your upload</h3>
                </div>
                <button
                  type="button"
                  onClick={openPicker}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Change File
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[42rem]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Row</th>
                        {headers.map((header) => (
                          <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawRows.slice(0, 8).map((row) => (
                        <tr key={row.__rowNumber} className="border-t border-gray-100">
                          <td className="px-4 py-3 text-sm font-semibold text-gray-500">{row.__rowNumber}</td>
                          {headers.map((header) => (
                            <td key={`${row.__rowNumber}-${header}`} className="max-w-[12rem] truncate px-4 py-3 text-sm text-gray-700">
                              {row[header] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'review' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Rows Found</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{previewSummary.total}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Ready to Import</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700">{previewSummary.ready}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Need Review</p>
                <p className="mt-2 text-3xl font-semibold text-amber-700">{previewSummary.warnings}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Mapped Preview</p>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">Check how rows will be imported</h3>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Row</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Tags</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 12).map((row) => (
                        <tr key={row.row_number} className="border-t border-gray-100">
                          <td className="px-4 py-3">
                            {row.preview_status === 'ready' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Warning
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-500">{row.row_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{row.phone || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-800">{row.name || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{row.email || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{row.labels.join(', ') || '—'}</td>
                          <td className="px-4 py-3 text-sm text-amber-700">{row.preview_issue || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {previewRows.length > 12 ? (
                <p className="mt-3 text-xs text-gray-400">Showing first 12 rows. The full file will be imported.</p>
              ) : null}
            </div>

            <div className="flex justify-between gap-3 border-t border-gray-100 pt-1">
              <button
                type="button"
                onClick={() => setStep('mapping')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Mapping
              </button>
              <button
                type="button"
                onClick={importContacts}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {importing ? 'Importing...' : 'Import Contacts'}
              </button>
            </div>
          </div>
        ) : null}
        {step === 'result' ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Processed</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">{importReport?.processed || 0}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Created</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-700">{importReport?.created || 0}</p>
              </div>
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Updated</p>
                <p className="mt-2 text-3xl font-semibold text-sky-700">{importReport?.updated || 0}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Skipped</p>
                <p className="mt-2 text-3xl font-semibold text-amber-700">{importReport?.skipped || 0}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-100 bg-white p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Import Results</p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">Row-by-row outcome</h3>
              </div>
              <div className="overflow-hidden rounded-2xl border border-gray-100">
                <div className="max-h-[22rem] overflow-auto">
                  <table className="w-full min-w-[48rem]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Row</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(importReport?.results || []).map((result) => {
                        const isSkipped = result.status === 'skipped';
                        const isUpdated = result.status === 'updated';
                        return (
                          <tr key={`${result.row_number}-${result.phone}-${result.status}`} className="border-t border-gray-100">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                isSkipped
                                  ? 'bg-amber-50 text-amber-700'
                                  : isUpdated
                                    ? 'bg-sky-50 text-sky-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {isSkipped ? <AlertTriangle className="h-3.5 w-3.5" /> : isUpdated ? <RefreshCw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {result.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-500">{result.row_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{result.phone || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{result.name || '—'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{result.reason || 'Imported successfully'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 border-t border-gray-100 pt-1">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Import Another File
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
              >
                <CheckCircle2 className="h-4 w-4" />
                Done
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PortalModal>
  );
}

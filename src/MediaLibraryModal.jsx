import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Search,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from './api/axios';
import { detectMediaAssetType, fileToDataUrl, formatFileSize, MEDIA_LIBRARY_TYPES } from './mediaLibraryHelpers';

/* ── helpers ── */
const FILTER_META = {
  all: { label: 'All', icon: UploadCloud },
  image: { label: 'Images', icon: ImageIcon },
  video: { label: 'Videos', icon: Video },
  document: { label: 'Files', icon: FileText },
  audio: { label: 'Audio', icon: Mic },
};

const emptyCounts = { image: 0, video: 0, document: 0, audio: 0 };
const PAGE_SIZE = 18;

const defaultFilterForTypes = (allowedTypes = []) =>
  Array.isArray(allowedTypes) && allowedTypes.length === 1 ? allowedTypes[0] : 'all';

const devError = (...args) => {
  if (import.meta.env.DEV) console.error(...args);
};

/* ── Component ── */
export default function MediaLibraryModal({
  open,
  onClose,
  title = 'Media Library',
  subtitle,
  allowedTypes = MEDIA_LIBRARY_TYPES,
  mediaType,              // shorthand: if set, restricts to single type
  allowMultiple = true,
  onSelect,
  selectedAssets: externalSelected,
  queuedFiles = [],
  onQueuedFilesHandled,
  confirmLabel = 'Attach',
  helperText = 'Select media to attach',
  hideConfirm = false,
}) {
  /* Normalize allowedTypes from mediaType shorthand */
  const effectiveAllowedTypes = useMemo(() => {
    if (mediaType && MEDIA_LIBRARY_TYPES.includes(mediaType)) return [mediaType];
    return allowedTypes;
  }, [mediaType, allowedTypes]);

  const allowedTypesKey = [...effectiveAllowedTypes].sort().join('|');

  const fileInputRef = useRef(null);
  const requestRef = useRef(0);
  const dropRef = useRef(null);

  const [assets, setAssets] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(defaultFilterForTypes(effectiveAllowedTypes));
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedAssetMap, setSelectedAssetMap] = useState({});
  const [uploading, setUploading] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  /* ── Fetch ── */
  const fetchAssets = async (page = pagination.page) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const restrictedTypes =
        effectiveAllowedTypes.length < MEDIA_LIBRARY_TYPES.length
          ? effectiveAllowedTypes.join(',')
          : undefined;

      const { data } = await api.get('/media/assets', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          asset_type: filter !== 'all' ? filter : undefined,
          asset_types: filter === 'all' ? restrictedTypes : undefined,
        },
      });

      if (requestRef.current !== requestId) return;
      setAssets(data?.data?.assets || []);
      setCounts({ ...emptyCounts, ...(data?.data?.counts || {}) });
      setPagination(data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
    } catch (error) {
      if (requestRef.current !== requestId) return;
      devError('[Media Library] Failed to load assets', error?.response?.data || error);
      toast.error('Failed to load media library');
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  };

  /* ── Effects ── */
  useEffect(() => {
    if (!open) return;
    setFilter(defaultFilterForTypes(effectiveAllowedTypes));
    setSearch('');
    setSelectedIds([]);
    setSelectedAssetMap({});
    setPagination((c) => ({ ...c, page: 1 }));
  }, [allowedTypesKey, open]);

  useEffect(() => {
    if (!open) return;
    setPagination((c) => (c.page === 1 ? c : { ...c, page: 1 }));
  }, [filter, search, open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => fetchAssets(pagination.page), 200);
    return () => window.clearTimeout(t);
  }, [allowedTypesKey, filter, open, pagination.page, search]);

  useEffect(() => {
    setSelectedAssetMap((cur) => {
      const next = { ...cur };
      assets.forEach((a) => {
        if (selectedIds.includes(a._id)) next[a._id] = a;
      });
      return next;
    });
  }, [assets, selectedIds]);

  useEffect(() => {
    if (!open || !queuedFiles.length) return;
    uploadFiles(Array.from(queuedFiles));
    onQueuedFilesHandled?.();
  }, [open, queuedFiles]);

  /* ── Selection ── */
  const toggleSelection = (asset) => {
    setSelectedIds((cur) => {
      const exists = cur.includes(asset._id);
      if (exists) return cur.filter((id) => id !== asset._id);
      if (!allowMultiple) return [asset._id];
      return [...cur, asset._id];
    });
    setSelectedAssetMap((cur) => {
      const next = allowMultiple ? { ...cur } : {};
      if (cur[asset._id]) {
        delete next[asset._id];
        return next;
      }
      next[asset._id] = asset;
      return next;
    });
  };

  /* ── Upload ── */
  const uploadFiles = async (files) => {
    const accepted = files.filter((f) => {
      const type = detectMediaAssetType(f);
      return !effectiveAllowedTypes?.length || effectiveAllowedTypes.includes(type);
    });
    if (!accepted.length) {
      toast.error('No compatible files for this picker');
      return;
    }

    for (const file of accepted) {
      const tempId = `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      setUploading((c) => [...c, { id: tempId, name: file.name, progress: 0, status: 'uploading' }]);

      try {
        const dataUrl = await fileToDataUrl(file);
        const { data } = await api.post('/media/assets/upload', {
          data_url: dataUrl,
          original_name: file.name,
          mime_type: file.type,
        }, {
          onUploadProgress: (e) => {
            if (!e.total) return;
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploading((c) => c.map((i) => (i.id === tempId ? { ...i, progress: pct } : i)));
          },
        });

        const nextAsset = data?.data?.asset;
        if (nextAsset) {
          setSelectedIds((c) => allowMultiple ? Array.from(new Set([...c, nextAsset._id])) : [nextAsset._id]);
          setSelectedAssetMap((c) => allowMultiple ? { ...c, [nextAsset._id]: nextAsset } : { [nextAsset._id]: nextAsset });
        }
        setUploading((c) => c.map((i) => (i.id === tempId ? { ...i, progress: 100, status: 'done' } : i)));
      } catch (error) {
        devError('[Media Library] Upload failed', error?.response?.data || error);
        setUploading((c) => c.map((i) => (i.id === tempId ? { ...i, status: 'failed' } : i)));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    window.setTimeout(() => setUploading((c) => c.filter((i) => i.status === 'uploading')), 1200);
    setPagination((c) => (c.page === 1 ? c : { ...c, page: 1 }));
    await fetchAssets(1);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadFiles(files);
    e.target.value = '';
  };

  const handleDelete = async (asset) => {
    try {
      await api.delete(`/media/assets/${asset._id}`);
      setSelectedIds((c) => c.filter((id) => id !== asset._id));
      setSelectedAssetMap((c) => { const n = { ...c }; delete n[asset._id]; return n; });
      await fetchAssets(pagination.page);
      toast.success('Asset removed');
    } catch (error) {
      devError('[Media Library] Delete failed', error?.response?.data || error);
      toast.error('Failed to delete asset');
    }
  };

  const confirmSelection = () => {
    onSelect?.(selectedAssets);
    onClose?.();
  };

  /* ── Computed ── */
  const selectedAssets = useMemo(
    () => selectedIds.map((id) => selectedAssetMap[id]).filter(Boolean),
    [selectedAssetMap, selectedIds],
  );

  const totalAllowedAssets = Object.entries(counts)
    .filter(([type]) => !effectiveAllowedTypes?.length || effectiveAllowedTypes.includes(type))
    .reduce((sum, [, v]) => sum + Number(v || 0), 0);

  /* ── Tile preview ── */
  const renderTile = (asset) => {
    if (asset.asset_type === 'image') {
      return <img src={asset.public_url} alt={asset.original_name} className="h-full w-full object-cover" />;
    }
    if (asset.asset_type === 'video') {
      return <video src={asset.public_url} className="h-full w-full bg-black object-cover" muted />;
    }
    const Icon = asset.asset_type === 'audio' ? Mic : FileText;
    const bgMap = { audio: 'bg-rose-50 text-rose-500', document: 'bg-amber-50 text-amber-600' };
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center ${bgMap[asset.asset_type] || 'bg-surface-50 text-surface-500'}`}>
        <Icon className="h-6 w-6 mb-1" />
        <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">{asset.asset_type}</span>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-[680px] max-h-[85vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">

        {/* ─ Header ─ */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100 flex-shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-surface-900">{title}</h2>
            {subtitle && <p className="text-[11px] text-surface-400 mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-100 text-surface-500 hover:bg-surface-200 hover:text-surface-700 flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─ Body (scrollable) ─ */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Upload zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => { e.preventDefault(); setDragActive(false); uploadFiles(Array.from(e.dataTransfer.files || [])); }}
            onPaste={(e) => { const files = Array.from(e.clipboardData.files || []); if (files.length) { e.preventDefault(); uploadFiles(files); } }}
            className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 transition-all cursor-pointer ${
              dragActive ? 'border-brand-400 bg-brand-50/50' : 'border-surface-200 bg-surface-50/50 hover:border-surface-300'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              dragActive ? 'bg-brand-100 text-brand-600' : 'bg-white text-surface-500 border border-surface-200'
            }`}>
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-surface-800">
                {dragActive ? 'Drop files here' : 'Upload files'}
              </p>
              <p className="text-[11px] text-surface-400">
                Drag, paste, or click to browse. Up to 15 MB each.
              </p>
            </div>
            {uploading.length > 0 && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                <span className="text-[11px] font-medium text-brand-600">Uploading {uploading.length}...</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />

          {/* Upload progress bars */}
          {uploading.length > 0 && (
            <div className="space-y-1.5">
              {uploading.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg bg-surface-50 px-3 py-2">
                  <p className="text-[11px] font-medium text-surface-700 truncate flex-1">{item.name}</p>
                  <div className="w-20 h-1.5 rounded-full bg-surface-200 overflow-hidden flex-shrink-0">
                    <div
                      className={`h-full rounded-full transition-all ${item.status === 'failed' ? 'bg-red-400' : 'bg-brand-500'}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-surface-400 w-8 text-right flex-shrink-0">
                    {item.status === 'failed' ? 'Error' : `${item.progress}%`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Filter tabs + search */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto flex-1">
              {['all', ...MEDIA_LIBRARY_TYPES]
                .filter((t) => t === 'all' || effectiveAllowedTypes.includes(t))
                .map((type) => {
                  const meta = FILTER_META[type];
                  const count = type === 'all' ? totalAllowedAssets : Number(counts[type] || 0);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilter(type)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold whitespace-nowrap transition-all ${
                        filter === type
                          ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                          : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'
                      }`}
                    >
                      <meta.icon className="w-3.5 h-3.5" />
                      {meta.label}
                      <span className="text-[10px] text-surface-400 ml-0.5">{count}</span>
                    </button>
                  );
                })}
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-surface-50 border border-surface-200 px-2.5 py-1.5 sm:w-48 flex-shrink-0">
              <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-0 text-[12px] text-surface-700 placeholder-surface-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Asset grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ImageIcon className="w-10 h-10 text-surface-200 mb-2" />
              <p className="text-[13px] font-medium text-surface-500">No assets found</p>
              <p className="text-[11px] text-surface-400 mt-0.5">Upload files to get started</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {assets.map((asset) => {
                  const selected = selectedIds.includes(asset._id);
                  return (
                    <div
                      key={asset._id}
                      className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        selected
                          ? 'border-brand-500 ring-2 ring-brand-200 shadow-sm'
                          : 'border-transparent hover:border-surface-300'
                      }`}
                      onClick={() => toggleSelection(asset)}
                    >
                      {/* Preview */}
                      <div className="aspect-square bg-surface-50">
                        {renderTile(asset)}
                      </div>

                      {/* Selection check */}
                      <div className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        selected
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'bg-black/30 text-white opacity-0 group-hover:opacity-100'
                      }`}>
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </div>

                      {/* Type badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white tracking-wide">
                          {asset.asset_type}
                        </span>
                      </div>

                      {/* Delete on hover */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                        className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md bg-white/90 text-red-500 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Name */}
                      <div className="px-1.5 py-1.5">
                        <p className="text-[10px] font-medium text-surface-700 truncate leading-tight">{asset.original_name}</p>
                        <p className="text-[9px] text-surface-400">{formatFileSize(asset.size_bytes)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-surface-400">
                    Page {pagination.page} of {pagination.pages} ({pagination.total} assets)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination((c) => ({ ...c, page: c.page - 1 }))}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-surface-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setPagination((c) => ({ ...c, page }))}
                          className={`w-7 h-7 rounded-md text-[11px] font-semibold flex items-center justify-center ${
                            page === pagination.page ? 'bg-brand-500 text-white' : 'text-surface-500 hover:bg-surface-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    {pagination.pages > 5 && (
                      <span className="text-[10px] text-surface-300 px-1">...</span>
                    )}
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => setPagination((c) => ({ ...c, page: c.page + 1 }))}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-surface-100 disabled:opacity-40"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ─ Footer ─ */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-surface-100 bg-surface-50/50 flex-shrink-0">
          <span className="text-[11px] text-surface-400">
            {selectedAssets.length > 0
              ? `${selectedAssets.length} selected`
              : helperText}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-surface-200 text-[12px] font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
            >
              Cancel
            </button>
            {!hideConfirm && (
              <button
                type="button"
                disabled={!selectedAssets.length}
                onClick={confirmSelection}
                className="px-4 py-2 rounded-lg bg-brand-500 text-[12px] font-semibold text-white hover:bg-brand-600 disabled:bg-surface-200 disabled:text-surface-400 transition-colors"
              >
                {confirmLabel} {selectedAssets.length > 0 && `(${selectedAssets.length})`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

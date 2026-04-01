
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
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
import PortalModal from './components/Portal/PortalModal';
import { detectMediaAssetType, fileToDataUrl, formatFileSize, MEDIA_LIBRARY_TYPES } from './mediaLibraryHelpers';

const FILTER_META = {
  all: { label: 'All', icon: UploadCloud },
  image: { label: 'Images', icon: ImageIcon },
  video: { label: 'Videos', icon: Video },
  document: { label: 'Files', icon: FileText },
  audio: { label: 'Audio', icon: Mic },
};

const emptyCounts = { image: 0, video: 0, document: 0, audio: 0 };

const defaultFilterForTypes = (allowedTypes = []) =>
  Array.isArray(allowedTypes) && allowedTypes.length === 1 ? allowedTypes[0] : 'all';

export default function MediaLibraryModal({
  open,
  onClose,
  title = 'Media Library',
  subtitle = 'Upload, manage, and reuse media from your workspace.',
  allowedTypes = MEDIA_LIBRARY_TYPES,
  allowMultiple = true,
  onSelect,
  queuedFiles = [],
  onQueuedFilesHandled,
  confirmLabel = 'Use selected',
  helperText = 'Select media to use in the composer',
  hideConfirm = false,
}) {
  const fileInputRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(defaultFilterForTypes(allowedTypes));
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploading, setUploading] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  };

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/media/assets', { params: search ? { search } : {} });
      setAssets(data?.data?.assets || []);
      setCounts({ ...emptyCounts, ...(data?.data?.counts || {}) });
    } catch (error) {
      devError('[Media Library] Failed to load assets', error?.response?.data || error);
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    fetchAssets();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timeoutId = window.setTimeout(() => fetchAssets(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [open, search]);

  useEffect(() => {
    if (!open || !queuedFiles.length) return;
    uploadFiles(Array.from(queuedFiles));
    onQueuedFilesHandled?.();
  }, [open, queuedFiles]);

  useEffect(() => {
    setFilter(defaultFilterForTypes(allowedTypes));
    setSelectedIds([]);
  }, [allowedTypes, open]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (allowedTypes?.length && !allowedTypes.includes(asset.asset_type)) return false;
      if (filter !== 'all' && asset.asset_type !== filter) return false;
      return true;
    });
  }, [allowedTypes, assets, filter]);

  const toggleSelection = (asset) => {
    setSelectedIds((current) => {
      const exists = current.includes(asset._id);
      if (exists) return current.filter((item) => item !== asset._id);
      if (!allowMultiple) return [asset._id];
      return [...current, asset._id];
    });
  };

  const uploadFiles = async (files) => {
    const acceptedFiles = files.filter((file) => {
      const type = detectMediaAssetType(file);
      return !allowedTypes?.length || allowedTypes.includes(type);
    });

    if (!acceptedFiles.length) {
      toast.error('No compatible files for this picker');
      return;
    }

    for (const file of acceptedFiles) {
      const tempId = `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      setUploading((current) => [...current, { id: tempId, name: file.name, progress: 0, status: 'uploading' }]);

      try {
        const dataUrl = await fileToDataUrl(file);
        const { data } = await api.post(
          '/media/assets/upload',
          {
            data_url: dataUrl,
            original_name: file.name,
            mime_type: file.type,
          },
          {
            onUploadProgress: (event) => {
              if (!event.total) return;
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploading((current) =>
                current.map((item) => (item.id === tempId ? { ...item, progress } : item))
              );
            },
          }
        );

        const nextAsset = data?.data?.asset;
        if (nextAsset) {
          setAssets((current) => [nextAsset, ...current]);
          setCounts((current) => ({
            ...current,
            [nextAsset.asset_type]: Number(current[nextAsset.asset_type] || 0) + 1,
          }));
          setSelectedIds((current) => {
            if (!allowMultiple) return [nextAsset._id];
            return Array.from(new Set([...current, nextAsset._id]));
          });
        }

        setUploading((current) => current.map((item) => (item.id === tempId ? { ...item, progress: 100, status: 'done' } : item)));
      } catch (error) {
        devError('[Media Library] Upload failed', error?.response?.data || error);
        setUploading((current) => current.map((item) => (item.id === tempId ? { ...item, status: 'failed' } : item)));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    window.setTimeout(() => {
      setUploading((current) => current.filter((item) => item.status === 'uploading'));
    }, 1200);
  };

  const handleFileInput = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) uploadFiles(files);
    event.target.value = '';
  };

  const handleDelete = async (assetId) => {
    try {
      await api.delete(`/media/assets/${assetId}`);
      setAssets((current) => current.filter((item) => item._id !== assetId));
      setSelectedIds((current) => current.filter((item) => item !== assetId));
      await fetchAssets();
      toast.success('Asset removed');
    } catch (error) {
      devError('[Media Library] Delete failed', error?.response?.data || error);
      toast.error('Failed to delete asset');
    }
  };

  const selectedAssets = assets.filter((asset) => selectedIds.includes(asset._id));

  const renderTilePreview = (asset) => {
    if (asset.asset_type === 'image') {
      return <img src={asset.public_url} alt={asset.original_name} className="h-36 w-full object-cover" />;
    }
    if (asset.asset_type === 'video') {
      return <video src={asset.public_url} className="h-36 w-full object-cover bg-black" muted />;
    }
    const Icon = asset.asset_type === 'audio' ? Mic : FileText;
    return (
      <div className="h-36 w-full bg-slate-100 flex flex-col items-center justify-center text-slate-500">
        <Icon className="w-9 h-9 mb-2" />
        <p className="text-xs font-medium uppercase">{asset.asset_type}</p>
      </div>
    );
  };

  return (
    <PortalModal open={open} onClose={onClose} title={title} subtitle={subtitle} size="xl">
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[280px,1fr]">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              uploadFiles(Array.from(event.dataTransfer.files || []));
            }}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files || []);
              if (!files.length) return;
              event.preventDefault();
              uploadFiles(files);
            }}
            className={`rounded-[28px] border-2 border-dashed p-5 transition-all ${dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-[#f6faf9]'}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-emerald-600 mb-4">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Upload to gallery</h3>
            <p className="text-sm text-gray-500 mt-2">Drag and drop files here, paste screenshots, or browse from your device.</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
              <UploadCloud className="w-4 h-4" />
              Upload files
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} />
            <p className="text-xs text-gray-400 mt-3">Supports images, videos, PDFs, audio, and documents up to 15 MB each.</p>

            {uploading.length ? (
              <div className="mt-5 space-y-2">
                {uploading.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white px-3 py-3 border border-gray-200">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <span className="text-xs text-gray-500">{item.status === 'failed' ? 'Failed' : `${item.progress}%`}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${item.status === 'failed' ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {['all', ...MEDIA_LIBRARY_TYPES].filter((type) => type === 'all' || allowedTypes.includes(type)).map((type) => {
                    const meta = FILTER_META[type];
                    const count = type === 'all'
                      ? Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)
                      : Number(counts[type] || 0);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFilter(type)}
                        className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${filter === type ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                      >
                        <meta.icon className="w-4 h-4" />
                        {meta.label}
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-gray-50 px-3 py-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files..." className="bg-transparent border-none text-sm text-gray-700 placeholder-gray-400 focus:outline-none w-44" />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <ImageIcon className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-sm font-medium text-gray-600">No assets in this gallery yet</p>
                  <p className="text-xs text-gray-400 mt-1">Upload files on the left, then reuse them across chat and campaigns.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredAssets.map((asset) => {
                    const selected = selectedIds.includes(asset._id);
                    return (
                      <button
                        key={asset._id}
                        type="button"
                        onClick={() => toggleSelection(asset)}
                        className={`group overflow-hidden rounded-[24px] border text-left transition-all ${selected ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <div className="relative">
                          {renderTilePreview(asset)}
                          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">{asset.asset_type}</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleDelete(asset._id);
                                }}
                                className="rounded-full bg-white/90 p-2 text-gray-600 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              {selected ? (
                                <span className="rounded-full bg-emerald-500 p-2 text-white shadow-sm">
                                  <Check className="w-3.5 h-3.5" />
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-gray-900 truncate">{asset.original_name}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatFileSize(asset.size_bytes)} • {new Date(asset.created_at).toLocaleDateString()}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
          <div className="text-sm text-gray-500">
            {selectedAssets.length ? `${selectedAssets.length} asset(s) selected` : helperText}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Close
            </button>
            {hideConfirm ? null : (
              <button
                type="button"
                disabled={!selectedAssets.length}
                onClick={() => onSelect?.(selectedAssets)}
                className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mic,
  Search,
  Trash2,
  UploadCloud,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { detectMediaAssetType, fileToDataUrl, formatFileSize, MEDIA_LIBRARY_TYPES } from '../../mediaLibraryHelpers';

const FILTER_META = {
  all: { label: 'All', icon: UploadCloud },
  image: { label: 'Images', icon: ImageIcon },
  video: { label: 'Videos', icon: Video },
  document: { label: 'Files', icon: FileText },
  audio: { label: 'Audio', icon: Mic },
};

const emptyCounts = { image: 0, video: 0, document: 0, audio: 0 };

export default function MediaLibraryPage() {
  const fileInputRef = useRef(null);
  const [assets, setAssets] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [uploading, setUploading] = useState([]);
  const [copiedAssetId, setCopiedAssetId] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/media/assets', { params: search ? { search } : {} });
      setAssets(data?.data?.assets || []);
      setCounts({ ...emptyCounts, ...(data?.data?.counts || {}) });
    } catch {
      toast.error('Failed to load workspace gallery');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => fetchAssets(), 250);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (filter !== 'all' && asset.asset_type !== filter) return false;
      return true;
    });
  }, [assets, filter]);

  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedIds.includes(asset._id)),
    [assets, selectedIds]
  );

  const toggleSelection = (asset) => {
    setSelectedIds((current) => {
      if (current.includes(asset._id)) return current.filter((id) => id !== asset._id);
      return [...current, asset._id];
    });
  };

  const copyUrl = async (asset) => {
    const value = String(asset?.public_url || '').trim();
    if (!value) {
      toast.error('URL missing for this media item');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopiedAssetId(asset._id);
      toast.success('URL copied');
      window.setTimeout(() => setCopiedAssetId(''), 1200);
    } catch {
      toast.error('Copy failed');
    }
  };

  const copySelectedFirstUrl = async () => {
    if (!selectedAssets.length) {
      toast.error('Select at least one media item');
      return;
    }
    await copyUrl(selectedAssets[0]);
  };

  const uploadFiles = async (files) => {
    const acceptedFiles = Array.from(files || []).filter((file) => MEDIA_LIBRARY_TYPES.includes(detectMediaAssetType(file)));
    if (!acceptedFiles.length) {
      toast.error('No compatible files selected');
      return;
    }
    for (const file of acceptedFiles) {
      const tempId = `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      setUploading((current) => [...current, { id: tempId, name: file.name, progress: 0, status: 'uploading' }]);
      try {
        const dataUrl = await fileToDataUrl(file);
        const { data } = await api.post(
          '/media/assets/upload',
          { data_url: dataUrl, original_name: file.name, mime_type: file.type },
          {
            onUploadProgress: (event) => {
              if (!event.total) return;
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploading((current) => current.map((item) => (item.id === tempId ? { ...item, progress } : item)));
            },
          }
        );

        const nextAsset = data?.data?.asset;
        if (nextAsset) {
          setAssets((current) => [nextAsset, ...current]);
          setCounts((current) => ({ ...current, [nextAsset.asset_type]: Number(current[nextAsset.asset_type] || 0) + 1 }));
        }
        setUploading((current) => current.map((item) => (item.id === tempId ? { ...item, progress: 100, status: 'done' } : item)));
      } catch {
        setUploading((current) => current.map((item) => (item.id === tempId ? { ...item, status: 'failed' } : item)));
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    window.setTimeout(() => {
      setUploading((current) => current.filter((item) => item.status === 'uploading'));
    }, 1200);
  };

  const deleteAsset = async (asset) => {
    if (!window.confirm(`Delete "${asset.original_name}"?`)) return;
    try {
      await api.delete(`/media/assets/${asset._id}`);
      setAssets((current) => current.filter((item) => item._id !== asset._id));
      setSelectedIds((current) => current.filter((id) => id !== asset._id));
      setCounts((current) => ({ ...current, [asset.asset_type]: Math.max(0, Number(current[asset.asset_type] || 1) - 1) }));
      toast.success('Media deleted');
    } catch {
      toast.error('Failed to delete media');
    }
  };

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
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="font-display text-2xl font-bold text-gray-900">Workspace Gallery</h1>
        <p className="text-sm text-gray-500 mt-1">Manage the files stored on your server and reuse them across chats, campaigns, and message flows.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px,1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Upload</p>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
            <UploadCloud className="w-4 h-4" />
            Upload files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              uploadFiles(event.target.files);
              event.target.value = '';
            }}
          />
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

          <div className="mt-6 border-t border-gray-100 pt-4">
            <button onClick={copySelectedFirstUrl} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Copy className="w-4 h-4" />
              Copy selected item URL
            </button>
            <p className="text-xs text-gray-400 mt-2">{selectedAssets.length ? `${selectedAssets.length} selected` : 'No selected media'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {['all', ...MEDIA_LIBRARY_TYPES].map((type) => {
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

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center text-center">
                <ImageIcon className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-600">No assets in this gallery yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload files and reuse them across chat and campaigns.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredAssets.map((asset) => {
                  const selected = selectedIds.includes(asset._id);
                  return (
                    <div key={asset._id} className={`overflow-hidden rounded-2xl border ${selected ? 'border-emerald-300 ring-2 ring-emerald-100' : 'border-gray-200'} bg-white`}>
                      <button type="button" onClick={() => toggleSelection(asset)} className="w-full text-left">
                        {renderTilePreview(asset)}
                      </button>

                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{asset.original_name || 'Untitled'}</p>
                            <p className="text-xs text-gray-400 mt-1">{formatFileSize(asset.file_size)} • {asset.asset_type}</p>
                          </div>
                          <button type="button" onClick={() => toggleSelection(asset)} className={`mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center ${selected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 text-transparent'}`}>
                            <Check className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <button type="button" onClick={() => copyUrl(asset)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                            <Copy className="w-3.5 h-3.5" />
                            {copiedAssetId === asset._id ? 'Copied' : 'Copy URL'}
                          </button>
                          <button type="button" onClick={() => deleteAsset(asset)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

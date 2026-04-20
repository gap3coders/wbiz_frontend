import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Copy, FileText, Image as ImageIcon, Mic, Trash2, UploadCloud, Video,
  Search, ChevronLeft, ChevronRight, Play, Download, Eye, X, Check,
  FolderOpen, Film, FileAudio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { detectMediaAssetType, fileToDataUrl, formatFileSize, MEDIA_LIBRARY_TYPES } from '../../mediaLibraryHelpers';

/* ── Constants ── */
const PAGE_SIZE = 24;

const TYPE_CONFIG = {
  all:      { label: 'All Files',  icon: FolderOpen, color: 'text-surface-500', bg: 'bg-surface-100' },
  image:    { label: 'Images',     icon: ImageIcon,  color: 'text-blue-600',    bg: 'bg-blue-50' },
  video:    { label: 'Videos',     icon: Film,       color: 'text-purple-600',  bg: 'bg-purple-50' },
  document: { label: 'Documents',  icon: FileText,   color: 'text-orange-600',  bg: 'bg-orange-50' },
  audio:    { label: 'Audio',      icon: FileAudio,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const TILE_BG = {
  image:    'bg-gradient-to-br from-blue-50 to-blue-100',
  video:    'bg-gradient-to-br from-purple-50 to-purple-100',
  document: 'bg-gradient-to-br from-orange-50 to-orange-100',
  audio:    'bg-gradient-to-br from-emerald-50 to-emerald-100',
};

const TILE_ICON_COLOR = {
  image:    'text-blue-400',
  video:    'text-purple-400',
  document: 'text-orange-400',
  audio:    'text-emerald-400',
};

/* ── Helpers ── */
const emptyCounts = { image: 0, video: 0, document: 0, audio: 0 };

const formatDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ── Main Component ── */
export default function MediaLibraryPage() {
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const requestRef = useRef(0);

  const [assets, setAssets] = useState([]);
  const [counts, setCounts] = useState(emptyCounts);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [uploading, setUploading] = useState([]);
  const [copiedId, setCopiedId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [previewAsset, setPreviewAsset] = useState(null);

  /* ── Fetch ── */
  const fetchAssets = useCallback(async (page = 1) => {
    const id = ++requestRef.current;
    setLoading(true);
    try {
      const { data } = await api.get('/media/assets', {
        params: {
          page,
          limit: PAGE_SIZE,
          search: search || undefined,
          asset_type: filter !== 'all' ? filter : undefined,
        },
      });
      if (requestRef.current !== id) return;
      setAssets(data?.data?.assets || []);
      setCounts({ ...emptyCounts, ...(data?.data?.counts || {}) });
      setPagination(data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
    } catch {
      if (requestRef.current === id) toast.error('Failed to load media');
    } finally {
      if (requestRef.current === id) setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    setPagination((c) => (c.page === 1 ? c : { ...c, page: 1 }));
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(() => fetchAssets(pagination.page), 200);
    return () => clearTimeout(t);
  }, [search, filter, pagination.page, fetchAssets]);

  const totalAssets = Object.values(counts).reduce((s, v) => s + Number(v || 0), 0);

  /* ── Upload ── */
  const uploadFiles = async (files) => {
    const accepted = Array.from(files || []).filter((f) => MEDIA_LIBRARY_TYPES.includes(detectMediaAssetType(f)));
    if (!accepted.length) { toast.error('No supported files'); return; }

    for (const file of accepted) {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setUploading((c) => [...c, { id: tempId, name: file.name, progress: 0, status: 'uploading' }]);
      try {
        const dataUrl = await fileToDataUrl(file);
        await api.post('/media/assets/upload', { data_url: dataUrl, original_name: file.name, mime_type: file.type }, {
          onUploadProgress: (e) => {
            if (!e.total) return;
            setUploading((c) => c.map((u) => u.id === tempId ? { ...u, progress: Math.round((e.loaded / e.total) * 100) } : u));
          },
        });
        setUploading((c) => c.map((u) => u.id === tempId ? { ...u, progress: 100, status: 'done' } : u));
        toast.success(`Uploaded ${file.name}`);
      } catch {
        setUploading((c) => c.map((u) => u.id === tempId ? { ...u, status: 'failed' } : u));
        toast.error(`Upload failed: ${file.name}`);
      }
    }
    setTimeout(() => setUploading((c) => c.filter((u) => u.status === 'uploading')), 1500);
    setPagination((c) => ({ ...c, page: 1 }));
    fetchAssets(1);
  };

  /* ── Actions ── */
  const copyUrl = async (asset) => {
    const url = String(asset?.public_url || '').trim();
    if (!url) { toast.error('No URL available'); return; }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(asset._id);
      toast.success('URL copied');
      setTimeout(() => setCopiedId(''), 1500);
    } catch { toast.error('Copy failed'); }
  };

  const deleteAsset = async (asset) => {
    if (!window.confirm(`Delete "${asset.original_name}"?`)) return;
    try {
      await api.delete(`/media/assets/${asset._id}`);
      toast.success('Deleted');
      fetchAssets(pagination.page);
    } catch { toast.error('Delete failed'); }
  };

  /* ── Drag & drop ── */
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.items?.length) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
  }, []);

  /* ── Tile preview ── */
  const renderPreview = (asset) => {
    const iconClass = TILE_ICON_COLOR[asset.asset_type] || 'text-surface-400';
    if (asset.asset_type === 'image') {
      return <img src={asset.public_url} alt={asset.original_name} className="w-full h-full object-cover" />;
    }
    if (asset.asset_type === 'video') {
      return (
        <div className="w-full h-full relative bg-[#1a1a2e]">
          <video src={asset.public_url} className="w-full h-full object-cover opacity-80" muted />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        </div>
      );
    }
    const Icon = asset.asset_type === 'audio' ? FileAudio : FileText;
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center ${TILE_BG[asset.asset_type] || 'bg-surface-100'}`}>
        <Icon className={`w-8 h-8 ${iconClass} mb-1.5`} />
        <span className={`text-[10px] font-bold uppercase tracking-wider ${iconClass}`}>{asset.asset_type}</span>
      </div>
    );
  };

  /* ── Lightbox ── */
  const renderLightbox = () => {
    if (!previewAsset) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setPreviewAsset(null)}>
        <div className="relative max-w-3xl max-h-[85vh] mx-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setPreviewAsset(null)}
            className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center text-surface-600 hover:text-surface-900 z-10"
          >
            <X className="w-4 h-4" />
          </button>
          {previewAsset.asset_type === 'image' && (
            <img src={previewAsset.public_url} alt={previewAsset.original_name} className="max-w-full max-h-[80vh] rounded-xl shadow-2xl object-contain" />
          )}
          {previewAsset.asset_type === 'video' && (
            <video src={previewAsset.public_url} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl shadow-2xl" />
          )}
          {previewAsset.asset_type === 'audio' && (
            <div className="bg-white rounded-xl p-8 shadow-2xl min-w-[340px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <FileAudio className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-surface-900 truncate">{previewAsset.original_name}</p>
                  <p className="text-[12px] text-surface-500">{formatFileSize(previewAsset.size_bytes)}</p>
                </div>
              </div>
              <audio src={previewAsset.public_url} controls className="w-full" />
            </div>
          )}
          {previewAsset.asset_type === 'document' && (
            <div className="bg-white rounded-xl p-8 shadow-2xl min-w-[340px] text-center">
              <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-[14px] font-semibold text-surface-900 mb-1">{previewAsset.original_name}</p>
              <p className="text-[12px] text-surface-500 mb-4">{formatFileSize(previewAsset.size_bytes)}</p>
              <a
                href={previewAsset.public_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-[13px] font-semibold rounded-lg hover:bg-brand-700 transition"
              >
                <Download className="w-4 h-4" />
                Open File
              </a>
            </div>
          )}
          {/* Bottom info bar */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-[12px] text-white/70 truncate max-w-[60%]">{previewAsset.original_name}</p>
            <div className="flex items-center gap-2">
              <button onClick={() => copyUrl(previewAsset)} className="px-3 py-1.5 rounded-lg bg-white/15 text-white text-[12px] font-medium hover:bg-white/25 transition flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                Copy URL
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="space-y-6"
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      {/* Full-page drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[80] bg-brand-600/10 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-10 text-center border-2 border-dashed border-brand-400">
            <UploadCloud className="w-14 h-14 text-brand-500 mx-auto mb-3" />
            <p className="text-[16px] font-bold text-surface-900">Drop files to upload</p>
            <p className="text-[13px] text-surface-500 mt-1">Images, videos, documents, audio</p>
          </div>
        </div>
      )}

      {renderLightbox()}

        {/* ── Top Bar: Title + Upload ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Media Library</h1>
            <p className="text-[13px] text-surface-400 mt-1 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              {totalAssets} file{totalAssets !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { uploadFiles(e.target.files); e.target.value = ''; }}
          />
        </div>

        {/* ── Upload progress ── */}
        {uploading.length > 0 && (
          <div className="bg-white rounded-xl border border-surface-200 shadow-card p-3 space-y-2">
            {uploading.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.status === 'done' ? 'bg-green-50' : item.status === 'failed' ? 'bg-red-50' : 'bg-brand-50'}`}>
                  {item.status === 'done' ? <Check className="w-3.5 h-3.5 text-green-600" /> :
                   item.status === 'failed' ? <X className="w-3.5 h-3.5 text-red-500" /> :
                   <UploadCloud className="w-3.5 h-3.5 text-brand-600 animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-surface-800 truncate">{item.name}</p>
                  <div className="h-1 mt-1 rounded-full bg-surface-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${item.status === 'failed' ? 'bg-red-400' : 'bg-brand-500'}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-surface-500 flex-shrink-0 tabular-nums w-10 text-right">
                  {item.status === 'done' ? 'Done' : item.status === 'failed' ? 'Fail' : `${item.progress}%`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Filter Row: Type Tabs + Search ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-in-up">
          <div className="flex items-center bg-surface-100 rounded-lg p-0.5 overflow-x-auto">
            {['all', ...MEDIA_LIBRARY_TYPES].map((type) => {
              const cfg = TYPE_CONFIG[type];
              const count = type === 'all' ? totalAssets : Number(counts[type] || 0);
              const active = filter === type;
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-[6px] rounded-md text-[12px] font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-500 hover:text-surface-700'
                  }`}
                >
                  {cfg.label}
                  <span className={`text-[10px] ${active ? 'text-surface-500' : 'text-surface-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 rounded-lg border border-surface-200 bg-white px-3 py-2 w-full sm:w-64 focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-300 transition-all">
            <Search className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search files..."
              className="flex-1 border-0 bg-transparent text-[12px] text-surface-900 placeholder-surface-400 focus:outline-none" />
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="bg-white rounded-xl border border-surface-200 shadow-card overflow-hidden">

          {/* Subheader */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-100">
            <p className="text-[12px] text-surface-500 font-medium">
              {loading ? 'Loading...' : `Showing ${assets.length} of ${pagination.total} file${pagination.total !== 1 ? 's' : ''}`}
            </p>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagination((c) => ({ ...c, page: Math.max(1, c.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[12px] font-semibold text-surface-700 tabular-nums px-2">
                  {pagination.page} / {pagination.pages}
                </span>
                <button
                  onClick={() => setPagination((c) => ({ ...c, page: Math.min(c.pages, c.page + 1) }))}
                  disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded-lg text-surface-500 hover:bg-surface-50 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Grid / Loading / Empty */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square rounded-xl bg-surface-100" />
                  <div className="mt-2 h-3 bg-surface-100 rounded w-3/4" />
                  <div className="mt-1 h-2.5 bg-surface-50 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-surface-300" />
              </div>
              <p className="text-[15px] font-semibold text-surface-900">
                {search ? 'No files match your search' : 'No media files yet'}
              </p>
              <p className="text-[13px] text-surface-500 mt-1 mb-5">
                {search ? 'Try a different search term' : 'Upload images, videos, documents or audio to get started'}
              </p>
              {!search && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-[13px] font-semibold rounded-xl hover:bg-brand-700 transition shadow-sm"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload Files
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4">
              {assets.map((asset, idx) => (
                <div
                  key={asset._id}
                  className="group relative animate-fade-in-up"
                  style={{ animationDelay: `${idx * 20}ms` }}
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-square rounded-xl overflow-hidden border border-surface-200 cursor-pointer relative hover:shadow-md hover:border-surface-300 transition-all"
                    onClick={() => setPreviewAsset(asset)}
                  >
                    {renderPreview(asset)}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewAsset(asset); }}
                          className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-surface-700 hover:bg-white transition shadow-sm"
                          title="Preview"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); copyUrl(asset); }}
                          className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-surface-700 hover:bg-white transition shadow-sm"
                          title="Copy URL"
                        >
                          {copiedId === asset._id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAsset(asset); }}
                          className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-500 hover:bg-red-50 transition shadow-sm"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Type badge */}
                    <div className="absolute top-1.5 left-1.5">
                      <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                        asset.asset_type === 'image' ? 'bg-blue-600/80 text-white' :
                        asset.asset_type === 'video' ? 'bg-purple-600/80 text-white' :
                        asset.asset_type === 'audio' ? 'bg-emerald-600/80 text-white' :
                        'bg-orange-600/80 text-white'
                      }`}>
                        {asset.asset_type}
                      </span>
                    </div>
                  </div>

                  {/* File info */}
                  <div className="mt-1.5 px-0.5">
                    <p className="text-[12px] font-semibold text-surface-800 truncate leading-tight" title={asset.original_name}>
                      {asset.original_name || 'Untitled'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-surface-400">{formatFileSize(asset.size_bytes)}</span>
                      <span className="text-surface-300">·</span>
                      <span className="text-[11px] text-surface-400">{formatDate(asset.created_at || asset.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom pagination */}
          {!loading && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100 bg-surface-50/50">
              <p className="text-[12px] text-surface-500">
                Page {pagination.page} of {pagination.pages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagination((c) => ({ ...c, page: 1 }))}
                  disabled={pagination.page <= 1}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-surface-600 hover:bg-surface-100 disabled:opacity-30 transition"
                >
                  First
                </button>
                <button
                  onClick={() => setPagination((c) => ({ ...c, page: Math.max(1, c.page - 1) }))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg text-surface-600 hover:bg-surface-100 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.pages) }).map((_, i) => {
                  let page;
                  if (pagination.pages <= 5) {
                    page = i + 1;
                  } else if (pagination.page <= 3) {
                    page = i + 1;
                  } else if (pagination.page >= pagination.pages - 2) {
                    page = pagination.pages - 4 + i;
                  } else {
                    page = pagination.page - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setPagination((c) => ({ ...c, page }))}
                      className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition ${
                        pagination.page === page
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-surface-600 hover:bg-surface-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPagination((c) => ({ ...c, page: Math.min(c.pages, c.page + 1) }))}
                  disabled={pagination.page >= pagination.pages}
                  className="p-1.5 rounded-lg text-surface-600 hover:bg-surface-100 disabled:opacity-30 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPagination((c) => ({ ...c, page: c.pages }))}
                  disabled={pagination.page >= pagination.pages}
                  className="px-2.5 py-1.5 rounded-lg text-[12px] font-medium text-surface-600 hover:bg-surface-100 disabled:opacity-30 transition"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Drop zone hint (empty state) ── */}
        {!loading && assets.length === 0 && !search && (
          <div className="border-2 border-dashed border-surface-200 rounded-xl p-8 text-center hover:border-brand-300 hover:bg-brand-50/30 transition-colors cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <UploadCloud className="w-10 h-10 text-surface-300 mx-auto mb-2" />
            <p className="text-[13px] text-surface-500">Or drag and drop files anywhere on this page</p>
          </div>
        )}
    </div>
  );
}

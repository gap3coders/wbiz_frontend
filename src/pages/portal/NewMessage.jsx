import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  FolderOpen,
  Image,
  Link2,
  Mic,
  Paperclip,
  Send,
  UploadCloud,
  User,
  Video,
  X,
} from 'lucide-react';
import api from '../../api/axios';
import MediaLibraryModal from '../../MediaLibraryModal';
import { detectMediaAssetType, formatFileSize } from '../../mediaLibraryHelpers';

const MEDIA_OPTIONS = [
  { key: 'image', label: 'Image', icon: Image },
  { key: 'video', label: 'Video', icon: Video },
  { key: 'document', label: 'File', icon: Paperclip },
  { key: 'audio', label: 'Audio', icon: Mic },
];

const mergeAssets = (current, incoming) => {
  const nextMap = new Map(current.map((asset) => [asset._id, asset]));
  incoming.forEach((asset) => nextMap.set(asset._id, asset));
  return Array.from(nextMap.values());
};

const extractVars = (template) => {
  if (!template) return [];
  const vars = [];
  for (const component of template.components || []) {
    if (!['BODY', 'HEADER'].includes(component.type) || !component.text) continue;
    const matches = component.text.match(/\{\{(\d+)\}\}/g) || [];
    matches.forEach((match) => {
      const value = component.type === 'HEADER'
        ? `header_${match.replace(/[{}]/g, '')}`
        : match.replace(/[{}]/g, '');
      if (!vars.includes(value)) vars.push(value);
    });
  }
  return vars;
};

const renderAssetPreview = (asset) => {
  if (asset.asset_type === 'image') {
    return <img src={asset.public_url} alt={asset.original_name} className="h-32 w-full rounded-2xl object-cover" />;
  }

  if (asset.asset_type === 'video') {
    return <video src={asset.public_url} className="h-32 w-full rounded-2xl bg-black object-cover" muted />;
  }

  const Icon = asset.asset_type === 'audio' ? Mic : FileText;
  return (
    <div className="flex h-32 w-full flex-col items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
      <Icon className="mb-2 h-8 w-8" />
      <p className="text-xs font-semibold uppercase tracking-wide">{asset.asset_type}</p>
    </div>
  );
};

export default function NewMessage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState('template');
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactList, setShowContactList] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateVariables, setTemplateVariables] = useState({});
  const [showVariableConfig, setShowVariableConfig] = useState(false);
  const [templateHeaderUrl, setTemplateHeaderUrl] = useState('');
  const [showTemplateHeaderLibrary, setShowTemplateHeaderLibrary] = useState(false);
  const [mediaType, setMediaType] = useState('image');
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [manualUrlOpen, setManualUrlOpen] = useState(false);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [manualFilename, setManualFilename] = useState('');
  const devLog = (...args) => {
    if (import.meta.env.DEV) console.info(...args);
  };
  const devError = (...args) => {
    if (import.meta.env.DEV) console.error(...args);
  };

  useEffect(() => {
    const queryTo = String(searchParams.get('to') || '').replace(/[^\d]/g, '');
    if (queryTo) {
      setTo(queryTo);
      setContactSearch(queryTo);
      setShowContactList(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const searchTerm = String(contactSearch || to || '').trim();
    api
      .get('/contacts', { params: { search: searchTerm, limit: 20 } })
      .then((response) => setContacts(response.data?.data?.contacts || []))
      .catch((error) => {
        devError('[New Message][Contacts Failed]', error?.response?.data || error);
      });
  }, [contactSearch, to]);

  useEffect(() => {
    if (mode !== 'template' || templates.length) return;
    setLoadingTemplates(true);
    api
      .get('/meta/templates')
      .then((response) => setTemplates(response.data?.data?.templates || []))
      .catch(() => toast.error('Failed to load Meta templates'))
      .finally(() => setLoadingTemplates(false));
  }, [mode, templates.length]);

  const approvedTemplates = useMemo(
    () => templates.filter((template) => template.status === 'APPROVED'),
    [templates]
  );

  const templateVariableKeys = Object.keys(templateVariables);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTemplateHeaderUrl('');
    const vars = extractVars(template);
    const nextMap = {};
    vars.forEach((key) => {
      nextMap[key] = { type: 'static', value: '' };
    });
    setTemplateVariables(nextMap);
    setShowVariableConfig(vars.length > 0);
  };

  const buildTemplateComponents = () => {
    if (!selectedTemplate || !templateVariableKeys.length) return [];
    const matchedContact = contacts.find((contact) => contact.phone === to.replace(/[^0-9]/g, ''));
    const headerParameters = templateVariableKeys
      .filter((key) => key.startsWith('header_'))
      .sort((left, right) => Number(left.replace('header_', '')) - Number(right.replace('header_', '')))
      .map((key) => {
        const variable = templateVariables[key];
        let value = variable.value;
        if (variable.type === 'contact_name') value = matchedContact?.name || 'Customer';
        if (variable.type === 'contact_phone') value = to.replace(/[^0-9]/g, '');
        if (variable.type === 'contact_email') value = matchedContact?.email || 'N/A';
        return { type: 'text', text: value || `{{${key.replace('header_', '')}}}` };
      });
    const bodyParameters = templateVariableKeys
      .filter((key) => !key.startsWith('header_'))
      .sort((left, right) => Number(left) - Number(right))
      .map((key) => {
        const variable = templateVariables[key];
        let value = variable.value;
        if (variable.type === 'contact_name') value = matchedContact?.name || 'Customer';
        if (variable.type === 'contact_phone') value = to.replace(/[^0-9]/g, '');
        if (variable.type === 'contact_email') value = matchedContact?.email || '';
        return { type: 'text', text: value || `{{${key}}}` };
      });

    const components = [];
    if (headerParameters.length) components.push({ type: 'header', parameters: headerParameters });
    if (bodyParameters.length) components.push({ type: 'body', parameters: bodyParameters });
    return components;
  };

  const selectedTemplateHeaderFormat = useMemo(() => {
    const header = selectedTemplate?.components?.find((component) => component.type === 'HEADER');
    const format = String(header?.format || '').toUpperCase();
    if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(format)) return '';
    return format;
  }, [selectedTemplate]);
  const templateHeaderLibraryType = selectedTemplateHeaderFormat ? selectedTemplateHeaderFormat.toLowerCase() : '';

  const previewText = () => {
    if (!selectedTemplate) return '';
    let body = selectedTemplate.components?.find((component) => component.type === 'BODY')?.text || '';
    Object.entries(templateVariables).forEach(([key, value]) => {
      if (!key.startsWith('header_')) body = body.replace(`{{${key}}}`, value.value || `[VAR ${key}]`);
    });
    return body;
  };

  const queueFilesForLibrary = (files) => {
    const nextFiles = Array.from(files || []).filter((file) => detectMediaAssetType(file) === mediaType);
    if (!nextFiles.length) {
      toast.error(`Please add ${mediaType} files for this picker.`);
      return;
    }
    setQueuedFiles(nextFiles);
    setShowLibrary(true);
  };

  const removeAsset = (assetId) => {
    setSelectedAssets((current) => current.filter((asset) => asset._id !== assetId));
  };

  const buildManualMediaPayload = () => {
    if (!mediaUrl.trim()) return [];
    return [{
      asset_type: mediaType,
      public_url: mediaUrl.trim(),
      original_name: manualFilename.trim() || `${mediaType}-asset`,
    }];
  };

  const buildAssetsToSend = () => (selectedAssets.length ? selectedAssets : buildManualMediaPayload());

  const handleSend = async () => {
    if (!to.trim()) {
      toast.error('Enter a recipient');
      return;
    }

    const normalizedTo = to.replace(/[^0-9]/g, '');
    if (!normalizedTo) {
      toast.error('Enter a valid WhatsApp number');
      return;
    }

    setSending(true);

    try {
      devLog('[Portal Messaging][Request]', {
        mode,
        to: normalizedTo,
        template_name: selectedTemplate?.name || null,
        media_type: mode === 'media' ? mediaType : null,
        selected_assets: selectedAssets.length,
      });

      if (mode === 'text') {
        if (!text.trim()) {
          toast.error('Enter a message');
          setSending(false);
          return;
        }

        const response = await api.post('/meta/messages/send', {
          to: normalizedTo,
          text: text.trim(),
        });
        devLog('[Portal Messaging][Meta Accepted][Text]', response.data?.data || {});
        toast.success('Accepted by Meta. Delivery still depends on WhatsApp callback updates.');
        navigate('/portal/inbox');
        return;
      }

      if (mode === 'template') {
        if (!selectedTemplate) {
          toast.error('Select a template');
          setSending(false);
          return;
        }
        if (selectedTemplateHeaderFormat && !templateHeaderUrl.trim()) {
          toast.error(`Template requires ${selectedTemplateHeaderFormat} header URL`);
          setSending(false);
          return;
        }

        const response = await api.post('/meta/messages/send-template', {
          to: normalizedTo,
          template_name: selectedTemplate.name,
          language: selectedTemplate.language,
          components: buildTemplateComponents(),
          header_type: selectedTemplateHeaderFormat ? selectedTemplateHeaderFormat.toLowerCase() : undefined,
          header_media_url: selectedTemplateHeaderFormat ? templateHeaderUrl.trim() : undefined,
        });
        devLog('[Portal Messaging][Meta Accepted][Template]', response.data?.data || {});
        toast.success('Accepted by Meta. Delivery still depends on WhatsApp callback updates.');
        navigate('/portal/inbox');
        return;
      }

      const assetsToSend = buildAssetsToSend();
      if (!assetsToSend.length) {
        toast.error('Choose media from the gallery or add a direct URL');
        setSending(false);
        return;
      }

      let acceptedCount = 0;
      const failures = [];

      for (const asset of assetsToSend) {
        try {
          const response = await api.post('/meta/messages/send-media', {
            to: normalizedTo,
            type: asset.asset_type,
            url: asset.public_url,
            caption: asset.asset_type === 'audio' ? '' : mediaCaption.trim(),
            filename:
              asset.asset_type === 'document'
                ? asset.original_name || manualFilename.trim() || 'document'
                : asset.original_name || undefined,
          });

          acceptedCount += 1;
          devLog('[Portal Messaging][Meta Accepted][Media]', {
            asset_name: asset.original_name,
            asset_type: asset.asset_type,
            response: response.data?.data || {},
          });
        } catch (error) {
          failures.push({ asset, error });
          devError('[Portal Messaging][Media Failed]', {
            asset_name: asset.original_name,
            asset_type: asset.asset_type,
            error: error?.response?.data || error,
          });
        }
      }

      if (!acceptedCount) {
        const firstFailure = failures[0]?.error?.response?.data;
        if (firstFailure?.error_source === 'meta') toast.error(`Meta Error: ${firstFailure.error}`);
        else toast.error(`Platform Error: ${firstFailure?.error || 'Send failed'}`);
        return;
      }

      if (failures.length) {
        toast.success(`${acceptedCount} attachment(s) accepted by Meta, ${failures.length} failed.`);
      } else {
        toast.success(`${acceptedCount} attachment(s) accepted by Meta.`);
      }

      navigate('/portal/inbox');
    } catch (error) {
      const payload = error?.response?.data;
      devError('[Portal Messaging][Send Failed]', payload || error);
      if (payload?.error_source === 'meta') toast.error(`Meta Error: ${payload.error}`);
      else toast.error(`Platform Error: ${payload?.error || 'Send failed'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-6xl p-6 sm:p-8">
        <div className="mb-6 animate-fade-in-up">
          <h1 className="font-display mb-1 text-2xl font-bold text-gray-900">New Message</h1>
          <p className="text-sm text-gray-500">
            Send Meta-approved WhatsApp templates with dynamic variables and media headers.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,390px]">
          <div className="space-y-5 animate-fade-in-up">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Meta Template mode enabled
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Recipient
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <input
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setShowContactList(true);
                    }}
                    onFocus={() => setShowContactList(true)}
                    placeholder="Phone (e.g. 919876543210)"
                    className="w-full border-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0"
                  />
                </div>

                {showContactList ? (
                  <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="p-2">
                      <input
                        value={contactSearch}
                        onChange={(event) => setContactSearch(event.target.value)}
                        placeholder="Search contacts..."
                        className="w-full rounded-lg border-none bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-0"
                      />
                    </div>
                    {contacts.map((contact) => (
                      <button
                        key={contact._id}
                        type="button"
                        onClick={() => {
                          setTo(contact.phone);
                          setShowContactList(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-white">
                          {(contact.name || contact.phone)[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-700">{contact.name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-400">+{contact.phone}</p>
                        </div>
                      </button>
                    ))}
                    {!contacts.length ? (
                      <p className="px-4 pb-3 text-xs text-gray-500">No contacts found for this search.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {mode === 'text' ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Message
                </label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Type your message..."
                  rows={6}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-gray-400">{text.length}/4096</span>
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Requires 24h window</span>
                  </div>
                </div>
              </div>
            ) : null}

            {mode === 'template' ? (
              <>
                <div className="rounded-2xl border border-gray-100 bg-white p-5">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Select Meta-Approved Template
                  </label>
                  <p className="mb-3 text-xs text-gray-400">
                    Only Meta-approved templates appear here, pulled live from your connected WhatsApp account.
                  </p>
                  {loadingTemplates ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-16 animate-pulse rounded-xl bg-gray-100" />
                      ))}
                    </div>
                  ) : approvedTemplates.length === 0 ? (
                    <div className="py-8 text-center">
                      <FileText className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                      <p className="text-sm text-gray-400">No approved templates on Meta</p>
                    </div>
                  ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto">
                      {approvedTemplates.map((template) => {
                        const vars = extractVars(template);
                        return (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => handleSelectTemplate(template)}
                            className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                              selectedTemplate?.id === template.id
                                ? 'border-emerald-300 bg-emerald-50'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                            }`}
                          >
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-sm font-semibold text-gray-900">{template.name}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  template.category === 'MARKETING'
                                    ? 'bg-violet-100 text-violet-700'
                                    : template.category === 'UTILITY'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {template.category}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">
                              {template.language} • {vars.length ? `${vars.length} variable(s)` : 'No variables'}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedTemplate && templateVariableKeys.length ? (
                  <div className="rounded-2xl border border-gray-100 bg-white p-5">
                    <button
                      type="button"
                      onClick={() => setShowVariableConfig((current) => !current)}
                      className="flex w-full items-center justify-between"
                    >
                      <div className="text-left">
                        <label className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                          Dynamic Variables ({templateVariableKeys.length})
                        </label>
                        <p className="mt-0.5 text-xs text-gray-400">
                          Configure what data to pass into the selected template.
                        </p>
                      </div>
                      {showVariableConfig ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>

                    {showVariableConfig ? (
                      <div className="mt-4 space-y-3">
                        {templateVariableKeys.map((key) => (
                          <div key={key} className="rounded-xl bg-gray-50 p-3">
                            <label className="mb-2 block text-xs font-semibold text-gray-600">{`{{${key}}}`}</label>
                            <div className="flex gap-2">
                              <select
                                value={templateVariables[key]?.type || 'static'}
                                onChange={(event) =>
                                  setTemplateVariables((current) => ({
                                    ...current,
                                    [key]: { ...current[key], type: event.target.value },
                                  }))
                                }
                                className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                              >
                                <option value="static">Static Value</option>
                                <option value="contact_name">Contact Name</option>
                                <option value="contact_phone">Contact Phone</option>
                                <option value="contact_email">Contact Email</option>
                              </select>

                              {templateVariables[key]?.type === 'static' ? (
                                <input
                                  value={templateVariables[key]?.value || ''}
                                  onChange={(event) =>
                                    setTemplateVariables((current) => ({
                                      ...current,
                                      [key]: { ...current[key], value: event.target.value },
                                    }))
                                  }
                                  placeholder="Enter value..."
                                  className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                                />
                              ) : (
                                <p className="flex flex-1 items-center px-3 text-xs text-emerald-600">
                                  Auto-filled from contact data
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {selectedTemplate && selectedTemplateHeaderFormat ? (
                  <div className="rounded-2xl border border-gray-100 bg-white p-5">
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-blue-600">
                      Header Media ({selectedTemplateHeaderFormat})
                    </label>
                    <p className="mb-3 text-xs text-gray-400">
                      This template needs a {selectedTemplateHeaderFormat.toLowerCase()} header file URL.
                    </p>
                    <input
                      value={templateHeaderUrl}
                      onChange={(event) => setTemplateHeaderUrl(event.target.value)}
                      placeholder="https://public-url-to-media-file"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTemplateHeaderLibrary(true)}
                      className="mt-2 inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      Choose from gallery
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            {mode === 'media' ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Media Gallery
                </label>

                <div className="mb-4 grid grid-cols-4 gap-2">
                  {MEDIA_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setMediaType(option.key);
                        setSelectedAssets([]);
                        setManualUrlOpen(false);
                        setMediaUrl('');
                        setManualFilename('');
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                        mediaType === option.key
                          ? 'border-emerald-300 bg-emerald-50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <option.icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    queueFilesForLibrary(event.dataTransfer.files);
                  }}
                  onPaste={(event) => {
                    const files = Array.from(event.clipboardData.files || []);
                    if (!files.length) return;
                    event.preventDefault();
                    queueFilesForLibrary(files);
                  }}
                  className={`rounded-[28px] border-2 border-dashed p-5 transition-all ${
                    dragActive ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-[#f7faf9]'
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                        <FolderOpen className="h-6 w-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Choose from gallery</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Upload to your own server library, then reuse those assets anywhere in the portal.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => setShowLibrary(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Open gallery
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualUrlOpen((current) => !current)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                      >
                        <Link2 className="h-4 w-4" />
                        Direct URL
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-xs text-gray-500">
                    Drag and drop files here, paste screenshots, or choose multiple {mediaType} assets from the gallery.
                  </div>
                </div>

                {selectedAssets.length ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedAssets.length} asset(s) ready to send
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedAssets([])}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {selectedAssets.map((asset) => (
                        <div key={asset._id} className="overflow-hidden rounded-[24px] border border-gray-200 bg-white">
                          <div className="relative">
                            {renderAssetPreview(asset)}
                            <button
                              type="button"
                              onClick={() => removeAsset(asset._id)}
                              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="p-4">
                            <p className="truncate text-sm font-semibold text-gray-900">{asset.original_name}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatFileSize(asset.size_bytes)} • {asset.asset_type}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-6 text-center">
                    <UploadCloud className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600">No gallery assets selected yet</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Open the gallery to upload files or pick existing media from your server.
                    </p>
                  </div>
                )}

                {manualUrlOpen ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Direct URL Fallback
                    </p>
                    <input
                      value={mediaUrl}
                      onChange={(event) => setMediaUrl(event.target.value)}
                      placeholder="Media URL (https://...)"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                    />
                    {mediaType === 'document' ? (
                      <input
                        value={manualFilename}
                        onChange={(event) => setManualFilename(event.target.value)}
                        placeholder="Filename (e.g. report.pdf)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                      />
                    ) : null}
                  </div>
                ) : null}

                {mediaType !== 'audio' ? (
                  <input
                    value={mediaCaption}
                    onChange={(event) => setMediaCaption(event.target.value)}
                    placeholder="Caption (optional)"
                    className="mt-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
                  />
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 disabled:opacity-50"
            >
              {sending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending via Meta...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send via WhatsApp
                </>
              )}
            </button>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="sticky top-6 rounded-2xl border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
              </div>

              <div className="min-h-[320px] rounded-2xl bg-[#e5ddd5] p-4">
                {to ? (
                  <div className="mb-3 rounded-xl bg-[#075E54] px-4 py-2 text-white">
                    <p className="text-xs opacity-70">To</p>
                    <p className="text-sm font-medium">+{to.replace(/[^0-9]/g, '')}</p>
                  </div>
                ) : null}

                {mode === 'text' && text.trim() ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#d9fdd3] px-3 py-2 shadow-sm">
                      <p className="whitespace-pre-wrap text-sm text-gray-900">{text}</p>
                    </div>
                  </div>
                ) : null}

                {mode === 'template' && selectedTemplate ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#d9fdd3] px-3 py-2 shadow-sm">
                      {selectedTemplate.components?.map((component, index) => (
                        <div key={`${component.type}-${index}`}>
                          {component.type === 'HEADER' ? (
                            <p className="mb-1 text-sm font-bold text-gray-900">{component.text || `[${component.format}]`}</p>
                          ) : null}
                          {component.type === 'BODY' ? <p className="text-sm text-gray-900">{previewText()}</p> : null}
                          {component.type === 'FOOTER' ? (
                            <p className="mt-2 text-xs text-gray-500">{component.text}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {mode === 'media' ? (
                  selectedAssets.length ? (
                    <div className="space-y-3">
                      {selectedAssets.map((asset) => (
                        <div key={asset._id} className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#d9fdd3] p-3 shadow-sm">
                          {renderAssetPreview(asset)}
                          <p className="mt-2 truncate text-sm font-medium text-gray-900">{asset.original_name}</p>
                          {mediaCaption && asset.asset_type !== 'audio' ? (
                            <p className="mt-1 text-sm text-gray-700">{mediaCaption}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : mediaUrl ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-[#d9fdd3] px-3 py-2 shadow-sm">
                        <div className="rounded-lg bg-gray-200 p-4 text-center">
                          <p className="text-xs font-semibold uppercase text-gray-500">{mediaType}</p>
                          <p className="mt-1 truncate text-[10px] text-gray-400">{mediaUrl}</p>
                        </div>
                        {mediaCaption ? <p className="mt-2 text-sm text-gray-900">{mediaCaption}</p> : null}
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-48 items-center justify-center">
                      <p className="text-xs text-gray-500">Gallery media previews appear here</p>
                    </div>
                  )
                ) : null}

                {mode === 'text' && !text.trim() ? (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-xs text-gray-500">Preview appears here</p>
                  </div>
                ) : null}
              </div>

              {mode === 'template' ? (
                <div className="mt-4 rounded-xl bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700">
                    Template messages work outside the 24-hour window. Only Meta-approved templates can be used.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <MediaLibraryModal
        open={showLibrary}
        onClose={() => {
          setShowLibrary(false);
          setQueuedFiles([]);
        }}
        title="Choose Media"
        subtitle={`Pick ${mediaType} assets from your server library, or upload new ones without leaving the composer.`}
        allowedTypes={[mediaType]}
        allowMultiple
        queuedFiles={queuedFiles}
        onQueuedFilesHandled={() => setQueuedFiles([])}
        onSelect={(assets) => {
          setSelectedAssets((current) => mergeAssets(current, assets));
          setShowLibrary(false);
          setQueuedFiles([]);
          toast.success(`${assets.length} asset(s) selected`);
        }}
      />
      <MediaLibraryModal
        open={showTemplateHeaderLibrary}
        onClose={() => setShowTemplateHeaderLibrary(false)}
        title="Select Header Media"
        subtitle="Pick a media file for the selected template header."
        allowedTypes={templateHeaderLibraryType ? [templateHeaderLibraryType] : ['document']}
        onSelect={(assets) => {
          const first = assets?.[0];
          if (!first?.public_url) {
            toast.error('No valid media selected');
            return;
          }
          setTemplateHeaderUrl(first.public_url);
          setShowTemplateHeaderLibrary(false);
          toast.success('Header media selected');
        }}
      />
    </>
  );
}


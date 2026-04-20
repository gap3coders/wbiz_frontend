import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, Upload, Rocket, Eye, Plus, Trash2, GripVertical,
  Type, AlignLeft, ListChecks, CircleDot, CheckSquare, Calendar,
  Image, ToggleRight, Link2, ChevronDown, ChevronUp, Copy,
  Loader2, X, Check, Code2, MonitorSmartphone, Layers, FileText,
  Settings2, MoveUp, MoveDown, Smartphone, Maximize2, LayoutGrid,
} from 'lucide-react';

/* ── WhatsApp Flow Component Definitions ── */
const COMPONENT_TYPES = {
  // Text components
  TextHeading: { label: 'Heading', icon: Type, category: 'text', props: { text: '' } },
  TextSubheading: { label: 'Subheading', icon: Type, category: 'text', props: { text: '' } },
  TextBody: { label: 'Body Text', icon: AlignLeft, category: 'text', props: { text: '' } },
  TextCaption: { label: 'Caption', icon: AlignLeft, category: 'text', props: { text: '' } },
  // Input components (must be inside Form)
  TextInput: { label: 'Text Input', icon: Type, category: 'input', props: { name: '', label: '', required: false, 'input-type': 'text', 'helper-text': '' } },
  TextArea: { label: 'Text Area', icon: AlignLeft, category: 'input', props: { name: '', label: '', required: false, 'helper-text': '' } },
  Dropdown: { label: 'Dropdown', icon: ListChecks, category: 'input', props: { name: '', label: '', required: false, 'data-source': [] } },
  RadioButtonsGroup: { label: 'Radio Buttons', icon: CircleDot, category: 'input', props: { name: '', label: '', required: false, 'data-source': [] } },
  CheckboxGroup: { label: 'Checkboxes', icon: CheckSquare, category: 'input', props: { name: '', label: '', required: false, 'data-source': [] } },
  DatePicker: { label: 'Date Picker', icon: Calendar, category: 'input', props: { name: '', label: '', required: false } },
  OptIn: { label: 'Opt-in', icon: ToggleRight, category: 'input', props: { name: '', label: '', required: false, 'on-click-action': { name: '' } } },
  // Media
  Image: { label: 'Image', icon: Image, category: 'media', props: { src: '', 'scale-type': 'contain', height: 200 } },
  // Navigation
  EmbeddedLink: { label: 'Link', icon: Link2, category: 'interactive', props: { text: '', 'on-click-action': { name: 'navigate', next: { type: 'screen', name: '' }, payload: {} } } },
};

const INPUT_TYPES = ['text', 'number', 'email', 'password', 'passcode', 'phone'];

const CATEGORIES = [
  { key: 'SIGN_UP', label: 'Sign Up' },
  { key: 'SIGN_IN', label: 'Sign In' },
  { key: 'APPOINTMENT_BOOKING', label: 'Appointment Booking' },
  { key: 'LEAD_GENERATION', label: 'Lead Generation' },
  { key: 'CONTACT_US', label: 'Contact Us' },
  { key: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
  { key: 'SURVEY', label: 'Survey' },
  { key: 'OTHER', label: 'Other' },
];

const uid = () => Math.random().toString(36).slice(2, 8);

const makeDefaultScreen = (id = 'MAIN', title = 'Main Screen') => ({
  _uid: uid(),
  id,
  title,
  terminal: false,
  components: [],
});

const makeComponent = (type) => {
  const def = COMPONENT_TYPES[type];
  if (!def) return null;
  const comp = { _uid: uid(), type, ...JSON.parse(JSON.stringify(def.props)) };
  // Auto-generate name for input fields
  if (def.category === 'input') {
    comp.name = `${type.toLowerCase()}_${uid()}`;
  }
  // Default data-source with one option for dropdowns/radios/checkboxes
  if (comp['data-source'] !== undefined) {
    comp['data-source'] = [{ id: `opt_${uid()}`, title: 'Option 1' }];
  }
  return comp;
};

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════ */
export default function FlowBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Flow metadata
  const [flow, setFlow] = useState(null);
  const [flowName, setFlowName] = useState('');
  const [flowCategory, setFlowCategory] = useState('OTHER');
  const [loading, setLoading] = useState(!isNew);

  // Builder state
  const [screens, setScreens] = useState([makeDefaultScreen()]);
  const [activeScreenIdx, setActiveScreenIdx] = useState(0);
  const [selectedCompIdx, setSelectedCompIdx] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);
  const [showComponentPalette, setShowComponentPalette] = useState(false);
  const [jsonCopied, setJsonCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  const activeScreen = screens[activeScreenIdx] || screens[0];

  // ── Parse Meta flow JSON into builder screens ──
  const parseFlowJSON = (flowJson) => {
    try {
      const parsed = typeof flowJson === 'string' ? JSON.parse(flowJson) : flowJson;
      if (!parsed?.screens?.length) return null;

      const builderScreens = parsed.screens.map((screen) => {
        const components = [];
        const layout = screen.layout;
        if (!layout?.children) return { _uid: uid(), id: screen.id, title: screen.title || screen.id, terminal: !!screen.terminal, components: [] };

        const parseChildren = (children) => {
          for (const child of children) {
            // Skip Footer — we auto-generate it
            if (child.type === 'Footer') continue;

            // Form wrapper — recurse into its children
            if (child.type === 'Form') {
              if (child.children) parseChildren(child.children);
              continue;
            }

            const def = COMPONENT_TYPES[child.type];
            if (!def) continue;

            const comp = { _uid: uid(), type: child.type };

            if (def.category === 'text') {
              comp.text = child.text || '';
            } else if (def.category === 'input') {
              comp.name = child.name || `${child.type.toLowerCase()}_${uid()}`;
              comp.label = child.label || '';
              comp.required = !!child.required;
              if (child['helper-text'] !== undefined) comp['helper-text'] = child['helper-text'] || '';
              if (child.type === 'TextInput') comp['input-type'] = child['input-type'] || 'text';
              if (child['data-source']) {
                comp['data-source'] = (child['data-source'] || []).map((opt) => ({
                  id: opt.id || `opt_${uid()}`,
                  title: opt.title || '',
                }));
              } else if (['Dropdown', 'RadioButtonsGroup', 'CheckboxGroup'].includes(child.type)) {
                comp['data-source'] = [{ id: `opt_${uid()}`, title: 'Option 1' }];
              }
              if (child.type === 'OptIn') {
                comp['on-click-action'] = child['on-click-action'] || { name: '' };
              }
            } else if (child.type === 'Image') {
              comp.src = child.src || '';
              comp['scale-type'] = child['scale-type'] || 'contain';
              comp.height = child.height || 200;
            } else if (child.type === 'EmbeddedLink') {
              comp.text = child.text || 'Learn More';
              if (child['on-click-action']) comp['on-click-action'] = child['on-click-action'];
            }

            components.push(comp);
          }
        };

        parseChildren(layout.children);

        return {
          _uid: uid(),
          id: screen.id,
          title: screen.title || screen.id,
          terminal: !!screen.terminal,
          components,
        };
      });

      return builderScreens;
    } catch (e) {
      console.error('Failed to parse flow JSON:', e);
      return null;
    }
  };

  // ── Load existing flow ──
  useEffect(() => {
    if (!isNew) {
      (async () => {
        try {
          const { data } = await api.get(`/flows/${id}?refresh=true`);
          const f = data.data?.flow;
          setFlow(f);
          setFlowName(f?.name || '');
          setFlowCategory(f?.categories?.[0] || 'OTHER');
          setValidationErrors(f?.validation_errors || []);

          // Load existing flow JSON assets and populate builder screens
          try {
            const { data: assetData } = await api.get(`/flows/${id}/assets`);
            // Backend returns: { data: { assets: <Meta response> } }
            // Meta response is: { data: [{ name: 'flow.json', asset: {...} }] }
            const metaAssets = assetData?.data?.assets;
            const assetList = metaAssets?.data || metaAssets || [];
            const jsonAsset = Array.isArray(assetList) ? assetList.find((a) => a.name === 'flow.json') : null;

            console.log('[FlowBuilder] Asset response:', JSON.stringify(assetData?.data).slice(0, 500));
            console.log('[FlowBuilder] Found JSON asset:', !!jsonAsset);

            if (jsonAsset) {
              let flowJsonData = jsonAsset.asset;

              if (flowJsonData) {
                const builderScreens = parseFlowJSON(flowJsonData);
                if (builderScreens && builderScreens.length > 0) {
                  setScreens(builderScreens);
                  setActiveScreenIdx(0);
                  toast.success(`Loaded ${builderScreens.length} screen(s) from flow`);
                }
              }
            }
          } catch (e) {
            console.warn('Could not load flow assets:', e.message);
          }
        } catch (e) {
          toast.error('Failed to load flow');
          navigate('/portal/flows');
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isNew]);

  // ── Screen management ──
  const addScreen = () => {
    const num = screens.length + 1;
    const newScreen = makeDefaultScreen(`SCREEN_${num}`, `Screen ${num}`);
    setScreens([...screens, newScreen]);
    setActiveScreenIdx(screens.length);
    setSelectedCompIdx(-1);
  };

  const removeScreen = (idx) => {
    if (screens.length <= 1) return toast.error('Need at least one screen');
    const updated = screens.filter((_, i) => i !== idx);
    setScreens(updated);
    if (activeScreenIdx >= updated.length) setActiveScreenIdx(updated.length - 1);
    setSelectedCompIdx(-1);
  };

  const updateScreen = (idx, field, value) => {
    setScreens(screens.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const moveScreen = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= screens.length) return;
    const updated = [...screens];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setScreens(updated);
    setActiveScreenIdx(newIdx);
  };

  // ── Component management ──
  const addComponent = (type) => {
    const comp = makeComponent(type);
    if (!comp) return;
    const updated = [...screens];
    updated[activeScreenIdx] = {
      ...updated[activeScreenIdx],
      components: [...updated[activeScreenIdx].components, comp],
    };
    setScreens(updated);
    setSelectedCompIdx(updated[activeScreenIdx].components.length - 1);
    setShowComponentPalette(false);
  };

  const removeComponent = (compIdx) => {
    const updated = [...screens];
    updated[activeScreenIdx] = {
      ...updated[activeScreenIdx],
      components: updated[activeScreenIdx].components.filter((_, i) => i !== compIdx),
    };
    setScreens(updated);
    setSelectedCompIdx(-1);
  };

  const updateComponent = (compIdx, field, value) => {
    const updated = [...screens];
    const comps = [...updated[activeScreenIdx].components];
    comps[compIdx] = { ...comps[compIdx], [field]: value };
    updated[activeScreenIdx] = { ...updated[activeScreenIdx], components: comps };
    setScreens(updated);
  };

  const moveComponent = (compIdx, dir) => {
    const newIdx = compIdx + dir;
    const comps = activeScreen.components;
    if (newIdx < 0 || newIdx >= comps.length) return;
    const updated = [...screens];
    const updatedComps = [...comps];
    [updatedComps[compIdx], updatedComps[newIdx]] = [updatedComps[newIdx], updatedComps[compIdx]];
    updated[activeScreenIdx] = { ...updated[activeScreenIdx], components: updatedComps };
    setScreens(updated);
    setSelectedCompIdx(newIdx);
  };

  // ── Data source management (for dropdowns, radio, checkbox) ──
  const addDataSourceOption = (compIdx) => {
    const comp = activeScreen.components[compIdx];
    const ds = [...(comp['data-source'] || [])];
    ds.push({ id: `opt_${uid()}`, title: `Option ${ds.length + 1}` });
    updateComponent(compIdx, 'data-source', ds);
  };

  const removeDataSourceOption = (compIdx, optIdx) => {
    const comp = activeScreen.components[compIdx];
    const ds = (comp['data-source'] || []).filter((_, i) => i !== optIdx);
    updateComponent(compIdx, 'data-source', ds);
  };

  const updateDataSourceOption = (compIdx, optIdx, field, value) => {
    const comp = activeScreen.components[compIdx];
    const ds = [...(comp['data-source'] || [])];
    ds[optIdx] = { ...ds[optIdx], [field]: value };
    updateComponent(compIdx, 'data-source', ds);
  };

  // ── Build the WhatsApp Flow JSON (Meta official schema v3.1) ──
  const buildFlowJSON = useCallback(() => {
    const flowScreens = screens.map((screen, screenIdx) => {
      const nextScreen = screens[screenIdx + 1];
      const isTerminal = screen.terminal || !nextScreen;
      const formChildren = [];
      const inputNames = [];

      // ALL components go inside the Form children (text + inputs)
      screen.components.forEach((comp) => {
        const def = COMPONENT_TYPES[comp.type];
        if (!def) return;

        const built = { type: comp.type };

        if (def.category === 'text') {
          built.text = comp.text || comp.type;
        } else if (def.category === 'input') {
          built.name = comp.name || `field_${uid()}`;
          built.label = comp.label || built.name;
          if (comp.required) built.required = true;
          if (comp['helper-text']) built['helper-text'] = comp['helper-text'];
          if (comp.type === 'TextInput' && comp['input-type'] && comp['input-type'] !== 'text') {
            built['input-type'] = comp['input-type'];
          }
          if (comp['data-source'] && comp['data-source'].length > 0) {
            built['data-source'] = comp['data-source'].map(opt => ({
              id: String(opt.id || uid()),
              title: opt.title || 'Option',
            }));
          }
          inputNames.push(built.name);
        } else if (comp.type === 'Image') {
          built.src = comp.src || '';
          built['scale-type'] = comp['scale-type'] || 'contain';
          built.height = comp.height || 200;
        } else if (comp.type === 'EmbeddedLink') {
          built.text = comp.text || 'Learn More';
          if (comp['on-click-action']) {
            built['on-click-action'] = comp['on-click-action'];
          }
        }

        formChildren.push(built);
      });

      // Build payload from input names
      const payload = {};
      inputNames.forEach(name => {
        payload[name] = `\${form.${name}}`;
      });

      // Footer (always inside Form)
      const footer = {
        type: 'Footer',
        label: isTerminal ? 'Submit' : 'Continue',
        'on-click-action': {
          name: isTerminal ? 'complete' : 'navigate',
          ...(isTerminal ? {} : { next: { name: nextScreen.id } }),
          payload,
        },
      };
      formChildren.push(footer);

      return {
        id: screen.id,
        title: screen.title,
        ...(isTerminal ? { terminal: true } : {}),
        data: {},
        layout: {
          type: 'SingleColumnLayout',
          children: [
            {
              type: 'Form',
              name: 'form',
              children: formChildren,
            },
          ],
        },
      };
    });

    return {
      version: '3.1',
      screens: flowScreens,
    };
  }, [screens]);

  const flowJSON = useMemo(() => buildFlowJSON(), [buildFlowJSON]);

  // ── Create flow on Meta ──
  const handleCreate = async () => {
    if (!flowName.trim()) return toast.error('Flow name is required');
    setSaving(true);
    try {
      const { data } = await api.post('/flows', {
        name: flowName,
        categories: [flowCategory],
      });
      const newFlow = data.data?.flow;
      setFlow(newFlow);
      toast.success('Flow created on Meta');
      // Navigate to the builder URL with the new flow ID
      navigate(`/portal/flows/${newFlow._id}/builder`, { replace: true });
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create flow');
    } finally {
      setSaving(false);
    }
  };

  // ── Save JSON to Meta ──
  const handleSaveJSON = async () => {
    if (!flow) return toast.error('Create the flow first');
    setSaving(true);
    try {
      const json = buildFlowJSON();
      // Remove internal _uid fields for clean JSON
      const cleanJSON = JSON.parse(JSON.stringify(json, (key, value) => key === '_uid' ? undefined : value));
      await api.post(`/flows/${flow._id}/json`, { flow_json: cleanJSON });
      toast.success('Flow JSON uploaded to Meta');

      // Refresh to get validation status
      const { data } = await api.get(`/flows/${flow._id}?refresh=true`);
      const updated = data.data?.flow;
      setFlow(updated);
      setValidationErrors(updated?.validation_errors || []);

      if (updated?.validation_errors?.length > 0) {
        toast.error(`Meta found ${updated.validation_errors.length} validation error(s)`);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to upload JSON');
    } finally {
      setSaving(false);
    }
  };

  // ── Publish flow ──
  const handlePublish = async () => {
    if (!flow) return;
    if (!window.confirm('Publish this flow? Once published it cannot be edited, only deprecated.')) return;
    setPublishing(true);
    try {
      await api.post(`/flows/${flow._id}/publish`);
      toast.success('Flow published!');
      setFlow(prev => ({ ...prev, status: 'PUBLISHED' }));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  // ── Copy JSON ──
  const copyJSON = () => {
    const cleanJSON = JSON.parse(JSON.stringify(flowJSON, (key, value) => key === '_uid' ? undefined : value));
    navigator.clipboard.writeText(JSON.stringify(cleanJSON, null, 2));
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
    toast.success('JSON copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  const isDraft = !flow || flow.status === 'DRAFT';
  const isPublished = flow?.status === 'PUBLISHED';

  return (
    <div className="space-y-0 -mt-2">
      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-surface-200 -mx-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/portal/flows')}
              className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-[16px] font-extrabold text-surface-900">
                {isNew ? 'Create New Flow' : `Flow Builder — ${flow?.name || flowName}`}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {flow && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    flow.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    flow.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-surface-100 text-surface-600 border-surface-200'
                  }`}>
                    {flow.status}
                  </span>
                )}
                <span className="text-[11px] text-surface-400">{screens.length} screen{screens.length !== 1 ? 's' : ''}</span>
                {flow?.flow_id && (
                  <span className="text-[10px] text-surface-300 font-mono">ID: {flow.flow_id}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowJsonPreview(!showJsonPreview)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all ${
                showJsonPreview ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-600 border-surface-200 hover:bg-surface-50'
              }`}>
              <Code2 className="w-3.5 h-3.5" />
              JSON
            </button>
            {!flow && isNew && (
              <button onClick={handleCreate} disabled={saving || !flowName.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create on Meta
              </button>
            )}
            {flow && isDraft && (
              <>
                <button onClick={handleSaveJSON} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-surface-200 text-surface-700 text-[12px] font-semibold rounded-lg hover:bg-surface-50 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Save to Meta
                </button>
                <button onClick={handlePublish} disabled={publishing || validationErrors.length > 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-50">
                  {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                  Publish
                </button>
              </>
            )}
            {isPublished && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 text-[12px] font-bold rounded-lg border border-emerald-200">
                <Check className="w-3.5 h-3.5" /> Published
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── New Flow Setup (if no flow yet) ── */}
      {isNew && !flow && (
        <div className="max-w-xl mx-auto mt-8 space-y-6">
          <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-5">
            <div>
              <h2 className="text-[15px] font-bold text-surface-900 mb-1">Create WhatsApp Flow</h2>
              <p className="text-[12px] text-surface-400">This creates a DRAFT flow on Meta. You can then design screens and publish.</p>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Flow Name *</label>
              <input type="text" value={flowName} onChange={(e) => setFlowName(e.target.value)}
                placeholder="e.g. Customer Feedback Survey"
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-surface-700 mb-1.5">Category</label>
              <select value={flowCategory} onChange={(e) => setFlowCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-surface-200 text-[13px] text-surface-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all">
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ── Validation Errors ── */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <p className="text-[12px] font-bold text-red-800 mb-2">Meta Validation Errors ({validationErrors.length})</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-[11px] text-red-700">
                {err.error || err.message || JSON.stringify(err)}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Builder Layout ── */}
      {(flow || !isNew) && (
        <div className="flex gap-4 mt-4" style={{ minHeight: 'calc(100vh - 200px)' }}>

          {/* ═══ LEFT: Screen List ═══ */}
          <div className="w-56 flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-surface-700 uppercase tracking-wider">Screens</p>
              {isDraft && (
                <button onClick={addScreen} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors" title="Add Screen">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {screens.map((screen, idx) => (
                <div key={screen._uid}
                  onClick={() => { setActiveScreenIdx(idx); setSelectedCompIdx(-1); }}
                  className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                    activeScreenIdx === idx
                      ? 'bg-brand-50 border border-brand-200 text-brand-800'
                      : 'bg-white border border-surface-200 text-surface-700 hover:border-surface-300'
                  }`}>
                  <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${activeScreenIdx === idx ? 'text-brand-600' : 'text-surface-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold truncate">{screen.title || screen.id}</p>
                    <p className="text-[10px] text-surface-400 font-mono">{screen.id}</p>
                  </div>
                  {isDraft && screens.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); removeScreen(idx); }}
                      className="p-1 rounded text-surface-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Screen properties */}
            {activeScreen && isDraft && (
              <div className="bg-white rounded-xl border border-surface-200 p-3 space-y-3">
                <p className="text-[11px] font-bold text-surface-500 uppercase tracking-wider">Screen Settings</p>
                <div>
                  <label className="block text-[10px] font-semibold text-surface-500 mb-1">Screen ID</label>
                  <input type="text" value={activeScreen.id}
                    onChange={(e) => updateScreen(activeScreenIdx, 'id', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] font-mono text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-surface-500 mb-1">Title</label>
                  <input type="text" value={activeScreen.title}
                    onChange={(e) => updateScreen(activeScreenIdx, 'title', e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={activeScreen.terminal || false}
                    onChange={(e) => updateScreen(activeScreenIdx, 'terminal', e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-[11px] text-surface-600 font-medium">Terminal screen</span>
                </label>
                <div className="flex gap-1">
                  <button onClick={() => moveScreen(activeScreenIdx, -1)} disabled={activeScreenIdx === 0}
                    className="flex-1 p-1.5 rounded-lg border border-surface-200 text-surface-400 hover:bg-surface-50 disabled:opacity-30 transition-all">
                    <MoveUp className="w-3 h-3 mx-auto" />
                  </button>
                  <button onClick={() => moveScreen(activeScreenIdx, 1)} disabled={activeScreenIdx === screens.length - 1}
                    className="flex-1 p-1.5 rounded-lg border border-surface-200 text-surface-400 hover:bg-surface-50 disabled:opacity-30 transition-all">
                    <MoveDown className="w-3 h-3 mx-auto" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ CENTER: Canvas / Phone Preview ═══ */}
          <div className="flex-1 flex flex-col items-center">
            {/* Phone frame */}
            <div className="w-[360px] bg-[#0B141A] rounded-[2rem] p-2.5 shadow-2xl">
              {/* Status bar */}
              <div className="bg-[#1F2C33] rounded-t-[1.4rem] px-5 py-2.5 flex items-center justify-between">
                <span className="text-[11px] text-white/60 font-medium">9:41</span>
                <span className="text-[11px] text-white font-semibold truncate max-w-[200px]">{activeScreen?.title || 'Screen'}</span>
                <span className="text-[11px] text-white/60">✕</span>
              </div>
              {/* Screen content */}
              <div className="bg-white min-h-[480px] max-h-[520px] overflow-y-auto px-4 py-4 space-y-3">
                {activeScreen?.components.length === 0 ? (
                  <div className="py-16 text-center">
                    <LayoutGrid className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                    <p className="text-[12px] text-surface-400 font-medium">Empty screen</p>
                    <p className="text-[10px] text-surface-300 mt-1">Add components from the palette</p>
                    {isDraft && (
                      <button onClick={() => setShowComponentPalette(true)}
                        className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white text-[11px] font-semibold rounded-lg hover:bg-brand-700 transition-colors">
                        <Plus className="w-3 h-3" /> Add Component
                      </button>
                    )}
                  </div>
                ) : (
                  activeScreen.components.map((comp, idx) => (
                    <ComponentPreview
                      key={comp._uid}
                      comp={comp}
                      idx={idx}
                      selected={selectedCompIdx === idx}
                      editable={isDraft}
                      onClick={() => setSelectedCompIdx(idx)}
                      onRemove={() => removeComponent(idx)}
                      onMoveUp={() => moveComponent(idx, -1)}
                      onMoveDown={() => moveComponent(idx, 1)}
                      isFirst={idx === 0}
                      isLast={idx === activeScreen.components.length - 1}
                    />
                  ))
                )}

                {/* Footer area preview */}
                {activeScreen?.components.length > 0 && (
                  <div className="pt-3 border-t border-surface-100">
                    <div className="w-full py-3 bg-[#00A884] rounded-xl text-center">
                      <span className="text-[14px] font-semibold text-white">
                        {activeScreen.terminal || activeScreenIdx === screens.length - 1 ? 'Submit' : 'Continue'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {/* Bottom bar */}
              <div className="bg-[#1F2C33] rounded-b-[1.4rem] h-6 flex items-center justify-center">
                <div className="w-24 h-1 bg-white/20 rounded-full" />
              </div>
            </div>

            {/* Add component button below phone */}
            {isDraft && (
              <button onClick={() => setShowComponentPalette(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-surface-200 text-surface-600 text-[12px] font-semibold rounded-lg hover:bg-surface-50 hover:border-surface-300 transition-all">
                <Plus className="w-3.5 h-3.5" />
                Add Component
              </button>
            )}
          </div>

          {/* ═══ RIGHT: Property Panel ═══ */}
          <div className="w-72 flex-shrink-0">
            {selectedCompIdx >= 0 && activeScreen.components[selectedCompIdx] ? (
              <ComponentProperties
                comp={activeScreen.components[selectedCompIdx]}
                idx={selectedCompIdx}
                screens={screens}
                editable={isDraft}
                onUpdate={(field, val) => updateComponent(selectedCompIdx, field, val)}
                onAddOption={() => addDataSourceOption(selectedCompIdx)}
                onRemoveOption={(optIdx) => removeDataSourceOption(selectedCompIdx, optIdx)}
                onUpdateOption={(optIdx, field, val) => updateDataSourceOption(selectedCompIdx, optIdx, field, val)}
              />
            ) : (
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                <Settings2 className="w-6 h-6 text-surface-300 mx-auto mb-2" />
                <p className="text-[12px] text-surface-400 font-medium">Select a component to edit properties</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Component Palette Modal ═══ */}
      {showComponentPalette && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowComponentPalette(false)}>
          <div className="bg-white rounded-2xl border border-surface-200 shadow-2xl w-full max-w-lg mx-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
              <h2 className="text-[15px] font-extrabold text-surface-900">Add Component</h2>
              <button onClick={() => setShowComponentPalette(false)} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-surface-400" />
              </button>
            </div>
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Text */}
              <div>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Text</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(COMPONENT_TYPES).filter(([_, def]) => def.category === 'text').map(([key, def]) => (
                    <button key={key} onClick={() => addComponent(key)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-brand-50/30 text-left transition-all">
                      <def.icon className="w-4 h-4 text-surface-500" />
                      <span className="text-[12px] font-semibold text-surface-800">{def.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Input */}
              <div>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Form Inputs</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(COMPONENT_TYPES).filter(([_, def]) => def.category === 'input').map(([key, def]) => (
                    <button key={key} onClick={() => addComponent(key)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-brand-50/30 text-left transition-all">
                      <def.icon className="w-4 h-4 text-brand-600" />
                      <span className="text-[12px] font-semibold text-surface-800">{def.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Media & Interactive */}
              <div>
                <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Media & Interactive</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(COMPONENT_TYPES).filter(([_, def]) => ['media', 'interactive'].includes(def.category)).map(([key, def]) => (
                    <button key={key} onClick={() => addComponent(key)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-surface-200 hover:border-brand-300 hover:bg-brand-50/30 text-left transition-all">
                      <def.icon className="w-4 h-4 text-violet-600" />
                      <span className="text-[12px] font-semibold text-surface-800">{def.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ JSON Preview Panel ═══ */}
      {showJsonPreview && (
        <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-surface-900 shadow-2xl z-40 flex flex-col animate-fade-in-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-surface-400" />
              <span className="text-[13px] font-bold text-white">Flow JSON Preview</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyJSON}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-surface-300 hover:text-white hover:bg-surface-700 transition-all">
                {jsonCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {jsonCopied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => setShowJsonPreview(false)} className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-700 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <pre className="text-[11px] leading-relaxed text-surface-300 font-mono whitespace-pre">
              {JSON.stringify(
                JSON.parse(JSON.stringify(flowJSON, (key, value) => key === '_uid' ? undefined : value)),
                null, 2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   ComponentPreview — renders a component in the phone preview
   ────────────────────────────────────────────────────────── */
function ComponentPreview({ comp, idx, selected, editable, onClick, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const def = COMPONENT_TYPES[comp.type];
  if (!def) return null;

  return (
    <div
      onClick={onClick}
      className={`relative group rounded-lg px-2 py-1.5 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-brand-500 ring-offset-1 bg-brand-50/30' : 'hover:bg-surface-50'
      }`}
    >
      {/* Toolbar */}
      {selected && editable && (
        <div className="absolute -top-2.5 right-0 flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-surface-200 px-1 py-0.5 z-10">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}
            className="p-1 rounded text-surface-400 hover:text-surface-700 disabled:opacity-30 transition-colors">
            <MoveUp className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}
            className="p-1 rounded text-surface-400 hover:text-surface-700 disabled:opacity-30 transition-colors">
            <MoveDown className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Component preview rendering */}
      {comp.type === 'TextHeading' && (
        <p className="text-[16px] font-bold text-[#1B1B1B]">{comp.text || 'Heading text'}</p>
      )}
      {comp.type === 'TextSubheading' && (
        <p className="text-[14px] font-semibold text-[#1B1B1B]">{comp.text || 'Subheading text'}</p>
      )}
      {comp.type === 'TextBody' && (
        <p className="text-[13px] text-[#4A4A4A] leading-relaxed">{comp.text || 'Body text goes here...'}</p>
      )}
      {comp.type === 'TextCaption' && (
        <p className="text-[11px] text-[#8A8A8A]">{comp.text || 'Caption text'}</p>
      )}
      {comp.type === 'TextInput' && (
        <div>
          <p className="text-[11px] font-semibold text-[#4A4A4A] mb-1">{comp.label || 'Text Input'}</p>
          <div className="border border-[#D1D1D1] rounded-lg px-3 py-2 bg-white">
            <span className="text-[12px] text-[#B3B3B3]">Enter {comp.label || 'text'}...</span>
          </div>
          {comp['helper-text'] && <p className="text-[10px] text-[#8A8A8A] mt-0.5">{comp['helper-text']}</p>}
        </div>
      )}
      {comp.type === 'TextArea' && (
        <div>
          <p className="text-[11px] font-semibold text-[#4A4A4A] mb-1">{comp.label || 'Text Area'}</p>
          <div className="border border-[#D1D1D1] rounded-lg px-3 py-2 bg-white min-h-[60px]">
            <span className="text-[12px] text-[#B3B3B3]">Enter {comp.label || 'text'}...</span>
          </div>
        </div>
      )}
      {comp.type === 'Dropdown' && (
        <div>
          <p className="text-[11px] font-semibold text-[#4A4A4A] mb-1">{comp.label || 'Dropdown'}</p>
          <div className="border border-[#D1D1D1] rounded-lg px-3 py-2 bg-white flex items-center justify-between">
            <span className="text-[12px] text-[#B3B3B3]">Select an option</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8A8A8A]" />
          </div>
        </div>
      )}
      {comp.type === 'RadioButtonsGroup' && (
        <div>
          <p className="text-[11px] font-semibold text-[#4A4A4A] mb-1.5">{comp.label || 'Radio Buttons'}</p>
          <div className="space-y-1.5">
            {(comp['data-source'] || []).slice(0, 3).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border-2 ${i === 0 ? 'border-[#00A884] bg-[#00A884]/10' : 'border-[#D1D1D1]'}`}>
                  {i === 0 && <div className="w-2 h-2 rounded-full bg-[#00A884] m-[2px]" />}
                </div>
                <span className="text-[12px] text-[#4A4A4A]">{opt.title || `Option ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {comp.type === 'CheckboxGroup' && (
        <div>
          <p className="text-[11px] font-semibold text-[#4A4A4A] mb-1.5">{comp.label || 'Checkboxes'}</p>
          <div className="space-y-1.5">
            {(comp['data-source'] || []).slice(0, 3).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded border-2 ${i === 0 ? 'border-[#00A884] bg-[#00A884]' : 'border-[#D1D1D1]'}`}>
                  {i === 0 && <Check className="w-2.5 h-2.5 text-white m-[1px]" />}
                </div>
                <span className="text-[12px] text-[#4A4A4A]">{opt.title || `Option ${i + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {comp.type === 'DatePicker' && (
        <div>
          <p className="text-[11px] font-semibold text-[#4A4A4A] mb-1">{comp.label || 'Date'}</p>
          <div className="border border-[#D1D1D1] rounded-lg px-3 py-2 bg-white flex items-center justify-between">
            <span className="text-[12px] text-[#B3B3B3]">Select date</span>
            <Calendar className="w-3.5 h-3.5 text-[#8A8A8A]" />
          </div>
        </div>
      )}
      {comp.type === 'OptIn' && (
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded border-2 border-[#D1D1D1] mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[#4A4A4A] leading-relaxed">{comp.label || 'I agree to the terms and conditions'}</p>
        </div>
      )}
      {comp.type === 'Image' && (
        <div className="bg-surface-100 rounded-lg flex items-center justify-center" style={{ height: comp.height || 200 }}>
          {comp.src ? (
            <img src={comp.src} alt="" className="w-full h-full object-contain rounded-lg" />
          ) : (
            <div className="text-center">
              <Image className="w-8 h-8 text-surface-300 mx-auto mb-1" />
              <p className="text-[10px] text-surface-400">Image</p>
            </div>
          )}
        </div>
      )}
      {comp.type === 'EmbeddedLink' && (
        <p className="text-[13px] text-[#00A884] underline">{comp.text || 'Learn More'}</p>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   ComponentProperties — property editor panel
   ────────────────────────────────────────────────────────── */
function ComponentProperties({ comp, idx, screens, editable, onUpdate, onAddOption, onRemoveOption, onUpdateOption }) {
  const def = COMPONENT_TYPES[comp.type];
  if (!def) return null;

  const TIcon = def.icon;

  return (
    <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-100 bg-surface-50/50">
        <TIcon className="w-4 h-4 text-brand-600" />
        <span className="text-[13px] font-bold text-surface-900">{def.label}</span>
        <span className="text-[10px] text-surface-400 font-mono ml-auto">{comp.type}</span>
      </div>

      <div className="p-4 space-y-3.5 max-h-[500px] overflow-y-auto">
        {/* Text property */}
        {comp.text !== undefined && def.category === 'text' && (
          <div>
            <label className="block text-[10px] font-semibold text-surface-500 mb-1">Text Content</label>
            <textarea value={comp.text} onChange={(e) => onUpdate('text', e.target.value)}
              disabled={!editable} rows={3}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none disabled:opacity-50" />
          </div>
        )}

        {/* Input field properties */}
        {def.category === 'input' && (
          <>
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 mb-1">Field Name (key)</label>
              <input type="text" value={comp.name || ''} onChange={(e) => onUpdate('name', e.target.value.replace(/[^a-z0-9_]/gi, '_'))}
                disabled={!editable}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] font-mono text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 mb-1">Label</label>
              <input type="text" value={comp.label || ''} onChange={(e) => onUpdate('label', e.target.value)}
                disabled={!editable}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={comp.required || false} onChange={(e) => onUpdate('required', e.target.checked)}
                disabled={!editable}
                className="w-3.5 h-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
              <span className="text-[11px] text-surface-600 font-medium">Required field</span>
            </label>
            {comp['helper-text'] !== undefined && (
              <div>
                <label className="block text-[10px] font-semibold text-surface-500 mb-1">Helper Text</label>
                <input type="text" value={comp['helper-text'] || ''} onChange={(e) => onUpdate('helper-text', e.target.value)}
                  disabled={!editable}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50" />
              </div>
            )}
            {comp.type === 'TextInput' && (
              <div>
                <label className="block text-[10px] font-semibold text-surface-500 mb-1">Input Type</label>
                <select value={comp['input-type'] || 'text'} onChange={(e) => onUpdate('input-type', e.target.value)}
                  disabled={!editable}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50">
                  {INPUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        {/* Data source for dropdowns, radios, checkboxes */}
        {comp['data-source'] !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold text-surface-500">Options</label>
              {editable && (
                <button onClick={onAddOption}
                  className="text-[10px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-0.5">
                  <Plus className="w-3 h-3" /> Add
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {(comp['data-source'] || []).map((opt, optIdx) => (
                <div key={optIdx} className="flex items-center gap-1.5">
                  <input type="text" value={opt.title} onChange={(e) => onUpdateOption(optIdx, 'title', e.target.value)}
                    disabled={!editable} placeholder={`Option ${optIdx + 1}`}
                    className="flex-1 px-2 py-1 rounded border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 transition-all disabled:opacity-50" />
                  <input type="text" value={opt.id} onChange={(e) => onUpdateOption(optIdx, 'id', e.target.value)}
                    disabled={!editable} placeholder="ID"
                    className="w-16 px-2 py-1 rounded border border-surface-200 text-[10px] font-mono text-surface-500 focus:border-brand-500 transition-all disabled:opacity-50" />
                  {editable && (comp['data-source'] || []).length > 1 && (
                    <button onClick={() => onRemoveOption(optIdx)}
                      className="p-0.5 text-surface-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image properties */}
        {comp.type === 'Image' && (
          <>
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 mb-1">Image URL</label>
              <input type="text" value={comp.src || ''} onChange={(e) => onUpdate('src', e.target.value)}
                disabled={!editable} placeholder="https://..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 mb-1">Height (px)</label>
              <input type="number" value={comp.height || 200} onChange={(e) => onUpdate('height', parseInt(e.target.value) || 200)}
                disabled={!editable}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-surface-500 mb-1">Scale Type</label>
              <select value={comp['scale-type'] || 'contain'} onChange={(e) => onUpdate('scale-type', e.target.value)}
                disabled={!editable}
                className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50">
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </div>
          </>
        )}

        {/* EmbeddedLink */}
        {comp.type === 'EmbeddedLink' && (
          <div>
            <label className="block text-[10px] font-semibold text-surface-500 mb-1">Link Text</label>
            <input type="text" value={comp.text || ''} onChange={(e) => onUpdate('text', e.target.value)}
              disabled={!editable}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all disabled:opacity-50" />
          </div>
        )}

        {/* OptIn */}
        {comp.type === 'OptIn' && (
          <div>
            <label className="block text-[10px] font-semibold text-surface-500 mb-1">Consent Text</label>
            <textarea value={comp.label || ''} onChange={(e) => onUpdate('label', e.target.value)}
              disabled={!editable} rows={2}
              className="w-full px-2.5 py-1.5 rounded-lg border border-surface-200 text-[11px] text-surface-900 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 transition-all resize-none disabled:opacity-50" />
          </div>
        )}
      </div>
    </div>
  );
}

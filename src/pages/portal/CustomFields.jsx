import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, GripVertical, X, Loader2,
  Hash, Type, Calendar, List, Mail, Link, Phone,
  AlignLeft, ToggleLeft, ChevronDown, AlertTriangle,
  Settings2, CheckCircle2, Shield,
} from 'lucide-react';

/* ── Field type config ── */
const FIELD_TYPES = [
  { value: 'text', label: 'Text', color: 'bg-blue-50 text-blue-700' },
  { value: 'number', label: 'Number', color: 'bg-emerald-50 text-emerald-700' },
  { value: 'date', label: 'Date', color: 'bg-purple-50 text-purple-700' },
  { value: 'select', label: 'Select', color: 'bg-amber-50 text-amber-700' },
  { value: 'multi_select', label: 'Multi Select', color: 'bg-orange-50 text-orange-700' },
  { value: 'email', label: 'Email', color: 'bg-cyan-50 text-cyan-700' },
  { value: 'url', label: 'URL', color: 'bg-indigo-50 text-indigo-700' },
  { value: 'phone', label: 'Phone', color: 'bg-rose-50 text-rose-700' },
  { value: 'textarea', label: 'Long Text', color: 'bg-slate-50 text-slate-700' },
  { value: 'boolean', label: 'Yes/No', color: 'bg-teal-50 text-teal-700' },
];

const typeConfig = (val) => FIELD_TYPES.find((t) => t.value === val) || FIELD_TYPES[0];

const toFieldName = (label) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const INITIAL_FORM = {
  field_label: '',
  field_type: 'text',
  options: '',
  is_required: false,
  placeholder: '',
  default_value: '',
  is_active: true,
};

export default function CustomFields() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  // delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);

  // drag state
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  /* ── Fetch ── */
  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/custom-fields');
      const d = data?.data || data;
      setFields(d.fields || []);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to load custom fields');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  /* ── Stats ── */
  const totalFields = fields.length;
  const activeFields = fields.filter((f) => f.is_active !== false).length;
  const requiredFields = fields.filter((f) => f.is_required).length;

  /* ── Modal helpers ── */
  const openAdd = () => {
    setEditingField(null);
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const openEdit = (field) => {
    setEditingField(field);
    setForm({
      field_label: field.field_label || '',
      field_type: field.field_type || 'text',
      options: Array.isArray(field.options) ? field.options.join(', ') : field.options || '',
      is_required: !!field.is_required,
      placeholder: field.placeholder || '',
      default_value: field.default_value || '',
      is_active: field.is_active !== false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingField(null);
    setForm(INITIAL_FORM);
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!form.field_label.trim()) {
      toast.error('Field label is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        field_label: form.field_label.trim(),
        field_type: form.field_type,
        options:
          form.field_type === 'select' || form.field_type === 'multi_select'
            ? form.options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : [],
        is_required: form.is_required,
        placeholder: form.placeholder.trim(),
        default_value: form.default_value.trim(),
        is_active: form.is_active,
      };

      if (editingField) {
        await api.put(`/custom-fields/${editingField._id}`, payload);
        toast.success('Field updated');
      } else {
        await api.post('/custom-fields', payload);
        toast.success('Field created');
      }
      closeModal();
      await fetchFields();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save field');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/custom-fields/${deleteTarget._id}`);
      toast.success('Field deleted');
      setDeleteTarget(null);
      await fetchFields();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to delete field');
    }
  };

  /* ── Toggle active ── */
  const toggleActive = async (field) => {
    try {
      await api.put(`/custom-fields/${field._id}`, { is_active: !field.is_active });
      toast.success(field.is_active ? 'Field deactivated' : 'Field activated');
      await fetchFields();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update field');
    }
  };

  /* ── Drag & drop reorder ── */
  const handleDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }

    const reordered = [...fields];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setFields(reordered);
    setDragIndex(null);

    try {
      await api.post('/custom-fields/reorder', {
        fields: reordered.map((f, i) => ({ id: f._id, sort_order: i })),
      });
      toast.success('Fields reordered');
    } catch (e) {
      toast.error('Failed to reorder fields');
      await fetchFields();
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  /* ── Options chip preview ── */
  const optionChips = form.options
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  /* ── Render ── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-surface-900 flex items-center gap-2">
            <Settings2 size={22} className="text-brand-500" />
            Custom Fields
          </h1>
          <p className="text-[13px] text-surface-400 mt-1">
            Define custom data fields for your contacts
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Fields', value: totalFields, icon: Hash, color: 'text-blue-600 bg-blue-50' },
          { label: 'Active Fields', value: activeFields, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Required Fields', value: requiredFields, icon: Shield, color: 'text-amber-600 bg-amber-50' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-[22px] font-bold text-surface-900">{stat.value}</p>
              <p className="text-[12px] text-surface-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Field list */}
      <div className="bg-white rounded-xl border border-surface-200">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-surface-300" />
          </div>
        ) : fields.length === 0 ? (
          <div className="text-center py-20">
            <Settings2 size={40} className="mx-auto text-surface-200 mb-3" />
            <p className="text-[14px] font-semibold text-surface-900">No custom fields yet</p>
            <p className="text-[13px] text-surface-400 mt-1">
              Create your first custom field to start collecting additional contact data.
            </p>
            <button
              onClick={openAdd}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-[13px] font-semibold transition-colors"
            >
              <Plus size={16} />
              Add Field
            </button>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {fields.map((field, index) => {
              const tc = typeConfig(field.field_type);
              const isOver = dragOverIndex === index;
              return (
                <div
                  key={field._id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    dragIndex === index ? 'opacity-40' : ''
                  } ${isOver ? 'bg-brand-500/5 border-l-2 border-brand-500' : 'hover:bg-surface-50'} ${
                    field.is_active === false ? 'opacity-60' : ''
                  }`}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab text-surface-300 hover:text-surface-500 shrink-0">
                    <GripVertical size={16} />
                  </div>

                  {/* Label + field name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-surface-900 truncate">
                      {field.field_label}
                    </p>
                    <p className="text-[11px] text-surface-400 truncate">
                      {field.field_name || toFieldName(field.field_label)}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${tc.color}`}
                  >
                    {tc.label}
                  </span>

                  {/* Required badge */}
                  {field.is_required && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">
                      Required
                    </span>
                  )}

                  {/* Active toggle */}
                  <button
                    onClick={() => toggleActive(field)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                      field.is_active !== false ? 'bg-brand-500' : 'bg-surface-200'
                    }`}
                    title={field.is_active !== false ? 'Active' : 'Inactive'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                        field.is_active !== false ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEdit(field)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(field)}
                    className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200">
              <h2 className="text-[15px] font-bold text-surface-900">
                {editingField ? 'Edit Field' : 'Add Custom Field'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {/* Field Label */}
              <div>
                <label className="block text-[13px] font-semibold text-surface-900 mb-1">
                  Field Label
                </label>
                <input
                  type="text"
                  value={form.field_label}
                  onChange={(e) => setForm({ ...form, field_label: e.target.value })}
                  placeholder="e.g. Company Name"
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
                {form.field_label.trim() && (
                  <p className="text-[11px] text-surface-400 mt-1">
                    field_name: <span className="font-mono">{toFieldName(form.field_label)}</span>
                  </p>
                )}
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-[13px] font-semibold text-surface-900 mb-1">
                  Field Type
                </label>
                <div className="relative">
                  <select
                    value={form.field_type}
                    onChange={(e) => setForm({ ...form, field_type: e.target.value })}
                    className="w-full appearance-none px-3 py-2 rounded-lg border border-surface-200 text-[13px] text-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors pr-8"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Options (select / multi_select only) */}
              {(form.field_type === 'select' || form.field_type === 'multi_select') && (
                <div>
                  <label className="block text-[13px] font-semibold text-surface-900 mb-1">
                    Options
                  </label>
                  <input
                    type="text"
                    value={form.options}
                    onChange={(e) => setForm({ ...form, options: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full px-3 py-2 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                  />
                  {optionChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {optionChips.map((chip, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-100 text-surface-600 text-[11px] font-medium"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-semibold text-surface-900">Required</label>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_required: !form.is_required })}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                    form.is_required ? 'bg-brand-500' : 'bg-surface-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
                      form.is_required ? 'translate-x-[18px]' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Placeholder */}
              <div>
                <label className="block text-[13px] font-semibold text-surface-900 mb-1">
                  Placeholder
                </label>
                <input
                  type="text"
                  value={form.placeholder}
                  onChange={(e) => setForm({ ...form, placeholder: e.target.value })}
                  placeholder="Placeholder text shown to users"
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Default Value */}
              <div>
                <label className="block text-[13px] font-semibold text-surface-900 mb-1">
                  Default Value
                </label>
                <input
                  type="text"
                  value={form.default_value}
                  onChange={(e) => setForm({ ...form, default_value: e.target.value })}
                  placeholder="Default value for this field"
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 text-[13px] text-surface-900 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-[13px] font-semibold transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingField ? 'Save Changes' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-6 py-5 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <AlertTriangle size={22} className="text-red-500" />
              </div>
              <h3 className="text-[15px] font-bold text-surface-900">Delete Field</h3>
              <p className="text-[13px] text-surface-400 mt-2">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-surface-900">
                  {deleteTarget.field_label}
                </span>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-200">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-surface-600 hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[13px] font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Star,
  Check,
  Loader2,
  X,
  Package,
  MessageSquare,
  Users as UsersIcon,
  Megaphone,
  FileText,
  HardDrive,
  Contact,
  Clock,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const initialFormState = {
  name: '',
  slug: '',
  description: '',
  price_monthly: 0,
  price_yearly: 0,
  currency: '₹',
  message_limit: 0,
  seats_limit: 1,
  features: '',
  is_popular: false,
  is_active: true,
  campaign_limit_monthly: 0,
  template_limit: 0,
  media_storage_mb: 0,
  contact_limit: 0,
  trial_days: 0,
};

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/admin/plans');
      setPlans(res.data.data?.plans || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plans');
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingId(plan._id);
      setFormData({
        ...initialFormState,
        ...plan,
        features: Array.isArray(plan.features) ? plan.features.join('\n') : plan.features || '',
      });
    } else {
      setEditingId(null);
      setFormData(initialFormState);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialFormState);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Name and slug are required');
      return;
    }
    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        features: formData.features
          .split('\n')
          .map((f) => f.trim())
          .filter((f) => f),
      };
      if (editingId) {
        await api.put(`/admin/plans/${editingId}`, submitData);
        toast.success('Plan updated successfully');
      } else {
        await api.post('/admin/plans', submitData);
        toast.success('Plan created successfully');
      }
      fetchPlans();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/plans/${deleteTarget._id}`);
      toast.success('Plan deleted successfully');
      setDeleteTarget(null);
      fetchPlans();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete plan');
    } finally {
      setDeleting(false);
    }
  };

  const limitItems = (plan) => [
    { icon: MessageSquare, label: 'Messages', value: plan.message_limit?.toLocaleString() },
    { icon: UsersIcon, label: 'Seats', value: plan.seats_limit },
    { icon: Megaphone, label: 'Campaigns/mo', value: plan.campaign_limit_monthly },
    { icon: FileText, label: 'Templates', value: plan.template_limit },
    { icon: HardDrive, label: 'Storage', value: plan.media_storage_mb ? `${plan.media_storage_mb} MB` : '0' },
    { icon: Contact, label: 'Contacts', value: plan.contact_limit?.toLocaleString() },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error && plans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-800">{error}</p>
          </div>
          <button
            onClick={fetchPlans}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[12px] font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">Plans</h1>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-100 text-[12px] font-bold text-surface-600">
            {plans.length}
          </span>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[13px] rounded-lg px-4 py-2.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-16 text-center">
          <Package className="w-12 h-12 text-surface-200 mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-surface-600 mb-1">No plans yet</p>
          <p className="text-[12px] text-surface-400 mb-4">Create your first subscription plan to get started</p>
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[13px] rounded-lg px-4 py-2.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`bg-white rounded-xl border overflow-hidden flex flex-col transition-shadow ${
                plan.is_popular
                  ? 'border-brand-500/30 shadow-md shadow-brand-500/5'
                  : 'border-surface-200 hover:shadow-sm'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[18px] font-extrabold text-surface-900 truncate">
                        {plan.name}
                      </h2>
                      {plan.is_popular && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 flex-shrink-0">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span className="text-[10px] font-bold text-amber-700">POPULAR</span>
                        </span>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-[12px] text-surface-500 mt-1 line-clamp-2">{plan.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      plan.is_active
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Price */}
                <div className="bg-surface-50 rounded-lg p-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-extrabold text-surface-900">
                      {plan.currency}{plan.price_monthly}
                    </span>
                    <span className="text-[12px] font-semibold text-surface-400">/mo</span>
                  </div>
                  {plan.price_yearly > 0 && (
                    <p className="text-[11px] text-surface-500 mt-0.5">
                      {plan.currency}{plan.price_yearly}/yr
                    </p>
                  )}
                </div>

                {/* Features */}
                {plan.features?.length > 0 && (
                  <div className="space-y-1.5">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                        <span className="text-[12px] text-surface-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Limits */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-surface-100">
                  {limitItems(plan).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <item.icon className="w-3 h-3 text-surface-400 flex-shrink-0" />
                      <span className="text-[11px] text-surface-500 truncate">
                        {item.value || 0} {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subscribers */}
                <div className="flex items-center gap-1.5 text-[11px] text-surface-400">
                  <UsersIcon className="w-3 h-3" />
                  <span>{plan.tenant_count || 0} subscribers</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex border-t border-surface-100">
                <button
                  onClick={() => handleOpenModal(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold text-surface-600 hover:bg-surface-50 transition-colors border-r border-surface-100"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-surface-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-surface-100 bg-white z-10">
              <h2 className="text-[16px] font-bold text-surface-900">
                {editingId ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Section: Basic Info */}
              <div>
                <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-3">
                  Basic Info
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Name" name="name" value={formData.name} onChange={handleInputChange} required />
                  <InputField label="Slug" name="slug" value={formData.slug} onChange={handleInputChange} required />
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="2"
                    className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Section: Pricing */}
              <div>
                <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-3">
                  Pricing
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <InputField
                    label="Monthly Price"
                    name="price_monthly"
                    type="number"
                    value={formData.price_monthly}
                    onChange={handleInputChange}
                  />
                  <InputField
                    label="Yearly Price"
                    name="price_yearly"
                    type="number"
                    value={formData.price_yearly}
                    onChange={handleInputChange}
                  />
                  <InputField
                    label="Currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Section: Limits */}
              <div>
                <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-3">
                  Limits
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Message Limit" name="message_limit" type="number" value={formData.message_limit} onChange={handleInputChange} />
                  <InputField label="Seats Limit" name="seats_limit" type="number" value={formData.seats_limit} onChange={handleInputChange} />
                  <InputField label="Campaigns/Month" name="campaign_limit_monthly" type="number" value={formData.campaign_limit_monthly} onChange={handleInputChange} />
                  <InputField label="Template Limit" name="template_limit" type="number" value={formData.template_limit} onChange={handleInputChange} />
                  <InputField label="Storage (MB)" name="media_storage_mb" type="number" value={formData.media_storage_mb} onChange={handleInputChange} />
                  <InputField label="Contact Limit" name="contact_limit" type="number" value={formData.contact_limit} onChange={handleInputChange} />
                </div>
              </div>

              {/* Section: Features */}
              <div>
                <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-3">
                  Features
                </h3>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="One feature per line"
                  className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 font-mono focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Section: Flags & Trial */}
              <div>
                <h3 className="text-[11px] font-bold text-surface-400 uppercase tracking-wider mb-3">
                  Settings
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Trial Days" name="trial_days" type="number" value={formData.trial_days} onChange={handleInputChange} />
                  <div />
                </div>
                <div className="flex items-center gap-6 mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_popular"
                      checked={formData.is_popular}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded accent-brand-500"
                    />
                    <span className="text-[13px] text-surface-700 font-medium">Mark as Popular</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="w-4 h-4 rounded accent-brand-500"
                    />
                    <span className="text-[13px] text-surface-700 font-medium">Active</span>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 pt-4 border-t border-surface-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-surface-100 hover:bg-surface-200 text-surface-700 px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingId ? (
                    'Update Plan'
                  ) : (
                    'Create Plan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-surface-200 shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-surface-900">Delete Plan</h3>
                <p className="text-[12px] text-surface-500 mt-0.5">
                  Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 bg-surface-100 hover:bg-surface-200 text-surface-700 px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-semibold text-[13px] transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InputField({ label, name, type = 'text', value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-surface-500 uppercase tracking-wider mb-1.5">
        {label}
        {required && ' *'}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] text-surface-900 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:outline-none transition-colors"
      />
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import {
  Mail, Search, Save, Eye, EyeOff, Loader2, Tag, Settings,
  Code, ToggleLeft, ToggleRight, ChevronLeft, Trash2, Plus
} from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Auth', 'Notification', 'Billing', 'System'];
const CATEGORY_COLORS = {
  auth: 'border-brand-200 bg-brand-50 text-brand-700',
  notification: 'border-blue-200 bg-blue-50 text-blue-700',
  billing: 'border-amber-200 bg-amber-50 text-amber-700',
  system: 'border-surface-200 bg-surface-50 text-surface-700',
};

const COMMON_VARIABLES = [
  { name: 'user_name', label: 'User Name' },
  { name: 'user_email', label: 'User Email' },
  { name: 'tenant_name', label: 'Tenant Name' },
  { name: 'app_name', label: 'App Name' },
  { name: 'app_url', label: 'App URL' },
  { name: 'verification_link', label: 'Verification Link' },
  { name: 'reset_link', label: 'Reset Link' },
  { name: 'login_link', label: 'Login Link' },
  { name: 'plan_name', label: 'Plan Name' },
  { name: 'plan_price', label: 'Plan Price' },
  { name: 'trial_days', label: 'Trial Days' },
  { name: 'expiry_date', label: 'Expiry Date' },
];

const SAMPLE_DATA = {
  user_name: 'John Doe',
  user_email: 'john@example.com',
  tenant_name: 'Acme Corp',
  app_name: 'WBIZ.IN',
  app_url: 'https://wbiz.in',
  verification_link: '#',
  reset_link: '#',
  login_link: '#',
  plan_name: 'Professional',
  plan_price: '$99/month',
  trial_days: '14',
  expiry_date: '2026-05-15',
};

export default function AdminEmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [settings, setSettings] = useState({
    email_logo_url: '',
    email_company_name: '',
    email_footer_text: '',
    email_primary_color: '#25D366',
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    subject: '',
    html_body: '',
    category: 'auth',
    is_active: true,
    variables: [],
  });
  const [tempSettingsForm, setTempSettingsForm] = useState(settings);
  const textareaRef = useRef(null);

  // Fetch templates and settings on mount
  useEffect(() => {
    fetchTemplates();
    fetchSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/email-templates');
      setTemplates(res.data.data?.templates || []);
    } catch (err) {
      toast.error('Failed to fetch templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/system/config');
      if (res.data.data?.configs) {
        const config = res.data.data.configs;
        const newSettings = {
          email_logo_url: config.email_logo_url || '',
          email_company_name: config.email_company_name || '',
          email_footer_text: config.email_footer_text || '',
          email_primary_color: config.email_primary_color || '#25D366',
        };
        setSettings(newSettings);
        setTempSettingsForm(newSettings);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const matchCategory = selectedCategory === 'All' || t.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchSearch = !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setEditFormData({
      name: template.name,
      subject: template.subject,
      html_body: template.html_body,
      category: template.category,
      is_active: template.is_active !== false,
      variables: template.variables || [],
    });
    setShowPreview(false);
    setShowSettings(false);
  };

  const handleClearSelection = () => {
    setSelectedTemplate(null);
    setEditFormData({
      name: '',
      subject: '',
      html_body: '',
      category: 'auth',
      is_active: true,
      variables: [],
    });
  };

  const insertVariable = (varName) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = editFormData.html_body.substring(0, start);
    const after = editFormData.html_body.substring(end);
    const newBody = before + `{{${varName}}}` + after;

    setEditFormData({
      ...editFormData,
      html_body: newBody,
    });

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + varName.length + 4;
      textarea.focus();
    }, 0);
  };

  const renderPreview = () => {
    let html = editFormData.html_body;

    // Replace all variables with sample data
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, value);
    });

    // Wrap in email template structure with branding
    const previewHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${settings.email_primary_color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header img { max-height: 40px; margin-bottom: 10px; }
          .content { background-color: white; padding: 30px; border: 1px solid #e5e7eb; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          a { color: ${settings.email_primary_color}; text-decoration: none; }
          a:hover { text-decoration: underline; }
          .button { display: inline-block; background-color: ${settings.email_primary_color}; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
          h1 { color: #111827; margin-top: 0; }
          h2 { color: #374151; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${settings.email_logo_url ? `<div class="header"><img src="${settings.email_logo_url}" alt="Logo" /></div>` : `<div class="header"><strong>${settings.email_company_name || 'WBIZ.IN'}</strong></div>`}
          <div class="content">
            ${html}
          </div>
          <div class="footer">
            ${settings.email_footer_text || '© 2026 WBIZ.IN. All rights reserved.'}
          </div>
        </div>
      </body>
      </html>
    `;

    return previewHTML;
  };

  const handleSaveTemplate = async () => {
    try {
      if (!editFormData.name || !editFormData.subject || !editFormData.html_body) {
        toast.error('Name, subject, and HTML body are required');
        return;
      }

      setSaving(true);

      const payload = {
        name: editFormData.name,
        subject: editFormData.subject,
        html_body: editFormData.html_body,
        category: editFormData.category,
        is_active: editFormData.is_active,
        variables: editFormData.variables,
      };

      if (selectedTemplate?._id) {
        await api.patch(`/admin/email-templates/${selectedTemplate._id}`, payload);
        toast.success('Template updated successfully');
      } else {
        await api.post('/admin/email-templates', payload);
        toast.success('Template created successfully');
      }

      await fetchTemplates();
      handleClearSelection();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (templateId, currentState) => {
    try {
      const template = templates.find(t => t._id === templateId);
      if (!template) return;

      await api.patch(`/admin/email-templates/${templateId}`, {
        ...template,
        is_active: !currentState,
      });

      setTemplates(templates.map(t =>
        t._id === templateId ? { ...t, is_active: !currentState } : t
      ));

      if (selectedTemplate?._id === templateId) {
        setEditFormData({ ...editFormData, is_active: !currentState });
      }

      toast.success(currentState ? 'Template disabled' : 'Template enabled');
    } catch (err) {
      toast.error('Failed to update template');
      console.error(err);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);

      await api.put('/admin/system/config', {
        configs: {
          email_logo_url: tempSettingsForm.email_logo_url,
          email_company_name: tempSettingsForm.email_company_name,
          email_footer_text: tempSettingsForm.email_footer_text,
          email_primary_color: tempSettingsForm.email_primary_color,
        },
      });

      setSettings(tempSettingsForm);
      toast.success('Settings saved successfully');
      setShowSettings(false);
    } catch (err) {
      toast.error('Failed to save settings');
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  // Main view - list + editor layout
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-surface-900 tracking-tight">
            Email Templates
          </h1>
          <p className="text-[13px] text-surface-500 mt-1 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            Manage email templates with dynamic variables and live preview
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold text-[13px] rounded-xl transition"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-0 bg-white rounded-2xl border border-surface-200 overflow-hidden" style={{ minHeight: '70vh' }}>
        {/* Left Sidebar - Template List */}
        <div className="w-full lg:w-[350px] border-r border-surface-200 flex flex-col overflow-hidden">
          {/* Search & Filter */}
          <div className="p-4 border-b border-surface-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-surface-200 bg-surface-50 text-[13px] placeholder-surface-400 focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Templates List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Mail className="w-10 h-10 text-surface-300 mb-2" />
                <p className="text-[13px] font-semibold text-surface-600">No templates found</p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filteredTemplates.map(template => (
                  <button
                    key={template._id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      selectedTemplate?._id === template._id
                        ? 'bg-brand-50 border-brand-300 shadow-sm'
                        : 'bg-white border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-bold text-surface-900 truncate">
                          {template.name}
                        </h3>
                        <p className="text-[12px] text-surface-500 truncate mt-0.5">
                          {template.subject}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              CATEGORY_COLORS[template.category] ||
                              'border-surface-200 bg-surface-50 text-surface-700'
                            }`}
                          >
                            {template.category}
                          </span>
                          {template.is_active ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-surface-100 text-surface-600 rounded-full text-[10px] font-bold border border-surface-200">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Editor or Settings */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showSettings ? (
            // Settings Panel
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex items-center gap-1 px-3 py-2 text-surface-600 hover:bg-surface-100 rounded-lg mb-4 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-[13px] font-semibold">Back</span>
                </button>

                <h2 className="text-[18px] font-bold text-surface-900 mb-6">Email Settings</h2>

                <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
                  <div>
                    <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                      Logo URL
                    </label>
                    <input
                      type="text"
                      value={tempSettingsForm.email_logo_url}
                      onChange={(e) =>
                        setTempSettingsForm({
                          ...tempSettingsForm,
                          email_logo_url: e.target.value,
                        })
                      }
                      placeholder="https://example.com/logo.png"
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={tempSettingsForm.email_company_name}
                      onChange={(e) =>
                        setTempSettingsForm({
                          ...tempSettingsForm,
                          email_company_name: e.target.value,
                        })
                      }
                      placeholder="WBIZ.IN"
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                      Footer Text
                    </label>
                    <textarea
                      value={tempSettingsForm.email_footer_text}
                      onChange={(e) =>
                        setTempSettingsForm({
                          ...tempSettingsForm,
                          email_footer_text: e.target.value,
                        })
                      }
                      placeholder="© 2026 WBIZ.IN. All rights reserved."
                      rows={3}
                      className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={tempSettingsForm.email_primary_color}
                        onChange={(e) =>
                          setTempSettingsForm({
                            ...tempSettingsForm,
                            email_primary_color: e.target.value,
                          })
                        }
                        className="w-12 h-10 rounded-lg border border-surface-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={tempSettingsForm.email_primary_color}
                        onChange={(e) =>
                          setTempSettingsForm({
                            ...tempSettingsForm,
                            email_primary_color: e.target.value,
                          })
                        }
                        placeholder="#25D366"
                        className="flex-1 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-surface-200">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-[13px] rounded-xl transition"
                    >
                      {savingSettings ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Settings
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedTemplate ? (
            // Template Editor
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl">
                <button
                  onClick={handleClearSelection}
                  className="flex items-center gap-1 px-3 py-2 text-surface-600 hover:bg-surface-100 rounded-lg mb-4 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-[13px] font-semibold">Back</span>
                </button>

                <h2 className="text-[18px] font-bold text-surface-900 mb-6">
                  Edit: {editFormData.name}
                </h2>

                <div className="space-y-5">
                  {/* Template Metadata */}
                  <div className="bg-white rounded-2xl border border-surface-200 px-5 py-4">
                    <h3 className="text-[13px] font-bold text-surface-900 mb-4 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Template Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                          Name
                        </label>
                        <input
                          type="text"
                          value={editFormData.name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, name: e.target.value })
                          }
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                          Subject
                        </label>
                        <input
                          type="text"
                          value={editFormData.subject}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, subject: e.target.value })
                          }
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[12px] font-bold text-surface-700 uppercase tracking-wider mb-2 block">
                          Category
                        </label>
                        <select
                          value={editFormData.category}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, category: e.target.value })
                          }
                          className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:outline-none"
                        >
                          <option value="auth">Auth</option>
                          <option value="notification">Notification</option>
                          <option value="billing">Billing</option>
                          <option value="system">System</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <div
                            className={`relative w-10 h-6 rounded-full transition ${
                              editFormData.is_active ? 'bg-brand-500' : 'bg-surface-300'
                            }`}
                          >
                            <div
                              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition ${
                                editFormData.is_active ? 'left-5' : 'left-1'
                              }`}
                            />
                          </div>
                          <input
                            type="checkbox"
                            checked={editFormData.is_active}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                is_active: e.target.checked,
                              })
                            }
                            className="sr-only"
                          />
                          <span className="text-[13px] font-semibold text-surface-900">
                            {editFormData.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Variables */}
                  <div className="bg-white rounded-2xl border border-surface-200 px-5 py-4">
                    <h3 className="text-[13px] font-bold text-surface-900 mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Dynamic Variables
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_VARIABLES.map(variable => (
                        <button
                          key={variable.name}
                          onClick={() => insertVariable(variable.name)}
                          className="px-3 py-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-lg text-[12px] font-semibold hover:bg-brand-100 transition"
                          title={`Insert {{${variable.name}}}`}
                        >
                          {variable.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* HTML Body Editor */}
                  <div className="bg-white rounded-2xl border border-surface-200 px-5 py-4">
                    <h3 className="text-[13px] font-bold text-surface-900 mb-3">HTML Body</h3>
                    <textarea
                      ref={textareaRef}
                      value={editFormData.html_body}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, html_body: e.target.value })
                      }
                      placeholder="<h1>Welcome {{user_name}}</h1><p>Your email is {{user_email}}</p>"
                      rows={10}
                      className="w-full rounded-lg border border-surface-200 bg-surface-900 text-emerald-400 font-mono text-[12px] p-3 focus:ring-2 focus:ring-brand-500/20 focus:outline-none resize-none"
                    />
                  </div>

                  {/* Preview Toggle */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-700 font-semibold text-[13px] rounded-xl transition"
                    >
                      {showPreview ? (
                        <>
                          <EyeOff className="w-4 h-4" />
                          Hide Preview
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Show Preview
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleSaveTemplate}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-[13px] rounded-xl transition"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Template
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preview Panel */}
                  {showPreview && (
                    <div className="bg-white rounded-2xl border border-surface-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-surface-200 bg-surface-50">
                        <h3 className="text-[13px] font-bold text-surface-900">Live Preview</h3>
                      </div>
                      <iframe
                        srcDoc={renderPreview()}
                        className="w-full border-0"
                        style={{ height: '600px' }}
                        sandbox="allow-same-origin"
                        title="Email preview"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Mail className="w-16 h-16 text-surface-300 mx-auto mb-4" />
                <p className="text-[14px] font-semibold text-surface-600">
                  Select a template to edit
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';

import { getMonetizationSettings, updateMonetizationSettings } from '../../../services/adminApi';
import type { MonetizationConfig } from '../../../types/admin';

export function AdMonetizationManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [form, setForm] = useState<MonetizationConfig['value']>({
    adsensePubId: '',
    autoAdsEnabled: false,
    topBannerEnabled: false,
    sidebarBannerEnabled: false,
    inContentAdEnabled: false,
    adBlockNoticeEnabled: false,
    headerScripts: '',
    customSponsorHtml: '',
    sponsorName: '',
    sponsorLink: '',
  });

  useEffect(() => {
    getMonetizationSettings()
      .then((res) => {
        if (res?.value) {
          setForm({
            adsensePubId: res.value.adsensePubId || '',
            autoAdsEnabled: Boolean(res.value.autoAdsEnabled),
            topBannerEnabled: Boolean(res.value.topBannerEnabled),
            sidebarBannerEnabled: Boolean(res.value.sidebarBannerEnabled),
            inContentAdEnabled: Boolean(res.value.inContentAdEnabled),
            adBlockNoticeEnabled: Boolean(res.value.adBlockNoticeEnabled),
            headerScripts: res.value.headerScripts || '',
            customSponsorHtml: res.value.customSponsorHtml || '',
            sponsorName: res.value.sponsorName || '',
            sponsorLink: res.value.sponsorLink || '',
          });
        }
      })
      .catch((err) => showToast(err.message || 'Failed to load ad settings.'))
      .finally(() => setLoading(false));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateMonetizationSettings(form);
      showToast(res.message || 'Monetization settings saved successfully!');
    } catch (err: any) {
      showToast(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-white/5" />
        <div className="h-64 rounded-2xl bg-white/[0.03]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-brand-400/30 bg-slate-900 p-4 text-xs font-semibold text-brand-300 shadow-2xl backdrop-blur">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Monetization & AdSense Manager
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure Google AdSense publisher tokens, ad slots, custom sponsor banners, and header
          scripts.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Google AdSense Credentials */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🏷️</span> Google AdSense Integration
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Google AdSense Publisher ID
            </label>
            <input
              type="text"
              value={form.adsensePubId}
              onChange={(e) => setForm({ ...form, adsensePubId: e.target.value })}
              placeholder="e.g. ca-pub-1234567890123456"
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs font-mono text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              When provided, official AdSense script tags will be injected across all public tool
              pages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <label className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 cursor-pointer hover:border-brand-400/30">
              <input
                type="checkbox"
                checked={form.autoAdsEnabled}
                onChange={(e) => setForm({ ...form, autoAdsEnabled: e.target.checked })}
                className="mt-0.5 rounded border-white/20 bg-slate-950 text-brand-500"
              />
              <div>
                <p className="text-xs font-semibold text-white">Enable Google Auto-Ads</p>
                <p className="text-[11px] text-slate-400">
                  Allow Google AI to place responsive ad units automatically.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 cursor-pointer hover:border-brand-400/30">
              <input
                type="checkbox"
                checked={form.adBlockNoticeEnabled}
                onChange={(e) => setForm({ ...form, adBlockNoticeEnabled: e.target.checked })}
                className="mt-0.5 rounded border-white/20 bg-slate-950 text-brand-500"
              />
              <div>
                <p className="text-xs font-semibold text-white">AdBlocker Polite Notice</p>
                <p className="text-[11px] text-slate-400">
                  Display a polite support banner when an adblocker is detected.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Ad Placements Slots */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>📐</span> Ad Placement Units
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 cursor-pointer hover:border-brand-400/30">
              <input
                type="checkbox"
                checked={form.topBannerEnabled}
                onChange={(e) => setForm({ ...form, topBannerEnabled: e.target.checked })}
                className="mt-0.5 rounded border-white/20 bg-slate-950 text-brand-500"
              />
              <div>
                <p className="text-xs font-semibold text-white">Top Header Leaderboard</p>
                <p className="text-[11px] text-slate-400">
                  728x90 banner below the main navigation.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 cursor-pointer hover:border-brand-400/30">
              <input
                type="checkbox"
                checked={form.inContentAdEnabled}
                onChange={(e) => setForm({ ...form, inContentAdEnabled: e.target.checked })}
                className="mt-0.5 rounded border-white/20 bg-slate-950 text-brand-500"
              />
              <div>
                <p className="text-xs font-semibold text-white">In-Tool Canvas Banner</p>
                <p className="text-[11px] text-slate-400">
                  Adaptive banner below output result box.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 cursor-pointer hover:border-brand-400/30">
              <input
                type="checkbox"
                checked={form.sidebarBannerEnabled}
                onChange={(e) => setForm({ ...form, sidebarBannerEnabled: e.target.checked })}
                className="mt-0.5 rounded border-white/20 bg-slate-950 text-brand-500"
              />
              <div>
                <p className="text-xs font-semibold text-white">Sidebar Skyscraper</p>
                <p className="text-[11px] text-slate-400">
                  300x250 or 300x600 sticky sidebar slot.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Custom Sponsor Banner */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>🤝</span> Direct Sponsor & Partner Banner
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sponsor Name / Label
              </label>
              <input
                type="text"
                value={form.sponsorName}
                onChange={(e) => setForm({ ...form, sponsorName: e.target.value })}
                placeholder="e.g. iNAYA Cloud Hosting"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Sponsor Destination Link (URL)
              </label>
              <input
                type="url"
                value={form.sponsorLink}
                onChange={(e) => setForm({ ...form, sponsorLink: e.target.value })}
                placeholder="https://example.com/?ref=inwebtools"
                className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs font-mono text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom HTML Sponsor Embed Code
            </label>
            <textarea
              rows={3}
              value={form.customSponsorHtml}
              onChange={(e) => setForm({ ...form, customSponsorHtml: e.target.value })}
              placeholder="<div><a href='...'>Your Brand Banner</a></div>"
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs font-mono text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Global Header Script Injection */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>💻</span> Global Header Script Injection
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom HTML / JavaScript Header Scripts
            </label>
            <textarea
              rows={4}
              value={form.headerScripts}
              onChange={(e) => setForm({ ...form, headerScripts: e.target.value })}
              placeholder="<!-- Google Analytics, Plausible, or custom tracking tags -->"
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs font-mono text-white placeholder-slate-500 focus:border-brand-400 focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Injected into the HTML head of all public platform pages.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-brand-500 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/20 hover:bg-brand-400 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Monetization Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

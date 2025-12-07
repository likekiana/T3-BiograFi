// frontend/src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.jsx'; // 注意路径是否正确
import { authService } from '../services/authService';
import { t, getCurrentLanguage, setCurrentLanguage } from '../utils/language';
import { setStoredTheme } from '../utils/theme';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [settings, setSettings] = useState({ theme: 'light', showHints: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user && user.settings) {
      setSettings(prev => ({ ...prev, ...user.settings }));
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return alert('请先登录');
    setSaving(true);
    // 使用之前修改的 authService.updateUser 来保存 settings
    const result = await authService.updateUser(user.id, { settings });
    setSaving(false);
    if (result && result.success) {
      // updateUser 已在 useAuth 中同步 currentUser，若你想再触发 useAuth 更新可以调用 context 的 updateUser
      if (updateUser) {
        await updateUser({ settings: result.user.settings || settings });
      }
      return result;
    } else {
      alert('保存失败: ' + (result && result.error ? result.error : '未知错误'));
      return result;
    }
  };

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 680, background: 'var(--surface)', borderRadius: 8, boxShadow: 'var(--card-shadow)', padding: 24 }}>
        <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>{t('settings') || '设置中心'}</h2>

        <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-color)' }}>主题</label>
            <select value={settings.theme} onChange={e => { setSettings({ ...settings, theme: e.target.value }); setStoredTheme(e.target.value); }} style={{ width: '100%', padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }}>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>

            <div style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={!!settings.showHints} onChange={e => setSettings({ ...settings, showHints: e.target.checked })} />
                <span>显示提示</span>
              </label>
            </div>
          </div>

          <div style={{ width: 260 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--text-color)' }}>应用语言</label>
            <select value={getCurrentLanguage()} onChange={e => { setCurrentLanguage(e.target.value); }} style={{ width: '100%', padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }}>
              <option value="简体中文">简体中文</option>
              <option value="繁體中文">繁體中文</option>
              <option value="English">English</option>
            </select>
            <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>更改后点击「保存设置」以生效（页面将刷新）</div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
          <button onClick={() => { /* reset to current user settings */ if (user && user.settings) setSettings({ theme: user.settings.theme || 'light', showHints: user.settings.showHints !== false }); }} style={{ padding: '8px 14px' }}>取消</button>
          <button onClick={async () => { setCurrentLanguage(getCurrentLanguage()); const r = await handleSave(); if (r && r.success) { /* saved */ } else { /* error handled in handleSave */ } }} disabled={saving} style={{ padding: '8px 14px', background: 'var(--primary)', color: 'var(--primary-contrast)', border: 'none', borderRadius: 4 }}>{saving ? '保存中...' : '保存设置'}</button>
        </div>
      </div>
    </div>
  );
}
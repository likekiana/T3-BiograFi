import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({ ...prev, username: user.username || '', email: user.email || '' }));
    }
  }, [user]);

  if (!user) return <div style={{ padding: 24 }}>未登录</div>;

  const handleChange = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSave = async () => {
      if (form.newPassword || form.confirmPassword) {
        if (form.newPassword !== form.confirmPassword) return alert('两次输入的密码不一致');
        if (form.newPassword.length < 6) return alert('密码至少需要6个字符');
        if (!form.currentPassword) return alert('修改密码需要先填写当前密码');
      }

      // 如果要修改密码，优先调用 changePassword 接口
      setSaving(true);
      try {
        if (form.newPassword) {
          // 动态 import authService.changePassword via global service
          const { authService } = await import('../services/authService');
          const changeRes = await authService.changePassword(user.id, form.currentPassword, form.newPassword);
          if (!changeRes || !changeRes.success) {
            alert('修改密码失败：' + (changeRes && changeRes.error ? changeRes.error : '未知错误'));
            setSaving(false);
            return;
          }
        }

        // 继续更新用户名/邮箱
        const updates = { username: form.username, email: form.email };
        const res = await updateUser(updates);
        setSaving(false);
        if (res && res.success) {
          alert('保存成功');
        } else {
          alert('保存失败：' + (res && res.error ? res.error : '未知错误'));
        }
      } catch (e) {
        setSaving(false);
        console.error('保存出错', e);
        alert('保存出错：' + (e.message || e));
      }
  };

  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 680, background: 'var(--surface)', borderRadius: 8, boxShadow: 'var(--card-shadow)', padding: 24 }}>
        <h2 style={{ marginTop: 0, color: 'var(--text-color)' }}>个人中心</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <label style={{ fontWeight: 600, color: 'var(--text-color)' }}>用户名</label>
          <input value={form.username} onChange={handleChange('username')} style={{ padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }} />

          <label style={{ fontWeight: 600, color: 'var(--text-color)' }}>邮箱</label>
          <input value={form.email} onChange={handleChange('email')} style={{ padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }} />

          <label style={{ fontWeight: 600, color: 'var(--text-color)' }}>当前密码（修改密码时必填）</label>
          <input type="password" value={form.currentPassword} onChange={handleChange('currentPassword')} style={{ padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }} />

          <label style={{ fontWeight: 600, color: 'var(--text-color)' }}>新密码（留空表示不修改）</label>
          <input type="password" value={form.newPassword} onChange={handleChange('newPassword')} style={{ padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }} />

          <label style={{ fontWeight: 600, color: 'var(--text-color)' }}>确认新密码</label>
          <input type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} style={{ padding: '8px 10px', color: 'var(--text-color)', background: 'transparent', border: '1px solid rgba(0,0,0,0.06)' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button onClick={() => { setForm({ username: user.username || '', email: user.email || '', newPassword: '', confirmPassword: '' }); }} style={{ padding: '8px 12px' }}>取消</button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '8px 12px', background: 'var(--primary)', color: 'var(--primary-contrast)', border: 'none', borderRadius: 4 }}>{saving ? '保存中...' : '保存修改'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
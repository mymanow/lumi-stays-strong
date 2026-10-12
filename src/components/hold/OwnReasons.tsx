import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '@/lib/app-state';
import { useI18n } from '@/i18n';
import { addOwnReason, MAX_OWN_REASONS } from '@/lib/reasons';
import { PrimaryButton, SecondaryButton } from './Common';
export function OwnReasons({ showList = false }: { showList?: boolean }) {
  const { profile, updateProfile } = useApp();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const reasons = profile?.reasons ?? [];
  return <div className="flex flex-col gap-3">
    {showList && <><h2 className="text-2xl">{t('ownReasons.title')}</h2><ul className="flex flex-col gap-2">{reasons.map((reason, index) => <li key={index} className="flex items-center justify-between gap-3"><span className="break-words">{reason}</span><SecondaryButton aria-label={t('common.delete')} className="min-h-10 w-10 shrink-0 border-0 px-0" onClick={() => updateProfile({ reasons: reasons.filter((_, i) => i !== index) })}><Trash2 className="mx-auto h-4 w-4" /></SecondaryButton></li>)}</ul></>}
    {!editing && reasons.length < MAX_OWN_REASONS && <SecondaryButton onClick={() => setEditing(true)} className="flex items-center justify-center gap-2"><Plus className="h-4 w-4" />{t('ownReasons.add')}</SecondaryButton>}
    {editing && <form className="flex flex-col gap-3" onSubmit={async e => { e.preventDefault(); if (saving) return; setSaving(true); try { await updateProfile({ reasons: addOwnReason(reasons, value) }); setValue(''); setEditing(false); } finally { setSaving(false); } }}>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)} maxLength={200} aria-label={t('ownReasons.add')} placeholder={t('ownReasons.placeholder')} className="min-h-12 glass rounded-[20px] px-3" />
      <div className="flex gap-2"><SecondaryButton type="button" onClick={() => setEditing(false)}>{t('common.cancel')}</SecondaryButton><PrimaryButton arrow={false} disabled={!value.trim() || saving || reasons.length >= MAX_OWN_REASONS}>{t('common.save')}</PrimaryButton></div>
    </form>}
  </div>;
}

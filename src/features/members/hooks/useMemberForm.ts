import { useState, useCallback } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Member, MemberFormData } from '@/core/types';

const EMPTY_FORM: MemberFormData = {
  name: '',
  phone: '',
  joinDate: new Date().toISOString().split('T')[0],
  notes: '',
  profilePhoto: undefined,
};

export function useMemberForm() {
  const { addMember, updateMember, showToast, activeWorkspace } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(EMPTY_FORM);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();

  const openCreate = useCallback(() => {
    setSelected(null);
    setFormData(EMPTY_FORM);
    setPhotoDataUrl(undefined);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((member: Member) => {
    setSelected(member);
    setFormData({
      name: member.name,
      phone: member.phone,
      joinDate: member.joinDate,
      notes: member.notes || '',
      profilePhoto: member.profilePhoto,
    });
    setPhotoDataUrl(undefined);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSelected(null);
    setPhotoDataUrl(undefined);
  }, []);

  const clearProfilePhoto = useCallback(() => {
    setPhotoDataUrl(undefined);
    setFormData((current) => ({ ...current, profilePhoto: undefined }));
  }, []);

  const submit = useCallback(async () => {
    if (!formData.name.trim()) {
      showToast('error', 'Error de validación', 'Por favor ingrese el nombre del socio.');
      return;
    }

    try {
      if (!activeWorkspace) throw new Error('No hay un espacio activo.');
      let profilePhoto = formData.profilePhoto;
      if (photoDataUrl) {
        if (!window.coopmanagerPhotos) {
          throw new Error('Las fotos de perfil solo están disponibles en la aplicación de escritorio.');
        }
        profilePhoto = await window.coopmanagerPhotos.save(activeWorkspace.id, photoDataUrl);
      }

      const memberData = { ...formData, profilePhoto };
      if (selected) {
        updateMember(selected.id, memberData, { notify: true });
        if (selected.profilePhoto && selected.profilePhoto !== profilePhoto) {
          await window.coopmanagerPhotos?.remove(activeWorkspace.id, selected.profilePhoto);
        }
      } else {
        addMember(memberData);
      }
      closeForm();
    } catch (error) {
      showToast('error', 'No se pudo guardar la foto', error instanceof Error ? error.message : 'Intente nuevamente.');
    }
  }, [formData, photoDataUrl, selected, addMember, updateMember, showToast, closeForm, activeWorkspace]);

  const markInactive = useCallback((member: Member) => {
    updateMember(member.id, { status: 'inactive' }, { notify: false });
    showToast('success', 'Socio retirado', `${member.name} fue marcado como retirado.`);
  }, [updateMember, showToast]);

  const restoreMember = useCallback((member: Member) => {
    updateMember(member.id, { status: 'active' }, { notify: false });
    showToast('success', 'Socio restablecido', `${member.name} está activo nuevamente.`);
  }, [updateMember, showToast]);

  return {
    showForm,
    selected,
    formData,
    photoDataUrl,
    setFormData,
    setPhotoDataUrl,
    clearProfilePhoto,
    openCreate,
    openEdit,
    closeForm,
    submit,
    markInactive,
    restoreMember,
  };
}

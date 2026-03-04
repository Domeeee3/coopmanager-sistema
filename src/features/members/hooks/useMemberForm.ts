import { useState, useCallback } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Member, MemberFormData } from '@/core/types';

const EMPTY_FORM: MemberFormData = {
  name: '',
  phone: '',
  joinDate: new Date().toISOString().split('T')[0],
  notes: '',
};

export function useMemberForm() {
  const { addMember, updateMember, deleteMember, showToast } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(EMPTY_FORM);

  const openCreate = useCallback(() => {
    setSelected(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((member: Member) => {
    setSelected(member);
    setFormData({
      name: member.name,
      phone: member.phone,
      joinDate: member.joinDate,
      notes: member.notes || '',
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSelected(null);
  }, []);

  const openDelete = useCallback((member: Member) => {
    setSelected(member);
    setShowDelete(true);
  }, []);

  const closeDelete = useCallback(() => {
    setShowDelete(false);
    setSelected(null);
  }, []);

  const submit = useCallback(() => {
    if (!formData.name.trim()) {
      showToast('error', 'Error de validación', 'Por favor ingrese el nombre del socio.');
      return;
    }
    if (selected) {
      updateMember(selected.id, formData);
      showToast('success', 'Socio actualizado', `Los datos de ${formData.name} fueron actualizados.`);
    } else {
      addMember(formData);
      showToast('success', 'Socio creado', `${formData.name} fue registrado exitosamente.`);
    }
    closeForm();
  }, [formData, selected, addMember, updateMember, showToast, closeForm]);

  const confirmDelete = useCallback(() => {
    if (selected) {
      const name = selected.name;
      deleteMember(selected.id);
      showToast('success', 'Socio eliminado', `${name} fue eliminado del sistema.`);
      closeDelete();
    }
  }, [selected, deleteMember, showToast, closeDelete]);

  const markInactive = useCallback((member: Member) => {
    updateMember(member.id, { status: 'inactive' });
    showToast('warning', 'Socio retirado', `${member.name} fue marcado como inactivo.`);
  }, [updateMember, showToast]);

  return {
    showForm,
    showDelete,
    selected,
    formData,
    setFormData,
    openCreate,
    openEdit,
    closeForm,
    openDelete,
    closeDelete,
    submit,
    confirmDelete,
    markInactive,
  };
}

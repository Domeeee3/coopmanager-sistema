import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/core/store/AppContext';
import { Refund, RefundFormData } from '@/core/types';

const EMPTY_FORM: RefundFormData = {
  memberId: '',
  reason: '',
  amount: 0,
  depositDate: new Date().toISOString().split('T')[0],
};

export function useRefundForm() {
  const { contributions, addRefund, updateRefund, deleteRefund, showToast } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<Refund | null>(null);
  const [formData, setFormData] = useState<RefundFormData>(EMPTY_FORM);

  // Recalcular monto al cambiar socio seleccionado
  useEffect(() => {
    if (!formData.memberId) {
      setFormData(prev => ({ ...prev, amount: 0 }));
      return;
    }
    try {
      const memberContribs = contributions.filter(
        c => c.memberId === formData.memberId && c.status === 'paid'
      );
      const total = memberContribs.reduce(
        (sum, c) => sum + (Number(c.shareAmount || 0) + Number(c.expenseAmount || 0)),
        0
      );
      setFormData(prev => ({ ...prev, amount: total }));
    } catch {
      setFormData(prev => ({ ...prev, amount: 0 }));
    }
  }, [formData.memberId, contributions]);

  const openCreate = useCallback(() => {
    setSelected(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((refund: Refund) => {
    setSelected(refund);
    setFormData({
      memberId: refund.memberId,
      reason: refund.reason,
      amount: refund.amount,
      depositDate: refund.depositDate,
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setSelected(null);
  }, []);

  const openDelete = useCallback((refund: Refund) => {
    setSelected(refund);
    setShowDelete(true);
  }, []);

  const closeDelete = useCallback(() => {
    setShowDelete(false);
    setSelected(null);
  }, []);

  const submit = useCallback(() => {
    if (!formData.memberId) {
      showToast('error', 'Error de validación', 'Por favor seleccione un socio.');
      return;
    }
    if (!formData.reason.trim()) {
      showToast('error', 'Error de validación', 'Por favor ingrese el motivo.');
      return;
    }
    if (formData.amount <= 0) {
      showToast('error', 'Error de validación', 'El monto debe ser mayor a 0.');
      return;
    }
    if (selected) {
      updateRefund(selected.id, formData);
    } else {
      addRefund(formData);
    }
    closeForm();
  }, [formData, selected, addRefund, updateRefund, showToast, closeForm]);

  const confirmDelete = useCallback(() => {
    if (selected) {
      deleteRefund(selected.id);
      closeDelete();
    }
  }, [selected, deleteRefund, closeDelete]);

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
  };
}

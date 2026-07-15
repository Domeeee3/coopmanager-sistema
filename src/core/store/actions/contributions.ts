import { v4 as uuidv4 } from 'uuid';
import { Contribution, ContributionFormData } from '../../types';
import { ActionHelpers, MemberUpdateOptions } from '../types';

export function createContributionActions(
  helpers: ActionHelpers,
  deps: { updateMember: (id: string, data: Partial<import('../../types').Member>, options?: MemberUpdateOptions) => void },
) {
  const { dispatch, getState, showToast, logActivity, addTransaction } = helpers;

  // Convierte un valor YYYY-MM a un nombre legible ("febrero 26" etc.)
  const formatMonth = (month: string) => {
    try {
      const d = new Date(month + '-01');
      return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } catch {
      return month;
    }
  };

  const addContribution = (data: ContributionFormData): Contribution => {
    const state = getState();
    const member = state.members.find(m => m.id === data.memberId);
    const totalAmount = data.shareAmount + data.expenseAmount + (data.penaltyAmount || 0);

    const contribution: Contribution = {
      id: uuidv4(),
      memberId: data.memberId,
      month: data.month,
      shareAmount: data.shareAmount,
      expenseAmount: data.expenseAmount,
      penaltyAmount: data.penaltyAmount || 0,
      totalAmount,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      dueDate: `${data.month}-05`,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_CONTRIBUTION', payload: contribution });
    addTransaction('contribution', totalAmount, `Aporte - ${formatMonth(data.month)}`);

    if (member) {
      deps.updateMember(member.id, {
        totalContributions: member.totalContributions + totalAmount,
        currentBalance: member.currentBalance + totalAmount,
      }, { notify: false, logActivity: false });
    }

    showToast('success', 'Aporte pagado', `Aporte de ${state.config.currencySymbol}${totalAmount} registrado y pagado.`);
    return contribution;
  };

  const markContributionPaid = (id: string) => {
    const state = getState();
    const contribution = state.contributions.find(c => c.id === id);
    if (!contribution) return;

    const updated: Contribution = {
      ...contribution,
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
    };

    dispatch({ type: 'UPDATE_CONTRIBUTION', payload: updated });
    addTransaction('contribution', contribution.totalAmount, `Aporte - ${formatMonth(contribution.month)}`);
    logActivity('contribution_pay', `Aporte pagado: ${formatMonth(contribution.month)} - ${state.config.currencySymbol}${contribution.totalAmount}`, { contribution: updated }, id);
    showToast('success', 'Pago registrado', 'El aporte ha sido marcado como pagado.');
  };

  const updateContribution = (id: string, data: Partial<Contribution>) => {
    const state = getState();
    const contribution = state.contributions.find(c => c.id === id);
    if (!contribution) return;

    const updated: Contribution = { ...contribution, ...data };
    dispatch({ type: 'UPDATE_CONTRIBUTION', payload: updated });

    if (data.shareAmount !== undefined || data.expenseAmount !== undefined || data.penaltyAmount !== undefined) {
      const member = state.members.find(m => m.id === updated.memberId);
      if (member && updated.status === 'paid') {
        const memberContribs = state.contributions
          .filter(c => c.memberId === member.id && c.status === 'paid')
          .map(c => c.id === id ? updated : c);
        const totalContributions = memberContribs.reduce((sum, c) => sum + c.totalAmount, 0);
        deps.updateMember(member.id, { totalContributions }, { notify: false, logActivity: false });
      }
    }

    logActivity('contribution_edit', `Aporte editado: ${formatMonth(contribution.month)}`, { old: contribution, new: updated }, id);
    showToast('success', 'Aporte actualizado');
  };

  const deleteContribution = (id: string) => {
    const state = getState();
    const contribution = state.contributions.find(c => c.id === id);
    if (!contribution) return;

    dispatch({ type: 'DELETE_CONTRIBUTION', payload: id });

    const member = state.members.find(m => m.id === contribution.memberId);
    if (member && contribution.status === 'paid') {
      const memberContribs = state.contributions
        .filter(c => c.memberId === member.id && c.status === 'paid' && c.id !== id);
      const totalContributions = memberContribs.reduce((sum, c) => sum + c.totalAmount, 0);
      deps.updateMember(member.id, { totalContributions }, { notify: false, logActivity: false });
    }

    if (contribution.status === 'paid') {
      addTransaction('manual_adjustment', -contribution.totalAmount, `Reverso aporte eliminado - ${formatMonth(contribution.month)}`);
    }

    logActivity('contribution_delete', `Aporte eliminado: ${formatMonth(contribution.month)}`, contribution, id);
    showToast('success', 'Aporte eliminado');
  };

  return { addContribution, markContributionPaid, updateContribution, deleteContribution };
}

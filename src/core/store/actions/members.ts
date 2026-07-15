import { v4 as uuidv4 } from 'uuid';
import { Member, MemberFormData } from '../../types';
import { ActionHelpers, MemberUpdateOptions } from '../types';

export function createMemberActions(helpers: ActionHelpers) {
  const { dispatch, getState, showToast, logActivity } = helpers;

  const addMember = (data: MemberFormData): Member => {
    const member: Member = {
      id: uuidv4(),
      ...data,
      status: 'active',
      totalContributions: 0,
      currentBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_MEMBER', payload: member });
    logActivity('member_add', `Socio agregado: ${member.name}`, { member }, member.id);
    showToast('success', 'Socio creado', `${member.name} ha sido agregado exitosamente.`);
    return member;
  };

  const updateMember = (id: string, data: Partial<Member>, options: MemberUpdateOptions = {}) => {
    const member = getState().members.find(m => m.id === id);
    if (member) {
      const updated: Member = {
        ...member,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      dispatch({ type: 'UPDATE_MEMBER', payload: updated });
      if (options.logActivity !== false) logActivity('member_edit', `Socio actualizado: ${member.name}`, { old: member, new: updated }, id);
      if (options.notify === true) showToast('success', 'Socio actualizado');
    }
  };


  const getMember = (id: string) => getState().members.find(m => m.id === id);

  return { addMember, updateMember, getMember };
}

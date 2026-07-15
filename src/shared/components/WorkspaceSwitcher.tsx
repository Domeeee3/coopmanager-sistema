import { useState } from 'react';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@heroui/react';
import { useApp } from '@/core/store/AppContext';
import type { WorkspaceIconName } from '@/core/lib/workspaces';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { ConfirmModal } from '@/shared/components/custom-modal';
import { WorkspaceIcon, workspaceIconOptions } from '@/shared/components/WorkspaceIcon';

export function WorkspaceSwitcher() {
  const { activeWorkspace, workspaces, switchWorkspace, createWorkspace, renameWorkspace, updateWorkspaceIcon, deleteWorkspace, showToast } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState<WorkspaceIconName>('building');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [spaceToDelete, setSpaceToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setIsSaving(true);
    try { await action(); } catch (error) {
      showToast('error', 'No se pudo actualizar el espacio', error instanceof Error ? error.message : 'Intente nuevamente.');
    } finally { setIsSaving(false); }
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    void run(async () => {
      await createWorkspace(newName, newIcon);
      setNewName('');
      setNewIcon('building');
    });
  };

  const handleRename = (workspaceId: string) => {
    if (!editingName.trim()) return;
    void run(async () => {
      await renameWorkspace(workspaceId, editingName);
      setEditingId(null);
      setEditingName('');
    });
  };

  const handleSwitch = (workspaceId: string) => {
    void run(async () => {
      await switchWorkspace(workspaceId);
      setIsOpen(false);
    });
  };

  const spacePendingDeletion = workspaces.find((workspace) => workspace.id === spaceToDelete);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="flex w-full items-center gap-2 rounded-[var(--radius)] border border-sidebar-border bg-sidebar-accent/25 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent/55" aria-label="Cambiar o administrar espacio">
        <WorkspaceIcon icon={activeWorkspace?.icon ?? 'building'} className="size-4 shrink-0 text-sidebar-foreground/70" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-sidebar-foreground">{activeWorkspace?.name ?? 'Cargando espacio...'}</span>
          <span className="block text-[0.625rem] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/45">Espacio</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-sidebar-foreground/60" aria-hidden="true" />
      </button>

      <Modal.Backdrop variant="blur" isOpen={isOpen} onOpenChange={setIsOpen}>
        <Modal.Container size="md"><Modal.Dialog>
          <Modal.Header><Modal.Heading>Espacios</Modal.Heading><Modal.CloseTrigger aria-label="Cerrar espacios" /></Modal.Header>
          <Modal.Body className="space-y-4">
            <p className="text-sm text-muted-foreground">Cada espacio mantiene datos, configuración, tema y fotos de perfil completamente aislados.</p>

            {editingId === null ? (
              <div className="space-y-3 border border-border bg-card p-3">
                <p className="text-xs font-medium text-muted-foreground">Nuevo espacio</p>
                <div className="grid grid-cols-5 gap-2">
                  {workspaceIconOptions.map((option) => (
                    <Button key={option.id} type="button" size="icon" variant={option.id === newIcon ? 'default' : 'outline'} onClick={() => setNewIcon(option.id)} aria-label={`Usar icono ${option.label}`}>
                      <WorkspaceIcon icon={option.id} className="size-4" />
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Nombre del nuevo espacio" aria-label="Nombre del nuevo espacio" onKeyDown={(event) => event.key === 'Enter' && handleCreate()} />
                  <Button type="button" onClick={handleCreate} disabled={isSaving || !newName.trim()}>Crear</Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspace?.id;
                const isEditing = workspace.id === editingId;
                const selectedIcon = workspace.icon ?? 'building';
                return <div key={workspace.id} className="border border-border bg-card p-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div><p className="mb-2 text-xs font-medium text-muted-foreground">Icono del espacio</p><div className="grid grid-cols-5 gap-2">
                        {workspaceIconOptions.map((option) => <Button key={option.id} type="button" size="icon" variant={option.id === selectedIcon ? 'default' : 'outline'} onClick={() => void run(() => updateWorkspaceIcon(workspace.id, option.id))} aria-label={`Usar icono ${option.label}`}><WorkspaceIcon icon={option.id} className="size-4" /></Button>)}
                      </div></div>
                      <div className="flex gap-2"><Input value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={`Renombrar ${workspace.name}`} onKeyDown={(event) => event.key === 'Enter' && handleRename(workspace.id)} /><Button type="button" variant="outline" onClick={() => { setEditingId(null); setEditingName(''); }}>Cancelar</Button><Button type="button" onClick={() => handleRename(workspace.id)} disabled={isSaving || !editingName.trim()}>Guardar</Button></div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-3"><WorkspaceIcon icon={selectedIcon} className="size-5 shrink-0 text-primary" /><span className="min-w-0"><span className="block truncate text-sm font-semibold text-foreground">{workspace.name}</span><span className="text-xs text-muted-foreground">{isActive ? 'Espacio activo' : 'Espacio disponible'}</span></span></div>
                      <div className="flex shrink-0 gap-2">
                        {isActive ? <Button type="button" size="sm" variant="outline" disabled>Activo</Button> : <Button type="button" size="sm" onClick={() => handleSwitch(workspace.id)} disabled={isSaving}>Cambiar</Button>}
                        <Button type="button" size="icon" variant="outline" onClick={() => { setEditingId(workspace.id); setEditingName(workspace.name); }} aria-label="Editar espacio"><Pencil className="size-4" /></Button>
                        <Button type="button" size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setSpaceToDelete(workspace.id)} disabled={workspaces.length === 1} aria-label="Eliminar espacio"><Trash2 className="size-4" /></Button>
                      </div>
                    </div>
                  )}
                </div>;
              })}
            </div>
          </Modal.Body>
          <Modal.Footer><Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cerrar</Button></Modal.Footer>
        </Modal.Dialog></Modal.Container>
      </Modal.Backdrop>

      <ConfirmModal isOpen={spaceToDelete !== null} onClose={() => setSpaceToDelete(null)} onConfirm={() => { if (spaceToDelete) void run(async () => { await deleteWorkspace(spaceToDelete); setSpaceToDelete(null); }); }} title="Eliminar espacio" message={`Se eliminarán permanentemente todos los datos, configuraciones y fotos de “${spacePendingDeletion?.name ?? ''}”. Esta acción no se puede deshacer.`} confirmText="Eliminar espacio" variant="destructive" />
    </>
  );
}

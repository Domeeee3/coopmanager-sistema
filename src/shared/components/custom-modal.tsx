import React from 'react';
import { Button, Modal } from '@heroui/react';

interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    title: string;
    submitText?: string;
    className?: string;
    children: React.ReactNode;
}

export function FormModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    submitText = 'Guardar',
    className,
    children,
}: FormModalProps) {
    const formId = React.useId();

    return (
        <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Modal.Backdrop variant="blur">
                <Modal.Container scroll="inside">
                    <Modal.Dialog className={['w-[calc(100vw-2rem)]', className ?? 'sm:max-w-md'].join(' ')}>
                        <Modal.Header>
                            <Modal.Heading>{title}</Modal.Heading>
                            <Modal.CloseTrigger aria-label="Cerrar formulario" />
                        </Modal.Header>
                        <Modal.Body className="space-y-4">
                            <form id={formId} onSubmit={(event) => { event.preventDefault(); onSubmit(event); }}>
                                {children}
                            </form>
                        </Modal.Body>
                        <Modal.Footer className="gap-3">
                            <Button type="button" variant="outline" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" form={formId}>
                                {submitText}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    variant?: 'danger' | 'destructive' | 'warning' | 'primary';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    variant = 'primary',
}: ConfirmModalProps) {
    const confirmVariant = variant === 'danger' || variant === 'destructive' ? 'danger' : 'primary';

    return (
        <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
            <Modal.Backdrop variant="blur">
                <Modal.Container size="sm">
                    <Modal.Dialog>
                        <Modal.Header>
                            <Modal.Heading>{title}</Modal.Heading>
                            <Modal.CloseTrigger aria-label="Cerrar confirmación" />
                        </Modal.Header>
                        <Modal.Body>
                            <p>{message}</p>
                        </Modal.Body>
                        <Modal.Footer className="gap-3">
                            <Button type="button" variant="outline" onPress={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                variant={confirmVariant}
                                onPress={() => {
                                    onConfirm();
                                    onClose();
                                }}
                            >
                                {confirmText}
                            </Button>
                        </Modal.Footer>
                    </Modal.Dialog>
                </Modal.Container>
            </Modal.Backdrop>
        </Modal>
    );
}

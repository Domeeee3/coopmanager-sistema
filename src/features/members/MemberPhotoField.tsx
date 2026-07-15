import { useRef } from 'react';
import { Button } from '@heroui/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { MemberAvatar } from '@/shared/components/MemberAvatar';

interface MemberPhotoFieldProps {
  name: string;
  photo?: string;
  previewDataUrl?: string;
  onSelect: (dataUrl: string) => void;
  onRemove: () => void;
}

const MAX_PROFILE_PHOTO_SIZE = 5 * 1024 * 1024;

export function MemberPhotoField({
  name,
  photo,
  previewDataUrl,
  onSelect,
  onRemove,
}: MemberPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hasPhoto = Boolean(photo || previewDataUrl);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_PROFILE_PHOTO_SIZE) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onSelect(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4 rounded-md border border-border p-3">
      <MemberAvatar
        name={name || 'nuevo socio'}
        photo={previewDataUrl ?? photo}
        size="lg"
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">Foto de perfil</p>
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 5 MB.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onPress={() => inputRef.current?.click()}>
            <ImagePlus className="size-4" />
            {hasPhoto ? 'Reemplazar foto' : 'Subir foto'}
          </Button>
          {hasPhoto ? (
            <Button type="button" size="sm" variant="ghost" onPress={onRemove}>
              <Trash2 className="size-4" />
              Quitar
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}

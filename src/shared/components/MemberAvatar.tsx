import { useEffect, useState } from 'react';
import { Avatar } from '@heroui/react';
import { User } from 'lucide-react';
import { useApp } from '@/core/store/AppContext';
import { cn } from '@/shared/lib/utils';

interface MemberAvatarProps {
  name: string;
  photo?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MemberAvatar({ name, photo, size = 'sm', className }: MemberAvatarProps) {
  const { activeWorkspace } = useApp();
  const [photoUrl, setPhotoUrl] = useState<string>();

  useEffect(() => {
    let isCurrent = true;

    if (!photo) {
      setPhotoUrl(undefined);
      return () => { isCurrent = false; };
    }

    if (photo.startsWith('data:')) {
      setPhotoUrl(photo);
      return () => { isCurrent = false; };
    }

    if (!activeWorkspace) {
      setPhotoUrl(undefined);
      return () => { isCurrent = false; };
    }

    void window.coopmanagerPhotos?.getUrl(activeWorkspace.id, photo).then((url) => {
      if (isCurrent) setPhotoUrl(url);
    });

    return () => { isCurrent = false; };
  }, [activeWorkspace, photo]);

  return (
    <Avatar size={size} variant="soft" className={cn('rounded-full', className)}>
      {photoUrl ? <Avatar.Image src={photoUrl} alt={`Foto de ${name}`} /> : null}
      <Avatar.Fallback className="rounded-full">
        <User className="size-4" aria-hidden="true" />
      </Avatar.Fallback>
    </Avatar>
  );
}

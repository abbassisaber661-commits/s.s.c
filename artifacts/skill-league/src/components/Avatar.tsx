import { useEffect, useReducer } from "react";
import { getAvatarUrl, avatarGradient, avatarInitials } from "@/lib/avatar";

export type AvatarSize  = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'rounded-lg' | 'rounded-xl' | 'rounded-2xl' | 'rounded-3xl' | 'rounded-full';

interface AvatarProps {
  username:   string;
  size?:      AvatarSize;
  shape?:     AvatarShape;
  className?: string;
  online?:    boolean;
}

const SIZE_MAP: Record<AvatarSize, { outer: string; text: string; dotSize: string }> = {
  xs: { outer: 'w-7 h-7',   text: 'text-[10px]', dotSize: 'w-2.5 h-2.5 border-[1.5px]' },
  sm: { outer: 'w-9 h-9',   text: 'text-xs',     dotSize: 'w-3 h-3 border-2'            },
  md: { outer: 'w-11 h-11', text: 'text-sm',     dotSize: 'w-3 h-3 border-2'            },
  lg: { outer: 'w-14 h-14', text: 'text-base',   dotSize: 'w-3.5 h-3.5 border-2'        },
  xl: { outer: 'w-20 h-20', text: 'text-2xl',    dotSize: 'w-4 h-4 border-2'            },
};

export default function Avatar({
  username,
  size      = 'md',
  shape     = 'rounded-xl',
  className = '',
  online,
}: AvatarProps) {
  const [, tick] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const handler = () => tick();
    window.addEventListener('sl:avatar-updated', handler);
    return () => window.removeEventListener('sl:avatar-updated', handler);
  }, []);

  const url      = getAvatarUrl(username);
  const gradient = avatarGradient(username);
  const initials = avatarInitials(username);
  const s        = SIZE_MAP[size];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`${s.outer} ${shape} overflow-hidden`}>
        {url ? (
          <img src={url} alt={username} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center font-black text-white ${s.text}`}>
            {initials}
          </div>
        )}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${s.dotSize} rounded-full border-background ${
            online ? 'bg-green-400' : 'bg-muted'
          }`}
        />
      )}
    </div>
  );
}

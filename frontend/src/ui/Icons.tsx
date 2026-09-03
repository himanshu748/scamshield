interface IconProps { size?: number; }

function Icon({ children, size = 18 }: React.PropsWithChildren<IconProps>) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

export function ShieldIcon({ size }: IconProps) {
  return <Icon size={size}><path d="M12 3 20 6v5c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></Icon>;
}
export function MoonIcon() { return <Icon><path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" /></Icon>; }
export function SearchIcon({ size }: IconProps) { return <Icon size={size}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>; }
export function AlertIcon({ size }: IconProps) { return <Icon size={size}><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v4M12 17h.01" /></Icon>; }
export function FileIcon() { return <Icon><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></Icon>; }
export function CheckIcon() { return <Icon><path d="m5 12 4 4L19 6" /></Icon>; }

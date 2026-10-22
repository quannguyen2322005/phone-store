export function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>; }
export function CartIcon() { return <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" /><circle cx="10" cy="21" r="1" /><circle cx="18" cy="21" r="1" /></svg>; }
export function UserIcon() { return <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>; }
export function CloseIcon() { return <svg viewBox="0 0 24 24"><path d="m5 5 14 14M19 5 5 19" /></svg>; }
export function HeartIcon() { return <svg viewBox="0 0 24 24"><path d="M20.8 8.6c0 5.2-8.8 10.4-8.8 10.4S3.2 13.8 3.2 8.6A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 8.8 2.2Z" /></svg>; }
export function ArrowIcon() { return <svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>; }
export function ArrowPreviousIcon() { return <svg viewBox="0 0 24 24"><path d="M19 12H5m6 6-6-6 6-6" /></svg>; }
export function ServiceIcon({ index }) {
  const paths = [
    <><path d="M3 7h11v11H3zM14 11h4l3 3v4h-7" /><circle cx="7.5" cy="19" r="2" /><circle cx="17.5" cy="19" r="2" /></>,
    <><path d="M12 3 4 6v5c0 5.2 3.4 8.5 8 10 4.6-1.5 8-4.8 8-10V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></>,
    <><path d="M20 11a8 8 0 1 1-2.3-5.7L20 8" /><path d="M20 3v5h-5M12 8v4l3 2" /></>
  ];
  return <svg viewBox="0 0 24 24">{paths[index]}</svg>;
}

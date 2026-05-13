// midnight pick — shared components & icons

const Logo = ({ variant = "light", height = 56 }) => (
  <img
    src={variant === "dark" ? "assets/logo-dark.png" : "assets/logo.png"}
    alt="Midnight Pick"
    style={{ height, width: "auto", display: "block" }}
  />
);

// --- nav icons ---
const CartIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

const HeartIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ArrowUpRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="arrow">
    <line x1="7" y1="17" x2="17" y2="7" />
    <polyline points="7 7 17 7 17 17" />
  </svg>
);

const Plus = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const Chev = ({ size = 18 }) => (
  <svg className="chev" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const Check = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Star = ({ size = 14, filled = true }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// --- "why" badge icons (flame, leaf, mountain — keep custom, brand-style) ---
const IconFlame = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3 C 19 8 24 11 23 18 C 23 23 20 28 16 28 C 12 28 9 23 9 18 C 8 11 13 8 16 3 Z" fill="currentColor" opacity="0.14" />
    <path d="M16 12 C 18 14 19 15 19 18 C 19 21 18 24 16 24 C 14 24 13 21 13 19 C 13 16 15 14 16 12 Z" fill="currentColor" opacity="0.45" />
  </svg>
);
const IconLeaf = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 27 C 5 14 14 5 27 5 C 27 18 18 27 5 27 Z" fill="currentColor" opacity="0.14" />
    <path d="M5 27 L 22 10" />
    <path d="M16 12 L 13 18 M 19 16 L 16 21 M 13 19 L 9 23" />
  </svg>
);
const IconMountain = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 26 L 12 12 L 18 20 L 22 14 L 29 26 Z" fill="currentColor" opacity="0.14" />
    <path d="M3 26 L 12 12 L 18 20 L 22 14 L 29 26 Z" />
    <circle cx="22" cy="8" r="2.5" fill="currentColor" opacity="0.55" />
  </svg>
);

// --- "how it works" process icons (custom flat-line, Flaticon-style) ---
const StepPick = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* branch */}
    <path d="M8 14 C 22 18 32 28 38 44" />
    <path d="M18 16 L 14 10 M 24 19 L 22 12 M 30 23 L 30 16 M 35 28 L 38 22" opacity="0.7" />
    {/* leaves */}
    <path d="M20 14 C 24 8 32 8 36 14 C 32 20 24 20 20 14 Z" fill="currentColor" opacity="0.15" />
    {/* cherry */}
    <circle cx="42" cy="38" r="7" fill="currentColor" opacity="0.2" />
    <circle cx="42" cy="38" r="7" />
    <path d="M42 31 C 44 28 47 27 49 28" />
    {/* hand */}
    <path d="M50 44 C 56 44 58 48 56 52 C 54 56 48 56 44 52" fill="currentColor" opacity="0.15" />
    <path d="M50 44 C 56 44 58 48 56 52 C 54 56 48 56 44 52 L 41 47" />
    <path d="M50 50 L 53 53 M 47 51 L 50 54" opacity="0.6" />
  </svg>
);

const StepSundry = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* sun */}
    <circle cx="20" cy="20" r="6" fill="currentColor" opacity="0.25" />
    <circle cx="20" cy="20" r="6" />
    <path d="M20 8 V 4 M 20 32 V 36 M 8 20 H 4 M 32 20 H 36 M 11 11 L 8 8 M 29 11 L 32 8 M 11 29 L 8 32 M 29 29 L 32 32" opacity="0.7" />
    {/* drying tray */}
    <path d="M6 50 L 58 50 L 54 56 L 10 56 Z" fill="currentColor" opacity="0.12" />
    <path d="M6 50 L 58 50 L 54 56 L 10 56 Z" />
    {/* beans on tray */}
    <ellipse cx="20" cy="46" rx="3" ry="2" fill="currentColor" />
    <ellipse cx="30" cy="44" rx="3" ry="2" fill="currentColor" />
    <ellipse cx="40" cy="46" rx="3" ry="2" fill="currentColor" />
    <ellipse cx="50" cy="44" rx="3" ry="2" fill="currentColor" />
    <ellipse cx="25" cy="48" rx="2.5" ry="1.8" fill="currentColor" />
    <ellipse cx="36" cy="48" rx="2.5" ry="1.8" fill="currentColor" />
  </svg>
);

const StepRoast = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* drum roaster body */}
    <rect x="10" y="22" width="38" height="22" rx="10" fill="currentColor" opacity="0.14" />
    <rect x="10" y="22" width="38" height="22" rx="10" />
    {/* viewport */}
    <circle cx="22" cy="33" r="5" />
    <path d="M22 30 L 25 36 M 20 31 L 24 35" opacity="0.6" />
    {/* feet */}
    <path d="M14 44 V 50 M 44 44 V 50 M 10 50 H 48" />
    {/* hopper */}
    <path d="M28 22 L 32 14 L 38 14 L 42 22" />
    <path d="M30 14 L 40 14" />
    {/* steam/heat */}
    <path d="M52 14 C 54 18 50 22 52 26 M 56 18 C 58 22 54 26 56 30" opacity="0.6" />
  </svg>
);

const StepGrind = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* beans scattered */}
    <ellipse cx="16" cy="24" rx="6" ry="9" transform="rotate(-25 16 24)" fill="currentColor" opacity="0.18" />
    <ellipse cx="16" cy="24" rx="6" ry="9" transform="rotate(-25 16 24)" />
    <path d="M13 18 C 16 22 18 26 19 30" />
    <ellipse cx="32" cy="32" rx="6" ry="9" transform="rotate(15 32 32)" fill="currentColor" opacity="0.18" />
    <ellipse cx="32" cy="32" rx="6" ry="9" transform="rotate(15 32 32)" />
    <path d="M29 26 C 32 30 34 34 35 38" />
    <ellipse cx="48" cy="22" rx="6" ry="9" transform="rotate(35 48 22)" fill="currentColor" opacity="0.18" />
    <ellipse cx="48" cy="22" rx="6" ry="9" transform="rotate(35 48 22)" />
    <path d="M45 16 C 48 20 50 24 51 28" />
    {/* extra beans */}
    <ellipse cx="46" cy="46" rx="4" ry="6" transform="rotate(-15 46 46)" fill="currentColor" opacity="0.18" />
    <ellipse cx="46" cy="46" rx="4" ry="6" transform="rotate(-15 46 46)" />
    <ellipse cx="22" cy="48" rx="4" ry="6" transform="rotate(20 22 48)" fill="currentColor" opacity="0.18" />
    <ellipse cx="22" cy="48" rx="4" ry="6" transform="rotate(20 22 48)" />
  </svg>
);

const StepJar = () => (
  <svg width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {/* lid */}
    <rect x="20" y="6" width="24" height="8" rx="2" fill="currentColor" opacity="0.3" />
    <rect x="20" y="6" width="24" height="8" rx="2" />
    {/* neck */}
    <path d="M24 14 L 24 18 L 18 22 L 18 52 C 18 56 22 58 26 58 L 38 58 C 42 58 46 56 46 52 L 46 22 L 40 18 L 40 14" fill="currentColor" opacity="0.12" />
    <path d="M24 14 L 24 18 L 18 22 L 18 52 C 18 56 22 58 26 58 L 38 58 C 42 58 46 56 46 52 L 46 22 L 40 18 L 40 14" />
    {/* coffee level */}
    <path d="M18 36 C 26 32 38 40 46 36 L 46 52 C 46 56 42 58 38 58 L 26 58 C 22 58 18 56 18 52 Z" fill="currentColor" opacity="0.3" />
    {/* label */}
    <rect x="22" y="38" width="20" height="14" rx="1.5" fill="none" />
    <path d="M26 44 H 38 M 26 47 H 36" opacity="0.6" />
  </svg>
);

// social icons
const SocialIcons = {
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  ig: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  fb: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  wa: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>,
};

Object.assign(window, {
  Logo,
  CartIcon, HeartIcon, UserIcon, ArrowRight, ArrowUpRight, Plus, Chev, Check, Star,
  IconFlame, IconLeaf, IconMountain,
  StepPick, StepSundry, StepRoast, StepGrind, StepJar,
  SocialIcons,
});

import {
  siAlibabacloud,
  siAnthropic,
  siBytedance,
  siDeepseek,
  siGooglegemini,
  siKimi,
  siMinimax,
  siX,
} from 'simple-icons';

interface Props {
  icon: string;
  size?: number;
}

interface BrandIcon {
  path?: string;
  hex: string;
  label?: string;
}

const OPENAI_PATH =
  'M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.373 7.854a4.51 4.51 0 0 1 2.365-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.373 7.854zm16.02 3.098-5.833-3.387L14.58 6.4a.075.075 0 0 1 .071 0l4.83 2.785a4.494 4.494 0 0 1-.676 8.105v-5.678a.079.079 0 0 0-.041-.067zm1.96-3.065-.142-.085-4.78-2.792a.776.776 0 0 0-.785 0L9.409 9.38V7.048a.076.076 0 0 1 .032-.063L14.2 4.15a4.5 4.5 0 0 1 6.153 4.737zM8.257 12.983l-2.02-1.163a.08.08 0 0 1-.038-.057V6.175a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.647 5.56a.795.795 0 0 0-.393.681zm1.078-1.164L12 9.997l2.665 1.54v3.083L12 16.162l-2.665-1.54z';

const ICONS: Record<string, BrandIcon> = {
  openai: { path: OPENAI_PATH, hex: '10A37F' },
  anthropic: { path: siAnthropic.path, hex: siAnthropic.hex },
  google: { path: siGooglegemini.path, hex: '4285F4' },
  deepseek: { path: siDeepseek.path, hex: siDeepseek.hex },
  alibaba: { path: siAlibabacloud.path, hex: 'FF6A00' },
  doubao: { path: siBytedance.path, hex: '325AB4' },
  glm: { hex: '3859FF', label: '智' },
  minimax: { path: siMinimax.path, hex: siMinimax.hex },
  kimi: { path: siKimi.path, hex: siKimi.hex },
  xai: { path: siX.path, hex: '111111' },
  custom: { hex: '78716C', label: '◇' },
};

/** VendorIcon 用品牌色画在浅底上，避免反色白标。 */
export function VendorIcon({ icon, size = 34 }: Props) {
  const known = Object.hasOwn(ICONS, icon) ? icon : 'custom';
  const mark = ICONS[known] ?? ICONS.custom!;
  return (
    <span
      className="vendor-icon"
      style={{
        width: size,
        height: size,
        color: `#${mark.hex}`,
        background: `#${mark.hex}14`,
        border: `1px solid #${mark.hex}33`,
        fontSize: Math.max(12, size * 0.38),
      }}
      aria-hidden="true"
    >
      {mark.path ? (
        <svg viewBox="0 0 24 24" width="58%" height="58%" fill="currentColor">
          <path d={mark.path} />
        </svg>
      ) : (
        mark.label
      )}
    </span>
  );
}

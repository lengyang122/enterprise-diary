// ============================================================
// 统一线性图标集合（20x20 网格，1.5 描边，currentColor）
// ============================================================

export interface IconProps {
  size?: number
  className?: string
}

function svgProps({ size = 18, className }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

export function WriteIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M13.2 3.6l3.2 3.2L7 16.2H3.8v-3.2l9.4-9.4z" />
      <path d="M11.6 5.2l3.2 3.2" />
    </svg>
  )
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="10" cy="10" r="6.8" />
      <path d="M10 6.4V10l2.6 1.8" />
    </svg>
  )
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 2.2v2.2M10 15.6v2.2M2.2 10h2.2M15.6 10h2.2M4.5 4.5l1.6 1.6M13.9 13.9l1.6 1.6M15.5 4.5l-1.6 1.6M6.1 13.9l-1.6 1.6" />
    </svg>
  )
}

// 文档 —— 品牌标识
export function DocIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M7 2.6h5.2L15.6 6v11.4H7a1 1 0 0 1-1-1V3.6a1 1 0 0 1 1-1z" />
      <path d="M11.9 2.6V6h3.7" />
      <path d="M8.6 10.6h5M8.6 13.4h3.2" />
    </svg>
  )
}

/** 商务风格：公文箱。线条更少、更几何，用于企业场景的标识。 */
export function BriefcaseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="2.9" y="6.5" width="14.2" height="10.2" rx="1.6" />
      <path d="M7.5 6.5V5.3a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5v1.2" />
      <path d="M2.9 10.9h14.2" />
    </svg>
  )
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 3.2v9" />
      <path d="M6.4 8.8L10 12.4l3.6-3.6" />
      <path d="M3.8 15.2h12.4" />
    </svg>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 16.8v-9" />
      <path d="M6.4 11.2L10 7.6l3.6 3.6" />
      <path d="M3.8 4.8h12.4" />
    </svg>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 2.8l1.7 4.6 4.6 1.7-4.6 1.7L10 15.4l-1.7-4.6L3.7 9.1l4.6-1.7L10 2.8z" />
      <path d="M15.4 14.2l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8z" />
    </svg>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M16.4 9.2a6.6 6.6 0 1 1-1.9-4.4" />
      <path d="M16.6 3.4v4.2h-4.2" />
    </svg>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M3.8 5.4h12.4" />
      <path d="M8 5.4V3.8h4v1.6" />
      <path d="M5.4 5.4l.8 10.4h7.6l.8-10.4" />
      <path d="M8.6 8.6v4.6M11.4 8.6v4.6" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5.4 5.4l9.2 9.2M14.6 5.4l-9.2 9.2" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M10 4.2v11.6M4.2 10h11.6" />
    </svg>
  )
}

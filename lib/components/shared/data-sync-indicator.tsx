type DataSyncMode = 'local' | 'supabase'
type DataSyncStatus = 'LOCAL' | 'SYNCED'

const MODE_CLASSES = 'inline-flex rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-700 dark:bg-gray-800 dark:text-gray-200'
const SYNCED_CLASSES = 'inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
const LOCAL_CLASSES = 'inline-flex rounded-full bg-gray-200 px-3 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200'

export function DataModeIndicator({ mode }: { mode: DataSyncMode }) {
  return (
    <span className={MODE_CLASSES}>
      <span className="font-semibold">Chế độ dữ liệu:</span> {mode === 'supabase' ? 'Đồng bộ' : 'Cục bộ'}
    </span>
  )
}

export function SyncStatusIndicator({
  status,
  className = ''
}: {
  status: DataSyncStatus
  className?: string
}) {
  const classes = status === 'SYNCED' ? SYNCED_CLASSES : LOCAL_CLASSES
  return <span className={`${classes} ${className}`.trim()}>Trạng thái: {status === 'SYNCED' ? 'ĐÃ ĐỒNG BỘ' : 'CỤC BỘ'}</span>
}

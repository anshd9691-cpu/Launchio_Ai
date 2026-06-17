export default function SkeletonCard() {
  return (
    <div style={{ background: '#fff', border: '1px solid rgba(139,92,246,0.1)', borderRadius: 20, overflow: 'hidden' }}>
      <div className="skeleton" style={{ height: 160 }} />
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ height: 18, width: 70, borderRadius: 20 }} />
        <div className="skeleton" style={{ height: 18, width: '90%' }} />
        <div className="skeleton" style={{ height: 14, width: '75%' }} />
        <div className="skeleton" style={{ height: 14, width: '60%' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid #ede9fe' }}>
          <div className="skeleton" style={{ height: 28, width: 60 }} />
          <div className="skeleton" style={{ height: 36, width: 100, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  )
}

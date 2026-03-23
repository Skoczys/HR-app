export default function RecentLeaves({ leaves }) {
  if (!leaves || leaves.length === 0) {
    return (
      <div className="recent-card">
        <div className="section-header">
          <h3>Ostatnie wnioski</h3>
        </div>
        <p className="empty-text">Brak wniosków do wyświetlenia.</p>
      </div>
    );
  }

  return (
    <div className="recent-card">
      <div className="section-header">
        <h3>Ostatnie wnioski</h3>
      </div>

      <div className="recent-list">
        {leaves.map((leave) => (
          <div key={leave.id} className="recent-item">
            <div>
              <div className="recent-title">{leave.leave_type}</div>
              <div className="recent-subtitle">
                {leave.start_date} → {leave.end_date}
              </div>
            </div>

            <div className="recent-meta">
              <span className={`status-badge status-${leave.status}`}>
                {leave.status}
              </span>
              <span className="days-badge">{leave.total_days} dni</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
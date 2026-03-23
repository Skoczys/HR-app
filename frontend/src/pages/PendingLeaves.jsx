import { useEffect, useState } from "react";
import api from "../services/api";

export default function PendingLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  const loadLeaves = async () => {
    try {
      const res = await api.get("/leave_requests/pending");
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleDecision = async (leaveId, decision) => {
    setLoadingId(leaveId);

    try {
      await api.patch(`/leave_requests/${leaveId}/decision`, null, {
        params: { decision },
      });

      await loadLeaves();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="leave-page">
      <div className="page-header">
        <h1 className="page-title">Wnioski do akceptacji</h1>
      </div>

      <div className="leave-list">
        {leaves.length === 0 && (
          <p className="empty-text">Brak wniosków do akceptacji.</p>
        )}

        {leaves.map((leave) => (
          <div key={leave.id} className="leave-card leave-card-decision">
            <div className="leave-left">
              <div className="leave-title">{leave.leave_type}</div>
              <div className="leave-dates">
                {leave.start_date} → {leave.end_date}
              </div>
              <div className="leave-extra">
                {leave.total_days} dni
              </div>
            </div>

            <div className="leave-right leave-actions">
              <button
                className="approve-button"
                onClick={() => handleDecision(leave.id, "approved")}
                disabled={loadingId === leave.id}
              >
                Akceptuj
              </button>

              <button
                className="reject-button"
                onClick={() => handleDecision(leave.id, "rejected")}
                disabled={loadingId === leave.id}
              >
                Odrzuć
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import api from "../services/api";

export default function PendingLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [selectedLeave, setSelectedLeave] = useState(null);
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
              <div className="leave-title">
                {leave.user_first_name} {leave.user_last_name}
              </div>

              <div className="leave-dates">
                {leave.start_date} → {leave.end_date}
              </div>

              <div className="leave-extra">
                {leave.department} • {leave.leave_type} • {leave.total_days} dni
              </div>
            </div>

            <div className="leave-right leave-actions">
              <button
                className="secondary-button"
                onClick={() => setSelectedLeave(leave)}
              >
                Podgląd
              </button>

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

      {selectedLeave && (
        <div className="modal-overlay" onClick={() => setSelectedLeave(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Szczegóły wniosku</h2>

            <div className="details-grid">
              <div>
                <strong>Pracownik:</strong><br />
                {selectedLeave.user_first_name} {selectedLeave.user_last_name}
              </div>

              <div>
                <strong>Dział:</strong><br />
                {selectedLeave.department}
              </div>

              <div>
                <strong>Stanowisko:</strong><br />
                {selectedLeave.job_title || "-"}
              </div>

              <div>
                <strong>Typ urlopu:</strong><br />
                {selectedLeave.leave_type}
              </div>

              <div>
                <strong>Daty:</strong><br />
                {selectedLeave.start_date} → {selectedLeave.end_date}
              </div>

              <div>
                <strong>Liczba dni:</strong><br />
                {selectedLeave.total_days}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Uwagi pracownika:</strong><br />
                {selectedLeave.notes || "Brak"}
              </div>
            </div>

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                className="secondary-button"
                onClick={() => setSelectedLeave(null)}
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useEffect, useState } from "react";
import api from "../services/api";

export default function PendingLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadLeaves = async () => {
    try {
      const res = await api.get("/leave_requests/pending");
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać wniosków do akceptacji.");
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleDecision = async (leaveId, decision) => {
    setLoadingId(leaveId);
    setError("");

    try {
      await api.patch(`/leave_requests/${leaveId}/decision`, null, {
        params: { decision },
      });

      if (selectedLeave?.id === leaveId) {
        setSelectedLeave(null);
      }

      await loadLeaves();
    } catch (err) {
      console.error(err);
      setError("Nie udało się zapisać decyzji.");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePreview = async (leaveId) => {
    setDetailsLoading(true);
    setError("");

    try {
      const res = await api.get(`/leave_requests/${leaveId}`);
      setSelectedLeave(res.data);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać szczegółów wniosku.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedLeave(null);
  };

  return (
    <div className="leave-page">
      <div className="page-header">
        <h1 className="page-title">Wnioski do akceptacji</h1>
      </div>

      {error && <div className="auth-error">{error}</div>}

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
              <div className="leave-extra">{leave.total_days} dni</div>
            </div>

            <div className="leave-right leave-actions">
              <button
                className="secondary-button"
                onClick={() => handlePreview(leave.id)}
                disabled={detailsLoading && selectedLeave?.id === leave.id}
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
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 className="page-title">Szczegóły wniosku</h2>
              <button className="secondary-button" onClick={closeModal}>
                Zamknij
              </button>
            </div>

            {detailsLoading ? (
              <p>Ładowanie...</p>
            ) : (
              <div className="details-grid">
                <div>
                  <strong>ID wniosku:</strong> {selectedLeave.id}
                </div>
                <div>
                  <strong>Status:</strong> {selectedLeave.status}
                </div>
                <div>
                  <strong>Typ urlopu:</strong> {selectedLeave.leave_type}
                </div>
                <div>
                  <strong>Liczba dni:</strong> {selectedLeave.total_days}
                </div>
                <div>
                  <strong>Data od:</strong> {selectedLeave.start_date}
                </div>
                <div>
                  <strong>Data do:</strong> {selectedLeave.end_date}
                </div>
                <div>
                  <strong>ID pracownika:</strong> {selectedLeave.user_id}
                </div>
                <div>
                  <strong>ID przełożonego:</strong> {selectedLeave.manager_id ?? "-"}
                </div>
                <div>
                  <strong>ID zastępującego:</strong> {selectedLeave.substitute_id ?? "-"}
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Uwagi:</strong> {selectedLeave.notes || "Brak"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
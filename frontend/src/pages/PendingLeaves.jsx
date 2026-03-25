import { useEffect, useState } from "react";
import api from "../services/api";

export default function PendingLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState("");
  const [decisionLeaveId, setDecisionLeaveId] = useState(null);
  const [decisionComment, setDecisionComment] = useState("");

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

  const openDecisionModal = (leaveId, decision) => {
    setDecisionLeaveId(leaveId);
    setDecisionType(decision);
    setDecisionComment("");
    setDecisionModalOpen(true);
    setError("");
  };

  const closeDecisionModal = () => {
    setDecisionModalOpen(false);
    setDecisionLeaveId(null);
    setDecisionType("");
    setDecisionComment("");
  };

  const submitDecision = async () => {
    if (!decisionLeaveId || !decisionType) return;

    if (decisionType === "rejected" && !decisionComment.trim()) {
      setError("Przy odrzuceniu wniosku musisz podać powód.");
      return;
    }

    setLoadingId(decisionLeaveId);
    setError("");

    try {
      const payload = {
        decision: decisionType,
        decision_comment: decisionComment.trim() || null,
      };

      await api.patch(`/leave_requests/${decisionLeaveId}/decision`, payload);

      if (selectedLeave?.id === decisionLeaveId) {
        setSelectedLeave((prev) => ({
          ...prev,
          status: decisionType,
          decision_comment: decisionComment.trim() || null,
          decision_date: new Date().toISOString().slice(0, 10),
        }));
      }

      closeDecisionModal();
      await loadLeaves();
    } catch (err) {
      console.error(err);

      const backendMessage = err?.response?.data?.detail;

      if (backendMessage) {
        setError(
          Array.isArray(backendMessage)
            ? "Nie udało się zapisać decyzji."
            : backendMessage
        );
      } else {
        setError("Nie udało się zapisać decyzji.");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const closePreview = () => {
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
                type="button"
                className="secondary-button"
                onClick={() => handlePreview(leave.id)}
              >
                Podgląd
              </button>

              <button
                type="button"
                className="approve-button"
                onClick={() => openDecisionModal(leave.id, "approved")}
                disabled={loadingId === leave.id}
              >
                Akceptuj
              </button>

              <button
                type="button"
                className="reject-button"
                onClick={() => openDecisionModal(leave.id, "rejected")}
                disabled={loadingId === leave.id}
              >
                Odrzuć
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedLeave && (
        <div className="modal-overlay" onClick={closePreview}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 className="page-title" style={{ marginBottom: 0 }}>
                Szczegóły wniosku
              </h2>
              <button
                type="button"
                className="secondary-button"
                onClick={closePreview}
              >
                Zamknij
              </button>
            </div>

            {detailsLoading ? (
              <p>Ładowanie...</p>
            ) : (
              <div className="details-grid">
                <div>
                  <strong>Pracownik:</strong>
                  <br />
                  {selectedLeave.employee_name || "-"}
                </div>

                <div>
                  <strong>Dział:</strong>
                  <br />
                  {selectedLeave.employee_department || "-"}
                </div>

                <div>
                  <strong>Stanowisko:</strong>
                  <br />
                  {selectedLeave.employee_job_title || "-"}
                </div>

                <div>
                  <strong>Typ urlopu:</strong>
                  <br />
                  {selectedLeave.leave_type || "-"}
                </div>

                <div>
                  <strong>Data od:</strong>
                  <br />
                  {selectedLeave.start_date || "-"}
                </div>

                <div>
                  <strong>Data do:</strong>
                  <br />
                  {selectedLeave.end_date || "-"}
                </div>

                <div>
                  <strong>Liczba dni:</strong>
                  <br />
                  {selectedLeave.total_days ?? "-"}
                </div>

                <div>
                  <strong>Zastępujący:</strong>
                  <br />
                  {selectedLeave.substitute_name || "Brak"}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Uwagi pracownika:</strong>
                  <br />
                  {selectedLeave.notes || "Brak"}
                </div>

                <div>
                  <strong>Status:</strong>
                  <br />
                  {selectedLeave.status || "-"}
                </div>

                <div>
                  <strong>Decyzję podjął:</strong>
                  <br />
                  {selectedLeave.decided_by_name || "Jeszcze brak"}
                </div>

                <div>
                  <strong>Data decyzji:</strong>
                  <br />
                  {selectedLeave.decision_date || "Jeszcze brak"}
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <strong>Komentarz decyzji:</strong>
                  <br />
                  {selectedLeave.decision_comment || "Brak"}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {decisionModalOpen && (
        <div className="modal-overlay" onClick={closeDecisionModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 className="page-title" style={{ marginBottom: 0 }}>
                {decisionType === "approved"
                  ? "Akceptacja wniosku"
                  : "Odrzucenie wniosku"}
              </h2>
              <button
                type="button"
                className="secondary-button"
                onClick={closeDecisionModal}
              >
                Zamknij
              </button>
            </div>

            <div className="form-full">
              <label>
                {decisionType === "approved"
                  ? "Komentarz do decyzji (opcjonalnie)"
                  : "Powód odrzucenia"}
              </label>
              <textarea
                rows="5"
                placeholder={
                  decisionType === "approved"
                    ? "Możesz dodać krótki komentarz"
                    : "Wpisz powód odrzucenia wniosku"
                }
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
              />
            </div>

            <div
              className="leave-actions"
              style={{ justifyContent: "flex-end", marginTop: "20px" }}
            >
              {decisionType === "approved" ? (
                <button
                  type="button"
                  className="approve-button"
                  onClick={submitDecision}
                  disabled={loadingId === decisionLeaveId}
                >
                  {loadingId === decisionLeaveId
                    ? "Zapisywanie..."
                    : "Potwierdź akceptację"}
                </button>
              ) : (
                <button
                  type="button"
                  className="reject-button"
                  onClick={submitDecision}
                  disabled={loadingId === decisionLeaveId}
                >
                  {loadingId === decisionLeaveId
                    ? "Zapisywanie..."
                    : "Potwierdź odrzucenie"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
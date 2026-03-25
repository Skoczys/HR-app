import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const initialForm = {
  start_date: "",
  end_date: "",
  leave_type: "",
  substitute_id: "",
  notes: "",
};

const leaveTypes = [
  { value: "wypoczynkowy", label: "Urlop wypoczynkowy" },
  { value: "na_zadanie", label: "Na żądanie" },
  { value: "chorobowe", label: "Chorobowe" },
  { value: "okolicznosciowy", label: "Okolicznościowy" },
  { value: "bezplatny", label: "Bezpłatny" },
];

export default function LeaveRequests() {
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedLeave, setSelectedLeave] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadLeaves = async () => {
    try {
      const res = await api.get("/leave_requests/history");
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać listy wniosków.");
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTypeSelect = (type) => {
    setForm((prev) => ({
      ...prev,
      leave_type: type,
    }));
  };

  const totalDaysPreview = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;

    const start = new Date(form.start_date);
    const end = new Date(form.end_date);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    if (end < start) return 0;

    const diffTime = end.getTime() - start.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [form.start_date, form.end_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        start_date: form.start_date,
        end_date: form.end_date,
        leave_type: form.leave_type,
        notes: form.notes || null,
        substitute_id: form.substitute_id ? Number(form.substitute_id) : null,
      };

      await api.post("/leave_requests", payload);

      setForm(initialForm);
      setShowForm(false);
      await loadLeaves();
    } catch (err) {
      console.error(err);

      const backendMessage = err?.response?.data?.detail;

      if (backendMessage && typeof backendMessage === "string") {
        setError(backendMessage);
      } else {
        setError("Nie udało się dodać wniosku.");
      }
    } finally {
      setLoading(false);
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

  const closePreview = () => {
    setSelectedLeave(null);
  };

  return (
    <div className="leave-page">
      <div className="page-header">
        <h1 className="page-title">Moje wnioski</h1>
        <button
          className="primary-button"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Zamknij" : "Nowy wniosek"}
        </button>
      </div>

      {showForm && (
        <div className="leave-form-card">
          <div className="leave-form-top">
            <div>
              <h3>Nowy wniosek</h3>
              <p className="section-muted">
                Wybierz typ i uzupełnij szczegóły wniosku.
              </p>
            </div>

            <div className="leave-preview-badge">
              {totalDaysPreview > 0 ? `${totalDaysPreview} dni` : "Brak terminu"}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="leave-form">
            <div className="leave-type-grid">
              {leaveTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`leave-type-card ${
                    form.leave_type === type.value
                      ? "leave-type-card-active"
                      : ""
                  }`}
                  onClick={() => handleTypeSelect(type.value)}
                >
                  <span>{type.label}</span>
                </button>
              ))}
            </div>

            <div className="form-grid">
              <div>
                <label>Data rozpoczęcia</label>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>Data zakończenia</label>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>ID zastępującego</label>
                <input
                  type="number"
                  name="substitute_id"
                  placeholder="opcjonalnie"
                  value={form.substitute_id}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label>Wybrany typ</label>
                <input
                  type="text"
                  value={
                    leaveTypes.find((item) => item.value === form.leave_type)
                      ?.label || ""
                  }
                  placeholder="Wybierz typ z kafelków"
                  readOnly
                />
              </div>
            </div>

            <div className="form-full">
              <label>Uwagi</label>
              <textarea
                name="notes"
                rows="4"
                placeholder="Dodatkowe informacje"
                value={form.notes}
                onChange={handleChange}
              />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={loading || !form.leave_type}
              >
                {loading ? "Zapisywanie..." : "Zapisz wniosek"}
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && error && <div className="auth-error">{error}</div>}

      <div className="leave-list">
        {leaves.length === 0 && <p className="empty-text">Brak wniosków</p>}

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
              <span className={`status-badge status-${leave.status}`}>
                {leave.status}
              </span>

              <button
                type="button"
                className="secondary-button"
                onClick={() => handlePreview(leave.id)}
              >
                Podgląd
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
                  <strong>Typ urlopu:</strong>
                  <br />
                  {selectedLeave.leave_type || "-"}
                </div>

                <div>
                  <strong>Status:</strong>
                  <br />
                  {selectedLeave.status || "-"}
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

                <div>
                  <strong>Przełożony:</strong>
                  <br />
                  {selectedLeave.manager_name || "Brak"}
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
                  <strong>Uwagi pracownika:</strong>
                  <br />
                  {selectedLeave.notes || "Brak"}
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
    </div>
  );
}
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

const leaveTypeLabels = {
  wypoczynkowy: "Urlop wypoczynkowy",
  na_zadanie: "Na żądanie",
  chorobowe: "Chorobowe",
  okolicznosciowy: "Okolicznościowy",
  bezplatny: "Bezpłatny",
};

const documentTypeLabels = {
  umowa: "Umowa",
  aneks: "Aneks",
  pit: "PIT",
  badania: "Badania",
  bhp: "BHP",
  ppk: "PPK",
  inne: "Inne",
};

const documentTypeOptions = [
  { value: "umowa", label: "Umowa" },
  { value: "aneks", label: "Aneks" },
  { value: "pit", label: "PIT" },
  { value: "badania", label: "Badania" },
  { value: "bhp", label: "BHP" },
  { value: "ppk", label: "PPK" },
  { value: "inne", label: "Inne" },
];

export default function UserDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [error, setError] = useState("");
  const [documentsError, setDocumentsError] = useState("");

  const [loading, setLoading] = useState(true);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all");

  const [editBalanceOpen, setEditBalanceOpen] = useState(false);
  const [balanceForm, setBalanceForm] = useState({
    base_limit_days: 0,
    carried_over_days: 0,
  });
  const [balanceSaving, setBalanceSaving] = useState(false);

  const [createBalanceOpen, setCreateBalanceOpen] = useState(false);
  const [createBalanceForm, setCreateBalanceForm] = useState({
    base_limit_days: 20,
    carried_over_days: 0,
  });
  const [createBalanceLoading, setCreateBalanceLoading] = useState(false);

  const [addDocumentOpen, setAddDocumentOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    document_type: "umowa",
    title: "",
    description: "",
    file: null,
  });
  const [documentSaving, setDocumentSaving] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState(null);

  const currentYear = new Date().getFullYear();

  const canManageBalance =
    profile?.role === "admin" || profile?.role === "kadry";

  const canManageDocuments =
    profile?.role === "admin" || profile?.role === "kadry";

  const loadProfile = async () => {
    try {
      const res = await api.get("/me");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBalance = async () => {
    try {
      const balanceRes = await api.get(`/leave_balance/${id}?year=${currentYear}`);
      setBalance(balanceRes.data);
      setBalanceForm({
        base_limit_days: balanceRes.data.base_limit_days,
        carried_over_days: balanceRes.data.carried_over_days,
      });
    } catch (err) {
      console.error(err);
      setBalance(null);
    }
  };

  const loadLeaves = async (selectedStatus = "all") => {
    setLeavesLoading(true);

    try {
      const params = {};

      if (selectedStatus !== "all") {
        params.status = selectedStatus;
      }

      const leavesRes = await api.get(`/users/${id}/leave_requests`, { params });
      setLeaves(leavesRes.data || []);
    } catch (err) {
      console.error(err);
      setLeaves([]);
    } finally {
      setLeavesLoading(false);
    }
  };

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    setDocumentsError("");

    try {
      const res = await api.get(`/users/${id}/documents`);
      setDocuments(res.data || []);
    } catch (err) {
      console.error(err);
      setDocuments([]);
      setDocumentsError("Nie udało się pobrać dokumentów.");
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        await loadProfile();

        const userRes = await api.get(`/users/${id}`);
        setUser(userRes.data);

        await Promise.all([
          loadBalance(),
          loadLeaves(statusFilter),
          loadDocuments(),
        ]);
      } catch (err) {
        console.error(err);
        setError("Nie udało się pobrać danych pracownika.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, currentYear]);

  useEffect(() => {
    if (!user) return;
    loadLeaves(statusFilter);
  }, [statusFilter, user]);

  const openBalanceEdit = () => {
    if (!balance) return;

    setBalanceForm({
      base_limit_days: balance.base_limit_days,
      carried_over_days: balance.carried_over_days,
    });
    setEditBalanceOpen(true);
  };

  const closeBalanceEdit = () => {
    setEditBalanceOpen(false);
  };

  const handleBalanceFormChange = (e) => {
    const { name, value } = e.target;

    setBalanceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveBalance = async () => {
    if (!balance) return;

    setBalanceSaving(true);
    setError("");

    try {
      await api.put(`/leave_balance/${balance.id}`, {
        base_limit_days: Number(balanceForm.base_limit_days),
        carried_over_days: Number(balanceForm.carried_over_days),
      });

      await loadBalance();
      setEditBalanceOpen(false);
    } catch (err) {
      console.error(err);
      setError("Nie udało się zapisać salda urlopowego.");
    } finally {
      setBalanceSaving(false);
    }
  };

  const openCreateBalance = () => {
    setCreateBalanceForm({
      base_limit_days: 20,
      carried_over_days: 0,
    });
    setCreateBalanceOpen(true);
  };

  const closeCreateBalance = () => {
    setCreateBalanceOpen(false);
  };

  const handleCreateBalanceFormChange = (e) => {
    const { name, value } = e.target;

    setCreateBalanceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateBalance = async () => {
    setCreateBalanceLoading(true);
    setError("");

    try {
      await api.post("/leave_balance", {
        user_id: Number(id),
        year: currentYear,
        base_limit_days: Number(createBalanceForm.base_limit_days),
        carried_over_days: Number(createBalanceForm.carried_over_days),
      });

      await loadBalance();
      setCreateBalanceOpen(false);
    } catch (err) {
      console.error(err);
      setError("Nie udało się utworzyć salda urlopowego.");
    } finally {
      setCreateBalanceLoading(false);
    }
  };

  const openAddDocument = () => {
    setDocumentForm({
      document_type: "umowa",
      title: "",
      description: "",
      file: null,
    });
    setDocumentsError("");
    setAddDocumentOpen(true);
  };

  const closeAddDocument = () => {
    setAddDocumentOpen(false);
  };

  const handleDocumentFormChange = (e) => {
    const { name, value } = e.target;

    setDocumentForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDocumentFileChange = (e) => {
    const file = e.target.files?.[0] || null;

    setDocumentForm((prev) => ({
      ...prev,
      file,
    }));
  };

  const handleAddDocument = async () => {
    if (!documentForm.file) {
      setDocumentsError("Wybierz plik dokumentu.");
      return;
    }

    setDocumentSaving(true);
    setDocumentsError("");

    try {
      const formData = new FormData();
      formData.append("document_type", documentForm.document_type);
      formData.append("title", documentForm.title);
      formData.append("description", documentForm.description);
      formData.append("file", documentForm.file);

      await api.post(`/users/${id}/documents`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await loadDocuments();
      setAddDocumentOpen(false);
    } catch (err) {
      console.error(err);
      setDocumentsError("Nie udało się dodać dokumentu.");
    } finally {
      setDocumentSaving(false);
    }
  };

  const handleDownloadDocument = async (documentId, originalFileName) => {
    try {
      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      const link = window.document.createElement("a");
      link.href = url;
      link.download = originalFileName || "dokument";
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setDocumentsError("Nie udało się pobrać dokumentu.");
    }
  };

  const handleDeleteDocument = async (documentId) => {
    setDeletingDocumentId(documentId);
    setDocumentsError("");

    try {
      await api.delete(`/documents/${documentId}`);
      await loadDocuments();
    } catch (err) {
      console.error(err);
      setDocumentsError("Nie udało się usunąć dokumentu.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  if (loading) {
    return (
      <div className="user-details-page">
        <h1 className="page-title">Szczegóły pracownika</h1>
        <div className="section-muted">Ładowanie danych...</div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="user-details-page">
        <div className="page-header">
          <h1 className="page-title">Szczegóły pracownika</h1>
          <button className="secondary-button" onClick={() => navigate("/users")}>
            Wróć
          </button>
        </div>

        <div className="auth-error">{error}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-details-page">
        <div className="page-header">
          <h1 className="page-title">Szczegóły pracownika</h1>
          <button className="secondary-button" onClick={() => navigate("/users")}>
            Wróć
          </button>
        </div>

        <div className="auth-error">Nie znaleziono pracownika.</div>
      </div>
    );
  }

  return (
    <div className="user-details-page">
      <div className="page-header">
        <h1 className="page-title">
          {user.first_name} {user.last_name}
        </h1>

        <button className="secondary-button" onClick={() => navigate("/users")}>
          Wróć
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="summary-grid">
        <div className="summary-card">
          <span>Nr pracownika</span>
          <strong>{user.employee_number}</strong>
        </div>

        <div className="summary-card">
          <span>Rola</span>
          <strong>{user.role}</strong>
        </div>

        <div className="summary-card">
          <span>Dział</span>
          <strong>{user.department}</strong>
        </div>

        <div className="summary-card">
          <span>Status</span>
          <strong>{user.is_active ? "Aktywny" : "Nieaktywny"}</strong>
        </div>
      </div>

      <div className="user-details-grid">
        <div className="user-details-card">
          <h3>Dane podstawowe</h3>

          <div className="user-details-list">
            <div className="user-details-row">
              <strong>Imię</strong>
              <span>{user.first_name}</span>
            </div>

            <div className="user-details-row">
              <strong>Nazwisko</strong>
              <span>{user.last_name}</span>
            </div>

            <div className="user-details-row">
              <strong>Email</strong>
              <span>{user.email}</span>
            </div>

            <div className="user-details-row">
              <strong>Stanowisko</strong>
              <span>{user.job_title || "-"}</span>
            </div>

            <div className="user-details-row">
              <strong>Data zatrudnienia</strong>
              <span>{user.hire_date}</span>
            </div>

            <div className="user-details-row">
              <strong>ID przełożonego</strong>
              <span>{user.manager_user_id || "-"}</span>
            </div>
          </div>
        </div>

        <div className="user-details-card">
          <div className="page-header" style={{ marginBottom: "16px" }}>
            <h3 style={{ margin: 0 }}>Saldo urlopowe ({currentYear})</h3>

            {canManageBalance && balance && (
              <button
                type="button"
                className="primary-button"
                onClick={openBalanceEdit}
              >
                Edytuj saldo
              </button>
            )}
          </div>

          {balance ? (
            <div className="user-details-list">
              <div className="user-details-row user-details-row-highlight">
                <strong>Pozostało do wykorzystania</strong>
                <span>{balance.remaining_days} dni</span>
              </div>

              <div className="user-details-row">
                <strong>Wykorzystane</strong>
                <span>{balance.used_days} dni</span>
              </div>

              <div className="user-details-row">
                <strong>Limit podstawowy</strong>
                <span>{balance.base_limit_days} dni</span>
              </div>

              <div className="user-details-row">
                <strong>Przeniesione</strong>
                <span>{balance.carried_over_days} dni</span>
              </div>

              <div className="user-details-row">
                <strong>Na żądanie pozostało</strong>
                <span>{balance.remaining_on_demand_days} dni</span>
              </div>

              <div className="user-details-row">
                <strong>Na żądanie wykorzystane</strong>
                <span>{balance.on_demand_used_days} dni</span>
              </div>
            </div>
          ) : (
            <>
              <div className="section-muted">
                Brak salda urlopowego dla tego roku.
              </div>

              {canManageBalance && (
                <button
                  type="button"
                  className="primary-button"
                  style={{ marginTop: "12px" }}
                  onClick={openCreateBalance}
                >
                  Utwórz saldo
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="user-details-card">
        <div className="page-header" style={{ marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Dokumenty pracownika</h3>

          {canManageDocuments && (
            <button
              type="button"
              className="primary-button"
              onClick={openAddDocument}
            >
              Dodaj dokument
            </button>
          )}
        </div>

        {documentsError && <div className="auth-error">{documentsError}</div>}

        {documentsLoading ? (
          <div className="section-muted">Ładowanie dokumentów...</div>
        ) : documents.length === 0 ? (
          <div className="section-muted">Brak dokumentów pracownika.</div>
        ) : (
          <div className="documents-list">
            {documents.map((document) => (
              <div key={document.id} className="document-card">
                <div className="document-left">
                  <div className="document-title">{document.title}</div>
                  <div className="document-meta">
                    Typ: {documentTypeLabels[document.document_type] || document.document_type}
                  </div>
                  <div className="document-meta">
                    Plik: {document.original_file_name}
                  </div>
                  {document.description && (
                    <div className="document-meta">
                      Opis: {document.description}
                    </div>
                  )}
                  <div className="document-meta">
                    Dodał: {document.uploaded_by_name || "-"}
                  </div>
                </div>

                <div className="document-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      handleDownloadDocument(document.id, document.original_file_name)
                    }
                  >
                    Pobierz
                  </button>

                  {canManageDocuments && (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDeleteDocument(document.id)}
                      disabled={deletingDocumentId === document.id}
                    >
                      {deletingDocumentId === document.id ? "Usuwanie..." : "Usuń"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="user-details-card">
        <div className="page-header" style={{ marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Historia wniosków urlopowych</h3>

          <div className="user-history-filters">
            <button
              type="button"
              className={statusFilter === "all" ? "primary-button" : "secondary-button"}
              onClick={() => setStatusFilter("all")}
            >
              Wszystkie
            </button>

            <button
              type="button"
              className={statusFilter === "pending" ? "primary-button" : "secondary-button"}
              onClick={() => setStatusFilter("pending")}
            >
              Oczekujące
            </button>

            <button
              type="button"
              className={statusFilter === "approved" ? "primary-button" : "secondary-button"}
              onClick={() => setStatusFilter("approved")}
            >
              Zaakceptowane
            </button>

            <button
              type="button"
              className={statusFilter === "rejected" ? "primary-button" : "secondary-button"}
              onClick={() => setStatusFilter("rejected")}
            >
              Odrzucone
            </button>
          </div>
        </div>

        {leavesLoading ? (
          <div className="section-muted">Ładowanie historii...</div>
        ) : leaves.length === 0 ? (
          <div className="section-muted">Brak wniosków urlopowych.</div>
        ) : (
          <div className="leave-list">
            {leaves.map((leave) => (
              <div key={leave.id} className="leave-card">
                <div className="leave-left">
                  <div className="leave-title">
                    {leaveTypeLabels[leave.leave_type] || leave.leave_type}
                  </div>

                  <div className="leave-dates">
                    {leave.start_date} → {leave.end_date}
                  </div>

                  <div className="leave-extra">
                    {leave.total_days} dni
                  </div>

                  {leave.decision_comment && (
                    <div className="leave-extra">
                      Komentarz: {leave.decision_comment}
                    </div>
                  )}
                </div>

                <div className="leave-right">
                  <span className={`status-badge status-${leave.status}`}>
                    {leave.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editBalanceOpen && balance && (
        <div className="modal-overlay" onClick={closeBalanceEdit}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 style={{ margin: 0 }}>Edycja salda urlopowego</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={closeBalanceEdit}
              >
                Zamknij
              </button>
            </div>

            <div className="form-grid">
              <div>
                <label>Limit podstawowy</label>
                <input
                  type="number"
                  name="base_limit_days"
                  min="0"
                  value={balanceForm.base_limit_days}
                  onChange={handleBalanceFormChange}
                />
              </div>

              <div>
                <label>Przeniesione dni</label>
                <input
                  type="number"
                  name="carried_over_days"
                  min="0"
                  value={balanceForm.carried_over_days}
                  onChange={handleBalanceFormChange}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="primary-button"
                onClick={handleSaveBalance}
                disabled={balanceSaving}
              >
                {balanceSaving ? "Zapisywanie..." : "Zapisz saldo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {createBalanceOpen && (
        <div className="modal-overlay" onClick={closeCreateBalance}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 style={{ margin: 0 }}>Utwórz saldo urlopowe</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={closeCreateBalance}
              >
                Zamknij
              </button>
            </div>

            <div className="form-grid">
              <div>
                <label>Limit podstawowy</label>
                <input
                  type="number"
                  name="base_limit_days"
                  min="0"
                  value={createBalanceForm.base_limit_days}
                  onChange={handleCreateBalanceFormChange}
                />
              </div>

              <div>
                <label>Przeniesione dni</label>
                <input
                  type="number"
                  name="carried_over_days"
                  min="0"
                  value={createBalanceForm.carried_over_days}
                  onChange={handleCreateBalanceFormChange}
                />
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="primary-button"
                onClick={handleCreateBalance}
                disabled={createBalanceLoading}
              >
                {createBalanceLoading ? "Tworzenie..." : "Utwórz saldo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addDocumentOpen && (
        <div className="modal-overlay" onClick={closeAddDocument}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 style={{ margin: 0 }}>Dodaj dokument</h2>
              <button
                type="button"
                className="secondary-button"
                onClick={closeAddDocument}
              >
                Zamknij
              </button>
            </div>

            <div className="form-grid">
              <div>
                <label>Typ dokumentu</label>
                <select
                  name="document_type"
                  value={documentForm.document_type}
                  onChange={handleDocumentFormChange}
                >
                  {documentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Tytuł</label>
                <input
                  type="text"
                  name="title"
                  value={documentForm.title}
                  onChange={handleDocumentFormChange}
                  placeholder="Np. Umowa o pracę 2026"
                />
              </div>
            </div>

            <div className="form-full" style={{ marginTop: "16px" }}>
              <label>Opis</label>
              <textarea
                name="description"
                value={documentForm.description}
                onChange={handleDocumentFormChange}
                placeholder="Opcjonalny opis dokumentu"
              />
            </div>

            <div className="form-full" style={{ marginTop: "16px" }}>
              <label>Plik</label>
              <input
                type="file"
                onChange={handleDocumentFileChange}
              />
            </div>

            <div className="form-actions" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="primary-button"
                onClick={handleAddDocument}
                disabled={documentSaving}
              >
                {documentSaving ? "Dodawanie..." : "Dodaj dokument"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
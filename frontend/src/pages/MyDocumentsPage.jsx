import { useEffect, useState } from "react";
import api from "../services/api";

const documentTypeLabels = {
  umowa: "Umowa",
  aneks: "Aneks",
  pit: "PIT",
  badania: "Badania",
  bhp: "BHP",
  ppk: "PPK",
  inne: "Inne",
};

export default function MyDocumentsPage() {
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const profileRes = await api.get("/me");
      setProfile(profileRes.data);

      const docsRes = await api.get(`/users/${profileRes.data.id}/documents`);
      setDocuments(docsRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Nie udało się pobrać dokumentów.");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      setError("Nie udało się pobrać dokumentu.");
    }
  };

  return (
    <div className="user-details-page">
      <div className="page-header">
        <h1 className="page-title">Moje dokumenty</h1>
      </div>

      {error && <div className="auth-error">{error}</div>}

      {loading ? (
        <div className="user-details-card">
          <div className="section-muted">Ładowanie dokumentów...</div>
        </div>
      ) : (
        <>
          <div className="summary-grid">
            <div className="summary-card">
              <span>Pracownik</span>
              <strong>
                {profile?.first_name} {profile?.last_name}
              </strong>
            </div>

            <div className="summary-card">
              <span>Liczba dokumentów</span>
              <strong>{documents.length}</strong>
            </div>

            <div className="summary-card">
              <span>Dział</span>
              <strong>{profile?.department || "-"}</strong>
            </div>

            <div className="summary-card">
              <span>Rola</span>
              <strong>{profile?.role || "-"}</strong>
            </div>
          </div>

          <div className="user-details-card">
            <h3>Lista dokumentów</h3>

            {documents.length === 0 ? (
              <div className="section-muted">Brak dokumentów.</div>
            ) : (
              <div className="documents-list">
                {documents.map((document) => (
                  <div key={document.id} className="document-card">
                    <div className="document-left">
                      <div className="document-title">{document.title}</div>

                      <div className="document-meta">
                        Typ:{" "}
                        {documentTypeLabels[document.document_type] ||
                          document.document_type}
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
                          handleDownloadDocument(
                            document.id,
                            document.original_file_name
                          )
                        }
                      >
                        Pobierz
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
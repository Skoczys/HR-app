import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const initialForm = {
  employee_number: "",
  first_name: "",
  last_name: "",
  department: "",
  role: "",
  job_title: "",
  manager_user_id: "",
  leave_seniority_years: "",
  hire_date: "",
  email: "",
  password: "",
};

const roleOptions = [
  { value: "pracownik", label: "Pracownik" },
  { value: "kierownik", label: "Kierownik" },
  { value: "kadry", label: "Kadry" },
  { value: "zarzad", label: "Zarząd" },
  { value: "admin", label: "Admin" },
];

const departmentOptions = [
  { value: "IT", label: "IT" },
  { value: "HR", label: "HR" },
  { value: "Finanse", label: "Finanse" },
  { value: "Produkcja", label: "Produkcja" },
];

export default function UsersPage() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState(null);

  const [filters, setFilters] = useState({
    name: "",
    department: "",
    role: "",
    status: "active",
  });

  const [showForm, setShowForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formLoading, setFormLoading] = useState(false);

  const [editingBalance, setEditingBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

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

  const currentYear = new Date().getFullYear();

  const isAdmin = profile?.role === "admin";
  const isManager = profile?.role === "kierownik";

  const canViewUsers =
    profile?.role === "admin" ||
    profile?.role === "kadry" ||
    profile?.role === "kierownik" ||
    profile?.role === "zarzad";

  const canManageUsers = profile?.role === "admin" || profile?.role === "kadry";

  const loadUsers = async () => {
    try {
      const params = {};

      if (filters.name) params.name = filters.name;
      if (filters.department) params.department = filters.department;
      if (filters.role) params.role = filters.role;

      if (filters.status === "active") params.is_active = true;
      if (filters.status === "inactive") params.is_active = false;

      const res = await api.get("/users", { params });
      setUsers(res.data);
    } catch (err) {
      setError("Nie udało się pobrać pracowników");
      console.error(err);
    }
  };

  const loadManagers = async () => {
    try {
      const res = await api.get("/users", {
        params: { is_active: true },
      });

      const filteredManagers = res.data.filter((user) =>
        ["kierownik", "kadry", "zarzad", "admin"].includes(user.role)
      );

      setManagers(filteredManagers);
    } catch (err) {
      console.error(err);
    }
  };

  const loadProfile = async () => {
    try {
      const res = await api.get("/me");
      setProfile(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUserBalance = async (userId) => {
    setBalanceLoading(true);

    try {
      const res = await api.get(`/leave_balance/${userId}?year=${currentYear}`);
      setEditingBalance(res.data);
      setBalanceForm({
        base_limit_days: res.data.base_limit_days,
        carried_over_days: res.data.carried_over_days,
      });
    } catch (err) {
      console.error(err);
      setEditingBalance(null);
      setBalanceForm({
        base_limit_days: 20,
        carried_over_days: 0,
      });
    } finally {
      setBalanceLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      loadUsers();
    }
  }, [filters, profile]);

  useEffect(() => {
    if (canManageUsers) {
      loadManagers();
    }
  }, [canManageUsers]);

  const handleDeactivate = async (userId) => {
    setLoadingId(userId);
    setError("");

    try {
      await api.delete(`/users/${userId}`);
      await loadUsers();
    } catch (err) {
      setError("Nie udało się dezaktywować użytkownika");
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRestore = async (userId) => {
    setLoadingId(userId);
    setError("");

    try {
      await api.patch(`/users/${userId}/restore`);
      await loadUsers();
    } catch (err) {
      setError("Nie udało się przywrócić użytkownika");
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBalanceFormChange = (e) => {
    const { name, value } = e.target;

    setBalanceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateBalanceFormChange = (e) => {
    const { name, value } = e.target;

    setCreateBalanceForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateForm = () => {
    setEditingUserId(null);
    setEditingBalance(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
  };

  const openEditForm = async (user) => {
    setEditingUserId(user.id);
    setForm({
      employee_number: user.employee_number || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      department: user.department || "",
      role: user.role || "",
      job_title: user.job_title || "",
      manager_user_id: user.manager_user_id ? String(user.manager_user_id) : "",
      leave_seniority_years:
        user.leave_seniority_years !== undefined && user.leave_seniority_years !== null
          ? String(user.leave_seniority_years)
          : "",
      hire_date: user.hire_date || "",
      email: user.email || "",
      password: "",
    });
    setShowForm(true);
    setError("");
    await loadUserBalance(user.id);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setEditingBalance(null);
    setForm(initialForm);
  };

  const openBalanceEdit = () => {
    if (!editingBalance) return;

    setBalanceForm({
      base_limit_days: editingBalance.base_limit_days,
      carried_over_days: editingBalance.carried_over_days,
    });
    setEditBalanceOpen(true);
  };

  const closeBalanceEdit = () => {
    setEditBalanceOpen(false);
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

  const handleSaveBalance = async () => {
    if (!editingBalance) return;

    setBalanceSaving(true);
    setError("");

    try {
      await api.put(`/leave_balance/${editingBalance.id}`, {
        base_limit_days: Number(balanceForm.base_limit_days),
        carried_over_days: Number(balanceForm.carried_over_days),
      });

      await loadUserBalance(editingUserId);
      setEditBalanceOpen(false);
    } catch (err) {
      console.error(err);
      setError("Nie udało się zapisać salda urlopowego");
    } finally {
      setBalanceSaving(false);
    }
  };

  const handleCreateBalance = async () => {
    if (!editingUserId) return;

    setCreateBalanceLoading(true);
    setError("");

    try {
      await api.post("/leave_balance", {
        user_id: Number(editingUserId),
        year: currentYear,
        base_limit_days: Number(createBalanceForm.base_limit_days),
        carried_over_days: Number(createBalanceForm.carried_over_days),
      });

      await loadUserBalance(editingUserId);
      setCreateBalanceOpen(false);
    } catch (err) {
      console.error(err);
      setError("Nie udało się utworzyć salda urlopowego");
    } finally {
      setCreateBalanceLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setError("");

    try {
      const payload = {
        employee_number: form.employee_number,
        first_name: form.first_name,
        last_name: form.last_name,
        department: form.department,
        role: form.role,
        job_title: form.job_title || null,
        manager_user_id: form.manager_user_id ? Number(form.manager_user_id) : null,
        leave_seniority_years: Number(form.leave_seniority_years),
        hire_date: form.hire_date,
        email: form.email,
      };

      if (isAdmin) {
        payload.password = form.password || null;
      }

      if (!editingUserId && !isAdmin) {
        payload.password = form.password;
      }

      if (editingUserId) {
        await api.put(`/users/${editingUserId}`, payload);
      } else {
        await api.post("/users", payload);
      }

      closeForm();
      await loadUsers();
      await loadManagers();
    } catch (err) {
      setError("Nie udało się zapisać pracownika");
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const goToUserDetails = (userId) => {
    navigate(`/users/${userId}`);
  };

  if (!canViewUsers) {
    return (
      <div className="users-page">
        <h1 className="page-title">Pracownicy</h1>
        <div className="auth-error">Brak uprawnień do tej sekcji.</div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1 className="page-title">
          {isManager ? "Mój zespół" : "Pracownicy"}
        </h1>

        {canManageUsers && (
          <button className="primary-button" onClick={openCreateForm}>
            Nowy pracownik
          </button>
        )}
      </div>

      {error && <div className="auth-error">{error}</div>}

      {showForm && canManageUsers && (
        <div className="users-form-card">
          <div className="page-header">
            <h2>{editingUserId ? "Edytuj pracownika" : "Dodaj pracownika"}</h2>
            <button className="secondary-button" onClick={closeForm}>
              Zamknij
            </button>
          </div>

          <form onSubmit={handleSubmit} className="leave-form">
            <div className="form-grid">
              <div>
                <label>Nr pracownika</label>
                <input
                  name="employee_number"
                  value={form.employee_number}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label>Imię</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label>Nazwisko</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label>Dział</label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Wybierz dział</option>
                  {departmentOptions.map((department) => (
                    <option key={department.value} value={department.value}>
                      {department.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Rola</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Wybierz rolę</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Stanowisko</label>
                <input
                  name="job_title"
                  value={form.job_title}
                  onChange={handleFormChange}
                />
              </div>

              <div>
                <label>Przełożony</label>
                <select
                  name="manager_user_id"
                  value={form.manager_user_id}
                  onChange={handleFormChange}
                >
                  <option value="">Brak</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.first_name} {manager.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Lata do urlopu</label>
                <input
                  name="leave_seniority_years"
                  type="number"
                  min="0"
                  value={form.leave_seniority_years}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label>Data zatrudnienia</label>
                <input
                  name="hire_date"
                  type="date"
                  value={form.hire_date}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  required
                />
              </div>

              {(!editingUserId || isAdmin) && (
                <div>
                  <label>
                    {editingUserId ? "Nowe hasło (opcjonalnie)" : "Hasło startowe"}
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleFormChange}
                    required={!editingUserId}
                  />
                </div>
              )}
            </div>

            {editingUserId && (
              <div className="user-balance-box">
                <div
                  className="page-header"
                  style={{ marginBottom: "16px", marginTop: "24px" }}
                >
                  <h3 style={{ margin: 0 }}>Saldo urlopowe ({currentYear})</h3>

                  {!balanceLoading && editingBalance && (
                    <button
                      type="button"
                      className="primary-button"
                      onClick={openBalanceEdit}
                    >
                      Edytuj saldo
                    </button>
                  )}
                </div>

                {balanceLoading ? (
                  <div className="section-muted">Ładowanie salda...</div>
                ) : editingBalance ? (
                  <div className="user-details-list">
                    <div className="user-details-row user-details-row-highlight">
                      <strong>Pozostało do wykorzystania</strong>
                      <span>{editingBalance.remaining_days} dni</span>
                    </div>

                    <div className="user-details-row">
                      <strong>Wykorzystane</strong>
                      <span>{editingBalance.used_days} dni</span>
                    </div>

                    <div className="user-details-row">
                      <strong>Limit podstawowy</strong>
                      <span>{editingBalance.base_limit_days} dni</span>
                    </div>

                    <div className="user-details-row">
                      <strong>Przeniesione</strong>
                      <span>{editingBalance.carried_over_days} dni</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="section-muted">
                      Brak salda urlopowego dla tego roku.
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      style={{ marginTop: "12px" }}
                      onClick={openCreateBalance}
                    >
                      Utwórz saldo
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="primary-button" disabled={formLoading}>
                {formLoading
                  ? "Zapisywanie..."
                  : editingUserId
                    ? "Zapisz zmiany"
                    : "Dodaj pracownika"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-filters-card">
        <div className="users-filters-grid">
          <div>
            <label>Szukaj</label>
            <input
              type="text"
              name="name"
              placeholder="Imię lub nazwisko"
              value={filters.name}
              onChange={handleFilterChange}
            />
          </div>

          <div>
            <label>Dział</label>
            <input
              type="text"
              name="department"
              placeholder="Np. IT"
              value={filters.department}
              onChange={handleFilterChange}
            />
          </div>

          <div>
            <label>Rola</label>
            <input
              type="text"
              name="role"
              placeholder="Np. kierownik"
              value={filters.role}
              onChange={handleFilterChange}
            />
          </div>

          <div>
            <label>Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="active">Aktywni</option>
              {!isManager && isAdmin && <option value="inactive">Nieaktywni</option>}
              {!isManager && isAdmin && <option value="all">Wszyscy</option>}
            </select>
          </div>
        </div>
      </div>

      <div className="users-table-card">
        <div className="users-table-head">
          <div>Nr</div>
          <div>Imię i nazwisko</div>
          <div>Dział</div>
          <div>Rola</div>
          <div>Stanowisko</div>
          <div>Email</div>
          <div>Akcje</div>
        </div>

        {users.map((user) => (
          <div key={user.id} className="users-table-row">
            <div>{user.employee_number}</div>
            <div>
              {user.first_name} {user.last_name}
            </div>
            <div>{user.department}</div>
            <div>{user.role}</div>
            <div>{user.job_title || "-"}</div>
            <div>{user.email}</div>

            <div className="users-actions">
              <button
                className="table-button secondary-button"
                onClick={() => goToUserDetails(user.id)}
              >
                Szczegóły
              </button>

              {canManageUsers && (
                <button
                  className="table-button secondary-button"
                  onClick={() => openEditForm(user)}
                >
                  Edytuj
                </button>
              )}

              {isAdmin && filters.status !== "inactive" && (
                <button
                  className="table-button danger-button"
                  onClick={() => handleDeactivate(user.id)}
                  disabled={loadingId === user.id}
                >
                  Dezaktywuj
                </button>
              )}

              {isAdmin && filters.status !== "active" && (
                <button
                  className="table-button secondary-button"
                  onClick={() => handleRestore(user.id)}
                  disabled={loadingId === user.id}
                >
                  Przywróć
                </button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="users-empty">Brak pracowników do wyświetlenia.</div>
        )}
      </div>

      {editBalanceOpen && editingBalance && (
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

      {createBalanceOpen && editingUserId && (
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
    </div>
  );
}
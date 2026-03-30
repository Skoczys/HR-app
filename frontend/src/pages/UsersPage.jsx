import { useEffect, useState } from "react";
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

  const openCreateForm = () => {
    setEditingUserId(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
  };

  const openEditForm = (user) => {
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
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingUserId(null);
    setForm(initialForm);
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
    </div>
  );
}
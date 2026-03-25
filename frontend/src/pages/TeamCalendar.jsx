import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const monthNames = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

const weekDays = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"];

const leaveTypeLabels = {
  wypoczynkowy: "Urlop wypoczynkowy",
  na_zadanie: "Na żądanie",
  chorobowe: "Chorobowe",
  okolicznosciowy: "Okolicznościowy",
  bezplatny: "Bezpłatny",
};

const leaveTypeClassMap = {
  wypoczynkowy: "calendar-event-vacation",
  na_zadanie: "calendar-event-demand",
  chorobowe: "calendar-event-sick",
  okolicznosciowy: "calendar-event-occasion",
  bezplatny: "calendar-event-unpaid",
};

export default function TeamCalendar() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState([]);
  const [filterType, setFilterType] = useState("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/team/calendar?year=${year}&month=${month}`);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const firstDayOfMonth = useMemo(() => {
    const jsDay = new Date(year, month - 1, 1).getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }, [year, month]);

  const filteredEvents = useMemo(() => {
    if (filterType === "all") {
      return events;
    }

    return events.filter((event) => event.leave_type === filterType);
  }, [events, filterType]);

  const isEventOnDay = (event, day) => {
    const cellDate = new Date(year, month - 1, day);
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    return cellDate >= start && cellDate <= end;
  };

  const getEventsForDay = (day) => {
    return filteredEvents.filter((event) => isEventOnDay(event, day));
  };

  const getTodayEvents = () => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    return filteredEvents.filter((event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);

      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      return todayDate >= start && todayDate <= end;
    });
  };

  const openDayModal = (day) => {
    const dayEvents = getEventsForDay(day);

    if (dayEvents.length === 0) return;

    setSelectedDay(day);
    setSelectedDayEvents(dayEvents);
  };

  const closeDayModal = () => {
    setSelectedDay(null);
    setSelectedDayEvents([]);
  };

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
      return;
    }

    setMonth((prev) => prev - 1);
  };

  const goToNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
      return;
    }

    setMonth((prev) => prev + 1);
  };

  const calendarCells = useMemo(() => {
    const cells = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    return cells;
  }, [firstDayOfMonth, daysInMonth]);

  const todayEvents = getTodayEvents();

  return (
    <div className="leave-page">
      <div className="page-header">
        <h1 className="page-title">Kalendarz zespołu</h1>

        <div className="calendar-toolbar">
          <button
            type="button"
            className="secondary-button"
            onClick={goToPreviousMonth}
          >
            ←
          </button>

          <div className="calendar-month-title">
            {monthNames[month - 1]} {year}
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={goToNextMonth}
          >
            →
          </button>
        </div>
      </div>

      <div className="today-card">
        <h3>Dziś nieobecni</h3>

        {todayEvents.length === 0 ? (
          <p className="section-muted">Brak nieobecności</p>
        ) : (
          <div className="today-list">
            {todayEvents.map((event) => (
              <div key={event.id} className="today-item">
                <strong>{event.employee_name}</strong>

                <span
                  className={`calendar-event-pill ${
                    leaveTypeClassMap[event.leave_type] || "calendar-event-vacation"
                  }`}
                >
                  {leaveTypeLabels[event.leave_type] || event.leave_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="calendar-filters">
        <button
          type="button"
          className={filterType === "all" ? "primary-button" : "secondary-button"}
          onClick={() => setFilterType("all")}
        >
          Wszystko
        </button>

        {Object.entries(leaveTypeLabels).map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={filterType === key ? "primary-button" : "secondary-button"}
            onClick={() => setFilterType(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="calendar-legend">
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot calendar-event-vacation" />
          Urlop wypoczynkowy
        </div>

        <div className="calendar-legend-item">
          <span className="calendar-legend-dot calendar-event-demand" />
          Na żądanie
        </div>

        <div className="calendar-legend-item">
          <span className="calendar-legend-dot calendar-event-sick" />
          Chorobowe
        </div>

        <div className="calendar-legend-item">
          <span className="calendar-legend-dot calendar-event-occasion" />
          Okolicznościowy
        </div>

        <div className="calendar-legend-item">
          <span className="calendar-legend-dot calendar-event-unpaid" />
          Bezpłatny
        </div>
      </div>

      {loading ? (
        <p>Ładowanie...</p>
      ) : (
        <>
          <div className="calendar-weekdays">
            {weekDays.map((dayName) => (
              <div key={dayName} className="calendar-weekday">
                {dayName}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {calendarCells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="calendar-cell calendar-cell-empty"
                  />
                );
              }

              const dayEvents = getEventsForDay(day);

              return (
                <div
                  key={day}
                  className={`calendar-cell ${
                    dayEvents.length > 0 ? "calendar-cell-active" : ""
                  }`}
                  onClick={() => openDayModal(day)}
                >
                  <div className="calendar-day">{day}</div>

                  <div className="calendar-events-preview">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`calendar-event-pill ${
                          leaveTypeClassMap[event.leave_type] || "calendar-event-vacation"
                        }`}
                      >
                        {event.employee_name}
                      </div>
                    ))}

                    {dayEvents.length > 2 && (
                      <div className="calendar-more">
                        +{dayEvents.length - 2} więcej
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEvents.length === 0 && (
            <div className="empty-card">
              Brak zatwierdzonych nieobecności zespołu dla wybranego widoku.
            </div>
          )}
        </>
      )}

      {selectedDay && (
        <div className="modal-overlay" onClick={closeDayModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="page-header">
              <h2 className="page-title" style={{ marginBottom: 0 }}>
                Nieobecności — {selectedDay} {monthNames[month - 1]} {year}
              </h2>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDayModal}
              >
                Zamknij
              </button>
            </div>

            <div className="calendar-modal-list">
              {selectedDayEvents.map((event) => (
                <div key={event.id} className="calendar-modal-item">
                  <div className="calendar-modal-top">
                    <strong>{event.employee_name}</strong>

                    <span
                      className={`calendar-event-pill ${
                        leaveTypeClassMap[event.leave_type] || "calendar-event-vacation"
                      }`}
                    >
                      {leaveTypeLabels[event.leave_type] || event.leave_type}
                    </span>
                  </div>

                  <div className="calendar-modal-meta">
                    <div>
                      <strong>Dział:</strong> {event.employee_department || "-"}
                    </div>

                    <div>
                      <strong>Stanowisko:</strong> {event.employee_job_title || "-"}
                    </div>

                    <div>
                      <strong>Termin:</strong> {event.start_date} → {event.end_date}
                    </div>

                    <div>
                      <strong>Liczba dni:</strong> {event.total_days}
                    </div>

                    <div>
                      <strong>Komentarz decyzji:</strong>{" "}
                      {event.decision_comment || "Brak"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
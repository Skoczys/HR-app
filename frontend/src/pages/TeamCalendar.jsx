import { useEffect, useState } from "react";
import api from "../services/api";

export default function TeamCalendar() {
  const today = new Date();

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/team/calendar?year=${year}&month=${month}`
      );
      setEvents(res.data.events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, month]);

  // Generowanie dni miesiąca
  const getDaysInMonth = () => {
    return new Date(year, month, 0).getDate();
  };

  // Sprawdzenie czy event nachodzi na dzień
  const isEventOnDay = (event, day) => {
    const date = new Date(year, month - 1, day);

    const start = new Date(event.start_date);
    const end = new Date(event.end_date);

    return date >= start && date <= end;
  };

  // Pobranie eventów dla dnia
  const getEventsForDay = (day) => {
    return events.filter((event) => isEventOnDay(event, day));
  };

  return (
    <div className="leave-page">
      <div className="page-header">
        <h1 className="page-title">Kalendarz zespołu</h1>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="secondary-button"
            onClick={() => setMonth((prev) => (prev === 1 ? 12 : prev - 1))}
          >
            ←
          </button>

          <div>
            {year} / {month}
          </div>

          <button
            className="secondary-button"
            onClick={() => setMonth((prev) => (prev === 12 ? 1 : prev + 1))}
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <p>Ładowanie...</p>
      ) : (
        <div className="calendar-grid">
          {[...Array(getDaysInMonth())].map((_, index) => {
            const day = index + 1;
            const dayEvents = getEventsForDay(day);

            return (
              <div
                key={day}
                className="calendar-cell"
                onClick={() =>
                  dayEvents.length > 0 && setSelectedDayEvents(dayEvents)
                }
              >
                <div className="calendar-day">{day}</div>

                {dayEvents.length > 0 && (
                  <div className="calendar-badge">
                    {dayEvents.length} os.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedDayEvents && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="page-header">
              <h2 className="page-title">Nieobecności</h2>
              <button
                className="secondary-button"
                onClick={() => setSelectedDayEvents(null)}
              >
                Zamknij
              </button>
            </div>

            <div className="details-grid">
              {selectedDayEvents.map((event) => (
                <div key={event.id}>
                  <strong>{event.employee_name}</strong>
                  <br />
                  {event.leave_type}
                  <br />
                  {event.start_date} → {event.end_date}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
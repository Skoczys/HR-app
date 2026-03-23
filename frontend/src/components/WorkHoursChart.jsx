import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const COLORS = ["#93b126", "#93b126", "#93b126", "#d7dee6", "#93b126"];

export default function WorkHoursChart({ data }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3>Godziny pracy w tygodniu</h3>
          <p>Podgląd tygodniowy czasu pracy</p>
        </div>
        <div className="chart-total">
          {data.reduce((sum, item) => sum + item.hours, 0)}h
        </div>
      </div>

      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} barCategoryGap={24}>
          <XAxis dataKey="day" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(147, 177, 38, 0.08)" }}
            formatter={(value) => [`${value} h`, "Godziny"]}
          />
          <Bar dataKey="hours" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index] || "#93b126"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
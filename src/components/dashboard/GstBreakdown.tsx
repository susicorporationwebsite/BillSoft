import { formatCurrency } from '@/utils/billUtils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface GstBreakdownProps {
  sgst: number;
  cgst: number;
  igst: number;
}

export function GstBreakdown({ sgst, cgst, igst }: GstBreakdownProps) {
  const data = [
    { name: 'SGST', value: sgst, color: 'hsl(var(--primary))' },
    { name: 'CGST', value: cgst, color: 'hsl(var(--gold))' },
    { name: 'IGST', value: igst, color: 'hsl(var(--info))' },
  ].filter(item => item.value > 0);

  const total = sgst + cgst + igst;

  if (total === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 shadow-soft animate-slide-up">
        <h3 className="text-lg font-semibold text-foreground mb-4">GST Collection Breakdown</h3>
        <p className="text-muted-foreground text-sm">No GST data available</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">GST Collection Breakdown</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-muted-foreground">SGST</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(sgst)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CGST</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(cgst)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">IGST</p>
          <p className="text-sm font-semibold text-foreground">{formatCurrency(igst)}</p>
        </div>
      </div>
    </div>
  );
}

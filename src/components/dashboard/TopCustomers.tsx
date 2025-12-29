import { formatCurrency } from '@/utils/billUtils';

interface TopCustomersProps {
  customers: { name: string; amount: number }[];
}

export function TopCustomers({ customers }: TopCustomersProps) {
  const maxAmount = customers.length > 0 ? Math.max(...customers.map(c => c.amount)) : 1;

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-soft animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">Top Customers</h3>
      <div className="space-y-4">
        {customers.length === 0 ? (
          <p className="text-muted-foreground text-sm">No customer data available</p>
        ) : (
          customers.map((customer, index) => (
            <div key={customer.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  {customer.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(customer.amount)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary rounded-full h-2 transition-all duration-500"
                  style={{ width: `${(customer.amount / maxAmount) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

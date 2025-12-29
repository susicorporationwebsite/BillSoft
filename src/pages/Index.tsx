import { useEffect, useState } from "react";
import { IndianRupee, FileText, TrendingUp, Receipt } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { TopCustomers } from "@/components/dashboard/TopCustomers";
import { GstBreakdown } from "@/components/dashboard/GstBreakdown";
import { calculateDashboardStats } from "@/utils/billUtils";
import { billApi } from "@/services/api";
import { DashboardStats } from "@/types/billing";

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalBills: 0,
    sgstCollected: 0,
    cgstCollected: 0,
    igstCollected: 0,
    monthlyRevenue: [],
    topCustomers: [],
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const bills = await billApi.getAll();
        setStats(calculateDashboardStats(bills));
      } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
      }
    };
    fetchStats();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Overview of your billing activity
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={stats.totalRevenue}
            icon={IndianRupee}
            isCurrency
          />
          <StatCard
            title="Total Invoices"
            value={stats.totalBills}
            icon={FileText}
          />
          <StatCard
            title="GST Collected"
            value={
              stats.sgstCollected + stats.cgstCollected + stats.igstCollected
            }
            icon={Receipt}
            isCurrency
          />
          <StatCard
            title="Avg Invoice Value"
            value={
              stats.totalBills > 0 ? stats.totalRevenue / stats.totalBills : 0
            }
            icon={TrendingUp}
            isCurrency
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart data={stats.monthlyRevenue} />
          <GstBreakdown
            sgst={stats.sgstCollected}
            cgst={stats.cgstCollected}
            igst={stats.igstCollected}
          />
        </div>
        <TopCustomers customers={stats.topCustomers} />
      </div>
    </MainLayout>
  );
};

export default Dashboard;

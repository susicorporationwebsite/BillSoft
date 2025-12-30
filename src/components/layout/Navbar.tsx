import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Plus,
  FileText,
  Clock,
  Download,
  LogOut,
} from "lucide-react";
import { billApi } from "@/services/api";
import companyLogo from "@/assets/company-logo.png";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/new-bill", label: "New Bill", icon: Plus },
  { path: "/bills", label: "View All Bills", icon: FileText },
];

export function Navbar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-soft">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={companyLogo}
              alt="Susi Corporation"
              className="h-12 w-auto transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-bold text-primary">
                SUSI CORPORATION
              </h1>
              <p className="text-xs text-muted-foreground">
                GST Billing System
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              );
            })}

            <button
              className="nav-link text-primary hover:text-primary hover:bg-primary/10"
              onClick={async () => {
                if (!confirm("Download full backup of all bills?")) return;
                try {
                  const bills = await billApi.getAll();
                  const headers = [
                    "Invoice No",
                    "Date",
                    "Buyer",
                    "GSTIN",
                    "Total",
                    "Status",
                    "Drive Link",
                  ];
                  const csvContent =
                    "data:text/csv;charset=utf-8," +
                    headers.join(",") +
                    "\n" +
                    bills
                      .map(
                        (b) =>
                          `"${b.invoiceNo}","${b.invoiceDate}","${
                            b.buyerName
                          }","${b.buyerGstin}","${b.grandTotal}","${
                            b.status
                          }","${
                            b.driveFileId
                              ? `https://drive.google.com/file/d/${b.driveFileId}/view`
                              : ""
                          }"`
                      )
                      .join("\n");

                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute(
                    "download",
                    `billflow_backup_${
                      new Date().toISOString().split("T")[0]
                    }.csv`
                  );
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } catch (e) {
                  console.error(e);
                  alert("Backup failed. Check console.");
                }
              }}
            >
              <Download className="w-4 h-4" />
              <span className="hidden lg:inline">Backup Data</span>
            </button>

            <button
              className="nav-link text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm("Are you sure you want to logout?")) {
                  logout();
                  toast.success("Logged out successfully");
                }
              }}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

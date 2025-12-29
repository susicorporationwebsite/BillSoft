import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  Edit,
  Trash2,
  Download,
  Search,
  Plus,
  Filter,
} from "lucide-react";
import { Bill, FilterOptions } from "@/types/billing";
import { filterBills, formatCurrency, formatDate } from "@/utils/billUtils";
import { billApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function BillsList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: "last3months",
    searchTerm: "",
    searchField: "buyerName",
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchBills = async () => {
    try {
      const data = await billApi.getAll();
      setBills(data);
    } catch (e) {
      toast({ title: "Failed to load bills", variant: "destructive" });
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const filteredBills = useMemo(
    () => filterBills(bills, filters),
    [bills, filters]
  );

  const handleDelete = async (id: string) => {
    try {
      await billApi.delete(id);
      await fetchBills();
      setDeleteId(null);
      toast({ title: "Invoice deleted successfully" });
    } catch (e) {
      toast({ title: "Error deleting invoice", variant: "destructive" });
    }
  };

  const handleDownloadPdf = (bill: Bill) => {
    // Open invoice in new tab for printing/PDF
    navigate(`/invoice/${bill.id}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            All Invoices
          </h1>
          <p className="text-muted-foreground">
            {filteredBills.length} invoices found
          </p>
        </div>
        <Button onClick={() => navigate("/new-bill")}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            value={filters.timeRange}
            onValueChange={(value: FilterOptions["timeRange"]) =>
              setFilters((prev) => ({ ...prev, timeRange: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last1month">Last 1 Month</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
              <SelectItem value="last6months">Last 6 Months</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {filters.timeRange === "custom" && (
            <>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
                placeholder="Start Date"
              />
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
                placeholder="End Date"
              />
            </>
          )}

          <Select
            value={filters.searchField}
            onValueChange={(value: FilterOptions["searchField"]) =>
              setFilters((prev) => ({ ...prev, searchField: value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Search By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyerName">Buyer Name</SelectItem>
              <SelectItem value="invoiceNo">Invoice No</SelectItem>
              <SelectItem value="gstin">GSTIN</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              placeholder="Search..."
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Invoice No
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Buyer Name
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  Total Amount
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                  GST Amount
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredBills.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No invoices found. Create your first invoice!
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr
                    key={bill.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {bill.invoiceNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {bill.buyerName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(bill.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                      {formatCurrency(bill.grandTotal)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                      {formatCurrency(
                        bill.sgstAmount + bill.cgstAmount + bill.igstAmount
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          bill.status === "final"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {bill.status === "final" ? "Final" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/invoice/${bill.id}`)}
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/edit-bill/${bill.id}`)}
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(bill.id)}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPdf(bill)}
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

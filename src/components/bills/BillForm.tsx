import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Save, FileText } from "lucide-react";
import { Bill, BillItem, DEFAULT_COMPANY } from "@/types/billing";
import {
  createEmptyBill,
  calculateItemAmount,
  calculateGST,
  numberToWords,
  validateGSTIN,
} from "@/utils/billUtils";
import { billApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function BillForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchBill = async () => {
      if (id) {
        try {
          const existingBill = await billApi.getById(id);
          setBill(existingBill);
        } catch (error) {
          toast({ title: "Bill not found", variant: "destructive" });
          navigate("/bills");
        }
      } else {
        // For new bill, we need invoice number.
        // getAll is expensive just for invoice number, but simple for now.
        // Ideally we'd have a counter collection or sort by latest.
        const allBills = await billApi.getAll();
        setBill(createEmptyBill(allBills));
      }
    };
    fetchBill();
  }, [id, navigate, toast]);

  if (!bill) return null;

  const updateBill = (updates: Partial<Bill>) => {
    setBill((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const updateItem = (index: number, updates: Partial<BillItem>) => {
    const newItems = [...bill.items];
    newItems[index] = { ...newItems[index], ...updates };

    // Recalculate amount if quantity or rate changed
    if ("quantity" in updates || "rate" in updates) {
      newItems[index].amount = calculateItemAmount(
        newItems[index].quantity,
        newItems[index].rate
      );
    }

    // Recalculate totals
    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    const sgstAmount = calculateGST(subtotal, bill.sgstRate / 100);
    const cgstAmount = calculateGST(subtotal, bill.cgstRate / 100);
    const igstAmount = calculateGST(subtotal, bill.igstRate / 100);
    const grandTotal = subtotal + sgstAmount + cgstAmount + igstAmount;

    updateBill({
      items: newItems,
      subtotal,
      sgstAmount,
      cgstAmount,
      igstAmount,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
    });
  };

  const addItem = () => {
    const newItem: BillItem = {
      sno: bill.items.length + 1,
      description: "",
      hsnCode: "",
      quantity: 0,
      rate: 0,
      amount: 0,
    };
    updateBill({ items: [...bill.items, newItem] });
  };

  const removeItem = (index: number) => {
    if (bill.items.length === 1) {
      toast({ title: "At least one item is required", variant: "destructive" });
      return;
    }
    const newItems = bill.items
      .filter((_, i) => i !== index)
      .map((item, i) => ({
        ...item,
        sno: i + 1,
      }));

    const subtotal = newItems.reduce((sum, item) => sum + item.amount, 0);
    const sgstAmount = calculateGST(subtotal, bill.sgstRate / 100);
    const cgstAmount = calculateGST(subtotal, bill.cgstRate / 100);
    const igstAmount = calculateGST(subtotal, bill.igstRate / 100);
    const grandTotal = subtotal + sgstAmount + cgstAmount + igstAmount;

    updateBill({
      items: newItems,
      subtotal,
      sgstAmount,
      cgstAmount,
      igstAmount,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
    });
  };

  const updateGstRate = (
    field: "sgstRate" | "cgstRate" | "igstRate",
    value: number
  ) => {
    const updates: Partial<Bill> = { [field]: value };
    const subtotal = bill.subtotal;

    const sgstRate = field === "sgstRate" ? value : bill.sgstRate;
    const cgstRate = field === "cgstRate" ? value : bill.cgstRate;
    const igstRate = field === "igstRate" ? value : bill.igstRate;

    const sgstAmount = calculateGST(subtotal, sgstRate / 100);
    const cgstAmount = calculateGST(subtotal, cgstRate / 100);
    const igstAmount = calculateGST(subtotal, igstRate / 100);
    const grandTotal = subtotal + sgstAmount + cgstAmount + igstAmount;

    updateBill({
      ...updates,
      sgstAmount,
      cgstAmount,
      igstAmount,
      grandTotal,
      amountInWords: numberToWords(grandTotal),
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!bill.buyerName.trim()) newErrors.buyerName = "Buyer name is required";
    if (!bill.invoiceDate) newErrors.invoiceDate = "Invoice date is required";
    if (bill.buyerGstin && !validateGSTIN(bill.buyerGstin)) {
      newErrors.buyerGstin = "Invalid GSTIN format";
    }
    if (bill.items.some((item) => !item.description.trim())) {
      newErrors.items = "All items must have a description";
    }
    if (bill.grandTotal <= 0) {
      newErrors.total = "Total amount must be greater than zero";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({
        title: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      const billToSave: Bill = {
        ...bill,
        status: "final",
        updatedAt: new Date().toISOString(),
      };
      let savedBillId = bill.id; // Assume existing ID for update

      if (id) {
        await billApi.update(id, billToSave);
      } else {
        const saved = await billApi.create(billToSave);
        savedBillId = saved.id; // Get the Firestore-generated ID for new bills
      }

      toast({
        title: "Invoice saved successfully",
      });

      // Navigate to the preview of the saved bill using its actual ID
      navigate(`/invoice/${savedBillId}`);
    } catch (e) {
      toast({ title: "Error saving bill", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {id ? "Edit Invoice" : "Create New Invoice"}
          </h1>
          <p className="text-muted-foreground">Invoice No: {bill.invoiceNo}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save & Preview
          </Button>
        </div>
      </div>

      {/* Company Details (Read-only reference) */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Seller Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-primary">{DEFAULT_COMPANY.name}</p>
            <p className="text-muted-foreground">{DEFAULT_COMPANY.address}</p>
          </div>
          <div>
            <p>
              <span className="font-medium">GSTIN:</span>{" "}
              {DEFAULT_COMPANY.gstin}
            </p>
            <p>
              <span className="font-medium">Email:</span>{" "}
              {DEFAULT_COMPANY.email}
            </p>
            <p>
              <span className="font-medium">Mobile:</span>{" "}
              {DEFAULT_COMPANY.mobile}
            </p>
          </div>
        </div>
      </div>

      {/* Buyer Details */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Buyer Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="buyerName">Buyer Name / Company *</Label>
            <Input
              id="buyerName"
              value={bill.buyerName}
              onChange={(e) =>
                updateBill({ buyerName: e.target.value.toUpperCase() })
              }
              placeholder="M/S. COMPANY NAME"
              className={
                errors.buyerName
                  ? "border-destructive bg-secondary/20"
                  : "bg-secondary/20"
              }
            />
            {errors.buyerName && (
              <p className="text-destructive text-sm">{errors.buyerName}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerGstin">Buyer GSTIN</Label>
            <Input
              id="buyerGstin"
              value={bill.buyerGstin}
              onChange={(e) =>
                updateBill({ buyerGstin: e.target.value.toUpperCase() })
              }
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
              className={
                errors.buyerGstin
                  ? "border-destructive bg-secondary/20"
                  : "bg-secondary/20"
              }
            />
            {errors.buyerGstin && (
              <p className="text-destructive text-sm">{errors.buyerGstin}</p>
            )}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="buyerAddress">Buyer Address</Label>
            <Input
              id="buyerAddress"
              value={bill.buyerAddress}
              onChange={(e) =>
                updateBill({ buyerAddress: e.target.value.toUpperCase() })
              }
              placeholder="FULL ADDRESS"
              className="bg-secondary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poNo">PO Number</Label>
            <Input
              id="poNo"
              value={bill.poNo}
              onChange={(e) =>
                updateBill({ poNo: e.target.value.toUpperCase() })
              }
              placeholder="PURCHASE ORDER NO."
              className="bg-secondary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poDate">PO Date</Label>
            <Input
              id="poDate"
              type="date"
              value={bill.poDate}
              onChange={(e) => updateBill({ poDate: e.target.value })}
              className="bg-secondary/20"
            />
          </div>
        </div>
      </div>

      {/* Invoice & Delivery Details */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Invoice & Delivery Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Invoice Date *</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={bill.invoiceDate}
              onChange={(e) => updateBill({ invoiceDate: e.target.value })}
              className={errors.invoiceDate ? "border-destructive" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dcNo">DC Number</Label>
            <Input
              id="dcNo"
              value={bill.dcNo}
              onChange={(e) => updateBill({ dcNo: e.target.value })}
              placeholder="Delivery Challan No."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dcDate">DC Date</Label>
            <Input
              id="dcDate"
              type="date"
              value={bill.dcDate}
              onChange={(e) => updateBill({ dcDate: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="modeOfTransport">Mode of Transport</Label>
            <Input
              id="modeOfTransport"
              value={bill.modeOfTransport}
              onChange={(e) => updateBill({ modeOfTransport: e.target.value })}
              placeholder="By Road / By Air / By Rail"
            />
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Items</h2>
          <Button variant="outline" size="sm" onClick={addItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
        {errors.items && (
          <p className="text-destructive text-sm mb-4">{errors.items}</p>
        )}

        <div className="overflow-x-auto">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="w-16">S.No</th>
                <th className="min-w-48">Description</th>
                <th className="w-28">HSN Code</th>
                <th className="w-24">Quantity</th>
                <th className="w-28">Rate (₹)</th>
                <th className="w-32">Amount (₹)</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, index) => (
                <tr key={index}>
                  <td className="text-center">{item.sno}</td>
                  <td>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateItem(index, { description: e.target.value })
                      }
                      placeholder="Item description"
                      className="border-0 bg-transparent"
                    />
                  </td>
                  <td>
                    <Input
                      value={item.hsnCode}
                      onChange={(e) =>
                        updateItem(index, { hsnCode: e.target.value })
                      }
                      placeholder="HSN"
                      className="border-0 bg-transparent text-center"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      value={item.quantity || ""}
                      onChange={(e) =>
                        updateItem(index, {
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="border-0 bg-transparent text-center"
                      min="0"
                    />
                  </td>
                  <td>
                    <Input
                      type="number"
                      value={item.rate || ""}
                      onChange={(e) =>
                        updateItem(index, {
                          rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="border-0 bg-transparent text-right"
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td className="text-right font-medium">
                    {item.amount.toFixed(2)}
                  </td>
                  <td>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GST & Totals */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          GST & Total
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Label className="w-24">SGST @</Label>
              <Input
                type="number"
                value={bill.sgstRate}
                onChange={(e) =>
                  updateGstRate("sgstRate", parseFloat(e.target.value) || 0)
                }
                className="w-24"
                min="0"
                max="28"
                step="0.5"
              />
              <span className="text-muted-foreground">%</span>
              <span className="ml-auto font-medium">
                ₹ {bill.sgstAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Label className="w-24">CGST @</Label>
              <Input
                type="number"
                value={bill.cgstRate}
                onChange={(e) =>
                  updateGstRate("cgstRate", parseFloat(e.target.value) || 0)
                }
                className="w-24"
                min="0"
                max="28"
                step="0.5"
              />
              <span className="text-muted-foreground">%</span>
              <span className="ml-auto font-medium">
                ₹ {bill.cgstAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Label className="w-24">IGST @</Label>
              <Input
                type="number"
                value={bill.igstRate}
                onChange={(e) =>
                  updateGstRate("igstRate", parseFloat(e.target.value) || 0)
                }
                className="w-24"
                min="0"
                max="28"
                step="0.5"
              />
              <span className="text-muted-foreground">%</span>
              <span className="ml-auto font-medium">
                ₹ {bill.igstAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-4 bg-secondary/50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-medium">₹ {bill.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total GST</span>
              <span className="font-medium">
                ₹{" "}
                {(bill.sgstAmount + bill.cgstAmount + bill.igstAmount).toFixed(
                  2
                )}
              </span>
            </div>
            <div className="border-t border-border pt-4 flex justify-between">
              <span className="text-lg font-semibold">Grand Total</span>
              <span className="text-xl font-bold text-primary">
                ₹ {bill.grandTotal.toFixed(2)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">In Words: </span>
              {bill.amountInWords || "Zero Rupees Only"}
            </div>
          </div>
        </div>
        {errors.total && (
          <p className="text-destructive text-sm mt-4">{errors.total}</p>
        )}
      </div>
    </div>
  );
}

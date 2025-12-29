import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer, Download, Edit } from "lucide-react";
import { Bill, DEFAULT_COMPANY } from "@/types/billing";
import { formatDate } from "@/utils/billUtils";
import { billApi, driveApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import companyLogo from "@/assets/company-logo.png";
import qrCode from "@/assets/qr-code.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function InvoicePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bill, setBill] = useState<Bill | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const fetchBill = async () => {
      if (id) {
        try {
          const foundBill = await billApi.getById(id);
          setBill(foundBill);
        } catch (error) {
          toast({ title: "Invoice not found", variant: "destructive" });
          navigate("/bills");
        }
      }
    };
    fetchBill();
  }, [id, navigate, toast]);

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || !bill) return;
    setIsGenerating(true);

    try {
      // 1. Generate PDF
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

      // 2. Download Locally
      const fileName = `invoice_${bill.invoiceNo}.pdf`;
      pdf.save(fileName);

      // 3. Upload/Update to Google Drive (Background)
      const pdfBlob = pdf.output("blob");

      toast({
        title: "Downloading PDF...",
        description: "Also syncing to Google Drive...",
      });

      // Pass existing driveFileId to overwrite if it exists
      const { driveFileId, driveLink } = await driveApi.uploadPdf(
        bill.invoiceNo,
        pdfBlob,
        bill.invoiceDate,
        bill.driveFileId // <--- KEY: Send existing ID to enable overwrite
      );

      if (driveLink) {
        // Update bill in Firestore with the Drive ID (if it was new or changed)
        await billApi.update(bill.id, {
          driveFileId,
          driveLink,
        } as any);

        // Update local state
        setBill((prev) => (prev ? { ...prev, driveFileId, driveLink } : null));

        toast({
          title: "Sync Complete",
          description: "Saved to Google Drive.",
        });
      }
    } catch (error) {
      console.error("PDF/Drive Error:", error);
      toast({
        title: "Download Complete",
        description: "But failed to sync to Drive.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!bill) return null;

  return (
    <div className="animate-fade-in">
      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Button variant="outline" onClick={() => navigate("/bills")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bills
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/edit-bill/${bill.id}`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownloadPdf} disabled={isGenerating}>
            {isGenerating ? (
              <span className="animate-spin mr-2">⏳</span>
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Invoice - Scrollable on mobile, Fixed width for PDF precision */}
      <div className="w-full overflow-x-auto pb-8">
        <div
          ref={invoiceRef}
          className="bg-white mx-auto shadow-lg print:shadow-none"
          style={{
            fontFamily: "Arial, sans-serif",
            width: "210mm", // Fixed A4 Width
            minWidth: "210mm",
            minHeight: "297mm", // Fixed A4 Height
            boxSizing: "border-box",
          }}
        >
          <div
            className="p-8 h-full flex flex-col justify-between"
            style={{ border: "2px solid #000", minHeight: "290mm" }}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h1
                  className="font-display font-bold text-maroon"
                  style={{
                    fontSize: "28px",
                    color: "#1E88C9",
                    marginBottom: "8px",
                  }}
                >
                  SUSI CORPORATION
                </h1>
                <p className="text-sm">
                  <span className="underline">Mfrs. of</span> :{" "}
                  <strong>Thermoplastic, Rubber</strong> and{" "}
                  <strong>Polyurethene</strong>
                </p>
                <p className="text-sm ml-12">
                  <strong>Moulded Components</strong> for Engineering Industries
                </p>
                <p className="text-sm">
                  <span className="underline">Specialists in</span> : Industrial
                  Components for <strong>Bottling Plants, Conveyors,</strong>
                </p>
                <p className="text-sm ml-16">
                  <strong>Packaging Equipments, SPM&apos;s</strong> and
                  Indigenous for <strong>Import Substitutes</strong>
                </p>
                <p className="text-sm mt-2">
                  <strong>
                    Old # 8, New # 17, Gnanambal Garden II Street, Ayanavaram,
                    Chennai - 600023.
                  </strong>
                </p>
              </div>
              <div className="flex flex-col items-center">
                <img
                  src={companyLogo}
                  alt="Susi Corporation"
                  className="h-20 w-auto mb-2"
                />
                <p
                  className="text-xs font-bold mt-1 inline-block-center"
                  style={{
                    color: "#1E88C9",
                    borderBottom: "2px solid #1E88C9",
                    lineHeight: "1.2",
                    alignContent: "center",
                  }}
                >
                  Since 1987
                </p>

                <div style={{ height: "4px" }}></div>



                <p className="text-sm font-bold mt-2">
                  Mob : 98841 02646
                </p>
              </div>
            </div>

            {/* GSTIN & Invoice Info Row */}
            <div className="border-t-2 border-b-2 border-black py-2 flex justify-between items-center">
              <div>
                <p className="text-sm">
                  <strong>GSTIN : {DEFAULT_COMPANY.gstin}</strong>
                </p>
                <p className="text-sm">
                  <strong>Email : </strong>
                  {DEFAULT_COMPANY.email}
                </p>
              </div>
              <div className="px-4 py-1 border-2 border-black font-bold bg-gold text-black">
                TAX INVOICE
              </div>
              <div className="text-right">
                <p className="text-sm">
                  <strong>No :</strong> {bill.invoiceNo}
                </p>
                <p className="text-sm">
                  <strong>Date :</strong> {formatDate(bill.invoiceDate)}
                </p>
              </div>
            </div>

            {/* Buyer Details */}
            <div className="border-b-2 border-black py-3">
              <div className="flex">
                <div className="flex-1">
                  <p className="text-sm">
                    <strong>To M/s.</strong> {bill.buyerName}
                  </p>
                  {bill.buyerAddress && (
                    <p className="text-sm ml-10">{bill.buyerAddress}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    <strong>Buyer&apos;s GSTIN :</strong>{" "}
                    {bill.buyerGstin || ""}
                  </p>
                  <p className="text-sm mt-2">
                    <strong>PO No / Dated :</strong> {bill.poNo}{" "}
                    {bill.poDate ? `/ ${formatDate(bill.poDate)}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* DC Details */}
            <div className="border-b-2 border-black py-2 flex justify-between text-sm">
              <p>
                <strong>Our DC No :</strong> {bill.dcNo || ""}
              </p>
              <p>
                <strong>Date :</strong>{" "}
                {bill.dcDate ? formatDate(bill.dcDate) : ""}
              </p>
              <p>
                <strong>Mode of Transport :</strong>{" "}
                {bill.modeOfTransport || ""}
              </p>
            </div>

            {/* Items Table */}
            <table
              className="w-full border-collapse table-auto"
              style={{ minHeight: "200px" }}
            >
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th
                    className="border-r border-black p-2 text-center text-sm font-bold"
                    style={{ width: "8%", minWidth: "40px" }}
                  >
                    S.No.
                  </th>
                  <th
                    className="border-r border-black p-2 text-left text-sm font-bold"
                    style={{ width: "32%" }}
                  >
                    DESCRIPTION
                  </th>
                  <th
                    className="border-r border-black p-2 text-center text-sm font-bold"
                    style={{ width: "12%", minWidth: "70px" }}
                  >
                    HSN Code
                  </th>
                  <th
                    className="border-r border-black p-2 text-center text-sm font-bold"
                    style={{ width: "10%", minWidth: "60px" }}
                  >
                    Quantity
                  </th>
                  <th
                    className="border-r border-black p-2 text-center text-sm font-bold"
                    style={{ width: "18%", minWidth: "90px" }}
                  >
                    Rate / Unit
                    <br />
                    Rs. Ps.
                  </th>
                  <th
                    className="p-2 text-center text-sm font-bold"
                    style={{ width: "20%", minWidth: "100px" }}
                  >
                    Amount
                    <br />
                    Rs. Ps.
                  </th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 text-center text-sm">
                      {item.sno}
                    </td>
                    <td className="border-r border-black p-2 text-sm break-words">
                      {item.description}
                    </td>
                    <td className="border-r border-black p-2 text-center text-sm">
                      {item.hsnCode}
                    </td>
                    <td className="border-r border-black p-2 text-center text-sm">
                      {item.quantity || ""}
                    </td>
                    <td className="border-r border-black p-2 text-right text-sm whitespace-nowrap">
                      {item.rate
                        ? item.rate.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                        : ""}
                    </td>
                    <td className="p-2 text-right text-sm whitespace-nowrap">
                      {item.amount
                        ? item.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                        : ""}
                    </td>
                  </tr>
                ))}
                {/* Empty rows to fill space */}
                {Array.from({ length: Math.max(0, 8 - bill.items.length) }).map(
                  (_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-gray-300">
                      <td className="border-r border-black p-2 h-8"></td>
                      <td className="border-r border-black p-2"></td>
                      <td className="border-r border-black p-2"></td>
                      <td className="border-r border-black p-2"></td>
                      <td className="border-r border-black p-2"></td>
                      <td className="p-2"></td>
                    </tr>
                  )
                )}
              </tbody>
            </table>

            {/* Amount in Words & Total */}
            <div className="border-t-2 border-b-2 border-black flex">
              <div className="flex-1 p-2 border-r-2 border-black">
                <p className="text-sm">
                  <strong>Amount in words : </strong>
                  {bill.amountInWords}
                </p>
              </div>
              <div className="w-56 p-2">
                <div className="flex justify-between text-sm font-bold">
                  <span>TOTAL :</span>
                  <span>
                    {bill.subtotal.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Bank Details & GST Summary */}
            <div className="flex border-b-2 border-black">
              {/* Bank Details */}
              <div className="flex-1 p-3 border-r-2 border-black">
                <p className="text-sm font-bold mb-2">BANK DETAILS :</p>
                <table className="text-sm">
                  <tbody>
                    <tr>
                      <td className="pr-2">
                        <strong>NAME</strong>
                      </td>
                      <td>: {DEFAULT_COMPANY.name}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">
                        <strong>BANK</strong>
                      </td>
                      <td>: {DEFAULT_COMPANY.bankName}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">
                        <strong>A/C No.</strong>
                      </td>
                      <td>: {DEFAULT_COMPANY.accountNo}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">
                        <strong>IFSC Code</strong>
                      </td>
                      <td>: {DEFAULT_COMPANY.ifscCode}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">
                        <strong>BRANCH</strong>
                      </td>
                      <td>: {DEFAULT_COMPANY.bankBranch}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* QR Code */}
              <div className="w-36 p-2 border-r-2 border-black flex items-center justify-center">
                <img
                  src={qrCode}
                  alt="Payment QR Code"
                  className="w-28 h-28 object-contain"
                />
              </div>

              {/* GST Summary */}
              <div className="w-56 p-2">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <span>
                      <strong>SGST @</strong> {bill.sgstRate}%
                    </span>
                    <span className="whitespace-nowrap">
                      {bill.sgstAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>
                      <strong>CGST @</strong> {bill.cgstRate}%
                    </span>
                    <span className="whitespace-nowrap">
                      {bill.cgstAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>
                      <strong>IGST @</strong> {bill.igstRate}%
                    </span>
                    <span className="whitespace-nowrap">
                      {bill.igstAmount.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div
                    className="flex justify-between gap-2 border-t-2 border-black pt-2 mt-2"
                    style={{ fontSize: "18px", fontWeight: 900 }}
                  >
                    <span>Grand Total :</span>
                    <span className="whitespace-nowrap">
                      ₹{" "}
                      {bill.grandTotal.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex mt-auto pt-4">
              <div className="flex-1 p-3 border-r-2 border-black text-xs">
                <p className="font-bold mb-1">OTHER TERMS :</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Goods once sold will not be taken back.</li>
                  <li>All transactions are subject to Chennai Jurisdiction.</li>
                  <li>
                    Payments are to be made by A/c Payee Cheque Payable at
                    Chennai.
                  </li>
                  <li>Other Bank Transfers : NEFT / RTGS / UPI</li>
                  <li>
                    Interest at the rate of 36% will be charged if not paid
                    within due date.
                  </li>
                </ol>
              </div>
              <div className="w-60 p-3 text-center flex flex-col justify-end">
                <p className="text-sm">
                  for <strong>SUSI CORPORATION</strong>
                </p>

                {/* Space for stamp / signature */}
                <div style={{ height: "28mm" }} />

                <p className="text-sm">
                  Authorised Signatory
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #root > div > div > main > div > div:last-child,
          #root > div > div > main > div > div:last-child * {
            visibility: visible;
          }
          #root > div > div > main > div > div:last-child {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

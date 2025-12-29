import { Bill } from '@/types/billing';
import { db } from '../lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore';

const BILLS_COLLECTION = 'bills';

// MongoDB/Firestore Bill Operations
export const billApi = {
  // Get all bills
  async getAll(): Promise<Bill[]> {
    try {
      const q = query(collection(db, BILLS_COLLECTION), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Bill));
    } catch (error) {
      console.error("Error fetching bills:", error);
      throw error;
    }
  },

  // Get bill by ID
  async getById(id: string): Promise<Bill> {
    try {
      const docRef = doc(db, BILLS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) throw new Error('Bill not found');
      return { id: docSnap.id, ...docSnap.data() } as Bill;
    } catch (error) {
      console.error("Error fetching bill:", error);
      throw error;
    }
  },

  // Create new bill
  async create(bill: Omit<Bill, 'id'>): Promise<Bill> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billData: any = { ...bill };
    // Remove id if present in the data to avoid saving it as a field
    delete billData.id;

    const newBill = {
      ...billData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, BILLS_COLLECTION), newBill);
      return { id: docRef.id, ...newBill } as Bill;
    } catch (error) {
      console.error("Error creating bill:", error);
      throw error;
    }
  },

  // Update bill
  async update(id: string, bill: Partial<Bill>): Promise<Bill> {
    try {
      const docRef = doc(db, BILLS_COLLECTION, id);
      const updates = {
        ...bill,
        updatedAt: new Date().toISOString(),
      };
      // Ensure we don't save 'id' as a field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((updates as any).id) delete (updates as any).id;

      await updateDoc(docRef, updates);
      return { id, ...bill, ...updates } as Bill;
    } catch (error) {
      console.error("Error updating bill:", error);
      throw error;
    }
  },

  // Delete bill
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, BILLS_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting bill:", error);
      throw error;
    }
  },
};

// Google Drive Operations (via Serverless Apps Script)
export const driveApi = {
  // Upload PDF to Google Drive
  async uploadPdf(invoiceNo: string, pdfBlob: Blob, date: string, existingFileId?: string): Promise<{ driveFileId: string; driveLink: string }> {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl) return { driveFileId: '', driveLink: '' };

    // Convert Blob to Base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });
    const base64Data = await base64Promise;

    // Send to Apps Script
    const response = await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'upload',
        filename: `invoice_${invoiceNo}.pdf`,
        fileData: base64Data, // Data URL
        folderName: `Bills/${date.split('-')[0]}/${date.split('-')[1]}`, // YYYY/MM
        existingFileId: existingFileId, // Enable overwrite
      }),
    });

    if (!response.ok) throw new Error('Failed to connect to Google Script');

    const result = await response.json();
    if (result.status === 'error') {
      throw new Error(result.message);
    }

    return {
      driveFileId: result.fileId,
      driveLink: result.url
    };
  },

  // Get/Delete not easily supported via simple DoPost without changing action types.
  // For now, we only implement Upload as it's the core requirement.
  async getFile(fileId: string): Promise<{ downloadUrl: string }> {
    // Apps Script can't easily proxy this without complex setup.
    // We assume the link from Upload is sufficient (it is public "Anyone with link").
    return { downloadUrl: '' }; // Not used directly
  },

  async deleteFile(fileId: string): Promise<void> {
    const scriptUrl = import.meta.env.VITE_GOOGLE_SCRIPT_URL;
    if (!scriptUrl || !fileId) return;

    await fetch(scriptUrl, {
      method: 'POST',
      body: JSON.stringify({
        action: 'delete',
        fileId: fileId
      }),
    });
  },
};

// Combined operation: Save bill to MongoDB and upload PDF to Drive
export const saveBillWithDrive = async (
  bill: Bill,
  pdfBlob: Blob
): Promise<{ bill: Bill; driveLink: string }> => {
  // Upload to Google Drive first
  const { driveFileId, driveLink } = await driveApi.uploadPdf(
    bill.invoiceNo,
    pdfBlob,
    bill.invoiceDate
  );

  // Save bill to Firestore with Drive reference
  // We need to omit 'id' if passing to create, but 'bill' has it.
  // The create method handles stripping 'id'.
  const savedBill = await billApi.create({
    ...bill,
    driveFileId,
  });

  return { bill: savedBill, driveLink };
};

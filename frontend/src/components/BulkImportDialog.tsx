import React, { useState, useRef } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  AlertTitle,
  Box,
  Typography,
} from "@mui/material";
import Upload from "@mui/icons-material/Upload";
import TableChart from "@mui/icons-material/TableChart";
import Download from "@mui/icons-material/Download";
import Info from "@mui/icons-material/Info";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Cancel from "@mui/icons-material/Cancel";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/utils/axiosInstance";

interface BulkImportDialogProps {
  onImportComplete: () => void;
}

const BulkImportDialog: React.FC<BulkImportDialogProps> = ({ onImportComplete }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.match(/\.(xlsx|xls|csv)$/)) {
        setFile(selectedFile);
        setImportResults(null);
      } else {
        toast({ title: "Invalid File Type", description: "Please upload an Excel (.xlsx, .xls) or CSV file", variant: "destructive" });
      }
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Full Name,Mobile Number,Address,Role\nJohn Doe,9876543210,123 Main Street,USER\nJane Smith,9876543211,456 Oak Avenue,ADMIN\nBob Johnson,9876543212,789 Pine Road,USER";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_import_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast({ title: "Template Downloaded", description: "Fill in the template with user data and upload it" });
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axiosInstance.post("/admin/bulk-import", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setImportResults(response.data.results);
      toast({ title: "Import Complete", description: `${response.data.results.success} users imported successfully` });
      if (response.data.results.success > 0) onImportComplete();
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.response?.data?.message || "Failed to import users", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setImportResults(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <>
      <Button variant="outlined" startIcon={<Upload />} onClick={() => setOpen(true)} sx={{ borderColor: "primary.300", color: "primary.main" }}>
        Import Users
      </Button>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "90vh" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TableChart color="primary" />
          Bulk Import Users
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Upload an Excel or CSV file to import multiple users at once. All users will receive a default password.
          </DialogContentText>
          <Alert icon={<Info />} severity="info" sx={{ mb: 2 }}>
            <AlertTitle>Important Information</AlertTitle>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <li>All imported users will have default password: <strong>Water@123</strong></li>
              <li>Users should change their password on first login</li>
              <li>Required columns: Full Name, Mobile Number, Address, Role</li>
              <li>Role can be: USER or ADMIN</li>
              <li>Maximum file size: 5MB</li>
            </Box>
          </Alert>
          <Box sx={{ p: 2, bgcolor: "primary.50", borderRadius: 2, mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography fontWeight={600} color="primary.900">Need a template?</Typography>
              <Typography variant="body2" color="primary.700">Download our sample file to get started</Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<Download />} onClick={downloadTemplate} sx={{ borderColor: "primary.300" }}>
              Download Template
            </Button>
          </Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Upload File</Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            style={{ display: "block", marginBottom: 16, fontSize: 14 }}
          />
          {file && (
            <Alert icon={<TableChart />} severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight={500}>{file.name}</Typography>
              <Typography variant="caption">{(file.size / 1024).toFixed(2)} KB</Typography>
            </Alert>
          )}
          {importResults && (
            <Box sx={{ mt: 2 }}>
              <Typography fontWeight={600} sx={{ mb: 2 }}>Import Results</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: "primary.50", borderRadius: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">{importResults.total}</Typography>
                  <Typography variant="caption" color="primary.700">Total Rows</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "success.50", borderRadius: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight="bold" color="success.main">{importResults.success}</Typography>
                  <Typography variant="caption" color="success.700">Imported</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "error.50", borderRadius: 2, textAlign: "center" }}>
                  <Typography variant="h4" fontWeight="bold" color="error.main">{importResults.failed}</Typography>
                  <Typography variant="caption" color="error.700">Failed</Typography>
                </Box>
              </Box>
              {importResults.success > 0 && (
                <Alert icon={<CheckCircle />} severity="success" sx={{ mb: 2 }}>
                  <AlertTitle>Successfully Imported</AlertTitle>
                  <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 128, overflow: "auto" }}>
                    {importResults.imported?.slice(0, 5).map((user: any, idx: number) => (
                      <li key={idx}>{user.fullName} - {user.mobileNumber} ({user.role})</li>
                    ))}
                    {importResults.imported?.length > 5 && <li>... and {importResults.imported.length - 5} more</li>}
                  </Box>
                </Alert>
              )}
              {importResults.failed > 0 && (
                <Alert icon={<Cancel />} severity="error">
                  <AlertTitle>Failed Imports</AlertTitle>
                  <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 128, overflow: "auto" }}>
                    {importResults.errors?.slice(0, 5).map((error: any, idx: number) => (
                      <li key={idx}>Row {error.row}: {error.error}</li>
                    ))}
                    {importResults.errors?.length > 5 && <li>... and {importResults.errors.length - 5} more errors</li>}
                  </Box>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>{importResults ? "Close" : "Cancel"}</Button>
          {!importResults && (
            <Button variant="contained" onClick={handleUpload} disabled={!file || isUploading} sx={{ background: "linear-gradient(90deg, #1976d2, #0288d1)" }}>
              {isUploading ? "Uploading..." : "Import Users"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BulkImportDialog;

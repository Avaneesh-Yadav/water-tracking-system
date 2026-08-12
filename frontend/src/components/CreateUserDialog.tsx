import React, { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Box,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonAdd from "@mui/icons-material/PersonAdd";
import Person from "@mui/icons-material/Person";
import Phone from "@mui/icons-material/Phone";
import LocationOn from "@mui/icons-material/LocationOn";
import Lock from "@mui/icons-material/Lock";
import { toast } from "@/hooks/use-toast";
import { createAdminUser } from "@/services/apiService";

interface CreateUserFormValues {
  fullName: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
  address: string;
  role: string;
}

interface CreateUserDialogProps {
  onUserCreated: () => void;
  /** When provided, dialog is controlled externally and the trigger button is hidden */
  open?: boolean;
  onClose?: () => void;
}

const CreateUserDialog: React.FC<CreateUserDialogProps> = ({ onUserCreated, open: controlledOpen, onClose: onCloseProp }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined && onCloseProp !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (value: boolean) => { if (!value) onCloseProp(); } : setInternalOpen;
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateUserFormValues>({
    defaultValues: {
      fullName: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      address: "",
      role: "USER",
    },
  });

  const onSubmit = async (data: CreateUserFormValues) => {
    if (data.password !== data.confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!/^[0-9]{10}$/.test(data.mobileNumber)) {
      toast({ title: "Invalid Mobile Number", description: "Please enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await createAdminUser({
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        password: data.password,
        address: data.address,
        role: data.role,
      });
      toast({ title: "Success", description: `${data.role} user created successfully` });
      form.reset();
      handleClose();
      onUserCreated();
    } catch (error: any) {
      toast({ title: "Creation Failed", description: error?.message || "Failed to create user", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <>
      {!isControlled && (
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setOpen(true)}
          sx={{ background: "linear-gradient(90deg, #1976d2, #0288d1)" }}
        >
          Create User
        </Button>
      )}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth PaperProps={{ sx: { maxHeight: "90vh" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonAdd color="primary" />
          Create New User
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Add a new user or admin to the system. Fill in all the required information.
          </DialogContentText>
          <form id="create-user-form" onSubmit={form.handleSubmit(onSubmit)}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>User Role</InputLabel>
                    <Select {...field} label="User Role">
                      <MenuItem value="USER">User</MenuItem>
                      <MenuItem value="ADMIN">Admin</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="fullName"
                control={form.control}
                rules={{ required: "Full name is required" }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Full Name" placeholder="John Doe" error={!!fieldState.error} helperText={fieldState.error?.message} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><Person fontSize="small" /></InputAdornment> }} />
                )}
              />
              <Controller
                name="mobileNumber"
                control={form.control}
                rules={{ required: "Mobile number is required", pattern: { value: /^[0-9]{10}$/, message: "Enter a valid 10-digit mobile number" } }}
                render={({ field, fieldState }) => (
                  <TextField {...field} type="tel" label="Mobile Number" placeholder="9876543210" inputProps={{ maxLength: 10 }} error={!!fieldState.error} helperText={fieldState.error?.message} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }} />
                )}
              />
              <Controller
                name="address"
                control={form.control}
                rules={{ required: "Address is required" }}
                render={({ field, fieldState }) => (
                  <TextField {...field} label="Address" placeholder="123 Main Street, City" error={!!fieldState.error} helperText={fieldState.error?.message} fullWidth InputProps={{ startAdornment: <InputAdornment position="start"><LocationOn fontSize="small" /></InputAdornment> }} />
                )}
              />
              <Controller
                name="password"
                control={form.control}
                rules={{ required: "Password is required", minLength: { value: 6, message: "Password must be at least 6 characters" } }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type={showPassword ? "text" : "password"}
                    label="Password"
                    placeholder="••••••••"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment>,
                      endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                    }}
                  />
                )}
              />
              <Controller
                name="confirmPassword"
                control={form.control}
                rules={{ required: "Please confirm your password" }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    type={showConfirmPassword ? "text" : "password"}
                    label="Confirm Password"
                    placeholder="••••••••"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Lock fontSize="small" /></InputAdornment>,
                      endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>,
                    }}
                  />
                )}
              />
            </Box>
          </form>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="create-user-form" variant="contained" disabled={isSubmitting} sx={{ background: "linear-gradient(90deg, #1976d2, #0288d1)" }}>
            {isSubmitting ? "Creating..." : "Create User"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreateUserDialog;

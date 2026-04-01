import React from "react";
import { Box, Dialog, DialogContent, IconButton } from "@mui/material";
import Close from "@mui/icons-material/Close";

type Props = {
  open: boolean;
  onClose: () => void;
  url: string;
  alt?: string;
};

/** Full-size image centered and scaled to fit inside the dialog (letterboxed). */
export function ImagePreviewDialog({ open, onClose, url, alt = "Preview" }: Props) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      scroll="paper"
      PaperProps={{
        sx: {
          position: "relative",
          m: { xs: 1, sm: 2 },
          maxWidth: "min(96vw, 1120px)",
          maxHeight: "92vh",
          width: "auto",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        },
      }}
    >
      <IconButton
        aria-label="Close"
        onClick={onClose}
        sx={{
          position: "absolute",
          right: 8,
          top: 8,
          zIndex: 1,
          bgcolor: "background.paper",
          boxShadow: 1,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Close />
      </IconButton>
      <DialogContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          pt: { xs: 5, sm: 5 },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flex: "1 1 auto",
          minHeight: 0,
        }}
      >
        <Box
          component="img"
          src={url}
          alt={alt}
          sx={{
            maxWidth: "100%",
            maxHeight: "min(calc(92vh - 80px), calc(100vh - 120px))",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
            mx: "auto",
            my: "auto",
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

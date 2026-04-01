import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { uploadFileUrl } from "@/utils/apiOrigin";
import { ImagePreviewDialog } from "@/components/ImagePreviewDialog";

type Props = {
  path?: string | null;
  size?: number;
};

/** Small thumbnail; click opens centered fit-to-dialog preview. */
const MeterPhotoThumb = ({ path, size = 40 }: Props) => {
  const [open, setOpen] = useState(false);
  const url = uploadFileUrl(path);

  if (!url) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "center" }}>
        —
      </Typography>
    );
  }

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View meter photo"
        sx={{
          border: 0,
          p: 0,
          m: 0,
          cursor: "pointer",
          bgcolor: "transparent",
          borderRadius: 1,
          overflow: "hidden",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2 },
        }}
      >
        <Box
          component="img"
          src={url}
          alt=""
          sx={{
            width: size,
            height: size,
            objectFit: "cover",
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            display: "block",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </Box>
      <ImagePreviewDialog open={open} onClose={() => setOpen(false)} url={url} alt="Meter reading" />
    </>
  );
};

export default MeterPhotoThumb;

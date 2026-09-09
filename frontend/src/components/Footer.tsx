import React from "react";
import { Box, Typography } from "@mui/material";

const Footer: React.FC = () => (
  <Box
    component="footer"
    sx={{
      py: 1.5,
      px: 2,
      display: "flex",
      justifyContent: "center",
      flexShrink: 0,
      position: "relative",
      zIndex: 1,
    }}
  >
    <Typography
      variant="body2"
      sx={{
        px: 2,
        py: 0.75,
        borderRadius: 999,
        color: "#142028",
        fontWeight: 600,
        bgcolor: "rgba(255, 255, 255, 0.48)",
        border: "1px solid rgba(255, 255, 255, 0.62)",
        backdropFilter: "blur(20px) saturate(160%)",
        WebkitBackdropFilter: "blur(20px) saturate(160%)",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
      }}
    >
      © {new Date().getFullYear()} AquaFlow. All rights reserved.
    </Typography>
  </Box>
);

export default Footer;

import React from "react";
import { Box, Typography } from "@mui/material";

const Footer: React.FC = () => (
  <Box component="footer" sx={{ py: 2, px: 2, textAlign: "center" }}>
    <Typography variant="body2" color="text.secondary">
      © {new Date().getFullYear()} AquaFlow. All rights reserved.
    </Typography>
  </Box>
);

export default Footer;

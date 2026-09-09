import React, { useState } from "react";
import { TextField, InputAdornment, Box } from "@mui/material";
import Search from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
      setQuery("");
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      <TextField
        size="small"
        placeholder="Search consumers, consumption, payments…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
            <Search sx={{ color: "primary.main", fontSize: 22 }} />
          </InputAdornment>
          ),
          sx: {
            bgcolor: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            borderRadius: 999,
            width: { xs: 180, sm: 300 },
            fontWeight: 500,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(255,255,255,0.7)",
              borderWidth: 1,
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "primary.main",
              borderWidth: 1.5,
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "primary.main",
              borderWidth: 2,
            },
            "& input": {
              color: "text.primary",
              py: 0.75,
              "&::placeholder": { color: "text.secondary", opacity: 0.9 },
            },
          },
        }}
      />
    </Box>
  );
};

export default GlobalSearch;

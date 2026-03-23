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
            bgcolor: "white",
            borderRadius: 2,
            width: { xs: 180, sm: 300 },
            fontWeight: 500,
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "rgba(0,0,0,0.12)",
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
              py: 1.1,
              "&::placeholder": { color: "text.secondary", opacity: 0.9 },
            },
          },
        }}
      />
    </Box>
  );
};

export default GlobalSearch;

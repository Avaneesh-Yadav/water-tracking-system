import React, { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import { opsApi } from "@/services/opsService";

export default function MapConnectionsPage() {
  const [points, setPoints] = useState<any[]>([]);
  useEffect(() => {
    opsApi.mapPoints().then((r) => setPoints(r.points || [])).catch(() => setPoints([]));
  }, []);

  const src = useMemo(() => {
    const withCoords = points.filter((p) => p.latitude && p.longitude);
    if (!withCoords.length) return "";
    const lat = withCoords.reduce((s, p) => s + Number(p.latitude), 0) / withCoords.length;
    const lon = withCoords.reduce((s, p) => s + Number(p.longitude), 0) / withCoords.length;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.05}%2C${lat - 0.05}%2C${lon + 0.05}%2C${lat + 0.05}&layer=mapnik&marker=${lat}%2C${lon}`;
  }, [points]);

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Connection map</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Set latitude/longitude on the meter master (or profile) to plot a connection. No map API key required — OpenStreetMap.
      </Typography>
      {src ? (
        <Box component="iframe" title="map" src={src} sx={{ width: "100%", height: 420, border: 0, borderRadius: 3, mb: 2 }} />
      ) : (
        <Card sx={{ mb: 2 }}><CardContent>No coordinates saved yet.</CardContent></Card>
      )}
      {points.map((p) => (
        <Card key={p.uuid} sx={{ mb: 1 }}>
          <CardContent sx={{ display: "flex", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography fontWeight={700}>{p.full_name}</Typography>
              <Typography variant="body2">{p.connection_id} · {p.ward || "no ward"} · {p.status}</Typography>
            </Box>
            <Button href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}`} target="_blank" rel="noreferrer">Open pin</Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

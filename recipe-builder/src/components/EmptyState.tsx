import React from "react";
import { Typography, Paper } from "@mui/material";

interface EmptyStateProps {
  icon: React.ReactElement;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
      {React.cloneElement(icon as React.ReactElement<any>, {
        sx: { fontSize: 56, color: "text.disabled", mb: 1.5, ...((icon.props as any).sx || {}) },
      })}
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.disabled">
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
}

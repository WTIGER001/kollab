import { Box, Typography } from "@mui/material";

const topics = [
  { title: "Settings and local accounts", text: "Open Server Settings from your account menu. Each section has its own page; use Save Changes before leaving it. In local-account deployments, Users lets administrators create accounts, update profiles, reset passwords, and disable or remove accounts. Password changes and disabling an account invalidate existing sessions." },
  { title: "Branding, retention, and previews", text: "Appearance controls workspace branding and Default-preset colors. Authentication controls the sign-in screen's presentation. Audit & retention controls retained history and trash. Document previews configures the conversion service; supported formats and licensing depend on that service." },
  { title: "Complete backups and restore", text: "Under Backup & sync, Export Full Server Backup ZIP includes accounts, permissions, pages, history, settings, and uploaded files. Upload & Restore Backup ZIP replaces the target workspace and requires a matching application schema. Have editors save first: open pages reload after restore. Failed validation leaves existing data unchanged; interrupted file recovery may require operator intervention before the workspace can resume." },
  { title: "Bidirectional Air-Gap Sync", text: "Configure the same private SYNC_SIGNING_KEY on trusted peer installations. Export Sync ZIP with Since Operation ID set to 0 for a complete state exchange, then import it on the other installation. Concurrent changes stop the whole import for review: keep this installation's version, use the incoming version, or cancel. Both database versions and losing file bytes are retained for recovery. Export in the reverse direction to return changes and resolutions. Duplicate or older records are ignored; old package formats are unsupported. Incremental cursors belong to a specific source and destination, and should advance only after a successful import." },
  { title: "Multiple API replicas", text: "The supplied Compose deployment defaults to two API processes sharing PostgreSQL, sign-in configuration, and the same uploads directory. Edits, presence, and cursors cross replicas. The verified target is 2–5 concurrent editors. Imports and restores coordinate all replicas; a disconnected editor reloads after an authoritative restore." },
  { title: "Integrations and prototypes", text: "GitLab issue cards and lists use configured connections. The Confluence migration wizard imports exported archives; a live Confluence page-embed setup is not exposed in the workspace UI. Azure backup and Jira remain prototypes. A configured provider entry alone does not guarantee a corresponding live macro workflow." },
  { title: "Deploying a release", text: "The deployment workflow verifies the code, checks out the exact release commit, builds images, replaces containers, and checks every API replica. It preserves data volumes and does not change package versions on the server. Small servers need enough memory, swap, and disk to compile the images. Confirm the public /api/health endpoint and sign-in after deployment, then verify external services separately." },
];

export function HelpAdmin() {
  return <Box sx={{ color: "var(--text-primary)" }}>
    <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>Server Administration</Typography>
    <Typography variant="body2" sx={{ color: "var(--text-secondary)", mb: 3 }}>Use Server Settings to manage the workspace. These operations require server administration access.</Typography>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {topics.map(topic => <Box key={topic.title} sx={{ p: 2, bgcolor: "var(--panel-color)", border: "var(--border-width) solid var(--border-color)", borderRadius: "var(--border-radius-card)" }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{topic.title}</Typography>
        <Typography variant="body2" sx={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{topic.text}</Typography>
      </Box>)}
    </Box>
  </Box>;
}

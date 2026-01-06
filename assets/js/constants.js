window.GT_CONST = {
  sheets: {
    Users: "users",
    Tournaments: "tournaments",
    Teams: "teams",
    TournamentTeams: "TournamentTeams",
    Players: "players",
    Venues: "venues",
    Referees: "referees",
    Matches: "matches",
    Results: "results",
    MatchEvents: "match_events",
    AuditLog: "audit_log",
    SyncQueue: "sync_queue"
  },

  sports: [
    { value: "FOOTBALL" },
    { value: "BASKETBALL" },
    { value: "HANDBALL" },
    { value: "OTHER" }
  ],

  formats: [
    { value: "CHAMPIONNAT", icon: "bx-refresh" },
    { value: "GROUPS_FINALS", icon: "bx-grid-alt" },
    { value: "KNOCKOUT", icon: "bx-git-branch" }
  ],

  tournamentStatuses: [
    { value: "DRAFT" },
    { value: "ACTIVE" },
    { value: "FINISHED" },
    { value: "CANCELED" }
  ],

  matchStatuses: [
    { value: "SCHEDULED" },
    { value: "IN_PROGRESS" },
    { value: "FINISHED" },
    { value: "CANCELED" }
  ],

  // For existing pages still using phases/rounds (kept as raw values)
  phases: [
    { value: "LEAGUE" },
    { value: "GROUP" },
    { value: "ROUND_OF_16" },
    { value: "QUARTER_FINAL" },
    { value: "SEMI_FINAL" },
    { value: "FINAL" }
  ],

  groupCodes: ["A","B","C","D","E","F","G","H"]
};

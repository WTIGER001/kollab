# Planning and reporting examples

These macros display structured values stored in the document. The course plan below is illustrative; it is not an external project-management integration or a committed Kollab release schedule.

## Course allocation

```kollab
{"type":"macroBlock","attrs":{"type":"chart-analytics","config":{"title":"Suggested workshop minutes by topic","chartType":"bar","data":[{"name":"Orientation","value":10},{"name":"Authoring","value":20},{"name":"Collaboration","value":15},{"name":"Recovery","value":10},{"name":"Practice","value":15}]}}}
```

The values total 70 minutes and match the course plan. Change the JSON data in macro settings to adapt the agenda. This chart does not query page analytics or measure real usage.

## Example preparation roadmap

```kollab
{"type":"macroBlock","attrs":{"type":"roadmap-planner","config":{"title":"Illustrative workshop preparation sequence","epics":[{"id":"content","title":"Review handbook content","start":0,"duration":2,"color":"var(--primary-color)"},{"id":"restore","title":"Restore a workshop instance","start":2,"duration":1,"color":"var(--secondary-color)"},{"id":"practice","title":"Rehearse demonstrations","start":3,"duration":2,"color":"var(--accent-color)"},{"id":"teach","title":"Run the workshop","start":5,"duration":1,"color":"var(--primary-color)"}]}}}
```

Treat horizontal units as preparation sessions for this example. They are values in this block, not linked tasks or calendar bookings.

## Example calendar

```kollab
{"type":"macroBlock","attrs":{"type":"team-calendars","config":{"title":"Sample September 2026 training calendar","events":[{"title":"Handbook review (sample)","start":"2026-09-14T10:00:00","end":"2026-09-14T11:00:00"},{"title":"Kollab capabilities workshop (sample)","start":"2026-09-16T13:00:00","end":"2026-09-16T14:10:00"},{"title":"Practice debrief (sample)","start":"2026-09-18T10:00:00","end":"2026-09-18T10:30:00"}]}}}
```

Navigate to September 2026 if the calendar initially opens at the current month. Dates are fixed so the source remains reviewable in Git; update them explicitly for a scheduled course. No invitations are sent.

# HEARTBEAT.md

Keep this file short. Batch useful checks.

OpenClaw [heartbeat](https://docs.openclaw.ai/gateway/heartbeat) runs are periodic **main-session** turns: the default system prompt tells the model to read this file when it exists and to reply **`HEARTBEAT_OK`** when nothing needs attention (see doc for ack rules). Heartbeat is **not** the same as isolated cron jobs or background task records.

## Morning household check

Rotate through:
- school inbox / messages for urgent items
- today’s family calendar for logistics, changes, pickups, and activity prep
- weather relevance for school, sports, or outdoor plans
- helper schedule for today

If something needs attention, summarize only the actionable items.
If nothing important changed, stay quiet.

## Afternoon logistics check

Look for:
- pickup or activity timing changes
- school messages that affect same-day logistics
- anything that needs to be packed, signed, or brought

## Meal and shopping pulse

Once per day or every other day:
- scan the current meal plan
- notice missing ingredients or dinner plan gaps
- propose a short shopping add list only if useful

## School triage

Check family school channels for:
- forms due
- schedule changes
- field trips
- supply asks
- costume/theme days
- payment reminders
- anything health or safety related

Do not surface routine marketing noise.

## Quiet rule

If nothing is newly actionable, reply exactly:
HEARTBEAT_OK

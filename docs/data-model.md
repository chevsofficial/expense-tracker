# Data Model Rules (Expense Tracker) — Translation-first

## Default Category Groups
Defaults are stored as translation keys (not hardcoded display text).

Keys:
- categoryGroup.home
- categoryGroup.utilities
- categoryGroup.kids
- categoryGroup.insurance
- categoryGroup.car
- categoryGroup.foodDining
- categoryGroup.hobbiesEntertainment
- categoryGroup.subscriptions
- categoryGroup.healthMedical
- categoryGroup.travelVacation
- categoryGroup.debt
- categoryGroup.misc

## Category behavior
- App ships with default groups (translation keys above)
- Users can create/edit/delete groups and categories
- Default items can be hidden/archived (history-safe)
- User-created names are stored as raw text (not translation keys)

## Transactions (actual)
- Every entry is a Transaction
- type: income | expense
- Each transaction has: date, amount, currency
- category required for expense, optional for income
- optional merchant/note

## Budget (planned)
- Planned amounts exist per month
- planned amount per category per month
- planned amounts stored in workspace default currency (v1)

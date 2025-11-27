# How to Run CREATE INDEX CONCURRENTLY Commands

## The Problem
Supabase SQL Editor wraps all queries in a transaction by default. `CREATE INDEX CONCURRENTLY` cannot run inside a transaction block.

## The Solution: Use Supabase Dashboard Query Tool

### Option 1: Run via Supabase Dashboard (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click on **New Query**
4. **IMPORTANT**: Run each CREATE INDEX command **individually**
5. Copy and paste ONE command at a time
6. Click "Run" 
7. Wait for it to complete before running the next one

### Option 2: Use psql Command Line
If you have direct database access:
```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.rkzcybthcszeusrohbtc.supabase.co:5432/postgres" -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id_conc ON incidents(employer_id) WHERE employer_id IS NOT NULL;"
```

## Commands to Run (ONE AT A TIME)

### Index 1: Employer ID
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_id_conc 
ON incidents(employer_id) WHERE employer_id IS NOT NULL;
```

### Index 2: Employer + Date
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_employer_date_conc 
ON incidents(employer_id, date_of_injury DESC) WHERE employer_id IS NOT NULL;
```

### Index 3: Status
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_status_conc 
ON incidents(incident_status) WHERE incident_status IS NOT NULL;
```

### Index 4: Classification
```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_classification_conc 
ON incidents(classification) WHERE classification IS NOT NULL;
```

### Verify Indexes
After creating, verify with:
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'incidents' 
AND indexname LIKE '%_conc';
```

## Note
These indexes are **optional** - the dashboard is already fast (1.3ms) without them. They provide additional optimization for specific query patterns.

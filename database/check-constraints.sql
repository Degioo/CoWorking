-- Verifica constraints sulla tabella Pagamento
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype 
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
    END AS constraint_description,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'Pagamento'::regclass
ORDER BY conname;

-- Verifica struttura colonne della tabella Pagamento
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pagamento' 
ORDER BY ordinal_position;

-- Conta record nella tabella Pagamento
SELECT COUNT(*) as total_records FROM Pagamento;

-- Verifica se ci sono duplicati in stripe_payment_intent_id
SELECT 
    stripe_payment_intent_id, 
    COUNT(*) as count
FROM Pagamento 
WHERE stripe_payment_intent_id IS NOT NULL
GROUP BY stripe_payment_intent_id
HAVING COUNT(*) > 1;

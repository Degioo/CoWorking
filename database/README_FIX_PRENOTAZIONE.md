# Fix: Errore Constraint Prenotazione

## Problema
Quando si tenta di cancellare una prenotazione, si verifica l'errore:
```
Errore server: new row for relation "prenotazione" violates check constraint "prenotazione_stato_check"
```

## Causa
Il constraint `prenotazione_stato_check` nella tabella `Prenotazione` non include lo stato `'cancellata'`, ma la funzione `cancellaPrenotazione` cerca di impostare lo stato a `'cancellata'`.

## Soluzione
Eseguire lo script SQL `fix-prenotazione-stato-constraint.sql` su Supabase:

1. Vai su [supabase.com](https://supabase.com)
2. Seleziona il tuo progetto
3. Vai su **SQL Editor**
4. Copia e incolla il contenuto di `fix-prenotazione-stato-constraint.sql`
5. Esegui lo script

## Stati Prenotazione Supportati
Dopo il fix, la tabella `Prenotazione` supporterà questi stati:
- `'pendente'` - Prenotazione creata ma non confermata
- `'in attesa'` - Prenotazione confermata, in attesa di pagamento
- `'confermata'` - Prenotazione pagata e confermata
- `'annullata'` - Prenotazione annullata dall'utente
- `'completata'` - Prenotazione utilizzata e completata
- `'pagamento_fallito'` - Pagamento fallito
- `'scaduta'` - Prenotazione scaduta per timeout
- `'cancellata'` - Prenotazione cancellata dall'utente (NUOVO)

## Verifica
Dopo l'esecuzione dello script, verifica che:
1. Il constraint sia stato aggiornato correttamente
2. Le prenotazioni possano essere cancellate senza errori
3. Tutti gli stati esistenti siano ancora validi

## File Correlati
- `fix-prenotazione-stato-constraint.sql` - Script di fix
- `migration-stripe.sql` - Migration aggiornata
- `schema.sql` - Schema aggiornato

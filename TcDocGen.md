# TcDocGen

## Informazioni generali

La documentazione in formato TcDocGen viene generata per ciascun ...???

## Summary

### Sintassi:

Multiple lines:
'''pascal
(*! <Summary>
...(content)...
</Summary>
'''

One line:
'''pascal
//! @Summary ...(content)...
'''

Il Summary compare una sola volta per POU, DUT e GVL.
Se esistono più markup *Summary* all'interno del codice dell'elemento, viene inserito nella documentazione solo il testo del primo markup.
Viene sempre renderizzato all'inizio della pagina del documento relativo all'elemento di codice.
Se non è presente alcun markup *Summary* la sezione non viene renderizzata.
Può essere in qualunque punto del codice dell'elemento (declaration o body).
Per convenzione si mette all'inizio del codice, sopra la dichiarazione.
Siccome deve spiegare le funzionalità del codice, preferire la versione multiline.


## Description

### Sintassi

(*! <Description>
...(content)...
</Description>

One line:
//! @Description ...(content)...

E' presente solo se nell'elemento di codice è presente il markup *Description*.  
Può essere in qualunque punto del codice dell'elemento (declaration o body).  
Se esistono più markup *Description* all'interno del codice dell'elemento, vengono tutti inseriti nella documentazione nell'ordine in cui sono scritti.



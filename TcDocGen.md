# Generazione di documentazione con TE1030 TcDocGen

## Riferimenti:
- Package TE1030 v. 2.1.1
- Documentazione InfoSys v. 1.3.3 del 23/03/2026

## Informazioni generali

La funzione di engineering TE1030 'TwinCAT 3 Dcoumentation Generation' consente di generare la documentazione del codice utilizzando speciali markup.
Anche senza licenza, la TE1030 genera una anteprima in formato HTML che è possibile utilizzare per generare la documentazione utilizzando strumenti CI/CD.

La TE1030 genera:
- un file HTML a livello di progetto che contiene la lista di tutti i files HTML generati (con indicazione del loro livello)
- un file HTML per ciascun elemento di codice
- un file CSS di stile
- un file Javascript per la generazione dei diagrammi UML

Gli elementi di codice per i quali vengono generati singoli files HTML sono:
- Program (POU PRG)
- Function Block (POU FB)
- Function (POU FUN)
- Defined User Type (DUT)
- Global Variable List (GVL)
- Metodi (METHOD)
- Proprietà (PROPERTY)
- Azioni (ACTION)

La struttura di ciascuna pagina HTML, generata per ogni elemento di codice a partire dai markups inseriti nel codice, è costituita dalle seguenti sezioni:
- Titolo fisso: 'TwinCAT Documentation Generation'
- Tipo e nome dell'elemento
- Overview
- Summary
- Description
- Declaration
- Example

A seconda del tipo di elemento di codice o della assenza dei relativi markup, alcune sezioni potrebbero non essere presenti

### Tipo e nome dell'elemento

Il tipo dell'elemento può essere:
- Program
- Function block
- Function
- Action
- Method
- Property
- Global Variable List
- DUT

> !?! I getter e i setter delle proprietà vengono marcati come tipo *Unknown*. Si potrebbe usare 'Getter' e 'Setter'. Occorre inoltre verificare se le pagine HTML per i getter e i setter vengono generati dal preview dell'intero progetto (vengono sicuramente generate facendo la preview del singolo getter o setter).

### Overview

L'Overview è generata automaticamente e quindi non ci sono markups per interagire con il contenuto.
Contiene:
- Diagramma UML dell'elemento
- Tabella contenente:
  - Name
  - Type
  - Access Modifier
  - Implements
  - Extends

> !?! L'*Access Modifier* a volte viene valorizzato a *Public* (default quando non indicato) e a volte non viene valorizzato anche se presente (ad esempio in *Property* e *Method*).

## Summary

### Sintassi:

Multiple lines:
```pascal
(*! <Summary>
...(content)...
</Summary>
```

One line:
```pascal
//! @Summary ...(content)...
```

Il Summary compare una sola volta per POU, DUT e GVL.
Se esistono più markup *Summary* all'interno del codice dell'elemento, viene inserito nella documentazione solo il testo del primo markup.
Viene sempre renderizzato all'inizio della pagina del documento relativo all'elemento di codice.
Se non è presente alcun markup *Summary* la sezione non viene renderizzata.
Può essere in qualunque punto del codice dell'elemento (declaration o body).

Regole AU-tomation:
> mettere il markup all'inizio della POU, DUT e GVL
> usare la versione multiline per poter scrivere un teesto sufficientemente lungo suddiviso su più righe


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

## Declaration

E' sempre presente nelle POU (PRG, FB, FUN, DUT, GVL) e viene generata automaticamente.  
Non è presente per metodi e proprietà.  
Per le POU contiene l'intera sezione pubblica di dichiarazione (firma della POU, eventuali attributi e lista delle variabili dell'interfaccia pubblica: VAR_INPUT, VAR_OUTPUT, VAR_IN_OUT).

> !?! Anche i metodi e le proprietà (compresi getter e setter) dovrebbero riportare la loro sezione di dichiarazione.

Dopo la sezione di dichiarazione, è presente una sezione 'Members' che può contenere le seguenti tabelle:
- Input variables
- Output variables
- Input/Output variables
- Local variables
- Actions
- Methods
- Properties

> !?! La lista delle variabili locali (interne) potrebbe essere nascosta nella documentazione (information hiding: dettagli implementativi).

Le tabelle delle variabili contengono per ciascuna variabile le seguenti informazioni:
- Name
- Type
- Value
- Comment
- Inherited

Il campo *Value* è valorizzato se nella dichiarazione della variabile è presente un valore di inizializzazione.

Il campo *Comment* è valorizzato se è presente:
- un commento sulla stessa linea di dichiarazione della variabile (il commento deve avere il punto esclamativo subito dopo la doppia barra: //!, altrimenti non viene considerato)ù
- un markup *Param* in qualunque punto della sezione di dichiarazione

Il markup *Param* deve contenere come parola iniziale il nome del parametro al quale si riferisce.

> !?! Tutte le occorrenze del nome del parametro all'interno del markup vengono rimosse.

> !?! Le variabili che non hanno un commento in linea (//!) o il corrispondente markup, non vengono sono presenti nella lista. Il commento in linea del linguaggio ST (//) non viene considerato.

Nel seguente snippet di codice:
```pascal
VAR
//! @param tTimerValue internal TIME variable that is being accessed via property "P_Timervalue" 
//! @param TimerStart TimerStart is a time. Use TimerStart to specify the start time
(Get/Set)
    tTimerValue      : TIME := T#500MS;   //! internal comment
    iState           : INT;               //! state of the state machine
    bAtLeftPosFbk    : BOOL;              // internal comment
    bAtRightPosFbk   : BOOL;              //! software watchdog to reach the end position
    TimerReach       : TON;               //! software watchdog to reach the end position
    TimerStart       : TON;               //! Start timer
END_VAR
```
- la variabile *bLeftPosFbk* non viene visualizzata nella lista delle variabili locali perchè il commento è un semplice commento ST e non il markup //!
- la variabile *tTimerValue* viene visualizzata con il commento del markup *param* che ha priorità su quello in linea.
- la variabile *TimerStart* viene visualizzata con il commento del markup *param* che ha priorità su quello in linea.
- per la variabile *TimerStart*, il commento visualizzato è *'is a time. Use to specify the start time'* invece di *'TimerStart is a time. Use TimerStart to specify the start time'*in quanto tutte le occorrenze del nome della variabile vengono rimosse.

La tabella delle azioni contiene la lista di tutte le azioni (compresi quelli privati) definiti dalla POU.

Per ciascuna *Action* sono presenti le seguenti informazioni:
- Name
- Type
- Comment

Il campo *Type* non è mai valorizzato in quanto le azioni non possono avere un valore di ritorno.

> !?! Non è chiaro come si possa valorizzare il campo *Comment*.

> !?! La lista dei metodi dovrebbe non elencare i metodi privati (information hiding: dettagli implementativi)

La tabella dei metodi contiene la lista di tutti i metodi (compresi quelli privati) definiti dalla POU.

Per ciascun *Method* sono presenti le seguenti informazioni:
- Name
- Type
- Comment

Il campo *Type* contiene il tipo del valore di ritorno del metodo (se presente).

> !?! Non è chiaro come si possa valorizzare il campo *Comment*.

> !?! La lista dei metodi dovrebbe non elencare i metodi privati (information hiding: dettagli implementativi)

Per ciascuna *Property* sono presenti le seguenti informazioni:
- Name
- Type
- Comment

Il campo *Type* contiene il tipo del valore di ritorno della proprietà.

> !?! Non è chiaro come si possa valorizzare il campo *Comment*.

> !?! Non viene indicato per ciascuna proprietà se siano presenti entrambi i getter e setter oppure solo uno di essi.

> !?! La lista delle proprietà dovrebbe non elencare le proprietà private (information hiding: dettagli implementativi)






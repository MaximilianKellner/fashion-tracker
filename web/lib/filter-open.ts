/** localStorage-Schlüssel: "1" = Filter-Panel beim Aufruf der Seite offen („aufgeklappt lassen“) */
export const FILTER_OPEN_KEY = "filter-open";

/**
 * Läuft im <head> vor dem ersten Zeichnen: Ist „aufgeklappt lassen“ gesetzt, markiert es <html>, damit das CSS
 * das Panel schon vor der Hydration offen zeigt (ohne Aufklapp-Animation). FilterKeepOpen übernimmt danach.
 * Eigene Datei statt in der Client-Komponente, damit das Server-Layout den Text bekommt und keine Client-Referenz.
 */
export const filterOpenScript = `try{if(localStorage.getItem("${FILTER_OPEN_KEY}")==="1")document.documentElement.dataset.filterOpen=""}catch(e){}`;

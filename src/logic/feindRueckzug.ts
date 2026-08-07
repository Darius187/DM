// GEORDNETER FEIND-RUECKZUG (Autor: "die Feinde sollen nicht verstreut in der
// Gegend rumrennen - entweder zum naechsten Lager zurueck, oder auf eine bereits
// besetzte Nachbarkarte, und wenn beides fehlt: kaempfen bis sie fallen").
// Reine, Phaser-freie Entscheidungslogik (testbar). Die Szene liefert die drei
// Fakten (im Gefecht? Lager auf der Karte? besetzte Nachbarkarte?) und setzt
// anhand des Modus das Verhalten.

export type RueckzugModus =
  | 'gefecht'      // Held in Reichweite -> normale Kampf-KI, kein Rueckzug
  | 'lager'        // 1. Prioritaet: zum eigenen Lager auf dieser Karte sammeln
  | 'nachbar'      // 2. Prioritaet: auf eine besetzte Nachbarkarte abziehen
  | 'todeskampf';  // 3. weder Lager noch Rueckzug -> jagt den Helden, faellt kaempfend

// Prioritaet: Gefecht schlaegt alles (dann kaempft die normale KI). Sonst
// Lager > besetzte Nachbarkarte > Todeskampf.
export function feindRueckzugModus(
  imGefecht: boolean,
  hatLager: boolean,
  besetzterNachbar: string | null,
): RueckzugModus {
  if (imGefecht) return 'gefecht';
  if (hatLager) return 'lager';
  if (besetzterNachbar) return 'nachbar';
  return 'todeskampf';
}

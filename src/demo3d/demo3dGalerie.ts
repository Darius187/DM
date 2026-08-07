// 3D-Test-Galerie (Runde 58): EINE Test-Umgebung für alle prozeduralen Objekte.
// Oben das Objekt wählen, unten die Aktion (Öffnen/Schließen ...). Hier wird
// jedes 3D-Stück geprüft, BEVOR etwas ins Spiel geht.

import * as THREE from 'three';
import { baueBuehne } from './buehne';
import { baueTuer, baueTor } from './tuerBau';
import { baueBrunnen, baueAltar, baueFass } from './propsBau';
import { baueGrabstein, baueKiste, baueKaefig, baueWandfackel, baueErzader, baueBuecherregal } from './props2Bau';
import { bauePalisade, baueZaun, baueErz } from './props3Bau';
import { baueTruhe, animiereTruhe, setTruheFarbe, type TruheParts } from './truheBau';

const app = document.getElementById('app')!;
const top = document.getElementById('top')!;
const ctrl = document.getElementById('ctrl')!;
const buehne = baueBuehne(app);

interface Objekt { gruppe: THREE.Object3D; animate: (offen01: number, t: number) => void; }
interface Eintrag { name: string; bau: () => Objekt; blickY: number; dist: number; extra?: (ctrl: HTMLElement, o: Objekt) => void; }

const KATALOG: Eintrag[] = [
  { name: 'Tür', bau: () => { const x = baueTuer(); return { gruppe: x.gruppe, animate: (o) => x.animate(o) }; }, blickY: 1.1, dist: 4.2 },
  { name: 'Tor', bau: () => { const x = baueTor(); return { gruppe: x.gruppe, animate: (o) => x.animate(o) }; }, blickY: 1.8, dist: 7 },
  { name: 'Kiste', bau: () => baueKiste(), blickY: 0.4, dist: 2.4 },
  { name: 'Grabstein', bau: () => baueGrabstein(), blickY: 0.55, dist: 2.8 },
  { name: 'Käfig', bau: () => baueKaefig(), blickY: 0.7, dist: 3.2 },
  { name: 'Fackel', bau: () => baueWandfackel(), blickY: 1.0, dist: 3.0 },
  { name: 'Erzader', bau: () => baueErzader(), blickY: 0.4, dist: 2.4 },
  { name: 'Palisade', bau: () => bauePalisade(), blickY: 1.1, dist: 4.0 },
  { name: 'Zaun', bau: () => baueZaun(), blickY: 0.5, dist: 2.8 },
  { name: 'Erz · Gold', bau: () => baueErz('gold'), blickY: 0.4, dist: 2.4 },
  { name: 'Erz · Kupfer', bau: () => baueErz('kupfer'), blickY: 0.4, dist: 2.4 },
  { name: 'Erz · Kristall', bau: () => baueErz('kristall'), blickY: 0.4, dist: 2.4 },
  { name: 'Bücherregal', bau: () => baueBuecherregal(), blickY: 0.9, dist: 3.4 },
  { name: 'Brunnen', bau: () => baueBrunnen(), blickY: 1.3, dist: 4.6 },
  { name: 'Altar', bau: () => baueAltar(), blickY: 0.9, dist: 3.4 },
  { name: 'Fass', bau: () => baueFass(), blickY: 0.5, dist: 2.6 },
  {
    name: 'Truhe', blickY: 0.55, dist: 2.8,
    bau: () => { const t = baueTruhe(); (window as unknown as { __t?: TruheParts }).__t = t; return { gruppe: t.gruppe, animate: (o, z) => animiereTruhe(t, o, z) }; },
    extra: (c) => {
      const RAR: Array<[string, number]> = [['Selten', 0xf0d060], ['Magisch', 0x5a86e0], ['Episch', 0xc060f0], ['Gewöhnlich', 0xb8b2a0]];
      let i = 0; const b = knopf(c, 'Rarität: Selten', () => { i = (i + 1) % RAR.length; const t = (window as unknown as { __t?: TruheParts }).__t; if (t) setTruheFarbe(t, RAR[i][1]); b.textContent = 'Rarität: ' + RAR[i][0]; });
    },
  },
];

let offen01 = 0, offenZiel = 0;
let aktiv: Objekt | null = null;

function knopf(bar: HTMLElement, label: string, fn: () => void): HTMLButtonElement {
  const b = document.createElement('button'); b.textContent = label; b.onclick = fn; bar.appendChild(b); return b;
}

function zeige(e: Eintrag, btn: HTMLButtonElement): void {
  buehne.leeren(); ctrl.innerHTML = '';
  offen01 = 0; offenZiel = 0;
  aktiv = e.bau();
  buehne.add(aktiv.gruppe);
  buehne.blickAuf(e.blickY, e.dist);
  for (const b of top.children) (b as HTMLElement).classList.toggle('an', b === btn);
  // Standard-Aktion Öffnen/Schließen
  const ob = knopf(ctrl, 'Öffnen / Schließen', () => { offenZiel = offenZiel ? 0 : 1; ob.classList.toggle('an', offenZiel === 1); });
  if (e.extra) e.extra(ctrl, aktiv);
}

buehne.setTick((dt, t) => {
  offen01 += (offenZiel - offen01) * Math.min(1, dt * 5);
  aktiv?.animate(offen01, t);
});

const buttons: HTMLButtonElement[] = KATALOG.map((e) => knopf(top, e.name, () => zeige(e, buttons[KATALOG.indexOf(e)])));
zeige(KATALOG[0], buttons[0]);
(window as unknown as { __galerieBereit?: boolean; __waehle?: (n: string) => void; __setOffen?: (v: boolean) => void }).__galerieBereit = true;
(window as unknown as { __waehle?: (n: string) => void }).__waehle = (n: string) => { const i = KATALOG.findIndex((e) => e.name === n); if (i >= 0) zeige(KATALOG[i], buttons[i]); };
(window as unknown as { __setOffen?: (v: boolean) => void }).__setOffen = (v: boolean) => { offenZiel = v ? 1 : 0; };
(window as unknown as { __forceOpen?: (v: number) => void }).__forceOpen = (v: number) => { offen01 = v; offenZiel = v; }; // für Screenshots

<?php $currentPath = strtok($_SERVER['REQUEST_URI'] ?? '/', '?'); ?>
<header class="bg-white border-b border-slate-200 sticky top-0 z-40">
  <div class="container-x">
    <nav class="flex items-center justify-between py-3 md:py-4" aria-label="Hauptnavigation">

      <a href="/" class="flex items-center gap-3 no-underline" aria-label="Startseite uni-silent">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white font-bold text-lg" aria-hidden="true">u</span>
        <span class="flex flex-col leading-tight">
          <span class="text-lg md:text-xl font-semibold text-brand-900">uni-silent</span>
          <span class="text-[11px] uppercase tracking-widest text-slate-500">auf leisen Rollen</span>
        </span>
      </a>

      <ul class="hidden md:flex items-center gap-6 text-sm font-medium">
        <li><a href="/" class="text-slate-700 hover:text-brand-700 no-underline <?= $currentPath === '/' ? 'text-brand-700' : '' ?>">Start</a></li>
        <li><a href="/produkte" class="text-slate-700 hover:text-brand-700 no-underline <?= str_starts_with($currentPath, '/produkt') ? 'text-brand-700' : '' ?>">Produkte</a></li>
        <li><a href="/anfrage" class="text-slate-700 hover:text-brand-700 no-underline">Anfrage</a></li>
        <li><a href="/kontakt" class="text-slate-700 hover:text-brand-700 no-underline">Kontakt</a></li>
      </ul>

      <div class="hidden md:flex items-center gap-2">
        <a href="/anfrage" class="btn-primary text-sm">Stückzahl anfragen</a>
      </div>

      <button type="button" class="md:hidden inline-flex items-center justify-center rounded p-2 text-brand-900 hover:bg-brand-50"
              aria-controls="mobile-menu" aria-expanded="false" data-mobile-menu-button>
        <span class="sr-only">Menü öffnen</span>
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
        </svg>
      </button>
    </nav>

    <div id="mobile-menu" class="md:hidden hidden border-t border-slate-200 py-3" data-mobile-menu>
      <ul class="space-y-1">
        <li><a href="/"          class="block rounded px-3 py-2 text-base font-medium text-slate-700 hover:bg-brand-50 no-underline">Start</a></li>
        <li><a href="/produkte"  class="block rounded px-3 py-2 text-base font-medium text-slate-700 hover:bg-brand-50 no-underline">Produkte</a></li>
        <li><a href="/anfrage"   class="block rounded px-3 py-2 text-base font-medium text-slate-700 hover:bg-brand-50 no-underline">Anfrage</a></li>
        <li><a href="/kontakt"   class="block rounded px-3 py-2 text-base font-medium text-slate-700 hover:bg-brand-50 no-underline">Kontakt</a></li>
        <li class="pt-2"><a href="/anfrage" class="btn-primary w-full">Stückzahl anfragen</a></li>
      </ul>
    </div>
  </div>
</header>

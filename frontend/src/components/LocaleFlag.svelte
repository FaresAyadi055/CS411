<script lang="ts">
  import type { Locale } from '../lib/i18n.svelte'
  import gb from 'flag-icons/flags/4x3/gb.svg?url'
  import fr from 'flag-icons/flags/4x3/fr.svg?url'
  import tn from 'flag-icons/flags/4x3/tn.svg?url'

  const FLAG_SRC: Record<Locale, string> = {
    en: gb,
    fr: fr,
    ar: tn,
  }

  let { locale, class: className = 'w-5 h-3.5' }: { locale: Locale; class?: string } = $props()
</script>

<img
  src={FLAG_SRC[locale]}
  alt=""
  class="shrink-0 rounded-sm border border-black/10 object-cover {className}"
  loading="lazy"
  decoding="async"
/>

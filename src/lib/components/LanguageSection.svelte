<script>
  /*
   * Configuración → Idioma. Solo el idioma de la INTERFAZ: el de los datos de
   * Steam vive en Cuentas (junto al resto de opciones de sincronización, que
   * es donde tiene sentido cambiarlo y donde está el botón de re-sincronizar).
   * Acá solo se muestra cuál quedó activo, para que la relación entre ambos
   * sea visible desde el lado del idioma.
   */
  import { UI_LOCALES, uiLanguage, setLanguage } from "../stores/language.js";
  import { effectiveSteamLang } from "../stores/steamAccount.js";
  import { steamLanguageLabel } from "../i18n/steamLanguages.js";
  import { t } from "../i18n/index.js";
  import Select from "./Select.svelte";

  // Los labels son autónimos (cada idioma escrito en sí mismo), así que no
  // dependen de $t — igual se arma reactivamente por consistencia con el
  // resto de secciones.
  $: options = UI_LOCALES.map((l) => ({ value: l.id, label: l.label }));
</script>

<section class="panel">
  <h1>{$t("settings.language.title")}</h1>
  <p class="dim">{$t("settings.language.desc")}</p>

  <div class="wrap">
    <Select
      label={$t("settings.language.ui.label")}
      value={$uiLanguage}
      {options}
      onChange={setLanguage}
    />
  </div>

  <p class="dim steam-hint">
    {$t("settings.language.steamHint", { value: steamLanguageLabel($effectiveSteamLang) })}
  </p>
</section>

<style>
  .panel {
    padding: var(--gm-pad);
    height: 100%;
    overflow-y: auto;
    max-width: 640px;
  }
  h1 {
    font-size: 2rem;
    font-weight: var(--gm-title-weight);
    margin: 0 0 12px;
  }
  .dim {
    color: var(--gm-text-dim);
    max-width: 560px;
  }
  .wrap {
    margin-top: 20px;
  }
  .steam-hint {
    margin-top: 26px;
  }
</style>

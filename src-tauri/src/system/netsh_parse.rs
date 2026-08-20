//! Parseo de la salida de `netsh` (Wi-Fi de Windows).
//!
//! **Este módulo se compila en todos los sistemas a propósito**, aunque solo se
//! use desde `system/windows/wifi.rs`. Son funciones puras de `&str` a datos: al
//! no depender de Windows, sus tests corren en el Mac de desarrollo. El parseo
//! de texto localizado es la parte más frágil de toda la fase de Wi-Fi, así que
//! es justo la que no puede quedarse sin pruebas hasta llegar al PC.
//!
//! # Regla de oro: anclar en lo que NO se traduce
//!
//! `netsh` imprime en el idioma de Windows. Las **etiquetas** se traducen
//! ("Authentication" → "Autenticación", "Signal" → "Señal"), así que buscarlas
//! por nombre solo funciona en inglés. Lo que no se traduce:
//!
//! - Los identificadores `SSID`, `BSSID`, `GUID`.
//! - Los **valores** técnicos: `WPA2-Personal`, `WEP`, `RSNA`, `Open`.
//! - El signo `%` de la señal.
//!
//! Por eso casi todo se detecta por el valor de la línea y no por su etiqueta.

/// Estado de la interfaz inalámbrica (`netsh wlan show interfaces`).
#[derive(Debug, Default, PartialEq)]
pub struct InterfaceStatus {
    /// Hay adaptador Wi-Fi en el equipo.
    pub present: bool,
    /// La radio está encendida.
    pub enabled: bool,
    /// SSID conectado ahora mismo.
    pub ssid: Option<String>,
}

/// Una red vista en el escaneo (`netsh wlan show networks mode=bssid`).
#[derive(Debug, PartialEq)]
pub struct ParsedNet {
    pub ssid: String,
    pub secured: bool,
    pub signal: u8,
}

/// Parte `etiqueta : valor` por el PRIMER `:`. Devuelve el valor ya recortado.
/// Ojo con los valores que llevan `:` dentro (una MAC de BSSID) — por eso se
/// parte solo por el primero.
fn value_of(line: &str) -> Option<&str> {
    line.split_once(':').map(|(_, v)| v.trim())
}

/// ¿La etiqueta de esta línea empieza por `key` (sin distinguir mayúsculas)?
fn label_starts_with(line: &str, key: &str) -> bool {
    let label = line.split_once(':').map(|(l, _)| l.trim()).unwrap_or("");
    label.to_lowercase().starts_with(&key.to_lowercase())
}

pub fn parse_interfaces(txt: &str) -> InterfaceStatus {
    let mut st = InterfaceStatus::default();

    // "GUID" no se traduce y solo aparece si hay al menos un adaptador. Sin
    // adaptador, netsh imprime una única frase ("There is no wireless
    // interface on the system" / "No hay ninguna interfaz inalámbrica…").
    st.present = txt.lines().any(|l| label_starts_with(l, "GUID"));
    if !st.present {
        return st;
    }
    // Por defecto encendida: la línea de estado de radio no aparece en todas
    // las versiones, y asumir "apagada" escondería la categoría sin motivo.
    st.enabled = true;

    // El estado de radio ocupa DOS líneas y la segunda no tiene `:`:
    //     Radio status           : Hardware On
    //                              Software Off
    // Si se mira solo la primera, una radio apagada por software pasa por
    // encendida. Por eso hace falta seguir el bloque.
    let mut in_radio_block = false;

    for line in txt.lines() {
        let l = line.trim();
        let has_label = l.contains(':');

        // SSID conectado. `BSSID` empieza distinto, así que la comprobación de
        // etiqueta exacta lo descarta.
        if label_starts_with(l, "SSID") && !label_starts_with(l, "BSSID") {
            if let Some(v) = value_of(l) {
                if !v.is_empty() {
                    st.ssid = Some(v.to_string());
                }
            }
        }

        // Entrada al bloque de radio. La etiqueta es "Radio status" o "Estado
        // de radio": ambas llevan "radio" y la palabra de estado. Se pide la
        // segunda para no confundirlo con "Radio type" / "Tipo de radio".
        if has_label {
            let label = l.split_once(':').map(|(x, _)| x.trim().to_lowercase()).unwrap_or_default();
            in_radio_block =
                label.contains("radio") && (label.contains("status") || label.contains("estado"));
        }

        // Dentro del bloque: vale la primera línea (tras el `:`) y las
        // continuaciones sin etiqueta. Basta con que hardware O software estén
        // apagados.
        if in_radio_block {
            let v = if has_label { value_of(l).unwrap_or("") } else { l };
            let v = v.to_lowercase();
            if v.contains("off") || v.contains("apagad") {
                st.enabled = false;
            }
        }
    }

    // Si la radio está apagada no hay red conectada, diga lo que diga una línea
    // residual.
    if !st.enabled {
        st.ssid = None;
    }
    st
}

/// ¿Este valor de autenticación indica una red protegida?
///
/// Se decide por el valor, que no se traduce. Ante la duda **se asume
/// protegida**: el peor caso es pedir una contraseña de más, mientras que
/// asumir abierta por error hace que la conexión falle sin explicación.
fn secured_from_auth(value: &str) -> bool {
    let v = value.to_lowercase();
    !(v == "open" || v == "abierta" || v == "abierto")
}

pub fn parse_networks(txt: &str) -> Vec<ParsedNet> {
    let mut nets: Vec<ParsedNet> = Vec::new();
    let mut cur: Option<ParsedNet> = None;

    for line in txt.lines() {
        let l = line.trim();

        // Cabecera de red: "SSID 1 : MiRed". El número la distingue de la línea
        // "SSID" suelta de `show interfaces`, y de "BSSID 1".
        let is_ssid_header = {
            let label = l.split_once(':').map(|(x, _)| x.trim()).unwrap_or("");
            let mut parts = label.split_whitespace();
            matches!(parts.next(), Some(w) if w.eq_ignore_ascii_case("SSID"))
                && matches!(parts.next(), Some(n) if n.parse::<u32>().is_ok())
        };

        if is_ssid_header {
            if let Some(n) = cur.take() {
                nets.push(n);
            }
            let ssid = value_of(l).unwrap_or("").to_string();
            cur = Some(ParsedNet {
                ssid,
                secured: true, // hasta que se demuestre lo contrario
                signal: 0,
            });
            continue;
        }

        let Some(net) = cur.as_mut() else { continue };

        if let Some(v) = value_of(l) {
            // Autenticación: se reconoce por el valor, no por la etiqueta.
            let vl = v.to_lowercase();
            let looks_like_auth = vl == "open"
                || vl == "abierta"
                || vl == "abierto"
                || vl.contains("wpa")
                || vl.contains("wep")
                || vl.contains("rsna")
                || vl.contains("802.1x");
            if looks_like_auth {
                net.secured = secured_from_auth(v);
            }
        }

        // Señal: el `%` no se traduce. Con `mode=bssid` hay una por punto de
        // acceso; nos quedamos con la mejor.
        if let Some(pct) = parse_percent(l) {
            net.signal = net.signal.max(pct);
        }
    }
    if let Some(n) = cur.take() {
        nets.push(n);
    }

    // Un SSID puede repetirse (varias bandas): se queda el de mejor señal.
    nets.retain(|n| !n.ssid.is_empty());
    nets.sort_by(|a, b| a.ssid.cmp(&b.ssid).then(b.signal.cmp(&a.signal)));
    nets.dedup_by(|a, b| a.ssid == b.ssid);
    nets.sort_by(|a, b| b.signal.cmp(&a.signal));
    nets
}

/// Primer `NN%` de la línea, como 0-100.
fn parse_percent(line: &str) -> Option<u8> {
    let idx = line.find('%')?;
    let digits: String = line[..idx]
        .chars()
        .rev()
        .take_while(|c| c.is_ascii_digit())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse::<u16>().ok().map(|v| v.min(100) as u8)
}

/// Perfiles guardados (`netsh wlan show profiles`).
///
/// La etiqueta ("All User Profile" / "Perfil de todos los usuarios") sí se
/// traduce, así que se aceptan todas las líneas con `:` de la sección y se
/// descartan las de cabecera, que no lo tienen.
pub fn parse_profiles(txt: &str) -> Vec<String> {
    let mut out = Vec::new();
    for line in txt.lines() {
        let l = line.trim();
        // Las cabeceras ("Profiles on interface Wi-Fi:") acaban en `:` sin
        // valor detrás.
        let Some(v) = value_of(l) else { continue };
        if v.is_empty() {
            continue;
        }
        // Solo interesan las líneas de perfil, que llevan "profile"/"perfil"
        // en la etiqueta — esa palabra sí es reconocible en ambos idiomas.
        let label = l.split_once(':').map(|(x, _)| x.trim().to_lowercase()).unwrap_or_default();
        if label.contains("profile") || label.contains("perfil") {
            out.push(v.to_string());
        }
    }
    out
}

/// ¿Hay una conexión por cable activa? (`netsh interface show interface`).
///
/// Heurística documentada: se toma la primera interfaz **conectada** cuyo
/// nombre no parezca inalámbrica ni virtual. `netsh` no dice el medio físico,
/// así que no hay forma exacta por esta vía; el dato es informativo (una línea
/// en el QAM), no algo sobre lo que se actúe.
pub fn parse_ethernet(txt: &str) -> Option<String> {
    for line in txt.lines() {
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 4 {
            continue;
        }
        // Columnas: Admin State | State | Type | Interface Name
        // El nombre puede llevar espacios, así que se reconstruye desde la 4ª.
        let state = cols[1].to_lowercase();
        // Ojo: "desconectado" CONTIENE "conectado" — hay que comparar el token
        // entero, no con `contains`.
        let connected = state == "connected" || state == "conectado";
        if !connected {
            continue;
        }
        let name = cols[3..].join(" ");
        let n = name.to_lowercase();
        let wireless = n.contains("wi-fi")
            || n.contains("wifi")
            || n.contains("wireless")
            || n.contains("inalámbric")
            || n.contains("inalambric")
            || n.contains("bluetooth")
            || n.contains("loopback")
            || n.contains("vethernet");
        if !wireless {
            return Some(name);
        }
    }
    None
}

/// Escapa las entidades XML. Un SSID puede llevar `&` perfectamente ("Casa &
/// Jardín"), y sin escapar el perfil no valida y `add profile` falla con un
/// error que no dice nada útil.
fn xml_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&apos;"),
            _ => out.push(c),
        }
    }
    out
}

/// Perfil WLAN para una red nueva.
///
/// El bloque `<security>` es quisquilloso con el orden: `<authEncryption>` tiene
/// que **cerrarse antes** de `<sharedKey>`. Con los dos anidados al revés el XML
/// no valida y `netsh wlan add profile` falla sin explicar por qué (era el bug
/// del prototipo de `testing/system-controls`).
pub fn profile_xml(ssid: &str, password: Option<&str>, secured: bool) -> String {
    let s = xml_escape(ssid);
    let security = match (secured, password) {
        (true, Some(pw)) => format!(
            r#"    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>{}</keyMaterial>
      </sharedKey>
    </security>
"#,
            xml_escape(pw)
        ),
        // Red abierta (o protegida sin clave, que fallará al conectar y se
        // limpiará sola).
        _ => r#"    <security>
      <authEncryption>
        <authentication>open</authentication>
        <encryption>none</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
    </security>
"#
        .to_string(),
    };

    format!(
        r#"<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>{s}</name>
  <SSIDConfig>
    <SSID>
      <name>{s}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM>
{security}  </MSM>
</WLANProfile>
"#
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    // Salidas reales de netsh, en inglés y en español, para fijar el parseo.

    const IFACE_EN: &str = r#"
There is 1 interface on the system:

    Name                   : Wi-Fi
    Description            : Intel(R) Wireless-AC 9560
    GUID                   : 707d7ac4-05f2-4e3b-9a24-1d3b8b0f9c11
    Physical address       : a4:c3:f0:11:22:33
    State                  : connected
    SSID                   : SalaWiFi_5G
    BSSID                  : 12:34:56:78:9a:bc
    Radio type             : 802.11ac
    Authentication         : WPA2-Personal
    Signal                 : 92%
"#;

    const IFACE_ES: &str = r#"
Hay 1 interfaz en el sistema:

    Nombre                     : Wi-Fi
    Descripción                : Intel(R) Wireless-AC 9560
    GUID                       : 707d7ac4-05f2-4e3b-9a24-1d3b8b0f9c11
    Dirección física           : a4:c3:f0:11:22:33
    Estado                     : conectado
    SSID                       : Casa de Muñoz
    BSSID                      : 12:34:56:78:9a:bc
    Tipo de radio              : 802.11ac
    Autenticación              : WPA2-Personal
    Señal                      : 74%
"#;

    const IFACE_RADIO_OFF: &str = r#"
    Name                   : Wi-Fi
    GUID                   : 707d7ac4-05f2-4e3b-9a24-1d3b8b0f9c11
    State                  : disconnected
    Radio status           : Hardware On
                             Software Off
"#;

    const NO_IFACE_EN: &str = "There is no wireless interface on the system.";
    const NO_IFACE_ES: &str = "No hay ninguna interfaz inalámbrica en el sistema.";

    #[test]
    fn interfaz_en_ingles() {
        let s = parse_interfaces(IFACE_EN);
        assert!(s.present && s.enabled);
        assert_eq!(s.ssid.as_deref(), Some("SalaWiFi_5G"));
    }

    #[test]
    fn interfaz_en_espanol_con_acentos() {
        let s = parse_interfaces(IFACE_ES);
        assert!(s.present && s.enabled);
        assert_eq!(s.ssid.as_deref(), Some("Casa de Muñoz"));
    }

    #[test]
    fn sin_adaptador_en_ambos_idiomas() {
        for txt in [NO_IFACE_EN, NO_IFACE_ES] {
            let s = parse_interfaces(txt);
            assert!(!s.present, "no debería detectar adaptador en: {txt}");
            assert!(s.ssid.is_none());
        }
    }

    #[test]
    fn radio_apagada_no_reporta_red() {
        let s = parse_interfaces(IFACE_RADIO_OFF);
        assert!(s.present);
        assert!(!s.enabled);
        assert!(s.ssid.is_none());
    }

    const NETWORKS_EN: &str = r#"
Interface name : Wi-Fi
There are 3 networks currently visible.

SSID 1 : SalaWiFi_5G
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : 12:34:56:78:9a:bc
         Signal             : 92%
         Radio type         : 802.11ac
    BSSID 2                 : 12:34:56:78:9a:bd
         Signal             : 61%

SSID 2 : Cafe_Invitados
    Network type            : Infrastructure
    Authentication          : Open
    Encryption              : None
    BSSID 1                 : aa:bb:cc:dd:ee:ff
         Signal             : 33%

SSID 3 :
    Network type            : Infrastructure
    Authentication          : WPA2-Personal
    Encryption              : CCMP
    BSSID 1                 : 11:22:33:44:55:66
         Signal             : 12%
"#;

    const NETWORKS_ES: &str = r#"
Nombre de interfaz : Wi-Fi
Hay 2 redes visibles actualmente.

SSID 1 : Casa de Muñoz
    Tipo de red             : Infraestructura
    Autenticación           : WPA2-Personal
    Cifrado                 : CCMP
    BSSID 1                 : 12:34:56:78:9a:bc
         Señal              : 74%

SSID 2 : Invitados Café
    Tipo de red             : Infraestructura
    Autenticación           : Abierta
    Cifrado                 : Ninguno
    BSSID 1                 : aa:bb:cc:dd:ee:ff
         Señal              : 41%
"#;

    #[test]
    fn redes_en_ingles() {
        let nets = parse_networks(NETWORKS_EN);
        // La red oculta (SSID vacío) se descarta.
        assert_eq!(nets.len(), 2);
        let sala = nets.iter().find(|n| n.ssid == "SalaWiFi_5G").unwrap();
        assert!(sala.secured);
        // Se queda con la mejor señal de sus dos BSSID.
        assert_eq!(sala.signal, 92);
        let cafe = nets.iter().find(|n| n.ssid == "Cafe_Invitados").unwrap();
        assert!(!cafe.secured);
        assert_eq!(cafe.signal, 33);
    }

    #[test]
    fn redes_en_espanol() {
        let nets = parse_networks(NETWORKS_ES);
        assert_eq!(nets.len(), 2);
        let casa = nets.iter().find(|n| n.ssid == "Casa de Muñoz").unwrap();
        assert!(casa.secured);
        assert_eq!(casa.signal, 74);
        // "Abierta" tiene que reconocerse como red sin contraseña.
        let cafe = nets.iter().find(|n| n.ssid == "Invitados Café").unwrap();
        assert!(!cafe.secured);
    }

    #[test]
    fn las_redes_salen_ordenadas_por_senal() {
        let nets = parse_networks(NETWORKS_EN);
        assert!(nets[0].signal >= nets[1].signal);
    }

    #[test]
    fn un_ssid_desconocido_se_asume_protegido() {
        // Autenticación con un valor que no reconocemos: nunca "abierta".
        let txt = "SSID 1 : Rara\n    Authentication : AlgoNuevoWPA4\n         Signal : 50%\n";
        let nets = parse_networks(txt);
        assert!(nets[0].secured);
    }

    const PROFILES_EN: &str = r#"
Profiles on interface Wi-Fi:

Group policy profiles (read only)
---------------------------------
    <None>

User profiles
-------------
    All User Profile     : SalaWiFi_5G
    All User Profile     : Casa de Muñoz
"#;

    const PROFILES_ES: &str = r#"
Perfiles en la interfaz Wi-Fi:

Perfiles de directiva de grupo (solo lectura)
---------------------------------------------
    <Ninguno>

Perfiles de usuario
-------------------
    Perfil de todos los usuarios : SalaWiFi_5G
    Perfil de todos los usuarios : Vecino_303
"#;

    #[test]
    fn perfiles_guardados_en_ambos_idiomas() {
        assert_eq!(
            parse_profiles(PROFILES_EN),
            vec!["SalaWiFi_5G".to_string(), "Casa de Muñoz".to_string()]
        );
        assert_eq!(
            parse_profiles(PROFILES_ES),
            vec!["SalaWiFi_5G".to_string(), "Vecino_303".to_string()]
        );
    }

    const IFACES_EN: &str = r#"
Admin State    State          Type             Interface Name
-------------------------------------------------------------------------
Enabled        Connected      Dedicated        Ethernet
Enabled        Disconnected   Dedicated        Wi-Fi
"#;

    const IFACES_ES: &str = r#"
Estado admin.  Estado         Tipo             Nombre de la interfaz
-------------------------------------------------------------------------
Habilitado     Desconectado   Dedicado         Ethernet
Habilitado     Conectado      Dedicado         Wi-Fi
"#;

    // --- perfil XML (el bug del prototipo vivía aquí) ---

    #[test]
    fn el_perfil_cierra_authencryption_antes_de_sharedkey() {
        let xml = profile_xml("MiRed", Some("clave123"), true);
        let fin_auth = xml.find("</authEncryption>").expect("falta </authEncryption>");
        let ini_shared = xml.find("<sharedKey>").expect("falta <sharedKey>");
        // Anidados al revés, netsh rechaza el perfil sin decir por qué.
        assert!(
            fin_auth < ini_shared,
            "</authEncryption> tiene que cerrarse ANTES de <sharedKey>:\n{xml}"
        );
    }

    #[test]
    fn el_perfil_lleva_la_clave_y_el_ssid() {
        let xml = profile_xml("MiRed", Some("clave123"), true);
        assert!(xml.contains("<keyMaterial>clave123</keyMaterial>"));
        assert_eq!(xml.matches("<name>MiRed</name>").count(), 2);
        assert!(xml.contains("WPA2PSK"));
    }

    #[test]
    fn el_perfil_de_red_abierta_no_lleva_clave() {
        let xml = profile_xml("Cafe", None, false);
        assert!(!xml.contains("sharedKey"));
        assert!(xml.contains("<authentication>open</authentication>"));
    }

    #[test]
    fn el_ssid_y_la_clave_se_escapan_como_xml() {
        // Un SSID con & es perfectamente legal ("Casa & Jardín").
        let xml = profile_xml("Casa & Jardín", Some("a<b>\"c\""), true);
        assert!(xml.contains("<name>Casa &amp; Jardín</name>"));
        assert!(xml.contains("a&lt;b&gt;&quot;c&quot;"));
        // Y no puede quedar ningún & suelto que invalide el documento.
        assert!(!xml.replace("&amp;", "").replace("&lt;", "").replace("&gt;", "")
            .replace("&quot;", "").replace("&apos;", "").contains('&'));
    }

    #[test]
    fn ethernet_conectado() {
        assert_eq!(parse_ethernet(IFACES_EN).as_deref(), Some("Ethernet"));
    }

    #[test]
    fn ethernet_desconectado_no_cuenta_y_el_wifi_no_es_cable() {
        // "Desconectado" contiene "conectado": el bug clásico de este parseo.
        assert_eq!(parse_ethernet(IFACES_ES), None);
    }
}

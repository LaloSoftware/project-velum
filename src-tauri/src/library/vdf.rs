//! Parser mínimo de VDF/ACF (formato key-values de Valve), suficiente para
//! `libraryfolders.vdf` y `appmanifest_*.acf`. Cross-platform y testeable.

use std::collections::BTreeMap;

#[derive(Debug, Clone)]
pub enum Vdf {
    Str(String),
    Obj(BTreeMap<String, Vdf>),
}

impl Vdf {
    pub fn get(&self, key: &str) -> Option<&Vdf> {
        match self {
            Vdf::Obj(m) => m.get(key),
            _ => None,
        }
    }
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Vdf::Str(s) => Some(s),
            _ => None,
        }
    }
    pub fn obj(&self) -> Option<&BTreeMap<String, Vdf>> {
        match self {
            Vdf::Obj(m) => Some(m),
            _ => None,
        }
    }
}

enum Tok {
    Str(String),
    Open,
    Close,
}

fn tokenize(input: &str) -> Vec<Tok> {
    let mut toks = Vec::new();
    let mut chars = input.chars().peekable();
    while let Some(&c) = chars.peek() {
        match c {
            '{' => {
                toks.push(Tok::Open);
                chars.next();
            }
            '}' => {
                toks.push(Tok::Close);
                chars.next();
            }
            '"' => {
                chars.next(); // comilla de apertura
                let mut s = String::new();
                while let Some(c) = chars.next() {
                    if c == '"' {
                        break;
                    }
                    if c == '\\' {
                        if let Some(n) = chars.next() {
                            s.push(n); // desescapar \\ y \"
                        }
                    } else {
                        s.push(c);
                    }
                }
                toks.push(Tok::Str(s));
            }
            '/' => {
                chars.next();
                if chars.peek() == Some(&'/') {
                    // comentario hasta fin de línea
                    for c in chars.by_ref() {
                        if c == '\n' {
                            break;
                        }
                    }
                }
            }
            _ => {
                chars.next(); // espacios / tokens no citados
            }
        }
    }
    toks
}

pub fn parse(input: &str) -> Option<Vdf> {
    let toks = tokenize(input);
    let mut pos = 0;
    parse_body(&toks, &mut pos)
}

// Secuencia de pares clave/valor hasta `}` o fin.
fn parse_body(toks: &[Tok], pos: &mut usize) -> Option<Vdf> {
    let mut map = BTreeMap::new();
    while let Some(tok) = toks.get(*pos) {
        match tok {
            Tok::Close => {
                *pos += 1;
                break;
            }
            Tok::Str(key) => {
                let key = key.clone();
                *pos += 1;
                match toks.get(*pos) {
                    Some(Tok::Open) => {
                        *pos += 1;
                        let child = parse_body(toks, pos)?;
                        map.insert(key, child);
                    }
                    Some(Tok::Str(val)) => {
                        let val = val.clone();
                        *pos += 1;
                        map.insert(key, Vdf::Str(val));
                    }
                    _ => return None,
                }
            }
            Tok::Open => {
                *pos += 1; // objeto anónimo: ignorar
            }
        }
    }
    Some(Vdf::Obj(map))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_acf() {
        let acf = r#"
"AppState"
{
    "appid"    "220"
    "name"     "Half-Life 2"
    "installdir"  "Half-Life 2"
}
"#;
        let v = parse(acf).unwrap();
        let app = v.get("AppState").unwrap();
        assert_eq!(app.get("appid").and_then(|x| x.as_str()), Some("220"));
        assert_eq!(app.get("name").and_then(|x| x.as_str()), Some("Half-Life 2"));
    }

    #[test]
    fn parse_nested() {
        let s = r#""libraryfolders" { "0" { "path" "/a/b" } "1" { "path" "/c/d" } }"#;
        let v = parse(s).unwrap();
        let lf = v.get("libraryfolders").unwrap().obj().unwrap();
        assert_eq!(lf.len(), 2);
        assert_eq!(lf["1"].get("path").and_then(|x| x.as_str()), Some("/c/d"));
    }
}

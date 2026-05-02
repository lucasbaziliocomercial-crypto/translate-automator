# Build resources

Recursos usados pelo `electron-builder` durante o empacotamento.

## Arquivos esperados

- `icon.icns` — ícone do app para macOS (1024×1024, formato Apple Icon Image)
- `icon.ico` — ícone do app para Windows (256×256, multi-resolution)
- `icon.png` — fallback opcional (electron-builder gera os outros formatos a partir dele se não existirem)

## Como gerar os ícones

A partir de um PNG 1024×1024 (`icon-source.png`):

### macOS (.icns)

```bash
mkdir icon.iconset
sips -z 16 16     icon-source.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon-source.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon-source.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon-source.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon-source.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon-source.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon-source.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon-source.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon-source.png --out icon.iconset/icon_512x512.png
cp icon-source.png icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
```

### Windows (.ico)

Recomendado: usar uma ferramenta como [icon-gen](https://www.npmjs.com/package/icon-gen) ou serviços online (ex.: icoconvert.com).

## Code signing macOS (opcional)

Para distribuir um build assinado e notarizado (sem o aviso "App não pode ser aberto"), defina estas variáveis de ambiente antes do build e ajuste o `mac` no `package.json`:

```bash
export APPLE_ID="seu@email.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCDE12345"
export CSC_LINK="path/to/Developer ID Application.p12"
export CSC_KEY_PASSWORD="senha do .p12"
```

E em `package.json`, na seção `build.mac`, troque:

```json
"hardenedRuntime": true,
"gatekeeperAssess": false,
"identity": "Developer ID Application: Seu Nome (ABCDE12345)"
```

Sem essas configurações, os builds Mac saem **não assinados** — usuários precisam de "Botão direito → Abrir" na primeira execução para passar do Gatekeeper.

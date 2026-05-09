## macOS — IMPORTANTE: ler antes de instalar

Ao tentar abrir o app pela primeira vez, o macOS vai mostrar **"Translate Automator está danificado e não pode ser aberto"**. **Não está danificado.** O macOS bloqueia porque o app não tem assinatura Apple Developer ID (US$ 99/ano).

Para liberar, depois de **arrastar o app para a pasta Applications**, abra o Terminal e rode:

```bash
xattr -cr "/Applications/Translate Automator.app"
```

Depois é só abrir normalmente pelo Launchpad ou pela pasta Applications.

> ⚠️ A rota "Configurações → Privacidade e Segurança → Abrir mesmo assim" **não funciona** quando a mensagem é "está danificado" (macOS Sonoma+). Apenas o `xattr -cr` resolve.

📄 **Passo a passo completo** (com troubleshooting de DMGs montados, múltiplos downloads, etc.): [INSTALL-MAC.md](https://github.com/lucasbaziliocomercial-crypto/translate-automator/blob/main/INSTALL-MAC.md)

## Windows

Baixe o `.exe` e execute. Sem fricção.

## Atualizações automáticas

Já está usando uma versão anterior do app? O próprio app vai detectar esta versão e oferecer atualizar. **Atualizações in-app não têm o problema do Gatekeeper** — só downloads manuais via browser precisam do `xattr`.

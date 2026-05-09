# Como instalar no Mac

Quando você baixa o `.dmg` do Translate Automator, o macOS pode mostrar uma janela dizendo que o app **"está danificado e não pode ser aberto"**. Calma — o app **não está danificado**. Isso acontece porque ele não é assinado com a chave da Apple (que custa US$ 99 por ano), e o macOS bloqueia tudo que vem da internet por padrão.

Pra liberar é rápido. Siga os passos abaixo na ordem exata.

---

## Passo 1 — Instalar o app na pasta Applications

1. Abra o `.dmg` que você baixou (clique duas vezes).
2. Vai abrir uma janela com o ícone do **Translate Automator** e um atalho da pasta **Applications** ao lado.
3. **Arraste** o ícone do Translate Automator para cima da pasta Applications. Pronto, está instalado.
4. Feche a janela do `.dmg` e ejete o disco que apareceu na barra lateral do Finder (botão de ejetar ⏏ ao lado do nome).

> ⚠️ **Não tente abrir o app de dentro do `.dmg`.** Sempre abra da pasta Applications.

## Passo 2 — Liberar o app no Terminal (uma vez só)

1. Abra o **Terminal** (use o Spotlight: `Cmd + Espaço`, digite "Terminal", Enter).
2. **Copie e cole** o comando abaixo exatamente como está, e dê Enter:

   ```bash
   xattr -cr "/Applications/Translate Automator.app"
   ```

3. Não vai aparecer nenhuma mensagem — isso é normal. Significa que funcionou.

## Passo 3 — Abrir o app

Vá na pasta **Applications** (no Finder, menu **Ir → Aplicativos**) e clique duas vezes em **Translate Automator**.

A partir de agora ele abre normalmente — pelo Launchpad, pelo Dock, ou de onde você preferir.

---

## E quando sair uma versão nova?

Se você instalar manualmente uma versão nova baixada do GitHub, **o aviso volta a aparecer** e você precisa repetir o **Passo 2** (Terminal). É a mesma linha — pode salvar num bloco de notas pra colar de novo:

```bash
xattr -cr "/Applications/Translate Automator.app"
```

> Atualizações **automáticas** (quando o próprio app avisa "nova versão disponível") **não** têm esse problema — elas pulam o Gatekeeper. O aviso só aparece em downloads manuais via browser.

---

## Não funcionou?

Se depois do Passo 2 o app ainda mostrar "está danificado":

1. Confira que o app está mesmo dentro de **Applications** e não na área de trabalho ou em Downloads.
2. Confirme que você não tem várias cópias do `.dmg` aberto ao mesmo tempo. No Finder, na barra lateral, ejete tudo que comece com "Translate Automator" (botão ⏏).
3. Rode o comando abaixo no Terminal — ele tenta limpar os locais mais comuns de uma vez:

   ```bash
   xattr -cr /Applications/Translate*.app ~/Downloads/Translate*.app ~/Desktop/Translate*.app 2>/dev/null; echo "Pronto"
   ```

   Quando aparecer "Pronto", tente abrir o app de novo.

Se ainda der ruim, fala com o Lucas mandando print da tela do Terminal.

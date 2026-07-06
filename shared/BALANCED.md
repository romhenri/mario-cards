# GUIA DE BALANCEAMENTO DE CARD GAME (MECÂNICA LINEAR)

## REGRA DA CURVA BASE

O corpo padrão de uma carta sem habilidades (Vanilla) segue a proporção pura:
Atributos Totais (Ataque + Vida) = Custo de Mana * 2

Exemplos Práticos:

* Custo 1 = Corpo 1/1 (2 pontos de atributo totais)
* Custo 2 = Corpo 2/2 (4 pontos de atributo totais)
* Custo 3 = Corpo 3/3 (6 pontos de atributo totais)
* Custo 4 = Corpo 4/4 (8 pontos de atributo totais)

---

## CUSTO DAS SKILLS (PENALIDADE)

Cada habilidade especial adicionada subtrai pontos do corpo do dinossauro. Para descobrir o tamanho ideal da criatura, pegue o valor da Curva Base e subtraia o custo das habilidades que ela possui:

* **Bomb:** Retira 0 pontos de atributo

* **Fly:** Retira 1 ponto de atributo
* **Reach:** Retira 1 ponto de atributo
* **Quick:** Retira 1 ponto de atributo
* **Stealth:** Retira 1 pontos de atributo

* **Shield:** Retira 2 pontos de atributo
* **Taunt:** Retira 2 ponto de atributo

---

## EXEMPLOS DE APLICAÇÃO NOS DINOSSAUROS

### Exemplo 1: Criando um Velociraptor (Custo 2 com a habilidade Quick)

* Curva Base para Custo 2: Deveria ter 4 pontos de atributos totais.
* Penalidade do Quick: Esfria o corpo em 1 ponto.
* Cálculo: $4 - 1 = 3$ pontos de atributos restantes.
* Resultado Justo: Um dinossauro **2/1** ou **1/2** com Quick.

---

# ANÁLISE DO CATÁLOGO (`src/cards.json`)

Análise de **204 cartas**. Fórmula aplicada:

> Atributos esperados = (Custo × 2) + Bônus de Raridade − Soma das Penalidades
>
> Bônus de Raridade: **Legend +2**, **Boss +2** (common/rare = 0)

## Resumo (após a correção da Bomb)

| Estado | Balanceadas | Acima da curva | Abaixo da curva |
| --- | --- | --- | --- |
| **Atual** (regra Bomb = 0 aplicada) | **204 / 204** | 0 | 0 |

**Veredito:** catálogo 100% na curva. Todas as 204 cartas batem exatamente
nos atributos esperados.

## ✅ Correção aplicada: penalidade da Bomb = 0 (regra nova)

O guia define **"Bomb: Retira 0 pontos"**. As 8 cartas com Bomb haviam
sido construídas como se a Bomb custasse −1 (ficavam 1 ponto abaixo da
curva). A regra nova foi **fixada em 0** e o dano (ataque) de cada carta
de Bomb foi aumentado em **+1** para bater na curva:

| Carta | Raridade | Custo | Antes | Agora | Esperado (Bomb=0) |
| --- | --- | --- | --- | --- | --- |
| Bob-Omb | common | 2 | 2/1 | **3/1** | ✅ 4 |
| Bullet Bill | common | 3 | 4/1 | **5/1** | ✅ 6 |
| Banzai Bill | common | 5 | 6/2 | **7/2** | ✅ 9 |
| Cat Bullet Bill | rare | 3 | 3/1 | **4/1** | ✅ 5 |
| Cat Banzai Bill | rare | 5 | 5/3 | **6/3** | ✅ 9 |
| Tail Bullet Bill | common | 3 | 3/1 | **4/1** | ✅ 5 |
| Bomb Boo | rare | 3 | 3/1 | **4/1** | ✅ 5 |
| Bombomb Buddy | common | 3 | 4/1 | **5/1** | ✅ 6 |

(King Bob-omb **não** usa a keyword Bomb, apesar do nome: suas keywords
são Taunt + Quick, e ele já batia na curva 9/9.)

## Notas de design (desvios intencionais, não são bugs)

- **Cartas 0 de vida** (Luma, Blue Luma, Cheep Cheep) e **0 de ataque**
  (Whimp): batem na curva mesmo com um stat zerado — são "vanilla"
  extremos de 1 stat, arredondados para cima como o guia permite.
- **Nenhuma penalidade cumulativa quebrada**: cartas com 2 keywords
  (ex.: Melon Piranha Plant, Octoboo, Ghost Guy) somam as penalidades
  corretamente e batem na curva.
- **Bônus de raridade consistente**: todos os legends/boss usam +2 na
  curva base; nenhum foge desse padrão.
# Estrategia - Inteligencia de Ads da Metrik

## Objetivo
Criar uma camada de inteligencia por empresa e plataforma que transforme metricas historicas em recomendacoes explicaveis, gere rascunhos de anuncios e permita publicacao somente apos aprovacao humana.

## MVP
O MVP tera quatro modulos: painel de oportunidades, recomendador de janela ideal, gerador de briefing e copy, e fila de aprovacao e publicacao. O score combinara CTR, CPC, conversoes, CPA ou ROAS, volume minimo, fadiga do criativo, orcamento e horario.

## Fluxo
A empresa seleciona conta, plataforma, objetivo, periodo e orcamento. A Metrik consolida metricas por campanha, grupo ou conjunto, anuncio, publico, dispositivo, regiao e faixa horaria. O motor ranqueia oportunidades e gera sugestao com objetivo, publico, mensagem, CTA, variacoes, orcamento e janela de teste. O usuario revisa, edita, aprova ou rejeita.

## Governanca
Nenhuma publicacao sera automatica no MVP. Haver  permissoes separadas para visualizar, gerar, aprovar, publicar e pausar. O sistema aplicara limites de orcamento, validacao de politicas, idempotencia, confirmacao para acoes destrutivas, trilha de auditoria e pausa de emergencia.

## Criterios de aceite
O usuario ve as melhores janelas com justificativas, gera pelo menos tres variacoes, edita e aprova um rascunho, publica somente apos aprovacao explicita, consulta rejeicoes e falhas, e nao acessa dados de outra empresa.

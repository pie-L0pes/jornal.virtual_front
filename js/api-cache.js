
(() => {
    "use strict";

    const cache = new Map();
    const pendentes = new Map();

    const TEMPO_CACHE = 30000;

    async function buscarComCache(url, opcoes = {}) {
        const metodo = (
            opcoes.method || "GET"
        ).toUpperCase();

        if (metodo !== "GET") {
            return fetch(url, opcoes);
        }

        const autorizacao = new Headers(
            opcoes.headers || {}
        ).get("Authorization") || "";

        const chave = `${autorizacao}:${url}`;

        const salvo = cache.get(chave);

        if (
            salvo &&
            Date.now() - salvo.tempo < TEMPO_CACHE
        ) {
            return salvo.resposta.clone();
        }

        if (pendentes.has(chave)) {
            const resposta = await pendentes.get(chave);
            return resposta.clone();
        }

        const requisicao = fetch(url, opcoes)
            .then(async resposta => {
                if (resposta.ok) {
                    cache.set(chave, {
                        resposta: resposta.clone(),
                        tempo: Date.now()
                    });
                }

                return resposta;
            })
            .finally(() => {
                pendentes.delete(chave);
            });

        pendentes.set(chave, requisicao);

        const resposta = await requisicao;

        return resposta.clone();
    }

    function limparCacheAPI() {
        cache.clear();
        pendentes.clear();
    }

    window.buscarComCache = buscarComCache;
    window.limparCacheAPI = limparCacheAPI;
})();

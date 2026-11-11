
(() => {
    let modal;
    let conteudo;
    let idAberto = null;
    let publicacaoAtual = null;

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    const apiBase = () =>
        typeof API_URL !== "undefined"
            ? String(API_URL).replace(/\/$/, "")
            : "";

    const esc = valor =>
        String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[caractere]));

    const data = valor =>
        valor
            ? new Date(valor).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            })
            : "";

    const idUsuario = () => {
        try {
            const parte = token.split(".")[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            return Number(JSON.parse(atob(parte)).id);
        } catch {
            return null;
        }
    };

    const requisicao = async (rota, opcoes = {}) => {
        if (!apiBase()) {
            throw new Error("API_URL não está configurada.");
        }

        const resposta = await fetch(`${apiBase()}${rota}`, {
            ...opcoes,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(opcoes.body ? {
                    "Content-Type": "application/json"
                } : {}),
                ...(opcoes.headers || {})
            }
        });

        const json = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                json.mensagem ||
                json.erro ||
                `Erro ${resposta.status}`
            );
        }

        return json;
    };

    const foto = caminho => {
        if (!caminho) return "/img/avatar-padrao.png";

        if (/^(https?:|data:)/i.test(caminho)) {
            return caminho;
        }

        return `${apiBase()}/${String(caminho).replace(/^\/+/, "")}`;
    };

    const midias = publicacao =>
        (publicacao.midias || []).map(midia => {
            const caminho =
                midia.url ||
                midia.path ||
                midia.caminho ||
                midia.arquivo ||
                midia.nomeArquivo;

            if (!caminho) return "";

            const url = /^(https?:)/i.test(caminho)
                ? caminho
                : `${apiBase()}/${String(caminho).replace(/^\/+/, "")}`;

            const tipo = midia.mimeType || midia.tipo || "";

            if (tipo.startsWith("image/")) {
                return `
                    <img
                        class="detalhes-midia"
                        src="${esc(url)}"
                        alt="Imagem da publicação"
                    >
                `;
            }

            if (tipo.startsWith("video/")) {
                return `
                    <video
                        class="detalhes-midia"
                        controls
                        src="${esc(url)}"
                    ></video>
                `;
            }

            return `
                <a
                    href="${esc(url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Abrir anexo
                </a>
            `;
        }).join("");


    const respostas = (lista, nivel = 0) =>
        (lista || []).map(comentario => {
            const autor = comentario.autor || comentario.usuario || {};
            const nome = autor.nome || "Usuário";
            const quantidade = (comentario.respostas || []).length;
            const ehResposta = nivel > 0;

            return `
            <div
                class="detalhes-comentario ${ehResposta ? "resposta" : "item-comentario"}"
                data-comentario="${Number(comentario.id)}"
            >
                <div class="header-comentario">
                    <img
                        src="${esc(foto(autor.fotoPerfil))}"
                        alt=""
                        class="avatar-comentario"
                    >

                    <div class="conteudo-comentario">
                        <div class="detalhes-comentario-topo">
                            <strong class="nome-comentario">
                                ${esc(nome)}
                            </strong>

                            <span class="data-comentario">
                                ${esc(data(comentario.dataPublicacao))}
                            </span>
                        </div>

                        <p class="texto-comentario">${esc(comentario.texto)}</p>

                        ${!ehResposta ? `
                            <div class="acoes-comentario">
                                <button
                                    type="button"
                                    data-acao-detalhe="responder"
                                    data-id="${Number(comentario.id)}"
                                    data-nome="${esc(nome)}"
                                >
                                    Responder
                                </button>
                            </div>
                        ` : ""}

                        ${!ehResposta && quantidade > 0 ? `
                            <div class="grupo-respostas">
                                <button
                                    type="button"
                                    class="btn-ver-respostas"
                                    data-acao-detalhe="alternar-respostas"
                                    data-quantidade="${quantidade}"
                                    aria-expanded="false"
                                >
                                    <i class="fa-solid fa-chevron-down"></i>
                                    <span>
                                        Ver ${quantidade}
                                        ${quantidade === 1 ? "resposta" : "respostas"}
                                    </span>
                                </button>

                                <div
                                    class="respostas respostas-recolhidas"
                                    hidden
                                >
                                    ${respostas(comentario.respostas, nivel + 1)}
                                </div>
                            </div>
                        ` : ""}
                    </div>
                </div>
            </div>
        `;
        }).join("");

    const criarModal = () => {
        if (modal) return;

        modal = document.createElement("section");
        modal.id = "publicacaoDetalhes";
        modal.className = "publicacao-detalhes";
        modal.hidden = true;

        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", "Detalhes da publicação");

        modal.innerHTML = `
            <header class="detalhes-barra">
                <button type="button" id="voltarPublicacaoDetalhes">
                    <i class="fa-solid fa-arrow-left"></i>
                    Voltar
                </button>

                <strong>Publicação</strong>

                <button
                    type="button"
                    id="fecharPublicacaoDetalhes"
                    aria-label="Fechar"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </header>

            <div
                class="detalhes-conteudo"
                id="conteudoPublicacaoDetalhes"
            ></div>
        `;

        document.body.appendChild(modal);

        conteudo = modal.querySelector("#conteudoPublicacaoDetalhes");

        modal.querySelector("#voltarPublicacaoDetalhes")
            .addEventListener("click", fechar);

        modal.querySelector("#fecharPublicacaoDetalhes")
            .addEventListener("click", fechar);

        modal.addEventListener("click", interagir);
    };

    const carregar = async id => {
        const dados = await requisicao("/publicacoes/listar");

        const lista = Array.isArray(dados)
            ? dados
            : dados.publicacoes || [];

        const publicacao = lista.find(
            item => Number(item.id) === Number(id)
        );

        if (!publicacao) {
            throw new Error("Publicação não encontrada ou indisponível.");
        }

        try {
            const comentarios = await requisicao(
                `/comentarios/publicacao/${id}`
            );

            publicacao.comentarios = Array.isArray(comentarios)
                ? comentarios
                : comentarios.comentarios || publicacao.comentarios || [];
        } catch (erro) {
            console.warn("Não foi possível atualizar os comentários:", erro);
        }

        return publicacao;
    };

    const renderizar = publicacao => {
        publicacaoAtual = publicacao;

        const autor = publicacao.autor || publicacao.usuario || {};

        const curtiu = (publicacao.curtidas || []).some(
            curtida => Number(curtida.usuarioId) === idUsuario()
        );

        const totalComentarios = (publicacao.comentarios || []).length;

        conteudo.innerHTML = `
            <div class="detalhes-grade">
                <article class="detalhes-publicacao">
                    <div class="detalhes-autor">
                        <img
                            class="detalhes-avatar"
                            src="${esc(foto(autor.fotoPerfil))}"
                            alt=""
                        >

                        <div>
                            <strong>${esc(autor.nome || "Usuário")}</strong>
                            <time>${esc(data(publicacao.dataPublicacao))}</time>
                        </div>
                    </div>

                    <div class="detalhes-texto">
                        ${esc(publicacao.texto)}
                    </div>

                    <div class="detalhes-midias">
                        ${midias(publicacao)}
                    </div>

                    <div class="detalhes-acoes">
                        <button
                            type="button"
                            data-acao-detalhe="curtir"
                            class="${curtiu ? "curtido" : ""}"
                        >
                            <i class="${curtiu ? "fa-solid" : "fa-regular"} fa-heart"></i>
                            ${publicacao.curtidas?.length || 0} curtidas
                        </button>

                        <span>
                            <i class="fa-regular fa-comment"></i>
                            ${totalComentarios} comentários
                        </span>
                    </div>
                </article>

                <section class="detalhes-comentarios">
                    <div class="detalhes-comentarios-titulo">
                        <h2>Comentários</h2>
                        <span>${totalComentarios}</span>
                    </div>

                    <div class="detalhes-lista-comentarios">
                        ${totalComentarios
                ? respostas(publicacao.comentarios)
                : '<p class="detalhes-vazio">Ainda não há comentários.</p>'
            }
                    </div>

                    <form
                        id="formComentarioDetalhes"
                        class="detalhes-form"
                    >
                        <div
                            id="detalhesRespondendo"
                            hidden
                        ></div>

                        <textarea
                            id="textoComentarioDetalhes"
                            placeholder="Escreva um comentário..."
                            maxlength="1000"
                            required
                        ></textarea>

                        <div>
                            <button
                                type="button"
                                id="cancelarRespostaDetalhes"
                                hidden
                            >
                                Cancelar resposta
                            </button>

                            <button type="submit">
                                Publicar comentário
                                <i class="fa-solid fa-paper-plane"></i>
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        `;

        const form = modal.querySelector("#formComentarioDetalhes");

        form.addEventListener("submit", async evento => {
            evento.preventDefault();

            const campo = modal.querySelector("#textoComentarioDetalhes");
            const texto = campo.value.trim();

            if (!texto) return;

            const botao = form.querySelector('[type="submit"]');
            botao.disabled = true;

            try {
                await requisicao("/comentarios/cadastrar", {
                    method: "POST",
                    body: JSON.stringify({
                        publicacaoId: idAberto,
                        texto,
                        comentarioPaiId: form.dataset.resposta
                            ? Number(form.dataset.resposta)
                            : null
                    })
                });

                await atualizar();
                window.atualizarNotificacoes?.();
            } catch (erro) {
                alert(erro.message);
                botao.disabled = false;
            }
        });

        modal.querySelector("#cancelarRespostaDetalhes")
            .addEventListener("click", () => {
                delete form.dataset.resposta;

                const aviso = modal.querySelector("#detalhesRespondendo");
                aviso.hidden = true;
                aviso.textContent = "";

                modal.querySelector("#cancelarRespostaDetalhes").hidden = true;

                const campo = modal.querySelector("#textoComentarioDetalhes");
                campo.placeholder = "Escreva um comentário...";
            });
    };

    const atualizar = async () => {
        const publicacao = await carregar(idAberto);

        if (
            modal &&
            !modal.hidden &&
            Number(idAberto) === Number(publicacao.id)
        ) {
            renderizar(publicacao);
        }
    };

    const alternarRespostasDetalhes = botao => {
        const grupo = botao.closest(".grupo-respostas");
        const container = grupo?.querySelector(":scope > .respostas");

        if (!container) return;

        const abrir = container.hidden;

        container.hidden = !abrir;
        container.classList.toggle("respostas-recolhidas", !abrir);
        container.classList.toggle("respostas-abertas", abrir);

        botao.setAttribute("aria-expanded", String(abrir));

        const quantidade = Number(botao.dataset.quantidade);
        const texto = botao.querySelector("span");
        const icone = botao.querySelector("i");

        if (texto) {
            texto.textContent = abrir
                ? "Ocultar respostas"
                : `Ver ${quantidade} ${quantidade === 1 ? "resposta" : "respostas"}`;
        }

        if (icone) {
            icone.className = abrir
                ? "fa-solid fa-chevron-up"
                : "fa-solid fa-chevron-down";
        }
    };

    const interagir = async evento => {
        const botao = evento.target.closest("[data-acao-detalhe]");

        if (!botao) return;

        if (botao.dataset.acaoDetalhe === "alternar-respostas") {
            evento.preventDefault();
            alternarRespostasDetalhes(botao);
            return;
        }

        if (botao.dataset.acaoDetalhe === "responder") {
            const form = modal.querySelector("#formComentarioDetalhes");

            form.dataset.resposta = botao.dataset.id;

            const aviso = modal.querySelector("#detalhesRespondendo");
            aviso.hidden = false;
            aviso.textContent = `Respondendo a ${botao.dataset.nome}`;

            modal.querySelector("#cancelarRespostaDetalhes").hidden = false;

            const campo = modal.querySelector("#textoComentarioDetalhes");
            campo.placeholder = `Responder a ${botao.dataset.nome}...`;
            campo.focus();

            return;
        }

        if (botao.dataset.acaoDetalhe === "curtir") {
            botao.disabled = true;

            try {
                const curtiu = (publicacaoAtual.curtidas || []).some(
                    curtida => Number(curtida.usuarioId) === idUsuario()
                );

                await requisicao(
                    curtiu ? "/curtidas/descurtir" : "/curtidas/curtir",
                    {
                        method: curtiu ? "DELETE" : "POST",
                        body: JSON.stringify({
                            publicacaoId: idAberto
                        })
                    }
                );

                await atualizar();
                window.atualizarNotificacoes?.();
            } catch (erro) {
                alert(erro.message);
                botao.disabled = false;
            }
        }
    };

    async function abrir(id) {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) return;

        criarModal();

        idAberto = Number(id);
        modal.hidden = false;

        document.body.classList.add("detalhes-abertos");

        conteudo.innerHTML = `
            <div class="detalhes-carregando">
                Carregando publicação...
            </div>
        `;

        try {
            await atualizar();
        } catch (erro) {
            conteudo.innerHTML = `
                <div class="detalhes-carregando">
                    ${esc(erro.message)}
                </div>
            `;
        }
    }


    function fechar() {
        if (!modal) return;

        modal.hidden = true;
        document.body.classList.remove("detalhes-abertos");

        idAberto = null;
        publicacaoAtual = null;
    }

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape" && modal && !modal.hidden) {
            fechar();
        }
    });

    window.abrirPublicacaoNotificacao = abrir;
    window.fecharPublicacaoNotificacao = fechar;
})();

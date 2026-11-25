
(() => {
    "use strict";

    let modal = null;
    let conteudo = null;
    let idAberto = null;
    let publicacaoAtual = null;
    let requisicaoAtual = 0;

    const API = (
        typeof API_URL !== "undefined"
            ? String(API_URL)
            : "https://jornalvirtual-git-main-biaams-sys1.vercel.app"
    ).replace(/\/+$/, "");

    const FOTO_PADRAO = "/img/avatar-padrao.png";

    const token = () =>
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    const esc = valor =>
        String(valor ?? "").replace(
            /[&<>"']/g,
            caractere => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            }[caractere])
        );

    const data = valor => {
        if (!valor) return "";

        const resultado = new Date(valor);

        if (Number.isNaN(resultado.getTime())) {
            return "";
        }

        return resultado.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    };

    function obterUsuarioToken() {
        try {
            const jwt = token();

            if (!jwt) return null;

            const partes = jwt.split(".");

            if (partes.length !== 3) return null;

            const parte = partes[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const base64 = parte.padEnd(
                Math.ceil(parte.length / 4) * 4,
                "="
            );

            const texto = atob(base64);

            const usuario = JSON.parse(
                decodeURIComponent(
                    Array.from(texto)
                        .map(caractere =>
                            "%" +
                            caractere.charCodeAt(0)
                                .toString(16)
                                .padStart(2, "0")
                        )
                        .join("")
                )
            );

            if (
                typeof usuario.exp === "number" &&
                usuario.exp * 1000 <= Date.now()
            ) {
                return null;
            }

            return usuario;
        } catch {
            return null;
        }
    }

    const idUsuario = () => {
        const usuario = obterUsuarioToken();

        const id = Number(
            usuario?.id ??
            usuario?.usuarioId ??
            usuario?.userId
        );

        return Number.isInteger(id) && id > 0
            ? id
            : null;
    };

    async function requisicao(rota, opcoes = {}) {
        const jwt = token();

        if (!jwt || !obterUsuarioToken()) {
            throw new Error(
                "Sua sessão expirou. Faça login novamente."
            );
        }

        const headers = {
            Authorization: `Bearer ${jwt}`,
            ...(opcoes.body instanceof FormData
                ? {}
                : opcoes.body
                    ? { "Content-Type": "application/json" }
                    : {}),
            ...(opcoes.headers || {})
        };

        let resposta;

        try {
            resposta = await fetch(`${API}${rota}`, {
                ...opcoes,
                headers
            });
        } catch {
            throw new Error(
                "Não foi possível conectar ao servidor."
            );
        }

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            const erro = new Error(
                dados.mensagem ||
                dados.erro ||
                dados.error ||
                dados.message ||
                `Erro ${resposta.status}`
            );

            erro.status = resposta.status;

            throw erro;
        }

        return dados;
    }


    function caminhoArquivo(caminho, padrao = "") {
        if (!caminho) return padrao;

        let url = String(caminho).trim().replace(/\\/g, "/");

        if (!url) return padrao;

        if (/^(https?:\/\/|data:|blob:)/i.test(url)) {
            return url;
        }

        const supabaseUrl =
            "https://hepwnbumziimvfugvjbe.supabase.co";

        const caminhoLimpo = url
            .replace(/^\/+/, "")
            .replace(/^midias\//, "");

        if (
            caminhoLimpo.startsWith("perfil/") ||
            caminhoLimpo.startsWith("perfis/") ||
            caminhoLimpo.startsWith("usuarios/") ||
            caminhoLimpo.startsWith("template/") ||
            caminhoLimpo.startsWith("templates/") ||
            caminhoLimpo.startsWith("publicacoes/") ||
            caminhoLimpo.startsWith("noticias/")
        ) {
            return `${supabaseUrl}/storage/v1/object/public/midias/${caminhoLimpo}`;
        }

        return `${API}/${caminhoLimpo}`;
    }


    const foto = caminho =>
        caminhoArquivo(caminho, FOTO_PADRAO);

    function midias(publicacao) {
        const lista = Array.isArray(publicacao.midias)
            ? publicacao.midias
            : [];

        return lista.map(midia => {
            const caminho =
                midia.url ||
                midia.path ||
                midia.caminho ||
                midia.arquivo ||
                midia.nomeArquivo;

            if (!caminho) return "";

            const url = caminhoArquivo(caminho);

            const tipo = String(
                midia.mimeType ||
                midia.tipo ||
                ""
            ).toLowerCase();

            const extensao = String(url)
                .split("?")[0]
                .split(".")
                .pop()
                .toLowerCase();

            const imagem =
                tipo.startsWith("image/") ||
                [
                    "jpg",
                    "jpeg",
                    "png",
                    "gif",
                    "webp",
                    "svg",
                    "avif"
                ].includes(extensao);

            const video =
                tipo.startsWith("video/") ||
                [
                    "mp4",
                    "webm",
                    "ogg",
                    "mov"
                ].includes(extensao);

            if (imagem) {
                return `
                    <img
                        class="detalhes-midia"
                        src="${esc(url)}"
                        alt="Imagem da publicação"
                        loading="lazy"
                    >
                `;
            }

            if (video) {
                return `
                    <video
                        class="detalhes-midia"
                        controls
                        preload="metadata"
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
    }

    function contarComentarios(lista) {
        if (!Array.isArray(lista)) return 0;

        return lista.reduce((total, comentario) => {
            const respostas =
                comentario.respostas ||
                comentario.replies ||
                [];

            return total +
                1 +
                contarComentarios(respostas);
        }, 0);
    }

    function respostas(lista, nivel = 0) {
        if (!Array.isArray(lista)) return "";

        return lista.map(comentario => {
            const autor =
                comentario.autor ||
                comentario.usuario ||
                {};

            const nome = autor.nome || "Usuário";

            const filhos =
                comentario.respostas ||
                comentario.replies ||
                [];

            const quantidade = filhos.length;
            const ehResposta = nivel > 0;

            const comentarioId = Number(comentario.id);

            return `
                <div
                    class="detalhes-comentario ${ehResposta
                    ? "resposta"
                    : "item-comentario"
                }"
                    data-comentario="${comentarioId}"
                >
                    <div class="header-comentario">
                        <img
                            src="${esc(foto(autor.fotoPerfil))}"
                            alt=""
                            class="avatar-comentario"
                            onerror="this.onerror=null;this.src='${FOTO_PADRAO}'"
                        >

                        <div class="conteudo-comentario">
                            <div class="detalhes-comentario-topo">
                                <strong class="nome-comentario">
                                    ${esc(nome)}
                                </strong>

                                <span class="data-comentario">
                                    ${esc(data(
                    comentario.dataPublicacao ||
                    comentario.createdAt
                ))}
                                </span>
                            </div>

                            <p class="texto-comentario">${esc(
                    comentario.texto ||
                    comentario.conteudo ||
                    ""
                )}</p>

                            ${!ehResposta ? `
                                <div class="acoes-comentario">
                                    <button
                                        type="button"
                                        data-acao-detalhe="responder"
                                        data-id="${comentarioId}"
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
                                            ${quantidade === 1
                        ? "resposta"
                        : "respostas"
                    }
                                        </span>
                                    </button>

                                    <div
                                        class="respostas respostas-recolhidas"
                                        hidden
                                    >
                                        ${respostas(
                        filhos,
                        nivel + 1
                    )}
                                    </div>
                                </div>
                            ` : ""}
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    function criarModal() {
        if (modal) return;

        modal = document.createElement("section");

        modal.id = "publicacaoDetalhes";
        modal.className = "publicacao-detalhes";
        modal.hidden = true;

        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute(
            "aria-label",
            "Detalhes da publicação"
        );

        modal.innerHTML = `
            <header class="detalhes-barra">
                <button
                    type="button"
                    id="voltarPublicacaoDetalhes"
                >
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

        conteudo = modal.querySelector(
            "#conteudoPublicacaoDetalhes"
        );

        modal
            .querySelector("#voltarPublicacaoDetalhes")
            .addEventListener("click", fechar);

        modal
            .querySelector("#fecharPublicacaoDetalhes")
            .addEventListener("click", fechar);

        modal.addEventListener("click", interagir);
    }


    async function carregar(id) {
        const dados = await requisicao("/publicacoes/listar");

        const lista = Array.isArray(dados)
            ? dados
            : Array.isArray(dados.publicacoes)
                ? dados.publicacoes
                : Array.isArray(dados.lista)
                    ? dados.lista
                    : [];

        const encontrada = lista.find(
            item => Number(item.id) === Number(id)
        );

        if (!encontrada) {
            throw new Error(
                "Publicação não encontrada ou indisponível."
            );
        }

        const publicacao = { ...encontrada };

        try {
            const dadosComentarios = await requisicao(
                `/comentarios/publicacao/${id}`
            );

            publicacao.comentarios = Array.isArray(dadosComentarios)
                ? dadosComentarios
                : Array.isArray(dadosComentarios.comentarios)
                    ? dadosComentarios.comentarios
                    : publicacao.comentarios || [];
        } catch (erro) {
            console.warn(
                "Não foi possível atualizar os comentários:",
                erro
            );

            publicacao.comentarios = Array.isArray(publicacao.comentarios)
                ? publicacao.comentarios
                : [];
        }

        return publicacao;
    }

    function renderizar(publicacao) {
        publicacaoAtual = publicacao;

        const autor =
            publicacao.autor ||
            publicacao.usuario ||
            {};

        const listaCurtidas = Array.isArray(publicacao.curtidas)
            ? publicacao.curtidas
            : [];

        const curtiu = listaCurtidas.some(
            curtida =>
                Number(
                    curtida.usuarioId ??
                    curtida.usuario?.id
                ) === idUsuario()
        );

        const quantidadeCurtidas = Array.isArray(publicacao.curtidas)
            ? publicacao.curtidas.length
            : Number(
                publicacao.totalCurtidas ??
                publicacao._count?.curtidas ??
                0
            );

        const comentarios = Array.isArray(publicacao.comentarios)
            ? publicacao.comentarios
            : [];

        const totalComentarios = contarComentarios(comentarios);

        conteudo.innerHTML = `
            <div class="detalhes-grade">
                <article class="detalhes-publicacao">
                    <div class="detalhes-autor">
                        <img
                            class="detalhes-avatar"
                            src="${esc(foto(autor.fotoPerfil))}"
                            alt="Foto do autor"
                            onerror="this.onerror=null;this.src='${FOTO_PADRAO}'"
                        >

                        <div>
                            <strong>${esc(
            autor.nome || "Usuário"
        )}</strong>

                            <time>${esc(data(
            publicacao.dataPublicacao ||
            publicacao.createdAt
        ))}</time>
                        </div>
                    </div>

                    <div class="detalhes-texto">${esc(
            publicacao.texto ||
            publicacao.conteudo ||
            ""
        )}</div>

                    <div class="detalhes-midias">
                        ${midias(publicacao)}
                    </div>

                    <div class="detalhes-acoes">
                        <button
                            type="button"
                            data-acao-detalhe="curtir"
                            class="${curtiu ? "curtido" : ""}"
                            aria-pressed="${curtiu}"
                        >
                            <i class="${curtiu
                ? "fa-solid"
                : "fa-regular"
            } fa-heart"></i>

                            ${quantidadeCurtidas}
                            ${quantidadeCurtidas === 1
                ? "curtida"
                : "curtidas"
            }
                        </button>

                        <span>
                            <i class="fa-regular fa-comment"></i>

                            ${totalComentarios}
                            ${totalComentarios === 1
                ? "comentário"
                : "comentários"
            }
                        </span>
                    </div>
                </article>

                <section class="detalhes-comentarios">
                    <div class="detalhes-comentarios-titulo">
                        <h2>Comentários</h2>
                        <span>${totalComentarios}</span>
                    </div>

                    <div class="detalhes-lista-comentarios">
                        ${comentarios.length
                ? respostas(comentarios)
                : `<p class="detalhes-vazio">
                                    Ainda não há comentários.
                                </p>`
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

        const form = modal.querySelector(
            "#formComentarioDetalhes"
        );

        form.addEventListener("submit", async evento => {
            evento.preventDefault();

            const campo = form.querySelector(
                "#textoComentarioDetalhes"
            );

            const texto = campo.value.trim();

            if (!texto) return;

            const botao = form.querySelector(
                '[type="submit"]'
            );

            if (botao.disabled) return;

            const publicacaoId = idAberto;

            if (
                !Number.isInteger(publicacaoId) ||
                publicacaoId <= 0
            ) {
                return;
            }

            const comentarioPaiId = form.dataset.resposta
                ? Number(form.dataset.resposta)
                : null;

            botao.disabled = true;
            botao.textContent = "Publicando...";

            try {
                await requisicao(
                    "/comentarios/cadastrar",
                    {
                        method: "POST",
                        body: JSON.stringify({
                            publicacaoId,
                            texto,
                            comentarioPaiId
                        })
                    }
                );

                if (
                    idAberto === publicacaoId &&
                    modal &&
                    !modal.hidden
                ) {
                    await atualizar();
                }

                window.atualizarNotificacoes?.();
            } catch (erro) {
                console.error(
                    "Erro ao publicar comentário:",
                    erro
                );

                alert(
                    erro.message ||
                    "Não foi possível publicar o comentário."
                );

                if (form.isConnected) {
                    botao.disabled = false;
                    botao.textContent = "Publicar comentário";
                }
            }
        });

        const cancelarResposta = modal.querySelector(
            "#cancelarRespostaDetalhes"
        );

        cancelarResposta.addEventListener("click", () => {
            delete form.dataset.resposta;

            const aviso = modal.querySelector(
                "#detalhesRespondendo"
            );

            aviso.hidden = true;
            aviso.textContent = "";

            cancelarResposta.hidden = true;

            const campo = modal.querySelector(
                "#textoComentarioDetalhes"
            );

            campo.placeholder = "Escreva um comentário...";
        });
    }

    async function atualizar() {
        const id = idAberto;

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            return;
        }

        const numeroRequisicao = ++requisicaoAtual;

        const publicacao = await carregar(id);

        if (
            numeroRequisicao !== requisicaoAtual ||
            idAberto !== id ||
            !modal ||
            modal.hidden
        ) {
            return;
        }

        renderizar(publicacao);
    }

    function alternarRespostasDetalhes(botao) {
        const grupo = botao.closest(
            ".grupo-respostas"
        );

        const container = grupo?.querySelector(
            ":scope > .respostas"
        );

        if (!container) return;

        const abrir = container.hidden;

        container.hidden = !abrir;

        container.classList.toggle(
            "respostas-recolhidas",
            !abrir
        );

        container.classList.toggle(
            "respostas-abertas",
            abrir
        );

        botao.setAttribute(
            "aria-expanded",
            String(abrir)
        );

        const quantidade = Number(
            botao.dataset.quantidade
        );

        const texto = botao.querySelector("span");
        const icone = botao.querySelector("i");

        if (texto) {
            texto.textContent = abrir
                ? "Ocultar respostas"
                : `Ver ${quantidade} ${quantidade === 1
                    ? "resposta"
                    : "respostas"
                }`;
        }

        if (icone) {
            icone.className = abrir
                ? "fa-solid fa-chevron-up"
                : "fa-solid fa-chevron-down";
        }
    }


    async function interagir(evento) {
        const botao = evento.target.closest(
            "[data-acao-detalhe]"
        );

        if (!botao || !modal || modal.hidden) {
            return;
        }

        const acao = botao.dataset.acaoDetalhe;

        if (acao === "alternar-respostas") {
            evento.preventDefault();
            alternarRespostasDetalhes(botao);
            return;
        }

        if (acao === "responder") {
            evento.preventDefault();

            const form = modal.querySelector(
                "#formComentarioDetalhes"
            );

            if (!form) return;

            const comentarioId = Number(
                botao.dataset.id
            );

            if (
                !Number.isInteger(comentarioId) ||
                comentarioId <= 0
            ) {
                return;
            }

            const nome = botao.dataset.nome || "Usuário";

            form.dataset.resposta = String(
                comentarioId
            );

            const aviso = modal.querySelector(
                "#detalhesRespondendo"
            );

            if (aviso) {
                aviso.hidden = false;
                aviso.textContent = `Respondendo a ${nome}`;
            }

            const cancelar = modal.querySelector(
                "#cancelarRespostaDetalhes"
            );

            if (cancelar) {
                cancelar.hidden = false;
            }

            const campo = modal.querySelector(
                "#textoComentarioDetalhes"
            );

            if (campo) {
                campo.placeholder = `Responder a ${nome}...`;
                campo.focus();
            }

            return;
        }

        if (acao === "curtir") {
            evento.preventDefault();

            if (botao.disabled || !publicacaoAtual) {
                return;
            }

            const usuarioId = idUsuario();

            if (!usuarioId) {
                alert(
                    "Sua sessão expirou. Faça login novamente."
                );
                return;
            }

            const publicacaoId = idAberto;

            if (
                !Number.isInteger(publicacaoId) ||
                publicacaoId <= 0
            ) {
                return;
            }

            const curtidas = Array.isArray(
                publicacaoAtual.curtidas
            )
                ? publicacaoAtual.curtidas
                : [];

            const curtiu = curtidas.some(
                curtida =>
                    Number(
                        curtida.usuarioId ??
                        curtida.usuario?.id
                    ) === usuarioId
            );

            botao.disabled = true;

            try {
                await requisicao(
                    curtiu
                        ? "/curtidas/descurtir"
                        : "/curtidas/curtir",
                    {
                        method: curtiu
                            ? "DELETE"
                            : "POST",
                        body: JSON.stringify({
                            publicacaoId
                        })
                    }
                );

                if (
                    idAberto === publicacaoId &&
                    modal &&
                    !modal.hidden
                ) {
                    await atualizar();
                }

                if (
                    typeof window.atualizarNotificacoes === "function"
                ) {
                    window.atualizarNotificacoes();
                }

                if (
                    typeof window.atualizarFeed === "function"
                ) {
                    window.atualizarFeed();
                }
            } catch (erro) {
                console.error(
                    "Erro ao atualizar curtida:",
                    erro
                );

                alert(
                    erro.message ||
                    "Não foi possível atualizar a curtida."
                );
            } finally {
                if (botao.isConnected) {
                    botao.disabled = false;
                }
            }
        }
    }

    async function abrir(id) {
        const publicacaoId = Number(id);

        if (
            !Number.isInteger(publicacaoId) ||
            publicacaoId <= 0
        ) {
            return;
        }

        criarModal();

        idAberto = publicacaoId;
        publicacaoAtual = null;

        requisicaoAtual++;

        modal.hidden = false;

        document.body.classList.add(
            "detalhes-abertos"
        );

        conteudo.innerHTML = `
            <div class="detalhes-carregando">
                Carregando publicação...
            </div>
        `;

        try {
            await atualizar();
        } catch (erro) {
            if (
                idAberto !== publicacaoId ||
                !modal ||
                modal.hidden
            ) {
                return;
            }

            console.error(
                "Erro ao abrir publicação:",
                erro
            );

            conteudo.innerHTML = `
                <div class="detalhes-carregando">
                    ${esc(
                erro.message ||
                "Não foi possível carregar a publicação."
            )}
                </div>
            `;
        }
    }

    function fechar() {
        if (!modal) return;

        requisicaoAtual++;

        modal.hidden = true;

        document.body.classList.remove(
            "detalhes-abertos"
        );

        idAberto = null;
        publicacaoAtual = null;
    }

    document.addEventListener(
        "keydown",
        evento => {
            if (
                evento.key === "Escape" &&
                modal &&
                !modal.hidden
            ) {
                fechar();
            }
        }
    );

    function abrirPublicacaoPelaURL() {
        const parametros = new URLSearchParams(
            window.location.search
        );

        const publicacaoId = Number(
            parametros.get("publicacao")
        );

        if (
            !Number.isInteger(publicacaoId) ||
            publicacaoId <= 0
        ) {
            return;
        }

        abrir(publicacaoId);
    }

    window.abrirPublicacaoNotificacao = abrir;
    window.fecharPublicacaoNotificacao = fechar;

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            abrirPublicacaoPelaURL,
            { once: true }
        );
    } else {
        abrirPublicacaoPelaURL();
    }
})();


(() => {
    "use strict";

    const base = typeof API_URL !== "undefined" ? API_URL : "";
    const area = document.getElementById("areaPerfil");

    if (!area) return;

    const avatar = "/img/avatar-padrao.png";
    const bannerDefault = "/img/template-padrao.png";

    const state = {
        id: null,
        usuario: null,
        publicacoes: [],
        comentarios: [],
        curtidas: [],
        aba: "publicacoes",
        curtidasPrivadas: false,
        erroCurtidas: false,
        carregando: false
    };

    const token = () =>
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");

    function payload() {
        try {
            const parte = token()
                .split(".")[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const base64 = parte.padEnd(
                Math.ceil(parte.length / 4) * 4,
                "="
            );

            return JSON.parse(
                decodeURIComponent(
                    Array.from(atob(base64), c =>
                        "%" + c.charCodeAt(0)
                            .toString(16)
                            .padStart(2, "0")
                    ).join("")
                )
            );
        } catch {
            return {};
        }
    }

    function own() {
        const usuario = payload();
        const id = usuario.id ?? usuario.usuarioId ?? usuario.userId;

        return Boolean(
            id && Number(state.id) === Number(id)
        );
    }

    function escapeHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));
    }

    function imagePath(caminho, fallback) {
        if (!caminho) return fallback;

        if (/^(https?:\/\/|data:|blob:)/i.test(caminho)) {
            return caminho;
        }

        return `${base.replace(/\/+$/, "")}/${String(caminho).replace(/^\/+/, "")}`;
    }

    function get(id) {
        return area.querySelector(`#${id}`);
    }

    async function request(path, options = {}) {
        const headers = {
            Authorization: `Bearer ${token()}`,
            ...(options.body instanceof FormData
                ? {}
                : { "Content-Type": "application/json" }),
            ...(options.headers || {})
        };

        const resposta = await fetch(`${base}${path}`, {
            ...options,
            headers
        });

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            const erro = new Error(
                dados.mensagem ||
                dados.erro ||
                dados.message ||
                `Erro ${resposta.status}`
            );

            erro.status = resposta.status;
            throw erro;
        }

        return dados;
    }

    function obterLista(dados, campos = []) {
        if (Array.isArray(dados)) return dados;

        for (const campo of campos) {
            if (Array.isArray(dados?.[campo])) {
                return dados[campo];
            }
        }

        return [];
    }

    function uid(item) {
        return Number(
            item?.usuarioId ??
            item?.autor?.id ??
            item?.usuario?.id ??
            item?.autorId
        );
    }

    function obterComentarios(publicacao) {
        return Array.isArray(publicacao.comentarios)
            ? publicacao.comentarios
            : [];
    }

    function achatarComentarios(comentarios, publicacao, resultado = []) {
        for (const comentario of comentarios) {
            resultado.push({
                ...comentario,
                publicacaoId: publicacao.id
            });

            const respostas = comentario.respostas || comentario.replies || [];

            if (Array.isArray(respostas)) {
                achatarComentarios(respostas, publicacao, resultado);
            }
        }

        return resultado;
    }

    function normalizarCurtida(item) {
        if (!item || typeof item !== "object") return null;

        if (item.publicacao) return item.publicacao;
        if (item.postagem) return item.postagem;

        if (
            item.id !== undefined &&
            (item.texto !== undefined || item.autor || item.usuario)
        ) {
            return item;
        }

        return null;
    }

    function formatarData(data) {
        if (!data) return "";

        const valor = new Date(data);

        if (Number.isNaN(valor.getTime())) return "";

        return valor.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function role(tipo) {
        return {
            USUARIO: "Usuário",
            VERIFICADO: "Verificado",
            ADMINISTRADOR: "Administrador"
        }[tipo] || tipo || "Usuário";
    }

    function markup() {
        return `
            <div class="perfil-integrado-voltar">
                <button type="button" id="voltarFeedPerfil">
                    <i class="fa-solid fa-arrow-left"></i>
                    Voltar ao feed
                </button>
            </div>

            <main class="pagina-perfil">
                <section class="perfil">
                    <div class="topo">
                        <img id="banner" src="${bannerDefault}" alt="Banner">
                    </div>

                    <img id="foto" class="foto" src="${avatar}" alt="Foto do perfil">

                    <div class="conteudo">
                        <h1 class="nome" id="nome">Carregando...</h1>

                        <p class="info">
                            <strong>REDE:</strong>
                            <span id="rede"></span>
                        </p>

                        <p class="descricao" id="descricao"></p>

                        <div class="categoria" id="categoria"></div>

                        <div class="estatisticas">
                            <div class="card" data-atividade="publicacoes" role="button" tabindex="0">
                                <h2 id="totalPublicacoes">0</h2>
                                <span>Publicações</span>
                            </div>

                            <div class="card" data-atividade="comentarios" role="button" tabindex="0">
                                <h2 id="totalComentarios">0</h2>
                                <span>Comentários</span>
                            </div>

                            <div class="card" data-atividade="curtidas" role="button" tabindex="0">
                                <h2 id="totalCurtidas">0</h2>
                                <span>Curtidas</span>
                            </div>
                        </div>

                        <button id="btnEditarPerfil" type="button" hidden>
                            Editar Perfil
                        </button>
                    </div>
                </section>

                <section class="painel-atividades-perfil">
                    <div class="abas-atividades-perfil">
                        <button type="button" class="aba-atividade ativa" data-atividade="publicacoes">
                            Publicações
                        </button>

                        <button type="button" class="aba-atividade" data-atividade="comentarios">
                            Comentários
                        </button>

                        <button type="button" class="aba-atividade" data-atividade="curtidas">
                            Curtidas
                        </button>
                    </div>

                    <div id="atividadesPerfil"></div>
                </section>
            </main>

            <div class="modal-fundo" id="modalFundo">
                <div class="modal">
                    <button class="fechar-modal" id="fecharModalPerfil" type="button">
                        ×
                    </button>

                    <h2>Editar Perfil</h2>

                    <div class="imagens-modal">
                        <div class="imagem-modal">
                            <label>Foto de Perfil</label>

                            <div class="preview-foto">
                                <img id="previewFoto" src="${avatar}" alt="Prévia da foto">
                            </div>

                            <label class="botao-imagem">
                                Escolher imagem
                                <input type="file" id="inputFoto" accept="image/*" hidden>
                            </label>
                        </div>

                        <div class="imagem-modal banner-modal">
                            <label>Foto de Banner</label>

                            <div class="preview-banner">
                                <img id="previewBanner" src="${bannerDefault}" alt="Prévia do banner">
                            </div>

                            <label class="botao-imagem">
                                Escolher imagem
                                <input type="file" id="inputBanner" accept="image/*" hidden>
                            </label>
                        </div>
                    </div>

                    <div class="campo-modal">
                        <label for="inputNome">Nome</label>
                        <input id="inputNome" type="text" disabled>
                    </div>

                    <div class="campo-modal">
                        <label for="inputDescricao">Descrição</label>
                        <textarea id="inputDescricao"></textarea>
                    </div>

                    <div class="campo-modal campo-privacidade">
                        <label for="mostrarCurtidas">
                            <input type="checkbox" id="mostrarCurtidas">
                            Mostrar minhas curtidas no perfil
                        </label>
                    </div>

                    <div class="botoes-modal">
                        <button type="button" class="botao-salvar" id="salvarPerfilIntegrado">
                            Salvar Alterações
                        </button>

                        <button type="button" class="botao-cancelar" id="cancelarModalPerfil">
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function aplicarEstilos() {
        if (document.getElementById("estilosPerfilIntegrado")) return;

        const estilo = document.createElement("style");
        estilo.id = "estilosPerfilIntegrado";

        estilo.textContent = `
            #areaPerfil .pagina-perfil {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 25px;
                width: 100%;
                padding: 25px 20px 60px;
                box-sizing: border-box;
            }

            #areaPerfil .pagina-perfil > .perfil,
            #areaPerfil .pagina-perfil > .painel-atividades-perfil {
                width: 100%;
                max-width: 790px;
                box-sizing: border-box;
            }

            #areaPerfil .perfil,
            #areaPerfil .painel-atividades-perfil {
                background: rgba(253, 253, 253, .758);
                border-radius: 25px;
                box-shadow:
                    0 30px 60px rgba(0, 0, 0, .18),
                    0 10px 20px rgba(0, 0, 0, .08);
            }

            #areaPerfil .perfil {
                position: relative;
                overflow: hidden;
                margin: 0 auto;
            }

            #areaPerfil .painel-atividades-perfil {
                display: flex;
                flex-direction: column;
                height: 500px;
                margin: 0 auto;
                padding: 20px;
                overflow: hidden;
            }

            #areaPerfil .abas-atividades-perfil {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 30px;
                flex-shrink: 0;
                margin-bottom: 20px;
                border-bottom: 1px solid var(--border);
            }

            #areaPerfil .aba-atividade {
                padding: 13px 15px;
                background: transparent;
                border: none;
                border-bottom: 2px solid transparent;
                color: var(--text);
                font-family: inherit;
                font-size: 14px;
                cursor: pointer;
                transition: .2s;
            }

            #areaPerfil .aba-atividade:hover {
                color: var(--primary);
            }

            #areaPerfil .aba-atividade.ativa {
                color: var(--primary);
                border-bottom-color: var(--primary);
                font-weight: 700;
            }

            #areaPerfil #atividadesPerfil {
                display: flex;
                flex-direction: column;
                flex: 1;
                min-height: 0;
                gap: 12px;
                overflow-y: auto;
                padding-right: 8px;
                scrollbar-width: thin;
                scrollbar-color: var(--primary) transparent;
            }

            #areaPerfil .perfil-publicacao {
                padding: 18px;
                background: #ffffff;
                border: 1px solid var(--border);
                border-radius: 14px;
                color: var(--text);
                box-shadow: 0 4px 12px rgba(0, 0, 0, .04);
            }

            #areaPerfil .perfil-publicacao-cabecalho {
                display: flex;
                align-items: center;
                gap: 11px;
            }

            #areaPerfil .perfil-publicacao-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
                flex-shrink: 0;
            }

            #areaPerfil .perfil-publicacao-autor {
                display: flex;
                flex-direction: column;
                gap: 3px;
            }

            #areaPerfil .perfil-publicacao-autor strong {
                font-size: 13px;
                color: var(--text);
            }

            #areaPerfil .perfil-publicacao-autor span {
                font-size: 11px;
                color: var(--textLight);
            }

            #areaPerfil .perfil-publicacao-texto {
                margin: 15px 0;
                font-size: 13px;
                line-height: 1.6;
                white-space: pre-wrap;
                overflow-wrap: anywhere;
            }

            #areaPerfil .perfil-publicacao-acoes {
                display: flex;
                align-items: center;
                gap: 20px;
                font-size: 12px;
                color: var(--textLight);
            }

            #areaPerfil .perfil-publicacao-acoes span {
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            #areaPerfil .perfil-publicacao-link {
                margin-left: auto;
                padding: 0;
                background: transparent;
                border: none;
                color: var(--primary);
                font-family: inherit;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
            }

            #areaPerfil .perfil-publicacao-link:hover {
                text-decoration: underline;
            }

            #areaPerfil .perfil-atividades-vazio {
                padding: 25px;
                text-align: center;
                color: var(--textLight);
                font-size: 13px;
            }

            #areaPerfil .perfil-integrado-voltar {
                display: flex;
                justify-content: center;
                padding: 25px 20px 0;
            }

            #areaPerfil #voltarFeedPerfil {
                border: none;
                border-radius: 12px;
                padding: 12px 20px;
                background: var(--surface);
                color: var(--primary);
                font-family: inherit;
                font-weight: 600;
                cursor: pointer;
            }

            #areaPerfil #voltarFeedPerfil:hover {
                background: var(--secondaryLight);
            }

            #areaPerfil #btnEditarPerfil[hidden] {
                display: none;
            }

            @media (max-width: 650px) {
                #areaPerfil .pagina-perfil {
                    padding: 20px 15px 40px;
                    gap: 20px;
                }

                #areaPerfil .painel-atividades-perfil {
                    height: 480px;
                    padding: 15px;
                }

                #areaPerfil .abas-atividades-perfil {
                    gap: 0;
                    justify-content: space-between;
                }

                #areaPerfil .aba-atividade {
                    padding: 12px 8px;
                    font-size: 12px;
                }
            }
        `;

        document.head.appendChild(estilo);
    }

    function renderStats() {
        get("totalPublicacoes").textContent = state.publicacoes.filter(
            p => uid(p) === state.id
        ).length;

        get("totalComentarios").textContent = state.comentarios.length;

        get("totalCurtidas").textContent = state.curtidasPrivadas ||
            state.erroCurtidas
                ? "—"
                : state.curtidas.length;
    }

    function mensagem(texto) {
        get("atividadesPerfil").innerHTML = `
            <p class="perfil-atividades-vazio">
                ${escapeHTML(texto)}
            </p>
        `;
    }

    function cabecalho(publicacao) {
        const autor = publicacao.autor || publicacao.usuario || {};

        return `
            <div class="perfil-publicacao-cabecalho">
                <img
                    class="perfil-publicacao-avatar"
                    src="${escapeHTML(imagePath(autor.fotoPerfil, avatar))}"
                    alt="Foto do autor"
                    onerror="this.onerror=null;this.src='${avatar}'"
                >

                <div class="perfil-publicacao-autor">
                    <strong>${escapeHTML(autor.nome || "Usuário")}</strong>
                    <span>${escapeHTML(formatarData(publicacao.dataPublicacao))}</span>
                </div>
            </div>
        `;
    }

    function botaoPublicacao(id, comentarioId = null) {
        if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
            return "";
        }

        return `
            <button
                type="button"
                class="perfil-publicacao-link"
                data-post="${Number(id)}"
                ${comentarioId ? `data-comment="${Number(comentarioId)}"` : ""}
            >
                Ver publicação
            </button>
        `;
    }

    function renderPublicacoes() {
        const lista = state.publicacoes.filter(
            p => uid(p) === state.id
        );

        if (!lista.length) {
            mensagem("Este usuário ainda não fez nenhuma publicação.");
            return;
        }

        get("atividadesPerfil").innerHTML = lista.map(publicacao => `
            <article class="perfil-publicacao">
                ${cabecalho(publicacao)}

                <div class="perfil-publicacao-texto">${escapeHTML(
                    publicacao.texto || publicacao.conteudo || ""
                )}</div>

                <div class="perfil-publicacao-acoes">
                    <span>
                        <i class="fa-solid fa-heart"></i>
                        ${Array.isArray(publicacao.curtidas) ? publicacao.curtidas.length : 0}
                    </span>

                    <span>
                        <i class="fa-regular fa-comment"></i>
                        ${obterComentarios(publicacao).length}
                    </span>

                    ${botaoPublicacao(publicacao.id)}
                </div>
            </article>
        `).join("");
    }

    function renderComentarios() {
        if (!state.comentarios.length) {
            mensagem("Este usuário ainda não fez comentários.");
            return;
        }

        get("atividadesPerfil").innerHTML = state.comentarios.map(comentario => `
            <article class="perfil-publicacao">
                <div class="perfil-publicacao-cabecalho">
                    <img
                        class="perfil-publicacao-avatar"
                        src="${escapeHTML(get("foto").src)}"
                        alt="Foto do usuário"
                    >

                    <div class="perfil-publicacao-autor">
                        <strong>${escapeHTML(state.usuario.nome)}</strong>
                        <span>${escapeHTML(formatarData(comentario.dataPublicacao))}</span>
                    </div>
                </div>

                <div class="perfil-publicacao-texto">${escapeHTML(
                    comentario.texto || comentario.conteudo || ""
                )}</div>

                <div class="perfil-publicacao-acoes">
                    ${botaoPublicacao(comentario.publicacaoId, comentario.id)}
                </div>
            </article>
        `).join("");
    }

    function renderCurtidas() {
        if (state.curtidasPrivadas) {
            mensagem("Este usuário optou por manter suas curtidas privadas.");
            return;
        }

        if (state.erroCurtidas) {
            mensagem("Não foi possível carregar as curtidas.");
            return;
        }

        if (!state.curtidas.length) {
            mensagem("Nenhuma publicação curtida.");
            return;
        }

        get("atividadesPerfil").innerHTML = state.curtidas.map(publicacao => `
            <article class="perfil-publicacao">
                ${cabecalho(publicacao)}

                <div class="perfil-publicacao-texto">${escapeHTML(
                    publicacao.texto || publicacao.conteudo || ""
                )}</div>

                <div class="perfil-publicacao-acoes">
                    <span>
                        <i class="fa-solid fa-heart"></i>
                        Curtido
                    </span>

                    ${botaoPublicacao(publicacao.id)}
                </div>
            </article>
        `).join("");
    }

    function renderActivity() {
        if (state.carregando) {
            mensagem("Carregando atividades...");
            return;
        }

        if (state.aba === "publicacoes") {
            renderPublicacoes();
        } else if (state.aba === "comentarios") {
            renderComentarios();
        } else {
            renderCurtidas();
        }
    }

    function selecionarAba(tipo) {
        if (!["publicacoes", "comentarios", "curtidas"].includes(tipo)) {
            return;
        }

        state.aba = tipo;

        area.querySelectorAll(".aba-atividade").forEach(aba => {
            aba.classList.toggle(
                "ativa",
                aba.dataset.atividade === tipo
            );
        });

        const painel = get("atividadesPerfil");
        painel.scrollTop = 0;

        renderActivity();
    }

    async function load(id) {
        state.id = Number(id);
        state.usuario = null;
        state.publicacoes = [];
        state.comentarios = [];
        state.curtidas = [];
        state.curtidasPrivadas = false;
        state.erroCurtidas = false;
        state.carregando = true;

        get("nome").textContent = "Carregando...";
        get("btnEditarPerfil").hidden = true;
        get("totalPublicacoes").textContent = "0";
        get("totalComentarios").textContent = "0";
        get("totalCurtidas").textContent = "0";

        selecionarAba("publicacoes");

        try {
            state.usuario = await request(
                `/usuarios/buscar/${state.id}`
            );

            const usuario = state.usuario;

            get("nome").textContent = usuario.nome || "Usuário";

            get("rede").textContent =
                usuario.empresa?.nome || "Não informado";

            get("descricao").textContent =
                usuario.bio ||
                "Este usuário ainda não adicionou uma descrição.";

            get("categoria").textContent = role(usuario.tipo);

            get("foto").src = imagePath(
                usuario.fotoPerfil,
                avatar
            );

            get("banner").src = imagePath(
                usuario.template,
                bannerDefault
            );

            get("foto").onerror = () => {
                get("foto").onerror = null;
                get("foto").src = avatar;
            };

            get("banner").onerror = () => {
                get("banner").onerror = null;
                get("banner").src = bannerDefault;
            };

            get("btnEditarPerfil").hidden = !own();

            const dados = await request("/publicacoes/listar");

            state.publicacoes = obterLista(dados, [
                "publicacoes",
                "lista"
            ]);

            state.comentarios = state.publicacoes.flatMap(publicacao =>
                achatarComentarios(
                    obterComentarios(publicacao),
                    publicacao
                )
            ).filter(comentario =>
                uid(comentario) === state.id
            );

            if (!own() && usuario.mostrarCurtidas !== true) {
                state.curtidasPrivadas = true;
            } else {
                try {
                    const dadosCurtidas = await request(
                        `/usuarios/${state.id}/curtidas`
                    );

                    state.curtidas = obterLista(dadosCurtidas, [
                        "curtidas",
                        "publicacoes",
                        "lista"
                    ])
                        .map(normalizarCurtida)
                        .filter(Boolean);

                } catch (erro) {
                    if (erro.status === 403) {
                        state.curtidasPrivadas = true;
                    } else {
                        state.erroCurtidas = true;
                        console.error("Erro ao carregar curtidas:", erro);
                    }
                }
            }

            renderStats();

        } finally {
            state.carregando = false;
            renderActivity();
        }
    }

   
function goPost(id) {
    const postId = Number(id);

    if (!Number.isInteger(postId) || postId <= 0) return;

    window.voltarAoFeed?.();

    requestAnimationFrame(() => {
        const publicacao = [...document.querySelectorAll("#areaFeed [data-post-id]")]
            .find(post => Number(post.dataset.postId) === postId);

        if (!publicacao) {
            console.warn("Publicação não encontrada:", postId);
            return;
        }

        document.querySelectorAll("#areaFeed .perfil-destaque").forEach(elemento => {
            elemento.classList.remove("perfil-destaque");
        });

        publicacao.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

        publicacao.classList.add("perfil-destaque");

        setTimeout(() => {
            publicacao.classList.remove("perfil-destaque");
        }, 3500);
    });
}

    function openModal() {
        if (!own() || !state.usuario) return;

        get("inputNome").value = state.usuario.nome || "";
        get("inputDescricao").value = state.usuario.bio || "";
        get("mostrarCurtidas").checked =
            state.usuario.mostrarCurtidas === true;

        get("previewFoto").src = get("foto").src;
        get("previewBanner").src = get("banner").src;

        get("inputFoto").value = "";
        get("inputBanner").value = "";

        get("modalFundo").style.display = "flex";
    }

    function closeModal() {
        get("modalFundo").style.display = "none";
    }

    async function upload(path, arquivo, method) {
        const formData = new FormData();
        formData.append("arquivo", arquivo);

        return request(path, {
            method,
            body: formData
        });
    }

    async function save() {
        if (!own() || !state.usuario) return;

        const botao = get("salvarPerfilIntegrado");
        botao.disabled = true;
        botao.textContent = "Salvando...";

        try {
            const bio = get("inputDescricao").value.trim();
            const privacidade = get("mostrarCurtidas").checked;

            const fotoNova = get("inputFoto").files[0];
            const bannerNovo = get("inputBanner").files[0];

            let alterou = false;

            if (bio !== (state.usuario.bio || "")) {
                await request(
                    `/usuarios/atualizar/${state.id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify({ bio })
                    }
                );

                alterou = true;
            }

            if (privacidade !== (state.usuario.mostrarCurtidas === true)) {
                await request("/usuarios/privacidade", {
                    method: "PUT",
                    body: JSON.stringify({
                        mostrarCurtidas: privacidade
                    })
                });

                alterou = true;
            }

            if (fotoNova) {
                await upload(
                    "/usuarios/foto-perfil",
                    fotoNova,
                    "POST"
                );

                alterou = true;
            }

            if (bannerNovo) {
                await upload(
                    `/usuarios/template/${state.id}`,
                    bannerNovo,
                    "PUT"
                );

                alterou = true;
            }

            if (!alterou) {
                alert("Nenhuma alteração foi realizada.");
                return;
            }

            closeModal();
            await load(state.id);

            alert("Perfil atualizado com sucesso!");

        } catch (erro) {
            console.error("Erro ao salvar perfil:", erro);
            alert(erro.message || "Erro ao atualizar perfil.");
        } finally {
            botao.disabled = false;
            botao.textContent = "Salvar Alterações";
        }
    }

    function bind() {
        get("voltarFeedPerfil").addEventListener("click", () => {
            window.voltarAoFeed?.();
        });

        get("btnEditarPerfil").addEventListener(
            "click",
            openModal
        );

        get("fecharModalPerfil").addEventListener(
            "click",
            closeModal
        );

        get("cancelarModalPerfil").addEventListener(
            "click",
            closeModal
        );

        get("salvarPerfilIntegrado").addEventListener(
            "click",
            save
        );

        get("modalFundo").addEventListener("click", evento => {
            if (evento.target === get("modalFundo")) {
                closeModal();
            }
        });

        for (const [input, preview] of [
            ["inputFoto", "previewFoto"],
            ["inputBanner", "previewBanner"]
        ]) {
            get(input).addEventListener("change", evento => {
                const arquivo = evento.target.files[0];

                if (!arquivo) return;

                const leitor = new FileReader();

                leitor.onload = () => {
                    get(preview).src = leitor.result;
                };

                leitor.readAsDataURL(arquivo);
            });
        }

        area.querySelectorAll("[data-atividade]").forEach(elemento => {
            const executar = () => {
                selecionarAba(elemento.dataset.atividade);
            };

            elemento.addEventListener("click", executar);

            if (elemento.getAttribute("role") === "button") {
                elemento.addEventListener("keydown", evento => {
                    if (evento.key === "Enter" || evento.key === " ") {
                        evento.preventDefault();
                        executar();
                    }
                });
            }
        });

        get("atividadesPerfil").addEventListener("click", evento => {
            const botao = evento.target.closest("[data-post]");

            if (!botao) return;

            goPost(
                botao.dataset.post,
                botao.dataset.comment
            );
        });
    }

    async function open(id) {
        const usuarioId = Number(id);

        if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
            return;
        }

        if (!area.dataset.initialized) {
            area.innerHTML = markup();
            area.dataset.initialized = "true";

            bind();
        }

        window.mostrarAreaPerfil?.();

        try {
            await load(usuarioId);
        } catch (erro) {
            console.error("Erro ao abrir perfil:", erro);
            alert(erro.message || "Erro ao abrir perfil.");
            window.voltarAoFeed?.();
        }
    }

    window.abrirPerfilIntegrado = open;
})();

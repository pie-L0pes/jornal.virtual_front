const token = localStorage.getItem("token") || sessionStorage.getItem("token");

const btnPublicar = document.getElementById("publicar");
const texto = document.getElementById("texto");
const inputArquivo = document.getElementById("anexo");
const previewAnexo = document.getElementById("preview-anexo");
const listaPublicacoes = document.getElementById("listaPublicacoes");
const pesquisa = document.getElementById("pesquisaPublicacoes");
const btnFiltros = document.getElementById("btnFiltros");
const filtrosPesquisa = document.getElementById("filtrosPesquisa");
const modalHashtags = document.getElementById("modalHashtags");
const listaHashtags = document.getElementById("listaHashtags");
const btnVerTudo = document.getElementById("btnVerTudo");
const fecharModalHashtags = document.getElementById("fecharModalHashtags");
const modalDenuncia = document.getElementById("modalDenuncia");
const fecharModalDenuncia = document.getElementById("fecharModalDenuncia");
const cancelarDenuncia = document.getElementById("cancelarDenuncia");
const confirmarDenuncia = document.getElementById("confirmarDenuncia");
const tipoDenuncia = document.getElementById("tipoDenuncia");
const idDenuncia = document.getElementById("idDenuncia");
const motivoDenuncia = document.getElementById("motivoDenuncia");

let publicacoes = [];
let filtroAtual = "recentes";
let termoPesquisa = "";


let hashtagSelecionada = null;

const filtroHashtagAtivo = document.getElementById("filtroHashtagAtivo");
const nomeHashtagAtiva = document.getElementById("nomeHashtagAtiva");
const limparFiltroHashtag = document.getElementById("limparFiltroHashtag");

window.mostrarAreaPerfil = mostrarAreaPerfil;
window.voltarAoFeed = voltarAoFeed;

const hashtagRegex = /#[a-zA-ZÀ-ÿ0-9_]+/g;

async function api(url, options = {}) {
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    if (options.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    const resposta = await fetch(`${API_URL}${url}`, {
        ...options,
        headers
    });

    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            dados.mensagem ||
            dados.erro ||
            "Erro ao realizar operação."
        );
    }

    return dados;
}

function obterUsuarioToken() {
    if (!token) return null;

    try {
        const partes = token.split(".");
        if (partes.length !== 3) return null;

        const payload = partes[1].replace(/-/g, "+").replace(/\_/g, "/");
        const json = decodeURIComponent(
            atob(payload)
                .split("")
                .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        );

        return JSON.parse(json);
    } catch (erro) {
        console.warn("Não foi possível ler o token.", erro);
        return null;
    }
}


const usuarioAtual = obterUsuarioToken();

function getIdUsuarioAtual() {
    if (!usuarioAtual) return null;

    return Number(
        usuarioAtual.id ||
        usuarioAtual.usuarioId ||
        usuarioAtual.userId
    );
}

function getTipoUsuarioAtual() {
    if (!usuarioAtual) return null;

    return (
        usuarioAtual.tipo ||
        usuarioAtual.tipoUsuario ||
        usuarioAtual.role
    );
}

function ehAdministrador() {
    return getTipoUsuarioAtual() === "ADMINISTRADOR";
}

function podeExcluirPublicacao(publicacao) {
    const usuarioId = getIdUsuarioAtual();

    return (
        ehAdministrador() ||
        Number(publicacao.usuarioId) === usuarioId
    );
}

function podeExcluirComentario(comentario, publicacao) {
    const usuarioId = getIdUsuarioAtual();

    return (
        ehAdministrador() ||
        Number(comentario.usuarioId) === usuarioId ||
        Number(publicacao.usuarioId) === usuarioId
    );
}

function escaparHtml(valor) {
    if (valor === null || valor === undefined) return "";

    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/\</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function linkPerfil(usuario, nome) {
    const id = Number(usuario?.id ?? usuario?.usuarioId);

    if (!Number.isInteger(id) || id <= 0) {
        return `<span>${escaparHtml(nome)}</span>`;
    }

    return `<a href="/html/perfil.html?id=${id}" class="link-perfil" data-perfil-id="${id}">${escaparHtml(nome)}</a>`;
}

function fotoComLinkPerfil(usuario, foto, classe = "avatar-post") {
    const id = Number(usuario?.id ?? usuario?.usuarioId);
    const imagem = obterFotoPerfil(foto);

    if (!Number.isInteger(id) || id <= 0) {
        return `<img src="${escaparHtml(imagem)}" class="${classe}" alt="Foto de perfil">`;
    }

    return `
        <a href="/html/perfil.html?id=${id}"
           class="link-foto-perfil"
           data-perfil-id="${id}"
           aria-label="Abrir perfil do usuário">
            <img src="${escaparHtml(imagem)}"
                 class="${classe}"
                 alt="Foto de perfil">
        </a>
    `;
}

function obterFotoPerfil(caminho) {
    const fotoPadrao = "/img/avatar-padrao.png";

    if (!caminho) return fotoPadrao;

    if (
        caminho.startsWith("http://") ||
        caminho.startsWith("https://") ||
        caminho.startsWith("data:")
    ) {
        return caminho;
    }

    return `${API_URL}/${caminho.replace(/^\/+/, "")}`;
}

function formatarData(data) {
    if (!data) return "";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) return data;

    return dataObj.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function formatarTexto(texto) {
    if (!texto) return "";

    const seguro = escaparHtml(texto);

    return seguro.replace(
        hashtagRegex,
        match => `<span class="hashtag">${match}</span>`
    );
}


function normalizarHashtag(hashtag) {
    const nome = String(hashtag || "").trim().toLowerCase();
    if (!nome) return "";
    return nome.startsWith("#") ? nome : `#${nome}`;
}

function obterHashtagsPublicacao(publicacao) {
    const encontradas = (publicacao.texto || "").match(hashtagRegex) || [];

    const vinculadas = Array.isArray(publicacao.hashtags)
        ? publicacao.hashtags.map(item => typeof item === "string" ? item : item.nome)
        : [];

    return [...new Set(
        [...encontradas, ...vinculadas]
            .map(normalizarHashtag)
            .filter(Boolean)
    )];
}


function atualizarIndicadorHashtag() {
    const indicador = document.getElementById("filtroHashtagAtivo");
    const nome = document.getElementById("nomeHashtagAtiva");

    if (!indicador || !nome) return;

    if (hashtagSelecionada) {
        nome.textContent = hashtagSelecionada;
        indicador.hidden = false;
    } else {
        nome.textContent = "";
        indicador.hidden = true;
    }
}

function selecionarHashtag(hashtag) {
    hashtagSelecionada = normalizarHashtag(hashtag);

    if (!hashtagSelecionada) return;

    termoPesquisa = "";
    pesquisa.value = "";

    atualizarIndicadorHashtag();
    renderizarFeed();

    modalHashtags.classList.remove("aberto");

    document.querySelector(".feed-topo")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

function removerFiltroHashtag() {
    hashtagSelecionada = null;
    atualizarIndicadorHashtag();
    renderizarFeed();
}



async function carregarPublicacoes() {
    listaPublicacoes.innerHTML = `
        <div class="estado-feed">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Carregando publicações...</span>
        </div>
    `;

    try {
        const resposta = await api("/publicacoes/listar");

        publicacoes = Array.isArray(resposta)
            ? resposta
            : resposta.publicacoes || [];

        renderizarFeed();
    } catch (erro) {
        console.error(erro);

        listaPublicacoes.innerHTML = `
            <div class="estado-feed erro">
                <i class="fa-solid fa-circle-exclamation"></i>
                <span>${escaparHtml(erro.message)}</span>
            </div>
        `;
    }
}

function obterPublicacoesFiltradas() {
    let lista = [...publicacoes];

    if (hashtagSelecionada) {
        lista = lista.filter(publicacao =>
            obterHashtagsPublicacao(publicacao).includes(hashtagSelecionada)
        );
    }

    if (termoPesquisa.trim()) {
        const termo = termoPesquisa.toLowerCase().trim();

        lista = lista.filter(publicacao => {
            const texto = publicacao.texto || "";
            const nome = publicacao.autor?.nome || "";
            const hashtags = obterHashtagsPublicacao(publicacao).join(" ");

            return (
                texto.toLowerCase().includes(termo) ||
                nome.toLowerCase().includes(termo) ||
                hashtags.includes(termo)
            );
        });
    }

    if (filtroAtual === "curtidas") {
        lista.sort((a, b) =>
            (b.curtidas?.length || 0) - (a.curtidas?.length || 0)
        );
    } else if (filtroAtual === "comentarios") {
        lista.sort((a, b) =>
            (b.comentarios?.length || 0) - (a.comentarios?.length || 0)
        );
    } else {
        lista.sort((a, b) =>
            new Date(b.dataPublicacao) - new Date(a.dataPublicacao)
        );
    }

    return lista;
}


function renderizarFeed() {
    const lista = obterPublicacoesFiltradas();

    if (!lista.length) {
        listaPublicacoes.innerHTML = `
            <div class="estado-feed">
                <i class="fa-regular fa-newspaper"></i>
                <span>Nenhuma publicação encontrada.</span>
            </div>
        `;

        return;
    }

    listaPublicacoes.innerHTML = lista
        .map(publicacao => criarCardPublicacao(publicacao))
        .join("");
}

function criarCardPublicacao(publicacao) {
    const autor = publicacao.autor || {};
    const nomeAutor = autor.nome || "Usuário";
    const fotoAutor = obterFotoPerfil(autor.fotoPerfil);
    const quantidadeCurtidas = publicacao.curtidas?.length || 0;
    const quantidadeComentarios = publicacao.comentarios?.length || 0;
    const usuarioId = getIdUsuarioAtual();

    const curtiu = (publicacao.curtidas || []).some(
        curtida => Number(curtida.usuarioId) === usuarioId
    );

    const podeExcluir = podeExcluirPublicacao(publicacao);

    const menuExcluir = podeExcluir
        ? `
            <button type="button" class="btn-deletar" data-acao="excluir-publicacao" data-id="${publicacao.id}">
                <i class="fa-solid fa-trash"></i>
                Excluir
            </button>
        `
        : "";

    return `
        <article class="post" data-post-id="${publicacao.id}">
            <div class="cabecalho-post">
                <div class="autor-post">
                    ${fotoComLinkPerfil(publicacao.usuario || publicacao.autor, publicacao.usuario?.fotoPerfil || publicacao.autor?.fotoPerfil, "avatar-post")}
            <div class="dados-autor">
                        <span class="nome-autor">${linkPerfil(autor, nomeAutor)}</span>
                        <span class="usuario-autor">
                            ${autor.tipo === "ADMINISTRADOR"
            ? "Administrador"
            : autor.tipo === "VERIFICADO"
                ? "Verificado"
                : "Usuário"}
                        </span>
                        <span class="data">${formatarData(publicacao.dataPublicacao)}</span>
                    </div>
                </div>

                <div class="menu-post">
                    <button type="button" class="btn-menu" data-acao="menu" aria-label="Mais opções">
                        <i class="fa-solid fa-ellipsis"></i>
                    </button>

                    <div class="dropdown-menu">
                        <button type="button" data-acao="denunciar-publicacao" data-id="${publicacao.id}">
                            <i class="fa-solid fa-flag"></i>
                            Denunciar
                        </button>
                        ${menuExcluir}
                    </div>
                </div>
            </div>

            <div class="conteudo">
                ${formatarTexto(publicacao.texto)}
            </div>

            ${renderizarMidias(publicacao)}

            <div class="acoes">
                <button type="button" class="btn-curtir ${curtiu ? "curtido" : ""}" data-acao="curtir" data-id="${publicacao.id}">
                    <i class="${curtiu ? "fa-solid" : "fa-regular"} fa-heart"></i>
                    <span>${quantidadeCurtidas}</span>
                </button>

                <button type="button" class="btn-comentarios" data-acao="comentarios" data-id="${publicacao.id}">
                    <i class="fa-regular fa-comment"></i>
                    <span>${quantidadeComentarios}</span>
                </button>

                <button type="button" class="btn-responder" data-acao="responder" data-id="${publicacao.id}">
                    <i class="fa-solid fa-reply"></i>
                    Responder
                </button>
            </div>

            <div class="comentarios" id="comentarios-${publicacao.id}">
                ${renderizarComentarios(publicacao)}
            </div>

            <div class="responder-container" id="responder-${publicacao.id}">
                <input type="text" class="input-resposta" id="input-resposta-${publicacao.id}" placeholder="Escreva uma resposta..." maxlength="1000">

                <button type="button" class="btn-enviar-resposta" data-acao="enviar-resposta" data-id="${publicacao.id}">
                    Enviar
                </button>
            </div>
        </article>
    `;
}

function renderizarMidias(publicacao) {
    if (!publicacao.midias?.length) return "";

    return publicacao.midias.map(midia => {
        const caminho =
            midia.url ||
            midia.path ||
            midia.caminho ||
            midia.arquivo ||
            midia.nomeArquivo;

        if (!caminho) return "";

        const url = caminho.startsWith("http://") ||
            caminho.startsWith("https://")
            ? caminho
            : `${API_URL}/${caminho.replace(/^\/+/, "")}`;

        const tipo = midia.mimeType || midia.tipo || "";

        if (tipo.startsWith("image/")) {
            return `
                <img
                    class="post-midia"
                    src="${escaparHtml(url)}"
                    alt="Imagem da publicação"
                    loading="lazy"
                >
            `;
        }

        if (tipo.startsWith("video/")) {
            return `
                <video class="post-video" controls>
                    <source
                        src="${escaparHtml(url)}"
                        type="${escaparHtml(tipo)}"
                    >
                </video>
            `;
        }

        return `
            <a
                class="midia-download"
                href="${escaparHtml(url)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                Abrir arquivo
            </a>
        `;
    }).join("");
}

function renderizarComentarios(publicacao) {
    const comentarios = publicacao.comentarios || [];

    if (!comentarios.length) {
        return `
            <div class="comentario-vazio">
                Nenhum comentário ainda.
            </div>
        `;
    }

    return comentarios
        .map(comentario => criarComentario(comentario, publicacao))
        .join("");
}


function criarComentario(comentario, publicacao) {
    const autor = comentario.autor || {};
    const nomeAutor = autor.nome || "Usuário";
    const podeExcluir = podeExcluirComentario(comentario, publicacao);
    const respostas = comentario.respostas || [];
    const quantidadeRespostas = respostas.length;

    return `
        <div class="item-comentario" data-comentario-id="${comentario.id}">
            <div class="header-comentario">
                ${fotoComLinkPerfil(
        comentario.usuario || comentario.autor,
        comentario.usuario?.fotoPerfil || comentario.autor?.fotoPerfil,
        "avatar-comentario"
    )}

                <div class="conteudo-comentario">
                    <div>
                        <span class="nome-comentario">
                            ${linkPerfil(autor, nomeAutor)}
                        </span>

                        <span class="data-comentario">
                            ${formatarData(comentario.dataPublicacao)}
                        </span>
                    </div>

                    <div class="responde-para">
                        Respondendo à <strong>publicação</strong>
                    </div>

                    <div class="texto-comentario">
                        ${formatarTexto(comentario.texto)}
                    </div>

                    <div class="acoes-comentario">
                        <button
                            type="button"
                            data-acao="responder-comentario"
                            data-id="${comentario.id}"
                            data-publicacao="${publicacao.id}"
                        >
                            Responder
                        </button>

                        <button
                            type="button"
                            data-acao="denunciar-comentario"
                            data-id="${comentario.id}"
                        >
                            Denunciar
                        </button>

                        ${podeExcluir ? `
                            <button
                                type="button"
                                class="btn-deletar-comentario"
                                data-acao="excluir-comentario"
                                data-id="${comentario.id}"
                            >
                                Excluir
                            </button>
                        ` : ""}
                    </div>

                    <div
                        class="responder-container"
                        id="responder-comentario-${comentario.id}"
                    >
                        <input
                            type="text"
                            class="input-resposta"
                            id="input-comentario-${comentario.id}"
                            placeholder="Responder a ${escaparHtml(nomeAutor)}..."
                            maxlength="1000"
                        >

                        <button
                            type="button"
                            class="btn-enviar-resposta"
                            data-acao="enviar-resposta-comentario"
                            data-id="${comentario.id}"
                            data-publicacao="${publicacao.id}"
                        >
                            Enviar
                        </button>
                    </div>

                    ${quantidadeRespostas > 0 ? `
                        <div class="grupo-respostas">
                           
                    <button
                        type="button"
                        class="btn-ver-respostas"
                        data-acao="alternar-respostas"
                        data-id="${comentario.id}"
                        data-quantidade="${quantidadeRespostas}"
                        aria-expanded="false"
                        aria-controls="respostas-${comentario.id}"
                        >
                        <i class="fa-solid fa-chevron-down"></i>
                        <span>
                        Ver ${quantidadeRespostas}
                        ${quantidadeRespostas === 1 ? "resposta" : "respostas"}
                        </span>
                        </button>


                            <div
                                class="respostas respostas-recolhidas"
                                id="respostas-${comentario.id}"
                                hidden
                            >
                                ${respostas
                .map(resposta =>
                    criarResposta(resposta, comentario, publicacao)
                )
                .join("")}
                            </div>
                        </div>
                    ` : ""}
                </div>
            </div>
        </div>
    `;
}


function criarResposta(resposta, comentario, publicacao) {
    const autor = resposta.autor || resposta.usuario || {};
    const nomeAutor = autor.nome || "Usuário";
    const podeExcluir = podeExcluirComentario(resposta, publicacao);

    return `
        <div class="resposta" data-comentario-id="${resposta.id}">
            <div class="header-comentario">
                ${fotoComLinkPerfil(
        autor,
        autor.fotoPerfil,
        "avatar-comentario"
    )}

                <div class="conteudo-comentario">
                    <span class="nome-comentario">
                        ${linkPerfil(autor, nomeAutor)}
                    </span>

                    <span class="data-comentario">
                        ${formatarData(resposta.dataPublicacao)}
                    </span>

                    <div class="responde-para">
                        Respondendo a
                        <strong>${escaparHtml(comentario.autor?.nome || "Usuário")}</strong>
                    </div>

                    <div class="texto-comentario">
                        ${formatarTexto(resposta.texto)}
                    </div>

                    <div class="acoes-comentario">
                        <button type="button"
                            data-acao="denunciar-comentario"
                            data-id="${resposta.id}">
                            Denunciar
                        </button>

                        ${podeExcluir ? `
                            <button type="button"
                                class="btn-deletar-comentario"
                                data-acao="excluir-comentario"
                                data-id="${resposta.id}">
                                Excluir
                            </button>
                        ` : ""}
                    </div>
                </div>
            </div>
        </div>
    `;
}



function alternarRespostas(comentarioId, botao) {
    const container = botao
        .closest(".grupo-respostas")
        ?.querySelector(".respostas");

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
}



async function criarPublicacao() {
    const textoValor = texto.value.trim();
    const arquivo = inputArquivo?.files?.[0];

    if (!textoValor && !arquivo) {
        alert("Digite algo ou selecione uma imagem antes de publicar.");
        return;
    }

    btnPublicar.disabled = true;
    btnPublicar.textContent = "Publicando...";

    try {
        const resposta = await api("/publicacoes/cadastrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                texto: textoValor
            })
        });

        const publicacaoId =
            resposta.publicacao?.id ??
            resposta.id;

        if (!publicacaoId) {
            throw new Error("Não foi possível identificar a publicação criada.");
        }

        if (arquivo) {
            const formData = new FormData();
            formData.append("arquivo", arquivo);

            await api(
                `/midias-publicacoes/cadastrar/${publicacaoId}`,
                {
                    method: "POST",
                    body: formData
                }
            );
        }

        texto.value = "";

        if (inputArquivo) {
            inputArquivo.value = "";
        }

        if (previewAnexo) {
            previewAnexo.innerHTML = "";
        }

        alert("Publicação criada com sucesso!");

        await carregarPublicacoes();
        await atualizarNuvem();

    } catch (erro) {
        console.error("Erro ao publicar:", erro);
        alert(erro.message);
    } finally {
        btnPublicar.disabled = false;
        btnPublicar.textContent = "Publicar";
    }
}

async function alternarCurtida(publicacaoId) {
    const publicacao = publicacoes.find(
        item => Number(item.id) === Number(publicacaoId)
    );

    if (!publicacao) return;

    const usuarioId = getIdUsuarioAtual();

    const jaCurtiu = (publicacao.curtidas || []).some(
        curtida => Number(curtida.usuarioId) === usuarioId
    );

    try {
        if (jaCurtiu) {
            await api("/curtidas/descurtir", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    publicacaoId
                })
            });
        } else {
            await api("/curtidas/curtir", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    publicacaoId
                })
            });
        }

        await carregarPublicacoes();
    } catch (erro) {
        alert(erro.message);
    }
}

async function carregarComentarios(publicacaoId) {
    try {
        const comentarios = await api(
            `/comentarios/publicacao/${publicacaoId}`
        );

        const publicacao = publicacoes.find(
            item => Number(item.id) === Number(publicacaoId)
        );

        if (publicacao) {
            publicacao.comentarios = comentarios;
        }

        const container = document.getElementById(
            `comentarios-${publicacaoId}`
        );

        if (container) {
            container.innerHTML = renderizarComentarios(publicacao);
        }
    } catch (erro) {
        console.error(erro);

        const container = document.getElementById(
            `comentarios-${publicacaoId}`
        );

        if (container) {
            container.innerHTML = `
                <div class="comentario-vazio">
                    Não foi possível carregar os comentários.
                </div>
            `;
        }
    }
}

async function adicionarComentario(
    publicacaoId,
    textoComentario,
    comentarioPaiId = null
) {
    const textoLimpo = textoComentario.trim();

    if (!textoLimpo) return;

    try {
        await api("/comentarios/cadastrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                publicacaoId,
                texto: textoLimpo,
                comentarioPaiId
            })
        });

        await carregarComentarios(publicacaoId);
        renderizarFeed();
        await atualizarNuvem();

        const comentarios = document.getElementById(
            `comentarios-${publicacaoId}`
        );

        if (comentarios) {
            comentarios.classList.add("aberto");
        }
    } catch (erro) {
        alert(erro.message);
    }
}
async function excluirComentario(comentarioId, publicacaoId) {
    const confirmar = confirm(
        "Deseja realmente excluir este comentário?"
    );

    if (!confirmar) return;

    try {
        await api(`/comentarios/${comentarioId}`, {
            method: "DELETE"
        });

        await carregarComentarios(publicacaoId);
        renderizarFeed();

        const comentarios = document.getElementById(
            `comentarios-${publicacaoId}`
        );

        if (comentarios) {
            comentarios.classList.add("aberto");
        }
    } catch (erro) {
        alert(erro.message);
    }
}

async function excluirPublicacao(publicacaoId) {
    const confirmar = confirm(
        "Deseja realmente excluir esta publicação?"
    );

    if (!confirmar) return;

    try {
        await api(`/publicacoes/excluir/${publicacaoId}`, {
            method: "DELETE"
        });

        publicacoes = publicacoes.filter(
            publicacao =>
                Number(publicacao.id) !== Number(publicacaoId)
        );

        renderizarFeed();
    } catch (erro) {
        alert(erro.message);
    }
}

function abrirModalDenuncia(tipo, id) {
    tipoDenuncia.value = tipo;
    idDenuncia.value = id;
    motivoDenuncia.value = "";

    modalDenuncia.classList.add("aberto");

    setTimeout(() => motivoDenuncia.focus(), 50);
}

function fecharModalDenunciaFunc() {
    modalDenuncia.classList.remove("aberto");
    tipoDenuncia.value = "";
    idDenuncia.value = "";
    motivoDenuncia.value = "";
}

async function enviarDenuncia() {
    const tipo = tipoDenuncia.value;
    const id = Number(idDenuncia.value);
    const motivo = motivoDenuncia.value.trim();

    if (!motivo) {
        alert("Informe o motivo da denúncia.");
        return;
    }

    confirmarDenuncia.disabled = true;

    try {
        if (tipo === "publicacao") {
            await api("/denuncias-publicacao/cadastrar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    publicacaoId: id,
                    motivo
                })
            });
        } else {
            await api("/denuncias-comentario/cadastrar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    comentarioId: id,
                    motivo
                })
            });
        }

        alert("Denúncia enviada com sucesso.");
        fecharModalDenunciaFunc();
    } catch (erro) {
        alert(erro.message);
    } finally {
        confirmarDenuncia.disabled = false;
    }
}

function fecharMenus() {
    document
        .querySelectorAll(".dropdown-menu.aberto")
        .forEach(menu => menu.classList.remove("aberto"));
}

function abrirRespostaPublicacao(publicacaoId) {
    const container = document.getElementById(
        `responder-${publicacaoId}`
    );

    if (!container) return;

    container.classList.toggle("aberto");

    if (container.classList.contains("aberto")) {
        const input = document.getElementById(
            `input-resposta-${publicacaoId}`
        );

        if (input) input.focus();
    }
}

function abrirRespostaComentario(comentarioId) {
    const container = document.getElementById(
        `responder-comentario-${comentarioId}`
    );

    if (!container) return;

    container.classList.toggle("aberto");

    if (container.classList.contains("aberto")) {
        const input = document.getElementById(
            `input-comentario-${comentarioId}`
        );

        if (input) input.focus();
    }
}

let ultimaNuvem = "";

async function atualizarNuvem() {
    const canvas = document.getElementById("nuvem");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    await Promise.all(
        publicacoes.map(async publicacao => {
            if (!Array.isArray(publicacao.comentarios)) {
                try {
                    const resposta = await api(
                        `/comentarios/publicacao/${publicacao.id}`
                    );

                    publicacao.comentarios = Array.isArray(resposta)
                        ? resposta
                        : resposta.comentarios || [];
                } catch (erro) {
                    console.error(erro);
                    publicacao.comentarios = [];
                }
            }
        })
    );

    const contagem = {};

    function contarHashtags(texto) {
        const tags = (texto || "").match(hashtagRegex) || [];

        tags.forEach(tag => {
            const nome = tag.toLowerCase();
            contagem[nome] = (contagem[nome] || 0) + 1;
        });
    }

    function contarComentarios(comentarios) {
        if (!Array.isArray(comentarios)) return;

        comentarios.forEach(comentario => {
            contarHashtags(comentario.texto);
            contarComentarios(comentario.respostas);
        });
    }

    publicacoes.forEach(publicacao => {
        contarHashtags(publicacao.texto);
        contarComentarios(publicacao.comentarios);
    });

    const hashtags = Object.entries(contagem)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    renderizarListaHashtags([...hashtags]);

    const cores = [
        "--primary-dark",
        "--primary",
        "--secondary",
        "--text"
    ].map(variavel =>
        getComputedStyle(document.documentElement)
            .getPropertyValue(variavel)
            .trim()
    ).filter(Boolean);

    const assinatura = JSON.stringify({
        hashtags,
        cores
    });
    if (assinatura === ultimaNuvem) return;

    const largura = canvas.width;
    const altura = canvas.height;

    if (!largura || !altura) return;

    await document.fonts?.ready;

    const maior = hashtags[0]?.[1] || 1;
    const menor = hashtags[hashtags.length - 1]?.[1] || 1;

    const centroX = largura / 2;
    const centroY = altura / 2;
    const margem = 8;
    const espacamento = 5;
    const ocupadas = [];

    const estilos = getComputedStyle(document.documentElement);


    const hashTexto = texto => {
        let hash = 0;

        for (let i = 0; i < texto.length; i++) {
            hash = ((hash << 5) - hash + texto.charCodeAt(i)) | 0;
        }

        return Math.abs(hash);
    };

    function criarRetangulo(x, y, larguraTexto, tamanho, vertical) {
        const larguraFinal = vertical ? tamanho : larguraTexto;
        const alturaFinal = vertical ? larguraTexto : tamanho;

        return {
            esquerda: x - larguraFinal / 2 - espacamento,
            direita: x + larguraFinal / 2 + espacamento,
            topo: y - alturaFinal / 2 - espacamento,
            baixo: y + alturaFinal / 2 + espacamento
        };
    }

    function cabeNoCanvas(retangulo) {
        return (
            retangulo.esquerda >= margem &&
            retangulo.direita <= largura - margem &&
            retangulo.topo >= margem &&
            retangulo.baixo <= altura - margem
        );
    }

    function temColisao(retangulo) {
        return ocupadas.some(item =>
            retangulo.esquerda < item.direita &&
            retangulo.direita > item.esquerda &&
            retangulo.topo < item.baixo &&
            retangulo.baixo > item.topo
        );
    }

    const palavras = [];

    hashtags.slice(0, 25).forEach(([tag, quantidade], indice) => {
        const proporcao = maior === menor
            ? 0.5
            : (quantidade - menor) / (maior - menor);

        let tamanho = 13 + proporcao * 17;

        const tamanhoMaximo = Math.max(
            12,
            Math.min(30, largura * 0.085)
        );

        tamanho = Math.min(tamanho, tamanhoMaximo);

        ctx.font = `700 ${tamanho}px Montserrat, sans-serif`;

        const larguraTexto = ctx.measureText(tag).width;

        const vertical = indice > 1 && hashTexto(tag) % 4 === 0;

        const dimensaoMaior = vertical ? larguraTexto : tamanho;
        const dimensaoHorizontal = vertical ? tamanho : larguraTexto;

        if (
            dimensaoHorizontal + margem * 2 > largura ||
            dimensaoMaior + margem * 2 > altura
        ) {
            return;
        }

        const semente = hashTexto(tag);
        const anguloInicial = (semente % 360) * Math.PI / 180;

        let posicao = null;

        for (let tentativa = 0; tentativa < 1000; tentativa++) {
            const angulo = anguloInicial + tentativa * 0.22;
            const raio = tentativa * 0.45;

            const x = centroX + Math.cos(angulo) * raio;
            const y = centroY + Math.sin(angulo) * raio * 0.75;

            const retangulo = criarRetangulo(
                x,
                y,
                larguraTexto,
                tamanho,
                vertical
            );

            if (cabeNoCanvas(retangulo) && !temColisao(retangulo)) {
                posicao = { x, y, retangulo };
                break;
            }
        }

        if (!posicao) return;

        ocupadas.push(posicao.retangulo);

        palavras.push({
            tag,
            quantidade,
            tamanho,
            vertical,
            x: posicao.x,
            y: posicao.y,
            cor: cores[semente % cores.length] || "#888"
        });
    });

    ctx.clearRect(0, 0, largura, altura);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    palavras.forEach(palavra => {
        ctx.save();

        ctx.translate(palavra.x, palavra.y);

        if (palavra.vertical) {
            ctx.rotate(Math.PI / 2);
        }

        ctx.font = `700 ${palavra.tamanho}px Montserrat, sans-serif`;
        ctx.fillStyle = palavra.cor;

        ctx.fillText(palavra.tag, 0, 0);

        ctx.restore();
    });

    ultimaNuvem = assinatura;
}


function renderizarListaHashtags(hashtags) {
    if (!listaHashtags) return;

    if (!hashtags.length) {
        listaHashtags.innerHTML = `
            <li class="hashtags-vazio">
                <i class="fa-solid fa-hashtag"></i>
                <span>Nenhuma hashtag utilizada ainda.</span>
            </li>
        `;
        return;
    }

    hashtags.sort((a, b) =>
        b[1] - a[1] || a[0].localeCompare(b[0])
    );

    listaHashtags.innerHTML = hashtags.map(([tag, quantidade], index) => `
        <li class="hashtag-item">
            <button
                type="button"
                class="hashtag-opcao"
                data-hashtag="${escaparHtml(tag)}"
            >
                <span class="hashtag-posicao">
                    ${String(index + 1).padStart(2, "0")}
                </span>

                <span class="hashtag-dados">
                    <strong>${escaparHtml(tag)}</strong>
                    <small>Ver publicações relacionadas</small>
                </span>

                <span class="hashtag-quantidade">
                    <strong>${quantidade}</strong>
                    <small>${quantidade === 1 ? "uso" : "usos"}</small>
                </span>

                <i class="fa-solid fa-arrow-up-right-from-square hashtag-seta"></i>
            </button>
        </li>
    `).join("");
}

btnPublicar.addEventListener(
    "click",
    criarPublicacao
);

texto.addEventListener(
    "keydown",
    evento => {
        if (
            (evento.ctrlKey || evento.metaKey) &&
            evento.key === "Enter"
        ) {
            criarPublicacao();
        }
    }
);

inputArquivo?.addEventListener("change", () => {
    const arquivo = inputArquivo.files?.[0];

    if (!arquivo) {
        previewAnexo.innerHTML = "";
        return;
    }

    if (!arquivo.type.startsWith("image/")) {
        alert("Selecione uma imagem válida.");
        inputArquivo.value = "";
        previewAnexo.innerHTML = "";
        return;
    }

    const url = URL.createObjectURL(arquivo);

    previewAnexo.innerHTML = `
        <div class="preview-imagem">
            <img src="${url}" alt="Prévia da imagem">
            <button type="button" id="removerImagem">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;

    previewAnexo.querySelector("img").onload = () => {
        URL.revokeObjectURL(url);
    };

    document.getElementById("removerImagem").addEventListener("click", () => {
        inputArquivo.value = "";
        previewAnexo.innerHTML = "";
    });
});

btnFiltros.addEventListener(
    "click",
    () => {
        filtrosPesquisa.classList.toggle("aberto");
    }
);

pesquisa.addEventListener(
    "input",
    () => {
        termoPesquisa = pesquisa.value;
        renderizarFeed();
    }
);

filtrosPesquisa
    .querySelectorAll("button")
    .forEach(botao => {
        botao.addEventListener(
            "click",
            () => {
                filtrosPesquisa
                    .querySelectorAll("button")
                    .forEach(item =>
                        item.classList.remove("filtro-ativo")
                    );

                botao.classList.add("filtro-ativo");
                filtroAtual = botao.dataset.filtro;
                renderizarFeed();
            }
        );
    });

btnVerTudo?.addEventListener(
    "click",
    () => {
        modalHashtags.classList.add("aberto");
    }
);

fecharModalHashtags?.addEventListener(
    "click",
    () => {
        modalHashtags.classList.remove("aberto");
    }
);

fecharModalDenuncia?.addEventListener(
    "click",
    fecharModalDenunciaFunc
);

cancelarDenuncia?.addEventListener(
    "click",
    fecharModalDenunciaFunc
);

confirmarDenuncia?.addEventListener(
    "click",
    enviarDenuncia
);

listaPublicacoes.addEventListener(
    "click",
    async evento => {
        const botao = evento.target.closest("[data-acao]");

        if (!botao) return;

        const acao = botao.dataset.acao;
        const id = Number(botao.dataset.id);

        if (acao === "menu") {
            const menu = botao.parentElement.querySelector(
                ".dropdown-menu"
            );

            fecharMenus();
            menu?.classList.toggle("aberto");
            return;
        }

        if (acao === "curtir") {
            await alternarCurtida(id);
            return;
        }

        if (acao === "comentarios") {
            const container = document.getElementById(
                `comentarios-${id}`
            );

            if (!container) return;

            const aberto = container.classList.toggle("aberto");

            if (aberto) {
                await carregarComentarios(id);
            }

            return;
        }

        if (acao === "responder") {
            abrirRespostaPublicacao(id);
            return;
        }

        if (acao === "enviar-resposta") {
            const input = document.getElementById(
                `input-resposta-${id}`
            );

            if (!input) return;

            await adicionarComentario(
                id,
                input.value,
                null
            );

            input.value = "";
            return;
        }


        if (acao === "responder-comentario") {
            abrirRespostaComentario(id);
            return;
        }

        if (acao === "alternar-respostas") {
            evento.preventDefault();
            alternarRespostas(id, botao);
            return;
        }

        if (acao === "enviar-resposta-comentario") {
            const publicacaoId = Number(botao.dataset.publicacao);

            const input = document.getElementById(
                `input-comentario-${id}`
            );

            if (!input) return;

            await adicionarComentario(
                publicacaoId,
                input.value,
                id
            );

            input.value = "";
            return;
        }


        if (acao === "excluir-publicacao") {
            await excluirPublicacao(id);
            return;
        }

        if (acao === "excluir-comentario") {
            const post = botao.closest(".post");

            const publicacaoId = Number(
                post?.dataset.postId
            );

            await excluirComentario(
                id,
                publicacaoId
            );

            return;
        }

        if (acao === "denunciar-publicacao") {
            abrirModalDenuncia(
                "publicacao",
                id
            );

            fecharMenus();
            return;
        }

        if (acao === "denunciar-comentario") {
            abrirModalDenuncia(
                "comentario",
                id
            );
        }
    }
);

document.addEventListener(
    "click",
    evento => {
        if (!evento.target.closest(".menu-post")) {
            fecharMenus();
        }

        if (evento.target === modalHashtags) {
            modalHashtags.classList.remove("aberto");
        }

        if (evento.target === modalDenuncia) {
            fecharModalDenunciaFunc();
        }
    }
);

document.addEventListener(
    "keydown",
    evento => {
        if (evento.key !== "Escape") return;

        modalHashtags?.classList.remove("aberto");
        fecharModalDenunciaFunc();
        fecharMenus();
    }
);

document.addEventListener(
    "DOMContentLoaded",
    async () => {
        await carregarPublicacoes();
        atualizarNuvem();
    }
);


listaHashtags?.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-hashtag]");
    if (!botao) return;

    selecionarHashtag(botao.dataset.hashtag);
});

limparFiltroHashtag?.addEventListener("click", removerFiltroHashtag);


const btnAtualizarFeed = document.getElementById("btnAtualizarFeed");

btnAtualizarFeed?.addEventListener("click", async () => {
    btnAtualizarFeed.disabled = true;
    btnAtualizarFeed.classList.add("atualizando");

    try {
        hashtagSelecionada = null;
        termoPesquisa = "";
        filtroAtual = "recentes";

        pesquisa.value = "";

        document.querySelectorAll(".filtros-pesquisa button").forEach(botao => {
            botao.classList.toggle("filtro-ativo", botao.dataset.filtro === "recentes");
        });

        atualizarIndicadorHashtag();

        await carregarPublicacoes();
        await atualizarNuvem();
    } catch (erro) {
        console.error("Erro ao atualizar feed:", erro);
    } finally {
        btnAtualizarFeed.disabled = false;
        btnAtualizarFeed.classList.remove("atualizando");
    }
});

document.getElementById("listaHashtags")?.addEventListener("click", evento => {
    const botao = evento.target.closest("[data-hashtag]");
    if (!botao) return;

    selecionarHashtag(botao.dataset.hashtag);
});

document.getElementById("limparFiltroHashtag")?.addEventListener("click", removerFiltroHashtag);

const areaFeed = document.getElementById("areaFeed");
const areaPerfil = document.getElementById("areaPerfil");
const colunaEsquerda = document.querySelector(".esquerda");
const containerFeed = document.querySelector(".feed-page .container");

let posicaoAnteriorFeed = 0;

function mostrarAreaPerfil() {
    posicaoAnteriorFeed = window.scrollY;

    areaFeed.hidden = true;
    colunaEsquerda.hidden = true;
    areaPerfil.hidden = false;

    containerFeed.classList.add("visualizando-perfil");

    window.scrollTo({ top: 0, behavior: "instant" });
}

function voltarAoFeed() {
    areaPerfil.hidden = true;
    areaFeed.hidden = false;
    colunaEsquerda.hidden = false;

    containerFeed.classList.remove("visualizando-perfil");

    window.scrollTo({
        top: posicaoAnteriorFeed,
        behavior: "instant"
    });
}

document.addEventListener("click", evento => {
    const link = evento.target.closest("[data-perfil-id]");

    if (!link) return;

    evento.preventDefault();

    const usuarioId = Number(link.dataset.perfilId);

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) return;

    if (typeof window.abrirPerfilIntegrado === "function") {
        window.abrirPerfilIntegrado(usuarioId);
    }
});
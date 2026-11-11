
const FOTO_PADRAO = "../img/avatar-padrao.png";
const TEMPLATE_PADRAO = "../img/template-padrao.png";

const modal = document.getElementById("modalFundo");
const foto = document.getElementById("foto");
const nome = document.getElementById("nome");
const rede = document.getElementById("rede");
const descricao = document.getElementById("descricao");
const categoria = document.getElementById("categoria");
const banner = document.querySelector(".topo img");

const inputFoto = document.getElementById("inputFoto");
const inputBanner = document.getElementById("inputBanner");
const inputDescricao = document.getElementById("inputDescricao");
const inputNome = document.getElementById("inputNome");
const inputMostrarCurtidas = document.getElementById("mostrarCurtidas");

const previewFoto = document.getElementById("previewFoto");
const previewBanner = document.getElementById("previewBanner");

const totalPublicacoes = document.getElementById("totalPublicacoes");
const totalComentarios = document.getElementById("totalComentarios");
const totalCurtidas = document.getElementById("totalCurtidas");

let publicacoesPerfil = [];
let comentariosPerfil = [];
let curtidasPerfil = [];

let curtidasPrivadas = false;
let mostrarCurtidasPerfil = false;
let abaAtualPerfil = "publicacoes";

let erroCurtidasPerfil = false;
let erroAtividadesPerfil = false;
let carregandoAtividadesPerfil = true;

function obterTokenPerfil() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function obterUsuarioToken() {
    const token = obterTokenPerfil();

    if (!token) return null;

    try {
        const partes = token.split(".");

        if (partes.length !== 3) return null;

        const payload = partes[1]
            .replace(/-/g, "+")
            .replace(/_/g, "/");

        const base64 = payload.padEnd(
            Math.ceil(payload.length / 4) * 4,
            "="
        );

        const texto = atob(base64);

        return JSON.parse(
            decodeURIComponent(
                Array.from(texto)
                    .map(caractere =>
                        "%" + caractere.charCodeAt(0)
                            .toString(16)
                            .padStart(2, "0")
                    )
                    .join("")
            )
        );
    } catch (erro) {
        console.error("Erro ao ler token:", erro);
        return null;
    }
}

const parametrosPerfil = new URLSearchParams(window.location.search);
const idSolicitado = Number(parametrosPerfil.get("id"));

function obterIdPerfil() {
    const usuario = obterUsuarioToken();

    if (
        parametrosPerfil.has("id") &&
        Number.isInteger(idSolicitado) &&
        idSolicitado > 0
    ) {
        return idSolicitado;
    }

    return usuario?.id;
}

function perfilProprio() {
    const usuario = obterUsuarioToken();

    return Boolean(
        usuario?.id &&
        Number(obterIdPerfil()) === Number(usuario.id)
    );
}

function obterCaminhoImagem(caminho, padrao) {
    if (!caminho || typeof caminho !== "string") return padrao;

    if (/^https?:\/\//i.test(caminho)) {
        return caminho;
    }

    const base = String(API_URL).replace(/\/+$/, "");
    const arquivo = caminho.replace(/^\/+/, "");

    return `${base}/${arquivo}`;
}

function formatarTipo(tipo) {
    const tipos = {
        USUARIO: "Usuário",
        VERIFICADO: "Verificado",
        ADMINISTRADOR: "Administrador"
    };

    return tipos[tipo] || tipo || "Usuário";
}

function escaparTextoPerfil(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caractere]));
}

function formatarDataPerfil(data) {
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

function obterIdAutor(item) {
    return Number(
        item?.autor?.id ??
        item?.usuario?.id ??
        item?.usuarioId
    );
}

function obterListaPublicacoes(dados) {
    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados?.publicacoes)) return dados.publicacoes;
    if (Array.isArray(dados?.lista)) return dados.lista;
    return [];
}

function obterListaCurtidas(dados) {
    if (Array.isArray(dados)) return dados;
    if (Array.isArray(dados?.curtidas)) return dados.curtidas;
    if (Array.isArray(dados?.publicacoes)) return dados.publicacoes;
    if (Array.isArray(dados?.lista)) return dados.lista;
    return [];
}

function normalizarCurtida(item) {
    if (!item || typeof item !== "object") return null;

    if (item.publicacao && typeof item.publicacao === "object") {
        return {
            ...item,
            publicacao: item.publicacao
        };
    }

    if (item.postagem && typeof item.postagem === "object") {
        return {
            ...item,
            publicacao: item.postagem
        };
    }

    if (
        item.id !== undefined &&
        (
            item.texto !== undefined ||
            item.autor !== undefined ||
            item.usuario !== undefined
        )
    ) {
        return {
            publicacao: item
        };
    }

    return null;
}

function mensagemAtividadesPerfil(mensagem) {
    const painel = document.getElementById("atividadesPerfil");

    if (!painel) return;

    painel.innerHTML = `
        <p class="perfil-atividades-vazio">
            ${escaparTextoPerfil(mensagem)}
        </p>
    `;
}

async function carregarPerfil() {
    const token = obterTokenPerfil();
    const perfilId = obterIdPerfil();

    if (!token || !perfilId) {
        window.location.href = "/html/login.html";
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/usuarios/buscar/${perfilId}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao carregar perfil."
            );
        }

        mostrarCurtidasPerfil = dados.mostrarCurtidas === true;

        nome.textContent = dados.nome || "Usuário";

        descricao.textContent =
            dados.bio ||
            "Este usuário ainda não adicionou uma descrição.";

        categoria.textContent = formatarTipo(dados.tipo);

        rede.textContent =
            dados.empresa?.nome || "Não informado";

        foto.src = obterCaminhoImagem(
            dados.fotoPerfil,
            FOTO_PADRAO
        );

        banner.src = obterCaminhoImagem(
            dados.template,
            TEMPLATE_PADRAO
        );

        foto.onerror = () => {
            foto.onerror = null;
            foto.src = FOTO_PADRAO;
        };

        banner.onerror = () => {
            banner.onerror = null;
            banner.src = TEMPLATE_PADRAO;
        };

        const botaoEditar = document.getElementById("btnEditarPerfil");

        if (botaoEditar) {
            botaoEditar.hidden = !perfilProprio();
            botaoEditar.onclick = abrirModal;
        }

        if (inputNome) {
            inputNome.value = dados.nome || "";
            inputNome.disabled = true;
        }

        if (perfilProprio()) {
            prepararModal();
        }

        await carregarEstatisticas(perfilId, token);

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);

        nome.textContent = "Não foi possível carregar";
        descricao.textContent =
            "Não foi possível carregar os dados do perfil.";
        categoria.textContent = "Usuário";
        rede.textContent = "Não informado";

        foto.src = FOTO_PADRAO;
        banner.src = TEMPLATE_PADRAO;
    }
}

async function carregarEstatisticas(usuarioId, token) {
    erroAtividadesPerfil = false;
    carregandoAtividadesPerfil = true;

    renderizarAtividadesPerfil();

    try {
        const resposta = await fetch(
            `${API_URL}/publicacoes/listar`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao carregar atividades."
            );
        }

        const publicacoes = obterListaPublicacoes(dados);

        publicacoesPerfil = publicacoes.filter(publicacao =>
            obterIdAutor(publicacao) === Number(usuarioId)
        );

        comentariosPerfil = [];

        function adicionarComentarios(lista, publicacao) {
            if (!Array.isArray(lista)) return;

            lista.forEach(comentario => {
                if (obterIdAutor(comentario) === Number(usuarioId)) {
                    comentariosPerfil.push({
                        ...comentario,
                        publicacaoId: publicacao.id
                    });
                }

                adicionarComentarios(
                    comentario.respostas,
                    publicacao
                );
            });
        }

        publicacoes.forEach(publicacao => {
            adicionarComentarios(
                publicacao.comentarios,
                publicacao
            );
        });

        totalPublicacoes.textContent = publicacoesPerfil.length;
        totalComentarios.textContent = comentariosPerfil.length;

    } catch (erro) {
        console.error("Erro ao carregar atividades:", erro);

        erroAtividadesPerfil = true;
        publicacoesPerfil = [];
        comentariosPerfil = [];

        totalPublicacoes.textContent = "—";
        totalComentarios.textContent = "—";
    }

    await carregarCurtidasPerfil(usuarioId, token);

    carregandoAtividadesPerfil = false;
    renderizarAtividadesPerfil();
}

async function carregarCurtidasPerfil(usuarioId, token) {
    curtidasPerfil = [];
    curtidasPrivadas = false;
    erroCurtidasPerfil = false;

    try {
        const resposta = await fetch(
            `${API_URL}/usuarios/${usuarioId}/curtidas`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (resposta.status === 403) {
            curtidasPrivadas = true;
            totalCurtidas.textContent = "—";
            return;
        }

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || "Erro ao carregar curtidas."
            );
        }

        console.log("Resposta da API de curtidas:", dados);

        const lista = obterListaCurtidas(dados);

        curtidasPerfil = lista
            .map(normalizarCurtida)
            .filter(Boolean);

        totalCurtidas.textContent = curtidasPerfil.length;

    } catch (erro) {
        console.error("Erro ao carregar curtidas:", erro);

        erroCurtidasPerfil = true;
        totalCurtidas.textContent = "—";
    }
}

function prepararModal() {
    if (inputNome) {
        inputNome.value = nome.textContent;
        inputNome.disabled = true;
    }

    inputDescricao.value =
        descricao.textContent !==
        "Este usuário ainda não adicionou uma descrição."
            ? descricao.textContent
            : "";

    previewFoto.src = foto.src;
    previewBanner.src = banner.src;

    if (inputMostrarCurtidas) {
        inputMostrarCurtidas.checked = mostrarCurtidasPerfil;
    }
}

function abrirModal() {
    if (!perfilProprio() || !modal) return;

    prepararModal();
    modal.style.display = "flex";
}

function fecharModal() {
    if (!modal) return;

    modal.style.display = "none";

    inputFoto.value = "";
    inputBanner.value = "";

    prepararModal();
}

function mostrarPreview(input, preview) {
    const arquivo = input.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = evento => {
        preview.src = evento.target.result;
    };

    leitor.readAsDataURL(arquivo);
}

if (inputFoto) {
    inputFoto.addEventListener("change", () => {
        mostrarPreview(inputFoto, previewFoto);
    });
}

if (inputBanner) {
    inputBanner.addEventListener("change", () => {
        mostrarPreview(inputBanner, previewBanner);
    });
}

async function salvarPerfil() {
    if (!perfilProprio()) return;

    const token = obterTokenPerfil();
    const usuarioToken = obterUsuarioToken();

    if (!token || !usuarioToken?.id) {
        alert("Sua sessão expirou. Faça login novamente.");
        window.location.href = "/html/login.html";
        return;
    }

    const descricaoNova = inputDescricao.value.trim();
    const fotoNova = inputFoto.files[0];
    const bannerNovo = inputBanner.files[0];

    const privacidadeNova = inputMostrarCurtidas
        ? inputMostrarCurtidas.checked
        : mostrarCurtidasPerfil;

    const alterouPrivacidade =
        privacidadeNova !== mostrarCurtidasPerfil;

    const descricaoAtual =
        descricao.textContent ===
        "Este usuário ainda não adicionou uma descrição."
            ? ""
            : descricao.textContent;

    if (
        !fotoNova &&
        !bannerNovo &&
        descricaoNova === descricaoAtual &&
        !alterouPrivacidade
    ) {
        alert("Nenhuma alteração foi realizada.");
        return;
    }

    const botaoSalvar = document.querySelector(".botao-salvar");

    if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";
    }

    try {
        if (descricaoNova !== descricaoAtual) {
            const respostaDescricao = await fetch(
                `${API_URL}/usuarios/atualizar/${usuarioToken.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        bio: descricaoNova
                    })
                }
            );

            const dadosDescricao = await respostaDescricao.json();

            if (!respostaDescricao.ok) {
                throw new Error(
                    dadosDescricao.mensagem ||
                    "Erro ao atualizar descrição."
                );
            }
        }

        if (fotoNova) {
            const formDataFoto = new FormData();
            formDataFoto.append("arquivo", fotoNova);

            const respostaFoto = await fetch(
                `${API_URL}/usuarios/foto-perfil`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formDataFoto
                }
            );

            const dadosFoto = await respostaFoto.json();

            if (!respostaFoto.ok) {
                throw new Error(
                    dadosFoto.mensagem ||
                    "Erro ao atualizar foto de perfil."
                );
            }
        }

        if (bannerNovo) {
            const formDataBanner = new FormData();
            formDataBanner.append("arquivo", bannerNovo);

            const respostaBanner = await fetch(
                `${API_URL}/usuarios/template/${usuarioToken.id}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    body: formDataBanner
                }
            );

            const dadosBanner = await respostaBanner.json();

            if (!respostaBanner.ok) {
                throw new Error(
                    dadosBanner.mensagem ||
                    "Erro ao atualizar banner."
                );
            }
        }

        if (alterouPrivacidade) {
            const respostaPrivacidade = await fetch(
                `${API_URL}/usuarios/privacidade`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        mostrarCurtidas: privacidadeNova
                    })
                }
            );

            const dadosPrivacidade = await respostaPrivacidade.json();

            if (!respostaPrivacidade.ok) {
                throw new Error(
                    dadosPrivacidade.mensagem ||
                    "Erro ao atualizar privacidade."
                );
            }

            mostrarCurtidasPerfil = privacidadeNova;
        }

        fecharModal();
        await carregarPerfil();

        alert("Perfil atualizado com sucesso!");

    } catch (erro) {
        console.error("Erro ao salvar perfil:", erro);

        alert(
            erro.message || "Erro ao atualizar perfil."
        );
    } finally {
        if (botaoSalvar) {
            botaoSalvar.disabled = false;
            botaoSalvar.textContent = "Salvar Alterações";
        }
    }
}

function criarCabecalhoPublicacaoPerfil(publicacao) {
    const autor = publicacao.autor || publicacao.usuario || {};

    const fotoAutor = obterCaminhoImagem(
        autor.fotoPerfil,
        FOTO_PADRAO
    );

    const nomeAutor = escaparTextoPerfil(autor.nome || "Usuário");
    const data = escaparTextoPerfil(
        formatarDataPerfil(publicacao.dataPublicacao)
    );

    return `
        <div class="perfil-publicacao-cabecalho">
            <img
                src="${escaparTextoPerfil(fotoAutor)}"
                alt="Foto do autor"
                class="perfil-publicacao-avatar"
            >

            <div class="perfil-publicacao-autor">
                <strong>${nomeAutor}</strong>
                <span>${data}</span>
            </div>
        </div>
    `;
}

function criarLinkPublicacaoPerfil(publicacaoId, texto) {
    if (publicacaoId === undefined || publicacaoId === null) {
        return "";
    }

    return `
        <a
            href="/html/feed.html?publicacao=${encodeURIComponent(publicacaoId)}"
            class="perfil-publicacao-link"
        >
            ${escaparTextoPerfil(texto)}
        </a>
    `;
}

function renderizarPublicacoesPerfil() {
    const painel = document.getElementById("atividadesPerfil");

    if (!painel) return;

    if (erroAtividadesPerfil) {
        mensagemAtividadesPerfil(
            "Não foi possível carregar as publicações."
        );
        return;
    }

    if (!publicacoesPerfil.length) {
        mensagemAtividadesPerfil(
            "Este usuário ainda não fez nenhuma publicação."
        );
        return;
    }

    painel.innerHTML = publicacoesPerfil.map(publicacao => {
        const quantidadeCurtidas = Array.isArray(publicacao.curtidas)
            ? publicacao.curtidas.length
            : 0;

        const quantidadeComentarios = Array.isArray(publicacao.comentarios)
            ? publicacao.comentarios.length
            : 0;

        return `
            <article class="perfil-publicacao">
                ${criarCabecalhoPublicacaoPerfil(publicacao)}

                <div class="perfil-publicacao-texto">
                    ${escaparTextoPerfil(publicacao.texto || "")}
                </div>

                <div class="perfil-publicacao-acoes">
                    <span>
                        <i class="fa-solid fa-heart"></i>
                        ${quantidadeCurtidas}
                    </span>

                    <span>
                        <i class="fa-regular fa-comment"></i>
                        ${quantidadeComentarios}
                    </span>

                    ${criarLinkPublicacaoPerfil(
                        publicacao.id,
                        "Ver no feed"
                    )}
                </div>
            </article>
        `;
    }).join("");
}

function renderizarComentariosPerfil() {
    const painel = document.getElementById("atividadesPerfil");

    if (!painel) return;

    if (erroAtividadesPerfil) {
        mensagemAtividadesPerfil(
            "Não foi possível carregar os comentários."
        );
        return;
    }

    if (!comentariosPerfil.length) {
        mensagemAtividadesPerfil(
            "Este usuário ainda não fez comentários."
        );
        return;
    }

    painel.innerHTML = comentariosPerfil.map(comentario => `
        <article class="perfil-publicacao">
            <div class="perfil-publicacao-cabecalho">
                <img
                    src="${escaparTextoPerfil(foto.src)}"
                    class="perfil-publicacao-avatar"
                    alt="Foto do usuário"
                >

                <div class="perfil-publicacao-autor">
                    <strong>${escaparTextoPerfil(nome.textContent)}</strong>
                    <span>
                        ${escaparTextoPerfil(
                            formatarDataPerfil(comentario.dataPublicacao)
                        )}
                    </span>
                </div>
            </div>

            <div class="perfil-publicacao-texto">
                ${escaparTextoPerfil(comentario.texto || "")}
            </div>

            <div class="perfil-publicacao-acoes">
                ${criarLinkPublicacaoPerfil(
                    comentario.publicacaoId,
                    "Ver publicação"
                )}
            </div>
        </article>
    `).join("");
}

function renderizarCurtidasPerfil() {
    const painel = document.getElementById("atividadesPerfil");

    if (!painel) return;

    if (curtidasPrivadas) {
        mensagemAtividadesPerfil(
            "Este usuário optou por manter suas curtidas privadas."
        );
        return;
    }

    if (erroCurtidasPerfil) {
        mensagemAtividadesPerfil(
            "Não foi possível carregar as curtidas."
        );
        return;
    }

    if (!curtidasPerfil.length) {
        mensagemAtividadesPerfil(
            "Nenhuma publicação curtida."
        );
        return;
    }

    painel.innerHTML = curtidasPerfil.map(curtida => {
        const publicacao = curtida.publicacao;

        if (!publicacao) return "";

        return `
            <article class="perfil-publicacao">
                ${criarCabecalhoPublicacaoPerfil(publicacao)}

                <div class="perfil-publicacao-texto">
                    ${escaparTextoPerfil(publicacao.texto || "")}
                </div>

                <div class="perfil-publicacao-acoes">
                    <span>
                        <i class="fa-solid fa-heart"></i>
                        Curtido
                    </span>

                    ${criarLinkPublicacaoPerfil(
                        publicacao.id,
                        "Ver publicação"
                    )}
                </div>
            </article>
        `;
    }).join("");
}

function renderizarAtividadesPerfil() {
    if (carregandoAtividadesPerfil) {
        mensagemAtividadesPerfil("Carregando atividades...");
        return;
    }

    if (abaAtualPerfil === "publicacoes") {
        renderizarPublicacoesPerfil();
    } else if (abaAtualPerfil === "comentarios") {
        renderizarComentariosPerfil();
    } else if (abaAtualPerfil === "curtidas") {
        renderizarCurtidasPerfil();
    }
}

function configurarAbasPerfil() {
    const abas = document.querySelectorAll(
        ".abas-atividades-perfil .aba-atividade"
    );

    const painel = document.getElementById("atividadesPerfil");

    const estatisticas = document.querySelectorAll(
        ".estatisticas [data-atividade]"
    );

    if (!abas.length || !painel) return;

    function selecionarAba(tipo) {
        if (!["publicacoes", "comentarios", "curtidas"].includes(tipo)) {
            return;
        }

        abaAtualPerfil = tipo;

        abas.forEach(aba => {
            aba.classList.toggle(
                "ativa",
                aba.dataset.atividade === tipo
            );
        });

        painel.dataset.atividadeAtual = tipo;
        painel.scrollTop = 0;

        renderizarAtividadesPerfil();
    }

    abas.forEach(aba => {
        aba.addEventListener("click", () => {
            selecionarAba(aba.dataset.atividade);
        });
    });

    estatisticas.forEach(card => {
        card.addEventListener("click", () => {
            selecionarAba(card.dataset.atividade);
        });

        card.addEventListener("keydown", evento => {
            if (evento.key === "Enter" || evento.key === " ") {
                evento.preventDefault();
                card.click();
            }
        });
    });

    selecionarAba("publicacoes");
}

if (modal) {
    modal.addEventListener("click", evento => {
        if (evento.target === modal) {
            fecharModal();
        }
    });
}

function iniciarPerfil() {
    configurarAbasPerfil();
    carregarPerfil();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarPerfil);
} else {
    iniciarPerfil();
}

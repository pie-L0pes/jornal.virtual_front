
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
let carregandoCurtidasPerfil = true;
let geracaoPerfil = 0;

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


function obterCaminhoImagem(caminho, padrao, atualizar = false) {
    if (!caminho || typeof caminho !== "string") {
        return padrao;
    }

    let url = caminho.trim().replace(/\\/g, "/");

    if (!url) return padrao;

    if (!/^(https?:\/\/|data:|blob:)/i.test(url)) {
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
            caminhoLimpo.startsWith("templates/")
        ) {
            url = `${supabaseUrl}/storage/v1/object/public/midias/${caminhoLimpo}`;
        } else {
            const base = String(API_URL).replace(/\/+$/, "");
            url = `${base}/${caminhoLimpo}`;
        }
    }

    if (!atualizar || /^(data:|blob:)/i.test(url)) {
        return url;
    }

    try {
        const endereco = new URL(url, window.location.href);
        endereco.searchParams.set("v", String(Date.now()));
        return endereco.href;
    } catch {
        return url;
    }
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


        console.log("Foto retornada pela API:", dados.fotoPerfil);
        console.log("Banner retornado pela API:", dados.template);

        const urlFoto = obterCaminhoImagem(
            dados.fotoPerfil,
            FOTO_PADRAO,
            true
        );

        const urlBanner = obterCaminhoImagem(
            dados.template,
            TEMPLATE_PADRAO,
            true
        );

        foto.onerror = () => {
            console.error("Não foi possível carregar a foto:", foto.src);
            foto.onerror = null;
            foto.src = FOTO_PADRAO;
        };

        banner.onerror = () => {
            console.error("Não foi possível carregar o banner:", banner.src);
            banner.onerror = null;
            banner.src = TEMPLATE_PADRAO;
        };

        foto.src = urlFoto;
        banner.src = urlBanner;

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

        carregarEstatisticas(perfilId, token).catch(erro => {
            console.error("Erro ao carregar estatísticas:", erro);
        });

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
    const geracao = ++geracaoPerfil;

    erroAtividadesPerfil = false;
    erroCurtidasPerfil = false;
    carregandoAtividadesPerfil = true;
    carregandoCurtidasPerfil = true;

    renderizarAtividadesPerfil();

    const promessaCurtidas = carregarCurtidasPerfil(
        usuarioId,
        token,
        geracao
    );

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

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || `Erro HTTP ${resposta.status}`
            );
        }

        if (geracao !== geracaoPerfil) return;

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

        if (totalPublicacoes) {
            totalPublicacoes.textContent = publicacoesPerfil.length;
        }

        if (totalComentarios) {
            totalComentarios.textContent = comentariosPerfil.length;
        }

        carregandoAtividadesPerfil = false;
        renderizarAtividadesPerfil();

        await promessaCurtidas;

        if (geracao !== geracaoPerfil) return;

        if (erroCurtidasPerfil && !curtidasPrivadas) {
            const temDadosCurtidas = publicacoes.some(publicacao =>
                Array.isArray(publicacao.curtidas)
            );

            if (temDadosCurtidas) {
                const curtidasEncontradas = [];

                publicacoes.forEach(publicacao => {
                    const curtidas = Array.isArray(publicacao.curtidas)
                        ? publicacao.curtidas
                        : [];

                    curtidas.forEach(curtida => {
                        const id = Number(
                            curtida?.usuarioId ??
                            curtida?.usuario?.id ??
                            curtida?.autor?.id
                        );

                        if (id === Number(usuarioId)) {
                            curtidasEncontradas.push({
                                publicacao
                            });
                        }
                    });
                });

                curtidasPerfil = curtidasEncontradas;
                erroCurtidasPerfil = false;

                if (totalCurtidas) {
                    totalCurtidas.textContent = curtidasPerfil.length;
                }
            }
        }

    } catch (erro) {
        if (geracao !== geracaoPerfil) return;

        console.error("Erro ao carregar atividades:", erro);

        erroAtividadesPerfil = true;
        publicacoesPerfil = [];
        comentariosPerfil = [];

        if (totalPublicacoes) {
            totalPublicacoes.textContent = "—";
        }

        if (totalComentarios) {
            totalComentarios.textContent = "—";
        }

        await promessaCurtidas;

    } finally {
        if (geracao === geracaoPerfil) {
            carregandoAtividadesPerfil = false;
            carregandoCurtidasPerfil = false;
            renderizarAtividadesPerfil();
        }
    }
}

async function carregarCurtidasPerfil(
    usuarioId,
    token,
    geracao = geracaoPerfil
) {
    if (geracao !== geracaoPerfil) return;

    curtidasPerfil = [];
    curtidasPrivadas = false;
    erroCurtidasPerfil = false;

    if (!perfilProprio() && !mostrarCurtidasPerfil) {
        curtidasPrivadas = true;

        if (totalCurtidas) {
            totalCurtidas.textContent = "—";
        }

        return;
    }

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

        if (geracao !== geracaoPerfil) return;

        if (resposta.status === 403) {
            curtidasPrivadas = true;

            if (totalCurtidas) {
                totalCurtidas.textContent = "—";
            }

            return;
        }

        if (resposta.status === 404) {
            erroCurtidasPerfil = true;

            if (totalCurtidas) {
                totalCurtidas.textContent = "—";
            }

            return;
        }

        const dados = await resposta.json().catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                dados.mensagem || `Erro HTTP ${resposta.status}`
            );
        }

        if (geracao !== geracaoPerfil) return;

        curtidasPerfil = obterListaCurtidas(dados)
            .map(normalizarCurtida)
            .filter(Boolean);

        if (totalCurtidas) {
            totalCurtidas.textContent = curtidasPerfil.length;
        }

    } catch (erro) {
        if (geracao !== geracaoPerfil) return;

        console.error("Erro ao carregar curtidas:", erro);

        erroCurtidasPerfil = true;

        if (totalCurtidas) {
            totalCurtidas.textContent = "—";
        }
    }
}


function prepararModal() {
    if (inputNome) {
        inputNome.value = nome?.textContent || "";
        inputNome.disabled = true;
    }

    if (inputDescricao) {
        inputDescricao.value =
            descricao?.textContent !==
                "Este usuário ainda não adicionou uma descrição."
                ? descricao?.textContent || ""
                : "";
    }

    if (previewFoto && foto) {
        previewFoto.src = foto.src;
    }

    if (previewBanner && banner) {
        previewBanner.src = banner.src;
    }

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

    if (inputFoto) {
        inputFoto.value = "";
    }

    if (inputBanner) {
        inputBanner.value = "";
    }

    prepararModal();
}

function mostrarPreview(input, preview) {
    if (!input || !preview) return;

    const arquivo = input.files?.[0];

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

async function enviarAtualizacaoPerfil(rota, metodo, dados, token) {
    const headers = {
        Authorization: `Bearer ${token}`
    };

    if (!(dados instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const resposta = await fetch(`${API_URL}${rota}`, {
        method: metodo,
        headers,
        body: dados instanceof FormData
            ? dados
            : JSON.stringify(dados)
    });

    const resultado = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
        throw new Error(
            resultado.mensagem ||
            resultado.erro ||
            `Erro HTTP ${resposta.status}`
        );
    }

    return resultado;
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

    const descricaoNova = inputDescricao?.value.trim() || "";
    const fotoNova = inputFoto?.files?.[0] || null;
    const bannerNovo = inputBanner?.files?.[0] || null;

    const privacidadeNova = inputMostrarCurtidas
        ? inputMostrarCurtidas.checked
        : mostrarCurtidasPerfil;

    const alterouPrivacidade =
        privacidadeNova !== mostrarCurtidasPerfil;

    const descricaoAtual =
        descricao?.textContent ===
            "Este usuário ainda não adicionou uma descrição."
            ? ""
            : descricao?.textContent || "";

    const alterouDescricao = descricaoNova !== descricaoAtual;

    if (
        !fotoNova &&
        !bannerNovo &&
        !alterouDescricao &&
        !alterouPrivacidade
    ) {
        alert("Nenhuma alteração foi realizada.");
        return;
    }

    const botaoSalvar = document.querySelector(".botao-salvar");

    if (botaoSalvar?.disabled) return;

    if (botaoSalvar) {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = "Salvando...";
    }

    let algumaAlteracaoSalva = false;

    try {
        if (alterouDescricao) {
            await enviarAtualizacaoPerfil(
                `/usuarios/atualizar/${usuarioToken.id}`,
                "PUT",
                {
                    bio: descricaoNova
                },
                token
            );

            algumaAlteracaoSalva = true;
        }

        if (fotoNova) {
            const formDataFoto = new FormData();
            formDataFoto.append("arquivo", fotoNova);

            await enviarAtualizacaoPerfil(
                "/usuarios/foto-perfil",
                "POST",
                formDataFoto,
                token
            );

            algumaAlteracaoSalva = true;
        }

        if (bannerNovo) {
            const formDataBanner = new FormData();
            formDataBanner.append("arquivo", bannerNovo);

            await enviarAtualizacaoPerfil(
                `/usuarios/template/${usuarioToken.id}`,
                "PUT",
                formDataBanner,
                token
            );

            algumaAlteracaoSalva = true;
        }

        if (alterouPrivacidade) {
            await enviarAtualizacaoPerfil(
                "/usuarios/privacidade",
                "PUT",
                {
                    mostrarCurtidas: privacidadeNova
                },
                token
            );

            mostrarCurtidasPerfil = privacidadeNova;
            algumaAlteracaoSalva = true;
        }


        fecharModal();

        if (alterouDescricao && descricao) {
            descricao.textContent =
                descricaoNova ||
                "Este usuário ainda não adicionou uma descrição.";
        }

        if (fotoNova && foto) {
            const urlTemporariaFoto = URL.createObjectURL(fotoNova);

            foto.onload = () => {
                URL.revokeObjectURL(urlTemporariaFoto);
                foto.onload = null;
            };

            foto.src = urlTemporariaFoto;
        }

        if (bannerNovo && banner) {
            const urlTemporariaBanner = URL.createObjectURL(bannerNovo);

            banner.onload = () => {
                URL.revokeObjectURL(urlTemporariaBanner);
                banner.onload = null;
            };

            banner.src = urlTemporariaBanner;
        }

        alert("Perfil atualizado com sucesso!");


        carregarPerfil();

    } catch (erro) {
        console.error("Erro ao salvar perfil:", erro);

        if (algumaAlteracaoSalva) {
            alert(
                `Algumas alterações foram salvas, mas ocorreu um erro: ${erro.message}`
            );

            carregarPerfil();
        } else {
            alert(
                erro.message || "Erro ao atualizar perfil."
            );
        }

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

    const nomeAutor = escaparTextoPerfil(
        autor.nome || "Usuário"
    );

    const data = escaparTextoPerfil(
        formatarDataPerfil(publicacao.dataPublicacao)
    );

    return `
        <div class="perfil-publicacao-cabecalho">
            <img
                src="${escaparTextoPerfil(fotoAutor)}"
                alt="Foto do autor"
                class="perfil-publicacao-avatar"
                loading="lazy"
                onerror="this.onerror=null;this.src='${FOTO_PADRAO}'"
            >

            <div class="perfil-publicacao-autor">
                <strong>${nomeAutor}</strong>
                <span>${data}</span>
            </div>
        </div>
    `;
}

function criarLinkPublicacaoPerfil(
    publicacaoId,
    texto = "Ver publicação"
) {
    if (
        publicacaoId === undefined ||
        publicacaoId === null
    ) {
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
            : Number(publicacao.totalCurtidas ?? 0);

        const quantidadeComentarios = Array.isArray(publicacao.comentarios)
            ? contarComentariosPublicacaoPerfil(publicacao.comentarios)
            : Number(publicacao.totalComentarios ?? 0);

        return `
            <article class="perfil-publicacao">
                ${criarCabecalhoPublicacaoPerfil(publicacao)}

                <div class="perfil-publicacao-texto">
                    ${escaparTextoPerfil(publicacao.texto || "")}
                </div>

                <div class="perfil-publicacao-acoes">
                    <span>
                        <i class="fa-solid fa-heart"></i>
                        ${Number.isFinite(quantidadeCurtidas) ? quantidadeCurtidas : 0}
                    </span>

                    <span>
                        <i class="fa-regular fa-comment"></i>
                        ${Number.isFinite(quantidadeComentarios) ? quantidadeComentarios : 0}
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

function contarComentariosPublicacaoPerfil(comentarios) {
    if (!Array.isArray(comentarios)) return 0;

    return comentarios.reduce((total, comentario) => {
        return total +
            1 +
            contarComentariosPublicacaoPerfil(comentario.respostas);
    }, 0);
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

    painel.innerHTML = comentariosPerfil.map(comentario => {
        const dataComentario =
            comentario.dataPublicacao ||
            comentario.dataComentario ||
            comentario.createdAt;

        return `
            <article class="perfil-publicacao">
                <div class="perfil-publicacao-cabecalho">
                    <img
                        src="${escaparTextoPerfil(foto?.src || FOTO_PADRAO)}"
                        class="perfil-publicacao-avatar"
                        alt="Foto do usuário"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${FOTO_PADRAO}'"
                    >

                    <div class="perfil-publicacao-autor">
                        <strong>
                            ${escaparTextoPerfil(nome?.textContent || "Usuário")}
                        </strong>

                        <span>
                            ${escaparTextoPerfil(
            formatarDataPerfil(dataComentario)
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
        `;
    }).join("");
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

    if (carregandoCurtidasPerfil) {
        mensagemAtividadesPerfil(
            "Carregando curtidas..."
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
    if (
        abaAtualPerfil === "curtidas" &&
        curtidasPrivadas
    ) {
        renderizarCurtidasPerfil();
        return;
    }

    if (
        abaAtualPerfil === "curtidas" &&
        carregandoCurtidasPerfil
    ) {
        mensagemAtividadesPerfil("Carregando curtidas...");
        return;
    }

    if (
        abaAtualPerfil !== "curtidas" &&
        carregandoAtividadesPerfil
    ) {
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
        if (
            !["publicacoes", "comentarios", "curtidas"].includes(tipo)
        ) {
            return;
        }

        abaAtualPerfil = tipo;

        abas.forEach(aba => {
            const ativa = aba.dataset.atividade === tipo;

            aba.classList.toggle("ativa", ativa);

            aba.setAttribute(
                "aria-selected",
                String(ativa)
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
            if (
                evento.key === "Enter" ||
                evento.key === " "
            ) {
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

document.addEventListener("keydown", evento => {
    if (
        evento.key === "Escape" &&
        modal &&
        modal.style.display === "flex"
    ) {
        fecharModal();
    }
});

function iniciarPerfil() {
    configurarAbasPerfil();
    carregarPerfil();
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarPerfil,
        { once: true }
    );
} else {
    iniciarPerfil();
}


document.addEventListener("DOMContentLoaded", () => {
    const botao = document.getElementById("btnNotificacoes");
    const contador = document.getElementById("contadorNotificacoes");
    const painel = document.getElementById("painelNotificacoes");
    const overlay = document.getElementById("notificacoesOverlay");
    const fechar = document.getElementById("fecharNotificacoes");
    const lista = document.getElementById("listaNotificacoes");
    const resumo = document.getElementById("resumoNotificacoes");
    const marcarTodas = document.getElementById("marcarTodasLidas");

    if (!botao || !painel || !lista) return;

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) return;

    function obterUsuario() {
        try {
            const parte = token.split(".")[1]
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const texto = atob(parte);

            const json = decodeURIComponent(
                Array.from(texto)
                    .map(caractere =>
                        "%" + caractere.charCodeAt(0).toString(16).padStart(2, "0")
                    )
                    .join("")
            );

            return JSON.parse(json);
        } catch (erro) {
            console.error("Erro ao identificar usuário:", erro);
            return null;
        }
    }

    const usuario = obterUsuario();
    const usuarioId = Number(usuario?.id || usuario?.usuarioId);

    if (!usuarioId) return;

    const chaveLidas = `notificacoes_lidas_${usuarioId}`;

    let notificacoes = [];
    let usuarios = new Map();
    let carregando = false;

    function obterApi() {
        return typeof API_URL !== "undefined"
            ? String(API_URL).replace(/\/+$/, "")
            : null;
    }

    async function requisicao(rota) {
        const base = obterApi();

        if (!base) {
            throw new Error("API_URL não está configurada.");
        }

        const resposta = await fetch(`${base}${rota}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        return resposta.json();
    }

    function obterLidas() {
        try {
            const dados = JSON.parse(localStorage.getItem(chaveLidas));
            return Array.isArray(dados) ? dados : [];
        } catch {
            return [];
        }
    }

    function salvarLidas(ids) {
        localStorage.setItem(chaveLidas, JSON.stringify([...new Set(ids)]));
    }

    function abrirPainel() {
        painel.classList.add("aberto");
        painel.setAttribute("aria-hidden", "false");
        botao.setAttribute("aria-expanded", "true");

        if (overlay) overlay.hidden = false;

        carregarNotificacoes();
    }

    function fecharPainel() {
        painel.classList.remove("aberto");
        painel.setAttribute("aria-hidden", "true");
        botao.setAttribute("aria-expanded", "false");

        if (overlay) overlay.hidden = true;
    }

    function atualizarContador() {
        const lidas = obterLidas();

        const quantidade = notificacoes.filter(
            notificacao => !lidas.includes(notificacao.id)
        ).length;

        if (contador) {
            contador.textContent = quantidade > 99 ? "99+" : quantidade;
            contador.hidden = quantidade === 0;
        }

        if (resumo) {
            resumo.textContent = quantidade === 0
                ? "Nenhuma notificação não lida"
                : quantidade === 1
                    ? "1 notificação não lida"
                    : `${quantidade} notificações não lidas`;
        }

        if (marcarTodas) {
            marcarTodas.disabled = quantidade === 0;
        }
    }

    function registrarUsuario(dados) {
        if (!dados || typeof dados !== "object") return;

        const id = Number(dados.id ?? dados.usuarioId);

        if (!id || !dados.nome) return;

        usuarios.set(id, dados.nome);
    }

    function registrarUsuariosPublicacao(publicacao) {
        registrarUsuario(publicacao.autor);
        registrarUsuario(publicacao.usuario);

        for (const curtida of publicacao.curtidas || []) {
            registrarUsuario(curtida.usuario);
            registrarUsuario(curtida.autor);
        }

        function percorrerComentarios(comentarios) {
            for (const comentario of comentarios || []) {
                registrarUsuario(comentario.autor);
                registrarUsuario(comentario.usuario);
                percorrerComentarios(comentario.respostas);
            }
        }

        percorrerComentarios(publicacao.comentarios);
    }

    async function carregarUsuarios() {
        try {
            const resposta = await requisicao("/usuarios/listar");

            const listaUsuarios = Array.isArray(resposta)
                ? resposta
                : resposta.usuarios || [];

            for (const item of listaUsuarios) {
                registrarUsuario(item);
            }
        } catch (erro) {
            console.warn(
                "Não foi possível consultar a lista de usuários:",
                erro.message
            );
        }
    }

    function nomeUsuario(id, nome) {
        return nome || usuarios.get(Number(id)) || "Alguém";
    }

    function criarNotificacao(
        tipo,
        autorId,
        autorNome,
        publicacaoId,
        identificador,
        data,
        comentarioId = null
    ) {
        const idAutor = Number(autorId);

        if (!idAutor || idAutor === usuarioId) return;

        const mensagens = {
            curtida: "curtiu sua publicação",
            comentario: "comentou na sua publicação",
            resposta: "respondeu ao seu comentário"
        };

        notificacoes.push({
            id: `${tipo}_${identificador}`,
            tipo,
            autorId: idAutor,
            autorNome: nomeUsuario(idAutor, autorNome),
            publicacaoId: Number(publicacaoId),
            comentarioId,
            mensagem: mensagens[tipo],
            data: data || null
        });
    }

    function processarComentarios(
        comentarios,
        publicacaoId,
        donoPublicacaoId,
        comentarioPai = null
    ) {
        if (!Array.isArray(comentarios)) return;

        for (const comentario of comentarios) {
            const autorId = Number(
                comentario.usuarioId ??
                comentario.autor?.id ??
                comentario.usuario?.id
            );

            const autorNome =
                comentario.autor?.nome ||
                comentario.usuario?.nome;

            if (comentarioPai) {
                const donoComentario = Number(
                    comentarioPai.usuarioId ??
                    comentarioPai.autor?.id ??
                    comentarioPai.usuario?.id
                );

                if (donoComentario === usuarioId) {
                    criarNotificacao(
                        "resposta",
                        autorId,
                        autorNome,
                        publicacaoId,
                        comentario.id,
                        comentario.dataPublicacao,
                        comentario.id
                    );
                }
            } else if (donoPublicacaoId === usuarioId) {
                criarNotificacao(
                    "comentario",
                    autorId,
                    autorNome,
                    publicacaoId,
                    comentario.id,
                    comentario.dataPublicacao,
                    comentario.id
                );
            }

            processarComentarios(
                comentario.respostas,
                publicacaoId,
                donoPublicacaoId,
                comentario
            );
        }
    }

    function formatarDataNotificacao(valor) {
        if (!valor) return "";

        const data = new Date(valor);

        if (Number.isNaN(data.getTime())) return "";

        return data.toLocaleString("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        });
    }

    async function carregarNotificacoes() {
        if (carregando) return;

        carregando = true;

        try {
            const dados = await requisicao("/publicacoes/listar");

            const publicacoes = Array.isArray(dados)
                ? dados
                : dados.publicacoes || [];

            usuarios = new Map();
            notificacoes = [];

            for (const publicacao of publicacoes) {
                registrarUsuariosPublicacao(publicacao);
            }

            await carregarUsuarios();

            for (const publicacao of publicacoes) {
                const donoId = Number(
                    publicacao.usuarioId ??
                    publicacao.autor?.id ??
                    publicacao.usuario?.id
                );

                if (donoId === usuarioId) {
                    for (const curtida of publicacao.curtidas || []) {
                        const autorId = Number(
                            curtida.usuarioId ??
                            curtida.usuario?.id ??
                            curtida.autor?.id
                        );

                        criarNotificacao(
                            "curtida",
                            autorId,
                            curtida.usuario?.nome || curtida.autor?.nome,
                            publicacao.id,
                            curtida.id || `${publicacao.id}_${autorId}`,
                            curtida.dataCurtida || curtida.createdAt
                        );
                    }
                }

                let comentarios = publicacao.comentarios;

                if (!Array.isArray(comentarios)) {
                    try {
                        const resposta = await requisicao(
                            `/comentarios/publicacao/${publicacao.id}`
                        );

                        comentarios = Array.isArray(resposta)
                            ? resposta
                            : resposta.comentarios || [];

                        registrarUsuariosPublicacao({
                            comentarios
                        });
                    } catch (erro) {
                        console.error(
                            `Erro ao carregar comentários da publicação ${publicacao.id}:`,
                            erro
                        );

                        comentarios = [];
                    }
                }

                processarComentarios(
                    comentarios,
                    publicacao.id,
                    donoId
                );
            }

            notificacoes = [
                ...new Map(
                    notificacoes.map(item => [item.id, item])
                ).values()
            ];

            notificacoes.forEach(notificacao => {
                notificacao.autorNome = nomeUsuario(
                    notificacao.autorId,
                    notificacao.autorNome === "Alguém"
                        ? null
                        : notificacao.autorNome
                );
            });

            notificacoes.sort((a, b) => {
                return new Date(b.data || 0) - new Date(a.data || 0);
            });

            renderizarNotificacoes();
        } catch (erro) {
            console.error("Erro ao carregar notificações:", erro);

            lista.innerHTML = `
                <div class="notificacoes-vazio">
                    Não foi possível carregar as notificações.
                </div>
            `;
        } finally {
            carregando = false;
        }
    }

    function renderizarNotificacoes() {
        lista.replaceChildren();

        if (!notificacoes.length) {
            const vazio = document.createElement("div");

            vazio.className = "notificacoes-vazio";
            vazio.textContent = "Você ainda não possui notificações.";

            lista.appendChild(vazio);
            atualizarContador();
            return;
        }

        const lidas = obterLidas();

        for (const notificacao of notificacoes) {
            const item = document.createElement("button");

            item.type = "button";
            item.className = "notificacao-item";

            if (!lidas.includes(notificacao.id)) {
                item.classList.add("nao-lida");
            }

            const icone = document.createElement("i");

            icone.className = {
                curtida: "fa-solid fa-heart",
                comentario: "fa-solid fa-comment",
                resposta: "fa-solid fa-reply"
            }[notificacao.tipo];

            const conteudo = document.createElement("span");
            conteudo.className = "notificacao-conteudo";

            const mensagem = document.createElement("span");
            mensagem.className = "notificacao-mensagem";

            const nome = document.createElement("strong");
            nome.textContent = notificacao.autorNome;

            mensagem.append(
                nome,
                document.createTextNode(` ${notificacao.mensagem}`)
            );

            conteudo.appendChild(mensagem);

            const data = formatarDataNotificacao(notificacao.data);

            if (data) {
                const horario = document.createElement("small");
                horario.className = "notificacao-data";
                horario.textContent = data;
                conteudo.appendChild(horario);
            }

            item.append(icone, conteudo);

            item.addEventListener("click", () => {
                if (typeof window.abrirPublicacaoNotificacao !== "function") {
                    console.error(
                        "publicacao-detalhes.js não foi carregado."
                    );

                    alert("Não foi possível abrir a publicação.");
                    return;
                }

                const ids = obterLidas();

                if (!ids.includes(notificacao.id)) {
                    salvarLidas([...ids, notificacao.id]);
                }


                atualizarContador();

                window.abrirPublicacaoNotificacao(
                    notificacao.publicacaoId
                );
            });

            lista.appendChild(item);
        }

        atualizarContador();
    }

    botao.addEventListener("click", () => {
        if (painel.classList.contains("aberto")) {
            fecharPainel();
        } else {
            abrirPainel();
        }
    });

    fechar?.addEventListener("click", fecharPainel);
    overlay?.addEventListener("click", fecharPainel);

    marcarTodas?.addEventListener("click", () => {
        salvarLidas(notificacoes.map(item => item.id));
        renderizarNotificacoes();
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharPainel();
        }
    });

    window.atualizarNotificacoes = carregarNotificacoes;

    carregarNotificacoes();
    setInterval(carregarNotificacoes, 30000);
});
